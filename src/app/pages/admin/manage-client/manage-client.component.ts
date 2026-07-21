import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-manage-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-client.component.html',
  styleUrls: ['./manage-client.component.css'],
})
export class ManageClientComponent implements OnInit {
  @Input() client: any;
  @Output() closed = new EventEmitter<void>();

  activeTab: 'tasks' | 'demographics' | 'areas' | 'social' | 'score' = 'tasks';
  loading = true;

  tasks: any[] = [];
  demographics: any[] = [];
  areas: any[] = [];
  socialHistory: any[] = [];
  latestScore: any = null;

  // form models
  newDemo = { label: '', percentage: 0 };
  newArea = { area_name: '', score: 0 };
  newSocial = { platform: 'instagram', followers: 0, views_15d: 0, likes_15d: 0 };
  newScore = 0;

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    this.loading = true;
    const [t, d, a, s, sc] = await Promise.all([
      this.supabase.getClientTasks(this.client.id),
      this.supabase.getClientDemographics(this.client.id),
      this.supabase.getClientAreaPopularity(this.client.id),
      this.supabase.getClientSocialHistory(this.client.id),
      this.supabase.getMyPresenceScore(this.client.id),
    ]);
    this.tasks = t.data || [];
    this.demographics = d.data || [];
    this.areas = a.data || [];
    this.socialHistory = s.data || [];
    this.latestScore = sc.data;
    this.newScore = this.latestScore?.score ?? 0;
    this.loading = false;
  }

  // ---- Tasks ----
  async toggleTaskStatus(task: any) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await this.supabase.updateTask(task.id, { status: newStatus });
    task.status = newStatus;
  }

  async deleteTask(taskId: string) {
    await this.supabase.deleteTask(taskId);
    this.tasks = this.tasks.filter(t => t.id !== taskId);
  }

  // ---- Demographics ----
  async addDemographic() {
    if (!this.newDemo.label) return;
    await this.supabase.addDemographic(this.client.id, this.newDemo.label, this.newDemo.percentage);
    this.newDemo = { label: '', percentage: 0 };
    await this.reload();
  }

  async updateDemographic(item: any) {
    await this.supabase.updateDemographic(item.id, item.percentage);
  }

  async deleteDemographic(id: string) {
    await this.supabase.deleteDemographic(id);
    this.demographics = this.demographics.filter(d => d.id !== id);
  }

  // ---- Area popularity ----
  async addArea() {
    if (!this.newArea.area_name) return;
    await this.supabase.addAreaPopularity(this.client.id, this.newArea.area_name, this.newArea.score);
    this.newArea = { area_name: '', score: 0 };
    await this.reload();
  }

  async updateArea(item: any) {
    await this.supabase.updateAreaPopularity(item.id, item.score);
  }

  async deleteArea(id: string) {
    await this.supabase.deleteAreaPopularity(id);
    this.areas = this.areas.filter(a => a.id !== id);
  }

  // ---- Social stats ----
  async addSocial() {
    await this.supabase.addSocialSnapshot({
      client_id: this.client.id,
      platform: this.newSocial.platform,
      followers: this.newSocial.followers,
      views_15d: this.newSocial.views_15d,
      likes_15d: this.newSocial.likes_15d,
    });
    this.newSocial = { platform: 'instagram', followers: 0, views_15d: 0, likes_15d: 0 };
    await this.reload();
  }

  async deleteSocial(id: string) {
    await this.supabase.deleteSocialSnapshot(id);
    this.socialHistory = this.socialHistory.filter(s => s.id !== id);
  }

  // ---- Presence score ----
  async saveScore() {
    await this.supabase.addPresenceScore(this.client.id, this.newScore);
    await this.reload();
  }

  close() {
    this.closed.emit();
  }
}
