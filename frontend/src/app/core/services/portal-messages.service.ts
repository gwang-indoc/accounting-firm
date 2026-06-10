import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MessageThreadSummaryDto,
  MessageThreadDto,
  MessageDto,
} from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class PortalMessagesService {
  private http = inject(HttpClient);

  listThreads(): Observable<MessageThreadSummaryDto[]> {
    return this.http.get<MessageThreadSummaryDto[]>('/api/portal/threads');
  }

  createThread(req: { subject: string; body: string }): Observable<MessageThreadDto> {
    return this.http.post<MessageThreadDto>('/api/portal/threads', req);
  }

  getThread(threadId: number): Observable<MessageThreadDto> {
    return this.http.get<MessageThreadDto>(`/api/portal/threads/${threadId}`);
  }

  postReply(threadId: number, body: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`/api/portal/threads/${threadId}/messages`, { body });
  }

  getUnreadCount(): Observable<{ unreadCount: number }> {
    return this.http.get<{ unreadCount: number }>('/api/portal/messages/unread-count');
  }
}
