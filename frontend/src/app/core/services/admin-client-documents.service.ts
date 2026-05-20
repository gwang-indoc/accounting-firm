import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminDocumentDto } from '../models/admin-document.model';

@Injectable({ providedIn: 'root' })
export class AdminClientDocumentsService {
  constructor(private http: HttpClient) {}

  list(clientId: number, year: number): Observable<AdminDocumentDto[]> {
    return this.http.get<AdminDocumentDto[]>(`/api/clients/${clientId}/documents?year=${year}`);
  }

  upload(clientId: number, year: number, file: File): Observable<AdminDocumentDto> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AdminDocumentDto>(`/api/clients/${clientId}/documents?year=${year}`, form);
  }

  delete(clientId: number, docId: number): Observable<void> {
    return this.http.delete<void>(`/api/clients/${clientId}/documents/${docId}`);
  }

  downloadUrl(clientId: number, docId: number): string {
    return `/api/clients/${clientId}/documents/${docId}/download`;
  }
}
