import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const x = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(x);
}

/** Integer counts for tables (safe when API omits or sends strings). */
export function formatCount(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-IN') : '—';
}

function parseDisplayDate(dateStr: string | undefined | null): Date | null {
  if (dateStr == null || String(dateStr).trim() === '') return null;
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateStr: string | undefined | null): string {
  const d = parseDisplayDate(dateStr);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(dateStr: string | undefined | null): string {
  const d = parseDisplayDate(dateStr);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
