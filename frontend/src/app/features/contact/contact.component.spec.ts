import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContactComponent } from './contact.component';
import { ContactService } from '../../core/services/contact.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
  const contactServiceMock = { send: vi.fn() };
  const snackBarMock = { open: vi.fn() };

  beforeEach(async () => {
    contactServiceMock.send.mockReset();
    snackBarMock.open.mockReset();
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ContactService, useValue: contactServiceMock },
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders four mat-form-field elements and a stroked Send Message button', () => {
    const fields = fixture.nativeElement.querySelectorAll('mat-form-field');
    expect(fields.length).toBe(4);
    const btn = fixture.nativeElement.querySelector('button[mat-stroked-button]');
    expect(btn).not.toBeNull();
    expect(btn.textContent.trim()).toBe('Send Message');
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

  it('on success, form is reset and snackbar shows success message', async () => {
    contactServiceMock.send.mockReturnValue(of(undefined));
    component.form.patchValue({ name: 'Alice', email: 'a@b.com', subject: 'S', message: 'M', companyUrl: '' });
    fixture.detectChanges();

    component.submit();
    await fixture.whenStable();

    expect(component.form.value.name).toBeFalsy();
    expect(snackBarMock.open).toHaveBeenCalledWith(
      "Thanks — we'll reply soon", undefined, { duration: 3000 }
    );
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
