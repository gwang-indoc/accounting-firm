import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminClientsService } from './admin-clients.service';

describe('AdminClientsService', () => {
  let service: AdminClientsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminClientsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getAll calls GET /api/clients', () => {
    service.getAll().subscribe();
    httpMock.expectOne('/api/clients').flush([]);
  });

  it('create calls POST /api/clients', () => {
    service.create({ name: 'Jane', email: 'j@j.com', phone: '', businessType: 'PERSONAL', fiscalYearEndMonth: 12, fiscalYearEndDay: 31 }).subscribe();
    const req = httpMock.expectOne('/api/clients');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('update calls PUT /api/clients/1', () => {
    service.update(1, { name: 'Jane', email: 'j@j.com', phone: '', businessType: 'PERSONAL', fiscalYearEndMonth: 12, fiscalYearEndDay: 31 }).subscribe();
    const req = httpMock.expectOne('/api/clients/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('delete calls DELETE /api/clients/1', () => {
    service.delete(1).subscribe();
    const req = httpMock.expectOne('/api/clients/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
