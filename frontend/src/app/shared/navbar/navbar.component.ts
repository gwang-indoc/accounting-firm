import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  lang = signal<'en' | 'zh'>('en');

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }
}
