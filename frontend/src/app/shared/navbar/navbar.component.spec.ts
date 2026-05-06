import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { vi } from 'vitest';
import { NavbarComponent } from './navbar.component';

function mockSidenav() {
  return { toggle: vi.fn(), opened: false, openedChange: new EventEmitter<boolean>() } as any;
}

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterModule.forRoot([])],
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

  it('"Book Consultation" link has routerLink="/contact"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const ctaLinks = Array.from(nativeEl.querySelectorAll('a[routerLink="/contact"]'));
    const ctaLink = ctaLinks.find((a) => a.textContent?.trim() === 'Book Consultation');
    expect(ctaLink).not.toBeUndefined();
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

  it('Client Login button has matMenuTrigger and mat-menu is in template', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const trigger = nativeEl.querySelector('button[data-testid="client-login-btn"]');
    expect(trigger).not.toBeNull();
    expect(trigger!.textContent?.trim()).toBe('Client Login');
    // Material sets aria-haspopup="menu" on the trigger element declaratively
    expect(trigger!.getAttribute('aria-haspopup')).toBe('menu');
  });
});
