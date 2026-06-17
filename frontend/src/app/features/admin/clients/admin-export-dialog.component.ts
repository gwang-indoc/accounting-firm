import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

export interface ExportDialogResult {
  includeMetadata: boolean;
  includeDocuments: boolean;
  year: number | null;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS: number[] = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

@Component({
  selector: 'app-admin-export-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatSelectModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Export Clients</h2>
    <mat-dialog-content>
      <div class="export-options">
        <mat-checkbox data-testid="include-metadata-cb"
                      [checked]="includeMetadata()"
                      (change)="includeMetadata.set($event.checked)">
          Include client metadata
        </mat-checkbox>
        <mat-checkbox data-testid="include-documents-cb"
                      [checked]="includeDocuments()"
                      (change)="includeDocuments.set($event.checked)">
          Include documents
        </mat-checkbox>
        @if (includeDocuments()) {
          <mat-form-field appearance="outline" data-testid="year-select">
            <mat-label>Year</mat-label>
            <mat-select [value]="year()" (selectionChange)="year.set($event.value)">
              <mat-option [value]="null">All years</mat-option>
              @for (y of years; track y) {
                <mat-option [value]="y">{{ y }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button data-testid="cancel-btn" (click)="cancel()">Cancel</button>
      <button mat-flat-button color="primary" data-testid="dialog-export-btn" (click)="confirm()">Export</button>
    </mat-dialog-actions>
  `,
})
export class AdminExportDialogComponent {
  private dialogRef = inject(MatDialogRef<AdminExportDialogComponent>);

  includeMetadata = signal(true);
  includeDocuments = signal(true);
  year = signal<number | null>(null);

  readonly years = YEAR_OPTIONS;

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    this.dialogRef.close({
      includeMetadata: this.includeMetadata(),
      includeDocuments: this.includeDocuments(),
      year: this.year(),
    } as ExportDialogResult);
  }
}
