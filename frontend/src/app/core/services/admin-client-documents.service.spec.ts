import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminClientDocumentsService } from './admin-client-documents.service';

describe('AdminClientDocumentsService', () => {
  let service: AdminClientDocumentsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminClientDocumentsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list calls GET /api/clients/{clientId}/documents?year=YYYY', () => {
    service.list(7, 2025).subscribe();
    const req = httpMock.expectOne('/api/clients/7/documents?year=2025');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('upload calls POST /api/clients/{clientId}/documents?year=YYYY with multipart file', () => {
    const file = new File(['hello'], 'tax.pdf', { type: 'application/pdf' });
    service.upload(7, 2025, file).subscribe();
    const req = httpMock.expectOne('/api/clients/7/documents?year=2025');
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    expect((req.request.body as FormData).get('file')).toBe(file);
    req.flush({});
  });

  it('delete calls DELETE /api/clients/{clientId}/documents/{docId}', () => {
    service.delete(7, 99).subscribe();
    const req = httpMock.expectOne('/api/clients/7/documents/99');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('downloadUrl returns the API download path', () => {
    expect(service.downloadUrl(7, 99)).toBe('/api/clients/7/documents/99/download');
  });
});
