import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface ExportOptions {
  includeMetadata: boolean;
  includeDocuments: boolean;
  year: number | null;
}

@Injectable({ providedIn: 'root' })
export class AdminExportService {
  constructor(private http: HttpClient) {}

  getAllClientIds(name: string, email: string): Observable<number[]> {
    const params: Record<string, string> = {};
    if (name) params['name'] = name;
    if (email) params['email'] = email;
    return this.http.get<number[]>('/api/clients/ids', { params });
  }

  export(clientIds: number[], options: ExportOptions): Observable<Blob> {
    return this.http.post('/api/clients/export',
      { clientIds, ...options },
      { responseType: 'blob', observe: 'body' }
    ) as Observable<Blob>;
  }

  downloadExport(clientIds: number[], options: ExportOptions): Observable<void> {
    return new Observable(observer => {
      this.http.post('/api/clients/export',
        { clientIds, ...options },
        { responseType: 'blob', observe: 'response' }
      ).subscribe({
        next: (response) => {
          const blob = response.body!;
          const disposition = response.headers.get('Content-Disposition') ?? '';
          const filename = this.parseFilename(disposition) || 'export.bin';
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          observer.next();
          observer.complete();
        },
        error: (err: HttpErrorResponse) => {
          if (err.error instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const parsed = JSON.parse(reader.result as string);
                observer.error({ error: parsed });
              } catch {
                observer.error(err);
              }
            };
            reader.readAsText(err.error);
          } else {
            observer.error(err);
          }
        },
      });
    });
  }

  private parseFilename(disposition: string): string {
    const match = disposition.match(/filename="?([^"]+)"?/);
    return match ? match[1] : '';
  }
}
