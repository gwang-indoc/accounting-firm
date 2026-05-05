import { test, expect } from '@playwright/test';

test('navbar is fixed to the top', async ({ page }) => {
  await page.goto('/');
  const position = await page.locator('.navbar').evaluate(el =>
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
  const bg = await page.locator('a.cta-btn').evaluate(el =>
    getComputedStyle(el).backgroundColor
  );
  expect(bg).toBe('rgb(255, 255, 255)');
});

test('navbar is visible with logo and nav links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('app-navbar')).toBeVisible();
  await expect(page.locator('.logo-icon')).toContainText('税');
  await expect(page.locator('app-navbar')).toContainText('GWH Accounting');
  await expect(page.locator('app-navbar')).toContainText('Services');
  await expect(page.locator('app-navbar')).toContainText('Security');
  await expect(page.locator('app-navbar')).toContainText('Contact');
  await expect(page.locator('app-navbar')).toContainText('Book Consultation');
});

test('language toggle switches active pill', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="lang-zh"]');
  await expect(page.locator('[data-testid="lang-zh"]')).toHaveClass(/active/);
  await page.click('[data-testid="lang-en"]');
  await expect(page.locator('[data-testid="lang-en"]')).toHaveClass(/active/);
});

test('Client Portal shows dropdown on click', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="client-login-btn"]');
  await expect(page.locator('.login-dropdown')).toBeVisible();
});

test('clicking outside closes Client Portal dropdown', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="client-login-btn"]');
  await expect(page.locator('.login-dropdown')).toBeVisible();
  await page.click('body', { position: { x: 10, y: 10 } });
  await expect(page.locator('.login-dropdown')).not.toBeVisible();
});

test('Book Consultation navigates to /contact', async ({ page }) => {
  await page.goto('/');
  await page.click('.nav-links a.cta-btn');
  await expect(page).toHaveURL(/\/contact/);
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

test('hamburger toggles mobile drawer', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.click('[data-testid="hamburger"]');
  await expect(page.locator('.mobile-drawer')).toBeVisible();
  await page.click('[data-testid="hamburger"]');
  await expect(page.locator('.mobile-drawer')).not.toBeVisible();
});
