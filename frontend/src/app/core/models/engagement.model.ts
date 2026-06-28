export type EngagementStatus = 'START' | 'IN_PROCESSING' | 'PENDING_CLIENT_REVIEW' | 'SUBMIT_TO_CRA' | 'COMPLETED';
export type BusinessType = 'PERSONAL' | 'CORPORATE' | 'SELF_EMPLOYED';

export interface EngagementDashboardDto {
  id: number;
  clientId: number;
  clientName: string | null;
  businessType: BusinessType | null;
  taxYear: number;
  name: string;
  status: EngagementStatus;
  updatedAt: string;
  updatedByName: string | null;
}

export interface EngagementDto {
  id: number;
  clientId: number;
  taxYear: number;
  name: string;
  note: string | null;
  status: EngagementStatus;
  updatedBy: number | null;
  updatedAt: string;
}

export interface EngagementHistoryDto {
  id: number;
  fromStatus: EngagementStatus | null;
  toStatus: EngagementStatus;
  changedBy: number;
  changedAt: string;
  note: string | null;
}
