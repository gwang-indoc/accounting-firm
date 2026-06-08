export interface ClientDto {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  linkedUserId: number | null;
  adminId: number | null;
}
