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
  filter: string = 'all';
  loading = true;

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

    this.loading = false;
  }

  get filteredTasks() {
    const today = new Date().toISOString().split('T')[0];
    if (this.filter === 'today') return this.tasks.filter(t => t.task_date === today);
    if (this.filter === 'upcoming') return this.tasks.filter(t => t.task_date > today);
    if (this.filter === 'done') return this.tasks.filter(t => t.status === 'done');
    return this.tasks;
  }

  get latestYoutube() {
    return this.socialSnapshots.find(s => s.platform === 'youtube');
  }

  get latestInstagram() {
    return this.socialSnapshots.find(s => s.platform === 'instagram');
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
