import { type Page, type Locator, expect } from '@playwright/test';
import { admin } from '../data/test-data';

/**
 * Generic Playwright helpers shared by every spec in this suite. These exist
 * because the admin web app's <Modal> has no role="dialog" and its row-action
 * menus are portaled to document.body, so plain getByRole() locators aren't
 * enough on their own — see e2e/README.md for the conventions this encodes.
 */

// ─── Auth ───────────────────────────────────────────────────────────────────

/** Full UI login flow (used by auth.setup.ts and by Phase 9 "wrong credentials" / re-login tests). */
export async function loginAsAdmin(page: Page, email = admin.email, password = admin.password) {
  await page.goto('/login');
  await page.getByLabel('Email Address').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /log\s*out/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

// ─── Navigation ─────────────────────────────────────────────────────────────

/** Click a sidebar nav item by its visible label (e.g. "Customer", "Vendor", "Van & Route"). */
export async function gotoSection(page: Page, label: string) {
  await page.getByRole('link', { name: label }).click();
}

// ─── Modals ─────────────────────────────────────────────────────────────────

/**
 * Scope a Locator to the open <Modal> whose title heading matches `title`.
 * The Modal component renders no role="dialog", so we anchor on the
 * `.fixed.inset-0` overlay that contains the <h2> title.
 */
export function modal(page: Page, title: string | RegExp): Locator {
  return page.locator('.fixed.inset-0').filter({ has: page.getByRole('heading', { name: title }) });
}

/** Wait for a modal with this title to be visible, returning its Locator. */
export async function expectModal(page: Page, title: string | RegExp): Promise<Locator> {
  const m = modal(page, title);
  await expect(m).toBeVisible();
  return m;
}

/** Close the currently-open modal with the given title via its header "Close" (X) button. */
export async function closeModal(page: Page, title: string | RegExp) {
  await modal(page, title).getByRole('button', { name: 'Close' }).click();
  await expect(modal(page, title)).not.toBeVisible();
}

// ─── Toasts ─────────────────────────────────────────────────────────────────

/** Assert a react-hot-toast notification containing `text` appears (and let it auto-dismiss). */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}

// ─── Tables & row-action menus ─────────────────────────────────────────────

/** Locate a <tr> in the main content area whose cells contain all of `text`. */
export function tableRow(page: Page, text: string | RegExp): Locator {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * Open the "Row actions" (⋮) menu for a table row and return the portaled
 * <div role="menu"> Locator. The menu is appended to document.body, so it is
 * looked up from `page`, not from `row`.
 */
export async function openRowMenu(page: Page, row: Locator): Promise<Locator> {
  await row.getByRole('button', { name: 'Row actions' }).click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  return menu;
}

/** Click a menuitem (Edit / Delete / etc.) inside an open row-actions menu. */
export async function clickMenuItem(page: Page, name: string | RegExp) {
  await page.getByRole('menuitem', { name }).click();
}

// ─── Destructive confirm modals ────────────────────────────────────────────

/**
 * Confirm a "Delete X?" modal (title e.g. "Delete Vendor") by clicking its
 * danger-styled confirm button (default label "Delete").
 */
export async function confirmDelete(page: Page, modalTitle: string | RegExp, buttonName: string | RegExp = 'Delete') {
  const m = await expectModal(page, modalTitle);
  await m.getByRole('button', { name: buttonName }).click();
  await expect(m).not.toBeVisible();
}

// ─── Dashboard stat cards ───────────────────────────────────────────────────

/** Locate a dashboard StatCard by its title (e.g. "Total Stock", "Available Units"). */
export function statCard(page: Page, title: string): Locator {
  return page.locator('.rounded-2xl.border.border-primary.bg-white').filter({ hasText: title });
}

/** Read a StatCard's numeric value, stripping currency symbols/commas (e.g. "₹1,590" -> 1590). */
export async function statCardValue(page: Page, title: string): Promise<number> {
  const text = (await statCard(page, title).locator('p').last().textContent()) ?? '0';
  return Number(text.replace(/[^0-9.-]/g, '')) || 0;
}

// ─── Store/vendor detail KPI cards ─────────────────────────────────────────

/**
 * Locate a `StoreKpiCard`/`VendorKpiCard`-style detail-page summary card by its
 * label (e.g. "Pending Amount", "Total Collected"). These use `rounded-[12px]`
 * (distinct from the dashboard's `rounded-2xl` StatCards).
 */
export function kpiCard(page: Page, label: string): Locator {
  return page.locator('div.rounded-\\[12px\\]').filter({ hasText: label });
}

/**
 * Read a detail-page KPI card's numeric value, stripping currency symbols/commas.
 * `StoreKpiCard` wraps its value in a `<span>`; `VendorKpiCard` renders plain
 * string values directly as the card's text (no `<span>`), so fall back to the
 * whole card's text with the label removed in that case.
 */
export async function kpiCardValue(page: Page, label: string): Promise<number> {
  const card = kpiCard(page, label);
  const span = card.locator('span').first();
  const text = (await span.count()) > 0
    ? await span.textContent()
    : (await card.textContent())?.replace(label, '');
  return Number((text ?? '0').replace(/[^0-9.-]/g, '')) || 0;
}

// ─── Inventory-batch <select> options ──────────────────────────────────────

/**
 * Both the "Assign Van" stock-loading rows and the Damage Entry modal render
 * inventory options as "{vendorName} — ₹{rate}/unit · {avail} avail.". The
 * "avail." count changes as the scenario progresses, so match on the stable
 * vendor+rate prefix and select by the option's actual value (inventory id).
 */
export async function selectInventoryOption(select: Locator, vendorName: string, rate: number) {
  const option = select.locator('option', { hasText: `${vendorName} — ₹${rate.toFixed(2)}/unit` });
  const value = await option.getAttribute('value');
  await select.selectOption(value!);
}

/**
 * Read the current "{n} avail." count for the inventory batch matching
 * `vendorName` + `rate`, from an already-open inventory <select> (Damage Entry
 * or Assign Van stock-loading rows). Used by Phase 9 edge-case tests that need
 * to compute an over-the-limit value relative to the batch's live balance.
 */
export async function inventoryAvailableUnits(select: Locator, vendorName: string, rate: number): Promise<number> {
  const option = select.locator('option', { hasText: `${vendorName} — ₹${rate.toFixed(2)}/unit` });
  const text = (await option.textContent()) ?? '';
  const match = text.match(/([\d,]+)\s*avail/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

/** Read the "DAMAGED EGG" column (5th cell) of an inventory table row, e.g. "30 Units" -> 30. */
export async function inventoryDamagedUnits(row: Locator): Promise<number> {
  const text = (await row.locator('td').nth(4).textContent()) ?? '0';
  return Number(text.replace(/[^0-9.-]/g, '')) || 0;
}
