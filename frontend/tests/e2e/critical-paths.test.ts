import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test('complete transaction flow', async ({ page }) => {
    await page.goto('/login');
    // Login steps...
    await page.goto('/dashboard');
    await page.click('[data-testid="buy-pulsa"]');
    await page.fill('input[name="phone"]', '08123456789');
    await page.selectOption('select[name="denomination"]', '10000');
    await page.click('button[type="submit"]');
    await expect(page.locator('.success-message')).toBeVisible();
  });

  test('API key generation', async ({ page }) => {
    await page.goto('/dashboard/api');
    await page.click('button:has-text("Generate Key")');
    await expect(page.locator('[data-testid="api-key"]')).toBeVisible();
  });
});
