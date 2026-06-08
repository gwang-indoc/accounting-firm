import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';

function buildAuthService() {
  return {
    requestEmailCode: vi.fn().mockResolvedValue(undefined),
    verifyEmailCode: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    completeEmailSignup: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn().mockResolvedValue(undefined),
  };
}

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: buildAuthService() },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('renders heading Client Portal', () => {
    expect(fixture.nativeElement.textContent).toContain('Client Portal');
  });

  it('Google button has correct href', () => {
    const link = fixture.nativeElement.querySelector('a[href="/oauth2/authorization/google"]');
    expect(link).not.toBeNull();
  });

  it('renders app-login-email-code component', () => {
    const emailCodeEl = fixture.nativeElement.querySelector('app-login-email-code');
    expect(emailCodeEl).not.toBeNull();
  });

  it('does NOT render register link', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/register"]');
    expect(link).toBeNull();
  });

  it('does NOT render /login/email link', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/login/email"]');
    expect(link).toBeNull();
  });
});
