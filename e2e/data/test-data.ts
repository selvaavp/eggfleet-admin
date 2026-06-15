/**
 * Central, editable test data for the EggFleet E2E suite (Playwright admin web +
 * API-driven driver-side setup). Edit the values below to run the whole suite
 * against different numbers/names — all downstream amounts (totals, balances,
 * net profit, etc.) are derived from these values via the formula helpers at
 * the bottom of this file, mirroring the backend formulas F1-F15 documented in
 * docs/e2e-test-plan.md.
 *
 * A run-specific seed is mixed into names/phone numbers so the suite can be
 * re-run repeatedly against the same database without colliding with records
 * created by earlier runs (set E2E_RUN_ID to pin/reuse a specific seed).
 */

// ─── Run identity ──────────────────────────────────────────────────────────

export const runSeed = process.env.E2E_RUN_ID ?? String(Date.now() % 1000000).padStart(6, '0');

function digits(n: number, len: number): string {
  return Math.abs(Math.trunc(n)).toString().padStart(len, '0').slice(-len);
}

/** 10-digit numeric phone, unique per run + index. */
function phone(idx: number): string {
  return `9${digits(Number(runSeed), 6)}${digits(idx, 3)}`;
}

function name(base: string): string {
  return `${base} ${runSeed}`;
}

// ─── Environment ───────────────────────────────────────────────────────────

export const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
export const apiBaseURL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

export const admin = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'admin@eggfleet.local',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'Admin123!',
};

/** Date used for all assignments/deliveries/payments/handovers/expenses created by this run. */
export const scenarioDate = process.env.E2E_DATE ?? new Date().toISOString().slice(0, 10);

// ─── Phase 1: Vendors, Routes, Stores, Vans, Drivers ───────────────────────

export const vendors = {
  V1: {
    name: name('Sri Lakshmi Farms'),
    phone: phone(1),
    address: '12 Market Road, Hyderabad',
    bankName: 'State Bank of India',
    accountNumber: '1234567890',
    ifsc: 'SBIN0001234',
  },
  V2: {
    name: name('Annapoorna Eggs'),
    phone: phone(2),
    address: '45 Farm Lane, Hyderabad',
    bankName: 'HDFC Bank',
    accountNumber: '0987654321',
    ifsc: 'HDFC0001234',
  },
};

export const routes = {
  R1: { name: name('North Route') },
  R2: { name: name('South Route') },
};

export const stores = {
  S1: { name: name('Ravi Kirana Store'), owner: 'Ravi Kumar', phone: phone(11), address: '12 North Main Road, Hyderabad', routeCode: 'R1' as const },
  S2: { name: name('Shree Medicals'), owner: 'Suresh Rao', phone: phone(12), address: '34 North Main Road, Hyderabad', routeCode: 'R1' as const },
  S3: { name: name('Kumar Supermarket'), owner: 'Kumar Swamy', phone: phone(13), address: '56 South Avenue, Hyderabad', routeCode: 'R2' as const },
  S4: { name: name('Priya General Store'), owner: 'Priya Devi', phone: phone(14), address: '78 South Avenue, Hyderabad', routeCode: 'R2' as const },
};

export const vans = {
  Van1: { number: `TN-E2E-${runSeed}-A`, name: name('Van Alpha'), capacity: 500 },
  Van2: { number: `TN-E2E-${runSeed}-B`, name: name('Van Beta'), capacity: 300 },
};

export const drivers = {
  D1: { name: name('Ramesh Kumar'), phone: phone(21) },
  D2: { name: name('Suresh Pillai'), phone: phone(22) },
};

// ─── Phase 2: Inventory batches, Assignments & Van Loads, Damaged Eggs ─────

export const inventory = {
  B1: { vendorCode: 'V1' as const, totalUnits: 1000, goodUnits: 1000, rate: 5.5 },
  B2: { vendorCode: 'V2' as const, totalUnits: 600, goodUnits: 590, rate: 6.0 },
};

