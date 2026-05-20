import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClientDto } from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class AdminClientsService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<ClientDto[]> {
    return this.http.get<ClientDto[]>('/api/clients');
  }

  create(req: { name: string; email: string; phone: string | null }): Observable<ClientDto> {
    return this.http.post<ClientDto>('/api/clients', req);
  }

  update(id: number, req: { name: string; email: string; phone: string | null }): Observable<ClientDto> {
    return this.http.put<ClientDto>(`/api/clients/${id}`, req);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`/api/clients/${id}`);
  }
}
