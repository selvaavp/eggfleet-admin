import { test, expect } from '@playwright/test';
import { drivers } from '../data/test-data';
import { tableRow, expectModal, expectToast } from '../utils/ui';

/**
 * Phase 9 (admin half) — 9.5: docs/e2e-test-plan.md §13.
 *
 * Deactivates D2 via the Employee detail page's "Edit Profile" modal (the
 * only place the Active/Inactive status toggle lives — there is no
 * dedicated row action or confirm modal). This sets up the mobile-side
 * check in Maestro flow 13-d2-login-deactivated.yaml, which must run AFTER
 * this spec and asserts the "Account is deactivated. Contact admin." login
 * error.
 *
 * Must run AFTER 08-notifications-edge-cases.spec.ts (D2's notifications are
 * read while D2 is still active) and BEFORE Maestro flow
 * 13-d2-login-deactivated.yaml.
 */
test.describe('Phase 9 (admin) — Deactivate D2', () => {
  test('9.5 deactivating D2 marks the employee Inactive', async ({ page }) => {
    await page.goto('/employees');
    await expect(tableRow(page, drivers.D2.name)).toContainText('Active');

    await tableRow(page, drivers.D2.name).click();
    await expect(page).toHaveURL(/\/employees\/.+/);

    await page.getByRole('button', { name: 'Edit Profile' }).click();
    const m = await expectModal(page, 'Edit Profile');
    await m.getByRole('button', { name: 'Active' }).click();
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expectToast(page, 'Employee updated');
    await expect(m).not.toBeVisible();
    await expect(page.getByText('Inactive').first()).toBeVisible();
  });
});
