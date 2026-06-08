import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { UserDto } from '../models/user.model';

export interface VerifyEmailCodeResponse {
  status: 'authenticated' | 'signup_required';
  signupToken?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<UserDto | null>(null);
  isAuthenticated = computed(() => this.currentUser() !== null);

  constructor(private http: HttpClient) {}

  async loadCurrentUser(): Promise<void> {
    try {
      const user = await firstValueFrom(this.http.get<UserDto>('/api/auth/me'));
      this.currentUser.set(user);
    } catch {
      this.currentUser.set(null);
    }
  }

  requestEmailCode(email: string): Promise<void> {
    return firstValueFrom(this.http.post<void>('/api/auth/email/request-code', { email }));
  }

  verifyEmailCode(email: string, code: string): Promise<VerifyEmailCodeResponse> {
    return firstValueFrom(
      this.http.post<VerifyEmailCodeResponse>('/api/auth/email/verify-code', { email, code })
    );
  }

  completeEmailSignup(signupToken: string, name: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>('/api/auth/email/complete-signup', { signupToken, name })
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      tap(() => this.currentUser.set(null))
    );
  }
}
