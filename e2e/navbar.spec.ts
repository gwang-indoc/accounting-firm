import { test, expect } from '@playwright/test';

test('navbar is fixed to the top', async ({ page }) => {
  await page.goto('/');
  const position = await page.locator('.navbar-toolbar').evaluate(el =>
    getComputedStyle(el).position
  );
  expect(position).toBe('fixed');
});

test('nav-links are displayed horizontally', async ({ page }) => {
  await page.goto('/');
  const display = await page.locator('.nav-links').evaluate(el =>
    getComputedStyle(el).display
  );
  expect(display).toBe('flex');
});

test('Book Consultation renders as white button', async ({ page }) => {
  await page.goto('/');
  const styles = await page.locator('a.cta-btn').evaluate(el => {
    const cs = getComputedStyle(el);
    return { backgroundColor: cs.backgroundColor, color: cs.color };
  });
  expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
  expect(styles.color).toBe('rgb(15, 23, 42)');
});

test('navbar is visible with logo and nav links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('mat-toolbar').first()).toBeVisible();
  await expect(page.locator('.logo-icon')).toContainText('税');
  await expect(page.locator('mat-toolbar').first()).toContainText('GWH Accounting');
  await expect(page.locator('mat-toolbar').first()).toContainText('Services');
  await expect(page.locator('mat-toolbar').first()).toContainText('Security');
  await expect(page.locator('mat-toolbar').first()).toContainText('Contact');
  await expect(page.locator('mat-toolbar').first()).toContainText('Book Consultation');
});

test('language toggle switches active pill', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="lang-zh"]');
  await expect(page.locator('[data-testid="lang-zh"]')).toHaveClass(/active/);
  await page.click('[data-testid="lang-en"]');
  await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);
});

test('Contact link navigates to /contact', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-links a:has-text("Contact"):not(.cta-btn)');
  await expect(page).toHaveURL(/\/contact/);
});

test('hamburger shows on mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('[data-testid="hamburger"]')).toBeVisible();
});
