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

  getEngagementHistory(clientId: number, engagementId: number): Observable<EngagementHistoryDto[]> {
    return this.http.get<EngagementHistoryDto[]>(`/api/admin/clients/${clientId}/engagements/${engagementId}/history`);
  }

  createEngagement(clientId: number, taxYear: number, name: string): Observable<EngagementDto> {
    return this.http.post<EngagementDto>(`/api/admin/clients/${clientId}/engagements`, { taxYear, name });
  }

  transitionStatus(clientId: number, engagementId: number, status: EngagementStatus, note: string | null): Observable<EngagementDto> {
    return this.http.patch<EngagementDto>(`/api/admin/clients/${clientId}/engagements/${engagementId}/status`, { status, note });
  }
}
