import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DocumentsComponent } from './documents.component';
import { MyDocumentsResponse } from '../../../core/models/my-documents';

function linkedResponse(): MyDocumentsResponse {
  return {
    linked: true,
    clientName: 'Jane Smith',
    documents: [
      { id: 1, year: 2025, filename: 'T4-2025.pdf',          mimeType: 'application/pdf', sizeBytes: 50_000,  uploadedAt: '2026-02-14T10:23:00', uploadedByMe: false },
      { id: 2, year: 2025, filename: 'Tax-Return-2025.pdf',  mimeType: 'application/pdf', sizeBytes: 200_000, uploadedAt: '2026-03-02T09:00:00', uploadedByMe: false },
      { id: 3, year: 2024, filename: 'T4-2024.pdf',          mimeType: 'application/pdf', sizeBytes: 48_000,  uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
    ],
  };
}

describe('DocumentsComponent', () => {
  let fixture: ComponentFixture<DocumentsComponent>;
  let component: DocumentsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit + initial GET
  });

  afterEach(() => httpMock.verify());

  it('renders not-set-up empty state when linked is false', async () => {
    httpMock.expectOne('/api/me/documents').flush({ linked: false, clientName: null, documents: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Your portal isn't set up yet");
    expect(fixture.nativeElement.querySelector('select.year-select')).toBeNull();
  });

  it('renders no-documents empty state when linked but documents is empty', async () => {
    httpMock.expectOne('/api/me/documents').flush({ linked: true, clientName: 'Jane', documents: [] });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No documents have been shared with you yet');
  });

  it('year dropdown shows unique years sorted descending', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select.year-select option')) as HTMLOptionElement[];
    const values = options.map(o => o.value);
    expect(values).toEqual(['2025', '2024']);
  });

  it('default selected year is the most recent year', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.selectedYear()).toBe(2025);
  });

  it('changing the year filters the displayed list', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedYear.set(2024);
    fixture.detectChanges();

    const rowTexts = Array.from(fixture.nativeElement.querySelectorAll('.doc-row')).map((r: any) => r.textContent);
    expect(rowTexts.length).toBe(1);
    expect(rowTexts[0]).toContain('T4-2024.pdf');
  });

  it('"Download All" button is disabled when selected year has no docs', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    component.selectedYear.set(2030 as any);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button.download-all-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
  });

  it('"Download All" button is enabled and triggers navigation when year has docs', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    let navigatedTo = '';
    component.navigate = (url: string) => { navigatedTo = url; };

    const btn = fixture.nativeElement.querySelector('button.download-all-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(navigatedTo).toBe('/api/me/documents/zip?year=2025');
  });

  it('per-row Download link points to the right URL', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();

    const links = Array.from(fixture.nativeElement.querySelectorAll('a.download-link')) as HTMLAnchorElement[];
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/api/me/documents/1/download');
    expect(links[1].getAttribute('href')).toBe('/api/me/documents/2/download');
  });
});
