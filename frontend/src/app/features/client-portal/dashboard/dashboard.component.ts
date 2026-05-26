import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MyDocumentsResponse } from '../../../core/models/my-documents';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, DatePipe, TranslateModule,
    MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent,
    MatIcon, MatButton, MatAnchor, MatDivider,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private myDocs = inject(MyDocumentsService);
  private portalMessages = inject(PortalMessagesService);
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  response = signal<MyDocumentsResponse | null>(null);
  threads = signal<MessageThreadSummaryDto[]>([]);

  documentCount = computed(() => this.response()?.documents.length ?? null);

  mostRecentYear = computed<number | null>(() => {
    const r = this.response();
    if (!r || r.documents.length === 0) return null;
    return r.documents.reduce((max, d) => Math.max(max, d.year), 0);
  });

  unreadCount = computed(() => this.threads().reduce((sum, t) => sum + t.unreadCount, 0));

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => this.response.set(res),
      error: () => this.response.set(null),
    });
    this.portalMessages.listThreads().subscribe({
      next: (list) => this.threads.set(list.slice(0, 3)),
      error: () => this.threads.set([]),
    });
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }

  senderLabel(t: MessageThreadSummaryDto): string {
    this.langChangeSignal();
    return t.lastSenderType === 'ADMIN'
      ? this.translate.instant('dashboard.senderTypeAdmin')
      : this.translate.instant('dashboard.senderTypeClient');
  }

  titleFor(t: MessageThreadSummaryDto): string {
    return t.subject || t.lastMessagePreview;
  }

  get greeting(): string {
    this.langChangeSignal();
    const h = new Date().getHours();
    if (h < 12) return this.translate.instant('dashboard.greetingMorning');
    if (h < 17) return this.translate.instant('dashboard.greetingAfternoon');
    return this.translate.instant('dashboard.greetingEvening');
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
