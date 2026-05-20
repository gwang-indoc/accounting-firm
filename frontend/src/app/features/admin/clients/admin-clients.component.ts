import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
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
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  clients = signal<ClientDto[]>([]);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.adminClientsService.getAll().subscribe({
      next: (list) => this.clients.set(list),
      error: () => this.snackBar.open('Failed to load clients.', 'OK'),
    });
  }

  openAddDialog(): void {
    this.dialog.open(AdminClientDialogComponent, { data: { client: null }, width: '420px' })
      .afterClosed()
      .subscribe((result: ClientDto | null) => {
        if (result) this.clients.update(list => [...list, result]);
      });
  }

  openEditDialog(client: ClientDto): void {
    this.dialog.open(AdminClientDialogComponent, { data: { client }, width: '420px' })
      .afterClosed()
      .subscribe((result: ClientDto | null) => {
        if (result) this.clients.update(list => list.map(c => c.id === result.id ? result : c));
      });
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
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.adminClientsService.delete(client.id).subscribe({
          next: () => this.clients.update(list => list.filter(c => c.id !== client.id)),
          error: () => this.snackBar.open('Failed to delete client.', 'OK'),
        });
      });
  }
}
