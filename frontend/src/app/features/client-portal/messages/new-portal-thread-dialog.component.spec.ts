import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NewPortalThreadDialogComponent } from './new-portal-thread-dialog.component';
import { vi } from 'vitest';

describe('NewPortalThreadDialogComponent', () => {
  let component: NewPortalThreadDialogComponent;
  let mockDialogRef: any;

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [NewPortalThreadDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NewPortalThreadDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders subject and body form fields', () => {
    const compiled = component.getHostElement();
    const fields = compiled.querySelectorAll('mat-form-field');
    expect(fields.length).toBe(2);

    const labels = Array.from(compiled.querySelectorAll('mat-label')).map(el => el.textContent?.trim());
    expect(labels).toContain('Subject');
    expect(labels).toContain('Your message');
  });

  it('submit with empty fields marks fields touched and shows errors (does not close)', () => {
    const form = component.form;

    component.submit();

    expect(form.get('subject')?.touched).toBe(true);
    expect(form.get('body')?.touched).toBe(true);
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('submit with valid values calls dialogRef.close with subject and body', () => {
    const form = component.form;
    form.patchValue({
      subject: 'Test Subject',
      body: 'Test message body',
    });

    component.submit();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      subject: 'Test Subject',
      body: 'Test message body',
    });
  });

  it('subject with 201 chars makes form invalid', () => {
    const form = component.form;
    const longSubject = 'a'.repeat(201);
    form.patchValue({ subject: longSubject, body: 'valid' });

    expect(form.invalid).toBe(true);
    expect(form.get('subject')?.hasError('maxlength')).toBe(true);
  });
});
