# Update Navbar Layout — Tasks

Pure CSS bug fix: add 4 missing rules to `navbar.component.css` so the running app matches the approved visual companion mockup.

**File touched:** `frontend/src/app/shared/navbar/navbar.component.css` (only)

---

## 1. Fix Missing CSS Rules

- [x] 1.1 RED — extend `e2e/navbar.spec.ts` with a test asserting the navbar is fixed and the CTA button is styled. The test should:
  - Navigate to `http://localhost:4200`
  - Assert `position: fixed` on `.navbar` via `page.evaluate(() => getComputedStyle(document.querySelector('.navbar')).position)` → `'fixed'`
  - Assert `display: flex` on `.nav-links` via computed style
  - Assert the "Book Consultation" link has a white background (computed `background-color` ≠ `rgba(0, 0, 0, 0)` / transparent)

  Example test body:
  ```typescript
  test('navbar is fixed to the top', async ({ page }) => {
    await page.goto('/');
    const position = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.navbar')!).position
    );
    expect(position).toBe('fixed');
  });

  test('nav-links are displayed horizontally', async ({ page }) => {
    await page.goto('/');
    const display = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.nav-links')!).display
    );
    expect(display).toBe('flex');
  });

  test('Book Consultation renders as white button', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.querySelector('a.cta-btn')!).backgroundColor
    );
    expect(bg).toBe('rgb(255, 255, 255)');
  });
  ```

- [x] 1.2 Verify RED: Start frontend (`cd frontend && npm start`), then run
  `cd e2e && npx playwright test --grep "fixed|horizontally|white button"`
  Confirm all 3 new tests FAIL before the CSS is added.

- [x] 1.3 GREEN — add the 4 missing CSS rules to `frontend/src/app/shared/navbar/navbar.component.css`:

  **Rule 1 — Fixed positioning (add to existing `.navbar` block):**
  ```css
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100%;
  ```

  **Rule 2 — Nav links flex layout (new rule):**
  ```css
  .nav-links {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  ```

  **Rule 3 — Nav link styling (new rule):**
  ```css
  .nav-links a {
    color: #cbd5e1;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }
  ```

  **Rule 4 — CTA button styling (new rule):**
  ```css
  .cta-btn {
    background: #ffffff;
    color: #0f172a;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }
  ```

- [x] 1.4 Verify GREEN (unit tests): `cd frontend && npx ng test --no-watch`
  Expected: all 30 existing tests pass (CSS rules have no bearing on TestBed assertions).

- [x] 1.5 Commit: `git add frontend/src/app/shared/navbar/navbar.component.css e2e/navbar.spec.ts && git commit -m "fix: add 4 missing CSS rules to NavbarComponent"`

- [x] 1.6 Write/update full Playwright E2E test suite in `e2e/navbar.spec.ts` — confirm the new layout tests are included. Run the full E2E suite:
  1. `./start.sh`                        ← start backend
  2. `cd frontend && npm start`          ← start frontend
  3. `cd e2e && npx playwright test`     ← run full E2E suite
  Expected: all tests pass including the 3 new navbar layout tests.

- [x] 1.7 Run superpowers:verification-before-completion:
  - `cd backend && ./mvnw test`
  - `cd frontend && npx ng test --no-watch`
  - `grep -r "console\.log\|System\.out\.println" frontend/src backend/src --include="*.ts" --include="*.java"`
  - Review diff — confirm only `navbar.component.css` and `e2e/navbar.spec.ts` changed

- [x] 1.8 Run superpowers:requesting-code-review on the diff for group 1; address CRITICAL/HIGH findings before moving on

- [ ] 1.9 Update `docs/log/2026-05-05.md` — add entry for group 1 with commit hash, feature bullet points, code review findings, and test count
