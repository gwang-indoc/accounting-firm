import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentItem, MyDocumentsResponse } from '../../../core/models/my-documents';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  private myDocs = inject(MyDocumentsService);
  private snackBar = inject(MatSnackBar);

  response = signal<MyDocumentsResponse | null>(null);
  selectedYear = signal<number | null>(null);

  years = computed<number[]>(() => {
    const r = this.response();
    if (!r) return [];
    const uniq = Array.from(new Set(r.documents.map(d => d.year)));
    return uniq.sort((a, b) => b - a);
  });

  filteredDocs = computed<MyDocumentItem[]>(() => {
    const r = this.response();
    const y = this.selectedYear();
    if (!r || y == null) return [];
    return r.documents.filter(d => d.year === y);
  });

  // Indirection for test stubbing. Default uses window.location.
  navigate: (url: string) => void = (url) => { window.location.href = url; };

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => {
        this.response.set(res);
        const ys = this.years();
        if (ys.length > 0) {
          this.selectedYear.set(ys[0]);
        }
      },
      error: () => {
        this.snackBar.open('Could not load your documents. Please try again.', 'OK');
      },
    });
  }

  onYearChange(value: string): void {
    this.selectedYear.set(Number(value));
  }

  downloadYearZip(): void {
    const y = this.selectedYear();
    if (y == null) return;
    this.navigate(`/api/me/documents/zip?year=${y}`);
  }

  downloadHref(docId: number): string {
    return `/api/me/documents/${docId}/download`;
  }

  formatBytes(bytes: number | null): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatUploadedAt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
