import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../core/services/auth.service';
import { PortalMessagesService } from '../../core/services/portal-messages.service';

function mockSidenav() {
  return { toggle: vi.fn(), opened: false, openedChange: new EventEmitter<boolean>() } as any;
}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [provideHttpClient()],
    }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders logo icon containing 税', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('税');
  });

  it('renders company name "GWH Accounting"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('GWH Accounting');
  });

  it('renders tagline "Secure Tax & Accounting Portal"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.textContent).toContain('Secure Tax & Accounting Portal');
  });

  it('EN language pill is active by default', () => {
    expect(component.lang()).toBe('en');
  });

  it('clicking 中文 sets lang to zh', () => {
    const zhBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="lang-zh"]') as HTMLElement;
    zhBtn.click();
    fixture.detectChanges();
    expect(component.lang()).toBe('zh');
  });

  it('clicking EN after 中文 sets lang back to en', () => {
    const zhBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="lang-zh"]') as HTMLElement;
    zhBtn.click();
    fixture.detectChanges();

    const enBtn = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="lang-en"]') as HTMLElement;
    enBtn.click();
    fixture.detectChanges();
    expect(component.lang()).toBe('en');
  });

  it('"Services" link has href="#services"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link = nativeEl.querySelector('a[href="#services"]');
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('Services');
  });

  it('"Security" link has href="#security"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link = nativeEl.querySelector('a[href="#security"]');
    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('Security');
  });

  it('"Contact" link has routerLink="/contact"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const contactLink = nativeEl.querySelector('a[routerLink="/contact"]');
    expect(contactLink).not.toBeNull();
    expect(contactLink!.textContent?.trim()).toBe('Contact');
  });

  it('"Book Consultation" link has routerLink="/book-consultation"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const ctaLink = nativeEl.querySelector('a[routerLink="/book-consultation"]');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink!.textContent?.trim()).toBe('Book Consultation');
  });

  it('Contact and Book Consultation are separate links pointing to different routes', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const contactLink = nativeEl.querySelector('a[routerLink="/contact"]');
    const ctaLink = nativeEl.querySelector('a[routerLink="/book-consultation"]');
    expect(contactLink?.textContent?.trim()).toBe('Contact');
    expect(ctaLink?.textContent?.trim()).toBe('Book Consultation');
  });

  it.todo('"Client Portal" renders <app-client-portal-login> inside navbar — mobile drawer replaced by MatSidenav in Group 3');

  it.todo('mobile drawer replaced by MatSidenav in Group 3 — sidenav content tested in app.spec.ts');

  it('hamburger button exists in the DOM', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const hamburger = nativeEl.querySelector('[data-testid="hamburger"]');
    expect(hamburger).not.toBeNull();
  });

  it('sidenavOpen() is false by default', () => {
    expect(component.sidenavOpen()).toBe(false);
  });

  it('clicking the hamburger button sets sidenavOpen() to true', () => {
    const mock = mockSidenav();
    component.sidenav = mock;
    const hamburger = fixture.nativeElement.querySelector('[data-testid="hamburger"]') as HTMLElement;
    hamburger.click();
    fixture.detectChanges();
    expect(component.sidenavOpen()).toBe(true);
  });

  it('clicking the hamburger button again sets sidenavOpen() back to false', () => {
    const mock = mockSidenav();
    component.sidenav = mock;
    const hamburger = fixture.nativeElement.querySelector('[data-testid="hamburger"]') as HTMLElement;
    hamburger.click();
    fixture.detectChanges();
    hamburger.click();
    fixture.detectChanges();
    expect(component.sidenavOpen()).toBe(false);
  });

  it('clicking hamburger calls sidenav.toggle()', () => {
    const mock = mockSidenav();
    component.sidenav = mock;
    const hamburger = fixture.nativeElement.querySelector('[data-testid="hamburger"]') as HTMLElement;
    hamburger.click();
    fixture.detectChanges();
    expect(mock.toggle).toHaveBeenCalledOnce();
  });

  it('renders a mat-toolbar element', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('mat-toolbar')).not.toBeNull();
  });

  it('nav links are rendered as mat-button elements', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const matButtons = nativeEl.querySelectorAll('[mat-button]');
    expect(matButtons.length).toBeGreaterThan(0);
  });

  it('"Book Consultation" uses mat-flat-button', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('[mat-flat-button]')).not.toBeNull();
  });

  it('Client Login button has routerLink /login and no matMenuTriggerFor', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const btn = nativeEl.querySelector('[data-testid="client-login-btn"]');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('routerLink')).toBe('/login');
    expect(btn!.hasAttribute('matMenuTriggerFor')).toBe(false);
  });

  it('shows Client Login when not authenticated', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('[data-testid="client-login-btn"]')).not.toBeNull();
    expect(nativeEl.querySelector('[data-testid="logout-btn"]')).toBeNull();
  });

  it('shows Logout button when authenticated', () => {
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({ id: 1, email: 'a@b.com', name: 'Alice', role: 'USER' });
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('[data-testid="logout-btn"]')).not.toBeNull();
    expect(nativeEl.querySelector('[data-testid="client-login-btn"]')).toBeNull();
  });
});

describe('Messages navigation', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;

  function setupWithUnreadCount(unreadCount: number) {
    const mockPortalMessagesService = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unreadCount })),
    };
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        { provide: PortalMessagesService, useValue: mockPortalMessagesService },
      ],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({ id: 1, email: 'a@b.com', name: 'Alice', role: 'USER' });
    fixture.detectChanges();
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders Messages link with routerLink /portal/messages', () => {
    setupWithUnreadCount(0);
    const nativeEl = fixture.nativeElement as HTMLElement;
    const link = nativeEl.querySelector('[data-testid="messages-nav-link"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('routerLink')).toBe('/portal/messages');
  });

  it('hides Messages link for ADMIN role', () => {
    const mockPortalMessagesService = {
      getUnreadCount: vi.fn().mockReturnValue(of({ unreadCount: 0 })),
    };
    TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
      providers: [
        provideHttpClient(),
        { provide: PortalMessagesService, useValue: mockPortalMessagesService },
      ],
    });
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    const authService = TestBed.inject(AuthService);
    authService.currentUser.set({ id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' });
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('[data-testid="messages-nav-link"]')).toBeNull();
  });

  it('shows unread badge when count > 0 and hides it when count is 0', async () => {
    // Badge visible when count > 0
    setupWithUnreadCount(3);
    const nativeEl = fixture.nativeElement as HTMLElement;
    const badge = nativeEl.querySelector('[data-testid="messages-unread-badge"]');
    expect(badge).not.toBeNull();
    expect(badge!.textContent?.trim()).toBe('3');

    // Reset and re-setup with count 0
    TestBed.resetTestingModule();
    setupWithUnreadCount(0);
    const noBadge = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="messages-unread-badge"]');
    expect(noBadge).toBeNull();
  });
});
