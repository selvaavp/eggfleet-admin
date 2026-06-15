import * as fs from 'fs';
import { test, expect, type Page } from '@playwright/test';
import {
  vendors,
  expenses,
  vans,
  scenarioDate,
  vendorSaleEggValue,
  vendorPaymentAmount,
  totalExpenses,
  expensesByCategory,
} from '../data/test-data';
import {
  tableRow,
  expectModal,
  expectToast,
  kpiCard,
  kpiCardValue,
  statCardValue,
  openRowMenu,
  clickMenuItem,
  confirmDelete,
} from '../utils/ui';

/**
 * Phase 6 — Vendor Payments & Expenses (docs/e2e-test-plan.md §10).
 *
 * VP1 (V1, partial CASH) and VP2 (V2, full CASH) are recorded via the
 * "Record Payment" button on /vendors (6.2-6.3), then the V1/V2 detail pages
 * are checked for sale-egg-value, pending balance, payment history and net
 * profit (6.1, 6.4-6.5). Pending-amount deltas are used instead of absolute
 * formula values, since re-running this spec records additional payments
 * for the same vendors each time. EXP1-EXP3 are added on /expenses (6.6-6.8), a
 * negative VEHICLE expense without a van is rejected client-side (6.9), the
 * summary StatCards are checked (6.10), EXP3 is edited/deleted/re-added
 * (6.11-6.13), and CSV exports for Expenses and Vendor Payments are
 * downloaded (6.14-6.15).
 *
 * 6.4 ("Filter Vendor Payments by V1") and 6.15 (vendor-payments CSV) have no
 * dedicated cross-vendor list/export in the admin UI — both are exercised via
 * the per-vendor "Payment History" table / "Report" download on each vendor's
 * detail page, which is inherently scoped to that vendor.
 */

