import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { EngagementStatus } from '../../../core/models/engagement.model';

const ALL_STATUSES: EngagementStatus[] = [
  'START', 'IN_PROCESSING', 'PENDING_CLIENT_REVIEW', 'SUBMIT_TO_CRA', 'COMPLETED',
];

@Component({
  selector: 'app-admin-transition-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Change Status</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>New Status</mat-label>
        <mat-select [(ngModel)]="selectedStatus" data-testid="status-select">
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Note (optional)</mat-label>
        <input matInput [(ngModel)]="note" data-testid="note-input" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" data-testid="confirm-btn">Confirm</button>
    </mat-dialog-actions>
  `,
})
export class AdminTransitionDialogComponent {
  private dialogRef = inject(MatDialogRef<AdminTransitionDialogComponent>);
  data = inject(MAT_DIALOG_DATA) as { currentStatus: EngagementStatus };

  statuses = ALL_STATUSES.filter(s => s !== this.data.currentStatus);
  selectedStatus: EngagementStatus = this.statuses[0];
  note = '';

  submit(): void {
    this.dialogRef.close({ status: this.selectedStatus, note: this.note || null });
  }
}
