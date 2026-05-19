export interface MyDocumentItem {
  id: number;
  year: number;
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedAt: string;
  uploadedByMe: boolean;
}

export interface MyDocumentsResponse {
  linked: boolean;
  clientName: string | null;
  documents: MyDocumentItem[];
}
