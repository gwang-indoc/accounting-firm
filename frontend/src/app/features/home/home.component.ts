import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientPortalLoginComponent } from '../client-portal/client-portal-login/client-portal-login.component';

@Component({
  selector: 'app-home',
  imports: [CommonModule, ClientPortalLoginComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