export const assignments = {
  A1: {
    driverCode: 'D1' as const,
    vanCode: 'Van1' as const,
    routeCode: 'R1' as const,
    loads: [
      { batchCode: 'B1' as const, units: 200 },
      { batchCode: 'B2' as const, units: 100 },
    ],
  },
  A2: {
    driverCode: 'D2' as const,
    vanCode: 'Van2' as const,
    routeCode: 'R2' as const,
    loads: [
      { batchCode: 'B1' as const, units: 150 },
      { batchCode: 'B2' as const, units: 80 },
    ],
  },
};

/** DMG3 (STORAGE) is recorded without a batch — backend picks the oldest (FIFO), which is B1 here. */
export const damagedEggs = {
  DMG1: { reason: 'LOADING' as const, batchCode: 'B1' as const, count: 10 },
  DMG2: { reason: 'TRANSIT' as const, batchCode: 'B1' as const, count: 5 },
  DMG3: { reason: 'STORAGE' as const, batchCode: undefined, fifoBatchCode: 'B1' as const, count: 15 },
};

// ─── Phase 3: Driver deliveries (created via mobile UI / Maestro) ──────────

export const deliveries = {
  DEL1: {
    driverCode: 'D1' as const,
    assignmentCode: 'A1' as const,
    storeCode: 'S1' as const,
    items: [{ batchCode: 'B1' as const, qty: 50 }],
  },
  DEL2: {
    driverCode: 'D1' as const,
    assignmentCode: 'A1' as const,
    storeCode: 'S2' as const,
    items: [
      { batchCode: 'B1' as const, qty: 20 },
      { batchCode: 'B2' as const, qty: 15 },
    ],
  },
  DEL3: {
    driverCode: 'D2' as const,
    assignmentCode: 'A2' as const,
    storeCode: 'S3' as const,
    items: [{ batchCode: 'B1' as const, qty: 40 }],
  },
  DEL4: {
    driverCode: 'D2' as const,
    assignmentCode: 'A2' as const,
    storeCode: 'S4' as const,
    // 15 (not 80) so this fits within A2's loaded B2 units (80) even after
    // prior dev-iteration runs of this same seed have already sold some of
    // A2's B2 stock to S4.
    items: [{ batchCode: 'B2' as const, qty: 15 }],
  },
};

// ─── Phase 3/4: Driver deliveries & payments (created via mobile UI / Maestro,
//                verified & approved/rejected via Admin UI / Playwright) ─────
//
// Each delivery goes to its own store and exercises one distinct outcome, so
// the mobile DeliveryStopCard for each store is never ambiguous:
//   DEL1 -> Fully Paid, CASH   -> admin APPROVE -> PAID
//   DEL2 -> Partial,    UPI+proof -> admin APPROVE -> PARTIAL (balance 80)
//   DEL3 -> Fully Paid, CASH   -> admin REJECT  -> reverts to UNPAID
//   DEL4 -> Unpaid (no payment), then "Collect Payment" -> Fully Paid, CASH
//           -> admin APPROVE -> PAID

export const payments = {
  PAY1: { driverCode: 'D1' as const, deliveryCodes: ['DEL1'] as const, amount: 'full' as const, method: 'CASH' as const, outcome: 'APPROVE' as const },
  PAY2: { driverCode: 'D1' as const, deliveryCodes: ['DEL2'] as const, amount: 120, method: 'UPI' as const, outcome: 'APPROVE' as const, withProof: true },
  PAY3: { driverCode: 'D2' as const, deliveryCodes: ['DEL3'] as const, amount: 'full' as const, method: 'CASH' as const, outcome: 'REJECT' as const, rejectionReason: 'Proof unclear' },
  PAY4: { driverCode: 'D2' as const, deliveryCodes: ['DEL4'] as const, amount: 'full' as const, method: 'CASH' as const, outcome: 'APPROVE' as const },
};

