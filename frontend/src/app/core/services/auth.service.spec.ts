import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { UserDto } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loadCurrentUser on 200 sets currentUser and isAuthenticated returns true', async () => {
    const user: UserDto = { id: 1, email: 'test@example.com', name: 'Test', role: 'USER' };
    const promise = service.loadCurrentUser();
    const req = httpMock.expectOne('/api/auth/me');
    req.flush(user);
    await promise;
    expect(service.currentUser()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('loadCurrentUser on 401 sets currentUser to null and isAuthenticated returns false', async () => {
    const promise = service.loadCurrentUser();
    const req = httpMock.expectOne('/api/auth/me');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    await promise;
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('requestEmailCode POSTs to /api/auth/email/request-code', async () => {
    const promise = service.requestEmailCode('user@example.com');
    const req = httpMock.expectOne('/api/auth/email/request-code');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com' });
    req.flush({ status: 'code_sent' });
    await promise;
  });

  it('verifyEmailCode POSTs to /api/auth/email/verify-code and returns status', async () => {
    const promise = service.verifyEmailCode('user@example.com', '123456');
    const req = httpMock.expectOne('/api/auth/email/verify-code');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com', code: '123456' });
    req.flush({ status: 'authenticated' });
    const result = await promise;
    expect(result.status).toBe('authenticated');
  });

  it('verifyEmailCode returns signupToken when signup_required', async () => {
    const promise = service.verifyEmailCode('new@example.com', '999999');
    const req = httpMock.expectOne('/api/auth/email/verify-code');
    req.flush({ status: 'signup_required', signupToken: 'tok.123' });
    const result = await promise;
    expect(result.status).toBe('signup_required');
    expect(result.signupToken).toBe('tok.123');
  });

  it('completeEmailSignup POSTs to /api/auth/email/complete-signup', async () => {
    const promise = service.completeEmailSignup('tok.123', 'Alice');
    const req = httpMock.expectOne('/api/auth/email/complete-signup');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ signupToken: 'tok.123', name: 'Alice' });
    req.flush(null);
    await promise;
  });

  it('register method does not exist on AuthService', () => {
    expect((service as any).register).toBeUndefined();
  });

  it('loginWithEmail method does not exist on AuthService', () => {
    expect((service as any).loginWithEmail).toBeUndefined();
  });
});
