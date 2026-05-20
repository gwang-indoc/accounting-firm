import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AdminClientMessagesService } from './admin-client-messages.service';

describe('AdminClientMessagesService', () => {
  let service: AdminClientMessagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AdminClientMessagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listThreads calls GET /api/clients/:id/threads', () => {
    service.listThreads(7).subscribe();
    const req = http.expectOne('/api/clients/7/threads');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createThread POSTs subject+body', () => {
    service.createThread(7, { subject: 'Tax', body: 'Hi' }).subscribe();
    const req = http.expectOne('/api/clients/7/threads');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subject: 'Tax', body: 'Hi' });
    req.flush({});
  });

  it('getThread calls GET /api/clients/:id/threads/:tid', () => {
    service.getThread(7, 50).subscribe();
    http.expectOne('/api/clients/7/threads/50').flush({});
  });

  it('postReply POSTs body', () => {
    service.postReply(7, 50, 'follow-up').subscribe();
    const req = http.expectOne('/api/clients/7/threads/50/messages');
    expect(req.request.body).toEqual({ body: 'follow-up' });
    req.flush({});
  });

  it('getUnreadCounts calls GET /api/clients/unread-counts', () => {
    service.getUnreadCounts().subscribe();
    http.expectOne('/api/clients/unread-counts').flush([]);
  });
});
