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
