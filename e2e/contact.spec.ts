import { test, expect } from '@playwright/test';

test.describe('Contact page', () => {
  test('happy path: submits form, shows success snackbar, and POST reaches backend', async ({ page }) => {
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('/api/contact') && req.method() === 'POST'),
      (async () => {
        await page.goto('/contact');
        await page.fill('input[formControlName="name"]', 'Jane Doe');
        await page.fill('input[formControlName="email"]', 'jane@example.com');
        await page.fill('input[formControlName="subject"]', 'Test inquiry');
        await page.fill('textarea[formControlName="message"]', 'Hello, this is a test message.');
        await page.click('button[type="submit"]:has-text("Send Message")');
      })(),
    ]);

    const body = JSON.parse(request.postData() ?? '{}');
    expect(body.name).toBe('Jane Doe');
    expect(body.email).toBe('jane@example.com');
    expect(body.subject).toBe('Test inquiry');
    expect(body.message).toBe('Hello, this is a test message.');
    expect(body.companyUrl ?? '').toBe('');

    const response = await request.response();
    expect(response?.status()).toBe(202);

    await expect(page.locator('mat-snack-bar-container')).toContainText("Thanks");
  });

  test('negative path: invalid email shows inline error and fires no POST', async ({ page }) => {
    await page.goto('/contact');

    let postFired = false;
    page.on('request', req => {
      if (req.url().includes('/api/contact') && req.method() === 'POST') {
        postFired = true;
      }
    });

    await page.fill('input[formControlName="name"]', 'Jane Doe');
    await page.fill('input[formControlName="email"]', 'not-an-email');
    await page.fill('input[formControlName="subject"]', 'Test');
    await page.fill('textarea[formControlName="message"]', 'Test message');

    // Trigger validation by blurring the email field
    await page.locator('input[formControlName="email"]').blur();

    await expect(page.locator('mat-error')).toBeVisible();

    // The Send button must be disabled (form invalid)
    const button = page.locator('button[type="submit"]:has-text("Send Message")');
    await expect(button).toBeDisabled();

    expect(postFired).toBe(false);
  });

  test('mobile layout: form and Find Us card stack vertically at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/contact');

    const formCard = page.locator('mat-card').first();
    const findUsCard = page.locator('mat-card').nth(1);

    await expect(formCard).toBeVisible();
    await expect(findUsCard).toBeVisible();

    // Find Us card should appear below form card
    const formBottom = (await formCard.boundingBox())!.y + (await formCard.boundingBox())!.height;
    const findUsTop = (await findUsCard.boundingBox())!.y;
    expect(findUsTop).toBeGreaterThanOrEqual(formBottom - 4); // allow small rounding
  });
});
