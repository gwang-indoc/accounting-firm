import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { take } from 'rxjs/operators';
import { PortalMessagesService } from '../../../core/services/portal-messages.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';
import { NewPortalThreadDialogComponent } from './new-portal-thread-dialog.component';

@Component({
  selector: 'app-portal-inbox',
  standalone: true,
  imports: [MatButtonModule, RouterLink, DatePipe],
  templateUrl: './portal-inbox.component.html',
  styleUrl: './portal-inbox.component.css',
})
export class PortalInboxComponent implements OnInit {
  private router = inject(Router);
  private msgService = inject(PortalMessagesService);
  private dialog = inject(MatDialog);

  threads = signal<MessageThreadSummaryDto[]>([]);

  ngOnInit(): void {
    this.msgService.listThreads().subscribe(t => this.threads.set(t));
  }

  openThread(t: MessageThreadSummaryDto): void {
    this.router.navigate(['/portal/messages', t.id]);
  }

  openNewThread(): void {
    this.dialog.open(NewPortalThreadDialogComponent, { width: '480px' })
      .afterClosed().pipe(take(1)).subscribe((result: { subject: string; body: string } | null) => {
        if (!result) return;
        this.msgService.createThread(result).subscribe(thread => {
          this.router.navigate(['/portal/messages', thread.id]);
        });
      });
  }
}
