import { test, expect, Page } from '@playwright/test';

const RETURNING_USER = { id: 10, email: 'returning@example.com', name: 'Returning User', role: 'USER' };
const NEW_USER       = { id: 11, email: 'newuser@example.com',   name: 'New User',       role: 'USER' };

async function mockRequestCode(page: Page) {
  await page.route('**/api/auth/email/request-code', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'code_sent' }) })
  );
}

test.describe('Email OTP Login — returning user', () => {
  test('email → code → /portal/dashboard', async ({ page }) => {
    await mockRequestCode(page);
    await page.route('**/api/auth/email/verify-code', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'authenticated' }) })
    );
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RETURNING_USER) })
    );
    await page.route('**/api/portal/messages/unread-count', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unreadCount: 0 }) })
    );
    await page.route('**/api/me/documents', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ linked: false }) })
    );

    await page.goto('/login');

    // Email step
    await page.fill('input[type="email"]', RETURNING_USER.email);
    await page.locator('app-login-email-code form button[type="submit"]').click();

    // Code step
    await expect(page.locator('[data-testid="code-input"]')).toBeVisible();
    await page.fill('[data-testid="code-input"]', '123456');
    await page.locator('app-login-email-code form button[type="submit"]').click();

    // Should land on dashboard
    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });
});

test.describe('Email OTP Login — new user signup', () => {
  test('email → code (signup_required) → name → /portal/dashboard', async ({ page }) => {
    const signupToken = 'signup.jwt.token';
    await mockRequestCode(page);
    await page.route('**/api/auth/email/verify-code', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'signup_required', signupToken }) })
    );
    await page.route('**/api/auth/email/complete-signup', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );
    await page.route('**/api/auth/me', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(NEW_USER) })
    );
    await page.route('**/api/portal/messages/unread-count', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unreadCount: 0 }) })
    );
    await page.route('**/api/me/documents', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ linked: false }) })
    );

    await page.goto('/login');

    // Email step
    await page.fill('input[type="email"]', NEW_USER.email);
    await page.locator('app-login-email-code form button[type="submit"]').click();

    // Code step
    await expect(page.locator('[data-testid="code-input"]')).toBeVisible();
    await page.fill('[data-testid="code-input"]', '654321');
    await page.locator('app-login-email-code form button[type="submit"]').click();

    // Name step
    await expect(page.locator('[data-testid="name-input"]')).toBeVisible();
    await page.fill('[data-testid="name-input"]', NEW_USER.name);
    await page.locator('app-login-email-code form button[type="submit"]').click();

    // Should land on dashboard
    await expect(page).toHaveURL(/\/portal\/dashboard/);
  });
});

test.describe('Email OTP Login — wrong code', () => {
  test('invalid code shows login-error banner', async ({ page }) => {
    await mockRequestCode(page);
    await page.route('**/api/auth/email/verify-code', route =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_code' }) })
    );

    await page.goto('/login');

    await page.fill('input[type="email"]', 'user@example.com');
    await page.locator('app-login-email-code form button[type="submit"]').click();

    await expect(page.locator('[data-testid="code-input"]')).toBeVisible();
    await page.fill('[data-testid="code-input"]', '000000');
    await page.locator('app-login-email-code form button[type="submit"]').click();

    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
  });
});
