import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientPortalLoginComponent } from './client-portal-login.component';

describe('ClientPortalLoginComponent', () => {
  let component: ClientPortalLoginComponent;
  let fixture: ComponentFixture<ClientPortalLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientPortalLoginComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ClientPortalLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dropdown is hidden by default', () => {
    const dropdown = fixture.nativeElement.querySelector('.login-dropdown');
    expect(dropdown).toBeNull();
  });

  it('clicking Client Login button shows dropdown', async () => {
    const button = fixture.nativeElement.querySelector('[data-testid="client-login-btn"]');
    button.click();
    fixture.detectChanges();
    const dropdown = fixture.nativeElement.querySelector('.login-dropdown');
    expect(dropdown).not.toBeNull();
  });

  it('clicking outside hides dropdown', async () => {
    // Open it first
    const button = fixture.nativeElement.querySelector('[data-testid="client-login-btn"]');
    button.click();
    fixture.detectChanges();
    // Click outside (on document body)
    document.body.click();
    fixture.detectChanges();
    const dropdown = fixture.nativeElement.querySelector('.login-dropdown');
    expect(dropdown).toBeNull();
  });

  it('"Sign in with Google" link href is /api/auth/login', async () => {
    const button = fixture.nativeElement.querySelector('[data-testid="client-login-btn"]');
    button.click();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('[data-testid="google-signin-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/api/auth/login');
  });
});
