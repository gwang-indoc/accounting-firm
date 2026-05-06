import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './login-email.component.html',
  styleUrl: './login-email.component.css',
})
export class LoginEmailComponent {
  form: FormGroup;
  loginError = signal(false);

  constructor(fb: FormBuilder, private router: Router, private authService: AuthService) {
    this.form = fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
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
        }
      },
    });
  }
}
