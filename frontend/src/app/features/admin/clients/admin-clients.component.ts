import { Component, computed, inject, OnInit, signal } from '@angular/core';

const PAGE_SIZE = 20;
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { ClientDto } from '../../../core/models/client.model';
import { AdminClientDialogComponent } from './admin-client-dialog.component';
import { AdminConfirmDialogComponent } from './admin-confirm-dialog.component';

@Component({
  selector: 'app-admin-clients',
  standalone: true,
  imports: [MatButtonModule, RouterLink],
  templateUrl: './admin-clients.component.html',
  styleUrl: './admin-clients.component.css',
})
export class AdminClientsComponent implements OnInit {
  private adminClientsService = inject(AdminClientsService);
  private messagesService = inject(AdminClientMessagesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  clients = signal<ClientDto[]>([]);
  unreadCounts = signal<Record<number, number>>({});
  nameFilter = signal<string>('');
  emailFilter = signal<string>('');
  page = signal<number>(1);
  readonly pageSize = PAGE_SIZE;

  filteredClients = computed<ClientDto[]>(() => {
    const name = this.nameFilter().trim().toLowerCase();
    const email = this.emailFilter().trim().toLowerCase();
    return this.clients().filter(c => {
      const nameOk = !name || c.name.toLowerCase().includes(name);
      const emailOk = !email || (c.email ?? '').toLowerCase().includes(email);
      return nameOk && emailOk;
    });
  });

  pagedClients = computed<ClientDto[]>(() => {
    const start = (this.page() - 1) * PAGE_SIZE;
    return this.filteredClients().slice(start, start + PAGE_SIZE);
  });

  totalPages = computed<number>(() => {
    return Math.max(1, Math.ceil(this.filteredClients().length / PAGE_SIZE));
  });

  isFirstPage = computed<boolean>(() => this.page() === 1);
  isLastPage = computed<boolean>(() => this.page() >= this.totalPages());

  ngOnInit(): void {
    this.load();
    this.loadUnreadCounts();
  }

  private load(): void {
    this.adminClientsService.getAll().subscribe({
      next: (list) => this.clients.set(list),
      error: () => this.snackBar.open('Failed to load clients.', 'OK'),
    });
  }

  private loadUnreadCounts(): void {
    this.messagesService.getUnreadCounts().subscribe({
      next: (counts) => {
        const map: Record<number, number> = {};
        for (const c of counts) map[c.clientId] = c.unreadCount;
        this.unreadCounts.set(map);
      },
      error: () => { /* silent — badge degrades to absent */ },
    });
  }

  unreadFor(clientId: number): number {
    return this.unreadCounts()[clientId] ?? 0;
  }

  openMessages(clientId: number): void {
    this.router.navigate(['/admin/clients', clientId, 'messages']);
  }

  onNameFilterInput(value: string): void {
    this.nameFilter.set(value);
    this.page.set(1);
  }

  onEmailFilterInput(value: string): void {
    this.emailFilter.set(value);
    this.page.set(1);
  }

  nextPage(): void {
    if (!this.isLastPage()) this.page.update(p => p + 1);
  }

  prevPage(): void {
    if (!this.isFirstPage()) this.page.update(p => p - 1);
  }

  openAddDialog(): void {
    this.dialog.open(AdminClientDialogComponent, { data: { client: null }, width: '420px' })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: ClientDto | null) => {
        if (result) this.clients.update(list => [...list, result]);
      });
  }

  openEditDialog(client: ClientDto): void {
    this.dialog.open(AdminClientDialogComponent, { data: { client }, width: '420px' })
      .afterClosed()
      .pipe(take(1))
      .subscribe((result: ClientDto | null) => {
        if (result) this.clients.update(list => list.map(c => c.id === result.id ? result : c));
      });
  }

  openDocuments(client: ClientDto): void {
    this.router.navigate(['/admin/clients', client.id, 'documents']);
  }

  confirmDelete(client: ClientDto): void {
    const warning = client.linkedUserId
      ? ' This client is linked to a user account — they will lose portal access.'
      : '';
    this.dialog.open(AdminConfirmDialogComponent, {
      data: { message: `Delete "${client.name}"?${warning}` },
      width: '380px',
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.adminClientsService.delete(client.id).subscribe({
          next: () => this.clients.update(list => list.filter(c => c.id !== client.id)),
          error: () => this.snackBar.open('Failed to delete client.', 'OK'),
        });
      });
  }
}