// ─── Phase 5: Handovers (submitted via mobile UI / Maestro, approved/rejected
//               via Admin UI / Playwright) ────────────────────────────────
//
// F14 cash pre-fill is computed at *submission* time (before admin acts), so
// PAY3 (CASH, later rejected) is still counted in D2's handover cash amount —
// see driverCashSubmitted() below and docs/e2e-test-plan.md item 4.16.

export const handovers = {
  HO1: {
    driverCode: 'D1' as const,
    assignmentCode: 'A1' as const,
    handoverTime: '18:30',
    damagedOverrides: {} as Record<string, number>,
    outcome: 'APPROVE' as const,
  },
  HO2: {
    driverCode: 'D2' as const,
    assignmentCode: 'A2' as const,
    handoverTime: '18:45',
    /** Extra damaged units the driver reports at handover, keyed by batch code (within this assignment's loads). */
    damagedOverrides: { B1: 2 } as Record<string, number>,
    outcome: 'REJECT' as const,
    rejectionReason: 'Cash count mismatch, please recount',
  },
};

// ─── Phase 6: Vendor Payments & Expenses ───────────────────────────────────

export const vendorPayments = {
  VP1: { vendorCode: 'V1' as const, amount: 2000, method: 'CASH' as const, notes: 'Partial settlement' },
  VP2: { vendorCode: 'V2' as const, amount: 'full' as const, method: 'CASH' as const, notes: 'Full settlement' },
};

export const expenses = {
  EXP1: { category: 'COMPANY' as const, title: 'Office Rent', amount: 5000, vanCode: undefined },
  EXP2: { category: 'VEHICLE' as const, title: 'Diesel Refill', amount: 1200, vanCode: 'Van1' as const },
  EXP3: { category: 'OTHER' as const, title: 'Misc. Tools Purchase', amount: 350, vanCode: undefined },
  EXP_NEG: { category: 'VEHICLE' as const, title: 'Tyre repair', amount: 500, vanCode: undefined },
};

// ─── Formula helpers (F1-F15, see docs/e2e-test-plan.md §2) ────────────────

export function batchRate(batchCode: keyof typeof inventory): number {
  return inventory[batchCode].rate;
}

/** F1: delivery total = Σ (qty × ratePerUnit) over its items. */
export function deliveryTotal(deliveryCode: keyof typeof deliveries): number {
  const d = deliveries[deliveryCode];
  return d.items.reduce((sum, item) => sum + item.qty * batchRate(item.batchCode), 0);
}

/** F1 helper: total units in a delivery. */
export function deliveryUnits(deliveryCode: keyof typeof deliveries): number {
  const d = deliveries[deliveryCode];
  return d.items.reduce((sum, item) => sum + item.qty, 0);
}

/** F2: van-load soldUnits for a given assignment+batch = Σ delivered qty against that load. */
export function soldUnits(assignmentCode: keyof typeof assignments, batchCode: keyof typeof inventory): number {
  let sold = 0;
  for (const d of Object.values(deliveries)) {
    if (d.assignmentCode !== assignmentCode) continue;
    for (const item of d.items) {
      if (item.batchCode === batchCode) sold += item.qty;
    }
  }
  return sold;
}

/** F10: van current stock for a load = loadedUnits - soldUnits. */
export function vanCurrentStock(assignmentCode: keyof typeof assignments, batchCode: keyof typeof inventory): number {
  const a = assignments[assignmentCode];
  const load = a.loads.find((l) => l.batchCode === batchCode);
  const loaded = load?.units ?? 0;
  return Math.max(0, loaded - soldUnits(assignmentCode, batchCode));
}

/** F3: total units loaded onto vans from a given batch (reduces availableUnits). */
export function totalLoadedFromBatch(batchCode: keyof typeof inventory): number {
  let total = 0;
  for (const a of Object.values(assignments)) {
    for (const load of a.loads) {
      if (load.batchCode === batchCode) total += load.units;
    }
  }
  return total;
}

