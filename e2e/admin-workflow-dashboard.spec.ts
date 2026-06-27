import { test, expect, Page } from '@playwright/test';

async function fakeAdminAuth(page: Page) {
  await page.context().addCookies([{
    name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false,
  }]);
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' }),
  }));
}

const ENGAGEMENTS = [
  { id: 1, clientId: 10, clientName: 'Jane Smith', businessType: 'PERSONAL', taxYear: 2024, status: 'START', updatedAt: '2026-01-01T00:00:00', updatedByName: 'Admin' },
  { id: 2, clientId: 11, clientName: 'Bob Lee', businessType: 'CORPORATE', taxYear: 2023, status: 'IN_PROCESSING', updatedAt: '2026-01-02T00:00:00', updatedByName: 'Admin' },
  { id: 3, clientId: 12, clientName: 'Carol Wu', businessType: 'PERSONAL', taxYear: 2022, status: 'COMPLETED', updatedAt: '2026-01-03T00:00:00', updatedByName: 'Admin' },
];

test.describe('/admin/workflow', () => {

  test('admin sees engagement table with all 6 columns populated', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/admin/engagements', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(ENGAGEMENTS),
    }));

    await page.goto('/admin/workflow');

    await expect(page.getByTestId('engagement-row')).toHaveCount(3);
    const firstRow = page.getByTestId('engagement-row').first();
    await expect(firstRow).toContainText('Jane Smith');
    await expect(firstRow).toContainText('PERSONAL');
    await expect(firstRow).toContainText('2024');
    await expect(firstRow).toContainText('START');
    await expect(firstRow).toContainText('Admin');
  });

  test('status filter shows only matching rows', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/admin/engagements', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(ENGAGEMENTS),
    }));

    await page.goto('/admin/workflow');
    await expect(page.getByTestId('engagement-row')).toHaveCount(3);

    await page.getByRole('combobox', { name: 'Status' }).click();
    await page.getByRole('option', { name: 'START' }).click();

    await expect(page.getByTestId('engagement-row')).toHaveCount(1);
    await expect(page.getByTestId('engagement-row').first()).toContainText('Jane Smith');
  });

  test('business type filter shows only matching rows', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/admin/engagements', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(ENGAGEMENTS),
    }));

    await page.goto('/admin/workflow');
    await expect(page.getByTestId('engagement-row')).toHaveCount(3);

    await page.getByRole('combobox', { name: 'Business Type' }).click();
    await page.getByRole('option', { name: 'CORPORATE' }).click();

    await expect(page.getByTestId('engagement-row')).toHaveCount(1);
    await expect(page.getByTestId('engagement-row').first()).toContainText('Bob Lee');
  });

});
