import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

// Protects /dashboard — any logged-in client can enter,
// but Supabase RLS is what actually stops them seeing other clients' data.
export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();

  if (!session) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// Protects /admin — must be logged in AND present in the admins table.
export const adminGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  const session = await supabase.getSession();

  if (!session) {
    router.navigate(['/login']);
    return false;
  }

  const isAdmin = await supabase.isAdmin(session.user.id);
  if (!isAdmin) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
