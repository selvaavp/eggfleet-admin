import { test, expect } from '@playwright/test';
import {
  handovers,
  vans,
  routes,
  drivers,
  assignments,
  handoverCashAmount,
  handoverGoodUnits,
} from '../data/test-data';
import { tableRow, expectModal, closeModal, expectToast, openRowMenu, clickMenuItem } from '../utils/ui';

/**
 * Phase 5 — Cash & Egg Handover: Admin review (docs/e2e-test-plan.md §9).
 *
 * HO1 (D1) and HO2 (D2) are submitted via the mobile UI (Maestro flows 04, 08),
 * which must run BEFORE this spec. This spec inspects each handover's detail
 * (5.6, 5.8), approves HO1 (5.7) and rejects HO2 with a reason (5.9), then
 * confirms the resulting assignment statuses (5.11): A1 -> COMPLETED, A2
 * stays ACTIVE.
 */

test.describe('Phase 5 — Handovers: Admin review', () => {
  test('5.6-5.7 view HO1 (D1) detail and approve it', async ({ page }) => {
    const driver = drivers[handovers.HO1.driverCode];
    const van = vans[assignments[handovers.HO1.assignmentCode].vanCode];
    const route = routes[assignments[handovers.HO1.assignmentCode].routeCode];

    await page.goto('/handovers');

    const row = tableRow(page, driver.name);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Pending');
    await expect(row).toContainText(handoverCashAmount('D1').toString());

    const b1Good = handoverGoodUnits('A1', 'B1');
    const b2Good = handoverGoodUnits('A1', 'B2');
    await expect(row).toContainText(`${b1Good + b2Good} good`);
    await expect(row).toContainText('0 damaged');

    let menu = await openRowMenu(page, row);
    await clickMenuItem(page, 'View details');
    const m = await expectModal(page, 'Handover detail');

    await expect(m).toContainText(driver.name);
    await expect(m).toContainText(van.number);
    await expect(m).toContainText(route.name);
    await expect(m).toContainText(handoverCashAmount('D1').toString());

    const lines = m.locator('tbody tr');
    await expect(lines).toHaveCount(2);
    await expect(lines.nth(0)).toContainText('5.50');
    await expect(lines.nth(0).locator('td').nth(2)).toHaveText(String(b1Good));
    await expect(lines.nth(1)).toContainText('6.00');
    await expect(lines.nth(1).locator('td').nth(2)).toHaveText(String(b2Good));

    await closeModal(page, 'Handover detail');

    // Quick "Approve" action from the row menu.
    menu = await openRowMenu(page, row);
    await clickMenuItem(page, 'Approve');
    await expectToast(page, 'Handover approved');
    await expect(row).toContainText('Approved');
  });

  test('5.8-5.10 view HO2 (D2) detail and reject it with a reason', async ({ page }) => {
    const driver = drivers[handovers.HO2.driverCode];
    const van = vans[assignments[handovers.HO2.assignmentCode].vanCode];
    const route = routes[assignments[handovers.HO2.assignmentCode].routeCode];

    await page.goto('/handovers');

    const row = tableRow(page, driver.name);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Pending');

    let menu = await openRowMenu(page, row);
    await clickMenuItem(page, 'View details');
    const m = await expectModal(page, 'Handover detail');

    await expect(m).toContainText(driver.name);
    await expect(m).toContainText(van.number);
    await expect(m).toContainText(route.name);

    // B1 egg line reflects HO2's driver-reported damage override
    // (Good = handoverGoodUnits('A2','B1') - 2, Damaged = 2).
    const b1Good = handoverGoodUnits('A2', 'B1') - (handovers.HO2.damagedOverrides.B1 ?? 0);
    const lines = m.locator('tbody tr');
    await expect(lines.first()).toContainText('5.50');
    await expect(lines.first().locator('td').nth(2)).toHaveText(String(b1Good));
    await expect(lines.first().locator('td').nth(3)).toHaveText(String(handovers.HO2.damagedOverrides.B1 ?? 0));

    await closeModal(page, 'Handover detail');

    // Quick "Reject" action opens the detail modal pre-selected to "Rejected".
    menu = await openRowMenu(page, row);
    await clickMenuItem(page, 'Reject');
    const m2 = await expectModal(page, 'Handover detail');
    await m2.getByLabel('Rejection reason (optional)').fill(handovers.HO2.rejectionReason);
    await m2.getByRole('button', { name: 'Update' }).click();

    await expectToast(page, 'Status updated');
    await expect(row).toContainText('Rejected');
  });

  test('5.11 assignment statuses reflect handover outcomes: A1 -> COMPLETED, A2 stays ACTIVE', async ({ page }) => {
    const driver1 = drivers[assignments.A1.driverCode];
    const driver2 = drivers[assignments.A2.driverCode];

    await page.goto('/assignments');

    const row1 = tableRow(page, driver1.name);
    await expect(row1).toContainText('COMPLETED');

    const row2 = tableRow(page, driver2.name);
    await expect(row2).toContainText('Active');
  });
});
