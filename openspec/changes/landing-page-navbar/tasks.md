## 1. NavbarComponent — structure, logo, language toggle

- [x] 1.1 RED — write Jasmine test for `NavbarComponent`: renders logo icon, company name, tagline; EN pill active by default; clicking 中文 sets `lang()` to `'zh'`; clicking EN sets it back to `'en'`
- [x] 1.2 GREEN — create `src/app/shared/navbar/navbar.component.ts`, `.html`, `.css` with logo section and language toggle signal; tests pass
- [x] 1.Z Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on
- [x] 1.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 1 with commit hash, feature bullet points, code review findings, and test count

## 2. Navigation links — scroll and routing [parallel]

- [x] 2.0 Invoke superpowers:subagent-driven-development to dispatch the [parallel] units in this group; one subagent owns one RED+GREEN pair end-to-end including self-review
- [x] 2.1 RED — write Jasmine test for `NavbarComponent`: Services and Security links have correct `href` anchors (`#services`, `#security`); Contact and Book Consultation links navigate to `/contact` [parallel]
- [x] 2.2 GREEN — add nav links to `NavbarComponent` template with `[routerLink]` for Contact/Book Consultation and `href` anchors for Services/Security; tests pass [parallel]
- [x] 2.3 RED — create `ContactComponent` spec: navigating to `/contact` renders "Contact Us" heading [parallel]
- [x] 2.4 GREEN — create `src/app/features/contact/contact.component.{ts,html,css}`; add lazy-loaded `/contact` route in `app.routes.ts`; tests pass [parallel]
- [x] 2.Z Run superpowers:requesting-code-review on the diff for group 2; address CRITICAL/HIGH findings before moving on
- [x] 2.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 2 with commit hash, feature bullet points, code review findings, and test count

## 3. Client Portal nav link — wire ClientPortalLoginComponent into NavbarComponent

- [x] 3.1 RED — write Jasmine test for `NavbarComponent`: "Client Portal" renders `<app-client-portal-login />`; clicking it opens the dropdown; clicking outside closes it
- [x] 3.2 GREEN — import `ClientPortalLoginComponent` into `NavbarComponent`; render as "Client Portal" nav item; tests pass
- [x] 3.Z Run superpowers:requesting-code-review on the diff for group 3; address CRITICAL/HIGH findings before moving on
- [x] 3.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 3 with commit hash, feature bullet points, code review findings, and test count

## 4. Responsive hamburger menu

- [x] 4.1 RED — write Jasmine test for `NavbarComponent`: on narrow viewport nav links are hidden and hamburger is visible; clicking hamburger sets `menuOpen()` to true; clicking again sets it to false
- [x] 4.2 GREEN — add `menuOpen = signal(false)` to `NavbarComponent`; add CSS media query hiding nav links below 768px and showing hamburger; drawer toggles on click; tests pass
- [x] 4.Z Run superpowers:requesting-code-review on the diff for group 4; address CRITICAL/HIGH findings before moving on
- [x] 4.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 4 with commit hash, feature bullet points, code review findings, and test count

## 5. Wire NavbarComponent into HomeComponent and add section anchors

- [x] 5.1 RED — update `HomeComponent` spec: renders `<app-navbar />`; landing page has `id="services"` and `id="security"` section anchors
- [x] 5.2 GREEN — replace inline `<nav>` in `home.component.html` with `<app-navbar />`; import `NavbarComponent`; remove old navbar CSS; add `id="services"` to services section, add `<section id="security">` placeholder; tests pass
- [x] 5.Z Run superpowers:requesting-code-review on the diff for group 5; address CRITICAL/HIGH findings before moving on
- [x] 5.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 5 with commit hash, feature bullet points, code review findings, and test count

## 6. E2E, verification, and styling polish

- [x] 6.1 Set up Playwright under `e2e/` if not already present (`cd e2e && npm init playwright@latest` or equivalent); configure `baseURL: http://localhost:4200`
- [x] 6.2 Write Playwright E2E test `e2e/navbar.spec.ts`:
  - Navigate to `http://localhost:4200` — assert navbar visible with logo, nav links, language toggle, Book Consultation button
  - Click "Services" — assert page scrolls to `#services`
  - Click "Client Portal" — assert dropdown appears with "Sign in with Google"
  - Click outside — assert dropdown closes
  - Click "中文" — assert lang toggle switches active pill
  - Click "Contact" — assert URL becomes `/contact`
  - Click "Book Consultation" — assert URL becomes `/contact`
  - Resize to 375px width — assert hamburger visible, nav links hidden
  - Click hamburger — assert drawer opens with nav links
- [x] 6.3 Run `cd frontend && npm run lint` — fix any lint errors (no lint script configured — skipped)
- [x] 6.4 Run superpowers:verification-before-completion (`cd backend && ./mvnw test`; `cd frontend && npx ng test --no-watch`; `cd e2e && npx playwright test`; grep for `System.out.println` + `console.log`; diff review)
- [x] 6.Z Run superpowers:requesting-code-review on the diff for group 6; address CRITICAL/HIGH findings before moving on
- [x] 6.Z+1 Update `docs/log/YYYY-MM-DD.md` — add entry for group 6 with commit hash, feature bullet points, code review findings, and test count
