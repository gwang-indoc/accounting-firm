import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AdminClientDocumentsComponent } from './admin-client-documents.component';
import { AdminClientDocumentsService } from '../../../core/services/admin-client-documents.service';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { AdminDocumentDto } from '../../../core/models/admin-document.model';
import { ClientDto } from '../../../core/models/client.model';

const sampleDocs: AdminDocumentDto[] = [
  { id: 10, filename: 'w2.pdf',   mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: '2026-02-01T00:00:00' },
  { id: 11, filename: '1099.pdf', mimeType: 'application/pdf', sizeBytes: 1024, uploadedAt: '2026-02-02T00:00:00' },
];

const sampleClient: ClientDto = {
  id: 7, name: 'Test Client', email: 'test@example.com', phone: null,
  createdAt: '2026-01-01T00:00:00', linkedUserId: null, adminId: 1,
};

async function setup(opts: {
  routeId?: string;
  docs?: AdminDocumentDto[];
  clients?: ClientDto[];
} = {}): Promise<{
  fixture: ComponentFixture<AdminClientDocumentsComponent>;
  docsService: { list: ReturnType<typeof vi.fn>; upload: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; downloadUrl: ReturnType<typeof vi.fn> };
  clientsService: { getAll: ReturnType<typeof vi.fn> };
}> {
  const docsService = {
    list: vi.fn().mockReturnValue(of(opts.docs ?? sampleDocs)),
    upload: vi.fn().mockReturnValue(of(sampleDocs[0])),
    delete: vi.fn().mockReturnValue(of(undefined)),
    downloadUrl: vi.fn().mockImplementation((cid: number, did: number) => `/api/clients/${cid}/documents/${did}/download`),
  };
  const clientsService = {
    getAll: vi.fn().mockReturnValue(of(opts.clients ?? [sampleClient])),
  };

  await TestBed.configureTestingModule({
    imports: [AdminClientDocumentsComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      provideRouter([]),
      { provide: AdminClientDocumentsService, useValue: docsService },
      { provide: AdminClientsService, useValue: clientsService },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: (key: string) => (key === 'id' ? (opts.routeId ?? '7') : null) } } },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminClientDocumentsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, docsService, clientsService };
}

describe('AdminClientDocumentsComponent', () => {
  it('loads documents for the route :id and current year on init', async () => {
    const { docsService } = await setup();
    expect(docsService.list).toHaveBeenCalledWith(7, new Date().getFullYear());
  });

  it('changing the year selector reloads documents for the new year', async () => {
    const { fixture, docsService } = await setup();
    docsService.list.mockClear();

    const select: HTMLSelectElement = fixture.nativeElement.querySelector('[data-testid="year-select"]');
    expect(select).not.toBeNull();
    select.value = '2023';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsService.list).toHaveBeenCalledWith(7, 2023);
  });

  it('displays the client name once it loads', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Test Client');
  });

  it('shows an empty-state message when there are no documents for the year', async () => {
    const { fixture } = await setup({ docs: [] });
    expect(fixture.nativeElement.textContent).toContain('No documents for');
  });

  it('each row has a download link with the correct href', async () => {
    const { fixture } = await setup();
    const links = fixture.nativeElement.querySelectorAll('[data-testid="admin-download-link"]');
    expect(links.length).toBe(2);
    expect(links[0].getAttribute('href')).toBe('/api/clients/7/documents/10/download');
    expect(links[1].getAttribute('href')).toBe('/api/clients/7/documents/11/download');
  });

  it('selecting a file uploads it via the service for the current client and year', async () => {
    const { fixture, docsService } = await setup();
    docsService.list.mockClear();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="admin-upload-input"]');
    expect(input).not.toBeNull();

    const file = new File(['hi'], 'extra.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsService.upload).toHaveBeenCalledWith(7, new Date().getFullYear(), file);
    expect(docsService.list).toHaveBeenCalled();
  });

  it('clicking delete calls the service and removes the row', async () => {
    const { fixture, docsService } = await setup();
    const dialog = TestBed.inject(MatDialog);
    vi.spyOn(dialog, 'open').mockReturnValue({ afterClosed: () => of(true) } as never);

    const deleteBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="admin-delete-doc-btn"]');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(docsService.delete).toHaveBeenCalledWith(7, 10);
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="admin-doc-row"]');
    expect(rows.length).toBe(1);
  });

  it('renders one row per document', async () => {
    const { fixture } = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="admin-doc-row"]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('w2.pdf');
    expect(rows[1].textContent).toContain('1099.pdf');
  });
});
