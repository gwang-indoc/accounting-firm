import { test, expect } from '@playwright/test';

test.describe('Material refactor — desktop', () => {
  test('mat-toolbar renders with dark navy background', async ({ page }) => {
    await page.goto('/');
    const bg = await page.locator('mat-toolbar').first().evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    expect(bg).toBe('rgb(15, 23, 42)');
  });

  test('toolbar contains brand name and nav links', async ({ page }) => {
    await page.goto('/');
    const toolbar = page.locator('mat-toolbar').first();
    await expect(toolbar).toContainText('GWH Accounting');
    await expect(toolbar).toContainText('Services');
    await expect(toolbar).toContainText('Security');
    await expect(toolbar).toContainText('Contact');
    await expect(toolbar).toContainText('Book Consultation');
  });

  test('Client Login MatMenu opens on click', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="client-login-btn"]');
    await expect(page.locator('[data-testid="google-signin-link"]')).toBeVisible();
    await expect(page.locator('[data-testid="google-signin-link"]')).toContainText('Sign in with Google');
  });

  test('Client Login MatMenu closes on Escape', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="client-login-btn"]');
    await expect(page.locator('[data-testid="google-signin-link"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="google-signin-link"]')).not.toBeVisible();
  });

  test('Book Consultation navigates to /contact', async ({ page }) => {
    await page.goto('/');
    await page.click('.nav-links a.cta-btn');
    await expect(page).toHaveURL(/\/contact/);
  });
});

test.describe('Material refactor — mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('hamburger is visible and nav-links are hidden', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="hamburger"]')).toBeVisible();
    const navLinksDisplay = await page.locator('.nav-links').evaluate(el =>
      getComputedStyle(el).display
    );
    expect(navLinksDisplay).toBe('none');
  });

  test('hamburger opens MatSidenav with scrim', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="hamburger"]');
    await expect(page.locator('.mat-drawer-backdrop')).toHaveClass(/mat-drawer-shown/);
    await expect(page.locator('mat-sidenav')).toContainText('Services');
    await expect(page.locator('mat-sidenav')).toContainText('Security');
    await expect(page.locator('mat-sidenav')).toContainText('Client Login');
    await expect(page.locator('mat-sidenav')).toContainText('Book Consultation');
  });

  test('Client Login inline expansion toggles inside sidenav', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="hamburger"]');
    await expect(page.locator('.mat-drawer-backdrop')).toHaveClass(/mat-drawer-shown/);
    // Expand Client Login
    await page.locator('mat-sidenav mat-list-item:has-text("Client Login")').click();
    await expect(page.locator('mat-sidenav .sidenav-google-signin-btn')).toBeVisible();
    // Collapse
    await page.locator('mat-sidenav mat-list-item:has-text("Client Login")').click();
    await expect(page.locator('mat-sidenav .sidenav-google-signin-btn')).not.toBeVisible();
  });

  test('tapping scrim closes MatSidenav', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="hamburger"]');
    await expect(page.locator('.mat-drawer-backdrop')).toHaveClass(/mat-drawer-shown/);
    // Click at x=330 to land in the backdrop area right of the 280px-wide sidenav
    await page.locator('.mat-drawer-backdrop').click({ position: { x: 330, y: 200 } });
    await expect(page.locator('.mat-drawer-backdrop')).not.toHaveClass(/mat-drawer-shown/);
  });

  test('Book Consultation in sidenav navigates to /contact', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="hamburger"]');
    await expect(page.locator('.mat-drawer-backdrop')).toHaveClass(/mat-drawer-shown/);
    await page.locator('mat-sidenav a.sidenav-cta').click();
    await expect(page).toHaveURL(/\/contact/);
  });
});
