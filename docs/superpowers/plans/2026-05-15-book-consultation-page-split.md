# Book Consultation Page Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "Send a Message" form out of `/contact` onto a new `/book-consultation` route so the navbar's `Book Consultation` CTA lands on a dedicated page. `/contact` becomes info-only (address, phone, email, hours, map). No backend or form-field changes.

**Architecture:** Rename `features/contact/` → `features/book-consultation/` via `git mv` (preserves form code + Vitest spec history). Strip the info panel out of the migrated template. Create a fresh, lean `features/contact/` for the info-only page. Repoint the navbar + side nav `Book Consultation` CTA. Move the two existing E2E specs (`contact.spec.ts`, `contact-success-state.spec.ts`) to use the new URL.

**Tech Stack:** Angular 21 standalone components (zoneless), Angular Material, Vitest + TestBed, Playwright. Existing `ContactService` (`POST /api/contact`) is reused unchanged.

**Reference docs:**
- Design spec: `docs/superpowers/specs/2026-05-15-book-consultation-page-split-design.md`
- UI conventions: `docs/ui-design-guide.md`

---

## Pre-flight: baseline

Before starting, confirm the current test suites are green so any post-task failure is attributable to this work.

- [ ] **Step 1: Run frontend unit tests (baseline)**

```bash
cd frontend && npx ng test --no-watch
```

Expected: all tests pass. If anything fails, stop and fix the baseline first (per `tasks.instruction` in `openspec/schemas/openspec-superpowers/schema.yaml`).

- [ ] **Step 2: Run E2E tests (baseline, optional but recommended)**

Requires backend (`cd backend && ./start.sh` or `./mvnw spring-boot:run`) and frontend (`cd frontend && npm start`) servers running.

```bash
cd e2e && npx playwright test
```

