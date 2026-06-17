import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminExportDialogComponent } from './admin-export-dialog.component';

async function setup(): Promise<{
  fixture: ComponentFixture<AdminExportDialogComponent>;
  dialogRefMock: { close: ReturnType<typeof vi.fn> };
}> {
  const dialogRefMock = { close: vi.fn() };

  await TestBed.configureTestingModule({
    imports: [AdminExportDialogComponent],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimationsAsync(),
      { provide: MAT_DIALOG_DATA, useValue: {} },
      { provide: MatDialogRef, useValue: dialogRefMock },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminExportDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, dialogRefMock };
}

describe('AdminExportDialogComponent', () => {
  it('both checkboxes are checked by default', async () => {
    const { fixture } = await setup();
    const comp = fixture.componentInstance;
    expect(comp.includeMetadata()).toBe(true);
    expect(comp.includeDocuments()).toBe(true);
  });

  it('year selector is visible when includeDocuments is true', async () => {
    const { fixture } = await setup();
    fixture.detectChanges();
    const yearSelect = fixture.nativeElement.querySelector('[data-testid="year-select"]');
    expect(yearSelect).not.toBeNull();
  });

  it('year selector is hidden when includeDocuments is unchecked', async () => {
    const { fixture } = await setup();
    fixture.componentInstance.includeDocuments.set(false);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const yearSelect = fixture.nativeElement.querySelector('[data-testid="year-select"]');
    expect(yearSelect).toBeNull();
  });

  it('year defaults to null (All years)', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance.year()).toBeNull();
  });

  it('Cancel button closes dialog without result', async () => {
    const { fixture, dialogRefMock } = await setup();
    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="cancel-btn"]');
    expect(cancelBtn).not.toBeNull();
    cancelBtn.click();
    expect(dialogRefMock.close).toHaveBeenCalledWith(null);
  });

  it('Export button closes dialog with config object', async () => {
    const { fixture, dialogRefMock } = await setup();
    const exportBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dialog-export-btn"]');
    expect(exportBtn).not.toBeNull();
    exportBtn.click();
    expect(dialogRefMock.close).toHaveBeenCalledWith({
      includeMetadata: true,
      includeDocuments: true,
      year: null,
    });
  });

  it('Export button emits updated config when options change', async () => {
    const { fixture, dialogRefMock } = await setup();
    fixture.componentInstance.includeDocuments.set(false);
    fixture.componentInstance.year.set(2024);
    fixture.detectChanges();
    const exportBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="dialog-export-btn"]');
    exportBtn.click();
    expect(dialogRefMock.close).toHaveBeenCalledWith({
      includeMetadata: true,
      includeDocuments: false,
      year: 2024,
    });
  });
});
