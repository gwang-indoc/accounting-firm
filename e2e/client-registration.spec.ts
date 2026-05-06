import { test, expect } from '@playwright/test';

test.describe('Client Registration & Login', () => {
  test('desktop navbar Client Login navigates to /login', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="client-login-btn"]');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('mobile sidenav Client Login navigates to /login', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.click('[data-testid="hamburger-btn"]');
    await page.click('a[routerLink="/login"]');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('/login page shows Google button, Register button, and Email link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/oauth2/authorization/google"]')).toBeVisible();
    await expect(page.locator('a[routerLink="/register"]')).toBeVisible();
    await expect(page.locator('a[routerLink="/login/email"]')).toBeVisible();
  });

  test('register flow: fill form, submit, land on /login with snackbar', async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await page.goto('/register');
    await page.fill('input[formControlName="fullName"]', 'Test User');
    await page.fill('input[formControlName="email"]', email);
    await page.fill('input[formControlName="password"]', 'Password123');
    await page.fill('input[formControlName="confirmPassword"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login\?registered=true/);
    await expect(page.locator('simple-snack-bar')).toBeVisible();
  });

  test('duplicate email shows emailTaken mat-error', async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    // Register first time
    await page.goto('/register');
    await page.fill('input[formControlName="fullName"]', 'First User');
    await page.fill('input[formControlName="email"]', email);
    await page.fill('input[formControlName="password"]', 'Password123');
    await page.fill('input[formControlName="confirmPassword"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);

    // Try to register the same email again
    await page.goto('/register');
    await page.fill('input[formControlName="fullName"]', 'Second User');
    await page.fill('input[formControlName="email"]', email);
    await page.fill('input[formControlName="password"]', 'Password123');
    await page.fill('input[formControlName="confirmPassword"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('mat-error')).toContainText('Email already registered');
  });

  test('email login flow: valid credentials navigates to /portal', async ({ page }) => {
    const email = `login-${Date.now()}@example.com`;
    // Register the user first
    await page.goto('/register');
    await page.fill('input[formControlName="fullName"]', 'Login User');
    await page.fill('input[formControlName="email"]', email);
    await page.fill('input[formControlName="password"]', 'Password123');
    await page.fill('input[formControlName="confirmPassword"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);

    // Now sign in with email
    await page.goto('/login/email');
    await page.fill('input[formControlName="email"]', email);
    await page.fill('input[formControlName="password"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/portal/);
  });
});
