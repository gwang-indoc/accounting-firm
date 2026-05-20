import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { take } from 'rxjs/operators';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { ClientDto } from '../../../core/models/client.model';

export interface AdminClientDialogData {
  client: ClientDto | null;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="dlg-header">
      <div class="dlg-icon">{{ isEdit ? '✎' : '+' }}</div>
      <div>
        <div class="dlg-title">{{ isEdit ? 'Edit Client' : 'Add Client' }}</div>
        <div class="dlg-subtitle">{{ isEdit ? 'Update client information' : 'Create a new client record' }}</div>
      </div>
    </div>

    <mat-dialog-content>
      <form [formGroup]="form" id="clientForm" (ngSubmit)="submit()" class="dlg-form">
        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Jane Smith" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="dlg-field dlg-field-email">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g. jane@example.com" />
          <mat-hint>Must match the email the client used when registering their account</mat-hint>
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Enter a valid email address</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" placeholder="Optional" />
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dlg-actions">
      <button mat-button class="dlg-cancel" [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button color="primary" class="dlg-submit" form="clientForm" type="submit">
        {{ isEdit ? 'Save Changes' : 'Add Client' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 24px 24px 0;
    }
    .dlg-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #0f172a;
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .dlg-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      line-height: 1.2;
    }
    .dlg-subtitle {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }
    .dlg-form {
      display: flex;
      flex-direction: column;
      gap: 28px;
      min-width: 340px;
      padding-top: 4px;
    }
    .dlg-field {
      width: 100%;
    }
    /* ::ng-deep needed — mat-hint renders inside Material's shadow DOM */
    .dlg-field-email ::ng-deep .mat-mdc-form-field-hint {
      color: #38bdf8;
      font-size: 11.5px;
    }
    .dlg-actions {
      padding: 8px 24px 20px !important;
      gap: 8px;
      justify-content: flex-end !important;
    }
    .dlg-cancel {
      color: #64748b !important;
    }
    .dlg-submit {
      background: #0f172a !important;
      color: #38bdf8 !important;
      font-weight: 700 !important;
      border-radius: 8px !important;
      padding: 0 20px !important;
    }
    .dlg-submit:hover {
      background: #1e293b !important;
    }
  `],
})
export class AdminClientDialogComponent {
  private data = inject<AdminClientDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<AdminClientDialogComponent>);
  private adminClientsService = inject(AdminClientsService);
  private snackBar = inject(MatSnackBar);

  protected isEdit = this.data.client !== null;

  form = new FormGroup({
    name: new FormControl(this.data.client?.name ?? '', Validators.required),
    email: new FormControl(this.data.client?.email ?? '', [Validators.required, Validators.email]),
    phone: new FormControl(this.data.client?.phone ?? ''),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const req = { name: raw.name!, email: raw.email!, phone: raw.phone?.trim() || null };
    const obs$ = this.isEdit
      ? this.adminClientsService.update(this.data.client!.id, req)
      : this.adminClientsService.create(req);

    obs$.pipe(take(1)).subscribe({
      next: (result) => this.dialogRef.close(result),
      error: () => this.snackBar.open('Failed to save client. Please try again.', 'OK'),
    });
  }
}
