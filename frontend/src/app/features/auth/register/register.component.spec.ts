import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError, of } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService } from '../../../core/services/auth.service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  const authServiceMock = { register: vi.fn() };
  const routerMock = { navigate: vi.fn() };

  beforeEach(async () => {
    authServiceMock.register.mockReset();
    routerMock.navigate.mockReset();

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('(a) passwordMatch validator returns passwordMismatch error when fields differ', () => {
    component.form.setValue({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password1',
      confirmPassword: 'different1',
    });
    expect(component.form.hasError('passwordMismatch')).toBe(true);
  });

  it('(b) 409 response sets emailTaken error on email control', () => {
    authServiceMock.register.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409 }))
    );

    component.form.setValue({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password1',
      confirmPassword: 'password1',
    });

    component.submit();

    expect(component.form.get('email')?.hasError('emailTaken')).toBe(true);
  });

  it('(c) successful register navigates to /login with registered=true', () => {
    authServiceMock.register.mockReturnValue(of(undefined));

    component.form.setValue({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'password1',
      confirmPassword: 'password1',
    });

    component.submit();

    expect(routerMock.navigate).toHaveBeenCalledWith(
      ['/login'],
      { queryParams: { registered: 'true' } }
    );
  });
});
