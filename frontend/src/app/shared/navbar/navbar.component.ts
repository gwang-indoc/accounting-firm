import { Component, computed, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatSidenav } from '@angular/material/sidenav';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { PortalMessagesService } from '../../core/services/portal-messages.service';
import { TranslationService } from '../../core/services/translation.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatToolbar, MatButton, MatIconButton, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  @Input() sidenav!: MatSidenav;

  sidenavOpen = signal(false);
  unreadCount = signal<number>(0);
  currentLanguage = inject(TranslationService).currentLanguage;
  brandLink = computed(() =>
    this.authService.currentUser()?.role === 'ADMIN' ? '/admin/clients' : '/'
  );

  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portalMessagesService = inject(PortalMessagesService);
  private readonly translationService = inject(TranslationService);

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
    this.translationService.setLanguage(value);
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
