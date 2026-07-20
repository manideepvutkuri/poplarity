import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  email = '';
  password = '';
  errorMsg = '';
  loading = false;

  constructor(private supabase: SupabaseService, private router: Router) {}

  async onLogin() {
    this.errorMsg = '';
    this.loading = true;

    const { data, error } = await this.supabase.signIn(this.email, this.password);

    if (error || !data.user) {
      this.errorMsg = 'Invalid email or password. Please try again.';
      this.loading = false;
      return;
    }

    const isAdmin = await this.supabase.isAdmin(data.user.id);
    this.loading = false;

    if (isAdmin) {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
