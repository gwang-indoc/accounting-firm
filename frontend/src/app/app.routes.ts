import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./features/services/services-page.component').then(m => m.ServicesPageComponent),
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./features/security/security-page.component').then(m => m.SecurityPageComponent),
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then(m => m.ContactComponent),
  },
  {
    path: 'book-consultation',
    loadComponent: () =>
      import('./features/book-consultation/book-consultation.component').then(m => m.BookConsultationComponent),
  },
  {
    path: 'portal/dashboard',
    loadComponent: () =>
      import('./features/client-portal/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'portal/engagements',
    loadComponent: () =>
      import('./features/client-portal/engagements/portal-engagements.component').then(m => m.PortalEngagementsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'portal/documents',
    loadComponent: () =>
      import('./features/client-portal/documents/documents.component').then(m => m.DocumentsComponent),
    canActivate: [authGuard],
  },
  {
    path: 'portal/messages',
    loadComponent: () =>
      import('./features/client-portal/messages/portal-inbox.component').then(m => m.PortalInboxComponent),
    canActivate: [authGuard],
  },
  {
    path: 'portal/messages/:threadId',
    loadComponent: () =>
      import('./features/client-portal/messages/portal-thread-view.component').then(m => m.PortalThreadViewComponent),
    canActivate: [authGuard],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'admin/workflow',
    loadComponent: () =>
      import('./features/admin/workflow/admin-workflow.component').then(m => m.AdminWorkflowComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/clients',
    loadComponent: () =>
      import('./features/admin/clients/admin-clients.component').then(m => m.AdminClientsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/clients/:id/documents',
    loadComponent: () =>
      import('./features/admin/client-documents/admin-client-documents.component').then(m => m.AdminClientDocumentsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/clients/:id/messages',
    loadComponent: () =>
      import('./features/admin/client-messages/admin-client-threads.component').then(m => m.AdminClientThreadsComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/clients/:id/workflow',
    loadComponent: () =>
      import('./features/admin/client-workflow/admin-client-workflow.component').then(m => m.AdminClientWorkflowComponent),
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/clients/:id/messages/:threadId',
    loadComponent: () =>
      import('./features/admin/client-messages/admin-client-thread-view.component').then(m => m.AdminClientThreadViewComponent),
    canActivate: [authGuard, adminGuard],
  },
];
