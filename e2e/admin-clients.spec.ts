import { test, expect } from '@playwright/test';

async function fakeAdminAuth(page) {
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

test.describe('/admin/clients', () => {

  test('admin sees client list', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: '555-1234', createdAt: '2026-01-01T00:00:00', linkedUserId: 10 },
        { id: 2, name: 'Bob Lee',    email: 'bob@work.com',   phone: null,        createdAt: '2026-01-02T00:00:00', linkedUserId: null },
      ]),
    }));

    await page.goto('/admin/clients');

    await expect(page.getByTestId('client-row')).toHaveCount(2);
    await expect(page.getByTestId('client-row').first()).toContainText('Jane Smith');
    await expect(page.getByTestId('client-row').first()).toContainText('Linked');
    await expect(page.getByTestId('client-row').nth(1)).toContainText('Not linked');
  });

  test('non-admin is redirected to /', async ({ page }) => {
    await page.context().addCookies([{
      name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false,
    }]);
    await page.route('**/api/auth/me', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 2, email: 'user@x.com', name: 'User', role: 'USER' }),
    }));

    await page.goto('/admin/clients');
    await expect(page).toHaveURL('/');
  });

  test('admin creates a new client', async ({ page }) => {
    await fakeAdminAuth(page);

    const clients = [
      { id: 1, name: 'Jane Smith', email: 'jane@gmail.com', phone: null, createdAt: '2026-01-01T00:00:00', linkedUserId: null },
    ];

    await page.route('**/api/clients', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(clients) });
      } else if (route.request().method() === 'POST') {
        const newClient = { id: 99, name: 'Carol Wu', email: 'carol@example.com', phone: '555-9999', createdAt: '2026-05-20T00:00:00', linkedUserId: null };
        clients.push(newClient);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newClient) });
      }
    });

    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(1);

    await page.getByTestId('add-client-btn').click();
    await page.getByLabel('Full Name').fill('Carol Wu');
    await page.getByLabel('Email').fill('carol@example.com');
    await page.getByLabel('Phone (optional)').fill('555-9999');
    await page.getByRole('button', { name: 'Add Client' }).click();

    await expect(page.getByTestId('client-row')).toHaveCount(2);
    await expect(page.getByTestId('client-row').nth(1)).toContainText('Carol Wu');
  });

});
