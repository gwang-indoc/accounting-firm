import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AdminClientWorkflowComponent } from './admin-client-workflow.component';
import { EngagementService } from '../../../core/services/engagement.service';
import { EngagementDto, EngagementHistoryDto } from '../../../core/models/engagement.model';

const sampleEngagements: EngagementDto[] = [
  { id: 1, clientId: 10, taxYear: 2025, name: 'John Smith', note: null, status: 'IN_PROCESSING', updatedBy: 99, updatedAt: '2026-01-02T00:00:00' },
  { id: 2, clientId: 10, taxYear: 2024, name: 'Smith Holdings Inc.', note: null, status: 'COMPLETED', updatedBy: 99, updatedAt: '2026-01-01T00:00:00' },
];

const sampleHistory: EngagementHistoryDto[] = [
  { id: 1, fromStatus: null, toStatus: 'START', changedBy: 99, changedAt: '2026-01-01T00:00:00', note: null },
  { id: 2, fromStatus: 'START', toStatus: 'IN_PROCESSING', changedBy: 99, changedAt: '2026-01-02T00:00:00', note: 'Started' },
];

function makeEngagementService(overrides: Partial<EngagementService> = {}): Partial<EngagementService> {
  return {
    getEngagementsForClient: vi.fn().mockReturnValue(of(sampleEngagements)),
    getEngagementHistory: vi.fn().mockReturnValue(of(sampleHistory)),
    createEngagement: vi.fn().mockReturnValue(of({ id: 3, clientId: 10, taxYear: 2023, name: 'New Client', note: null, status: 'START', updatedBy: 99, updatedAt: '2026-01-03T00:00:00' })),
    transitionStatus: vi.fn().mockReturnValue(of({ id: 1, clientId: 10, taxYear: 2025, name: 'John Smith', note: null, status: 'COMPLETED', updatedBy: 99, updatedAt: '2026-01-10T00:00:00' })),
    ...overrides,
  };
}

async function setup(engagementSvc: Partial<EngagementService> = makeEngagementService()): Promise<ComponentFixture<AdminClientWorkflowComponent>> {
  await TestBed.configureTestingModule({
    imports: [AdminClientWorkflowComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      provideRouter([]),
      { provide: EngagementService, useValue: engagementSvc },
      { provide: MatDialog, useValue: { open: vi.fn() } },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: (key: string) => key === 'id' ? '10' : null } } },
      },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminClientWorkflowComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AdminClientWorkflowComponent', () => {
  it('renders one row per engagement', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(2);
  });

  it('shows tax year in each row', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('2025');
    expect(rows[1].textContent).toContain('2024');
  });

  it('shows status in each row', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('IN_PROCESSING');
  });

  it('shows empty state when no engagements', async () => {
    const fixture = await setup(makeEngagementService({
      getEngagementsForClient: vi.fn().mockReturnValue(of([])),
    }));
    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
  });

  it('fetches engagement list on init for the correct clientId', async () => {
    const svc = makeEngagementService();
    await setup(svc);
    expect(svc.getEngagementsForClient).toHaveBeenCalledWith(10);
  });

  it('expands engagement row to show history when expand button clicked', async () => {
    const fixture = await setup();
    const expandBtn = fixture.nativeElement.querySelector('[data-testid="expand-btn"]');
    expect(expandBtn).not.toBeNull();

    expandBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const historyRows = fixture.nativeElement.querySelectorAll('[data-testid="history-row"]');
    expect(historyRows.length).toBe(2);
  });

  it('calls createEngagement and refreshes list on new engagement dialog confirm', async () => {
    const svc = makeEngagementService();
    const dialogSpy = vi.fn().mockReturnValue({ afterClosed: () => of({ taxYear: 2023, name: 'Test Name' }) });
    const fixture = await setup(svc);
    (TestBed.inject(MatDialog) as any).open = dialogSpy;

    fixture.componentInstance.openNewEngagementDialog();
    expect(dialogSpy).toHaveBeenCalled();
    expect(svc.createEngagement).toHaveBeenCalledWith(10, 2023, 'Test Name');
  });

  it('shows inline duplicate error when createEngagement returns 409', async () => {
    const svc = makeEngagementService({
      createEngagement: vi.fn().mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409 }))
      ),
    });
    const fixture = await setup(svc);
    const comp = fixture.componentInstance;

    comp.submitNewEngagement(2025, 'John Smith');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="duplicate-error"]');
    expect(errorEl).not.toBeNull();
  });

  it('opens transition dialog and calls transitionStatus on confirm', async () => {
    const svc = makeEngagementService();
    const dialogSpy = vi.fn().mockReturnValue({ afterClosed: () => of({ status: 'COMPLETED', note: 'Done' }) });
    const fixture = await setup(svc);
    (TestBed.inject(MatDialog) as any).open = dialogSpy;

    fixture.componentInstance.openTransitionDialog(sampleEngagements[0]);
    expect(dialogSpy).toHaveBeenCalled();
    expect(svc.transitionStatus).toHaveBeenCalledWith(10, 1, 'COMPLETED', 'Done');
  });
});
