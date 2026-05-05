import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientPortalLoginComponent } from '../../features/client-portal/client-portal-login/client-portal-login.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ClientPortalLoginComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  lang = signal<'en' | 'zh'>('en');

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }
}
