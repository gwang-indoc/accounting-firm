import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentsResponse } from '../../../core/models/my-documents';
import { MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatAnchor } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';

interface PortalMessage {
  id: number;
  title: string;
  sender: string;
  date: string;
  read: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    MatCard, MatCardHeader, MatCardTitle, MatCardSubtitle, MatCardContent,
    MatIcon, MatButton, MatAnchor, MatDivider,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  protected authService = inject(AuthService);
  private myDocs = inject(MyDocumentsService);

  response = signal<MyDocumentsResponse | null>(null);

  documentCount = computed(() => this.response()?.documents.length ?? null);

  mostRecentYear = computed<number | null>(() => {
    const r = this.response();
    if (!r || r.documents.length === 0) return null;
    return r.documents.reduce((max, d) => Math.max(max, d.year), 0);
  });

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => this.response.set(res),
      error: () => this.response.set(null),
    });
  }

  get unreadCount(): number {
    return this.messages.filter(m => !m.read).length;
  }

  readonly messages: PortalMessage[] = [
    { id: 1, title: 'Your 2024 tax return is ready for review', sender: 'GWH Accounting', date: 'May 6', read: false },
    { id: 2, title: 'Document received: T4 Statement 2024', sender: 'GWH Accounting', date: 'Apr 28', read: true },
    { id: 3, title: 'Action required: Missing T5 slip', sender: 'GWH Accounting', date: 'Apr 15', read: true },
  ];

  get greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
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
