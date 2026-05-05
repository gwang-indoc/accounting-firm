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
});
