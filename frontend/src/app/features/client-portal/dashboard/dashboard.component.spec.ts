import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, provideNgReflectAttributes } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';

const makeThread = (overrides: Partial<MessageThreadSummaryDto> = {}): MessageThreadSummaryDto => ({
  id: 1, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00',
  unreadCount: 1, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Hi',
  ...overrides,
});

async function setup(threads: MessageThreadSummaryDto[] = []) {
  const mockMessages = { listThreads: vi.fn().mockReturnValue(of(threads)) };
  await TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PortalMessagesService, useValue: mockMessages },
      provideNgReflectAttributes(),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(DashboardComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.match(() => true).forEach(r => r.flush({ linked: true, clientName: 'Jane', documents: [] }));
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mockMessages };
}

describe('DashboardComponent', () => {
  it('renders mat-card wrapping welcome content', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('mat-card')).not.toBeNull();
  });

  it('does not render a secondary mat-toolbar', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.querySelector('mat-toolbar')).toBeNull();
  });

  it('View Documents link points to /portal/documents', async () => {
    const { fixture } = await setup();
    const link = fixture.nativeElement.querySelector('[data-testid="view-documents-link"]');
    expect(link).not.toBeNull();
    expect(link.getAttribute('routerLink')).toBe('/portal/documents');
  });

  it('calls PortalMessagesService.listThreads on init', async () => {
    const { mockMessages } = await setup([makeThread()]);
    expect(mockMessages.listThreads).toHaveBeenCalledOnce();
  });

  it('renders up to 3 thread rows', async () => {
    const threads = [makeThread({ id: 1 }), makeThread({ id: 2 }), makeThread({ id: 3 }), makeThread({ id: 4 })];
    const { fixture } = await setup(threads);
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="dashboard-thread-row"]');
    expect(rows.length).toBe(3);
  });

  it('shows empty state when no threads', async () => {
    const { fixture } = await setup([]);
    expect(fixture.nativeElement.querySelector('.empty-state')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-testid="dashboard-thread-row"]').length).toBe(0);
  });

  it('row has routerLink to /portal/messages/:threadId', async () => {
    const { fixture } = await setup([makeThread({ id: 42 })]);
    const row = fixture.nativeElement.querySelector('[data-testid="dashboard-thread-row"]');
    expect(row.getAttribute('ng-reflect-router-link')).toContain('42');
  });

  it('row shows "Your accountant" for ADMIN-sent threads', async () => {
    const { fixture } = await setup([makeThread({ lastSenderType: 'ADMIN' })]);
    expect(fixture.nativeElement.querySelector('.msg-sender').textContent.trim()).toBe('Your accountant');
  });

  it('row shows "You" for CLIENT-sent threads', async () => {
    const { fixture } = await setup([makeThread({ lastSenderType: 'CLIENT' })]);
    expect(fixture.nativeElement.querySelector('.msg-sender').textContent.trim()).toBe('You');
  });

  it('View all link is visible when threads exist', async () => {
    const { fixture } = await setup([makeThread()]);
    const link = fixture.nativeElement.querySelector('[data-testid="view-all-messages-link"]');
    expect(link).not.toBeNull();
  });

  it('View all link is hidden when no threads', async () => {
    const { fixture } = await setup([]);
    expect(fixture.nativeElement.querySelector('[data-testid="view-all-messages-link"]')).toBeNull();
  });

  it('unread row has class "unread"', async () => {
    const { fixture } = await setup([makeThread({ unreadCount: 1 })]);
    const row = fixture.nativeElement.querySelector('[data-testid="dashboard-thread-row"]');
    expect(row.classList.contains('unread')).toBe(true);
  });
});
