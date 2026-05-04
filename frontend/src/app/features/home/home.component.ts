import { Component } from '@angular/core';
import { ClientPortalLoginComponent } from '../client-portal/client-portal-login/client-portal-login.component';

@Component({
  selector: 'app-home',
  imports: [ClientPortalLoginComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {}
