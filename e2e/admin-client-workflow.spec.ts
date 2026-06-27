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

const CLIENT_ID = 7;
const TAX_YEAR = 2025;

const ENGAGEMENT_START = {
  id: 1, clientId: CLIENT_ID, taxYear: TAX_YEAR,
  status: 'START', updatedAt: '2026-06-27T00:00:00', updatedById: 1,
};

const ENGAGEMENT_IN_PROCESSING = {
  ...ENGAGEMENT_START, status: 'IN_PROCESSING', updatedAt: '2026-06-27T01:00:00',
};

const HISTORY = [
  { id: 1, engagementId: 1, fromStatus: null, toStatus: 'START', changedAt: '2026-06-27T00:00:00', changedById: 1, note: null },
  { id: 2, engagementId: 1, fromStatus: 'START', toStatus: 'IN_PROCESSING', changedAt: '2026-06-27T01:00:00', changedById: 1, note: 'Starting work' },
];

test.describe('/admin/clients/:id/workflow', () => {

  test('shows empty state when client has no engagements', async ({ page }) => {
    await fakeAdminAuth(page);
    await page.route(`**/api/admin/clients/${CLIENT_ID}/engagements`, route => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify([]),
    }));

    await page.goto(`/admin/clients/${CLIENT_ID}/workflow`);
    await expect(page.getByTestId('empty-state')).toBeVisible();
  });

  test('creates 2025 engagement, transitions to IN_PROCESSING, shows history', async ({ page }) => {
    await fakeAdminAuth(page);

    const engagements: object[] = [];

    await page.route(`**/api/admin/clients/${CLIENT_ID}/engagements`, async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(engagements) });
      } else if (route.request().method() === 'POST') {
        engagements.push(ENGAGEMENT_START);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(ENGAGEMENT_START) });
      }
    });

    await page.route(`**/api/admin/clients/${CLIENT_ID}/engagements/${TAX_YEAR}/status`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ENGAGEMENT_IN_PROCESSING) })
    );

    await page.route(`**/api/admin/clients/${CLIENT_ID}/engagements/${TAX_YEAR}/history`, route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HISTORY) })
    );

    await page.goto(`/admin/clients/${CLIENT_ID}/workflow`);

    // Empty state visible initially
    await expect(page.getByTestId('empty-state')).toBeVisible();

    // Open New Engagement dialog and create 2025
    await page.getByTestId('new-engagement-btn').click();
    const taxYearInput = page.getByTestId('tax-year-input');
    await taxYearInput.clear();
    await taxYearInput.fill(String(TAX_YEAR));
    await page.getByTestId('submit-btn').click();

    // Engagement row appears at START status
    await expect(page.getByTestId('engagement-row')).toHaveCount(1);
    await expect(page.getByTestId('engagement-row').first()).toContainText(String(TAX_YEAR));
    await expect(page.getByTestId('engagement-row').first()).toContainText('START');

    // Update mock so reload returns IN_PROCESSING
    engagements[0] = ENGAGEMENT_IN_PROCESSING;

    // Open status transition dialog
    await page.getByTestId('transition-btn').click();
    await page.getByTestId('status-select').click();
    await page.getByRole('option', { name: 'IN_PROCESSING' }).click();
    await page.getByTestId('confirm-btn').click();

    // Row shows IN_PROCESSING after transition
    await expect(page.getByTestId('engagement-row').first()).toContainText('IN_PROCESSING');

    // Expand to see history
    await page.getByTestId('expand-btn').click();
    await expect(page.getByTestId('history-row')).toHaveCount(2);
    await expect(page.getByTestId('history-row').nth(1)).toContainText('IN_PROCESSING');
  });

});
