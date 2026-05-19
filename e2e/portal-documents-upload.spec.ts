import { test, expect } from '@playwright/test';
import * as path from 'path';

async function fakeAuth(page) {
  await page.context().addCookies([{
    name: 'jwt',
    value: 'mock.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 7, email: 'jane@example.com', name: 'Jane Smith', role: 'USER' }),
  }));
}

const initial = {
  linked: true,
  clientName: 'Jane Smith',
  documents: [
    { id: 1, year: 2024, filename: 'Tax-Return-2024.pdf', mimeType: 'application/pdf', sizeBytes: 100, uploadedAt: '2025-02-12T10:00:00', uploadedByMe: false },
  ],
};

const fixturePath = path.resolve(__dirname, 'fixtures/upload-sample.pdf');

test.describe('/portal/documents — upload', () => {

  test('happy path: upload appears with "Uploaded by you" chip', async ({ page }) => {
    await fakeAuth(page);

    await page.route('**/api/me/documents', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(initial),
        });
      }
      // POST response — new item
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 99, year: 2024, filename: 'upload-sample.pdf',
          mimeType: 'application/pdf', sizeBytes: 50,
          uploadedAt: '2026-05-19T10:00:00', uploadedByMe: true,
        }),
      });
    });

    await page.goto('/portal/documents');
    await expect(page.locator('button.upload-btn')).toBeVisible();

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button.upload-btn').click(),
    ]);
    await fileChooser.setFiles(fixturePath);

    const newRow = page.locator('.doc-row', { hasText: 'upload-sample.pdf' });
    await expect(newRow).toBeVisible();
    await expect(newRow.locator('.badge-you')).toContainText('Uploaded by you');
  });

  test('duplicate filename: snackbar shows the error and no row is added', async ({ page }) => {
    await fakeAuth(page);

    await page.route('**/api/me/documents', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(initial),
        });
      }
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'A file named "upload-sample.pdf" already exists for 2024.',
          filename: 'upload-sample.pdf',
          year: 2024,
        }),
      });
    });

    await page.goto('/portal/documents');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('button.upload-btn').click(),
    ]);
    await fileChooser.setFiles(fixturePath);

    await expect(page.locator('mat-snack-bar-container, .mat-mdc-snack-bar-container'))
        .toContainText('already exists');

    await expect(page.locator('.doc-row')).toHaveCount(1);
  });

});
