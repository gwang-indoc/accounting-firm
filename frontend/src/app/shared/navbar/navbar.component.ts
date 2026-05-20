import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from '../../core/services/auth.service';
import { PortalMessagesService } from '../../core/services/portal-messages.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, MatIconButton],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  @Input() sidenav!: MatSidenav;

  lang = signal<'en' | 'zh'>('en');
  sidenavOpen = signal(false);
  unreadCount = signal<number>(0);

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portalMessagesService = inject(PortalMessagesService);

  ngOnInit(): void {
    if (this.sidenav) {
      // Correct icon after scrim-close or external close (animation completes async)
      this.sidenav.openedChange
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(opened => this.sidenavOpen.set(opened));
    }
    if (this.authService.isAuthenticated()) {
      this.portalMessagesService.getUnreadCount()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(res => this.unreadCount.set(res.unreadCount));
    }
  }

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
    this.sidenavOpen.update(v => !v);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/'])
    });
  }
}