Expected: all tests pass except the already-stale `Contact page › mobile layout` test in `e2e/contact.spec.ts` (it asserts on `mat-card` selectors that don't exist in the current template — not introduced by this change).

---

## Task 1: Rename `features/contact/` → `features/book-consultation/`

The form code stays intact via `git mv` so its history follows the rename. After this task the form is reachable at `/book-consultation` and the old `/contact` route is broken (will be fixed in Task 4).

**Files:**
- Move: `frontend/src/app/features/contact/` → `frontend/src/app/features/book-consultation/`
- Rename inside the new dir: `contact.component.{ts,html,css,spec.ts}` → `book-consultation.component.{ts,html,css,spec.ts}`
- Modify: `frontend/src/app/features/book-consultation/book-consultation.component.ts` (class name, selector, templateUrl, styleUrl)
- Modify: `frontend/src/app/features/book-consultation/book-consultation.component.spec.ts` (import + reference renames)
- Modify: `frontend/src/app/app.routes.ts` (route path + loadComponent target)

- [ ] **Step 1: Git move the directory**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git mv frontend/src/app/features/contact frontend/src/app/features/book-consultation
```

- [ ] **Step 2: Rename the four files inside the new directory**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend/src/app/features/book-consultation
git mv contact.component.ts book-consultation.component.ts
git mv contact.component.html book-consultation.component.html
git mv contact.component.css book-consultation.component.css
git mv contact.component.spec.ts book-consultation.component.spec.ts
```

- [ ] **Step 3: Update the component class — `book-consultation.component.ts`**

Open `frontend/src/app/features/book-consultation/book-consultation.component.ts` and replace its contents with:

```ts
import { Component, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormGroupDirective, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactService } from '../../core/services/contact.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-book-consultation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
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
```

(Only differences from the old `ContactComponent`: class name → `BookConsultationComponent`, selector → `app-book-consultation`, templateUrl/styleUrl → new filenames.)

- [ ] **Step 4: Update the spec file — `book-consultation.component.spec.ts`**

Replace the import lines and the describe block name. The 12 form-behavior tests stay exactly as they are.

Find at the top:

```ts
import { ContactComponent } from './contact.component';
```

Replace with:

```ts
import { BookConsultationComponent } from './book-consultation.component';
```

Find:

```ts
describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;
  let component: ContactComponent;
```

Replace with:

```ts
describe('BookConsultationComponent', () => {
  let fixture: ComponentFixture<BookConsultationComponent>;
  let component: BookConsultationComponent;
```

Find:

```ts
      imports: [ContactComponent],
```

Replace with:

```ts
      imports: [BookConsultationComponent],
```

Find:

```ts
    fixture = TestBed.createComponent(ContactComponent);
```

Replace with:

```ts
    fixture = TestBed.createComponent(BookConsultationComponent);
```

- [ ] **Step 5: Update `app.routes.ts` so the new component is routable**

The `/contact` route currently imports the old `ContactComponent`. The form-bearing component now lives at the book-consultation path. We update `/contact` temporarily to point at the new file too (Task 4 will replace it with a fresh lean ContactComponent). For now, both paths load `BookConsultationComponent` so the next test run isn't broken by a missing module reference.

Open `frontend/src/app/app.routes.ts` and find:

```ts
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then(m => m.ContactComponent),
  },
```

Replace with:

```ts
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/book-consultation/book-consultation.component').then(m => m.BookConsultationComponent),
  },
  {
    path: 'book-consultation',
    loadComponent: () =>
      import('./features/book-consultation/book-consultation.component').then(m => m.BookConsultationComponent),
  },
```

- [ ] **Step 6: Run the renamed unit spec**

```bash
cd frontend && npx ng test --no-watch --include='**/book-consultation.component.spec.ts'
```

Expected: all 12 tests pass. Same behaviors as before the rename.

- [ ] **Step 7: Run the full frontend test suite**

```bash
cd frontend && npx ng test --no-watch
```

Expected: PASS. No test should reference the deleted `ContactComponent` symbol or `./features/contact/contact.component` path. If anything fails, search for orphan imports and fix.

- [ ] **Step 8: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/book-consultation frontend/src/app/app.routes.ts
git commit -m "refactor(book-consultation): rename ContactComponent to BookConsultationComponent

Move features/contact/ to features/book-consultation/ via git mv so the
form's history follows the rename. Both /contact and /book-consultation
load the new component for now; the lean info-only ContactComponent
arrives in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Strip info panel + map out of BookConsultationComponent template

After this task, `/book-consultation` shows only the form on the right, with a left intro panel that has the eyebrow + heading + sub copy and the decorative watermark/circles — no detail items, no map.

**Files:**
- Modify: `frontend/src/app/features/book-consultation/book-consultation.component.html`
- Modify: `frontend/src/app/features/book-consultation/book-consultation.component.css`
- Modify: `frontend/src/app/features/book-consultation/book-consultation.component.spec.ts` (add 2 assertions)

- [ ] **Step 1: Write the failing assertions in the spec**

Append these two tests to `book-consultation.component.spec.ts` at the end of the `describe` block, just before the final closing `});`:

```ts
  it('does NOT render the map iframe (moved to /contact)', () => {
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).toBeNull();
  });

  it('does NOT render the contact detail items (moved to /contact)', () => {
    const details = fixture.nativeElement.querySelectorAll('.detail-item');
    expect(details.length).toBe(0);
  });
```

- [ ] **Step 2: Run the new tests — expect FAIL**

```bash
cd frontend && npx ng test --no-watch --include='**/book-consultation.component.spec.ts'
```

Expected: 2 failures — iframe is still present and 4 `.detail-item` elements exist.

- [ ] **Step 3: Rewrite `book-consultation.component.html`**

Replace the entire file contents with:

```html
<div class="contact-shell">

  <!-- LEFT: Intro panel -->
  <aside class="info-panel">
    <div class="info-bg-decoration" aria-hidden="true">
      <div class="deco-circle deco-circle-1"></div>
      <div class="deco-circle deco-circle-2"></div>
      <div class="deco-watermark">税</div>
    </div>

    <div class="info-content">
      <div class="info-top">
        <span class="info-eyebrow">GWH Accounting</span>
        <h1 class="info-heading">Let's<br>Talk.</h1>
        <p class="info-sub">Ready to take control of your finances? Tell us about your needs and we'll reply within one business day.</p>
      </div>
    </div>
  </aside>

  <!-- RIGHT: Form panel -->
  <main class="form-panel">
    <div class="form-content">
      <div class="form-header">
        <h2 class="form-heading">Book a Consultation</h2>
        <p class="form-sub">All fields are required.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" (input)="onFormInput()" class="contact-form" novalidate>

        <div class="field-row">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Your Name</mat-label>
            <input matInput formControlName="name" autocomplete="name" />
            <mat-error>Name is required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" />
            <mat-error>Enter a valid email address</mat-error>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Subject</mat-label>
          <input matInput formControlName="subject" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width message-field">
          <mat-label>Your Message</mat-label>
          <textarea matInput formControlName="message" rows="5"></textarea>
          <mat-error>Message is too long (5000 character limit)</mat-error>
        </mat-form-field>

        <!-- Honeypot: off-screen, invisible to keyboard and screen readers -->
        <input
          formControlName="companyUrl"
          name="companyUrl"
          tabindex="-1"
          aria-hidden="true"
          autocomplete="off"
          style="position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;"
        />

        <button
          mat-stroked-button
          color="primary"
          type="submit"
          class="submit-btn"
          [disabled]="form.invalid || submitting()">
          <span class="btn-label">
            @if (submitting()) {
              <mat-icon class="spin-icon">autorenew</mat-icon>
              Sending…
            } @else {
              Send Message
              <mat-icon>arrow_forward</mat-icon>
            }
          </span>
        </button>

        @if (showConfirmation()) {
          <div class="confirmation-block" role="status" aria-live="polite">
            <mat-icon>check_circle</mat-icon>
            <span>Thanks — we'll reply soon.</span>
          </div>
        }

      </form>
    </div>
  </main>

</div>
```

Differences from the previous template:
- The four `.detail-item` blocks (Visit Us, Call Us, Email Us, Office Hours) are removed.
- The `.map-wrapper` + iframe block is removed.
- The form heading text changes from `Send a Message` to `Book a Consultation`.
- The info-sub copy is reworded (the old "Drop us a message and we'll get back to you" → the new copy).

- [ ] **Step 4: Remove detail-item, map-wrapper, and info-details CSS that are no longer used**

Open `frontend/src/app/features/book-consultation/book-consultation.component.css` and delete these blocks (they only applied to the now-removed markup):

Delete the block starting with `/* Detail items */` through the end of `.detail-value { ... }` (roughly lines 117–167 in the current file):

```css
/* Detail items */
.info-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  animation: fadeSlideUp 0.7s ease both;
}

.detail-item:nth-child(1) { animation-delay: 0.1s; }
.detail-item:nth-child(2) { animation-delay: 0.18s; }
.detail-item:nth-child(3) { animation-delay: 0.26s; }
.detail-item:nth-child(4) { animation-delay: 0.34s; }

.detail-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: #38bdf8;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 3px;
}

.detail-value {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.5;
}
```

Also delete the `.map-wrapper` block (and its media query) — roughly lines 169–182 in the current file:

```css
/* Map */
.map-wrapper {
  position: relative;
  z-index: 1;
  height: 220px;
  flex-shrink: 0;
  border-top: 1px solid rgba(56, 189, 248, 0.1);
}

@media (max-width: 899px) {
  .map-wrapper {
    height: 180px;
  }
}
```

Keep everything else (shell layout, info-panel/decorations/eyebrow/heading/sub, form-panel, form fields, submit button, confirmation block, animations).

- [ ] **Step 5: Run the spec — expect PASS**

```bash
cd frontend && npx ng test --no-watch --include='**/book-consultation.component.spec.ts'
```

Expected: all 14 tests pass (the 12 original + the 2 new ones).

- [ ] **Step 6: Run the full frontend test suite**

```bash
cd frontend && npx ng test --no-watch
```

Expected: PASS. (The `/contact` route still loads BookConsultationComponent at this point — that's fine; Task 4 fixes it.)

- [ ] **Step 7: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/book-consultation
git commit -m "feat(book-consultation): strip info panel and map from form page

Removes the four contact detail items (Visit Us, Call Us, Email Us,
Office Hours) and the Google Maps iframe from the form page — these
move to /contact in a follow-up task. Form heading becomes
'Book a Consultation'; left-panel sub-copy is reworded.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Create the fresh info-only `ContactComponent`

A brand-new `features/contact/` directory with a small standalone component for the info-only page. Reuses the info-panel + map markup that was stripped out of BookConsultationComponent in Task 2.

**Files:**
- Create: `frontend/src/app/features/contact/contact.component.ts`
- Create: `frontend/src/app/features/contact/contact.component.html`
- Create: `frontend/src/app/features/contact/contact.component.css`
- Create: `frontend/src/app/features/contact/contact.component.spec.ts`

- [ ] **Step 1: Write the failing spec — `contact.component.spec.ts`**

Create `frontend/src/app/features/contact/contact.component.spec.ts`:

```ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ContactComponent } from './contact.component';

describe('ContactComponent', () => {
  let fixture: ComponentFixture<ContactComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ContactComponent);
    fixture.detectChanges();
  });

  it('renders the four contact detail items', () => {
    const details = fixture.nativeElement.querySelectorAll('.detail-item');
    expect(details.length).toBe(4);
  });

  it('renders Visit Us, Call Us, Email Us, and Office Hours labels', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('Visit Us');
    expect(text).toContain('Call Us');
    expect(text).toContain('Email Us');
    expect(text).toContain('Office Hours');
  });

  it('renders the Google Maps iframe', () => {
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('title')).toBe('Office location map');
  });

  it('does NOT render a form (moved to /book-consultation)', () => {
    const form = fixture.nativeElement.querySelector('form');
    expect(form).toBeNull();
  });

  it('does NOT render the honeypot input (moved to /book-consultation)', () => {
    const honeypot = fixture.nativeElement.querySelector('input[name="companyUrl"]');
    expect(honeypot).toBeNull();
  });
});
```

- [ ] **Step 2: Run the spec — expect FAIL (component file does not exist)**

```bash
cd frontend && npx ng test --no-watch --include='**/features/contact/contact.component.spec.ts'
```

Expected: import-resolution failure — `./contact.component` not found.

- [ ] **Step 3: Create the component class — `contact.component.ts`**

Create `frontend/src/app/features/contact/contact.component.ts`:

```ts
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css',
})
export class ContactComponent {}
```

- [ ] **Step 4: Create the template — `contact.component.html`**

Create `frontend/src/app/features/contact/contact.component.html`:

```html
<div class="contact-shell">

  <!-- LEFT: Info panel -->
  <aside class="info-panel">
    <div class="info-bg-decoration" aria-hidden="true">
      <div class="deco-circle deco-circle-1"></div>
      <div class="deco-circle deco-circle-2"></div>
      <div class="deco-watermark">税</div>
    </div>

    <div class="info-content">
      <div class="info-top">
        <span class="info-eyebrow">GWH Accounting</span>
        <h1 class="info-heading">Get in<br>Touch.</h1>
        <p class="info-sub">Office hours, phone, and visit info for our team.</p>
      </div>

      <div class="info-details">
        <div class="detail-item">
          <div class="detail-icon"><mat-icon>location_on</mat-icon></div>
          <div class="detail-text">
            <div class="detail-label">Visit Us</div>
            <div class="detail-value">123 Main St, Anytown CA 90210</div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-icon"><mat-icon>phone</mat-icon></div>
          <div class="detail-text">
            <div class="detail-label">Call Us</div>
            <div class="detail-value">(555) 123-4567</div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-icon"><mat-icon>mail_outline</mat-icon></div>
          <div class="detail-text">
            <div class="detail-label">Email Us</div>
            <div class="detail-value">info@firm.com</div>
          </div>
        </div>
        <div class="detail-item">
          <div class="detail-icon"><mat-icon>schedule</mat-icon></div>
          <div class="detail-text">
            <div class="detail-label">Office Hours</div>
            <div class="detail-value">Mon – Fri &nbsp;9:00 AM – 5:00 PM</div>
          </div>
        </div>
      </div>
    </div>
  </aside>

  <!-- RIGHT: Map panel -->
  <main class="map-panel">
    <iframe
      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3305.7152274!2d-118.24368!3d34.052234!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c2c75ddc27da13%3A0xe22fef1de0f462ef!2sLos+Angeles%2C+CA!5e0!3m2!1sen!2sus!4v1699999999999!5m2!1sen!2sus"
      width="100%"
      height="100%"
      style="border:0; filter: invert(90%) hue-rotate(180deg) saturate(0.8);"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      title="Office location map">
    </iframe>
  </main>

</div>
```

- [ ] **Step 5: Create the stylesheet — `contact.component.css`**

Create `frontend/src/app/features/contact/contact.component.css`. The shell, info-panel decorations/eyebrow/heading/sub, and detail-item styles are duplicated from the book-consultation CSS (intentional — keeps each component self-contained, matches the design's minimal-change goal). The map panel is new.

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');

/* ── Layout shell ─────────────────────────────────────────────────── */

.contact-shell {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: calc(100vh - 68px);
  align-items: stretch;
}

@media (max-width: 899px) {
  .contact-shell {
    grid-template-columns: 1fr;
  }
}

/* ── Info panel (left) ────────────────────────────────────────────── */

.info-panel {
  position: relative;
  background: #0a1628;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.info-bg-decoration {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.07;
}

.deco-circle-1 {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, #38bdf8, transparent 70%);
  top: -120px;
  right: -120px;
}

.deco-circle-2 {
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, #38bdf8, transparent 70%);
  bottom: 180px;
  left: -80px;
}

.deco-watermark {
  position: absolute;
  bottom: 200px;
  right: -20px;
  font-size: 240px;
  font-weight: 900;
  color: #38bdf8;
  opacity: 0.04;
  line-height: 1;
  user-select: none;
  letter-spacing: -4px;
}

.info-content {
  position: relative;
  z-index: 1;
  flex: 1;
  padding: 56px 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 40px;
  animation: fadeSlideUp 0.7s ease both;
}

@media (max-width: 899px) {
  .info-content {
    padding: 40px 24px 32px;
  }
}

.info-eyebrow {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #38bdf8;
  margin-bottom: 12px;
}

.info-heading {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(52px, 6vw, 80px);
  font-weight: 900;
  line-height: 0.95;
  color: #ffffff;
  margin: 0 0 20px;
  letter-spacing: -1px;
}

.info-sub {
  font-size: 14px;
  line-height: 1.7;
  color: #94a3b8;
  margin: 0;
  max-width: 340px;
}

/* ── Detail items ─────────────────────────────────────────────────── */

.info-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  animation: fadeSlideUp 0.7s ease both;
}

.detail-item:nth-child(1) { animation-delay: 0.1s; }
.detail-item:nth-child(2) { animation-delay: 0.18s; }
.detail-item:nth-child(3) { animation-delay: 0.26s; }
.detail-item:nth-child(4) { animation-delay: 0.34s; }

.detail-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-icon mat-icon {
  font-size: 18px;
  width: 18px;
  height: 18px;
  color: #38bdf8;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 3px;
}

.detail-value {
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.5;
}

/* ── Map panel (right) ────────────────────────────────────────────── */

.map-panel {
  position: relative;
  background: #0f172a;
  min-height: 320px;
  animation: fadeSlideUp 0.7s ease 0.15s both;
}

.map-panel iframe {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 320px;
}

/* ── Entrance animation ───────────────────────────────────────────── */

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 6: Run the new spec — expect PASS**

```bash
cd frontend && npx ng test --no-watch --include='**/features/contact/contact.component.spec.ts'
```

Expected: all 5 tests pass.

- [ ] **Step 7: Run the full frontend test suite**

```bash
cd frontend && npx ng test --no-watch
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/features/contact
git commit -m "feat(contact): add info-only ContactComponent for /contact

New lean standalone component for the contact page: left info panel
with four detail items (address, phone, email, hours), right map panel.
No form. Route wiring follows in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Point the `/contact` route at the new lean ContactComponent

After this task, `/contact` loads the info-only component (Task 3) and `/book-consultation` loads the form-bearing component (Task 1).

**Files:**
- Modify: `frontend/src/app/app.routes.ts`

- [ ] **Step 1: Update the `/contact` route**

Open `frontend/src/app/app.routes.ts`. Find:

```ts
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/book-consultation/book-consultation.component').then(m => m.BookConsultationComponent),
  },
```

Replace with:

```ts
  {
    path: 'contact',
    loadComponent: () =>
      import('./features/contact/contact.component').then(m => m.ContactComponent),
  },
```

The `/book-consultation` route added in Task 1 stays unchanged.

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd frontend && npx ng test --no-watch
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/app.routes.ts
git commit -m "feat(routes): point /contact at info-only ContactComponent

Restores /contact to load the lean info-only component (added in the
previous task) and keeps /book-consultation on the form-bearing
BookConsultationComponent.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Repoint the navbar `Book Consultation` CTA + update its spec

**Files:**
- Modify: `frontend/src/app/shared/navbar/navbar.component.html` (line 20)
- Modify: `frontend/src/app/shared/navbar/navbar.component.spec.ts` (two assertions)

- [ ] **Step 1: Update the failing test first (TDD-style)**

Open `frontend/src/app/shared/navbar/navbar.component.spec.ts`. Find:

```ts
  it('"Book Consultation" link has routerLink="/contact"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const ctaLinks = Array.from(nativeEl.querySelectorAll('a[routerLink="/contact"]'));
    const ctaLink = ctaLinks.find((a) => a.textContent?.trim() === 'Book Consultation');
    expect(ctaLink).not.toBeUndefined();
  });
