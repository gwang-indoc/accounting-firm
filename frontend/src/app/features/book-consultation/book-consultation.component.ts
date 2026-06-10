import { Component, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormGroupDirective, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { ContactService } from '../../core/services/contact.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-book-consultation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './book-consultation.component.html',
  styleUrl: './book-consultation.component.css',
})
export class BookConsultationComponent {
  form: FormGroup;
  submitting = signal(false);
  showConfirmation = signal(false);
  private formDirective = viewChild.required(FormGroupDirective);

  constructor(
    private fb: FormBuilder,
    private contactService: ContactService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.maxLength(200)]],
      message: ['', [Validators.required, Validators.maxLength(5000)]],
      companyUrl: [''],
    });
  }

  onFormInput(): void {
    if (this.showConfirmation()) {
      this.showConfirmation.set(false);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.showConfirmation.set(false);
    this.contactService.send(this.form.value).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => {
        this.formDirective().resetForm();
        this.showConfirmation.set(true);
      },
      error: () => {
        this.snackBar.open('Something went wrong. Please try again.', 'OK');
      },
    });
  }
}
