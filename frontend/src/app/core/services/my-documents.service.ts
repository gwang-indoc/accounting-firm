import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyDocumentItem, MyDocumentsResponse } from '../models/my-documents';

@Injectable({ providedIn: 'root' })
export class MyDocumentsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<MyDocumentsResponse> {
    return this.http.get<MyDocumentsResponse>('/api/me/documents');
  }

  upload(year: number, file: File): Observable<MyDocumentItem> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MyDocumentItem>(`/api/me/documents?year=${year}`, form);
  }
}
