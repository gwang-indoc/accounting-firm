import { test, expect } from '@playwright/test';

test.describe('Language Toggle', () => {
  test('should toggle between English and Chinese on home page', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:4200');

    // Verify default language is English (hero title should be in English)
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toContainText('Secure Tax & Accounting');

    // Click EN button to ensure we start in EN
    const enButton = page.locator('button[data-testid="lang-en"]');
    await enButton.click();
    await page.waitForTimeout(500);

    // Verify still in English
    await expect(heroTitle).toContainText('Secure Tax & Accounting');

    // Click ZH button to switch to Chinese
    const zhButton = page.locator('button[data-testid="lang-zh"]');
    await zhButton.click();
    await page.waitForTimeout(500);

    // Verify Chinese text appears (hero title should be in Chinese)
    await expect(heroTitle).toContainText('安全的税务');
  });

  test('should persist language preference after reload', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:4200');

    // Switch to Chinese
    const zhButton = page.locator('button[data-testid="lang-zh"]');
    await zhButton.click();
    await page.waitForTimeout(500);

    // Verify Chinese is active
    const heroTitle = page.locator('h1').first();
    await expect(heroTitle).toContainText('安全的税务');

    // Reload page
    await page.reload();
    await page.waitForTimeout(500);

    // Verify language is still Chinese (persisted via localStorage)
    await expect(heroTitle).toContainText('安全的税务');

    // Verify ZH button is marked as active
    await expect(zhButton).toHaveClass(/active/);
  });

  test('should toggle language on services page', async ({ page }) => {
    // Navigate to services page
    await page.goto('http://localhost:4200/services');
    await page.waitForTimeout(500);

    // Verify English text (Services title)
    const pageTitle = page.locator('h1').first();
    await expect(pageTitle).toContainText('Our Services');

    // Click ZH to switch to Chinese
    const zhButton = page.locator('button[data-testid="lang-zh"]');
    await zhButton.click();
    await page.waitForTimeout(500);

    // Verify Chinese text
    await expect(pageTitle).toContainText('我们的服务');
  });

  test('should toggle language on contact page', async ({ page }) => {
    // Navigate to contact page
    await page.goto('http://localhost:4200/contact');
    await page.waitForTimeout(500);

    // Verify English text
    const pageTitle = page.locator('h1').first();
    await expect(pageTitle).toContainText('Contact Us');

    // Click ZH to switch to Chinese
    const zhButton = page.locator('button[data-testid="lang-zh"]');
    await zhButton.click();
    await page.waitForTimeout(500);

    // Verify Chinese text
    await expect(pageTitle).toContainText('联系我们');
  });

  test('EN and ZH button states should match current language', async ({ page }) => {
    // Navigate to home page
    await page.goto('http://localhost:4200');
    await page.waitForTimeout(500);

    const enButton = page.locator('button[data-testid="lang-en"]');
    const zhButton = page.locator('button[data-testid="lang-zh"]');

    // Initially EN should be active
    await expect(enButton).toHaveClass(/active/);
    await expect(zhButton).not.toHaveClass(/active/);

    // Switch to ZH
    await zhButton.click();
    await page.waitForTimeout(500);

    // Now ZH should be active
    await expect(zhButton).toHaveClass(/active/);
    await expect(enButton).not.toHaveClass(/active/);

    // Switch back to EN
    await enButton.click();
    await page.waitForTimeout(500);

    // EN should be active again
    await expect(enButton).toHaveClass(/active/);
    await expect(zhButton).not.toHaveClass(/active/);
  });
});
