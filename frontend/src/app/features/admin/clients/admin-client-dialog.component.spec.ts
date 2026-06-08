import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminClientDialogComponent } from './admin-client-dialog.component';
import { AdminClientsService } from '../../../core/services/admin-clients.service';

function makeService(lookupFn: (email: string) => unknown): Partial<AdminClientsService> {
  return {
    lookupUserByEmail: vi.fn().mockImplementation(lookupFn),
    create: vi.fn().mockReturnValue(of({ id: 1, name: 'Jane', email: 'jane@a.com', phone: null, createdAt: '', linkedUserId: null, adminId: 99 })),
    update: vi.fn(),
    getAll: vi.fn().mockReturnValue(of([])),
    delete: vi.fn(),
  } as Partial<AdminClientsService>;
}

async function setup(service: Partial<AdminClientsService>): Promise<ComponentFixture<AdminClientDialogComponent>> {
  await TestBed.configureTestingModule({
    imports: [AdminClientDialogComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: MAT_DIALOG_DATA, useValue: { client: null } },
      { provide: MatDialogRef, useValue: { close: vi.fn() } },
      { provide: AdminClientsService, useValue: service },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminClientDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe('AdminClientDialogComponent email validator', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('auto-fills name and shows hint when email matches a registered user', async () => {
    const svc = makeService(() => of({ name: 'John Doe' }));
    const fixture = await setup(svc);
    const comp = fixture.componentInstance as any;

    comp.form.get('email').setValue('john@example.com');
    await vi.advanceTimersByTimeAsync(500);
    await fixture.whenStable();

    expect(comp.form.get('name').value).toBe('John Doe');
    expect(comp.form.get('email').errors).toBeNull();
    expect(comp.emailHint()).toBe('Registered user: John Doe');
  });

  it('sets notRegistered error when email is not in users table', async () => {
    const svc = makeService(() => throwError(() => new HttpErrorResponse({ status: 404 })));
    const fixture = await setup(svc);
    const comp = fixture.componentInstance as any;

    comp.form.get('email').setValue('ghost@example.com');
    await vi.advanceTimersByTimeAsync(500);
    await fixture.whenStable();

    expect(comp.form.get('email').errors?.['notRegistered']).toBe(true);
  });

  it('makes no API call for invalid email format', async () => {
    const svc = makeService(() => of({ name: 'X' }));
    const fixture = await setup(svc);
    const comp = fixture.componentInstance as any;

    comp.form.get('email').setValue('not-an-email');
    await vi.advanceTimersByTimeAsync(500);
    await fixture.whenStable();

    expect((svc as any).lookupUserByEmail).not.toHaveBeenCalled();
  });

  it('sets duplicateClient error when create returns 409', async () => {
    const svc = makeService(() => of({ name: 'Dup User' }));
    (svc as any).create = vi.fn().mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const fixture = await setup(svc);
    const comp = fixture.componentInstance as any;

    comp.form.get('email').setValue('dup@example.com');
    await vi.advanceTimersByTimeAsync(500);
    await fixture.whenStable();

    comp.form.get('name').setValue('Dup Name');
    // mark form valid so submit proceeds (async validator pending state bypassed)
    comp.form.get('email').setErrors(null);
    comp.submit();
    // throwError is synchronous — error handler runs inline
    expect(comp.form.get('email').errors?.['duplicateClient']).toBe(true);
  });
});