```

Replace with:

```ts
  it('"Book Consultation" link has routerLink="/book-consultation"', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const ctaLink = nativeEl.querySelector('a[routerLink="/book-consultation"]');
    expect(ctaLink).not.toBeNull();
    expect(ctaLink!.textContent?.trim()).toBe('Book Consultation');
  });

  it('Contact and Book Consultation are separate links pointing to different routes', () => {
    const nativeEl = fixture.nativeElement as HTMLElement;
    const contactLink = nativeEl.querySelector('a[routerLink="/contact"]');
    const ctaLink = nativeEl.querySelector('a[routerLink="/book-consultation"]');
    expect(contactLink?.textContent?.trim()).toBe('Contact');
    expect(ctaLink?.textContent?.trim()).toBe('Book Consultation');
  });
```

The existing test `'Contact' link has routerLink="/contact"` (~ line 78) stays as-is.

- [ ] **Step 2: Run the navbar spec — expect FAIL on the updated test**

```bash
cd frontend && npx ng test --no-watch --include='**/navbar.component.spec.ts'
```

Expected: the two updated tests fail (Book Consultation still points to `/contact`). All other tests still pass.

- [ ] **Step 3: Update the navbar template**

Open `frontend/src/app/shared/navbar/navbar.component.html`. Find line 20:

```html
    <a mat-flat-button routerLink="/contact" class="cta-btn">Book Consultation</a>
