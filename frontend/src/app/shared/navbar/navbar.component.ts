import { Component, Input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MatToolbar, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  @Input() sidenav!: MatSidenav;

  lang = signal<'en' | 'zh'>('en');
  sidenavOpen = signal(false);

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
    this.sidenavOpen.update(v => !v);
  }
}
