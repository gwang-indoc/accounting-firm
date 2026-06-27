import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, switchMap, take } from 'rxjs/operators';
import { AdminClientsService } from '../../../core/services/admin-clients.service';
import { ClientDto } from '../../../core/models/client.model';
import { BusinessType } from '../../../core/models/engagement.model';

export interface AdminClientDialogData {
  client: ClientDto | null;
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
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
        <mat-form-field appearance="outline" class="dlg-field dlg-field-email">
          <mat-label>Email Address</mat-label>
          <input matInput type="email" formControlName="email" placeholder="e.g. jane@example.com" />
          @if (emailHint()) {
            <mat-hint>{{ emailHint() }}</mat-hint>
          }
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Enter a valid email address</mat-error>
          }
          @if (form.get('email')?.hasError('notRegistered')) {
            <mat-error>Email not registered — client must have an account first</mat-error>
          }
          @if (form.get('email')?.hasError('duplicateClient')) {
            <mat-error>Client already exists</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Jane Smith" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Name is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" placeholder="Optional" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="dlg-field">
          <mat-label>Business Type</mat-label>
          <mat-select formControlName="businessType">
            <mat-option value="PERSONAL">Personal</mat-option>
            <mat-option value="CORPORATE">Corporate</mat-option>
            <mat-option value="SELF_EMPLOYED">Self Employed</mat-option>
          </mat-select>
        </mat-form-field>

        @if (requiresFye()) {
          <mat-form-field appearance="outline" class="dlg-field" data-testid="fye-field">
            <mat-label>Fiscal Year End Month</mat-label>
            <input matInput type="number" formControlName="fiscalYearEndMonth" placeholder="1–12" min="1" max="12" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="dlg-field" data-testid="fye-field">
            <mat-label>Fiscal Year End Day</mat-label>
            <input matInput type="number" formControlName="fiscalYearEndDay" placeholder="1–31" min="1" max="31" />
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>

    <mat-dialog-actions class="dlg-actions">
      <button mat-button class="dlg-cancel" [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button color="primary" class="dlg-submit" form="clientForm" type="submit"
              [disabled]="form.invalid || form.pending">
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

  emailHint = signal('');

  form = new FormGroup({
    name: new FormControl(this.data.client?.name ?? '', Validators.required),
    email: new FormControl(
      this.data.client?.email ?? '',
      [Validators.required, Validators.email],
      this.isEdit ? [] : [this.emailLookupValidator()],
    ),
    phone: new FormControl(this.data.client?.phone ?? ''),
    businessType: new FormControl<BusinessType>(
      (this.data.client as any)?.businessType ?? 'PERSONAL',
      Validators.required
    ),
    fiscalYearEndMonth: new FormControl<number | null>(
      (this.data.client as any)?.fiscalYearEndMonth ?? null
    ),
    fiscalYearEndDay: new FormControl<number | null>(
      (this.data.client as any)?.fiscalYearEndDay ?? null
    ),
  });

  private businessTypeSignal = toSignal(this.form.get('businessType')!.valueChanges, {
    initialValue: this.form.get('businessType')!.value,
  });

  requiresFye = computed(() => {
    const bt = this.businessTypeSignal();
    return bt === 'CORPORATE' || bt === 'SELF_EMPLOYED';
  });

  constructor() {
    this.form.get('businessType')!.valueChanges.subscribe(bt => {
      const required = bt === 'CORPORATE' || bt === 'SELF_EMPLOYED';
      const fyeValidators = required ? [Validators.required, Validators.min(1)] : [];
      this.form.get('fiscalYearEndMonth')!.setValidators(fyeValidators);
      this.form.get('fiscalYearEndDay')!.setValidators(fyeValidators);
      this.form.get('fiscalYearEndMonth')!.updateValueAndValidity({ emitEvent: false });
      this.form.get('fiscalYearEndDay')!.updateValueAndValidity({ emitEvent: false });
    });
  }

  private emailLookupValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = control.value as string;
      if (!email || Validators.email(control) !== null) {
        this.emailHint.set('');
        return of(null);
      }
      return timer(400).pipe(
        switchMap(() => this.adminClientsService.lookupUserByEmail(email)),
        map((result) => {
          this.emailHint.set(`Registered user: ${result.name}`);
          this.form.get('name')?.setValue(result.name, { emitEvent: false });
          return null;
        }),
        catchError((err: HttpErrorResponse) => {
          this.emailHint.set('');
          if (err.status === 404) {
            return of({ notRegistered: true } as ValidationErrors);
          }
          return of(null);
        }),
      );
    };
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const req = {
      name: raw.name!,
      email: raw.email!,
      phone: raw.phone?.trim() || null,
      businessType: raw.businessType!,
      fiscalYearEndMonth: raw.fiscalYearEndMonth ?? null,
      fiscalYearEndDay: raw.fiscalYearEndDay ?? null,
    };
    const obs$ = this.isEdit
      ? this.adminClientsService.update(this.data.client!.id, req)
      : this.adminClientsService.create(req);

    obs$.pipe(take(1)).subscribe({
      next: (result) => this.dialogRef.close(result),
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.form.get('email')?.setErrors({ duplicateClient: true });
        } else {
          this.snackBar.open('Failed to save client. Please try again.', 'OK');
        }
      },
    });
  }
}
