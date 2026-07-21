import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  profile: any = null;
  tasks: any[] = [];
  socialSnapshots: any[] = [];
  demographics: any[] = [];
  areaPopularity: any[] = [];
  presenceScore: any = null;
  loading = true;

  demoColors = ['#B8863B', '#2E6B5E', '#7A6A8A', '#B4553F', '#5C7FA8'];
  today = new Date().toISOString().split('T')[0];

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    const user = await this.supabase.getCurrentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    const { data: profile } = await this.supabase.getMyProfile(user.id);
    this.profile = profile;

    const { data: tasks } = await this.supabase.getMyTasks(user.id);
    this.tasks = tasks || [];

    const { data: social } = await this.supabase.getMySocialSnapshots(user.id);
    this.socialSnapshots = social || [];

    const { data: demo } = await this.supabase.getMyDemographics(user.id);
    this.demographics = demo || [];

    const { data: areas } = await this.supabase.getMyAreaPopularity(user.id);
    this.areaPopularity = areas || [];

    const { data: score } = await this.supabase.getMyPresenceScore(user.id);
    this.presenceScore = score;

    this.loading = false;
  }

  // ---------- Stat cards ----------
  get todayTasks() {
    return this.tasks.filter(t => t.task_date === this.today);
  }
  get upcomingTasks() {
    return this.tasks.filter(t => t.task_date > this.today && t.status !== 'done');
  }
  get completedTasks() {
    return this.tasks.filter(t => t.status === 'done');
  }

  // ---------- Donut chart gradients (CSS conic-gradient, no external chart lib) ----------
  private buildGradient(items: { value: number }[]) {
    const total = items.reduce((s, i) => s + Number(i.value), 0) || 1;
    let cumulative = 0;
    const stops: string[] = [];
    items.forEach((item, i) => {
      const start = (cumulative / total) * 360;
      cumulative += Number(item.value);
      const end = (cumulative / total) * 360;
      stops.push(`${this.demoColors[i % this.demoColors.length]} ${start}deg ${end}deg`);
    });
    return `conic-gradient(${stops.join(', ')})`;
  }

  get areaGradient() {
    return this.buildGradient(this.areaPopularity.map(a => ({ value: a.score })));
  }

  get demoGradient() {
    return this.buildGradient(this.demographics.map(d => ({ value: d.percentage })));
  }

  colorFor(index: number) {
    return this.demoColors[index % this.demoColors.length];
  }

  // ---------- Social platforms ----------
  get platforms() {
    const seen = new Set<string>();
    const latest: any[] = [];
    for (const s of this.socialSnapshots) {
      if (!seen.has(s.platform)) {
        seen.add(s.platform);
        latest.push(s);
      }
    }
    return latest;
  }

  sparklinePoints(platform: string) {
    const rows = this.socialSnapshots
      .filter(s => s.platform === platform)
      .slice()
      .reverse();
    if (rows.length < 2) return '';
    const values = rows.map(r => r.followers || 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const step = 100 / (values.length - 1);
    return values
      .map((v, i) => `${i * step},${30 - ((v - min) / range) * 28}`)
      .join(' ');
  }

  async markDone(taskId: string) {
    await this.supabase.markTaskDone(taskId);
    const task = this.tasks.find(t => t.id === taskId);
    if (task) task.status = 'done';
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
