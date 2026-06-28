import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule } from '@ngx-translate/core';
import { AdminTransitionDialogComponent } from './admin-transition-dialog.component';
import { EngagementDto } from '../../../core/models/engagement.model';

function makeEngagement(note: string | null): EngagementDto {
  return {
    id: 1,
    clientId: 10,
    taxYear: 2024,
    name: 'John Smith',
    note,
    status: 'IN_PROCESSING',
    updatedBy: 99,
    updatedAt: '2026-01-01T00:00:00',
  };
}

async function setup(engagement: EngagementDto): Promise<ComponentFixture<AdminTransitionDialogComponent>> {
  const dialogRef = { close: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AdminTransitionDialogComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimationsAsync(),
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: { engagement } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminTransitionDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AdminTransitionDialogComponent', () => {
  it('note textarea is present', async () => {
    const fixture = await setup(makeEngagement(null));
    const textarea = fixture.nativeElement.querySelector('[data-testid="note-input"]');
    expect(textarea).not.toBeNull();
  });

  it('note textarea is pre-filled with current engagement note', async () => {
    const fixture = await setup(makeEngagement('Started review'));
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-testid="note-input"]');
    expect(textarea.value).toBe('Started review');
  });

  it('note textarea is empty when engagement has no note', async () => {
    const fixture = await setup(makeEngagement(null));
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-testid="note-input"]');
    expect(textarea.value).toBe('');
  });

  it('closes dialog with status and note on confirm', async () => {
    const fixture = await setup(makeEngagement('Old note'));
    const dialogRef = TestBed.inject(MatDialogRef);
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('[data-testid="note-input"]');
    textarea.value = 'New note';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const confirmBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="confirm-btn"]');
    confirmBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ note: 'New note' }));
  });
});
