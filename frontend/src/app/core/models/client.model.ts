export type EngagementStatus = 'START' | 'IN_PROCESSING' | 'PENDING_CLIENT_REVIEW' | 'SUBMIT_TO_CRA' | 'COMPLETED';

export interface ClientDto {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  linkedUserId: number | null;
  adminId: number | null;
  businessType: 'PERSONAL' | 'CORPORATE' | 'SELF_EMPLOYED' | null;
  fiscalYearEndMonth: number | null;
  fiscalYearEndDay: number | null;
  activeEngagementStatus: EngagementStatus | null;
}
