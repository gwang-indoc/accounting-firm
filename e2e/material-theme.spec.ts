import { test, expect } from '@playwright/test';

test.describe('Material theme', () => {
  test('body background is #f1f5f9 (light Material surface)', async ({ page }) => {
    await page.goto('/');
    const bg = await page.evaluate(() =>
      getComputedStyle(document.body).backgroundColor
    );
    expect(bg).toBe('rgb(241, 245, 249)');
  });

  test.skip('mat-toolbar has dark navy background', async ({ page }) => {
    // mat-toolbar not yet in templates — re-enable after Group 2 (NavbarComponent refactor)
    await page.goto('/');
    const bg = await page.locator('mat-toolbar').first().evaluate(el =>
      getComputedStyle(el).backgroundColor
    );
    expect(bg).toBe('rgb(15, 23, 42)');
  });
});
