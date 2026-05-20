export interface AdminDocumentDto {
  id: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
}
