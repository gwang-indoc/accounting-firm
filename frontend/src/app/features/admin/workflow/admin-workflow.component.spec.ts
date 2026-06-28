import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminWorkflowComponent } from './admin-workflow.component';
import { EngagementService } from '../../../core/services/engagement.service';
import { EngagementDashboardDto } from '../../../core/models/engagement.model';

const sampleEngagements: EngagementDashboardDto[] = [
  {
    id: 1,
    clientId: 10,
    clientName: 'Acme Corp',
    businessType: 'CORPORATE',
    taxYear: 2024,
    name: 'Acme Corp',
    status: 'IN_PROCESSING',
    updatedAt: '2026-01-01T00:00:00',
    updatedByName: 'Admin User',
  },
  {
    id: 2,
    clientId: 11,
    clientName: 'Jane Smith',
    businessType: 'PERSONAL',
    taxYear: 2024,
    name: 'Jane Smith',
    status: 'COMPLETED',
    updatedAt: '2026-01-02T00:00:00',
    updatedByName: 'Admin User',
  },
  {
    id: 3,
    clientId: 12,
    clientName: 'Bob Self',
    businessType: 'SELF_EMPLOYED',
    taxYear: 2023,
    name: 'Bob Self Consulting',
    status: 'START',
    updatedAt: '2026-01-03T00:00:00',
    updatedByName: 'Admin User',
  },
];

async function setup(engagements: EngagementDashboardDto[] = sampleEngagements): Promise<ComponentFixture<AdminWorkflowComponent>> {
  const mockService: Partial<EngagementService> = {
    getAllEngagements: vi.fn().mockReturnValue(of(engagements)),
  };

  await TestBed.configureTestingModule({
    imports: [AdminWorkflowComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: EngagementService, useValue: mockService },
      provideRouter([]),
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminWorkflowComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AdminWorkflowComponent', () => {
  it('renders a row for each engagement', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(3);
  });

  it('shows client name in each row', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('Acme Corp');
    expect(rows[1].textContent).toContain('Jane Smith');
  });

  it('shows tax year in each row', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('2024');
  });

  it('filters rows by status', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;

    component.filterByStatus('IN_PROCESSING');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Acme Corp');
  });

  it('filters rows by business type', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;

    component.filterByBusinessType('PERSONAL');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Jane Smith');
  });

  it('shows all rows when filters are cleared', async () => {
    const fixture = await setup();
    const component = fixture.componentInstance;

    component.filterByStatus('COMPLETED');
    fixture.detectChanges();
    component.filterByStatus('');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(3);
  });
});
