import { Component } from '@angular/core';
import { LoginEmailCodeComponent } from '../login-email-code/login-email-code.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginEmailCodeComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {}
