import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { PortalEngagementsComponent } from './portal-engagements.component';
import { PortalEngagementService } from './portal-engagement.service';
import { EngagementDto } from '../../../core/models/engagement.model';

const sampleEngagements: EngagementDto[] = [
  { id: 1, clientId: 10, taxYear: 2025, name: 'John Smith', note: null, status: 'IN_PROCESSING', updatedBy: null, updatedAt: '2026-01-02T00:00:00' },
  { id: 2, clientId: 10, taxYear: 2025, name: 'Smith Holdings Inc.', note: null, status: 'START', updatedBy: null, updatedAt: '2026-01-01T00:00:00' },
  { id: 3, clientId: 10, taxYear: 2024, name: 'John Smith', note: null, status: 'COMPLETED', updatedBy: null, updatedAt: '2025-12-01T00:00:00' },
];

async function setup(engagements: EngagementDto[] = sampleEngagements): Promise<ComponentFixture<PortalEngagementsComponent>> {
  await TestBed.configureTestingModule({
    imports: [PortalEngagementsComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideAnimationsAsync(),
      { provide: PortalEngagementService, useValue: { getMyEngagements: vi.fn().mockReturnValue(of(engagements)) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(PortalEngagementsComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('PortalEngagementsComponent', () => {
  it('renders one row per engagement', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows.length).toBe(3);
  });

  it('each row shows the engagement name', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('John Smith');
    expect(rows[1].textContent).toContain('Smith Holdings Inc.');
  });

  it('each row shows the tax year', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('2025');
    expect(rows[2].textContent).toContain('2024');
  });

  it('each row shows the status', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    expect(rows[0].textContent).toContain('IN_PROCESSING');
    expect(rows[2].textContent).toContain('COMPLETED');
  });

  it('two engagements for the same tax year appear as distinct rows with distinct names', async () => {
    const fixture = await setup();
    const rows = fixture.nativeElement.querySelectorAll('[data-testid="engagement-row"]');
    const row0Text = rows[0].textContent;
    const row1Text = rows[1].textContent;
    expect(row0Text).toContain('2025');
    expect(row1Text).toContain('2025');
    expect(row0Text).toContain('John Smith');
    expect(row1Text).toContain('Smith Holdings Inc.');
  });

  it('shows empty state when no engagements', async () => {
    const fixture = await setup([]);
    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).not.toBeNull();
  });
});
