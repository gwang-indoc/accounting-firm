import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'portal/dashboard',
    loadComponent: () =>
      import('./features/client-portal/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
];
