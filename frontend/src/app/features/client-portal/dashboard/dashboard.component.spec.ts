import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DashboardComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders mat-card wrapping welcome content', () => {
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('does not render a secondary mat-toolbar (logout moved to navbar)', () => {
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });

  it('Documents stat shows real count from /api/me/documents', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true,
      clientName: 'Jane',
      documents: [
        { id: 1, year: 2025, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-01T00:00:00', uploadedByMe: false },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-01T00:00:00', uploadedByMe: false },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues).toContain('2');
  });

  it('Tax Year stat shows most recent year from response', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true,
      clientName: 'Jane',
      documents: [
        { id: 1, year: 2025, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-01T00:00:00', uploadedByMe: false },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-01T00:00:00', uploadedByMe: false },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues).toContain('2025');
  });

  it('shows em-dash placeholders before the response arrives', () => {
    const statValues = Array.from(fixture.nativeElement.querySelectorAll('.stat-value')).map((e: any) => e.textContent.trim());
    expect(statValues.filter(v => v === '—').length).toBe(2);

    httpMock.expectOne('/api/me/documents').flush({ linked: false, clientName: null, documents: [] });
  });

  it('View Documents link points to /portal/documents', () => {
    httpMock.match(() => true).forEach(r => r.flush({ linked: false, clientName: null, documents: [] }));
    const link = fixture.nativeElement.querySelector('[data-testid="view-documents-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/documents');
    expect(link.textContent.trim()).toBe('View Documents');
  });
});
