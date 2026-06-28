import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-new-engagement-dialog',
  standalone: true,
  imports: [MatDialogModule, FormsModule, MatFormFieldModule, MatInputModule, TranslateModule],
  template: `
    <div class="ned">
      <div class="ned__header">
        <h2 class="ned__title">{{ 'workflow.newEngDialog.title' | translate }}</h2>
        <p class="ned__sub">{{ 'workflow.newEngDialog.subtitle' | translate }}</p>
      </div>

      <div class="ned__body">
        <span class="field-label">{{ 'workflow.newEngDialog.taxYearLabel' | translate }}</span>
        <div class="ned__stepper">
          <button type="button" class="step-btn" (click)="decrement()" aria-label="Decrease year">−</button>
          <span class="year-val">{{ taxYear }}</span>
          <button type="button" class="step-btn" (click)="increment()" aria-label="Increase year">+</button>
        </div>
        <input
          type="number"
          class="sr-only"
          [(ngModel)]="taxYear"
          data-testid="tax-year-input"
          aria-label="Tax year"
        />

        <span class="field-label" style="margin-top:20px">{{ 'workflow.newEngDialog.nameLabel' | translate }}</span>
        <mat-form-field appearance="outline" class="ned__name-field">
          <input
            matInput
            [(ngModel)]="name"
            data-testid="name-input"
            [placeholder]="'workflow.newEngDialog.namePlaceholder' | translate"
          />
        </mat-form-field>
      </div>

      <div class="ned__actions">
        <button type="button" class="dlg-btn dlg-btn--ghost" mat-dialog-close>{{ 'workflow.newEngDialog.cancel' | translate }}</button>
        <button type="button" class="dlg-btn dlg-btn--primary" (click)="submit()" data-testid="submit-btn" [disabled]="!name.trim()">
          {{ 'workflow.newEngDialog.create' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .ned {
      padding: 24px 24px 20px;
      min-width: 300px;
    }
    .ned__header { margin-bottom: 28px; }
    .ned__title {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.02em;
      margin: 0 0 6px;
    }
    .ned__sub {
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    }
    .ned__body { margin-bottom: 28px; }
    .field-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .ned__stepper {
      display: flex;
      align-items: stretch;
      border: 1px solid #334155;
      border-radius: 8px;
      background: #0f172a;
      overflow: hidden;
    }
    .step-btn {
      width: 48px;
      min-height: 56px;
      background: #1a2840;
      border: none;
      color: #64748b;
      font-size: 22px;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      line-height: 1;
    }
    .step-btn:hover {
      background: #253450;
      color: #38bdf8;
    }
    .step-btn:active { background: #1e293b; }
    .year-val {
      flex: 1;
      text-align: center;
      font-size: 30px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.03em;
      font-variant-numeric: tabular-nums;
      border-left: 1px solid #334155;
      border-right: 1px solid #334155;
      padding: 14px 0;
      user-select: none;
      line-height: 1;
    }
    .ned__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .dlg-btn {
      padding: 8px 18px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }
    .dlg-btn--ghost {
      background: transparent;
      color: #64748b;
      border: 1px solid #334155;
    }
    .dlg-btn--ghost:hover { color: #94a3b8; border-color: #475569; }
    .dlg-btn--primary { background: #38bdf8; color: #0f172a; font-weight: 700; }
    .dlg-btn--primary:hover { background: #7dd3fc; }
    .ned__name-field {
      width: 100%;
      margin-top: 4px;
    }
    .ned__name-field ::ng-deep .mat-mdc-text-field-wrapper {
      background: #0f172a;
    }
    .ned__name-field ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__leading,
    .ned__name-field ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__notch,
    .ned__name-field ::ng-deep .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #334155;
    }
    .ned__name-field {
      --mdc-outlined-text-field-input-text-color: #f1f5f9;
      --mdc-outlined-text-field-caret-color: #f1f5f9;
    }
    .ned__name-field ::ng-deep input { color: #f1f5f9 !important; }
    .ned__name-field ::ng-deep input::placeholder { color: #64748b; }
    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      border: 0;
    }
  `],
})
export class AdminNewEngagementDialogComponent {
  private dialogRef = inject(MatDialogRef<AdminNewEngagementDialogComponent>);
  taxYear = new Date().getFullYear();
  name = '';

  increment(): void { this.taxYear++; }
  decrement(): void { this.taxYear--; }

  submit(): void {
    if (this.taxYear && this.name.trim()) {
      this.dialogRef.close({ taxYear: this.taxYear, name: this.name.trim() });
    }
  }
}
