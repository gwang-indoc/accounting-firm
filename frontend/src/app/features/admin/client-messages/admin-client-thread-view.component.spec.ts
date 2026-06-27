import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminClientThreadViewComponent } from './admin-client-thread-view.component';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { MessageThreadDto } from '../../../core/models/message.model';
import { ClientDto } from '../../../core/models/client.model';

const mockThread: MessageThreadDto = {
  id: 42, clientId: 1, subject: 'Tax question',
  createdAt: '2026-01-01T10:00:00', lastMessageAt: '2026-01-01T11:00:00',
  adminUnreadCount: 0, clientUnreadCount: 0,
  messages: [
    { id: 1, threadId: 42, senderType: 'ADMIN', senderUserId: 10, body: 'Hello client', sentAt: '2026-01-01T10:00:00' },
    { id: 2, threadId: 42, senderType: 'CLIENT', senderUserId: 20, body: 'Hi there', sentAt: '2026-01-01T11:00:00' },
  ]
};
const mockClient: ClientDto = { id: 1, name: 'Jane Smith', email: 'jane@test.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: 20, adminId: 1, businessType: 'PERSONAL', fiscalYearEndMonth: 12, fiscalYearEndDay: 31 };

async function setup(): Promise<{ fx: ComponentFixture<AdminClientThreadViewComponent>; mockService: any; mockClientsService: any }> {
  const mockService = {
    getThread: vi.fn().mockReturnValue(of(mockThread)),
    postReply: vi.fn().mockReturnValue(of({ id: 3, threadId: 42, senderType: 'ADMIN', senderUserId: 10, body: 'Follow-up', sentAt: '2026-01-01T12:00:00' })),
  };
  const mockClientsService = { getAll: vi.fn().mockReturnValue(of([mockClient])) };

  await TestBed.configureTestingModule({
    imports: [AdminClientThreadViewComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1', threadId: '42' }) } } },
      { provide: AdminClientMessagesService, useValue: mockService },
      { provide: AdminClientsService, useValue: mockClientsService },
    ],
  }).compileComponents();

  const fx = TestBed.createComponent(AdminClientThreadViewComponent);
  fx.detectChanges();
  await fx.whenStable();
  fx.detectChanges();
  return { fx, mockService, mockClientsService };
}

describe('AdminClientThreadViewComponent', () => {
  it('renders messages in order', async () => {
    const { fx } = await setup();
    const text = fx.nativeElement.textContent;
    expect(text).toContain('Hello client');
    expect(text).toContain('Hi there');
    // Both appear, and ADMIN message comes before CLIENT message in DOM
    const adminPos = text.indexOf('Hello client');
    const clientPos = text.indexOf('Hi there');
    expect(adminPos).toBeLessThan(clientPos);
  });

  it('admin message has class msg-admin, client message has class msg-client', async () => {
    const { fx } = await setup();
    const adminBubbles = fx.nativeElement.querySelectorAll('.msg-admin');
    const clientBubbles = fx.nativeElement.querySelectorAll('.msg-client');
    expect(adminBubbles.length).toBe(1);
    expect(clientBubbles.length).toBe(1);
    expect(adminBubbles[0].textContent).toContain('Hello client');
    expect(clientBubbles[0].textContent).toContain('Hi there');
  });

  it('Send button is disabled when textarea is empty', async () => {
    const { fx } = await setup();
    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-btn"]');
    expect(sendBtn).not.toBeNull();
    expect(sendBtn.disabled).toBe(true);
  });

  it('typing body and clicking Send calls postReply and clears textarea', async () => {
    const { fx, mockService } = await setup();
    const textarea: HTMLTextAreaElement = fx.nativeElement.querySelector('[data-testid="reply-textarea"]');
    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-btn"]');

    textarea.value = 'Follow-up message';
    textarea.dispatchEvent(new Event('input'));
    fx.detectChanges();
    await fx.whenStable();
    fx.detectChanges();

    expect(sendBtn.disabled).toBe(false);
    sendBtn.click();
    fx.detectChanges();
    await fx.whenStable();
    fx.detectChanges();

    expect(mockService.postReply).toHaveBeenCalledWith(1, 42, 'Follow-up message');
    expect(textarea.value).toBe('');
  });

  it('back link navigates to thread list', async () => {
    const { fx } = await setup();
    const router = TestBed.inject(Router);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const backLink: HTMLElement = fx.nativeElement.querySelector('[data-testid="back-link"]');
    expect(backLink).not.toBeNull();
    backLink.click();
    expect(navSpy).toHaveBeenCalledWith(['/admin/clients', 1, 'messages']);
  });
});
