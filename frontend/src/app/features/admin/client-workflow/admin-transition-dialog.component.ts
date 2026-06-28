import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EngagementDto, EngagementStatus } from '../../../core/models/engagement.model';

const ALL_STATUSES: EngagementStatus[] = [
  'START', 'IN_PROCESSING', 'PENDING_CLIENT_REVIEW', 'SUBMIT_TO_CRA', 'COMPLETED',
];

@Component({
  selector: 'app-admin-transition-dialog',
  standalone: true,
  imports: [MatDialogModule, FormsModule, TranslateModule],
  template: `
    <div class="trd">
      <div class="trd__header">
        <h2 class="trd__title">{{ 'workflow.changeStatusDialog.title' | translate }}</h2>
        <div class="trd__from-row">
          <span class="from-label">{{ 'workflow.changeStatusDialog.currentLabel' | translate }}</span>
          <span class="cur-badge" [attr.data-status]="data.engagement.status">{{ data.engagement.status }}</span>
          <span class="from-arrow">→</span>
          <span class="to-preview" [attr.data-status]="selectedStatus">{{ selectedStatus }}</span>
        </div>
      </div>

      <div class="trd__body">
        <span class="field-label">{{ 'workflow.changeStatusDialog.selectLabel' | translate }}</span>
        <div class="status-grid" data-testid="status-select">
          @for (s of statuses; track s) {
            <button
              type="button"
              class="status-pill"
              [attr.data-status]="s"
              [class.selected]="selectedStatus === s"
              (click)="selectedStatus = s"
            >{{ s }}</button>
          }
        </div>

        <span class="field-label note-label">
          {{ 'workflow.changeStatusDialog.noteLabel' | translate }}
          <span class="opt-tag">{{ 'workflow.changeStatusDialog.noteOptional' | translate }}</span>
        </span>
        <textarea
          class="trd__note"
          [(ngModel)]="note"
          [placeholder]="'workflow.changeStatusDialog.notePlaceholder' | translate"
          data-testid="note-input"
          rows="2"
        ></textarea>
      </div>

      <div class="trd__actions">
        <button type="button" class="dlg-btn dlg-btn--ghost" mat-dialog-close>{{ 'workflow.changeStatusDialog.cancel' | translate }}</button>
        <button type="button" class="dlg-btn dlg-btn--primary" (click)="submit()" data-testid="confirm-btn">
          {{ 'workflow.changeStatusDialog.confirm' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .trd {
      padding: 24px 24px 20px;
      min-width: 340px;
    }
    .trd__header { margin-bottom: 24px; }
    .trd__title {
      font-size: 17px;
      font-weight: 700;
      color: #f1f5f9;
      letter-spacing: -0.02em;
      margin: 0 0 14px;
    }
    .trd__from-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .from-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #475569;
      flex-shrink: 0;
    }
    .from-arrow {
      color: #334155;
      font-size: 13px;
      flex-shrink: 0;
    }
    .cur-badge, .to-preview {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .cur-badge { opacity: 0.55; }
    .cur-badge[data-status="START"],
    .to-preview[data-status="START"]                { background: rgba(71,85,105,.20); color: #94a3b8; border-color: #334155; }
    .cur-badge[data-status="IN_PROCESSING"],
    .to-preview[data-status="IN_PROCESSING"]        { background: rgba(56,189,248,.10); color: #38bdf8; border-color: rgba(56,189,248,.25); }
    .cur-badge[data-status="PENDING_CLIENT_REVIEW"],
    .to-preview[data-status="PENDING_CLIENT_REVIEW"] { background: rgba(251,191,36,.10); color: #fbbf24; border-color: rgba(251,191,36,.25); }
    .cur-badge[data-status="SUBMIT_TO_CRA"],
    .to-preview[data-status="SUBMIT_TO_CRA"]        { background: rgba(192,132,252,.10); color: #c084fc; border-color: rgba(192,132,252,.25); }
    .cur-badge[data-status="COMPLETED"],
    .to-preview[data-status="COMPLETED"]            { background: rgba(52,211,153,.10); color: #34d399; border-color: rgba(52,211,153,.25); }

    .trd__body { margin-bottom: 24px; }
    .field-label {
      display: block;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 10px;
    }
    .note-label { margin-top: 18px; }
    .opt-tag {
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      font-size: 10px;
      color: #3d5068;
    }

    .status-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .status-pill {
      flex: 0 0 auto;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      border: 1px solid #2d3f55;
      background: rgba(45,63,85,.4);
      color: #64748b;
      transition: all 0.15s;
    }
    .status-pill:hover { border-color: #475569; color: #94a3b8; background: rgba(71,85,105,.2); }

    .status-pill[data-status="START"].selected                { background: rgba(71,85,105,.25); color: #94a3b8; border-color: #64748b; box-shadow: 0 0 0 2px rgba(100,116,139,.2); }
    .status-pill[data-status="IN_PROCESSING"].selected        { background: rgba(56,189,248,.12); color: #38bdf8; border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56,189,248,.2); }
    .status-pill[data-status="PENDING_CLIENT_REVIEW"].selected { background: rgba(251,191,36,.12); color: #fbbf24; border-color: #fbbf24; box-shadow: 0 0 0 2px rgba(251,191,36,.2); }
    .status-pill[data-status="SUBMIT_TO_CRA"].selected        { background: rgba(192,132,252,.12); color: #c084fc; border-color: #c084fc; box-shadow: 0 0 0 2px rgba(192,132,252,.2); }
    .status-pill[data-status="COMPLETED"].selected            { background: rgba(52,211,153,.12); color: #34d399; border-color: #34d399; box-shadow: 0 0 0 2px rgba(52,211,153,.2); }

    .status-pill[data-status="IN_PROCESSING"]:hover        { background: rgba(56,189,248,.08); color: #38bdf8; border-color: rgba(56,189,248,.4); }
    .status-pill[data-status="PENDING_CLIENT_REVIEW"]:hover { background: rgba(251,191,36,.08); color: #fbbf24; border-color: rgba(251,191,36,.4); }
    .status-pill[data-status="SUBMIT_TO_CRA"]:hover        { background: rgba(192,132,252,.08); color: #c084fc; border-color: rgba(192,132,252,.4); }
    .status-pill[data-status="COMPLETED"]:hover            { background: rgba(52,211,153,.08); color: #34d399; border-color: rgba(52,211,153,.4); }

    .trd__note {
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f1f5f9;
      font-size: 13px;
      font-family: inherit;
      padding: 10px 12px;
      resize: vertical;
      min-height: 60px;
      outline: none;
      transition: border-color 0.15s;
      box-sizing: border-box;
    }
    .trd__note:focus { border-color: rgba(56,189,248,.5); }
    .trd__note::placeholder { color: #3d5068; }

    .trd__actions {
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
  `],
})
export class AdminTransitionDialogComponent {
  private dialogRef = inject(MatDialogRef<AdminTransitionDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { engagement: EngagementDto };

  statuses = ALL_STATUSES.filter(s => s !== this.data.engagement.status);
  selectedStatus: EngagementStatus = this.statuses[0];
  note = this.data.engagement.note ?? '';

  submit(): void {
    this.dialogRef.close({ status: this.selectedStatus, note: this.note || null });
  }
}
