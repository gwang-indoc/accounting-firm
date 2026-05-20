import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
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
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit + initial GET
  });

  afterEach(() => httpMock.verify());

  it('renders a back link to the dashboard', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('[data-testid="back-to-dashboard-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/dashboard');
  });

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
    expect(fixture.nativeElement.textContent).toContain('No documents yet');
  });

  it('year dropdown includes doc years and the current year + 9 prior, sorted descending', async () => {
    httpMock.expectOne('/api/me/documents').flush(linkedResponse());
    await fixture.whenStable();
    fixture.detectChanges();
    const options = Array.from(fixture.nativeElement.querySelectorAll('select.year-select option')) as HTMLOptionElement[];
    const values = options.map(o => o.value);
    const currentYear = new Date().getFullYear();
    expect(values).toContain('2025');
    expect(values).toContain('2024');
    for (let i = 0; i <= 9; i++) {
      expect(values).toContain(String(currentYear - i));
    }
    const numeric = values.map(Number);
    expect(numeric).toEqual([...numeric].sort((a, b) => b - a));
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

describe('DocumentsComponent — upload', () => {
  let fixture: ComponentFixture<DocumentsComponent>;
  let component: DocumentsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders the Upload button in the controls row when documents are present', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('button.upload-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Upload');
  });

  it('renders "Uploaded by you" chip on uploadedByMe rows only', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'a.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: true },
        { id: 2, year: 2024, filename: 'b.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows[0].querySelector('.badge-you')).not.toBeNull();
    expect(rows[1].querySelector('.badge-you')).toBeNull();
  });

  it('upload success appends the new item and clears the uploading flag', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const file = new File(['hello'], 'Receipts-2024.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [file], value: '' } } as any);

    const req = httpMock.expectOne('/api/me/documents?year=2024');
    req.flush({
      id: 99, year: 2024, filename: 'Receipts-2024.pdf',
      mimeType: 'application/pdf', sizeBytes: 5, uploadedAt: '2026-05-19T10:00:00',
      uploadedByMe: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploading()).toBe(false);
    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Receipts-2024.pdf');
  });

  it('upload 409 surfaces the duplicate error and does not append', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'dup.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const snackSpy = vi.spyOn((component as any).snackBar, 'open');

    const file = new File(['x'], 'dup.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [file], value: '' } } as any);

    httpMock.expectOne('/api/me/documents?year=2024').flush(
      { message: 'A file named "dup.pdf" already exists for 2024.', filename: 'dup.pdf', year: 2024 },
      { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploading()).toBe(false);
    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows.length).toBe(1);
    expect(snackSpy).toHaveBeenCalled();
    expect(snackSpy.mock.calls[0][0]).toContain('already exists');
  });

  it('can upload to a year that has no existing documents', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [
        { id: 1, year: 2024, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
      ]});
    await fixture.whenStable();
    fixture.detectChanges();

    const newYear = new Date().getFullYear();
    component.selectedYear.set(newYear);
    fixture.detectChanges();

    const file = new File(['hello'], 'Q1.pdf', { type: 'application/pdf' });
    component.onFileSelected({ target: { files: [file], value: '' } } as any);

    const req = httpMock.expectOne(`/api/me/documents?year=${newYear}`);
    req.flush({
      id: 99, year: newYear, filename: 'Q1.pdf',
      mimeType: 'application/pdf', sizeBytes: 5, uploadedAt: '2026-05-19T10:00:00',
      uploadedByMe: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.uploading()).toBe(false);
    const rows = fixture.nativeElement.querySelectorAll('.doc-row');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Q1.pdf');
  });

  it('empty state (linked, zero docs) renders a year picker and Upload button', async () => {
    httpMock.expectOne('/api/me/documents').flush({
      linked: true, clientName: 'Jane', documents: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('select.empty-year-select')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('button.empty-upload-btn')).not.toBeNull();
  });
});