/** F4: total damaged units charged against a batch (DMG3/STORAGE resolves to its FIFO batch). */
export function totalDamagedFromBatch(batchCode: keyof typeof inventory): number {
  let total = 0;
  for (const dmg of Object.values(damagedEggs)) {
    const resolved = dmg.batchCode ?? dmg.fifoBatchCode;
    if (resolved === batchCode) total += dmg.count;
  }
  return total;
}

/** Batch availableUnits after all loads + damage in this scenario. */
export function batchAvailable(batchCode: keyof typeof inventory): number {
  const b = inventory[batchCode];
  return b.goodUnits - totalLoadedFromBatch(batchCode) - totalDamagedFromBatch(batchCode);
}

/** F11: total damaged eggs across all inventory-level entries created in this run. */
export function totalDamagedEggs(): number {
  return Object.values(damagedEggs).reduce((sum, d) => sum + d.count, 0);
}

/** Resolve a payment's "full"/numeric amount. */
export function paymentAmount(paymentCode: keyof typeof payments): number {
  const p = payments[paymentCode];
  if (p.amount === 'full') {
    return p.deliveryCodes.reduce((sum, dc) => sum + deliveryTotal(dc), 0);
  }
  return p.amount;
}

/** F5: a delivery's paymentStatus after all (non-rejected) payments against it. */
export function deliveryPaymentStatus(deliveryCode: keyof typeof deliveries): 'UNPAID' | 'PARTIAL' | 'PAID' {
  const total = deliveryTotal(deliveryCode);
  let paid = 0;
  for (const [code, p] of Object.entries(payments)) {
    if (p.outcome === 'REJECT') continue;
    if (p.deliveryCodes.includes(deliveryCode as never)) paid += paymentAmount(code as keyof typeof payments);
  }
  if (paid <= 0) return 'UNPAID';
  if (paid >= total) return 'PAID';
  return 'PARTIAL';
}

/** F6: driver cash-in-hand = Σ CASH payment.amount (status != REJECTED) for that driver. */
export function driverCashInHand(driverCode: keyof typeof drivers): number {
  let total = 0;
  for (const [code, p] of Object.entries(payments)) {
    if (p.outcome === 'REJECT' || p.method !== 'CASH' || p.driverCode !== driverCode) continue;
    total += paymentAmount(code as keyof typeof payments);
  }
  return total;
}

/** F7: store pending balance = max(0, totalSalesAmount - totalCollected). */
export function storePendingBalance(storeCode: keyof typeof stores): number {
  let sales = 0;
  let collected = 0;
  for (const [dCode, d] of Object.entries(deliveries)) {
    if (d.storeCode !== storeCode) continue;
    const total = deliveryTotal(dCode as keyof typeof deliveries);
    sales += total;
    for (const [pCode, p] of Object.entries(payments)) {
      if (p.outcome === 'REJECT') continue;
      if (p.deliveryCodes.includes(dCode as never)) collected += paymentAmount(pCode as keyof typeof payments);
    }
  }
  return Math.max(0, sales - collected);
}

/** F8 input: vendor saleEggValue = Σ (goodUnits × ratePerUnit) for that vendor's batches in this run. */
export function vendorSaleEggValue(vendorCode: keyof typeof vendors): number {
  let total = 0;
  for (const b of Object.values(inventory)) {
    if (b.vendorCode === vendorCode) total += b.goodUnits * b.rate;
  }
  return total;
}

/** F9 input: vendor soldRevenue = Σ (deliveredQty × ratePerUnit) across deliveries fulfilled from that vendor's batches. */
export function vendorSoldRevenue(vendorCode: keyof typeof vendors): number {
  let total = 0;
  for (const d of Object.values(deliveries)) {
    for (const item of d.items) {
      if (inventory[item.batchCode].vendorCode === vendorCode) total += item.qty * batchRate(item.batchCode);
    }
  }
  return total;
}

