import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { UserDto } from '../models/user.model';

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

  register(dto: { fullName: string; email: string; password: string; confirmPassword: string }): Observable<void> {
    return this.http.post<void>('/api/auth/register', dto);
  }

  loginWithEmail(dto: { email: string; password: string }): Observable<void> {
    return this.http.post<void>('/api/auth/login', dto);
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}).pipe(
      tap(() => this.currentUser.set(null))
    );
  }
}
