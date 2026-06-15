import { test, expect } from '@playwright/test';
import { drivers } from '../data/test-data';
import { tableRow, expectModal, expectToast } from '../utils/ui';

/**
 * Phase 9 (admin half) — 9.6: docs/e2e-test-plan.md §13.
 *
 * Reactivates D2 via the Employee detail page's "Edit Profile" modal, after
 * Maestro flow 13-d2-login-deactivated.yaml has confirmed mobile login is
 * blocked while D2 is inactive (9.5). Sets up the mobile-side check in
 * Maestro flow 14-d2-login-reactivated.yaml, which must run AFTER this spec
 * and asserts that D2 can log in again.
 *
 * Must run AFTER Maestro flow 13-d2-login-deactivated.yaml and BEFORE
 * Maestro flow 14-d2-login-reactivated.yaml.
 */
test.describe('Phase 9 (admin) — Reactivate D2', () => {
  test('9.6 reactivating D2 marks the employee Active', async ({ page }) => {
    await page.goto('/employees');
    await expect(tableRow(page, drivers.D2.name)).toContainText('Inactive');

    await tableRow(page, drivers.D2.name).click();
    await expect(page).toHaveURL(/\/employees\/.+/);

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    const m = await expectModal(page, 'Edit Profile');
    await m.getByRole('button', { name: 'Inactive' }).click();
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expectToast(page, 'Employee updated');
    await expect(m).not.toBeVisible();
    await expect(page.getByText('Active').first()).toBeVisible();
  });
});
