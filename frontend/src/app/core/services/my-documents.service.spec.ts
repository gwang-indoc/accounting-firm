import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MyDocumentsService } from './my-documents.service';
import { MyDocumentsResponse } from '../models/my-documents';

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
        { id: 1, year: 2025, filename: 'T4.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2026-02-14T10:23:00' },
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
