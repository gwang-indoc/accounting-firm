export type SenderType = 'ADMIN' | 'CLIENT';

export interface MessageDto {
  id: number;
  threadId: number;
  senderType: SenderType;
  senderUserId: number;
  body: string;
  sentAt: string;
}

export interface MessageThreadDto {
  id: number;
  clientId: number;
  subject: string;
  createdAt: string;
  lastMessageAt: string;
  adminUnreadCount: number;
  clientUnreadCount: number;
  messages: MessageDto[];
}

export interface MessageThreadSummaryDto {
  id: number;
  clientId: number;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  clientUnreadCount: number;
  lastSenderType: SenderType | null;
  lastMessagePreview: string;
}

export interface ClientUnreadCountDto {
  clientId: number;
  unreadCount: number;
}
