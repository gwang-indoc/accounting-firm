import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
}
