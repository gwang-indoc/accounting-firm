import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactService } from '../../core/services/contact.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {
  form: FormGroup;
  submitting = signal(false);

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

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.contactService.send(this.form.value).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => {
        this.form.reset();
        this.snackBar.open("Thanks — we'll reply soon", undefined, { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Something went wrong. Please try again.', 'OK');
      },
    });
  }
}
