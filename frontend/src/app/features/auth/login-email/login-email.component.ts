import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCard } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, TranslateModule, MatCard, MatFormField, MatLabel, MatInput, MatButton],
  templateUrl: './login-email.component.html',
  styleUrl: './login-email.component.css',
})
export class LoginEmailComponent {
  form: FormGroup;
  loginError = signal(false);
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  constructor(fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.form = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.loginError.set(false);
    this.authService.loginWithEmail(this.form.value).subscribe({
      next: async () => {
        await this.authService.loadCurrentUser();
        this.router.navigate(['/portal/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.loginError.set(true);
          this.langChangeSignal.set(this.translate.currentLang);
        }
      },
    });
  }
}
