import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MessageThreadSummaryDto,
  MessageThreadDto,
  MessageDto,
  ClientUnreadCountDto,
} from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class AdminClientMessagesService {
  private http = inject(HttpClient);

  listThreads(clientId: number): Observable<MessageThreadSummaryDto[]> {
    return this.http.get<MessageThreadSummaryDto[]>(`/api/clients/${clientId}/threads`);
  }

  createThread(clientId: number, req: { subject: string; body: string }): Observable<MessageThreadDto> {
    return this.http.post<MessageThreadDto>(`/api/clients/${clientId}/threads`, req);
  }

  getThread(clientId: number, threadId: number): Observable<MessageThreadDto> {
    return this.http.get<MessageThreadDto>(`/api/clients/${clientId}/threads/${threadId}`);
  }

  postReply(clientId: number, threadId: number, body: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(`/api/clients/${clientId}/threads/${threadId}/messages`, { body });
  }

  getUnreadCounts(): Observable<ClientUnreadCountDto[]> {
    return this.http.get<ClientUnreadCountDto[]>('/api/clients/unread-counts');
  }
}
