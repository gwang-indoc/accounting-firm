import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { AdminClientsComponent } from './admin-clients.component';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { AdminClientMessagesService } from '../../../core/services/admin-client-messages.service';
import { AdminExportService } from '../../../core/services/admin-export.service';
import { ClientDto } from '../../../core/models/client.model';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

const sampleClients: ClientDto[] = [
  { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 42, adminId: 1 },
  { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null, adminId: 1 },
];

function makeClients(n: number): ClientDto[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: `Client ${String(i + 1).padStart(3, '0')}`,
    email: `client${i + 1}@example.com`,
    phone: null,
    createdAt: '2026-01-01T00:00:00',
    linkedUserId: null,
    adminId: 1
  }));
}

async function setup(clients: ClientDto[]): Promise<ComponentFixture<AdminClientsComponent>> {
  const mockService: Partial<AdminClientsService> = {
    getAll: vi.fn().mockReturnValue(of(clients)),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [AdminClientsComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: AdminClientsService, useValue: mockService },
      { provide: AdminClientMessagesService, useValue: { getUnreadCounts: vi.fn().mockReturnValue(of([])) } },
      { provide: AdminExportService, useValue: { getAllClientIds: vi.fn().mockReturnValue(of([])), export: vi.fn() } },
      provideRouter([]),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminClientsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

async function setupForExport(
  clients: ClientDto[],
  exportService?: Partial<AdminExportService>
): Promise<{ fixture: ComponentFixture<AdminClientsComponent>; mockExportService: Partial<AdminExportService> }> {
  const mockExportService: Partial<AdminExportService> = {
    getAllClientIds: vi.fn().mockReturnValue(of(clients.map(c => c.id))),
    export: vi.fn().mockReturnValue(of(new Blob())),
    ...exportService,
  };
  const mockService: Partial<AdminClientsService> = {
    getAll: vi.fn().mockReturnValue(of(clients)),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  await TestBed.configureTestingModule({
    imports: [AdminClientsComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: AdminClientsService, useValue: mockService },
      { provide: AdminClientMessagesService, useValue: { getUnreadCounts: vi.fn().mockReturnValue(of([])) } },
      { provide: AdminExportService, useValue: mockExportService },
      provideRouter([]),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminClientsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, mockExportService };
}

describe('AdminClientsComponent', () => {
  describe('basic rendering', () => {
    let fixture: ComponentFixture<AdminClientsComponent>;

    beforeEach(async () => {
      fixture = await setup(sampleClients);
    });

    it('renders two client rows on load', () => {
      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(2);
    });

    it('shows Linked badge for linked client', () => {
      const firstRow = fixture.nativeElement.querySelector('[data-testid="client-row"]');
      expect(firstRow.textContent).toContain('Linked');
    });

    it('shows Not linked badge for unlinked client', () => {
      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows[1].textContent).toContain('Not linked');
    });

    it('Add Client button exists', () => {
      const btn = fixture.nativeElement.querySelector('[data-testid="add-client-btn"]');
      expect(btn).not.toBeNull();
    });
  });

  describe('Documents action', () => {
    it('renders a Documents button on each row', async () => {
      const fixture = await setup(sampleClients);
      const btns = fixture.nativeElement.querySelectorAll('[data-testid="client-documents-btn"]');
      expect(btns.length).toBe(2);
    });

    it('clicking Documents navigates to /admin/clients/:id/documents for that client', async () => {
      const fixture = await setup(sampleClients);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="client-documents-btn"]');
      btn.click();
      expect(navSpy).toHaveBeenCalledWith(['/admin/clients', 1, 'documents']);
    });
  });

  describe('filtering by name', () => {
    it('shows only rows whose name contains the filter text (case-insensitive)', async () => {
      const fixture = await setup(sampleClients);
      const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="filter-name"]');
      expect(input).not.toBeNull();

      input.value = 'jane';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Jane Smith');
    });
  });

  describe('pagination', () => {
    it('shows only 20 rows per page when there are more than 20 clients', async () => {
      const fixture = await setup(makeClients(25));
      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(20);
    });

    it('resets to page 1 when the name filter changes', async () => {
      const fixture = await setup(makeClients(25));
      fixture.componentInstance.nextPage();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.page()).toBe(2);

      const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="filter-name"]');
      input.value = 'Client 001';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.componentInstance.page()).toBe(1);
    });

    it('hides pagination controls when there are 20 or fewer clients', async () => {
      const fixture = await setup(makeClients(20));
      expect(fixture.nativeElement.querySelector('[data-testid="next-page-btn"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="prev-page-btn"]')).toBeNull();
    });

    it('prev button is disabled on first page; next button is disabled on last page', async () => {
      const fixture = await setup(makeClients(25));
      const prevBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev-page-btn"]');
      const nextBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next-page-btn"]');
      expect(prevBtn).not.toBeNull();
      expect(nextBtn).not.toBeNull();

      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      nextBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(prevBtn.disabled).toBe(false);
      expect(nextBtn.disabled).toBe(true);
    });

    it('prev button moves back to the previous page', async () => {
      const fixture = await setup(makeClients(25));
      fixture.componentInstance.nextPage();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const prevBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="prev-page-btn"]');
      prevBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(20);
      expect(rows[0].textContent).toContain('Client 001');
    });

    it('next button advances to the next page showing remaining rows', async () => {
      const fixture = await setup(makeClients(25));
      const nextBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="next-page-btn"]');
      expect(nextBtn).not.toBeNull();

      nextBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(5);
    });
  });

  describe('filtering by email', () => {
    it('shows only rows whose email contains the filter text (case-insensitive)', async () => {
      const fixture = await setup(sampleClients);
      const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="filter-email"]');
      expect(input).not.toBeNull();

      input.value = 'WORK';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const rows = fixture.nativeElement.querySelectorAll('[data-testid="client-row"]');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Bob Lee');
    });
  });

  describe('multi-select and export', () => {
    it('clicking a row checkbox adds that client id to selectedClientIds', async () => {
      const { fixture } = await setupForExport(sampleClients);
      const checkboxHosts = fixture.nativeElement.querySelectorAll('[data-testid="client-select-cb"]');
      expect(checkboxHosts.length).toBe(2);
      const input: HTMLInputElement = checkboxHosts[0].querySelector('input[type="checkbox"]');
      input.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().has(sampleClients[0].id)).toBe(true);
    });

    it('clicking a checked row checkbox removes that client id from selectedClientIds', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().has(sampleClients[0].id)).toBe(false);
    });

    it('clicking Select All calls getAllClientIds with current filters and merges ids', async () => {
      const { fixture, mockExportService } = await setupForExport(sampleClients);
      const selectAllBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="select-all-btn"]');
      expect(selectAllBtn).not.toBeNull();
      selectAllBtn.click();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(mockExportService.getAllClientIds).toHaveBeenCalledWith('', '');
      expect(fixture.componentInstance.selectedClientIds().size).toBe(sampleClients.length);
    });

    it('changing name filter clears selection', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().size).toBe(1);

      const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="filter-name"]');
      input.value = 'jane';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().size).toBe(0);
    });

    it('changing email filter clears selection', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().size).toBe(1);

      const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="filter-email"]');
      input.value = 'work';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(fixture.componentInstance.selectedClientIds().size).toBe(0);
    });

    it('adding a 201st client shows cap message and does not add the client', async () => {
      const { fixture } = await setupForExport(makeClients(201));
      const comp = fixture.componentInstance;
      const first200 = Array.from({ length: 200 }, (_, i) => i + 1);
      comp.selectedClientIds.set(new Set(first200));
      fixture.detectChanges();

      comp.toggleSelection(201);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(comp.selectedClientIds().size).toBe(200);
      const capMsg = fixture.nativeElement.querySelector('[data-testid="export-cap-msg"]');
      expect(capMsg).not.toBeNull();
      expect(capMsg.textContent).toContain('Export limited to 200 clients at a time');
    });
  });

  describe('export toolbar', () => {
    it('export toolbar is hidden when no clients are selected', async () => {
      const { fixture } = await setupForExport(sampleClients);
      const toolbar = fixture.nativeElement.querySelector('[data-testid="export-toolbar"]');
      expect(toolbar).toBeNull();
    });

    it('export toolbar is visible and shows count when at least 1 client is selected', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const toolbar = fixture.nativeElement.querySelector('[data-testid="export-toolbar"]');
      expect(toolbar).not.toBeNull();
      expect(toolbar.textContent).toContain('1');
    });

    it('export toolbar shows correct count when multiple clients are selected', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.componentInstance.toggleSelection(sampleClients[1].id);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const toolbar = fixture.nativeElement.querySelector('[data-testid="export-toolbar"]');
      expect(toolbar).not.toBeNull();
      expect(toolbar.textContent).toContain('2');
    });

    it('export toolbar has an Export button', async () => {
      const { fixture } = await setupForExport(sampleClients);
      fixture.componentInstance.toggleSelection(sampleClients[0].id);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const exportBtn = fixture.nativeElement.querySelector('[data-testid="export-btn"]');
      expect(exportBtn).not.toBeNull();
    });
  });

  describe('Messages action and unread badge', () => {
    it('renders Messages button on each row', async () => {
      const fixture = await setup(sampleClients);
      const btns = fixture.nativeElement.querySelectorAll('[data-testid="client-messages-btn"]');
      expect(btns.length).toBe(2);
    });

    it('renders unread badge only when count > 0 for that client', async () => {
      const mockMsgService = {
        getUnreadCounts: vi.fn().mockReturnValue(of([{ clientId: sampleClients[0].id, unreadCount: 3 }])),
      };
      const fixture = await setupWithMessages(sampleClients, mockMsgService);
      const badges = fixture.nativeElement.querySelectorAll('[data-testid="client-messages-badge"]');
      expect(badges.length).toBe(1);
      expect(badges[0].textContent.trim()).toContain('3');
    });

    it('clicking Messages navigates to /admin/clients/:id/messages', async () => {
      const fixture = await setup(sampleClients);
      const router = TestBed.inject(Router);
      const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="client-messages-btn"]');
      btn.click();
      expect(navSpy).toHaveBeenCalledWith(['/admin/clients', sampleClients[0].id, 'messages']);
    });
  });
});

async function setupWithMessages(
  clients: ClientDto[],
  msgService: Partial<AdminClientMessagesService>
): Promise<ComponentFixture<AdminClientsComponent>> {
  const mockService: Partial<AdminClientsService> = {
    getAll: vi.fn().mockReturnValue(of(clients)),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  await TestBed.configureTestingModule({
    imports: [AdminClientsComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: AdminClientsService, useValue: mockService },
      { provide: AdminClientMessagesService, useValue: msgService },
      { provide: AdminExportService, useValue: { getAllClientIds: vi.fn().mockReturnValue(of([])), export: vi.fn() } },
      provideRouter([]),
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(AdminClientsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}
