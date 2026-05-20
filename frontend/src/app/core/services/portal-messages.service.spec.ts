import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { PortalMessagesService } from './portal-messages.service';

describe('PortalMessagesService', () => {
  let service: PortalMessagesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PortalMessagesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listThreads calls GET /api/portal/threads', () => {
    service.listThreads().subscribe();
    const req = http.expectOne('/api/portal/threads');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('createThread POSTs subject+body', () => {
    service.createThread({ subject: 'Tax Question', body: 'How do I...?' }).subscribe();
    const req = http.expectOne('/api/portal/threads');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ subject: 'Tax Question', body: 'How do I...?' });
    req.flush({});
  });

  it('getThread calls GET /api/portal/threads/:threadId', () => {
    service.getThread(42).subscribe();
    http.expectOne('/api/portal/threads/42').flush({});
  });

  it('postReply POSTs body to /api/portal/threads/:threadId/messages', () => {
    service.postReply(42, 'My follow-up').subscribe();
    const req = http.expectOne('/api/portal/threads/42/messages');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'My follow-up' });
    req.flush({});
  });

  it('getUnreadCount calls GET /api/portal/messages/unread-count', () => {
    service.getUnreadCount().subscribe();
    http.expectOne('/api/portal/messages/unread-count').flush({ unreadCount: 0 });
  });
});
