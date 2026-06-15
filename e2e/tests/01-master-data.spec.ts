import { test, expect } from '@playwright/test';
import { vendors, routes, stores, vans, drivers } from '../data/test-data';
import { gotoSection, expectModal, expectToast, tableRow } from '../utils/ui';

/**
 * Phase 1 — Master Data Setup (docs/e2e-test-plan.md §5, items 1.1-1.12).
 *
 * Items 1.13/1.14 (driver mobile login) are covered by the Maestro suite,
 * which must run after this spec so D1/D2 exist as DRIVER users.
 */

test.describe('Phase 1 — Master Data Setup', () => {
  test('1.1-1.2 create vendors V1 and V2', async ({ page }) => {
    await page.goto('/vendors');

    for (const v of Object.values(vendors)) {
      await page.getByRole('button', { name: 'Add Vendor' }).first().click();
      const m = await expectModal(page, 'Add New Vendor');

      await m.getByLabel('Vendor Name').fill(v.name);
      await m.getByLabel('Phone Number').fill(v.phone);
      await m.getByLabel('Full Address').fill(v.address);
      await m.getByLabel('Bank Name').fill(v.bankName);
      await m.getByLabel('Account Number').fill(v.accountNumber);
      await m.getByLabel('IFSC Code').fill(v.ifsc);

      await m.getByRole('button', { name: 'Save Vendor' }).click();
      await expectToast(page, 'Vendor created');
      await expect(m).not.toBeVisible();
      await expect(tableRow(page, v.name)).toBeVisible();
    }

    // Both vendors now appear in the directory.
    await expect(tableRow(page, vendors.V1.name)).toBeVisible();
    await expect(tableRow(page, vendors.V2.name)).toBeVisible();
  });

  test('1.3-1.4 create routes R1 and R2', async ({ page }) => {
    await page.goto('/routes');

    for (const r of Object.values(routes)) {
      await page.getByRole('button', { name: 'Add Route' }).click();
      const m = await expectModal(page, 'Add New Route');

      await m.getByLabel('Route Name').fill(r.name);

      await m.getByRole('button', { name: 'Create Route' }).click();
      await expectToast(page, 'Route created successfully');
      await expect(m).not.toBeVisible();
      await expect(tableRow(page, r.name)).toBeVisible();
    }
  });

  test('1.5-1.8 create stores S1-S4, each on its route', async ({ page }) => {
    await page.goto('/stores');

    for (const s of Object.values(stores)) {
      const routeName = routes[s.routeCode].name;

      await page.getByRole('button', { name: 'Add New Customer' }).first().click();
      const m = await expectModal(page, 'Register New Store');

      await m.getByLabel('Store Name').fill(s.name);
      await m.getByLabel('Owner/Contact Person').fill(s.owner);
      await m.getByLabel('Phone Number').fill(s.phone);
      await m.getByLabel('Full Address').fill(s.address);
      await m.getByLabel('Van / Route').selectOption({ label: routeName });

      await m.getByRole('button', { name: 'Save & Register Store' }).click();
      await expectToast(page, 'Store registered successfully');
      await expect(m).not.toBeVisible();
      await expect(tableRow(page, s.name)).toBeVisible();
    }

    // Routes page: North Route (R1) should show 2 stores, South Route (R2) 2 stores.
    await gotoSection(page, 'Routes');
    await expect(page).toHaveURL(/\/routes/);
    await expect(tableRow(page, routes.R1.name)).toContainText('2 stores');
    await expect(tableRow(page, routes.R2.name)).toContainText('2 stores');
  });

  test('1.9-1.10 create vans Van1 and Van2', async ({ page }) => {
    await page.goto('/vans');

    for (const v of Object.values(vans)) {
      await page.getByRole('button', { name: 'Create Van' }).click();
      const m = await expectModal(page, 'Create New Van');

      await m.getByLabel('Van Number').fill(v.number);
      await m.getByLabel('Van Name').fill(v.name);
      await m.getByLabel('Load Capacity (eggs)').fill(String(v.capacity));

      await m.getByRole('button', { name: 'Create Van' }).click();
      await expectToast(page, 'Van created');
      await expect(m).not.toBeVisible();
      // Vans render as cards/buttons in the "Fleet Overview" sidebar, not a table.
      await expect(page.getByRole('button', { name: new RegExp(v.name) })).toBeVisible();
    }
  });

  test('1.11-1.12 create drivers D1 and D2', async ({ page }) => {
    await page.goto('/employees');

    for (const d of Object.values(drivers)) {
      await page.getByRole('button', { name: 'Add Employee' }).click();
      const m = await expectModal(page, 'Add New Employee');

      await m.getByLabel('Employee Name').fill(d.name);
      await m.getByLabel('Phone Number').fill(d.phone);

      await m.getByRole('button', { name: 'Create Personnel Profile' }).click();
      await expectToast(page, 'Employee created');
      await expect(m).not.toBeVisible();

      const row = tableRow(page, d.name);
      await expect(row).toBeVisible();
      await expect(row).toContainText('Active');
    }
  });
});
