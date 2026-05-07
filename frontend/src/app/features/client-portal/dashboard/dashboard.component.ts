import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  imports: [MatCard, MatCardHeader, MatCardTitle, MatCardContent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  protected authService = inject(AuthService);
}
