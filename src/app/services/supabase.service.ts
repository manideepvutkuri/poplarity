import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // ---------- AUTH ----------

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    return data.user;
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  // Checks if the logged-in user is an admin (vs a client)
  async isAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    return !!data;
  }

  // ---------- CLIENT PROFILE ----------

  async getMyProfile(userId: string) {
    return this.supabase.from('clients').select('*').eq('id', userId).single();
  }

  async getAllClients() {
    return this.supabase.from('clients').select('*').order('created_at', { ascending: false });
  }

  // Admin creates a new client — requires a Supabase Edge Function or
  // service-role key on the backend to create the auth user securely.
  // For the demo, we create the auth user via signUp (client-side, simplest path)
  // then insert their profile row.
  //
  // IMPORTANT: signUp() automatically switches the browser's active session
  // to the newly created user. If we don't restore the admin's session before
  // inserting the profile row, the insert runs as the new client (not the admin)
  // and gets rejected by the "Admins insert clients" RLS policy — silently
  // failing to create the profile row, even though the auth user was created.
  async createClientAccount(email: string, password: string, profile: {
    name: string; category: string; role_title: string; phone: string;
  }) {
    // 1. Save the admin's current session so we can restore it
    const { data: sessionData } = await this.supabase.auth.getSession();
    const adminSession = sessionData.session;

    if (!adminSession) {
      return { error: { message: 'You must be logged in as admin to add a client.' } };
    }

    // 2. Create the new client's auth account (this swaps the active session)
    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError || !signUpData.user) {
      // Restore admin session even on failure
      await this.supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      return { error: signUpError };
    }

    // 3. Restore the admin's session BEFORE inserting the profile row,
    // so the insert satisfies the "Admins insert clients" RLS policy
    await this.supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    });

    // 4. Now insert the profile row as the admin
    const { error: profileError } = await this.supabase.from('clients').insert({
      id: signUpData.user.id,
      name: profile.name,
      category: profile.category,
      role_title: profile.role_title,
      phone: profile.phone,
    });

    return { error: profileError, userId: signUpData.user.id };
  }

  // ---------- TASKS ----------

  async getMyTasks(clientId: string) {
    return this.supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('task_date', { ascending: true });
  }

  async getAllTasks() {
    return this.supabase
      .from('tasks')
      .select('*, clients(name)')
      .order('task_date', { ascending: true });
  }

  async createTask(task: {
    client_id: string; title: string; type: string;
    task_date: string; task_time: string; location: string;
  }) {
    return this.supabase.from('tasks').insert(task);
  }

  async markTaskDone(taskId: string) {
    return this.supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
  }

  // ---------- SOCIAL / POPULARITY ----------

  async getMySocialSnapshots(clientId: string) {
    return this.supabase
      .from('social_snapshots')
      .select('*')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .limit(10);
  }

  async addSocialSnapshot(snapshot: {
    client_id: string; platform: string; followers: number;
    views_15d: number; likes_15d: number;
  }) {
    return this.supabase.from('social_snapshots').insert(snapshot);
  }

  // ---------- DEMOGRAPHICS / AREA POPULARITY / PRESENCE SCORE ----------

  async getMyDemographics(clientId: string) {
    return this.supabase
      .from('demographics')
      .select('*')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .order('label', { ascending: true });
  }

  async getMyAreaPopularity(clientId: string) {
    return this.supabase
      .from('area_popularity')
      .select('*')
      .eq('client_id', clientId)
      .order('score', { ascending: false });
  }

  async getMyPresenceScore(clientId: string) {
    return this.supabase
      .from('presence_scores')
      .select('*')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  async addDemographic(clientId: string, label: string, percentage: number) {
    return this.supabase.from('demographics').insert({ client_id: clientId, label, percentage });
  }

  async addAreaPopularity(clientId: string, areaName: string, score: number) {
    return this.supabase.from('area_popularity').insert({ client_id: clientId, area_name: areaName, score });
  }

  async addPresenceScore(clientId: string, score: number) {
    return this.supabase.from('presence_scores').insert({ client_id: clientId, score });
  }

  // ---------- EDIT / DELETE (admin) ----------

  async updateTask(taskId: string, fields: Partial<{
    title: string; type: string; task_date: string; task_time: string;
    location: string; status: string;
  }>) {
    return this.supabase.from('tasks').update(fields).eq('id', taskId);
  }

  async deleteTask(taskId: string) {
    return this.supabase.from('tasks').delete().eq('id', taskId);
  }

  async updateDemographic(id: string, percentage: number) {
    return this.supabase.from('demographics').update({ percentage }).eq('id', id);
  }

  async deleteDemographic(id: string) {
    return this.supabase.from('demographics').delete().eq('id', id);
  }

  async updateAreaPopularity(id: string, score: number) {
    return this.supabase.from('area_popularity').update({ score }).eq('id', id);
  }

  async deleteAreaPopularity(id: string) {
    return this.supabase.from('area_popularity').delete().eq('id', id);
  }

  async deleteSocialSnapshot(id: string) {
    return this.supabase.from('social_snapshots').delete().eq('id', id);
  }

  async getClientSocialHistory(clientId: string) {
    return this.supabase
      .from('social_snapshots')
      .select('*')
      .eq('client_id', clientId)
      .order('snapshot_date', { ascending: false })
      .limit(20);
  }

  async getClientDemographics(clientId: string) {
    return this.supabase.from('demographics').select('*').eq('client_id', clientId).order('label');
  }

  async getClientAreaPopularity(clientId: string) {
    return this.supabase.from('area_popularity').select('*').eq('client_id', clientId).order('score', { ascending: false });
  }

  async getClientTasks(clientId: string) {
    return this.supabase.from('tasks').select('*').eq('client_id', clientId).order('task_date', { ascending: false });
  }
}
