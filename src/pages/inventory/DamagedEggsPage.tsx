import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import {
  ArrowLeft,
  ChevronDown,
  EggOff,
  MoreVertical,
  Pencil,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryApi } from '@/api/inventory.api';
import {
  Card,
  Table,
  EmptyState,
  Pagination,
  PageLoadError,
  DateRangePicker,
  Modal,
  Button,
  type Column,
} from '@/components/ui';
import { DamageEntryModal } from '@/components/inventory/DamageEntryModal';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import { cn } from '@/lib/utils';
import type { DamagedEgg, DamageReason } from '@/types';

const REASON_FILTER_OPTIONS: { value: 'ALL' | DamageReason; label: string }[] = [
  { value: 'ALL', label: 'All Reasons' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'TRANSIT', label: 'Transit' },
  { value: 'STORAGE', label: 'Storage' },
];

const VAN_DOT_COLORS = ['bg-blue-500', 'bg-amber-700', 'bg-orange-500', 'bg-teal-600', 'bg-violet-500'];

function vanDotColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % VAN_DOT_COLORS.length;
  return VAN_DOT_COLORS[hash] ?? VAN_DOT_COLORS[0];
}

function getVanLabel(d: DamagedEgg): string {
  const name = d.vanName ?? d.van?.name ?? d.van?.vanNumber;
  if (!name?.trim()) return '—';
  const trimmed = name.trim();
  if (/^van\s/i.test(trimmed)) return trimmed;
  return `Van ${trimmed}`;
}

function getDriverName(d: DamagedEgg): string {
  return d.driver?.name ?? d.driverName ?? '—';
}

function driverInitials(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDamagedDateTime(d: DamagedEgg): { date: string; time: string } {
  const raw = d.damageDate ?? d.reportedAt ?? d.createdAt;
  const dt = raw ? new Date(raw) : null;
  if (!dt || !isValid(dt)) return { date: '—', time: '—' };

  let timeLine = '—';
  const t = d.damageTime?.trim();
  if (t) {
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(t)) {
      timeLine = t.toUpperCase().replace(/\s+/g, ' ');
    } else if (/^\d{2}:\d{2}$/.test(t)) {
      try {
        timeLine = format(parse(t, 'HH:mm', new Date()), 'hh:mm a');
      } catch {
        timeLine = t;
      }
    } else {
      const normalized = t.length === 5 ? `${t}:00` : t;
      const timeParsed = new Date(`1970-01-01T${normalized}`);
      timeLine = isValid(timeParsed) ? format(timeParsed, 'hh:mm a') : t;
    }
  }

  return { date: format(dt, 'MMM dd, yyyy'), time: timeLine };
}

function ReasonChip({ reason }: { reason: DamageReason }) {
  const styles: Record<DamageReason, string> = {
    LOADING: 'bg-[#DBEAFE] text-[#1D4ED8]',
    TRANSIT: 'bg-[#FEF3C7] text-[#92400E]',
    STORAGE: 'bg-[#F5F5F4] text-[#57534E]',
  };
  const labels: Record<DamageReason, string> = {
    LOADING: 'LOADING',
    TRANSIT: 'TRANSIT',
    STORAGE: 'STORAGE',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide',
        styles[reason] ?? 'bg-[#F5F5F4] text-[#57534E]',
      )}
    >
      {labels[reason] ?? reason}
    </span>
  );
}

function DriverCell({ name, url }: { name: string; url?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      {url ? (
        <img src={url} alt={name} className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E9E8E6] text-xs font-bold text-[#78716c]">
          {driverInitials(name)}
        </span>
      )}
      <span className="text-sm font-semibold text-[#212121]">{name}</span>
    </span>
  );
}

