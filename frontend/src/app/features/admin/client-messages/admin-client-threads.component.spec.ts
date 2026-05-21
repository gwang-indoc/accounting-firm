import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminClientThreadsComponent } from './admin-client-threads.component';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';
import { ClientDto } from '../../../core/models/client.model';

const sampleClient: ClientDto = {
  id: 7, name: 'Jane', email: 'j@x.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 99
};
const sampleThreads: MessageThreadSummaryDto[] = [
  { id: 50, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00', unreadCount: 2, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'I will send the W-2…' },
  { id: 51, clientId: 7, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: null, lastMessagePreview: 'Thanks!' },
];

async function setup(threads: MessageThreadSummaryDto[] = sampleThreads): Promise<ComponentFixture<AdminClientThreadsComponent>> {
  const msgService = {
    listThreads: vi.fn().mockReturnValue(of(threads)),
    createThread: vi.fn().mockReturnValue(of({ id: 999, subject: 'x' })),
  };
  const clientsService = { getAll: vi.fn().mockReturnValue(of([sampleClient])) };
  await TestBed.configureTestingModule({
    imports: [AdminClientThreadsComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      provideRouter([]),
      { provide: AdminClientMessagesService, useValue: msgService },
      { provide: AdminClientsService, useValue: clientsService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
    ],
  }).compileComponents();
  const fx = TestBed.createComponent(AdminClientThreadsComponent);
  fx.detectChanges();
  await fx.whenStable();
  fx.detectChanges();
  return fx;
}

describe('AdminClientThreadsComponent', () => {
  it('renders thread rows', async () => {
    const fx = await setup();
    const rows = fx.nativeElement.querySelectorAll('[data-testid="thread-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Tax filing');
  });

  it('shows unread chip only when unreadCount > 0', async () => {
    const fx = await setup();
    const chips = fx.nativeElement.querySelectorAll('[data-testid="thread-chip-unread"]');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent.trim()).toContain('2');
  });

  it('clicking a row navigates to thread view', async () => {
    const fx = await setup();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const row: HTMLElement = fx.nativeElement.querySelector('[data-testid="thread-row"]');
    row.click();
    expect(navSpy).toHaveBeenCalledWith(['/admin/clients', 7, 'messages', 50]);
  });

  it('empty state renders when no threads', async () => {
    const fx = await setup([]);
    expect(fx.nativeElement.textContent).toContain('No conversations yet');
  });

  it('shows New Thread button', async () => {
    const fx = await setup();
    const btn = fx.nativeElement.querySelector('[data-testid="new-thread-btn"]');
    expect(btn).not.toBeNull();
  });

  it('shows chip-read when lastSenderType is ADMIN and clientUnreadCount is 0', async () => {
    const awaiting: MessageThreadSummaryDto[] = [
      { id: 52, clientId: 7, subject: 'Invoice', lastMessageAt: '2026-05-18T10:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Please review' },
    ];
    const fx = await setup(awaiting);
    const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-read"]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent.trim()).toBe('Client read');
  });

  it('shows chip-awaiting when lastSenderType is ADMIN and clientUnreadCount > 0', async () => {
    const awaiting: MessageThreadSummaryDto[] = [
      { id: 53, clientId: 7, subject: 'Follow-up', lastMessageAt: '2026-05-17T09:00:00', unreadCount: 0, clientUnreadCount: 2, lastSenderType: 'ADMIN', lastMessagePreview: 'Any questions?' },
    ];
    const fx = await setup(awaiting);
    const chip = fx.nativeElement.querySelector('[data-testid="thread-chip-awaiting"]');
    expect(chip).not.toBeNull();
    expect(chip!.textContent.trim()).toBe('Awaiting client');
  });

  it('shows no chip when lastSenderType is CLIENT and unreadCount is 0', async () => {
    const balanced: MessageThreadSummaryDto[] = [
      { id: 54, clientId: 7, subject: 'Done', lastMessageAt: '2026-05-16T08:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'Thank you' },
    ];
    const fx = await setup(balanced);
    expect(fx.nativeElement.querySelector('[data-testid="thread-chip-unread"]')).toBeNull();
    expect(fx.nativeElement.querySelector('[data-testid="thread-chip-awaiting"]')).toBeNull();
    expect(fx.nativeElement.querySelector('[data-testid="thread-chip-read"]')).toBeNull();
  });
});
