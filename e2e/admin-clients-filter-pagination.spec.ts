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

test.describe('/admin/clients filter and pagination', () => {

  test('filters by name show only matching rows', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Jane Smith', email: 'jane@x.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
        { id: 2, name: 'Bob Lee',    email: 'bob@y.com',  phone: null, createdAt: '2026-01-02T00:00:00', linkedUserId: null },
      ]),
    }));
    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(2);

    await page.getByTestId('filter-name').fill('jane');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    await expect(page.getByTestId('client-row').first()).toContainText('Jane Smith');
  });

  test('filters by email show only matching rows', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
        { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null, createdAt: '2026-01-02T00:00:00', linkedUserId: null },
      ]),
    }));
    await page.goto('/admin/clients');

    await page.getByTestId('filter-email').fill('work');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    await expect(page.getByTestId('client-row').first()).toContainText('Bob Lee');
  });

  test('pagination appears when there are more than 20 clients and navigates pages', async ({ page }) => {
    await fakeAdminAuth(page);
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: `Client ${String(i + 1).padStart(3, '0')}`,
      email: `c${i + 1}@example.com`,
      phone: null,
      createdAt: '2026-01-01T00:00:00',
      linkedUserId: null,
    }));
    await page.route('**/api/clients', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(many),
    }));
    await page.goto('/admin/clients');

    await expect(page.getByTestId('client-row')).toHaveCount(20);
    await expect(page.getByTestId('page-indicator')).toContainText('Page 1 of 2');
    await expect(page.getByTestId('prev-page-btn')).toBeDisabled();

    await page.getByTestId('next-page-btn').click();
    await expect(page.getByTestId('client-row')).toHaveCount(5);
    await expect(page.getByTestId('next-page-btn')).toBeDisabled();
  });

  test('Documents button navigates to admin documents page', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 7, name: 'Test Client', email: 'test@example.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
      ]),
    }));
    await page.route('**/api/clients/7/documents**', route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([]),
    }));

    await page.goto('/admin/clients');
    await page.getByTestId('client-documents-btn').click();
    await expect(page).toHaveURL('/admin/clients/7/documents');
  });

});
