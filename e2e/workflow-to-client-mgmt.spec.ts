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
}

const mockClients = [
  { id: 1, name: 'Jane Smith', email: 'jane@x.com', phone: null, createdAt: '2026-01-01T00:00:00',
    linkedUserId: null, adminId: 1, businessType: 'PERSONAL', fiscalYearEndMonth: 12, fiscalYearEndDay: 31,
    activeEngagementStatus: 'IN_PROCESSING' },
  { id: 2, name: 'Bob Lee', email: 'bob@y.com', phone: null, createdAt: '2026-01-02T00:00:00',
    linkedUserId: null, adminId: 1, businessType: 'CORPORATE', fiscalYearEndMonth: 3, fiscalYearEndDay: 31,
    activeEngagementStatus: null },
];

test.describe('workflow-to-client-mgmt', () => {

  test('Workflow nav link is absent from navbar for admin', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(mockClients),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await expect(page.getByTestId('admin-workflow-nav-link')).toHaveCount(0);
  });

  test('Workflow State column renders status and dash correctly', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(mockClients),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    const stateCells = page.getByTestId('client-workflow-state');
    await expect(stateCells).toHaveCount(2);
    await expect(stateCells.first()).toContainText('IN_PROCESSING');
    await expect(stateCells.nth(1)).toContainText('—');
  });

  test('clicking Workflow action button navigates to per-client workflow page', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(mockClients),
    }));
    await page.route(/\/api\/admin\/clients\/1\/engagements/, route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([]),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await page.getByTestId('client-workflow-btn').first().click();
    await expect(page).toHaveURL(/\/admin\/clients\/1\/workflow/);
  });

  test('Workflow State filter by status shows only matching clients', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(mockClients),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await page.getByTestId('filter-workflow-state').selectOption('IN_PROCESSING');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    await expect(page.getByTestId('client-row').first()).toContainText('Jane Smith');
  });

  test('Workflow State filter by — None — shows only null-status clients', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(mockClients),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await page.getByTestId('filter-workflow-state').selectOption('__none__');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    await expect(page.getByTestId('client-row').first()).toContainText('Bob Lee');
  });

});
