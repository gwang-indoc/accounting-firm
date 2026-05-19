import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders mat-sidenav-container in app template', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-sidenav-container')).not.toBeNull();
  });

  it('renders mat-sidenav in app template', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('mat-sidenav')).not.toBeNull();
  });

  it('side nav has a Contact list item pointing to /contact', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = Array.from(fixture.nativeElement.querySelectorAll('mat-sidenav a[mat-list-item]'));
    const contactItem = items.find((a: any) => a.getAttribute('routerLink') === '/contact');
    expect(contactItem).not.toBeUndefined();
    expect((contactItem as HTMLElement).textContent?.trim()).toBe('Contact');
  });

  it('side nav has a Book Consultation list item pointing to /book-consultation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = Array.from(fixture.nativeElement.querySelectorAll('mat-sidenav a[mat-list-item]'));
    const ctaItem = items.find((a: any) => a.getAttribute('routerLink') === '/book-consultation');
    expect(ctaItem).not.toBeUndefined();
    expect((ctaItem as HTMLElement).textContent?.trim()).toBe('Book Consultation');
  });
});
