import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { MessageDto, MessageThreadDto } from '../../../core/models/message.model';
import { ClientDto } from '../../../core/models/client.model';

@Component({
  selector: 'app-admin-client-thread-view',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-client-thread-view.component.html',
  styleUrl: './admin-client-thread-view.component.css',
})
export class AdminClientThreadViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msgService = inject(AdminClientMessagesService);
  private clientsService = inject(AdminClientsService);

  clientId = signal<number>(0);
  threadId = signal<number>(0);
  thread = signal<MessageThreadDto | null>(null);
  client = signal<ClientDto | null>(null);
  replyBody = signal<string>('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const tid = Number(this.route.snapshot.paramMap.get('threadId'));
    this.clientId.set(id);
    this.threadId.set(tid);
    this.clientsService.getAll().subscribe(list => {
      this.client.set(list.find(c => c.id === id) ?? null);
    });
    this.msgService.getThread(id, tid).subscribe(t => this.thread.set(t));
  }

  get messages(): MessageDto[] {
    return this.thread()?.messages ?? [];
  }

  senderLabel(msg: MessageDto): string {
    if (msg.senderType === 'ADMIN') return 'You';
    return this.client()?.name ?? 'Client';
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
    this.msgService.postReply(this.clientId(), this.threadId(), body).subscribe(msg => {
      const current = this.thread();
      if (current) {
        this.thread.set({ ...current, messages: [...current.messages, msg] });
      }
      this.replyBody.set('');
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/clients', this.clientId(), 'messages']);
  }
}
