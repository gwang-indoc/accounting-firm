import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCard } from '@angular/material/card';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

function passwordMatch(group: AbstractControl) {
  return group.get('password')?.value === group.get('confirmPassword')?.value
    ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, TranslateModule, MatCard, MatFormField, MatLabel, MatError, MatInput, MatButton],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  form: FormGroup;
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  constructor(fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.form = fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: passwordMatch });
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }

  submit() {
    if (this.form.invalid) return;
    this.authService.register(this.form.value).subscribe({
      next: () => this.router.navigate(['/login'], { queryParams: { registered: 'true' } }),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.form.get('email')?.setErrors({ emailTaken: true });
        }
      }
    });
  }
}
