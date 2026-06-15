import { format, isValid } from 'date-fns';
import type { DriverPayment } from '@/types';
import { cn } from '@/lib/utils';

export const TRANSACTION_LEDGER_QUERY_KEY = 'transaction-ledger' as const;

export function initialsFromName(name?: string) {
  if (!name?.trim()) return '—';
  const p = name.trim().split(/\s+/);
  return `${p[0][0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase() || '—';
}

export function formatLedgerAmount(amount: number | string | undefined | null): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(x);
}

export function formatLedgerVanLabel(vanNo: string | undefined | null): string {
  const label = vanNo?.trim();
  if (!label) return 'Van —';
  if (/^van\s*#/i.test(label)) return label;
  return `Van #${label}`;
}

export function ledgerRowDateTime(row: DriverPayment): { date: string; time: string } {
  const raw = row.paymentDate ?? row.createdAt;
  const dt = raw ? new Date(typeof raw === 'string' ? raw : String(raw)) : null;
  if (!dt || !isValid(dt)) return { date: '—', time: '—' };
  const t = row.paymentTime?.trim();
  let timeLine = format(dt, 'hh:mm a');
  if (t) {
    const normalized = t.length === 5 ? `${t}:00` : t;
    const timeParsed = new Date(`1970-01-01T${normalized}`);
    if (isValid(timeParsed)) timeLine = format(timeParsed, 'hh:mm a');
    else timeLine = t;
  }
  return { date: format(dt, 'MMM dd, yyyy'), time: timeLine };
}

export function humanizePaymentStatus(raw: string) {
  const u = raw?.toUpperCase() ?? '';
  if (u === 'APPROVED') return 'Approved';
  if (u === 'REJECTED') return 'Rejected';
  if (u === 'PENDING') return 'Pending';
  return raw;
}

export function LedgerPaymentStatus({ status }: { status: string }) {
  const label = humanizePaymentStatus(status);
  const u = status?.toUpperCase() ?? '';
  const dot =
    u === 'APPROVED' ? 'bg-emerald-500' : u === 'REJECTED' ? 'bg-red-500' : 'bg-amber-400';
  const text =
    u === 'APPROVED' ? 'text-emerald-800' : u === 'REJECTED' ? 'text-red-700' : 'text-amber-800';
  return (
    <div className="flex items-center justify-center gap-2">
      <span className={cn('size-2 shrink-0 rounded-full', dot)} />
      <span className={cn('text-[12px] font-bold', text)}>{label}</span>
    </div>
  );
}

export function buildTransactionLedgerCsvRows(rows: DriverPayment[]) {
  return rows.map((row) => {
    const { date, time } = ledgerRowDateTime(row);
    const vanNo =
      row.vanAssignment?.van?.vanNumber ?? row.vanAssignment?.van?.registrationNumber;
    return [
      `${date} ${time}`,
      row.store?.name ?? '—',
      row.driver?.name ?? '—',
      formatLedgerVanLabel(vanNo),
      Number(row.amount ?? 0).toFixed(2),
      (row.paymentMethod ?? 'UPI').replace(/_/g, ' '),
      humanizePaymentStatus(row.status),
    ];
  });
}
