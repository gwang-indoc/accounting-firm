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

  it('register POSTs to /api/auth/register and returns Observable<void>', () => {
    const dto = { fullName: 'Alice', email: 'alice@test.com', password: 'pass1234', confirmPassword: 'pass1234' };
    let completed = false;
    service.register(dto).subscribe({ complete: () => { completed = true; } });
    const req = httpMock.expectOne('/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(null);
    expect(completed).toBe(true);
  });

  it('loginWithEmail POSTs to /api/auth/login and returns Observable<void>', () => {
    const dto = { email: 'alice@test.com', password: 'pass1234' };
    let completed = false;
    service.loginWithEmail(dto).subscribe({ complete: () => { completed = true; } });
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(null);
    expect(completed).toBe(true);
  });
});
