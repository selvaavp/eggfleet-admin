/**
 * Prints `KEY=value` lines (one per line) derived from e2e/data/test-data.ts,
 * for use as `-e KEY=value` flags to `maestro test` (see eggfleet/.maestro/).
 *
 * Run with the SAME E2E_RUN_ID used for the Playwright admin run, so the
 * driver/store names and quantities line up with what Phase 1/2 created:
 *
 *   E2E_RUN_ID=100001 npx tsx e2e/scripts/generate-maestro-env.ts
 *
 * Usage from eggfleet/.maestro (bash, macOS/Linux):
 *
 *   while IFS='=' read -r key val; do args+=(-e "$key=$val"); done \
 *     < <(cd ../../eggfleet-admin && E2E_RUN_ID=100001 npx tsx e2e/scripts/generate-maestro-env.ts)
 *   maestro test "${args[@]}" 01-d1-login.yaml
 */

import {
  drivers,
  stores,
  inventory,
  deliveries,
  payments,
  handovers,
  handoverGoodUnits,
  paymentAmount,
  handoverCashAmount,
} from '../data/test-data';

const adminName = process.env.SEED_ADMIN_NAME ?? 'Local Admin';

const ho2B1Override = handovers.HO2.damagedOverrides.B1 ?? 0;
const ho2B1Good = handoverGoodUnits('A2', 'B1') - ho2B1Override;

const vars: Record<string, string | number> = {
  D1_PHONE: drivers.D1.phone,
  D1_NAME: drivers.D1.name,
  D2_PHONE: drivers.D2.phone,
  D2_NAME: drivers.D2.name,

  S1_NAME: stores.S1.name,
  S2_NAME: stores.S2.name,
  S3_NAME: stores.S3.name,
  S4_NAME: stores.S4.name,

  ADMIN_NAME: adminName,

  B1_RATE: String(Number(inventory.B1.rate)),
  B2_RATE: String(Number(inventory.B2.rate)),

  DEL1_B1_QTY: deliveries.DEL1.items.find(i => i.batchCode === 'B1')!.qty,
  DEL2_B1_QTY: deliveries.DEL2.items.find(i => i.batchCode === 'B1')!.qty,
  DEL2_B2_QTY: deliveries.DEL2.items.find(i => i.batchCode === 'B2')!.qty,
  DEL3_B1_QTY: deliveries.DEL3.items.find(i => i.batchCode === 'B1')!.qty,
  DEL4_B2_QTY: deliveries.DEL4.items.find(i => i.batchCode === 'B2')!.qty,

  PAY2_PARTIAL_AMOUNT: payments.PAY2.amount as number,

  HO2_B1_GOOD: ho2B1Good,
  HO2_B1_DAMAGE: ho2B1Override,

  // Phase 8 notification body amounts (admin-payments.service.ts /
  // admin-handovers.service.ts format these with .toFixed(2)).
  PAY1_AMOUNT: paymentAmount('PAY1').toFixed(2),
  PAY2_AMOUNT: paymentAmount('PAY2').toFixed(2),
  PAY3_AMOUNT: paymentAmount('PAY3').toFixed(2),
  PAY4_AMOUNT: paymentAmount('PAY4').toFixed(2),
  HO1_CASH_AMOUNT: handoverCashAmount('D1').toFixed(2),
};

for (const [key, value] of Object.entries(vars)) {
  console.log(`${key}=${value}`);
}
