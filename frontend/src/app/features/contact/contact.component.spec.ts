import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactComponent);
    fixture.detectChanges();
  });

  it('renders the four contact detail items', () => {
    const details = fixture.nativeElement.querySelectorAll('.detail-item');
    expect(details.length).toBe(4);
  });

  it('renders Visit Us, Call Us, Email Us, and Office Hours labels', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Visit Us');
    expect(text).toContain('Call Us');
    expect(text).toContain('Email Us');
    expect(text).toContain('Office Hours');
  });

  it('renders the Google Maps iframe', () => {
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('title')).toBe('Office location map');
  });

  it('does NOT render a form (moved to /book-consultation)', () => {
    const form = fixture.nativeElement.querySelector('form');
    expect(form).toBeNull();
  });

  it('does NOT render the honeypot input (moved to /book-consultation)', () => {
    const honeypot = fixture.nativeElement.querySelector('input[name="companyUrl"]');
    expect(honeypot).toBeNull();
  });
});
