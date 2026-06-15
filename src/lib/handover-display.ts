import type { Handover } from '@/types';
import { formatDate, formatCount } from '@/lib/utils';

export function handoverDateTime(h: Pick<Handover, 'handoverDate' | 'handoverTime'>): string {
  if (!h.handoverDate) return '—';
  const t = h.handoverTime?.trim();
  return t ? `${formatDate(h.handoverDate)} · ${t}` : formatDate(h.handoverDate);
}

export function handoverVanLabel(h: Handover): string {
  const v = h.vanAssignment?.van ?? h.van;
  if (!v) return '—';
  const num = v.vanNumber ?? v.registrationNumber ?? '';
  const shortId = v.id ? `${v.id.slice(0, 8)}…` : '';
  return [num, shortId].filter(Boolean).join(' · ') || '—';
}

export function handoverEggSummary(h: Handover): string {
  const items = h.eggItems ?? [];
  if (!items.length) return '—';
  const good = items.reduce((s, i) => s + (i.goodUnits ?? 0), 0);
  const dmg = items.reduce((s, i) => s + (i.damagedUnits ?? 0), 0);
  return `${formatCount(good)} good · ${formatCount(dmg)} damaged`;
}
