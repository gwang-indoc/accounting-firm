import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  logout() {
    this.http.post('/api/auth/logout', {}).subscribe({
      next: () => {
        this.authService.currentUser.set(null);
        this.router.navigate(['/']);
      },
    });
  }
}
