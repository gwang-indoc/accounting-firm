import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-new-engagement-dialog',
  standalone: true,
  imports: [MatDialogModule, FormsModule, TranslateModule],
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
      </div>

      <div class="ned__actions">
        <button type="button" class="dlg-btn dlg-btn--ghost" mat-dialog-close>{{ 'workflow.newEngDialog.cancel' | translate }}</button>
        <button type="button" class="dlg-btn dlg-btn--primary" (click)="submit()" data-testid="submit-btn">
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
      color: #475569;
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

  increment(): void { this.taxYear++; }
  decrement(): void { this.taxYear--; }

  submit(): void {
    if (this.taxYear) {
      this.dialogRef.close(this.taxYear);
    }
  }
}
