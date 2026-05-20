import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { MessageThreadSummaryDto } from '../../../core/models/message.model';
import { ClientDto } from '../../../core/models/client.model';
import { NewThreadDialogComponent } from './new-thread-dialog.component';

@Component({
  selector: 'app-admin-client-threads',
  standalone: true,
  imports: [MatButtonModule, RouterLink, DatePipe],
  templateUrl: './admin-client-threads.component.html',
  styleUrl: './admin-client-threads.component.css',
})
export class AdminClientThreadsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private msgService = inject(AdminClientMessagesService);
  private clientsService = inject(AdminClientsService);
  private dialog = inject(MatDialog);

  clientId = signal<number>(0);
  client = signal<ClientDto | null>(null);
  threads = signal<MessageThreadSummaryDto[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.clientId.set(id);
    this.clientsService.getAll().subscribe(list => {
      this.client.set(list.find(c => c.id === id) ?? null);
    });
    this.loadThreads();
  }

  private loadThreads(): void {
    this.msgService.listThreads(this.clientId()).subscribe(t => this.threads.set(t));
  }

  openThread(t: MessageThreadSummaryDto): void {
    this.router.navigate(['/admin/clients', this.clientId(), 'messages', t.id]);
  }

  openNewThread(): void {
    this.dialog.open(NewThreadDialogComponent, { width: '480px' })
      .afterClosed().pipe(take(1)).subscribe((result: { subject: string; body: string } | null) => {
        if (!result) return;
        this.msgService.createThread(this.clientId(), result).subscribe(thread => {
          this.router.navigate(['/admin/clients', this.clientId(), 'messages', thread.id]);
        });
      });
  }
}
