import { test, expect } from '@playwright/test';

const sampleClients = [
  { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 10, adminId: 1 },
  { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null, adminId: 1 },
];

async function fakeAdminAuth(page) {
  await page.context().addCookies([{
    name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false,
  }]);
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' }),
  }));
}

async function setupClientRoutes(page) {
  await page.route('**/api/clients', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(sampleClients),
  }));
  await page.route(/\/api\/clients\/unread-counts/, route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([]),
  }));
}

test.describe('admin client export', () => {

  test('selecting a client shows export toolbar', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    // Export toolbar should be hidden initially
    await expect(page.getByTestId('export-toolbar')).not.toBeVisible();

    // Export button in header: disabled before selection
    await expect(page.getByTestId('export-btn')).toBeDisabled();

    // Click first client checkbox
    const firstCheckbox = page.getByTestId('client-select-cb').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();

    // Export toolbar should appear with count; export button now enabled
    await expect(page.getByTestId('export-toolbar')).toBeVisible();
    await expect(page.getByTestId('export-toolbar')).toContainText('1');
    await expect(page.getByTestId('export-btn')).toBeEnabled();
  });

  test('select all fetches IDs and selects all clients', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.route(/\/api\/clients\/ids/, route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([1, 2]),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await page.getByTestId('select-all-btn').click();

    await expect(page.getByTestId('export-toolbar')).toBeVisible();
    await expect(page.getByTestId('export-toolbar')).toContainText('2');
  });

  test('filter change clears selection', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    const firstCheckbox = page.getByTestId('client-select-cb').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await expect(page.getByTestId('export-toolbar')).toBeVisible();

    await page.getByTestId('filter-name').fill('Jane');
    await page.getByTestId('filter-name').dispatchEvent('input');

    await expect(page.getByTestId('export-toolbar')).not.toBeVisible();
  });

  test('export dialog opens with both checkboxes checked and year selector visible', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.goto('/admin/clients');

    const firstCheckbox = page.getByTestId('client-select-cb').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.getByTestId('export-btn').click();

    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await expect(page.getByTestId('include-metadata-cb').locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.getByTestId('include-documents-cb').locator('input[type="checkbox"]')).toBeChecked();
    await expect(page.getByTestId('year-select')).toBeVisible();
  });

  test('metadata-only export triggers CSV download', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.route('/api/clients/export', route => {
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="clients-export-2026-06-17.csv"',
        },
        body: 'Name,Email\nJane Smith,jane@gmail.com\n',
      });
    });
    await page.goto('/admin/clients');

    const firstCheckbox = page.getByTestId('client-select-cb').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.getByTestId('export-btn').click();

    // Uncheck documents so it's metadata-only
    await page.getByTestId('include-documents-cb').locator('input[type="checkbox"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('dialog-export-btn').click(),
    ]);

    expect(download.suggestedFilename()).toBe('clients-export-2026-06-17.csv');
  });

  test('export dialog Cancel closes without downloading', async ({ page }) => {
    await fakeAdminAuth(page);
    await setupClientRoutes(page);
    await page.goto('/admin/clients');

    const firstCheckbox = page.getByTestId('client-select-cb').first().locator('input[type="checkbox"]');
    await firstCheckbox.click();
    await page.getByTestId('export-btn').click();
    await expect(page.locator('mat-dialog-container')).toBeVisible();

    await page.getByTestId('cancel-btn').click();
    await expect(page.locator('mat-dialog-container')).not.toBeVisible();
    // Toolbar still visible — selection not cleared by cancel
    await expect(page.getByTestId('export-toolbar')).toBeVisible();
  });
});
