import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="dlg-header">
      <div class="dlg-icon">✉</div>
      <div>
        <div class="dlg-title">New Thread</div>
        <div class="dlg-subtitle">Start a conversation with this client</div>
      </div>
    </div>
    <mat-dialog-content>
      <form [formGroup]="form" id="newThreadForm" (ngSubmit)="submit()" class="dlg-form">
        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject" maxlength="200" placeholder="e.g. 2026 tax filing"/>
          @if (form.get('subject')?.hasError('required') && form.get('subject')?.touched) {
            <mat-error>Subject is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Message</mat-label>
          <textarea matInput rows="6" maxlength="5000" formControlName="body" placeholder="Write your message…"></textarea>
          @if (form.get('body')?.hasError('required') && form.get('body')?.touched) {
            <mat-error>Message is required</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions class="dlg-actions">
      <button mat-button class="dlg-cancel" [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button class="dlg-submit" form="newThreadForm" type="submit">Send</button>
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
      gap: 20px;
      min-width: 400px;
      padding-top: 4px;
    }
    .dlg-field {
      width: 100%;
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
export class NewThreadDialogComponent {
  private dialogRef = inject(MatDialogRef<NewThreadDialogComponent>);

  form = new FormGroup({
    subject: new FormControl('', [Validators.required, Validators.maxLength(200)]),
    body: new FormControl('', [Validators.required, Validators.maxLength(5000)]),
  });

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    this.dialogRef.close({ subject: v.subject!, body: v.body! });
  }
}
