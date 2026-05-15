# Design — Split contact page: move "Send a Message" form to a new "Book Consultation" page

**Date:** 2026-05-15
**Status:** Approved (brainstorming) — ready for implementation planning

## Summary

The current `/contact` page combines a left info panel (address, phone, email, hours, map) with a right "Send a Message" form. The navbar/side nav "Book Consultation" CTA points to `/contact`. This change splits the page into two:

- `/contact` — info-only page (address, phone, email, hours, map)
- `/book-consultation` — the form, moved verbatim (no field changes, no backend changes)

The navbar's "Book Consultation" CTA is repointed at `/book-consultation`. A new "Contact" nav link is added pointing at `/contact` so the info page stays discoverable.

## Goals

- Give "Book Consultation" its own dedicated page so the CTA labels match the destination.
- Keep `/contact` as the place users look up office hours, address, phone, and email.
- Minimal change: no backend changes, no form field changes, no new model.

## Non-goals

- Repurposing the form into a true booking flow (date/time picker, service type, etc.).
- Backend changes — `ContactController`, `ContactService`, and `ContactSubmission` remain untouched.
- Redirecting `/contact` — the route stays, just with new content.

## File structure

```
frontend/src/app/features/
├── contact/                            # info-only page
│   ├── contact.component.ts            # new, lean
│   ├── contact.component.html          # left info panel + right map panel
│   ├── contact.component.css           # info-panel + map styles (subset of today's CSS)
│   └── contact.component.spec.ts       # new, minimal
└── book-consultation/                  # renamed from contact/
    ├── book-consultation.component.ts
    ├── book-consultation.component.html # left intro panel + right form
    ├── book-consultation.component.css  # form styles + intro panel styles
    └── book-consultation.component.spec.ts
```

**Mechanic:**

1. `git mv frontend/src/app/features/contact frontend/src/app/features/book-consultation`.
2. Rename the files (`contact.component.*` → `book-consultation.component.*`) and the class (`ContactComponent` → `BookConsultationComponent`), update selector (`app-contact` → `app-book-consultation`).
3. Strip the info-panel markup (`<aside class="info-panel">`) and map iframe out of `book-consultation.component.html`. The left column becomes the new intro panel.
4. Create a fresh `features/contact/` directory with a small new `ContactComponent` for the info-only page, reusing the info-panel HTML/CSS that was just removed from the booking page.

Both components remain standalone. The form code (validation, submit, confirmation, honeypot, error snackbar) is preserved verbatim via the rename.

## Routing

`frontend/src/app/app.routes.ts` adds one route. The `/contact` route stays.

```ts
{
  path: 'contact',
  loadComponent: () =>
    import('./features/contact/contact.component').then(m => m.ContactComponent),
},
{
  path: 'book-consultation',
  loadComponent: () =>
    import('./features/book-consultation/book-consultation.component')
      .then(m => m.BookConsultationComponent),
},
```

No guards (both public). No redirects.

## Navbar and side nav

**`shared/navbar/navbar.component.html`:**

- `Book Consultation` CTA: `routerLink="/contact"` → `routerLink="/book-consultation"`. Keep `mat-flat-button` styling.
- Add a new `Contact` nav link as a regular nav item (same styling as other nav links), positioned before the CTA button, pointing to `/contact`.

**`app.html` (side nav, line 8):**

- `Book Consultation` list item: `routerLink="/contact"` → `routerLink="/book-consultation"`.
- Add a new `Contact` list item pointing to `/contact`, positioned consistently with the desktop navbar.

## Page layouts

Both pages reuse the existing two-column `.contact-shell` pattern. Layouts are roughly 50/50, decorative left panel + content right panel.

### /contact (info-only)

```
┌─────────────────────────┬─────────────────────────┐
│  LEFT (info panel)      │  RIGHT (map panel)      │
│                         │                         │
│  Eyebrow: GWH Accounting│   ┌─────────────────┐  │
│  H1: Get in Touch.      │   │                 │  │
│  Sub: Office hours,     │   │   Google Maps   │  │
│  phone, and visit info  │   │     iframe      │  │
│  for our team.          │   │                 │  │
│                         │   └─────────────────┘  │
│  📍 Visit Us            │                         │
│  📞 Call Us             │                         │
│  ✉️ Email Us            │                         │
│  🕒 Office Hours        │                         │
└─────────────────────────┴─────────────────────────┘
```

The Google Maps iframe moves from beneath the detail items (where it sits today) into a dedicated right column. The decorative `税` watermark and circles stay on the left panel.

### /book-consultation

```
┌─────────────────────────┬─────────────────────────┐
│  LEFT (intro panel)     │  RIGHT (form panel)     │
│                         │                         │
│  Eyebrow: GWH Accounting│   Book a Consultation   │
│  H1: Let's Talk.        │   All fields are        │
│  Sub: Ready to take     │   required.             │
│  control of your        │                         │
│  finances? Tell us      │   [Name]      [Email]   │
│  about your needs and   │   [Subject            ] │
│  we'll reply within     │   [Message            ] │
│  one business day.      │   [                   ] │
│                         │                         │
│                         │   [ Send Message →    ] │
└─────────────────────────┴─────────────────────────┘
```

The left intro panel relies on the decorative watermark/circles for visual weight — no bullet list. The form on the right is unchanged: same fields, same validation, same submit behavior, same honeypot, same confirmation block.

## Copy

| Location | Text |
|---|---|
| `/contact` left eyebrow | GWH Accounting |
| `/contact` H1 | Get in Touch. |
| `/contact` sub | Office hours, phone, and visit info for our team. |
| `/book-consultation` left eyebrow | GWH Accounting |
| `/book-consultation` H1 | Let's Talk. |
| `/book-consultation` left sub | Ready to take control of your finances? Tell us about your needs and we'll reply within one business day. |
| `/book-consultation` form heading | Book a Consultation |
| `/book-consultation` form sub | All fields are required. |

Form field labels and the submit button text ("Send Message") are unchanged.

## Tests

### Unit (Vitest + Angular TestBed)

- **`book-consultation.component.spec.ts`** — carried over from current `contact.component.spec.ts` via the rename. The form behavior tests (validation, submit, confirmation, honeypot, snackbar on error) stay valid because the form code is unchanged. Update class name and selector references.
- **`contact.component.spec.ts`** — new, minimal. Asserts: renders the four detail items (Visit Us, Call Us, Email Us, Office Hours), renders the map iframe, no form present.
- **`navbar.component.spec.ts`** — update the two existing `Book Consultation → /contact` assertions to `/book-consultation`. Add two new assertions: a `Contact` link exists and points to `/contact`.

### E2E (Playwright)

Per CLAUDE.md / schema `tasks.instruction`, add `e2e/book-consultation.spec.ts` covering:

1. From `/`, click the navbar `Book Consultation` CTA → lands on `/book-consultation`.
2. Fill the form (name, email, subject, message) and submit → confirmation block appears.
3. Click the navbar `Contact` link → lands on `/contact` → office hours visible, no form present.

## Backend

No changes. `POST /api/contact` continues to handle form submissions. `ContactService`, `ContactController`, and the `ContactSubmission` model remain as-is.

## Out of scope (deferred)

- Consultation-specific form fields (date/time, service type).
- Renaming the underlying backend model from `ContactSubmission` to something booking-flavored — kept as-is because the form payload doesn't change.
- Removing or rewording the `/contact` route to make it clearer that the contact form has moved (no redirect needed — both routes work, navbar exposes both).
