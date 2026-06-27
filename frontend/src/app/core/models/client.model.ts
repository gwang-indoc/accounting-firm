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
}
