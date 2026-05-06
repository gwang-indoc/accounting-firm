import { Component, DestroyRef, inject, Input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, MatToolbar, MatButton, MatIconButton],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {
  @Input() sidenav!: MatSidenav;

  lang = signal<'en' | 'zh'>('en');
  sidenavOpen = signal(false);

  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (this.sidenav) {
      // Correct icon after scrim-close or external close (animation completes async)
      this.sidenav.openedChange
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(opened => this.sidenavOpen.set(opened));
    }
  }

  setLang(value: 'en' | 'zh'): void {
    this.lang.set(value);
  }

  toggleSidenav(): void {
    this.sidenav.toggle();
    this.sidenavOpen.update(v => !v);
  }
}
