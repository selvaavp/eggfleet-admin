import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { format, parseISO } from 'date-fns';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  buildDriverTable,
  buildRateTable,
  buildStoreTable,
  buildSummaryTable,
  cellKind,
  columnTotals,
  numericColumns,
  type ReportCell,
  type ReportTable,
} from '@/lib/report-tables';
import type {
  DailySummaryOverall,
  DriverDailyReport,
  RateBreakdown,
  StoreDeliveryReport,
} from '@/types/reports.types';

/** A4 landscape so the wide driver / shop tables fit; column headers repeat on every page. */
const PRINT_STYLES = `
@media print {
  @page { size: A4 landscape; margin: 10mm; }
  .report-print, .report-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-print thead { display: table-header-group; }
  .report-print tr { break-inside: avoid; }
  .report-print h2 { break-after: avoid; }
}
`;

const cellClass = 'border border-neutral-400 px-1.5 py-1 align-top';
const headClass = cn(cellClass, 'bg-neutral-100 font-bold text-dark');

function formatCell(value: ReportCell, kind: ReturnType<typeof cellKind>): string {
  if (typeof value !== 'number') return value || '—';
  if (kind === 'money') return formatINR(value, { fractionDigits: 2 });
  if (kind === 'percent') return `${value}%`;
  return value.toLocaleString('en-IN');
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 mt-5 font-sans text-[11px] font-bold uppercase tracking-wide text-dark">{children}</h2>
  );
}

/** Two-column "metric | value" block for the overall summary. */
function KeyValueTable({ title, table, rows }: { title: string; table: ReportTable; rows: ReportCell[][] }) {
  return (
    <table className="w-full border-collapse text-[11px] leading-snug">
      <thead>
        <tr>
          <th colSpan={2} className={cn(headClass, 'text-left')}>
            {title}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={String(row[0])}>
            <td className={cellClass}>{String(row[0]).replace(' (INR)', '')}</td>
            <td className={cn(cellClass, 'w-[40%] text-right font-bold tabular-nums')}>
              {formatCell(row[1], cellKind(table, row, 1))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintTable({ table, emptyText }: { table: ReportTable; emptyText: string }) {
  const { headers, rows } = table;
  const isNumeric = numericColumns(table);
  const totals = columnTotals(table);

  return (
    <table className="w-full border-collapse text-[10px] leading-snug">
      <thead>
        <tr>
          <th className={cn(headClass, 'w-7 text-center')}>#</th>
          {headers.map((header, col) => (
            <th key={header} className={cn(headClass, isNumeric[col] ? 'text-right' : 'text-left')}>
              {header.replace(' (INR)', '')}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length + 1} className={cn(cellClass, 'py-3 text-center text-muted')}>
              {emptyText}
            </td>
          </tr>
        ) : (
          <>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className={cn(cellClass, 'text-center text-muted')}>{rowIndex + 1}</td>
                {row.map((value, col) => (
                  <td
                    key={col}
                    className={cn(
                      cellClass,
                      isNumeric[col] && 'whitespace-nowrap text-right tabular-nums',
                      // Keep short values (van number, "300 @ ₹6.50") on one line; long names may wrap
                      typeof value === 'string' && value.length <= 14 && 'whitespace-nowrap'
                    )}
                  >
                    {formatCell(value, cellKind(table, row, col))}
                  </td>
                ))}
              </tr>
            ))}
            {/* Last body row, not <tfoot> — browsers repeat a tfoot on every printed page */}
            <tr className="bg-neutral-100 font-bold">
              <td className={cellClass} />
              {totals.map((total, col) => (
                <td key={col} className={cn(cellClass, total !== null && 'whitespace-nowrap text-right tabular-nums')}>
                  {col === 0 ? 'Total' : total !== null ? formatCell(total, cellKind(table, [], col)) : ''}
                </td>
              ))}
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

interface ReportPrintViewProps {
  /** Report date, `yyyy-MM-dd`. */
  date: string;
  overall: DailySummaryOverall;
  rateDistribution: RateBreakdown[];
  driverSummaries: DriverDailyReport[];
  /** Shop rows to print — already narrowed by the on-screen search, if any. */
  storeDeliveries: StoreDeliveryReport[];
  totalStoreDeliveries: number;
  storeSearch: string;
}

/** The daily report as plain tables. Hidden on screen; it is what "Print Report" puts on paper. */
export function ReportPrintView({
  date,
  overall,
  rateDistribution,
  driverSummaries,
  storeDeliveries,
  totalStoreDeliveries,
  storeSearch,
}: ReportPrintViewProps) {
  const [printedAt, setPrintedAt] = useState(() => new Date());

  // Stamp the moment of printing (the page may have been open for hours).
  useEffect(() => {
    const stamp = () => flushSync(() => setPrintedAt(new Date()));
    window.addEventListener('beforeprint', stamp);
    return () => window.removeEventListener('beforeprint', stamp);
  }, []);

  const summary = buildSummaryTable(overall);
  const isMoney = (row: ReportCell[]) => cellKind(summary, row, 1) === 'money';
  const isFiltered = storeDeliveries.length !== totalStoreDeliveries;

  return (
    <div className="report-print hidden font-sans text-dark print:block">
      <style>{PRINT_STYLES}</style>

      <div className="flex items-end justify-between border-b-2 border-dark pb-2">
        <div>
          <h1 className="font-sans text-lg font-bold leading-tight text-dark">Daily Operations & Sales Report</h1>
          <p className="text-[11px] text-muted">Egg movement, sales, collections and pending amounts</p>
        </div>
        <div className="text-right text-[11px] leading-snug">
          <p>
            Report Date: <span className="font-bold">{format(parseISO(date), 'dd MMM yyyy (EEEE)')}</span>
          </p>
          <p className="text-muted">Generated: {format(printedAt, 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </div>

      <SectionTitle>1. Overall Summary</SectionTitle>
      <div className="grid grid-cols-2 items-start gap-4">
        <KeyValueTable
          title="Egg Movement & Operations"
          table={summary}
          rows={summary.rows.filter((r) => !isMoney(r))}
        />
        <KeyValueTable title="Sales & Collection" table={summary} rows={summary.rows.filter(isMoney)} />
      </div>

      {/* These two are short — keep each on one page. The shop table below flows across pages. */}
      <div className="break-inside-avoid">
        <SectionTitle>2. Egg Rate Breakdown & Shops Sold ({rateDistribution.length})</SectionTitle>
        <PrintTable
          table={buildRateTable(rateDistribution, overall.totalEggsSold)}
          emptyText="No eggs sold on this date"
        />
      </div>

      <div className="break-inside-avoid">
        <SectionTitle>3. Driver & Van Operations ({driverSummaries.length})</SectionTitle>
        <PrintTable table={buildDriverTable(driverSummaries)} emptyText="No driver assignments on this date" />
      </div>

      <SectionTitle>
        4. Shop-Wise Delivery & Payment Details (
        {isFiltered
          ? `${storeDeliveries.length} of ${totalStoreDeliveries} — filtered by "${storeSearch.trim()}"`
          : totalStoreDeliveries}
        )
      </SectionTitle>
      <PrintTable table={buildStoreTable(storeDeliveries)} emptyText="No shop deliveries on this date" />
    </div>
  );
}
