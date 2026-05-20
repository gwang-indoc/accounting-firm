import { test, expect, Page } from '@playwright/test';

async function fakeAdminAuth(page: Page) {
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
    body: JSON.stringify({ id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' }),
  }));
  await page.route('**/api/clients', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 7, name: 'Test Client', email: 'test@example.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
    ]),
  }));
}

test.describe('/admin/clients/:id/documents', () => {

  test('admin sees documents for the client and current year', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/documents**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 10, filename: 'w2.pdf',   mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: '2026-02-01T00:00:00' },
        { id: 11, filename: '1099.pdf', mimeType: 'application/pdf', sizeBytes: 1024, uploadedAt: '2026-02-02T00:00:00' },
      ]),
    }));

    await page.goto('/admin/clients/7/documents');
    await expect(page.getByRole('heading')).toContainText('Test Client');
    await expect(page.getByTestId('admin-doc-row')).toHaveCount(2);
  });

  test('admin sees empty state when no documents exist for the year', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/documents**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([]),
    }));

    await page.goto('/admin/clients/7/documents');
    await expect(page.getByText(/No documents for/)).toBeVisible();
  });

  test('admin can delete a document', async ({ page }) => {
    await fakeAdminAuth(page);
    let docs = [
      { id: 10, filename: 'w2.pdf', mimeType: 'application/pdf', sizeBytes: 2048, uploadedAt: '2026-02-01T00:00:00' },
    ];
    await page.route('**/api/clients/7/documents**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      if (method === 'DELETE' && url.includes('/documents/10')) {
        docs = [];
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(docs) });
      }
    });

    await page.goto('/admin/clients/7/documents');
    await expect(page.getByTestId('admin-doc-row')).toHaveCount(1);

    await page.getByTestId('admin-delete-doc-btn').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByTestId('admin-doc-row')).toHaveCount(0);
    await expect(page.getByText(/No documents for/)).toBeVisible();
  });

  test('back link returns to clients list', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/documents**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([]),
    }));

    await page.goto('/admin/clients/7/documents');
    await page.getByTestId('back-to-clients-link').click();
    await expect(page).toHaveURL('/admin/clients');
  });

});
