import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let router: Router;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    mockAuthService = {
      isAuthenticated: signal(false) as any,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    router = TestBed.inject(Router);
  });

  it('unauthenticated user is redirected to /', () => {
    (mockAuthService.isAuthenticated as any).set(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('authenticated user passes through', () => {
    (mockAuthService.isAuthenticated as any).set(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    expect(result).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