```

Replace with:

```html
    <a mat-flat-button routerLink="/book-consultation" class="cta-btn">Book Consultation</a>
```

- [ ] **Step 4: Run the navbar spec — expect PASS**

```bash
cd frontend && npx ng test --no-watch --include='**/navbar.component.spec.ts'
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/shared/navbar
git commit -m "feat(navbar): point Book Consultation CTA at /book-consultation

The Contact link continues to point at /contact (info-only page);
the Book Consultation CTA now lands on the form.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Repoint the side nav `Book Consultation` list item + add an assertion to `app.spec.ts`

**Files:**
- Modify: `frontend/src/app/app.html` (line 8)
- Modify: `frontend/src/app/app.spec.ts` (add 2 assertions)

- [ ] **Step 1: Add failing assertions to `app.spec.ts`**

Append the following two `it` blocks inside the existing `describe('App', () => { ... })` in `frontend/src/app/app.spec.ts`, just before the closing `});`:

```ts
  it('side nav has a Contact list item pointing to /contact', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = Array.from(fixture.nativeElement.querySelectorAll('mat-sidenav a[mat-list-item]'));
    const contactItem = items.find((a: any) => a.getAttribute('routerLink') === '/contact');
    expect(contactItem).not.toBeUndefined();
    expect((contactItem as HTMLElement).textContent?.trim()).toBe('Contact');
  });

  it('side nav has a Book Consultation list item pointing to /book-consultation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const items = Array.from(fixture.nativeElement.querySelectorAll('mat-sidenav a[mat-list-item]'));
    const ctaItem = items.find((a: any) => a.getAttribute('routerLink') === '/book-consultation');
    expect(ctaItem).not.toBeUndefined();
    expect((ctaItem as HTMLElement).textContent?.trim()).toBe('Book Consultation');
  });
```

