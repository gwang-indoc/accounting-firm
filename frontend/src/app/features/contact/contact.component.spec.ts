import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContactComponent } from './contact.component';
import { ContactService } from '../../core/services/contact.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';

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
});
