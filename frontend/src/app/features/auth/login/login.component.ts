import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LoginEmailCodeComponent } from '../login-email-code/login-email-code.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [LoginEmailCodeComponent, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {}
