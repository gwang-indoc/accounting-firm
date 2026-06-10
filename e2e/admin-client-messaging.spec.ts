import { test, expect, Page } from '@playwright/test';

// ── Shared test data ──────────────────────────────────────────────────────────

const TEST_CLIENT = {
  id: 7,
  name: 'Test Client',
  email: 'test@example.com',
  phone: null,
  createdAt: '2026-01-01T00:00:00',
  linkedUserId: 42,
};

const ADMIN_USER  = { id: 1,  email: 'admin@firm.com',    name: 'Admin',       role: 'ADMIN' };
const CLIENT_USER = { id: 42, email: 'client@example.com', name: 'Test Client', role: 'USER'  };

// ── Auth helpers ──────────────────────────────────────────────────────────────

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
    body: JSON.stringify(ADMIN_USER),
  }));
}

async function fakeClientAuth(page: Page) {
  await page.context().addCookies([{
    name: 'jwt',
    value: 'mock.client.jwt.token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
  }]);
  await page.route('**/api/auth/me', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(CLIENT_USER),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Admin ↔ Client messaging roundtrip', () => {

  test('admin creates thread, client replies, admin sees unread badge', async ({ page }) => {

    // ── State shared across route handlers ────────────────────────────────────
    const threads: object[] = [];
    const messagesByThread: Record<number, object[]> = {};
    let nextThreadId = 1;
    let nextMessageId = 100;

    // ── Step 1: Admin login + /admin/clients — no badge initially ─────────────
    await fakeAdminAuth(page);

    await page.route('**/api/clients/unread-counts', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }));

    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_CLIENT]),
    }));

    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    // No unread badge initially
    await expect(page.getByTestId('client-messages-badge')).toHaveCount(0);

    // ── Step 2: Open thread list for client ───────────────────────────────────
    await page.route('**/api/clients/7/threads', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(threads.map((t: any) => ({
            id: t.id,
            clientId: 7,
            subject: t.subject,
            lastMessageAt: t.lastMessageAt,
            unreadCount: t.adminUnreadCount ?? 0,
            lastMessagePreview: messagesByThread[t.id]?.length
              ? (messagesByThread[t.id][messagesByThread[t.id].length - 1] as any).body.slice(0, 80)
              : '',
          }))),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const id = nextThreadId++;
        const thread: any = {
          id,
          clientId: 7,
          subject: body.subject,
          createdAt: '2026-05-20T10:00:00',
          lastMessageAt: '2026-05-20T10:00:00',
          adminUnreadCount: 0,
          clientUnreadCount: 1,
          messages: [],
        };
        messagesByThread[id] = [{
          id: nextMessageId++,
          threadId: id,
          senderType: 'ADMIN',
          senderUserId: 1,
          body: body.body,
          sentAt: '2026-05-20T10:00:00',
        }];
        threads.push(thread);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...thread, messages: messagesByThread[id] }),
        });
      }
    });

    await page.getByTestId('client-messages-btn').click();
    await expect(page).toHaveURL('/admin/clients/7/messages');
    await expect(page.getByTestId('thread-row')).toHaveCount(0);

    // ── Step 3: Create new thread ─────────────────────────────────────────────
    await page.getByTestId('new-thread-btn').click();
    await page.getByLabel('Subject').fill('E2E Tax Thread');
    await page.getByLabel('Your message').fill('Hello from admin');
    await page.getByRole('button', { name: 'Send Message' }).click();

    await expect(page.getByTestId('thread-row')).toHaveCount(1);
    await expect(page.getByTestId('thread-row').first()).toContainText('E2E Tax Thread');

    // ── Step 4: Open thread and verify sent message ───────────────────────────
    await page.route('**/api/clients/7/threads/1/messages', async route => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const msg: any = {
          id: nextMessageId++,
          threadId: 1,
          senderType: 'ADMIN',
          senderUserId: 1,
          body: body.body,
          sentAt: '2026-05-20T10:01:00',
        };
        messagesByThread[1].push(msg);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(msg),
        });
      }
    });

    await page.route('**/api/clients/7/threads/1', async route => {
      if (route.request().method() === 'GET') {
        const thread = threads.find((t: any) => t.id === 1) as any;
        if (thread) thread.adminUnreadCount = 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...thread, messages: messagesByThread[1] || [] }),
        });
      }
    });

    await page.getByTestId('thread-row').first().click();
    await expect(page).toHaveURL('/admin/clients/7/messages/1');
    await expect(page.locator('.bubble')).toHaveCount(1);
    await expect(page.locator('.bubble').first()).toContainText('Hello from admin');

    // ── Step 5: Switch to client session ─────────────────────────────────────
    await page.context().clearCookies();
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    await fakeClientAuth(page);

    // Portal routes for messages
    await page.route('**/api/portal/messages/unread-count', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unreadCount: 1 }),
    }));

    await page.route('**/api/portal/threads', async route => {
      if (route.request().method() === 'GET') {
        const clientThreads = threads.map((t: any) => ({
          id: t.id,
          clientId: 7,
          subject: t.subject,
          lastMessageAt: t.lastMessageAt,
          unreadCount: (t.clientUnreadCount ?? 0),
          lastMessagePreview: messagesByThread[t.id]?.length
            ? (messagesByThread[t.id][messagesByThread[t.id].length - 1] as any).body.slice(0, 80)
            : '',
        }));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(clientThreads),
        });
      }
    });

    await page.route('**/api/portal/threads/1/messages', async route => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const msg: any = {
          id: nextMessageId++,
          threadId: 1,
          senderType: 'CLIENT',
          senderUserId: 42,
          body: body.body,
          sentAt: '2026-05-20T10:02:00',
        };
        messagesByThread[1].push(msg);
        // Mark thread as having admin unread
        const thread = threads.find((t: any) => t.id === 1) as any;
        if (thread) thread.adminUnreadCount = 1;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(msg),
        });
      }
    });

    await page.route('**/api/portal/threads/1', async route => {
      if (route.request().method() === 'GET') {
        const thread = threads.find((t: any) => t.id === 1) as any;
        if (thread) thread.clientUnreadCount = 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...thread, messages: messagesByThread[1] || [] }),
        });
      }
    });

    // ── Step 6: Client opens /portal/messages — sees unread badge ─────────────
    await page.goto('/portal/messages');
    await expect(page.getByTestId('thread-row')).toHaveCount(1);
    await expect(page.getByTestId('thread-row').first()).toContainText('E2E Tax Thread');
    // Unread badge visible
    await expect(page.getByTestId('unread-chip')).toHaveCount(1);

    // ── Step 7: Client opens thread, sees admin message ───────────────────────
    await page.getByTestId('thread-row').first().click();
    await expect(page).toHaveURL('/portal/messages/1');
    await expect(page.locator('.bubble')).toHaveCount(1);
    await expect(page.locator('.bubble').first()).toContainText('Hello from admin');

    // ── Step 8: Client replies ────────────────────────────────────────────────
    await page.getByTestId('reply-textarea').fill('Hi from client');
    await page.getByTestId('send-btn').click();

    await expect(page.locator('.bubble')).toHaveCount(2);
    await expect(page.locator('.bubble').nth(1)).toContainText('Hi from client');

    // ── Step 9: Switch back to admin ─────────────────────────────────────────
    await page.context().clearCookies();
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    await fakeAdminAuth(page);

    // Clients list now shows unread badge (client replied)
    await page.route('**/api/clients/unread-counts', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ clientId: 7, unreadCount: 1 }]),
    }));

    await page.route('**/api/clients', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([TEST_CLIENT]),
    }));

    await page.goto('/admin/clients');
    await expect(page.getByTestId('client-row')).toHaveCount(1);
    await expect(page.getByTestId('client-messages-badge')).toHaveCount(1);
    await expect(page.getByTestId('client-messages-badge').first()).toContainText('1');

    // ── Step 10: Admin opens thread, sees reply, badge clears ─────────────────
    await page.route('**/api/clients/7/threads', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(threads.map((t: any) => ({
        id: t.id,
        clientId: 7,
        subject: t.subject,
        lastMessageAt: t.lastMessageAt,
        unreadCount: t.adminUnreadCount ?? 0,
        lastMessagePreview: messagesByThread[t.id]?.length
          ? (messagesByThread[t.id][messagesByThread[t.id].length - 1] as any).body.slice(0, 80)
          : '',
      }))),
    }));

    await page.route('**/api/clients/7/threads/1', async route => {
      if (route.request().method() === 'GET') {
        const thread = threads.find((t: any) => t.id === 1) as any;
        if (thread) thread.adminUnreadCount = 0;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...thread, messages: messagesByThread[1] || [] }),
        });
      }
    });

    await page.getByTestId('client-messages-btn').click();
    await expect(page).toHaveURL('/admin/clients/7/messages');

    await page.getByTestId('thread-row').first().click();
    await expect(page).toHaveURL('/admin/clients/7/messages/1');

    // Both messages visible
    await expect(page.locator('.bubble')).toHaveCount(2);
    await expect(page.locator('.bubble').first()).toContainText('Hello from admin');
    await expect(page.locator('.bubble').nth(1)).toContainText('Hi from client');

    // After viewing, unread chip should be gone (adminUnreadCount cleared by GET)
    await page.goto('/admin/clients/7/messages');
    const firstThread = page.getByTestId('thread-row').first();
    await expect(firstThread).not.toContainText('·1');
  });

});
