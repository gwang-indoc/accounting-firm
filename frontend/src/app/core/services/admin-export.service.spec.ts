import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, HttpHeaders } from '@angular/common/http';
import { AdminExportService } from './admin-export.service';

describe('AdminExportService', () => {
  let service: AdminExportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminExportService,
      ],
    });
    service = TestBed.inject(AdminExportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('export() posts to /api/clients/export with responseType blob', () => {
    let captured: Blob | undefined;
    service.export([1, 2], { includeMetadata: true, includeDocuments: false, year: null })
      .subscribe(blob => { captured = blob; });

    const req = http.expectOne('/api/clients/export');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ clientIds: [1, 2], includeMetadata: true, includeDocuments: false, year: null });
    expect(req.request.responseType).toBe('blob');

    req.flush(new Blob(['data'], { type: 'text/csv' }));
    expect(captured).toBeDefined();
  });

  it('getAllClientIds() calls GET /api/clients/ids with name and email params', () => {
    let ids: number[] | undefined;
    service.getAllClientIds('Smith', 'smith@ex.com').subscribe(r => { ids = r; });

    const req = http.expectOne(r => r.url === '/api/clients/ids');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('name')).toBe('Smith');
    expect(req.request.params.get('email')).toBe('smith@ex.com');

    req.flush([1, 2, 3]);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('getAllClientIds() omits empty params', () => {
    service.getAllClientIds('', '').subscribe();
    const req = http.expectOne('/api/clients/ids');
    expect(req.request.params.has('name')).toBe(false);
    expect(req.request.params.has('email')).toBe(false);
    req.flush([]);
  });

  it('downloadExport() triggers blob download with filename from Content-Disposition', () => {
    const anchorSpy = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValue(anchorSpy as unknown as HTMLAnchorElement);
    const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    service.downloadExport([1], { includeMetadata: true, includeDocuments: false, year: null }).subscribe();

    const req = http.expectOne('/api/clients/export');
    req.flush(new Blob(['csv'], { type: 'text/csv' }), {
      headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="clients-export-2026-06-17.csv"' }),
    });

    expect(createObjectUrlSpy).toHaveBeenCalled();
    expect(anchorSpy.download).toBe('clients-export-2026-06-17.csv');
    expect(anchorSpy.click).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