function inr2(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function gotoVendorDetail(page: Page, vendorName: string) {
  await page.goto('/vendors');
  await tableRow(page, vendorName).click();
  await expect(page).toHaveURL(/\/vendors\/.+/);
}

function paymentHistorySection(page: Page) {
  return page.locator('section').filter({ has: page.getByRole('heading', { name: 'Payment History' }) });
}

test.describe('Phase 6 — Vendor Payments & Expenses', () => {
  test('6.1 Vendor V1 detail shows Sale Egg Value (F8 input)', async ({ page }) => {
    await gotoVendorDetail(page, vendors.V1.name);
    await expect(kpiCard(page, 'Sale Egg Value')).toBeVisible();
    await expect(async () => {
      expect(await kpiCardValue(page, 'Sale Egg Value')).toBe(vendorSaleEggValue('V1'));
    }).toPass();
  });

  test('6.2-6.5 record vendor payments and verify history, pending balance and net profit', async ({ page }) => {
    // Capture each vendor's "Pending Amount" and "Net Profit" before recording
    // a new payment. Pending Amount drops by the payment's amount; Net Profit
    // (F9, derived from purchase cost vs. sold revenue) must stay unchanged by
    // a vendor payment. Both checks are deltas/invariants, robust to payments
    // already recorded for this vendor by earlier dev-iteration runs.
    await gotoVendorDetail(page, vendors.V1.name);
    const v1PendingBefore = await kpiCardValue(page, 'Pending Amount');
    const v1NetProfitBefore = await kpiCardValue(page, 'Net Profit');

    await gotoVendorDetail(page, vendors.V2.name);
    const v2PendingBefore = await kpiCardValue(page, 'Pending Amount');
    const v2NetProfitBefore = await kpiCardValue(page, 'Net Profit');

    await page.goto('/vendors');

    // VP1: V1, ₹2,000 CASH, marked "Partial".
    await page.getByRole('button', { name: 'Record Payment' }).click();
    let m = await expectModal(page, 'Record Payment');
    await m.locator('select').first().selectOption({ label: vendors.V1.name });
    await m.locator('input[type="number"]').fill(String(vendorPaymentAmount('VP1')));
    await m.locator('select').nth(1).selectOption('CASH');
    await m.getByRole('tab', { name: 'Partial' }).click();
    await m.getByRole('button', { name: 'Record Payment' }).click();
    await expectToast(page, 'Payment recorded successfully');
    await expect(m).not.toBeVisible();

    // VP2: V2, full CASH payment, marked "Paid".
    await page.getByRole('button', { name: 'Record Payment' }).click();
    m = await expectModal(page, 'Record Payment');
    await m.locator('select').first().selectOption({ label: vendors.V2.name });
    await m.locator('input[type="number"]').fill(String(vendorPaymentAmount('VP2')));
    await m.locator('select').nth(1).selectOption('CASH');
    await m.getByRole('tab', { name: 'Paid' }).click();
    await m.getByRole('button', { name: 'Record Payment' }).click();
    await expectToast(page, 'Payment recorded successfully');
    await expect(m).not.toBeVisible();

    // V1: payment history shows VP1's ₹2,000.00 row (not V2's payment);
    // pending drops by VP1's amount; net profit (F9) is unchanged by payments.
    await gotoVendorDetail(page, vendors.V1.name);
    const v1History = paymentHistorySection(page);
    await expect(v1History).toContainText(inr2(vendorPaymentAmount('VP1')));
    await expect(v1History).not.toContainText(inr2(vendorPaymentAmount('VP2')));
    await expect(async () => {
      expect(await kpiCardValue(page, 'Pending Amount')).toBe(
        Math.max(0, v1PendingBefore - vendorPaymentAmount('VP1')),
      );
    }).toPass();
    await expect(async () => {
      expect(await kpiCardValue(page, 'Net Profit')).toBe(v1NetProfitBefore);
    }).toPass();

    // V2: payment history shows VP2's payment row (not V1's ₹2,000.00);
    // pending drops by VP2's amount (full settlement -> 0 or less, clamped);
    // net profit (F9) is unchanged by payments.
    await gotoVendorDetail(page, vendors.V2.name);
    const v2History = paymentHistorySection(page);
    await expect(v2History).toContainText(inr2(vendorPaymentAmount('VP2')));
    await expect(v2History).not.toContainText(inr2(vendorPaymentAmount('VP1')));
    await expect(async () => {
      expect(await kpiCardValue(page, 'Pending Amount')).toBe(
        Math.max(0, v2PendingBefore - vendorPaymentAmount('VP2')),
      );
    }).toPass();
    await expect(async () => {
      expect(await kpiCardValue(page, 'Net Profit')).toBe(v2NetProfitBefore);
    }).toPass();
  });

  test('6.6-6.9 add EXP1 (Company), EXP2 (Vehicle), EXP3 (Other); reject EXP_NEG with no van', async ({ page }) => {
    await page.goto('/expenses');

    // EXP1: COMPANY, "Office Rent", ₹5,000.
    // .first() disambiguates from EmptyState's own "Add Expense" button,
    // which renders alongside the header button while the table is empty.
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    let m = await expectModal(page, 'Add Expense');
    await m.locator('select').first().selectOption('COMPANY');
    await m.getByLabel('Title').fill(expenses.EXP1.title);
    await m.getByLabel('Amount (₹)').fill(String(expenses.EXP1.amount));
    await m.getByLabel('Date').fill(scenarioDate);
    await m.getByRole('button', { name: 'Add Expense' }).click();
    await expectToast(page, 'Expense recorded');
    await expect(m).not.toBeVisible();

    // EXP2: VEHICLE, "Diesel Refill", ₹1,200, Van Alpha.
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    m = await expectModal(page, 'Add Expense');
    await m.locator('select').first().selectOption('VEHICLE');
    await m.locator('select').nth(1).selectOption({ label: `${vans.Van1.name} (${vans.Van1.number})` });
    await m.getByLabel('Title').fill(expenses.EXP2.title);
    await m.getByLabel('Amount (₹)').fill(String(expenses.EXP2.amount));
    await m.getByLabel('Date').fill(scenarioDate);
    await m.getByRole('button', { name: 'Add Expense' }).click();
    await expectToast(page, 'Expense recorded');
    await expect(m).not.toBeVisible();

    // EXP3: OTHER, "Misc. Tools Purchase", ₹350.
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    m = await expectModal(page, 'Add Expense');
    await m.locator('select').first().selectOption('OTHER');
    await m.getByLabel('Title').fill(expenses.EXP3.title);
    await m.getByLabel('Amount (₹)').fill(String(expenses.EXP3.amount));
    await m.getByLabel('Date').fill(scenarioDate);
    await m.getByRole('button', { name: 'Add Expense' }).click();
    await expectToast(page, 'Expense recorded');
    await expect(m).not.toBeVisible();

    // EXP_NEG: VEHICLE, "Tyre repair", ₹500, no van selected -> client-side
    // validation error, not submitted.
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    m = await expectModal(page, 'Add Expense');
    await m.locator('select').first().selectOption('VEHICLE');
    await m.getByLabel('Title').fill(expenses.EXP_NEG.title);
    await m.getByLabel('Amount (₹)').fill(String(expenses.EXP_NEG.amount));
    await m.getByLabel('Date').fill(scenarioDate);
    await m.getByRole('button', { name: 'Add Expense' }).click();
    await expect(m.getByText('Select a vehicle for vehicle expenses')).toBeVisible();
    await expect(m).toBeVisible();
    await m.getByRole('button', { name: 'Cancel' }).click();
    await expect(m).not.toBeVisible();

    // Newly added rows appear in the table. The list is ordered by
    // expenseDate DESC, createdAt DESC, so .first() is this run's row even if
    // earlier dev-iteration runs left behind rows with the same titles.
    await expect(tableRow(page, expenses.EXP1.title).first()).toBeVisible();
    await expect(tableRow(page, expenses.EXP2.title).first()).toContainText(vans.Van1.name);
    await expect(tableRow(page, expenses.EXP3.title).first()).toBeVisible();
    await expect(tableRow(page, expenses.EXP_NEG.title)).toHaveCount(0);
  });

  test('6.10-6.13 expense summary StatCards update on add/edit/delete/re-add', async ({ page }) => {
    await page.goto('/expenses');

    // Baseline (before this test's edit/delete/re-add of EXP3) already
    // includes EXP1-EXP3 from the previous test. Capture deltas relative to
    // a baseline taken with EXP3 present, so this test is robust to
    // pre-existing expenses from other runs.
    const base = {
      total: await statCardValue(page, 'Total Expenses'),
      company: await statCardValue(page, 'Company Expenses'),
      vehicle: await statCardValue(page, 'Vehicle Expenses'),
      other: await statCardValue(page, 'Other Expenses'),
      netProfit: await statCardValue(page, 'Net Profit'),
    };

    // 6.10: baseline already reflects totalExpenses() = EXP1+EXP2+EXP3 from
    // the prior test, with byCategory matching expensesByCategory().
    expect(base.company).toBeGreaterThanOrEqual(expensesByCategory().COMPANY);
    expect(base.vehicle).toBeGreaterThanOrEqual(expensesByCategory().VEHICLE);
    expect(base.other).toBeGreaterThanOrEqual(expensesByCategory().OTHER);
    expect(base.total).toBeGreaterThanOrEqual(totalExpenses());

    // 6.11: edit EXP3 amount 350 -> 400; OTHER and Total go up by 50.
    // .first() targets this run's EXP3 row (most recently created), even if
    // earlier dev-iteration runs left behind rows with the same title.
    await openRowMenu(page, tableRow(page, expenses.EXP3.title).first());
    await clickMenuItem(page, 'Edit');
    let m = await expectModal(page, 'Edit Expense');
    await m.getByLabel('Amount (₹)').fill('400');
    await m.getByRole('button', { name: 'Save Changes' }).click();
    await expectToast(page, 'Expense updated');
    await expect(m).not.toBeVisible();

    await expect(async () => {
      expect(await statCardValue(page, 'Other Expenses')).toBe(base.other + 50);
    }).toPass();
    expect(await statCardValue(page, 'Total Expenses')).toBe(base.total + 50);

    // 6.12: delete EXP3; OTHER and Total revert to baseline (EXP3 = ₹400 now).
    await openRowMenu(page, tableRow(page, expenses.EXP3.title).first());
    await clickMenuItem(page, 'Delete');
    await confirmDelete(page, 'Delete Expense', 'Delete');
    await expectToast(page, 'Expense deleted');

    await expect(async () => {
      expect(await statCardValue(page, 'Other Expenses')).toBe(base.other - expensesByCategory().OTHER);
    }).toPass();
    expect(await statCardValue(page, 'Total Expenses')).toBe(base.total - expensesByCategory().OTHER);

    // 6.13: re-add EXP3 at its original ₹350 so downstream Phase 7 math holds.
    await page.getByRole('button', { name: 'Add Expense' }).first().click();
    m = await expectModal(page, 'Add Expense');
    await m.locator('select').first().selectOption('OTHER');
    await m.getByLabel('Title').fill(expenses.EXP3.title);
    await m.getByLabel('Amount (₹)').fill(String(expenses.EXP3.amount));
    await m.getByLabel('Date').fill(scenarioDate);
    await m.getByRole('button', { name: 'Add Expense' }).click();
    await expectToast(page, 'Expense recorded');
    await expect(m).not.toBeVisible();

    await expect(async () => {
      expect(await statCardValue(page, 'Other Expenses')).toBe(base.other);
    }).toPass();
    expect(await statCardValue(page, 'Total Expenses')).toBe(base.total);
  });

  test('6.14-6.15 export Expenses and Vendor Payments to CSV', async ({ page }) => {
    await page.goto('/expenses');

    const [expensesDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download CSV' }).click(),
    ]);
    expect(expensesDownload.suggestedFilename()).toMatch(/^expenses-\d{4}-\d{2}-\d{2}\.csv$/);
    const expensesPath = await expensesDownload.path();
    const expensesCsv = expensesPath ? fs.readFileSync(expensesPath, 'utf-8') : '';
    expect(expensesCsv).toContain(expenses.EXP1.title);
    expect(expensesCsv).toContain(expenses.EXP2.title);
    expect(expensesCsv).toContain(expenses.EXP3.title);

    // Vendor Payments CSV — per-vendor "Report" download on each vendor's detail page.
    await gotoVendorDetail(page, vendors.V1.name);
    const [v1Download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Report' }).click(),
    ]);
    await expectToast(page, 'Report downloaded');
    const v1Path = await v1Download.path();
    const v1Csv = v1Path ? fs.readFileSync(v1Path, 'utf-8') : '';
    expect(v1Csv).toContain(vendors.V1.name);
    expect(v1Csv).toContain(String(vendorPaymentAmount('VP1')));

    await gotoVendorDetail(page, vendors.V2.name);
    const [v2Download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Report' }).click(),
    ]);
    await expectToast(page, 'Report downloaded');
    const v2Path = await v2Download.path();
    const v2Csv = v2Path ? fs.readFileSync(v2Path, 'utf-8') : '';
    expect(v2Csv).toContain(vendors.V2.name);
    expect(v2Csv).toContain(String(vendorPaymentAmount('VP2')));
  });
});
