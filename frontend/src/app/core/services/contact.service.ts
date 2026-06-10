import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ContactSubmission } from '../models/contact-submission';

@Injectable({ providedIn: 'root' })
export class ContactService {
  constructor(private http: HttpClient) {}

  send(payload: ContactSubmission): Observable<void> {
    return this.http.post<void>('/api/contact', payload);
  }
}
