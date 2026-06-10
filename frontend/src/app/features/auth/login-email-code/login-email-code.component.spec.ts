import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { TranslateModule } from '@ngx-translate/core';
import { LoginEmailCodeComponent } from './login-email-code.component';
import { AuthService } from '../../../core/services/auth.service';

function buildAuthService(overrides: Partial<{
  requestEmailCode: ReturnType<typeof vi.fn>;
  verifyEmailCode: ReturnType<typeof vi.fn>;
  completeEmailSignup: ReturnType<typeof vi.fn>;
  loadCurrentUser: ReturnType<typeof vi.fn>;
}> = {}) {
  return {
    requestEmailCode: vi.fn().mockResolvedValue(undefined),
    verifyEmailCode: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    completeEmailSignup: vi.fn().mockResolvedValue(undefined),
    loadCurrentUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

async function setup(authOverrides?: Parameters<typeof buildAuthService>[0]) {
  const authService = buildAuthService(authOverrides);
  const router = { navigate: vi.fn().mockResolvedValue(true) };

  await TestBed.configureTestingModule({
    imports: [LoginEmailCodeComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoginEmailCodeComponent);
  fixture.detectChanges();
  return { fixture, authService, router };
}

async function submitEmailStep(fixture: ComponentFixture<LoginEmailCodeComponent>, email: string) {
  const input = fixture.nativeElement.querySelector('input[type="email"]') as HTMLInputElement;
  input.value = email;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  const form = fixture.nativeElement.querySelector('form');
  form.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  fixture.detectChanges();
}

// ── 6.1 Email step ─────────────────────────────────────────────────────────

describe('LoginEmailCodeComponent — email step', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders email input on initial step', async () => {
    const { fixture } = await setup();
    const input = fixture.nativeElement.querySelector('input[type="email"]');
    expect(input).not.toBeNull();
  });

  it('submitting email calls requestEmailCode with the entered email', async () => {
    const { fixture, authService } = await setup();
    await submitEmailStep(fixture, 'user@example.com');
    expect(authService.requestEmailCode).toHaveBeenCalledWith('user@example.com');
  });

  it('after successful request, advances to code step (code input visible)', async () => {
    const { fixture } = await setup();
    await submitEmailStep(fixture, 'user@example.com');
    const codeInput = fixture.nativeElement.querySelector('[data-testid="code-input"]');
    expect(codeInput).not.toBeNull();
  });
});

// ── 6.3 Code step ──────────────────────────────────────────────────────────

describe('LoginEmailCodeComponent — code step', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function reachCodeStep(fixture: ComponentFixture<LoginEmailCodeComponent>) {
    await submitEmailStep(fixture, 'user@example.com');
  }

  async function submitCodeStep(fixture: ComponentFixture<LoginEmailCodeComponent>, code: string) {
    const codeInput = fixture.nativeElement.querySelector('[data-testid="code-input"]') as HTMLInputElement;
    codeInput.value = code;
    codeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('authenticated response calls loadCurrentUser then navigates to /portal/dashboard', async () => {
    const { fixture, authService, router } = await setup({
      verifyEmailCode: vi.fn().mockResolvedValue({ status: 'authenticated' }),
    });
    await reachCodeStep(fixture);
    await submitCodeStep(fixture, '123456');
    expect(authService.loadCurrentUser).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/portal/dashboard']);
  });

  it('signup_required response advances to name step (name input visible)', async () => {
    const { fixture } = await setup({
      verifyEmailCode: vi.fn().mockResolvedValue({ status: 'signup_required', signupToken: 'tok123' }),
    });
    await reachCodeStep(fixture);
    await submitCodeStep(fixture, '123456');
    const nameInput = fixture.nativeElement.querySelector('[data-testid="name-input"]');
    expect(nameInput).not.toBeNull();
  });

  it('401 error shows data-testid="login-error" banner', async () => {
    const { fixture } = await setup({
      verifyEmailCode: vi.fn().mockRejectedValue({ status: 401 }),
    });
    await reachCodeStep(fixture);
    await submitCodeStep(fixture, '999999');
    const banner = fixture.nativeElement.querySelector('[data-testid="login-error"]');
    expect(banner).not.toBeNull();
  });
});

// ── 6.5 Name step ──────────────────────────────────────────────────────────

describe('LoginEmailCodeComponent — name step', () => {
  afterEach(() => TestBed.resetTestingModule());

  async function reachNameStep(fixture: ComponentFixture<LoginEmailCodeComponent>, authService: ReturnType<typeof buildAuthService>) {
    await submitEmailStep(fixture, 'new@example.com');
    // advance to code step
    const codeInput = fixture.nativeElement.querySelector('[data-testid="code-input"]') as HTMLInputElement;
    codeInput.value = '123456';
    codeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('submitting name calls completeEmailSignup then loadCurrentUser then navigates', async () => {
    const signupToken = 'signed.jwt.token';
    const { fixture, authService, router } = await setup({
      verifyEmailCode: vi.fn().mockResolvedValue({ status: 'signup_required', signupToken }),
    });
    await reachNameStep(fixture, authService);

    const nameInput = fixture.nativeElement.querySelector('[data-testid="name-input"]') as HTMLInputElement;
    nameInput.value = 'Alice Smith';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const form = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(authService.completeEmailSignup).toHaveBeenCalledWith(signupToken, 'Alice Smith');
    expect(authService.loadCurrentUser).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/portal/dashboard']);
  });
});

// ── Professional affordances: code-sent line, change-email, resend ──────────

describe('LoginEmailCodeComponent — code step affordances', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('code step shows the email the code was sent to', async () => {
    const { fixture } = await setup();
    await submitEmailStep(fixture, 'sent-to@example.com');
    const sentTo = fixture.nativeElement.querySelector('[data-testid="code-sent-to"]');
    expect(sentTo).not.toBeNull();
    expect(sentTo.textContent).toContain('sent-to@example.com');
  });

  it('"change email" returns to the email step', async () => {
    const { fixture } = await setup();
    await submitEmailStep(fixture, 'user@example.com');
    expect(fixture.nativeElement.querySelector('[data-testid="code-input"]')).not.toBeNull();

    const changeBtn = fixture.nativeElement.querySelector('[data-testid="change-email"]') as HTMLButtonElement;
    expect(changeBtn).not.toBeNull();
    changeBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[type="email"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="code-input"]')).toBeNull();
  });

  it('"resend code" calls requestEmailCode again with the same email', async () => {
    const { fixture, authService } = await setup();
    await submitEmailStep(fixture, 'user@example.com');
    expect(authService.requestEmailCode).toHaveBeenCalledTimes(1);

    const resendBtn = fixture.nativeElement.querySelector('[data-testid="resend-code"]') as HTMLButtonElement;
    expect(resendBtn).not.toBeNull();
    resendBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(authService.requestEmailCode).toHaveBeenCalledTimes(2);
    expect(authService.requestEmailCode).toHaveBeenLastCalledWith('user@example.com');
  });

  it('"change email" buttons are type="button" (do not submit the code form)', async () => {
    const { fixture, authService } = await setup();
    await submitEmailStep(fixture, 'user@example.com');
    const changeBtn = fixture.nativeElement.querySelector('[data-testid="change-email"]') as HTMLButtonElement;
    const resendBtn = fixture.nativeElement.querySelector('[data-testid="resend-code"]') as HTMLButtonElement;
    expect(changeBtn.getAttribute('type')).toBe('button');
    expect(resendBtn.getAttribute('type')).toBe('button');
    // verifyEmailCode must not have fired from the change/resend clicks
    expect(authService.verifyEmailCode).not.toHaveBeenCalled();
  });
});
