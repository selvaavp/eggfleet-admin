import { test, expect } from '@playwright/test';
import {
  payments,
  deliveries,
  assignments,
  stores,
  vans,
  routes,
  drivers,
  paymentAmount,
  storePendingBalance,
} from '../data/test-data';
import { tableRow, expectModal, expectToast, closeModal, kpiCardValue } from '../utils/ui';

/**
 * Phase 4 — Payments: Verify (Admin) (docs/e2e-test-plan.md §8).
 *
 * PAY1-PAY4 are submitted via the mobile UI (Maestro flows 05-07), which must
 * run BEFORE this spec. This spec verifies the Transaction Ledger lists them
 * correctly (4.6), inspects PAY2's UPI verification modal incl. proof image
 * (4.7), then approves PAY1/PAY2/PAY4 and rejects PAY3 with reason
 * "Proof unclear" (4.8-4.12), and finally confirms the resulting store
 * pending-balance figures (4.19-equivalent, F5/F7).
 */

function deliveryOf(code: keyof typeof payments) {
  return deliveries[payments[code].deliveryCodes[0]];
}

function storeOf(code: keyof typeof payments) {
  return stores[deliveryOf(code).storeCode];
}

function ledgerRow(page: import('@playwright/test').Page, code: keyof typeof payments) {
  const amount = paymentAmount(code);
  return tableRow(page, storeOf(code).name).filter({ hasText: new RegExp(amount.toFixed(2)) });
}

test.describe('Phase 4 — Payments: Verify (Admin)', () => {
  test('4.6-4.7 Transaction Ledger lists PAY1-PAY4 with correct details; PAY2 modal shows proof', async ({
    page,
  }) => {
    await page.goto('/payments');

    for (const code of Object.keys(payments) as (keyof typeof payments)[]) {
      const p = payments[code];
      const driver = drivers[p.driverCode];
      const row = ledgerRow(page, code);

      await expect(row).toBeVisible();
      await expect(row).toContainText(driver.name);
      await expect(row).toContainText(p.method.replace('_', ' '));
      await expect(row).toContainText('Pending');
    }

    // 4.7: PAY2 (UPI + proof) verification modal shows Store/Employee/Van/Route/
    // Type/Amount and a loaded proof image (not the "No screenshot" placeholder).
    const del2 = deliveryOf('PAY2');
    const a1 = assignments[del2.assignmentCode];
    const van1 = vans[a1.vanCode];
    const route1 = routes[a1.routeCode];
    const driver1 = drivers[payments.PAY2.driverCode];

    await ledgerRow(page, 'PAY2').getByRole('button').click();
    const m = await expectModal(page, 'UPI Payment Verification');

    await expect(m).toContainText(storeOf('PAY2').name);
    await expect(m).toContainText(driver1.name);
    await expect(m).toContainText(van1.number);
    await expect(m).toContainText(route1.name);
    await expect(m).toContainText('UPI');
    await expect(m).toContainText(paymentAmount('PAY2').toFixed(2));

    await expect(m.locator('img[alt="Payment proof screenshot"]')).toBeVisible();
    await expect(m.getByText('No screenshot')).not.toBeVisible();

    await closeModal(page, 'UPI Payment Verification');
  });

  test('4.8-4.12 approve PAY1/PAY2/PAY4, reject PAY3 with reason "Proof unclear"', async ({ page }) => {
    await page.goto('/payments');

    for (const code of Object.keys(payments) as (keyof typeof payments)[]) {
      const p = payments[code];

      await ledgerRow(page, code).getByRole('button').click();
      const m = await expectModal(page, 'UPI Payment Verification');

      if (p.outcome === 'APPROVE') {
        await m.getByRole('button', { name: 'Approve & Verify' }).click();
      } else {
        await m.getByLabel('Rejection reason (optional)').fill(p.rejectionReason!);
        await m.getByRole('button', { name: 'Reject Payment' }).click();
      }

      await expectToast(page, 'Payment status updated');
      await expect(m).not.toBeVisible();

      const expectedStatus = p.outcome === 'APPROVE' ? 'Approved' : 'Rejected';
      await expect(ledgerRow(page, code)).toContainText(expectedStatus);
    }
  });

  test('4.19 store pending balances reflect PAY2 partial approval and PAY3 rejection', async ({ page }) => {
    // S2: DEL2 total 200, PAY2 (₹120, APPROVE) collected -> pending = max(0, 200-120) = 80.
    const s2Code = deliveryOf('PAY2').storeCode;
    const s2 = stores[s2Code];
    await page.goto('/stores');
    await tableRow(page, s2.name).click();
    await expect(page).toHaveURL(/\/stores\//);
    await expect(async () => {
      expect(await kpiCardValue(page, 'Pending Amount')).toBe(storePendingBalance(s2Code));
    }).toPass();

    // S3: DEL3 total 220, PAY3 (REJECT) doesn't count -> pending = max(0, 220-0) = 220
    // (delivery reverted to UNPAID by the rejection).
    const s3Code = deliveryOf('PAY3').storeCode;
    const s3 = stores[s3Code];
    await page.goto('/stores');
    await tableRow(page, s3.name).click();
    await expect(page).toHaveURL(/\/stores\//);
    await expect(async () => {
      expect(await kpiCardValue(page, 'Pending Amount')).toBe(storePendingBalance(s3Code));
    }).toPass();
  });
});
