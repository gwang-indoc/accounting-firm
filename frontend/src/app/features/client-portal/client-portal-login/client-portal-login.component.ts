import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-client-portal-login',
  imports: [],
  templateUrl: './client-portal-login.component.html',
  styleUrl: './client-portal-login.component.css',
})
export class ClientPortalLoginComponent {
  isOpen = signal(false);

  toggle() {
    this.isOpen.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const el = event.target as HTMLElement;
    if (!el.closest('app-client-portal-login')) {
      this.isOpen.set(false);
    }
  }
}
