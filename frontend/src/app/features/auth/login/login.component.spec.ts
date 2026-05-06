import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;

  function makeRoute(registered: string | null) {
    return {
      snapshot: { queryParamMap: { get: vi.fn().mockReturnValue(registered) } },
    };
  }

  async function setup(registered: string | null, snackBarMock?: { open: ReturnType<typeof vi.fn> }) {
    const providers: any[] = [
      provideZonelessChangeDetection(),
      { provide: ActivatedRoute, useValue: makeRoute(registered) },
    ];
    if (snackBarMock) {
      providers.push({ provide: MatSnackBar, useValue: snackBarMock });
    }
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers,
    }).compileComponents();
    const f = TestBed.createComponent(LoginComponent);
    f.detectChanges();
    await f.whenStable();
    return f;
  }

  beforeEach(async () => {
    fixture = await setup(null);
  });

  it('renders heading Client Portal', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Client Portal');
  });

  it('Google button has correct href', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector<HTMLAnchorElement>('a[href="/oauth2/authorization/google"]');
    expect(link).not.toBeNull();
  });

  it('Register button has routerLink /register', () => {
    const el: HTMLElement = fixture.nativeElement;
    const link = el.querySelector<HTMLAnchorElement>('a[routerLink="/register"]');
    expect(link).not.toBeNull();
  });

  it('shows snackbar when registered=true query param', async () => {
    await TestBed.resetTestingModule();
    const snackBarMock = { open: vi.fn() };
    await setup('true', snackBarMock);

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Account created! Please sign in.',
      'OK',
      { duration: 4000 }
    );
  });
});
