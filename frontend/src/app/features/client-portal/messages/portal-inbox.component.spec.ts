import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { MatDialog } from '@angular/material/dialog';
import { PortalInboxComponent } from './portal-inbox.component';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';

const sampleThreads: MessageThreadSummaryDto[] = [
  { id: 10, clientId: 1, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00', unreadCount: 3, clientUnreadCount: 0, lastSenderType: null, lastMessagePreview: 'I will send the W-2…' },
  { id: 11, clientId: 1, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00', unreadCount: 0, clientUnreadCount: 0, lastSenderType: null, lastMessagePreview: 'Thanks!' },
];

async function setup(
  threads: MessageThreadSummaryDto[] = sampleThreads,
  overrides: Partial<{ mockService: object; mockDialog: object }> = {}
): Promise<{ fx: ComponentFixture<PortalInboxComponent>; mockService: any; mockDialog: any; router: Router }> {
  const mockService = overrides.mockService ?? {
    listThreads: vi.fn().mockReturnValue(of(threads)),
    createThread: vi.fn(),
  };
  const mockDialog = overrides.mockDialog ?? { open: vi.fn() };

  await TestBed.configureTestingModule({
    imports: [PortalInboxComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: PortalMessagesService, useValue: mockService },
      { provide: MatDialog, useValue: mockDialog },
    ],
  }).compileComponents();

  const fx = TestBed.createComponent(PortalInboxComponent);
  fx.detectChanges();
  await fx.whenStable();
  fx.detectChanges();
  const router = TestBed.inject(Router);
  return { fx, mockService, mockDialog, router };
}

describe('PortalInboxComponent', () => {
  it('renders thread rows', async () => {
    const { fx } = await setup();
    const rows = fx.nativeElement.querySelectorAll('[data-testid="thread-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Tax filing');
  });

  it('shows unread chip only when unreadCount > 0', async () => {
    const { fx } = await setup();
    const chips = fx.nativeElement.querySelectorAll('[data-testid="unread-chip"]');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent.trim()).toContain('3');
  });

  it('shows empty state when no threads', async () => {
    const { fx } = await setup([]);
    const emptyEl = fx.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyEl).not.toBeNull();
    expect(emptyEl.textContent).toContain('You have no messages yet.');
  });

  it('clicking thread row navigates to thread view', async () => {
    const { fx, router } = await setup();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const row: HTMLElement = fx.nativeElement.querySelector('[data-testid="thread-row"]');
    row.click();
    expect(navSpy).toHaveBeenCalledWith(['/portal/messages', 10]);
  });

  it('clicking New Message opens dialog and on success navigates', async () => {
    const dialogRefMock = { afterClosed: () => of({ subject: 'Sub', body: 'Body' }) };
    const mockDialog = { open: vi.fn().mockReturnValue(dialogRefMock) };
    const mockService = {
      listThreads: vi.fn().mockReturnValue(of(sampleThreads)),
      createThread: vi.fn().mockReturnValue(of({ id: 99, clientId: 1, subject: 'Sub', createdAt: '2026-05-20T00:00:00', lastMessageAt: '2026-05-20T00:00:00', adminUnreadCount: 0, clientUnreadCount: 0, messages: [] })),
    };

    const { fx, router } = await setup(sampleThreads, { mockService, mockDialog });
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const btn: HTMLElement = fx.nativeElement.querySelector('[data-testid="new-message-btn"]');
    btn.click();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockService.createThread).toHaveBeenCalledWith({ subject: 'Sub', body: 'Body' });
    expect(navSpy).toHaveBeenCalledWith(['/portal/messages', 99]);
  });
});
