import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { TranslateModule } from '@ngx-translate/core';
import { AdminNewEngagementDialogComponent } from './admin-new-engagement-dialog.component';

async function setup(): Promise<ComponentFixture<AdminNewEngagementDialogComponent>> {
  const dialogRef = { close: vi.fn() };
  await TestBed.configureTestingModule({
    imports: [AdminNewEngagementDialogComponent, TranslateModule.forRoot()],
    providers: [
      provideZonelessChangeDetection(),
      provideAnimationsAsync(),
      { provide: MatDialogRef, useValue: dialogRef },
      { provide: MAT_DIALOG_DATA, useValue: {} },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(AdminNewEngagementDialogComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AdminNewEngagementDialogComponent', () => {
  it('submit button is disabled when name is empty', async () => {
    const fixture = await setup();
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit-btn"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('submit button is disabled when name is whitespace only', async () => {
    const fixture = await setup();
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="name-input"]');
    nameInput.value = '   ';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit-btn"]');
    expect(submitBtn.disabled).toBe(true);
  });

  it('submit button is enabled when name is non-blank', async () => {
    const fixture = await setup();
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="name-input"]');
    nameInput.value = 'John Smith';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit-btn"]');
    expect(submitBtn.disabled).toBe(false);
  });

  it('closes dialog with taxYear and name on submit', async () => {
    const fixture = await setup();
    const dialogRef = TestBed.inject(MatDialogRef);
    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('[data-testid="name-input"]');
    nameInput.value = 'Smith Holdings';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const submitBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="submit-btn"]');
    submitBtn.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogRef.close).toHaveBeenCalledWith(expect.objectContaining({ name: 'Smith Holdings' }));
  });
});
