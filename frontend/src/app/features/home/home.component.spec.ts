import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';
import { provideRouter } from '@angular/router';

describe('HomeComponent', () => {
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
  });

  it.todo('<app-navbar /> moved to app layout — HomeComponent no longer owns navbar');

  it('renders hero heading', () => {
    const h1 = fixture.nativeElement.querySelector('.hero-heading') as HTMLElement;
    expect(h1).not.toBeNull();
    expect(h1.textContent).toContain('Financial clarity');
  });

  it('hero "Book a Free Consultation" link points to /book-consultation', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/book-consultation"]');
    expect(link).not.toBeNull();
  });

  it('hero "Client Portal" link points to /login', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/login"]');
    expect(link).not.toBeNull();
  });

  it('renders stats section with 4 stat items', () => {
    const stats = fixture.nativeElement.querySelectorAll('.stat-item');
    expect(stats.length).toBe(4);
  });

  it('renders services preview with 3 cards', () => {
    const cards = fixture.nativeElement.querySelectorAll('.service-card');
    expect(cards.length).toBe(3);
  });

  it('"View all services" link points to /services', () => {
    const link = fixture.nativeElement.querySelector('.view-all-link') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/services');
  });

  it('renders portal section heading', () => {
    const heading = fixture.nativeElement.querySelector('.portal-heading') as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.textContent).toContain('documents');
  });

  it('security section link points to /security', () => {
    const link = fixture.nativeElement.querySelector('a[routerLink="/security"]');
    expect(link).not.toBeNull();
  });

  it('final CTA link points to /book-consultation', () => {
    const ctaLinks = fixture.nativeElement.querySelectorAll('a[routerLink="/book-consultation"]');
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
  });
});
