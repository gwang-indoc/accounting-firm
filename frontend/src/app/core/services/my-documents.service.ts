import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MyDocumentsResponse } from '../models/my-documents';

@Injectable({ providedIn: 'root' })
export class MyDocumentsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<MyDocumentsResponse> {
    return this.http.get<MyDocumentsResponse>('/api/me/documents');
  }
}
