import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { ClientDto } from '../../../core/models/client.model';

export interface AdminClientDialogData {
  client: ClientDto | null;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Client' : 'Add Client' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="clientForm" (ngSubmit)="submit()" class="dialog-form">
        <mat-form-field appearance="outline">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          <mat-hint>Must match the client's Google account email</mat-hint>
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone (optional)</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button color="primary" form="clientForm" type="submit">
        {{ isEdit ? 'Save' : 'Add Client' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display: flex; flex-direction: column; gap: 8px; min-width: 320px; padding-top: 8px; }`],
})
export class AdminClientDialogComponent {
  private data = inject<AdminClientDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<AdminClientDialogComponent>);
  private adminClientsService = inject(AdminClientsService);
  private snackBar = inject(MatSnackBar);

  protected isEdit = this.data.client !== null;

  form = new FormGroup({
    name: new FormControl(this.data.client?.name ?? '', Validators.required),
    email: new FormControl(this.data.client?.email ?? '', Validators.required),
    phone: new FormControl(this.data.client?.phone ?? ''),
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const req = this.form.value as { name: string; email: string; phone: string };
    const obs$ = this.isEdit
      ? this.adminClientsService.update(this.data.client!.id, req)
      : this.adminClientsService.create(req);

    obs$.subscribe({
      next: (result) => this.dialogRef.close(result),
      error: () => this.snackBar.open('Failed to save client. Please try again.', 'OK'),
    });
  }
}