/** F9: vendor net profit = soldRevenue - saleEggValue. */
export function vendorNetProfit(vendorCode: keyof typeof vendors): number {
  return vendorSoldRevenue(vendorCode) - vendorSaleEggValue(vendorCode);
}

/** Resolve a vendor payment's "full"/numeric amount (full = that vendor's saleEggValue). */
export function vendorPaymentAmount(code: keyof typeof vendorPayments): number {
  const vp = vendorPayments[code];
  if (vp.amount === 'full') return vendorSaleEggValue(vp.vendorCode);
  return vp.amount;
}

/** F8: vendor pending balance = max(0, saleEggValue - totalPaid). */
export function vendorPendingBalance(vendorCode: keyof typeof vendors): number {
  let paid = 0;
  for (const [code, vp] of Object.entries(vendorPayments)) {
    if (vp.vendorCode === vendorCode) paid += vendorPaymentAmount(code as keyof typeof vendorPayments);
  }
  return Math.max(0, vendorSaleEggValue(vendorCode) - paid);
}

/** F12: total expenses created by this run (excludes EXP_NEG, which is expected to be rejected with 400). */
export function totalExpenses(): number {
  return expenses.EXP1.amount + expenses.EXP2.amount + expenses.EXP3.amount;
}

export function expensesByCategory(): Record<'COMPANY' | 'VEHICLE' | 'OTHER', number> {
  return {
    COMPANY: expenses.EXP1.amount,
    VEHICLE: expenses.EXP2.amount,
    OTHER: expenses.EXP3.amount,
  };
}

/** F13 inputs: totalCollected = Σ payment.amount where status != REJECTED, across this run's payments. */
export function totalCollected(): number {
  let total = 0;
  for (const [code, p] of Object.entries(payments)) {
    if (p.outcome === 'REJECT') continue;
    total += paymentAmount(code as keyof typeof payments);
  }
  return total;
}

export function totalVendorPayments(): number {
  return Object.keys(vendorPayments).reduce(
    (sum, code) => sum + vendorPaymentAmount(code as keyof typeof vendorPayments),
    0,
  );
}

/** F13: net profit (delta) = totalCollected - totalVendorPayments - totalExpenses, for this run's data only. */
export function netProfitDelta(): number {
  return totalCollected() - totalVendorPayments() - totalExpenses();
}

/**
 * F14 input: Σ CASH payment.amount *submitted* by a driver, regardless of the
 * eventual admin outcome. Handover submission happens before the admin
 * approves/rejects pending payments, so a payment that is later REJECTED
 * (e.g. PAY3) is still counted here — see docs/e2e-test-plan.md item 4.16.
 * Contrast with driverCashInHand(), which reflects the post-resolution state.
 */
export function driverCashSubmitted(driverCode: keyof typeof drivers): number {
  let total = 0;
  for (const [code, p] of Object.entries(payments)) {
    if (p.method !== 'CASH' || p.driverCode !== driverCode) continue;
    total += paymentAmount(code as keyof typeof payments);
  }
  return total;
}

/** F14: handover cashAmount pre-fill = Σ CASH payment.amount submitted by that driver (before admin approve/reject). */
export function handoverCashAmount(driverCode: keyof typeof drivers): number {
  return driverCashSubmitted(driverCode);
}

/** F15: handover egg item "Good" units pre-fill for a load = loadedUnits - soldUnits (before driver overrides). */
export function handoverGoodUnits(assignmentCode: keyof typeof assignments, batchCode: keyof typeof inventory): number {
  return vanCurrentStock(assignmentCode, batchCode);
}

/** F11 (delivery side): total extra-damaged units reported across all handovers in this run. */
export function totalHandoverDamagedEggs(): number {
  let total = 0;
  for (const ho of Object.values(handovers)) {
    total += Object.values(ho.damagedOverrides).reduce((s, v) => s + v, 0);
  }
  return total;
}
