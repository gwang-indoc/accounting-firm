import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { PortalThreadViewComponent } from './portal-thread-view.component';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageThreadDto } from '../../../core/models/message.model';

const mockThread: MessageThreadDto = {
  id: 42, clientId: 1, subject: 'Tax question',
  createdAt: '2026-01-01T10:00:00', lastMessageAt: '2026-01-01T11:00:00',
  adminUnreadCount: 0, clientUnreadCount: 0,
  messages: [
    { id: 1, threadId: 42, senderType: 'ADMIN', senderUserId: 10, body: 'Hello client', sentAt: '2026-01-01T10:00:00' },
    { id: 2, threadId: 42, senderType: 'CLIENT', senderUserId: 20, body: 'Hi there', sentAt: '2026-01-01T11:00:00' },
  ]
};

const mockService = {
  getThread: vi.fn().mockReturnValue(of(mockThread)),
  postReply: vi.fn().mockReturnValue(of({ id: 3, threadId: 42, senderType: 'CLIENT', senderUserId: 20, body: 'Follow-up', sentAt: '2026-01-01T12:00:00' }))
};

async function setup(): Promise<{ fx: ComponentFixture<PortalThreadViewComponent>; router: Router }> {
  await TestBed.configureTestingModule({
    imports: [PortalThreadViewComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: (_: string) => '42' } } } },
      { provide: PortalMessagesService, useValue: mockService },
    ],
  }).compileComponents();

  const fx = TestBed.createComponent(PortalThreadViewComponent);
  fx.detectChanges();
  await fx.whenStable();
  fx.detectChanges();
  const router = TestBed.inject(Router);
  return { fx, router };
}

describe('PortalThreadViewComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.getThread.mockReturnValue(of(mockThread));
    mockService.postReply.mockReturnValue(of({ id: 3, threadId: 42, senderType: 'CLIENT', senderUserId: 20, body: 'Follow-up', sentAt: '2026-01-01T12:00:00' }));
  });

  it('renders messages in order', async () => {
    const { fx } = await setup();
    const el: HTMLElement = fx.nativeElement;
    expect(el.textContent).toContain('Hello client');
    expect(el.textContent).toContain('Hi there');
  });

  it('CLIENT message has class msg-client, ADMIN message has class msg-admin', async () => {
    const { fx } = await setup();
    const el: HTMLElement = fx.nativeElement;
    const adminMsg = el.querySelector('.msg-admin');
    const clientMsg = el.querySelector('.msg-client');
    expect(adminMsg).not.toBeNull();
    expect(adminMsg!.textContent).toContain('Hello client');
    expect(clientMsg).not.toBeNull();
    expect(clientMsg!.textContent).toContain('Hi there');
  });

  it('Send button disabled when textarea empty', async () => {
    const { fx } = await setup();
    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-btn"]');
    expect(sendBtn.disabled).toBe(true);
  });

  it('typing body and clicking Send calls postReply and clears textarea', async () => {
    const { fx } = await setup();
    const textarea: HTMLTextAreaElement = fx.nativeElement.querySelector('[data-testid="reply-textarea"]');
    textarea.value = 'My reply';
    textarea.dispatchEvent(new Event('input'));
    fx.detectChanges();
    await fx.whenStable();

    const sendBtn: HTMLButtonElement = fx.nativeElement.querySelector('[data-testid="send-btn"]');
    sendBtn.click();
    fx.detectChanges();
    await fx.whenStable();

    expect(mockService.postReply).toHaveBeenCalledWith(42, 'My reply');
    const textareaAfter: HTMLTextAreaElement = fx.nativeElement.querySelector('[data-testid="reply-textarea"]');
    expect(textareaAfter.value).toBe('');
  });

  it('back link navigates to /portal/messages', async () => {
    const { fx, router } = await setup();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const backLink: HTMLElement = fx.nativeElement.querySelector('[data-testid="back-link"]');
    backLink.click();
    expect(navSpy).toHaveBeenCalledWith(['/portal/messages']);
  });
});
