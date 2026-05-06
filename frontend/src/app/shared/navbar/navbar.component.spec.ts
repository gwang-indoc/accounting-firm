import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './navbar.component';

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

  it('"Client Portal" renders <app-client-portal-login> inside navbar', () => {
    // app-client-portal-login is in the mobile drawer; open it first
    component.menuOpen.set(true);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    const clientPortalEl = nativeEl.querySelector('app-client-portal-login');
    expect(clientPortalEl).not.toBeNull();
  });

  it('mobile drawer contains <app-client-portal-login>', () => {
    component.menuOpen.set(true);
    fixture.detectChanges();
    const nativeEl = fixture.nativeElement as HTMLElement;
    expect(nativeEl.querySelector('.mobile-drawer app-client-portal-login')).not.toBeNull();
  });

  it('hamburger button exists in the DOM', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const hamburger = nativeEl.querySelector('[data-testid="hamburger"]');
    expect(hamburger).not.toBeNull();
  });

  it('menuOpen() is false by default', () => {
    expect(component.menuOpen()).toBe(false);
  });

  it('clicking the hamburger button sets menuOpen() to true', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const hamburger = nativeEl.querySelector('[data-testid="hamburger"]') as HTMLElement;
    hamburger.click();
    fixture.detectChanges();
    expect(component.menuOpen()).toBe(true);
  });

  it('clicking the hamburger button again sets menuOpen() back to false', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const hamburger = nativeEl.querySelector('[data-testid="hamburger"]') as HTMLElement;
    hamburger.click();
    fixture.detectChanges();
    hamburger.click();
    fixture.detectChanges();
    expect(component.menuOpen()).toBe(false);
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
