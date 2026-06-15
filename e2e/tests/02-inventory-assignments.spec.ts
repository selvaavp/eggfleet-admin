import { test, expect } from '@playwright/test';
import { vendors, vans, routes, drivers, assignments, inventory, damagedEggs, totalDamagedEggs } from '../data/test-data';
import { expectModal, expectToast, tableRow, statCardValue, selectInventoryOption, inventoryDamagedUnits } from '../utils/ui';

/**
 * Phase 2 — Inventory Purchase & Van Loading (docs/e2e-test-plan.md §6, items
 * 2.1-2.17). Items 2.5/2.18/2.19 (mobile notification + home-screen load
 * summaries) are covered by the Maestro suite.
 *
 * The admin DB persists across runs, so dashboard StatCards reflect global
 * totals — every dashboard check here compares a "before" and "after" value
 * for THIS run's delta, rather than asserting an absolute number.
 */

test.describe('Phase 2 — Inventory Purchase & Van Loading', () => {
  test('2.1-2.3 record purchase entries B1/B2 and verify stock increases', async ({ page }) => {
    await page.goto('/dashboard');
    const totalStockBefore = await statCardValue(page, 'Total Stock');
    const availableBefore = await statCardValue(page, 'Available Units');

    await page.goto('/vendors');

    for (const b of Object.values(inventory)) {
      const vendor = vendors[b.vendorCode];

      await page.getByRole('button', { name: 'Purchase Entry' }).click();
      const m = await expectModal(page, 'New Purchase Entry');

      await m.getByLabel('Vendor Name').selectOption({ label: vendor.name });

      const numberInputs = m.locator('input[type="number"]');
      await numberInputs.nth(0).fill(String(b.rate)); // Rate Per Unit
      await numberInputs.nth(1).fill(String(b.totalUnits)); // Units / QTY (auto-sets Good Eggs = total)
      if (b.goodUnits !== b.totalUnits) {
        await numberInputs.nth(2).fill(String(b.goodUnits)); // Good Eggs (recomputes Damaged Eggs)
      }

      await m.getByRole('button', { name: 'Save Entry' }).click();
      await expectToast(page, 'Purchase entry created');
      await expect(m).not.toBeVisible();
    }

    // Inventory list reflects both batches with the correct rate/units/damage.
    await page.goto('/inventory');

    const b1Row = tableRow(page, vendors.V1.name);
    await expect(b1Row).toContainText('₹5.50');
    await expect(b1Row).toContainText('1,000 Units');
    await expect(b1Row).toContainText('0 Units');

    const b2Row = tableRow(page, vendors.V2.name);
    await expect(b2Row).toContainText('₹6.00');
    await expect(b2Row).toContainText('600 Units');
    await expect(b2Row).toContainText('10 Units');

    // 2.3: Total Stock and Available Units both increase by goodUnits(B1)+goodUnits(B2) = 1590.
    await page.goto('/dashboard');
    const expectedDelta = inventory.B1.goodUnits + inventory.B2.goodUnits;
    await expect(async () => {
      expect(await statCardValue(page, 'Total Stock')).toBe(totalStockBefore + expectedDelta);
      expect(await statCardValue(page, 'Available Units')).toBe(availableBefore + expectedDelta);
    }).toPass();
  });

  test('2.4-2.11 create assignments A1/A2 with initial van loads', async ({ page }) => {
    await page.goto('/dashboard');
    const availableBefore = await statCardValue(page, 'Available Units');

    await page.goto('/assignments');

    for (const a of Object.values(assignments)) {
      const van = vans[a.vanCode];
      const route = routes[a.routeCode];
      const driver = drivers[a.driverCode];

      await page.getByRole('button', { name: 'Assign Van' }).click();
      const m = await expectModal(page, 'Assign Van');

      await m.getByLabel('Van Name').selectOption({ label: van.name });
      await m.getByLabel('Select Route').selectOption({ label: route.name });
      await m.getByLabel('Assign Employee').selectOption({ label: driver.name });

      for (let i = 0; i < a.loads.length; i++) {
        const load = a.loads[i];
        const batch = inventory[load.batchCode];
        const vendor = vendors[batch.vendorCode];

        if (i > 0) {
          await m.getByRole('button', { name: 'More Load' }).click();
        }

        const vendorSelect = m.locator('select:not([id])').nth(i);
        await selectInventoryOption(vendorSelect, vendor.name, batch.rate);

        const qtyInput = m.locator('input[type="number"]').nth(i);
        await qtyInput.fill(String(load.units));
      }

      await m.getByRole('button', { name: 'Assign Van' }).click();
      await expectToast(page, 'Assignment created successfully');
      await expect(m).not.toBeVisible();

      const row = tableRow(page, driver.name);
      await expect(row).toBeVisible();
      await expect(row).toContainText(van.number);
      await expect(row).toContainText(route.name);
      await expect(row).toContainText('Active');
    }

    // 2.11: Available Units decreases by the total units loaded onto vans (200+100+150+80 = 530).
    const totalLoaded = Object.values(assignments)
      .flatMap((a) => a.loads)
      .reduce((sum, l) => sum + l.units, 0);

    await page.goto('/dashboard');
    await expect(async () => {
      expect(await statCardValue(page, 'Available Units')).toBe(availableBefore - totalLoaded);
    }).toPass();
  });

  test('2.12-2.17 record damaged eggs (DMG1-DMG3) and verify inventory + dashboard updates', async ({ page }) => {
    await page.goto('/dashboard');
    const availableBefore = await statCardValue(page, 'Available Units');

    await page.goto('/inventory');

    // DMG1+DMG2 explicitly target this run's B1 batch (10+5 = 15 added to its
    // damagedUnits). DMG3 (STORAGE) has no inventoryId — the backend deducts
    // FIFO from the oldest batch with available stock across the *whole* DB.
    // On a long-lived dev DB that's an older pre-existing batch (B1 stays at
    // +15); right after a DB reset, this run's B1 is the only/oldest batch,
    // so DMG3 also lands on it (B1 ends up at +30). Capture B1's baseline so
    // the delta can be asserted as a range covering both cases.
    const b1Row = tableRow(page, vendors.V1.name);
    const b1DamagedBefore = await inventoryDamagedUnits(b1Row);

    for (const dmg of Object.values(damagedEggs)) {
      await page.getByRole('button', { name: 'Damage Entry' }).click();
      const m = await expectModal(page, 'Damage Entry');

      if (dmg.batchCode) {
        const batch = inventory[dmg.batchCode];
        const vendor = vendors[batch.vendorCode];
        const batchSelect = m.locator('select').nth(0);
        await selectInventoryOption(batchSelect, vendor.name, batch.rate);
      }

      const reasonSelect = m.locator('select').nth(1);
      await reasonSelect.selectOption({ value: dmg.reason });

      await m.getByLabel('Damaged Egg Count').fill(String(dmg.count));

      await m.getByRole('button', { name: 'Record Damage' }).click();
      await expectToast(page, 'Damage recorded');
      await expect(m).not.toBeVisible();
    }

    await expect(async () => {
      const delta = (await inventoryDamagedUnits(b1Row)) - b1DamagedBefore;
      expect(delta).toBeGreaterThanOrEqual(15);
      expect(delta).toBeLessThanOrEqual(30);
    }).toPass();

    // B2's damagedUnits (10) is set at creation time (2.1-2.3: totalUnits 600,
    // goodUnits 590), independent of the damage entries above.
    const b2Row = tableRow(page, vendors.V2.name);
    await expect(b2Row).toContainText('10 Units');

    // 2.17: Available Units decreases by the total newly-damaged count (10+5+15 = 30).
    await page.goto('/dashboard');
    await expect(async () => {
      expect(await statCardValue(page, 'Available Units')).toBe(availableBefore - totalDamagedEggs());
    }).toPass();
  });
});
