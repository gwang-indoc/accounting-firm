import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected authService = inject(AuthService);
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
