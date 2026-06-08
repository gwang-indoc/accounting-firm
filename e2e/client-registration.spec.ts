import { test, expect } from '@playwright/test';

test.describe('Client Login Navigation', () => {
  test('desktop navbar Client Login navigates to /login', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="client-login-btn"]');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('mobile sidenav Client Login navigates to /login', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.click('[data-testid="hamburger"]');
    await page.click('a[routerLink="/login"]');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/login page shows Google button and email input (no register link)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/oauth2/authorization/google"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('a[routerLink="/register"]')).not.toBeAttached();
    await expect(page.locator('a[routerLink="/login/email"]')).not.toBeAttached();
  });
});
