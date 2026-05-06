import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatNavList, MatListItem } from '@angular/material/list';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, MatSidenav, MatSidenavContainer, MatSidenavContent, MatNavList, MatListItem, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  loginOpen = signal(false);
  lang = signal<'en' | 'zh'>('en');

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }
}
