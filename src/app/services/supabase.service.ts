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
  async createClientAccount(email: string, password: string, profile: {
    name: string; category: string; role_title: string; phone: string;
  }) {
    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError || !signUpData.user) {
      return { error: signUpError };
    }

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
}
