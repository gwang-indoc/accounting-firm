import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MyDocumentsService } from './my-documents.service';
import { MyDocumentItem, MyDocumentsResponse } from '../models/my-documents';

describe('MyDocumentsService', () => {
  let service: MyDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyDocumentsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MyDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll issues GET /api/me/documents and returns the typed response', () => {
    const expected: MyDocumentsResponse = {
      linked: true,
      clientName: 'Jane Smith',
      documents: [
        { id: 1, year: 2025, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-14T10:23:00', uploadedByMe: false },
      ],
    };

    let received: MyDocumentsResponse | null = null;
    service.getAll().subscribe((res) => (received = res));

    const req = httpMock.expectOne('/api/me/documents');
    expect(req.request.method).toBe('GET');
    req.flush(expected);

    expect(received).toEqual(expected);
  });

  it('getAll passes through unlinked response shape', () => {
    let received: MyDocumentsResponse | null = null;
    service.getAll().subscribe((res) => (received = res));

    const req = httpMock.expectOne('/api/me/documents');
    req.flush({ linked: false, clientName: null, documents: [] });

    expect(received).toEqual({ linked: false, clientName: null, documents: [] });
  });
});

describe('MyDocumentsService.upload', () => {
  let service: MyDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(MyDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('POSTs FormData with the file part to /api/me/documents?year=YYYY', () => {
    const file = new File(['hello'], 'T4-2024.pdf', { type: 'application/pdf' });
    const item: MyDocumentItem = {
      id: 42, year: 2024, filename: 'T4-2024.pdf',
      mimeType: 'application/pdf', sizeBytes: 5, uploadedAt: '2026-05-19T10:00:00',
      uploadedByMe: true,
    };

    let received: MyDocumentItem | undefined;
    service.upload(2024, file).subscribe(r => received = r);

    const req = httpMock.expectOne('/api/me/documents?year=2024');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    const body = req.request.body as FormData;
    const part = body.get('file') as File;
    expect(part.name).toBe('T4-2024.pdf');
    req.flush(item);

    expect(received).toEqual(item);
  });

  it('propagates HTTP errors to the subscriber', () => {
    const file = new File(['x'], 'dup.pdf', { type: 'application/pdf' });

    let status = 0;
    service.upload(2024, file).subscribe({
      next: () => {},
      error: (err) => { status = err.status; },
    });

    httpMock.expectOne('/api/me/documents?year=2024').flush(
      { message: 'duplicate', filename: 'dup.pdf', year: 2024 },
      { status: 409, statusText: 'Conflict' });

    expect(status).toBe(409);
  });
});
