import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClientPortalLoginComponent } from '../../features/client-portal/client-portal-login/client-portal-login.component';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton } from '@angular/material/button';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, ClientPortalLoginComponent, MatToolbar, MatButton, MatMenu, MatMenuTrigger],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  lang = signal<'en' | 'zh'>('en');
  menuOpen = signal(false);

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }
}
