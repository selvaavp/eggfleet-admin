import { test as setup, expect } from '@playwright/test';
import { admin } from '../data/test-data';

const authFile = 'e2e/.auth/admin.json';

/**
 * Phase 0, item 0.1: admin login — performed once via the real login form,
 * then the authenticated session is reused by every other spec via
 * storageState (see playwright.config.ts).
 */
setup('admin login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(admin.email);
  await page.locator('input[type="password"]').fill(admin.password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
