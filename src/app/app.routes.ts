import { Routes } from '@angular/router';
import { AdminDashboardComponent } from './features/admin-dashboard/admin-dashboard';
import { AuthComponent } from './features/auth/auth.component';

export const routes: Routes = [
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: 'auth', component: AuthComponent },
  { path: 'admin', component: AdminDashboardComponent },
];
