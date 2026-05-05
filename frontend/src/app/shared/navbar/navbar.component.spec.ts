import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
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
});