- [ ] **Step 2: Run `app.spec.ts` — expect FAIL on the second assertion**

```bash
cd frontend && npx ng test --no-watch --include='**/app.spec.ts'
```

Expected: the Contact assertion passes (existing link), the Book Consultation assertion fails (currently points to `/contact`).

- [ ] **Step 3: Update the side nav template**

Open `frontend/src/app/app.html`. Find line 8:

```html
      <a mat-list-item routerLink="/contact" class="sidenav-cta" (click)="sidenav.close()">Book Consultation</a>
```

Replace with:

```html
      <a mat-list-item routerLink="/book-consultation" class="sidenav-cta" (click)="sidenav.close()">Book Consultation</a>
```

- [ ] **Step 4: Run `app.spec.ts` — expect PASS**

```bash
cd frontend && npx ng test --no-watch --include='**/app.spec.ts'
```

Expected: all tests pass.

- [ ] **Step 5: Run the full frontend test suite**

```bash
cd frontend && npx ng test --no-watch
```

Expected: PASS across all specs.

- [ ] **Step 6: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add frontend/src/app/app.html frontend/src/app/app.spec.ts
git commit -m "feat(sidenav): point Book Consultation list item at /book-consultation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Move + update the E2E specs

Two existing specs test the form at `/contact`. Move them to the new URL via `git mv` and update each `page.goto('/contact')` call. Add a small new spec for the info-only `/contact` page and one navbar navigation test.

