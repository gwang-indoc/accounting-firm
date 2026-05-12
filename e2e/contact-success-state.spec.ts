import { test, expect } from '@playwright/test';

test.describe('Contact form — post-submit success state', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/contact', route =>
      route.fulfill({ status: 202, body: '' })
    );
  });

  test('shows inline confirmation after successful send', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('input[formControlName="name"]', 'Jane Doe');
    await page.fill('input[formControlName="email"]', 'jane@example.com');
    await page.fill('input[formControlName="subject"]', 'Test inquiry');
    await page.fill('textarea[formControlName="message"]', 'Hello, this is a test message.');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('[role="status"]')).toContainText("Thanks — we'll reply soon");
  });

  test('no mat-error visible after successful send', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('input[formControlName="name"]', 'Jane Doe');
    await page.fill('input[formControlName="email"]', 'jane@example.com');
    await page.fill('input[formControlName="subject"]', 'Test inquiry');
    await page.fill('textarea[formControlName="message"]', 'Hello, this is a test message.');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('.mat-mdc-form-field-error')).toHaveCount(0);
  });

  test('form fields are cleared after successful send', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('input[formControlName="name"]', 'Jane Doe');
    await page.fill('input[formControlName="email"]', 'jane@example.com');
    await page.fill('input[formControlName="subject"]', 'Test inquiry');
    await page.fill('textarea[formControlName="message"]', 'Hello, this is a test message.');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toBeVisible();
    await expect(page.locator('input[formControlName="name"]')).toHaveValue('');
    await expect(page.locator('input[formControlName="email"]')).toHaveValue('');
    await expect(page.locator('input[formControlName="subject"]')).toHaveValue('');
    await expect(page.locator('textarea[formControlName="message"]')).toHaveValue('');
  });

  test('confirmation hides when user types in a field', async ({ page }) => {
    await page.goto('/contact');
    await page.fill('input[formControlName="name"]', 'Jane Doe');
    await page.fill('input[formControlName="email"]', 'jane@example.com');
    await page.fill('input[formControlName="subject"]', 'Test inquiry');
    await page.fill('textarea[formControlName="message"]', 'Hello, this is a test message.');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="status"]')).toBeVisible();
    await page.fill('input[formControlName="name"]', 'A');
    await expect(page.locator('[role="status"]')).not.toBeAttached();
  });
});
