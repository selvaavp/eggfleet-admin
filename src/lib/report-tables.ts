import type {
  DailySummaryOverall,
  DriverDailyReport,
  RateBreakdown,
  StoreDeliveryReport,
} from '@/types/reports.types';

/** Daily report sections as plain tables — shared by the Excel downloads and the printed report. */
export type ReportCell = string | number;

export interface ReportTable {
  title: string;
  headers: string[];
  rows: ReportCell[][];
  /** Metric/value table: each row's first cell names its value (and its unit). Gets no Total row. */
  rowLabels?: boolean;
  /** Headers of numeric columns that make no sense summed (percentages, counts that overlap). */
  noTotal?: string[];
  /** Header of a long free-text column (last in the table) that may use the spare width. */
  wideColumn?: string;
}

/** Which columns hold a number in every row. */
export function numericColumns(table: ReportTable): boolean[] {
  return table.headers.map((_, col) => table.rows.length > 0 && table.rows.every((r) => typeof r[col] === 'number'));
}

/** Column sums for the Total row; `null` where a sum makes no sense (text, first column, `noTotal`). */
export function columnTotals(table: ReportTable): (number | null)[] {
  const numeric = numericColumns(table);
  return table.headers.map((header, col) =>
    col > 0 && numeric[col] && !table.noTotal?.includes(header)
      ? Number(table.rows.reduce((sum, r) => sum + (r[col] as number), 0).toFixed(2))
      : null
  );
}

/** What a number in this cell means — read from the column header, or from the metric name in `rowLabels` tables. */
export function cellKind(table: ReportTable, row: ReportCell[], col: number): 'money' | 'percent' | 'count' {
  const label = table.rowLabels ? String(row[0]) : table.headers[col];
  if (label.includes('(INR)')) return 'money';
  if (label.includes('%')) return 'percent';
  return 'count';
}

/** The API sends '—' for missing values — keep those cells empty. */
const text = (value?: string | null) => (!value || value === '—' ? '' : value);

export function buildSummaryTable(overall: DailySummaryOverall): ReportTable {
  return {
    title: 'Overall Summary',
    headers: ['Metric', 'Value'],
    rowLabels: true,
    rows: [
      ['Total Eggs Loaded', overall.totalEggsLoaded],
      ['Total Eggs Sold', overall.totalEggsSold],
      ['Total Eggs Damaged', overall.totalEggsDamaged],
      ['Total Shops Visited', overall.totalStoresDelivered],
      ['Total Delivery Drops', overall.totalDeliveriesCount],
      ['Total Sale Amount (INR)', overall.totalSaleAmount],
      ['Cash in Hand (INR)', overall.totalCashCollected],
      ['Net Pay / UPI (INR)', overall.totalUpiCollected],
      ['Total Collected (INR)', overall.totalCollectedAmount],
      ['Amount Still Due (INR)', overall.totalPendingAmount],
      ['Active Drivers', overall.activeDriversCount],
      ['Active Vans', overall.activeVansCount],
    ],
  };
}

export function buildRateTable(rates: RateBreakdown[], totalEggsSold: number): ReportTable {
  return {
    title: 'Egg Rate Breakdown & Shops Sold',
    headers: ['Rate Per Egg (INR)', 'Eggs Sold', 'Volume %', 'Total Sale (INR)', 'Shops Count', 'Shop Names'],
    noTotal: ['Volume %', 'Shops Count'],
    wideColumn: 'Shop Names',
    rows: rates.map((r) => [
      r.ratePerUnit,
      r.eggCount,
      totalEggsSold > 0 ? Math.round((r.eggCount / totalEggsSold) * 100) : 0,
      r.totalAmount,
      r.storesCount ?? r.storeNames?.length ?? 0,
      (r.storeNames ?? []).join('; '),
    ]),
  };
}

export function buildDriverTable(drivers: DriverDailyReport[]): ReportTable {
  return {
    title: 'Driver & Van Operations',
    headers: [
      'Driver Name',
      'Phone',
      'Van Number',
      'Route',
      'Loaded Eggs',
      'Sold Eggs',
      'Damaged Eggs',
      'Rates Sold',
      'Shops Count',
      'Cash in Hand (INR)',
      'Net Pay / UPI (INR)',
      'Total Collected (INR)',
      'Total Sale (INR)',
      'Amount Still Due (INR)',
    ],
    rows: drivers.map((d) => [
      text(d.driverName),
      text(d.driverPhone),
      text(d.vanNumber),
      text(d.routeName),
      d.loadedUnits,
      d.soldUnits,
      d.damagedUnits,
      d.rateBreakdown.map((r) => `${r.eggCount} @ Rs ${r.ratePerUnit.toFixed(2)}`).join('; '),
      d.storesDeliveredCount,
      d.cashCollected,
      d.upiCollected,
      d.totalCollected,
      d.totalSaleAmount,
      d.pendingAmount,
    ]),
  };
}

export function buildStoreTable(stores: StoreDeliveryReport[]): ReportTable {
  return {
    title: 'Shop-Wise Delivery & Payment Details',
    headers: [
      'Shop Name',
      'Owner Name',
      'Phone',
      'Delivered By Driver',
      'Van Number',
      'Eggs Delivered',
      'Rate / Egg',
      'Total Bill (INR)',
      'Cash in Hand (INR)',
      'Net Pay / UPI (INR)',
      'Total Collected (INR)',
      'Amount Still Due (INR)',
      'Payment Status',
    ],
    rows: stores.map((s) => [
      text(s.storeName),
      text(s.ownerName),
      text(s.phone),
      text(s.driverName),
      text(s.vanNumber),
      s.unitsDelivered,
      text(s.ratePerUnitText),
      s.totalAmount,
      s.cashCollected ?? 0,
      s.upiCollected ?? 0,
      s.totalCollected ?? 0,
      s.pendingDue ?? 0,
      s.paymentStatus,
    ]),
  };
}