**Files:**
- Move: `e2e/contact.spec.ts` → `e2e/book-consultation.spec.ts`
- Move: `e2e/contact-success-state.spec.ts` → `e2e/book-consultation-success-state.spec.ts`
- Modify (after rename): `e2e/book-consultation.spec.ts` (URL change), `e2e/book-consultation-success-state.spec.ts` (URL change)
- Create: `e2e/contact-info.spec.ts`
- Modify: `e2e/navbar.spec.ts` (add one test)

- [ ] **Step 1: Git-move the two contact form specs**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git mv e2e/contact.spec.ts e2e/book-consultation.spec.ts
git mv e2e/contact-success-state.spec.ts e2e/book-consultation-success-state.spec.ts
```

- [ ] **Step 2: Update URLs in `e2e/book-consultation.spec.ts`**

Open `e2e/book-consultation.spec.ts`. There are three `page.goto('/contact')` calls (lines ~8, ~31, ~59). Update each to `/book-consultation`:

Find:

```ts
        await page.goto('/contact');
        await page.fill('input[formControlName="name"]', 'Jane Doe');
```

Replace with:

```ts
        await page.goto('/book-consultation');
        await page.fill('input[formControlName="name"]', 'Jane Doe');
```

Find:

```ts
  test('negative path: invalid email shows inline error and fires no POST', async ({ page }) => {
    await page.goto('/contact');
```

Replace with:

```ts
  test('negative path: invalid email shows inline error and fires no POST', async ({ page }) => {
    await page.goto('/book-consultation');
```

Find:

```ts
  test('mobile layout: form and Find Us card stack vertically at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/contact');
```

Replace with:

```ts
  test('mobile layout: form and Find Us card stack vertically at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/book-consultation');
```

Also update the `describe` block title at the top from `'Contact page'` to `'Book Consultation page'`:

Find:

```ts
test.describe('Contact page', () => {
```

Replace with:

```ts
test.describe('Book Consultation page', () => {
```

Note: the third test (`mobile layout`) was already stale before this change — it references `mat-card` selectors that don't exist in the template. Leave it as-is; fixing it is out of scope.

- [ ] **Step 3: Update URLs in `e2e/book-consultation-success-state.spec.ts`**

Open `e2e/book-consultation-success-state.spec.ts`. There are four `page.goto('/contact')` calls (lines ~11, ~23, ~35, ~50). Replace each with `/book-consultation`.

The `page.route('**/api/contact', ...)` at the top stays unchanged — the backend endpoint URL is still `/api/contact` even though the page URL changed.

Also update the describe block title:

Find:

```ts
test.describe('Contact form — post-submit success state', () => {
```

Replace with:

```ts
test.describe('Book consultation form — post-submit success state', () => {
```

- [ ] **Step 4: Create the small `e2e/contact-info.spec.ts`**

Create `e2e/contact-info.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test.describe('Contact info page', () => {
  test('renders the four detail items', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('.detail-item')).toHaveCount(4);
    const shell = page.locator('.contact-shell');
    await expect(shell).toContainText('Visit Us');
    await expect(shell).toContainText('Call Us');
    await expect(shell).toContainText('Email Us');
    await expect(shell).toContainText('Office Hours');
  });

  test('renders the office location map iframe', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('iframe[title="Office location map"]')).toBeVisible();
  });

  test('does NOT render the message form', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('input[formControlName="name"]')).toHaveCount(0);
    await expect(page.locator('input[name="companyUrl"]')).toHaveCount(0);
  });
});
```

- [ ] **Step 5: Append a navigation test to `e2e/navbar.spec.ts`**

Open `e2e/navbar.spec.ts`. After the existing `Contact link navigates to /contact` test (around line 52), append:

```ts
test('Book Consultation CTA navigates to /book-consultation', async ({ page }) => {
  await page.goto('/');
  await page.click('a.cta-btn:has-text("Book Consultation")');
  await expect(page).toHaveURL(/\/book-consultation/);
});
```

- [ ] **Step 6: Start the dev servers**

In two separate terminals (these need to stay running for the E2E run):

```bash
# Terminal 1 (backend)
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./start.sh
```

```bash
# Terminal 2 (frontend)
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npm start
```

Wait for both to be ready (backend on `:8080`, frontend on `:4200`).

- [ ] **Step 7: Run the E2E suite — expect PASS**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e
npx playwright test
```

Expected: all tests pass except the pre-existing stale `Book Consultation page › mobile layout: form and Find Us card stack vertically at 360px` test (unchanged since baseline). If any new failures show up, investigate before continuing.

- [ ] **Step 8: Run just the newly-affected specs to confirm green**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e
npx playwright test book-consultation.spec.ts book-consultation-success-state.spec.ts contact-info.spec.ts navbar.spec.ts
```

Expected: all green except the same stale mobile-layout test.

- [ ] **Step 9: Commit**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git add e2e/book-consultation.spec.ts e2e/book-consultation-success-state.spec.ts e2e/contact-info.spec.ts e2e/navbar.spec.ts
git commit -m "test(e2e): move contact-form specs to /book-consultation and cover info page

Renames contact.spec.ts and contact-success-state.spec.ts to follow
the form to its new URL. Adds contact-info.spec.ts for the info-only
/contact page and a navbar test for the Book Consultation CTA
navigation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Manual browser smoke test

Per CLAUDE.md guidance ("For UI or frontend changes, start the dev server and use the feature in a browser before reporting the task as complete"), do a quick manual pass.

- [ ] **Step 1: Confirm dev servers are still running** (backend on `:8080`, frontend on `:4200`)

- [ ] **Step 2: Open `http://localhost:4200/` in a browser**

- [ ] **Step 3: Verify navbar wiring**

- Click `Contact` in the navbar → URL changes to `/contact`, info page renders (four detail items + map iframe, no form).
- Click `Book Consultation` in the navbar → URL changes to `/book-consultation`, form page renders (left intro panel with "Let's Talk." + reworded sub copy, right form with "Book a Consultation" heading).

- [ ] **Step 4: Verify mobile side nav wiring (viewport ≤ 899px)**

- Resize browser to ~360px wide. Click the hamburger `☰` button → side nav opens.
- Click `Contact` → lands on `/contact`. Reopen side nav.
- Click `Book Consultation` → lands on `/book-consultation`.

- [ ] **Step 5: Submit the form end-to-end**

- On `/book-consultation`, fill in name/email/subject/message. Submit. Confirm the inline confirmation block "Thanks — we'll reply soon." appears.
- Open browser devtools → Network tab → confirm `POST /api/contact` returned a successful response.

- [ ] **Step 6: Verify there is no regression on the home page**

- Navigate to `/` and confirm the page still renders correctly.

If anything fails this manual check, fix before claiming the work is done. If everything passes, no commit needed — this task is a verification step.

---

## Task 9: Final verification + summary

- [ ] **Step 1: Run the full frontend unit suite one more time**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/frontend && npx ng test --no-watch
```

Expected: all green.

- [ ] **Step 2: Run the full E2E suite one more time**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/e2e && npx playwright test
```

Expected: all green except the pre-existing stale `Book Consultation page › mobile layout` test.

- [ ] **Step 3: Backend regression check (sanity — no backend changes, but confirm)**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm/backend && ./mvnw test
```

Expected: all green.

- [ ] **Step 4: Check `git log` looks clean**

```bash
cd /Users/gwang/Develop/superpowers_test/accounting-firm
git log --oneline -10
```

Expected: separate, focused commits for each task (rename, strip, info-only component, route swap, navbar, sidenav, e2e). The form's history should be preserved on `book-consultation.component.{ts,html,css,spec.ts}` (verify with `git log --follow frontend/src/app/features/book-consultation/book-consultation.component.ts`).

- [ ] **Step 5: Done**

No final commit needed if everything in earlier tasks committed cleanly.

---

## Notes for the implementer

- **CSS duplication between the two components is intentional.** Both have an info-panel + decorative watermark. Extracting a shared component would be over-engineering for this change. If the duplication becomes a pain point later, that's a separate refactor.
- **The form code is unchanged** — the rename preserves `ContactService.send`, the honeypot field, and the inline confirmation behavior. If a form test fails after Task 1, that's a regression, not new behavior.
- **The stale `mobile layout` test** in the renamed `book-consultation.spec.ts` is intentionally left alone. It pre-dates this change and references `mat-card` selectors that don't exist in the template. Fixing it is out of scope.
- **No backend or model changes.** `POST /api/contact` continues to serve the form. If you find yourself touching Java code or a Flyway migration, stop — something has gone wrong.
