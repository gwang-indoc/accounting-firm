import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EngagementDto } from '../../../core/models/engagement.model';

@Injectable({ providedIn: 'root' })
export class PortalEngagementService {
  constructor(private http: HttpClient) {}

  getMyEngagements(): Observable<EngagementDto[]> {
    return this.http.get<EngagementDto[]>('/api/me/engagements');
  }
}
