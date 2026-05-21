import { test, expect, Page } from '@playwright/test';

const ADMIN_USER  = { id: 1, email: 'admin@firm.com', name: 'Admin', role: 'ADMIN' };
const CLIENT_USER = { id: 42, email: 'client@example.com', name: 'Test Client', role: 'USER' };

const SAMPLE_THREADS = [
  {
    id: 50, clientId: 7, subject: 'Tax filing', lastMessageAt: '2026-05-19T12:00:00',
    unreadCount: 0, clientUnreadCount: 2, lastSenderType: 'ADMIN', lastMessagePreview: 'Please review',
  },
  {
    id: 51, clientId: 7, subject: 'Q1 invoicing', lastMessageAt: '2026-05-15T09:00:00',
    unreadCount: 1, clientUnreadCount: 0, lastSenderType: 'CLIENT', lastMessagePreview: 'Got it',
  },
  {
    id: 52, clientId: 7, subject: 'Done', lastMessageAt: '2026-05-14T08:00:00',
    unreadCount: 0, clientUnreadCount: 0, lastSenderType: 'ADMIN', lastMessagePreview: 'Thanks',
  },
];

async function fakeAdminAuth(page: Page) {
  await page.context().addCookies([{ name: 'jwt', value: 'mock.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false }]);
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ADMIN_USER) }));
}

async function fakeClientAuth(page: Page) {
  await page.context().addCookies([{ name: 'jwt', value: 'mock.client.jwt.token', domain: 'localhost', path: '/', httpOnly: true, secure: false }]);
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(CLIENT_USER) }));
  await page.route('**/api/portal/threads', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SAMPLE_THREADS) }));
  await page.route('**/api/portal/messages/unread-count', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unreadCount: 1 }) }));
  await page.route('**/api/me/documents', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ linked: true, clientName: 'Test Client', documents: [] }) }));
}

test.describe('Admin thread chip states', () => {
  test('admin thread list shows chip-awaiting for admin-sent threads the client has not opened', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[0]]),
    }));
    await page.route('**/api/clients/unread-counts', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-awaiting')).toBeVisible();
    await expect(page.getByTestId('thread-chip-awaiting')).toHaveText('Awaiting client');
  });

  test('admin thread list shows chip-unread when client replied', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[1]]),
    }));
    await page.route('**/api/clients/unread-counts', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-unread')).toBeVisible();
  });

  test('admin thread list shows chip-read when client has read the last admin message', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify([SAMPLE_THREADS[2]]),
    }));
    await page.route('**/api/clients/unread-counts', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }));
    await page.goto('http://localhost:4200/admin/clients/7/messages');
    await expect(page.getByTestId('thread-chip-read')).toBeVisible();
    await expect(page.getByTestId('thread-chip-read')).toHaveText('Client read');
  });
});

test.describe('Portal dashboard Messages card', () => {
  test('shows live threads on dashboard', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    const rows = page.getByTestId('dashboard-thread-row');
    await expect(rows).toHaveCount(3);
  });

  test('thread row shows "Your accountant" for ADMIN-sent thread', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    const firstRow = page.getByTestId('dashboard-thread-row').first();
    await expect(firstRow.locator('.msg-sender')).toHaveText('Your accountant');
  });

  test('"View all messages" link is visible when threads exist', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('view-all-messages-link')).toBeVisible();
  });
});

test.describe('Navbar restructure', () => {
  test('USER does not see Messages nav link', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('messages-nav-link')).not.toBeAttached();
  });

  test('USER sees Dashboard nav link with unread badge', async ({ page }) => {
    await fakeClientAuth(page);
    await page.goto('http://localhost:4200/portal/dashboard');
    await expect(page.getByTestId('dashboard-nav-link')).toBeVisible();
    await expect(page.getByTestId('messages-unread-badge')).toBeVisible();
  });

  test('ADMIN does not see Admin nav link', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route('**/api/clients', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/clients/unread-counts', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) }));
    await page.goto('http://localhost:4200/admin/clients');
    await expect(page.getByTestId('admin-nav-link')).not.toBeAttached();
  });
});
