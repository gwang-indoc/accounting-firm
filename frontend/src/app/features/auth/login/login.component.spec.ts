import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  describe('default (no query params)', () => {
    let fixture: ComponentFixture<LoginComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [LoginComponent],
        providers: [
          provideZonelessChangeDetection(),
          { provide: MatSnackBar, useValue: { open: vi.fn() } },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: vi.fn().mockReturnValue(null) } } } },
        ],
      }).compileComponents();
      fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
    });

    it('renders heading Client Portal', () => {
      expect(fixture.nativeElement.textContent).toContain('Client Portal');
    });

    it('Google button has correct href', () => {
      const link = fixture.nativeElement.querySelector('a[href="/oauth2/authorization/google"]');
      expect(link).not.toBeNull();
    });

    it('Register button has routerLink /register', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/register"]');
      expect(link).not.toBeNull();
    });
  });

  describe('with registered=true query param', () => {
    let snackBarMock: { open: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
      snackBarMock = { open: vi.fn() };
      await TestBed.configureTestingModule({
        imports: [LoginComponent],
        providers: [
          provideZonelessChangeDetection(),
          { provide: MatSnackBar, useValue: snackBarMock },
          { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: vi.fn().mockReturnValue('true') } } } },
        ],
      }).compileComponents();
      const f = TestBed.createComponent(LoginComponent);
      f.detectChanges();
    });

    it('shows snackbar when registered=true query param', () => {
      expect(snackBarMock.open).toHaveBeenCalledWith(
        'Account created! Please sign in.',
        'OK',
        { duration: 4000 }
      );
    });
  });
});
