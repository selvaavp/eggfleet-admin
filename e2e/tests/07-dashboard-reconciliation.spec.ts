import { test, expect, type Page } from '@playwright/test';
import { vans, routes, drivers, totalCollected, totalExpenses, totalDamagedEggs, handovers } from '../data/test-data';
import { statCard, statCardValue } from '../utils/ui';

/**
 * A row in the "Today's Van Status" table for the van with `vanNumber`.
 * Scoped to that section specifically because the Transaction Ledger below
 * it also renders each van's number (e.g. "Van #TN-E2E-100001-A"), so a
 * page-wide `tableRow()` would match both tables.
 */
function vanStatusRow(page: Page, vanNumber: string) {
  const section = page.locator('section').filter({ has: page.getByRole('heading', { name: "Today's Van Status" }) });
  return section.locator('tbody tr').filter({ hasText: vanNumber });
}

/**
 * Phase 7 — Dashboard / Net Profit Reconciliation (docs/e2e-test-plan.md §11).
 *
 * The Dashboard's StatCards are month-to-date aggregates shared across every
 * E2E run (and the wider dev DB), so most of them grow each time Phase 6
 * (vendor payments & expenses) is re-run with this seed. Rather than
 * asserting exact formula values — which only hold for a single pristine
 * run — this spec checks: (a) every card from §11 renders with a sane
 * non-negative number that is at least this scenario's contribution (F1/F12/
 * F11 lower bounds), (b) the Net Profit card's color/icon always matches its
 * sign (7.4), and (c) the Van Status table reflects this run's Van Alpha (A1,
 * COMPLETED) and Van Beta (A2, ACTIVE) — covering 7.6-7.7.
 *
 * 7.2 (Total Vendor Payments) and 7.11 (DB cross-check via SQL) have no
 * dedicated Dashboard UI element and are out of scope for a UI-driven suite.
 * 7.8-7.9 (Active Assignments / Pending Handovers counts) have no dedicated
 * StatCard either and are already verified via /assignments and /handovers in
 * 05-handovers-admin.spec.ts (5.11); here they're reflected only through the
 * Van Status table's per-row status tint (7.6-7.7).
 */

test.describe('Phase 7 — Dashboard / Net Profit Reconciliation', () => {
  test('7.1, 7.3, 7.5, 7.10 dashboard StatCards show non-negative totals covering this scenario', async ({ page }) => {
    await page.goto('/');

    // 7.1: Total Sale >= this run's totalCollected (F1).
    expect(await statCardValue(page, 'Total Sale')).toBeGreaterThanOrEqual(totalCollected());

    // 7.3: Total Expenses >= this run's totalExpenses (F12).
    expect(await statCardValue(page, 'Total Expenses')).toBeGreaterThanOrEqual(totalExpenses());

    // 7.5: Damaged eggs >= this run's load damage (F11/DMG1-3) + HO2's reported delivery damage.
    const expectedDamage = totalDamagedEggs() + (handovers.HO2.damagedOverrides.B1 ?? 0);
    expect(await statCardValue(page, 'Damaged eggs')).toBeGreaterThanOrEqual(expectedDamage);

    // 7.10: Total Stock / Available Units render as sane, related numbers.
    const totalStock = await statCardValue(page, 'Total Stock');
    const availableUnits = await statCardValue(page, 'Available Units');
    expect(totalStock).toBeGreaterThan(0);
    expect(availableUnits).toBeGreaterThanOrEqual(0);
    expect(availableUnits).toBeLessThanOrEqual(totalStock);
  });

  test('7.4 Net Profit StatCard color/icon match its sign', async ({ page }) => {
    await page.goto('/');

    const netProfit = await statCardValue(page, 'Net Profit');
    const card = statCard(page, 'Net Profit');
    const iconBox = card.locator('span').first();
    const iconBoxClass = (await iconBox.getAttribute('class')) ?? '';

    // Dashboard data is cumulative and may legitimately be 0 in a fresh DB,
    // which renders with the "profit" (purple/TrendingUp) styling.
    if (netProfit < 0) {
      expect(iconBoxClass).toContain('bg-[#FDE8EC]');
      await expect(iconBox.locator('svg.lucide-trending-down')).toBeVisible();
    } else {
      expect(iconBoxClass).toContain('bg-[#FAF5FF]');
      await expect(iconBox.locator('svg.lucide-trending-up')).toBeVisible();
    }
  });

  test('7.6-7.7 Van Status table reflects Van Alpha (A1, completed) and Van Beta (A2, active)', async ({ page }) => {
    await page.goto('/');

    // Van Alpha (A1) is COMPLETED (5.11): its icon tile is neutral-tinted
    // (status overrides load-ratio coloring), loaded = 300 (200 B1 + 100 B2,
    // §3.6), and balance stock is stable at 215 (130 B1 + 85 B2, §11 7.6)
    // since a COMPLETED assignment can take no further deliveries.
    const alphaRow = vanStatusRow(page, vans.Van1.number);
    await expect(alphaRow).toContainText(drivers.D1.name);
    await expect(alphaRow).toContainText(routes.R1.name);
    await expect(alphaRow).toContainText('300');
    await expect(alphaRow.locator('span').first()).toHaveClass(/bg-neutral-100/);
    await expect(alphaRow.locator('td').last().locator('span')).toHaveText('215');

    // Van Beta (A2) is ACTIVE (5.11): its icon tile is emerald-tinted (load
    // ratio > 20%), and loaded stays at 230 (150 B1 + 80 B2, §3.6). Balance
    // stock only decreases as D2 makes further deliveries in later
    // dev-iteration runs, so just check it's a sane number within range.
    const betaRow = vanStatusRow(page, vans.Van2.number);
    await expect(betaRow).toContainText(drivers.D2.name);
    await expect(betaRow).toContainText(routes.R2.name);
    await expect(betaRow).toContainText('230');
    await expect(betaRow.locator('span').first()).toHaveClass(/bg-emerald-50/);
    const betaBalance = Number((await betaRow.locator('td').last().locator('span').textContent()) ?? '0');
    expect(betaBalance).toBeGreaterThanOrEqual(0);
    expect(betaBalance).toBeLessThanOrEqual(230);
  });
});
