import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, of } from 'rxjs';
import { LoginEmailComponent } from './login-email.component';
import { AuthService } from '../../../core/services/auth.service';

describe('LoginEmailComponent', () => {
  let fixture: ComponentFixture<LoginEmailComponent>;
  let component: LoginEmailComponent;
  const authServiceMock = { loginWithEmail: vi.fn(), loadCurrentUser: vi.fn().mockResolvedValue(undefined) };
  const routerMock = { navigate: vi.fn() };

  beforeEach(async () => {
    authServiceMock.loginWithEmail.mockReset();
    authServiceMock.loadCurrentUser.mockReset().mockResolvedValue(undefined);
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [LoginEmailComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: vi.fn() } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('(a) 401 error sets loginError signal to true and shows error div', async () => {
    authServiceMock.loginWithEmail.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );

    component.form.setValue({ email: 'user@example.com', password: 'wrongpass' });
    component.submit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.loginError()).toBe(true);
    const errorDiv = fixture.nativeElement.querySelector('[data-testid="login-error"]');
    expect(errorDiv).not.toBeNull();
  });

  it('(b) successful login navigates to /portal/dashboard', async () => {
    authServiceMock.loginWithEmail.mockReturnValue(of(undefined));

    component.form.setValue({ email: 'user@example.com', password: 'correctpass' });
    component.submit();
    await fixture.whenStable();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/portal/dashboard']);
  });
});
