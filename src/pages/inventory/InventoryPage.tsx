import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package, ArrowRight, Trash2, Egg, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { inventoryApi } from '@/api/inventory.api';
import {
  Button,
  Card,
  Table,
  Modal,
  Input,
  Select,
  EmptyState,
  Pagination,
  PageLoadError,
  DateRangePicker,
  type Column,
} from '@/components/ui';
import { DamageEntryModal } from '@/components/inventory/DamageEntryModal';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import { formatCurrency } from '@/lib/utils';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Inventory } from '@/types';

// ─── Purchase Item row type ────────────────────────────────────────────────────

type PurchaseItem = {
  ratePerUnit: string;
  totalUnits: string;
  goodUnits: string;
  damagedUnits: string;
};

const emptyItem = (): PurchaseItem => ({
  ratePerUnit: '',
  totalUnits: '',
  goodUnits: '',
  damagedUnits: '0',
});

const TAX_RATE = 0.025;

const UNITS_HIGH_STOCK_THRESHOLD = 100;

function formatEggRate(row: Inventory): string {
  const rateA = Number(row.ratePerUnit ?? row.pricePerUnit ?? 0);
  const rateB = Number(row.pricePerUnit ?? 0);
  if (rateB > 0 && Math.abs(rateB - rateA) > 0.001) {
    return `${formatINR(rateA, { fractionDigits: 2 })} / ${formatINR(rateB, { fractionDigits: 2 })}`;
  }
  return formatINR(rateA || rateB, { fractionDigits: 2 });
}

function UnitsOfEggCell({ units }: { units: number }) {
  const isHigh = units >= UNITS_HIGH_STOCK_THRESHOLD;
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <span className="text-body-md font-bold tabular-nums text-[#212121]">
        {units.toLocaleString('en-IN')} Units
      </span>
      <span
        className={cn('size-2 shrink-0 rounded-full', isHigh ? 'bg-blue-500' : 'bg-red-500')}
        aria-hidden
      />
    </span>
  );
}

function DamagedEggCell({ damaged }: { damaged: number }) {
  if (damaged <= 0) {
    return (
      <span className="inline-flex rounded-full bg-[#F5F5F4] px-3 py-1 text-sm font-medium text-[#777777]">
        0 Units
      </span>
    );
  }
  return (
    <span className="text-sm font-semibold text-red-600 tabular-nums">
      {damaged.toLocaleString('en-IN')} Units
    </span>
  );
}

function InventoryActionMenu({ row }: { row: Inventory }) {
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
          className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => {
            setOpen(false);
            toast.success(
              `${row.vendor?.name ?? 'Vendor'} · ${Number(row.totalUnits ?? row.quantity ?? 0).toLocaleString('en-IN')} units`,
            );
          }}
        >
          View details
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
            if (next) {
              requestAnimationFrame(updateMenuPosition);
            }
            return next;
          });
        }}
        className="p-1 text-taupe transition hover:text-[#212121]"
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

