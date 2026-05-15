import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BookConsultationComponent } from './book-consultation.component';
import { ContactService } from '../../core/services/contact.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

describe('BookConsultationComponent', () => {
  let fixture: ComponentFixture<BookConsultationComponent>;
  let component: BookConsultationComponent;
  const contactServiceMock = { send: vi.fn() };
  const snackBarMock = { open: vi.fn() };

  beforeEach(async () => {
    contactServiceMock.send.mockReset();
    snackBarMock.open.mockReset();
    await TestBed.configureTestingModule({
      imports: [BookConsultationComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContactService, useValue: contactServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(BookConsultationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders four mat-form-field elements and a stroked Send Message button', () => {
    const fields = fixture.nativeElement.querySelectorAll('mat-form-field');
    expect(fields.length).toBe(4);
    const btn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Send Message');
  });

  it('form is invalid when name is empty', () => {
    component.form.patchValue({ name: '', email: 'a@b.com', subject: 'S', message: 'M' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is invalid when email is not valid', () => {
    component.form.patchValue({ name: 'Alice', email: 'not-an-email', subject: 'S', message: 'M' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is invalid when message exceeds 5000 chars', () => {
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'x'.repeat(5001) });
    expect(component.form.invalid).toBe(true);
  });

  it('Send button is disabled when form is invalid', () => {
    component.form.patchValue({ name: '', email: 'a@b.com', subject: 'S', message: 'M' });
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    expect(btn.disabled).toBe(true);
  });

  it('clicking Send with valid form calls ContactService.send once', async () => {
    contactServiceMock.send.mockReturnValue(of(undefined));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    btn.click();
    await fixture.whenStable();

    expect(contactServiceMock.send).toHaveBeenCalledTimes(1);
    expect(contactServiceMock.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M' })
    );
  });

  it('after a successful submit, no mat-error is visible for any field', async () => {
    contactServiceMock.send.mockReturnValue(of(undefined));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    btn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    const errors = fixture.nativeElement.querySelectorAll('mat-error');
    expect(errors.length).toBe(0);
  });

  it('on success, inline confirmation appears and no snackbar is opened', async () => {
    contactServiceMock.send.mockReturnValue(of(undefined));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    const confirmation = fixture.nativeElement.querySelector('[role="status"]');
    expect(confirmation).not.toBeNull();
    expect(confirmation.textContent).toContain("Thanks — we'll reply soon");
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('inline confirmation hides when user types in any field after success', async () => {
    contactServiceMock.send.mockReturnValue(of(undefined));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    component.submit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();

    const nameInput = fixture.nativeElement.querySelector('input[formcontrolname="name"]');
    nameInput.value = 'A';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();

    nameInput.value = 'Al';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
  });

  it('onFormInput is a no-op when confirmation is already hidden', () => {
    component.showConfirmation.set(false);
    component.onFormInput();
    expect(component.showConfirmation()).toBe(false);
  });

  it('on error, form values are preserved and error snackbar opens', async () => {
    contactServiceMock.send.mockReturnValue(throwError(() => new Error('server error')));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    component.submit();
    await fixture.whenStable();

    expect(component.form.value.name).toBe('Alice');
    expect(snackBarMock.open).toHaveBeenCalledWith(
      expect.stringContaining('wrong'), 'OK'
    );
  });

  it('honeypot input has correct off-screen attributes', () => {
    const honeypot = fixture.nativeElement.querySelector('input[name="companyUrl"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot.getAttribute('tabindex')).toBe('-1');
    expect(honeypot.getAttribute('aria-hidden')).toBe('true');
    // Check inline style for off-screen positioning
    expect(honeypot.style.position).toBe('absolute');
    expect(honeypot.style.left).toBe('-9999px');
  });
});
