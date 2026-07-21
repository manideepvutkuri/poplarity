import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ManageClientComponent } from './manage-client/manage-client.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ManageClientComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'],
})
export class AdminComponent implements OnInit {
  clients: any[] = [];
  tasks: any[] = [];
  loading = true;

  showAddClientModal = false;
  showAddTaskModal = false;
  selectedClientForTask: any = null;
  managingClient: any = null;

  newClient = { name: '', category: 'Politician', role_title: '', phone: '', email: '', password: '' };
  newTask = { title: '', type: 'Public Appearance', task_date: '', task_time: '', location: '' };

  savingClient = false;
  clientCreateError = '';
  clientCreateSuccess = '';

  constructor(private supabase: SupabaseService, private router: Router) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    const { data: clients } = await this.supabase.getAllClients();
    this.clients = clients || [];

    const { data: tasks } = await this.supabase.getAllTasks();
    this.tasks = tasks || [];

    this.loading = false;
  }

  taskCountFor(clientId: string) {
    const clientTasks = this.tasks.filter(t => t.client_id === clientId);
    return {
      pending: clientTasks.filter(t => t.status === 'pending').length,
      total: clientTasks.length,
    };
  }

  openAddClient() {
    this.newClient = { name: '', category: 'Politician', role_title: '', phone: '', email: '', password: '' };
    this.clientCreateError = '';
    this.clientCreateSuccess = '';
    this.showAddClientModal = true;
  }

  async submitAddClient() {
    if (!this.newClient.email || !this.newClient.password || !this.newClient.name) {
      this.clientCreateError = 'Name, email, and password are required.';
      return;
    }

    this.savingClient = true;
    this.clientCreateError = '';

    const { error } = await this.supabase.createClientAccount(
      this.newClient.email,
      this.newClient.password,
      {
        name: this.newClient.name,
        category: this.newClient.category,
        role_title: this.newClient.role_title,
        phone: this.newClient.phone,
      }
    );

    this.savingClient = false;

    if (error) {
      this.clientCreateError = error.message || 'Could not create client.';
      return;
    }

    this.clientCreateSuccess = `Client created. Share these details with them:\nEmail: ${this.newClient.email}\nPassword: ${this.newClient.password}`;
    await this.loadData();
  }

  openAddTask(client: any) {
    this.selectedClientForTask = client;
    this.newTask = { title: '', type: 'Public Appearance', task_date: '', task_time: '', location: '' };
    this.showAddTaskModal = true;
  }

  async submitAddTask() {
    if (!this.newTask.title || !this.newTask.task_date) return;

    await this.supabase.createTask({
      client_id: this.selectedClientForTask.id,
      title: this.newTask.title,
      type: this.newTask.type,
      task_date: this.newTask.task_date,
      task_time: this.newTask.task_time,
      location: this.newTask.location,
    });

    this.showAddTaskModal = false;
    await this.loadData();
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }

  openManageClient(client: any) {
    this.managingClient = client;
  }

  async closeManageClient() {
    this.managingClient = null;
    await this.loadData();
  }
}