function PurchaseEntryModal({
  open,
  onClose,
  vendorOptions,
  userId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  vendorOptions: { value: string; label: string }[];
  userId: string;
  onSuccess: () => void;
}) {
  const [vendorId, setVendorId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setVendorId('');
    setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));
    setItems([emptyItem()]);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const updateItem = (idx: number, field: keyof PurchaseItem, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: val };
        // auto-derive damagedUnits when totalUnits or goodUnits changes
        if (field === 'totalUnits' || field === 'goodUnits') {
          const total = Number(field === 'totalUnits' ? val : updated.totalUnits) || 0;
          const good = Number(field === 'goodUnits' ? val : updated.goodUnits) || 0;
          updated.damagedUnits = String(Math.max(0, total - good));
        }
        return updated;
      })
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Derived totals ─────────────────────────────────────────────────────────
  const itemsSubtotal = items.reduce((sum, item) => {
    const rate = parseFloat(item.ratePerUnit) || 0;
    const units = parseInt(item.totalUnits) || 0;
    return sum + rate * units;
  }, 0);
  const taxAmount = itemsSubtotal * TAX_RATE;
  const totalDue = itemsSubtotal + taxAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!vendorId) errs.vendorId = 'Vendor is required';
    if (!purchaseDate) errs.purchaseDate = 'Date is required';
    items.forEach((item, i) => {
      if (!item.ratePerUnit || parseFloat(item.ratePerUnit) <= 0)
        errs[`item_${i}_rate`] = 'Required';
      if (!item.totalUnits || parseInt(item.totalUnits) < 1)
        errs[`item_${i}_units`] = 'Min 1';
      if (!item.goodUnits || parseInt(item.goodUnits) < 0)
        errs[`item_${i}_good`] = 'Required';
      const good = parseInt(item.goodUnits) || 0;
      const total = parseInt(item.totalUnits) || 0;
      if (good > total) errs[`item_${i}_good`] = 'Cannot exceed total';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      for (const item of items) {
        await inventoryApi.create({
          vendorId,
          purchaseDate,
          totalUnits: parseInt(item.totalUnits),
          goodUnits: parseInt(item.goodUnits),
          ratePerUnit: parseFloat(item.ratePerUnit),
          createdBy: userId,
        });
      }
      toast.success(items.length > 1 ? `${items.length} inventory batches created` : 'Inventory record created');
      onSuccess();
      handleClose();
    } catch {
      toast.error('Failed to save purchase entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="New Purchase Entry" size="lg">
      <p className="text-sm text-muted -mt-1 mb-5">Record egg batch arrivals from vendors</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header row: Vendor + Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold tracking-widest text-muted uppercase mb-1.5">
              Vendor Name
            </label>
            <select
              className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <option value="">Select Vendor</option>
              {vendorOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.vendorId && <p className="text-xs text-red-500 mt-1">{errors.vendorId}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest text-muted uppercase mb-1.5">
              Purchase Date
            </label>
            <input
              type="date"
              className="w-full h-10 rounded-xl border border-border bg-[#f5f5f5] px-3 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            {errors.purchaseDate && <p className="text-xs text-red-500 mt-1">{errors.purchaseDate}</p>}
          </div>
        </div>

        {/* Inventory Details */}
        <div>
          <p className="text-sm font-semibold text-dark flex items-center gap-1.5 mb-3">
            <Egg className="size-4 text-primary" /> Inventory Details
          </p>
          <div className="space-y-3">
            {items.map((item, idx) => {
              const subtotal = (parseFloat(item.ratePerUnit) || 0) * (parseInt(item.totalUnits) || 0);
              return (
                <div key={idx} className="rounded-xl border border-border bg-surface p-4 space-y-3">
                  {/* Rate / Units / Subtotal */}
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-muted uppercase mb-1">
                        Rate Per Unit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className="w-full h-10 pl-7 pr-3 rounded-xl border border-border bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                          value={item.ratePerUnit}
                          onChange={(e) => updateItem(idx, 'ratePerUnit', e.target.value)}
                        />
                      </div>
                      {errors[`item_${idx}_rate`] && <p className="text-xs text-red-500 mt-0.5">{errors[`item_${idx}_rate`]}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-muted uppercase mb-1">
                        Units / QTY
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        value={item.totalUnits}
                        onChange={(e) => updateItem(idx, 'totalUnits', e.target.value)}
                      />
                      {errors[`item_${idx}_units`] && <p className="text-xs text-red-500 mt-0.5">{errors[`item_${idx}_units`]}</p>}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] font-bold tracking-widest text-muted uppercase mb-1">Subtotal</p>
                        <p className="text-sm font-bold text-dark">
                          {subtotal > 0 ? formatCurrency(subtotal) : '—'}
                        </p>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-400 hover:text-red-600 p-1 rounded-lg transition"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Good / Damaged */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-muted uppercase mb-1">
                        Good Eggs
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        value={item.goodUnits}
                        onChange={(e) => updateItem(idx, 'goodUnits', e.target.value)}
                      />
                      {errors[`item_${idx}_good`] && <p className="text-xs text-red-500 mt-0.5">{errors[`item_${idx}_good`]}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold tracking-widest text-muted uppercase mb-1">
                        Damaged Eggs
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        className="w-full h-10 px-3 rounded-xl border border-border bg-[#f5f5f5] text-sm text-muted focus:outline-none"
                        value={item.damagedUnits}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add More Items */}
          <button
            type="button"
            onClick={addItem}
            className="mt-3 w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-primary/30 text-sm font-semibold text-primary hover:bg-primary/5 transition"
          >
            <Plus className="size-4" /> Add More Items
          </button>
        </div>

        {/* Summary card */}
        <div className="rounded-xl bg-[#f5f4f2] p-4 space-y-2">
          <div className="flex justify-between text-sm text-muted">
            <span>Items Subtotal</span>
            <span className="font-semibold text-dark">{formatCurrency(itemsSubtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted">
            <span>Tax &amp; Logistics (2.5%)</span>
            <span className="font-semibold text-dark">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="border-t border-border pt-2 mt-1">
            <p className="text-[10px] font-bold tracking-widest text-primary uppercase mb-0.5">Total Amount Due</p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-extrabold text-dark">₹{totalDue.toFixed(2)}</p>
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                AUTO-CALCULATED
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1 border-t border-[#f4f3f1]">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Save Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const queryParams = useMemo(() => {
    const base: { page: number; limit: number; startDate?: string; endDate?: string } = {
      page,
      limit: DEFAULT_PAGE_SIZE,
    };
    if (rangeStart && rangeEnd) {
      base.startDate = format(rangeStart, 'yyyy-MM-dd');
      base.endDate = format(rangeEnd, 'yyyy-MM-dd');
    }
    return base;
  }, [page, rangeStart, rangeEnd]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['inventory', queryParams],
    queryFn: () => inventoryApi.list(queryParams),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const columns: Column<Inventory>[] = [
    {
      key: 'vendor',
      header: 'VENDOR NAME',
      width: '20%',
      render: (i) => (
        <span className="text-lg font-bold text-[#212121]">{i.vendor?.name ?? '—'}</span>
      ),
    },
    {
      key: 'ratePerUnit',
      header: 'EGG RATE',
      width: '14%',
      align: 'center',
      render: (i) => (
        <span className="text-lg font-medium tabular-nums text-[#777777]">{formatEggRate(i)}</span>
      ),
    },
    {
      key: 'totalUnits',
      header: 'UNITS OF EGG',
      width: '16%',
      align: 'center',
      render: (i) => (
        <UnitsOfEggCell units={Number(i.totalUnits ?? i.quantity ?? 0)} />
      ),
    },
    {
      key: 'totalAmount',
      header: 'TOTAL AMOUNT',
      width: '14%',
      align: 'center',
      render: (i) => (
        <span className="text-body-md font-extrabold tabular-nums text-[#212121]">
          {formatINR(Number(i.totalAmount ?? 0), { fractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'damaged',
      header: 'DAMAGED EGG',
      width: '14%',
      align: 'center',
      render: (i) => <DamagedEggCell damaged={Number(i.damagedUnits ?? 0)} />,
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '10%',
      align: 'center',
      render: (i) => <InventoryActionMenu row={i} />,
    },
  ];

  useEffect(() => {
    setPage(1);
  }, [rangeStart, rangeEnd]);

  if (isError) {
    return <PageLoadError title="Could not load inventory" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DateRangePicker
          variant="pill"
          labelFormat="compact"
          placeholder="Select Date Range"
          startDate={rangeStart}
          endDate={rangeEnd}
          onChange={(s, e) => {
            setRangeStart(s);
            setRangeEnd(e);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setDamageModalOpen(true)}
            className="inline-flex h-10 items-center gap-2.5 rounded-[12px] bg-white px-4 text-sm font-bold text-primary shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition hover:bg-[#FFFAF5]"
          >
            <span className="flex size-5 items-center justify-center border-2 border-primary">
              <Plus className="size-4" strokeWidth={4.5} aria-hidden />
            </span>
            Damage Entry
          </button>
          <Link
            to={APP_ROUTES.INVENTORY_DAMAGED_EGGS}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(254,113,2,0.35)] transition hover:bg-primary-dark"
          >
            View Damaged Eggs
            <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>

      <Card
        padding={false}
        className="overflow-visible rounded-none border border-[#E9E8E6] shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        {!isLoading && rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No inventory records"
            description="Stock from vendor purchases will appear here"
          />
        ) : (
          <>
            <Table
              variant="inventory"
              columns={columns}
              data={rows}
              keyExtractor={(i) => i.id}
              isLoading={isLoading}
              emptyMessage="No inventory records."
              emptyIcon={<Package className="size-10 text-border" />}
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

      <DamageEntryModal open={damageModalOpen} onClose={() => setDamageModalOpen(false)} />
    </div>
  );
}