function DamagedEggActionMenu({
  row,
  onEdit,
  onDelete,
}: {
  row: DamagedEgg;
  onEdit: (d: DamagedEgg) => void;
  onDelete: (d: DamagedEgg) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 48;
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    setMenuPos({
      top: flip ? rect.top - menuHeight - gap : below,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const menu =
    open &&
    menuPos &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[9999] min-w-[11rem] -translate-x-1/2 overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => { setOpen(false); onEdit(row); }}
        >
          <Pencil className="size-3.5 text-[#78716C]" strokeWidth={2} />
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          onClick={() => { setOpen(false); onDelete(row); }}
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
          Delete
        </button>
      </div>,
      document.body,
    );

  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((p) => {
            const next = !p;
            if (next) requestAnimationFrame(updateMenuPosition);
            return next;
          });
        }}
        className="p-1 text-[#9CA3AF] transition hover:text-[#212121]"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="size-5" strokeWidth={2.5} />
      </button>
      {menu}
    </div>
  );
}

export default function DamagedEggsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [reasonFilter, setReasonFilter] = useState<'ALL' | DamageReason>('ALL');
  const [editEntry, setEditEntry] = useState<DamagedEgg | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DamagedEgg | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteDamaged(id),
    onSuccess: () => {
      toast.success('Damage entry deleted');
      qc.invalidateQueries({ queryKey: ['inventory-damaged'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteEntry(null);
    },
    onError: () => toast.error('Failed to delete damage entry'),
  });

  const queryParams = useMemo(() => {
    const base: {
      page: number;
      limit: number;
      startDate?: string;
      endDate?: string;
      reason?: DamageReason;
    } = { page, limit: DEFAULT_PAGE_SIZE };
    if (rangeStart && rangeEnd) {
      base.startDate = format(rangeStart, 'yyyy-MM-dd');
      base.endDate = format(rangeEnd, 'yyyy-MM-dd');
    }
    if (reasonFilter !== 'ALL') base.reason = reasonFilter;
    return base;
  }, [page, rangeStart, rangeEnd, reasonFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory-damaged', queryParams],
    queryFn: () => inventoryApi.listDamaged(queryParams),
  });

  useEffect(() => {
    setPage(1);
  }, [rangeStart, rangeEnd, reasonFilter]);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const columns: Column<DamagedEgg>[] = [
    {
      key: 'damageDate',
      header: 'DATE & TIME',
      width: '18%',
      render: (d) => {
        const { date, time } = formatDamagedDateTime(d);
        return (
          <div>
            <p className="text-sm font-semibold text-[#212121]">{date}</p>
            <p className="mt-0.5 text-xs font-medium text-[#9CA3AF]">{time}</p>
          </div>
        );
      },
    },
    {
      key: 'van',
      header: 'VAN',
      width: '18%',
      render: (d) => {
        const label = getVanLabel(d);
        const dotKey = d.vanAssignmentId ?? d.van?.id ?? label;
        return (
          <span className="inline-flex items-center gap-2">
            {label !== '—' ? (
              <span
                className={cn('size-2 shrink-0 rounded-full', vanDotColor(dotKey))}
                aria-hidden
              />
            ) : null}
            <span className="text-sm font-semibold text-[#212121]">{label}</span>
          </span>
        );
      },
    },
    {
      key: 'driver',
      header: 'DRIVER',
      width: '22%',
      render: (d) => (
        <DriverCell name={getDriverName(d)} url={d.driver?.profilePictureUrl} />
      ),
    },
    {
      key: 'eggCount',
      header: 'EGG COUNT',
      width: '12%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-extrabold tabular-nums text-[#212121]">
          {Number(d.eggCount ?? d.quantity ?? 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'REASON',
      width: '16%',
      align: 'center',
      render: (d) => <ReasonChip reason={d.reason} />,
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '10%',
      align: 'center',
      render: (d) => (
        <DamagedEggActionMenu
          row={d}
          onEdit={setEditEntry}
          onDelete={setDeleteEntry}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="py-6">
        <PageLoadError title="Could not load damaged egg records" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to={APP_ROUTES.INVENTORY}
          className="flex size-10 shrink-0 items-center justify-center text-[#212121] transition hover:text-primary"
          aria-label="Back to inventory"
        >
          <ArrowLeft className="size-6" strokeWidth={2.25} aria-hidden />
        </Link>
        <h1 className="font-sans text-[26px] font-extrabold uppercase leading-tight tracking-tight text-[#212121] sm:text-[28px]">
          Damaged Egg
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          variant="pill"
          labelFormat="compact"
          placeholder="Select date"
          startDate={rangeStart}
          endDate={rangeEnd}
          onChange={(s, e) => {
            setRangeStart(s);
            setRangeEnd(e);
          }}
        />
        <div className="relative">
          <TriangleAlert
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#904D00]"
            strokeWidth={2.25}
            aria-hidden
          />
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value as 'ALL' | DamageReason)}
            className="h-10 min-w-[160px] appearance-none rounded-full border border-light-grey bg-white py-2 pl-10 pr-9 text-sm font-semibold text-[#212121] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Filter by reason"
          >
            {REASON_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#212121]"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
      </div>

      {/* Table */}
      <Card
        padding={false}
        className="overflow-visible rounded-none border border-[#E9E8E6] shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        {!isLoading && rows.length === 0 ? (
          <EmptyState
            icon={EggOff}
            title="No records found"
            description={
              rangeStart || rangeEnd || reasonFilter !== 'ALL'
                ? 'Try adjusting the date or reason filters to see more entries.'
                : 'Damaged egg entries from loading, transit, or storage will appear here.'
            }
            action={
              <Link
                to={APP_ROUTES.INVENTORY}
                className="inline-flex h-10 items-center justify-center rounded-[12px] bg-primary px-5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(254,113,2,0.35)] transition hover:bg-primary-dark"
              >
                Back to Inventory
              </Link>
            }
          />
        ) : (
          <>
            <Table
              variant="damagedEgg"
              columns={columns}
              data={rows}
              keyExtractor={(d) => d.id}
              isLoading={isLoading}
              emptyMessage="No records found."
              emptyIcon={<EggOff className="size-10 text-border" />}
            />
            {!isLoading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="text-sm text-[#757575]">
                  Showing{' '}
                  <span className="font-semibold text-[#212121]">
                    {rangeFrom}
                    {rangeFrom !== rangeTo ? `-${rangeTo}` : ''}
                  </span>{' '}
                  of <span className="font-semibold text-[#212121]">{total}</span> entries
                </p>
                {totalPages > 1 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    className="pt-0"
                  />
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Edit modal */}
      <DamageEntryModal
        open={!!editEntry}
        editEntry={editEntry}
        onClose={() => setEditEntry(null)}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteEntry}
        onClose={() => !deleteMutation.isPending && setDeleteEntry(null)}
        title="Delete Damage Entry"
        subtitle="This action cannot be undone."
        size="sm"
        className="max-w-[400px] rounded-2xl"
        headerClassName="rounded-t-2xl px-6 py-5"
        bodyClassName="px-6 pb-0 pt-4"
      >
        <p className="text-sm text-[#57534E]">
          Are you sure you want to delete this damage record of{' '}
          <span className="font-bold text-[#212121]">
            {Number(deleteEntry?.eggCount ?? 0).toLocaleString('en-IN')} eggs
          </span>{' '}
          ({deleteEntry?.reason})?
        </p>
        <div className="-mx-6 mt-5 flex items-center justify-end gap-4 rounded-b-2xl bg-[#F4F3F1] px-6 py-4">
          <button
            type="button"
            onClick={() => setDeleteEntry(null)}
            disabled={deleteMutation.isPending}
            className="text-sm font-bold text-[#212121] transition hover:text-[#57534e] disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            loading={deleteMutation.isPending}
            onClick={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
            className="rounded-[12px] bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-none hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
