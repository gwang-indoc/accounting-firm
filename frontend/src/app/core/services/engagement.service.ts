import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EngagementDashboardDto, EngagementDto, EngagementHistoryDto, EngagementStatus } from '../models/engagement.model';

@Injectable({ providedIn: 'root' })
export class EngagementService {
  constructor(private http: HttpClient) {}

  getAllEngagements(): Observable<EngagementDashboardDto[]> {
    return this.http.get<EngagementDashboardDto[]>('/api/admin/engagements');
  }

  getEngagementsForClient(clientId: number): Observable<EngagementDto[]> {
    return this.http.get<EngagementDto[]>(`/api/admin/clients/${clientId}/engagements`);
  }

  getEngagementHistory(clientId: number, taxYear: number): Observable<EngagementHistoryDto[]> {
    return this.http.get<EngagementHistoryDto[]>(`/api/admin/clients/${clientId}/engagements/${taxYear}/history`);
  }

  createEngagement(clientId: number, taxYear: number): Observable<EngagementDto> {
    return this.http.post<EngagementDto>(`/api/admin/clients/${clientId}/engagements`, { taxYear });
  }

  transitionStatus(clientId: number, taxYear: number, status: EngagementStatus, note: string | null): Observable<EngagementDto> {
    return this.http.patch<EngagementDto>(`/api/admin/clients/${clientId}/engagements/${taxYear}/status`, { status, note });
  }
}
