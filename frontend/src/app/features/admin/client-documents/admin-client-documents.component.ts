import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { AdminClientDocumentsService } from '../../../core/services/admin-client-documents.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { AdminDocumentDto } from '../../../core/models/admin-document.model';
import { ClientDto } from '../../../core/models/client.model';
import { AdminConfirmDialogComponent } from '../clients/admin-confirm-dialog.component';

@Component({
  selector: 'app-admin-client-documents',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  templateUrl: './admin-client-documents.component.html',
  styleUrl: './admin-client-documents.component.css',
})
export class AdminClientDocumentsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private adminDocs = inject(AdminClientDocumentsService);
  private adminClients = inject(AdminClientsService);
  private dialog = inject(MatDialog);

  clientId = signal<number>(0);
  client = signal<ClientDto | null>(null);
  selectedYear = signal<number>(new Date().getFullYear());
  documents = signal<AdminDocumentDto[]>([]);

  readonly yearOptions: number[] = (() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => cur - i);
  })();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.clientId.set(id);
    this.adminClients.getAll().subscribe(list => {
      this.client.set(list.find(c => c.id === id) ?? null);
    });
    this.loadDocuments();
  }

  onYearChange(value: string): void {
    this.selectedYear.set(Number(value));
    this.loadDocuments();
  }

  private loadDocuments(): void {
    this.adminDocs.list(this.clientId(), this.selectedYear())
      .subscribe(docs => this.documents.set(docs));
  }

  downloadHref(docId: number): string {
    return this.adminDocs.downloadUrl(this.clientId(), docId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.adminDocs.upload(this.clientId(), this.selectedYear(), file).subscribe(() => {
      this.loadDocuments();
      input.value = '';
    });
  }

  confirmDelete(doc: AdminDocumentDto): void {
    this.dialog.open(AdminConfirmDialogComponent, {
      data: { message: `Delete "${doc.filename}"? This cannot be undone.` },
      width: '380px',
    })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed: boolean) => {
        if (!confirmed) return;
        this.adminDocs.delete(this.clientId(), doc.id).subscribe(() => {
          this.documents.update(list => list.filter(d => d.id !== doc.id));
        });
      });
  }
}
