import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login-email-code',
  standalone: true,
  imports: [],
  templateUrl: './login-email-code.component.html',
  styleUrl: './login-email-code.component.css',
})
export class LoginEmailCodeComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  step = signal<'email' | 'code' | 'name'>('email');
  emailValue = signal('');
  codeValue = signal('');
  nameValue = signal('');
  error = signal<string | null>(null);
  signupToken = signal<string | null>(null);
  submitting = signal(false);
  resent = signal(false);

  async onEmailSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.requestEmailCode(this.emailValue());
      this.codeValue.set('');
      this.step.set('code');
    } catch {
      this.error.set('We could not send a code right now. Please try again in a moment.');
    } finally {
      this.submitting.set(false);
    }
  }

  async onCodeSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      const result = await this.auth.verifyEmailCode(this.emailValue(), this.codeValue());
      if (result.status === 'authenticated') {
        await this.auth.loadCurrentUser();
        this.router.navigate(['/portal/dashboard']);
      } else {
        this.signupToken.set(result.signupToken ?? null);
        this.nameValue.set('');
        this.step.set('name');
      }
    } catch {
      this.error.set('That code is invalid or has expired. Check the code and try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async onNameSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.submitting()) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.completeEmailSignup(this.signupToken()!, this.nameValue());
      await this.auth.loadCurrentUser();
      this.router.navigate(['/portal/dashboard']);
    } catch {
      this.error.set('We could not finish creating your account. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  changeEmail(): void {
    this.error.set(null);
    this.resent.set(false);
    this.codeValue.set('');
    this.step.set('email');
  }

  async resendCode(): Promise<void> {
    if (this.submitting()) return;
    this.error.set(null);
    this.submitting.set(true);
    try {
      await this.auth.requestEmailCode(this.emailValue());
      this.resent.set(true);
    } catch {
      this.error.set('We could not resend the code. Please try again shortly.');
    } finally {
      this.submitting.set(false);
    }
  }
}
