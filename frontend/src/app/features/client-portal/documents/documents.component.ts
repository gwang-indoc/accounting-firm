import { Component, OnInit, ViewChild, ElementRef, computed, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MyDocumentsService } from '../../../core/services/my-documents.service';
import { MyDocumentItem, MyDocumentsResponse } from '../../../core/models/my-documents';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatButtonModule, MatChipsModule, TranslateModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css',
})
export class DocumentsComponent implements OnInit {
  private myDocs = inject(MyDocumentsService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private langChangeSignal = signal<string>(this.translate.currentLang);

  response = signal<MyDocumentsResponse | null>(null);
  selectedYear = signal<number | null>(null);
  uploading = signal<boolean>(false);
  emptyStateYear = signal<number>(new Date().getFullYear());

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  docYears = computed<number[]>(() => {
    const r = this.response();
    if (!r) return [];
    return Array.from(new Set(r.documents.map(d => d.year))).sort((a, b) => b - a);
  });

  years = computed<number[]>(() => {
    const union = new Set<number>([...this.emptyStateYearOptions, ...this.docYears()]);
    return Array.from(union).sort((a, b) => b - a);
  });

  filteredDocs = computed<MyDocumentItem[]>(() => {
    const r = this.response();
    const y = this.selectedYear();
    if (!r || y == null) return [];
    return r.documents.filter(d => d.year === y);
  });

  readonly emptyStateYearOptions: number[] = (() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => cur - i);
  })();

  // Indirection for test stubbing. Default uses window.location.
  navigate: (url: string) => void = (url) => { window.location.href = url; };

  ngOnInit(): void {
    this.myDocs.getAll().subscribe({
      next: (res) => {
        this.response.set(res);
        const dy = this.docYears();
        if (dy.length > 0) this.selectedYear.set(dy[0]);
      },
      error: () => this.snackBar.open(this.translate.instant('documents.loadError'), 'OK'),
    });
    this.translate.onLangChange.subscribe(() => {
      this.langChangeSignal.set(this.translate.currentLang);
    });
  }

  onYearChange(value: string): void {
    this.selectedYear.set(Number(value));
  }

  onEmptyYearChange(value: string): void {
    this.emptyStateYear.set(Number(value));
  }

  onUploadClick(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const year = this.selectedYear() ?? this.emptyStateYear();
    this.uploading.set(true);

    this.myDocs.upload(year, file)
      .pipe(finalize(() => {
        this.uploading.set(false);
        if (input) input.value = '';
      }))
      .subscribe({
        next: (item) => {
          const current = this.response() ?? { linked: true, clientName: null, documents: [] };
          this.response.set({ ...current, documents: [...current.documents, item] });
          if (this.selectedYear() == null) this.selectedYear.set(item.year);
          const msg = this.translate.instant('documents.uploadedMessage', { filename: item.filename });
          this.snackBar.open(msg, 'OK', { duration: 3000 });
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open(this.errorMessageFor(err, file.name, year), 'OK');
        },
      });
  }

  private errorMessageFor(err: HttpErrorResponse, filename: string, year: number): string {
    const serverMessage = err?.error?.message;
    switch (err.status) {
      case 400: return serverMessage ?? this.translate.instant('documents.errorDefault');
      case 403: return serverMessage ?? this.translate.instant('documents.errorNotSetUp');
      case 409: return serverMessage ?? this.translate.instant('documents.errorDuplicate', { filename, year });
      case 413: return this.translate.instant('documents.errorTooLarge');
      default:  return this.translate.instant('documents.errorFailed');
    }
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
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
