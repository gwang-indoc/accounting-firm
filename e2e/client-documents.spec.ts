import { test, expect } from '@playwright/test';

async function fakeAuth(page) {
  await page.context().addCookies([{
    name: 'jwt',
    value: 'mock.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  // Also mock /api/auth/me so APP_INITIALIZER doesn't blank the user out.
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 7, email: 'jane@example.com', name: 'Jane Smith', role: 'USER' }),
  }));
}

test.describe('/portal/documents', () => {

  test('linked client with docs in two years: dropdown lists both, list updates on change', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        linked: true,
        clientName: 'Jane Smith',
        documents: [
          { id: 1, year: 2025, filename: 'T4-2025.pdf',         mimeType: 'application/pdf', sizeBytes: 50000,  uploadedAt: '2026-02-14T10:23:00' },
          { id: 2, year: 2025, filename: 'Tax-Return-2025.pdf', mimeType: 'application/pdf', sizeBytes: 200000, uploadedAt: '2026-03-02T09:00:00' },
          { id: 3, year: 2024, filename: 'T4-2024.pdf',         mimeType: 'application/pdf', sizeBytes: 48000,  uploadedAt: '2025-02-12T10:00:00' },
        ],
      }),
    }));

    await page.goto('/portal/documents');

    await expect(page.locator('.year-select')).toHaveValue('2025');
    await expect(page.locator('.doc-row')).toHaveCount(2);
    await expect(page.locator('.doc-row').first()).toContainText('T4-2025.pdf');

    await page.locator('.year-select').selectOption('2024');
    await expect(page.locator('.doc-row')).toHaveCount(1);
    await expect(page.locator('.doc-row').first()).toContainText('T4-2024.pdf');
  });

  test('click "Download All" fires a navigation to the zip endpoint', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        linked: true,
        clientName: 'Jane Smith',
        documents: [
          { id: 1, year: 2025, filename: 'T4-2025.pdf', mimeType: 'application/pdf', sizeBytes: 50000, uploadedAt: '2026-02-14T10:23:00' },
        ],
      }),
    }));
    let zipUrlSeen = '';
    await page.route('**/api/me/documents/zip*', route => {
      zipUrlSeen = route.request().url();
      route.fulfill({ status: 200, contentType: 'application/zip', body: 'PK\x03\x04' });
    });

    await page.goto('/portal/documents');
    await page.locator('button.download-all-btn').click();

    await page.waitForTimeout(200);
    expect(zipUrlSeen).toContain('/api/me/documents/zip?year=2025');
  });

  test('unlinked user sees the not-set-up empty state', async ({ page }) => {
    await fakeAuth(page);
    await page.route('**/api/me/documents', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ linked: false, clientName: null, documents: [] }),
    }));

    await page.goto('/portal/documents');

    await expect(page.locator('.documents-page')).toContainText("Your portal isn't set up yet");
    await expect(page.locator('.year-select')).toHaveCount(0);
    await expect(page.locator('button.download-all-btn')).toHaveCount(0);
  });
});
