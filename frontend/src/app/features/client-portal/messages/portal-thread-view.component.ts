import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageDto, MessageThreadDto } from '../../../core/models/message.model';

@Component({
  selector: 'app-portal-thread-view',
  standalone: true,
  imports: [DatePipe, TranslateModule],
  templateUrl: './portal-thread-view.component.html',
  styleUrl: './portal-thread-view.component.css',
})
export class PortalThreadViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msgService = inject(PortalMessagesService);

  threadId = signal<number>(0);
  thread = signal<MessageThreadDto | null>(null);
  replyBody = signal<string>('');

  ngOnInit(): void {
    const tid = Number(this.route.snapshot.paramMap.get('threadId'));
    this.threadId.set(tid);
    this.msgService.getThread(tid).subscribe(t => this.thread.set(t));
  }

  get messages(): MessageDto[] {
    return this.thread()?.messages ?? [];
  }

  senderLabel(msg: MessageDto): string {
    return msg.senderType === 'CLIENT' ? 'You' : 'Your accountant';
  }

  onReplyInput(event: Event): void {
    this.replyBody.set((event.target as HTMLTextAreaElement).value);
  }

  get canSend(): boolean {
    return this.replyBody().trim().length > 0;
  }

  send(): void {
    if (!this.canSend) return;
    const body = this.replyBody().trim();
    this.msgService.postReply(this.threadId(), body).subscribe(msg => {
      const current = this.thread();
      if (current) {
        this.thread.set({ ...current, messages: [...current.messages, msg] });
      }
      this.replyBody.set('');
    });
  }

  goBack(): void {
    this.router.navigate(['/portal/messages']);
  }
}
