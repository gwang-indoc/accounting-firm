import { Component, inject, signal } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-new-engagement-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>New Engagement</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Tax Year</mat-label>
        <input matInput type="number" [(ngModel)]="taxYear" data-testid="tax-year-input" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" data-testid="submit-btn">Create</button>
    </mat-dialog-actions>
  `,
})
export class AdminNewEngagementDialogComponent {
  private dialogRef = inject(MatDialogRef<AdminNewEngagementDialogComponent>);
  taxYear = new Date().getFullYear();

  submit(): void {
    if (this.taxYear) {
      this.dialogRef.close(this.taxYear);
    }
  }
}
