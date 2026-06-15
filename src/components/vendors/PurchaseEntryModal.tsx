import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Plus, Trash2, Egg, ChevronDown, LayoutGrid } from 'lucide-react';
import { inventoryApi } from '@/api/inventory.api';
import { Button, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';

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

const sectionLabelClass =
  'mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#904D00]';

const fieldClass =
  'h-11 w-full rounded-xl border-0 bg-[#F5F5F4] px-4 text-sm font-medium text-[#212121] focus:outline-none focus:ring-2 focus:ring-primary/20';

const cardInputClass =
  'h-11 w-full rounded-xl border-0 bg-white px-4 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-primary/20';

function formatPurchaseMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface PurchaseEntryModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected vendor — when set, vendor selector is hidden */
  vendorId?: string;
  vendorOptions: { value: string; label: string }[];
  userId: string;
  onSuccess: () => void;
}

export function PurchaseEntryModal({
  open,
  onClose,
  vendorId: initialVendorId,
  vendorOptions,
  userId,
  onSuccess,
}: PurchaseEntryModalProps) {
  const [vendorId, setVendorId] = useState(initialVendorId ?? '');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setVendorId(initialVendorId ?? '');
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
        if (field === 'totalUnits' || field === 'goodUnits') {
          const total = Number(field === 'totalUnits' ? val : updated.totalUnits) || 0;
          let finalGood: number;
          if (field === 'totalUnits') {
            finalGood = total;
          } else {
            finalGood = Math.min(Number(val) || 0, total);
          }
          updated.goodUnits = String(finalGood);
          updated.damagedUnits = String(Math.max(0, total - finalGood));
        }
        return updated;
      }),
    );
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const itemsSubtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.ratePerUnit) || 0) * (parseInt(item.totalUnits, 10) || 0);
  }, 0);
  const taxAmount = itemsSubtotal * TAX_RATE;
  const totalDue = itemsSubtotal + taxAmount;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!vendorId) errs.vendorId = 'Vendor is required';
    if (!purchaseDate) errs.purchaseDate = 'Date is required';
    items.forEach((item, i) => {
      if (!item.ratePerUnit || parseFloat(item.ratePerUnit) <= 0) errs[`item_${i}_rate`] = 'Required';
      if (!item.totalUnits || parseInt(item.totalUnits, 10) < 1) errs[`item_${i}_units`] = 'Min 1';
      if (!item.goodUnits || parseInt(item.goodUnits, 10) < 0) errs[`item_${i}_good`] = 'Required';
      const good = parseInt(item.goodUnits, 10) || 0;
      const total = parseInt(item.totalUnits, 10) || 0;
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
          totalUnits: parseInt(item.totalUnits, 10),
          goodUnits: parseInt(item.goodUnits, 10),
          ratePerUnit: parseFloat(item.ratePerUnit),
          createdBy: userId,
        });
      }
      toast.success(items.length > 1 ? `${items.length} batches created` : 'Purchase entry created');
      onSuccess();
      handleClose();
    } catch {
      toast.error('Failed to save purchase entry');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New Purchase Entry"
      subtitle="Record egg batch arrivals from vendors"
      size="lg"
      className="max-w-[560px]"
      bodyClassName="px-6 pb-6 pt-5"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div
          className={cn(
            'grid gap-4',
            initialVendorId ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2',
          )}
        >
          {!initialVendorId && (
            <div>
              <label htmlFor="purchase-vendor" className={sectionLabelClass}>
                Vendor Name
              </label>
              <div className="relative">
                <select
                  id="purchase-vendor"
                  className={cn(
                    fieldClass,
                    'appearance-none pr-10',
                    errors.vendorId && 'ring-2 ring-danger/30',
                  )}
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                >
                  <option value="">Select Vendor</option>
                  {vendorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#777777]"
                  aria-hidden
                />
              </div>
              {errors.vendorId && <p className="mt-1 text-xs text-danger">{errors.vendorId}</p>}
            </div>
          )}
          <div>
            <label htmlFor="purchase-date" className={sectionLabelClass}>
              Purchase Date
            </label>
            <input
              id="purchase-date"
              type="date"
              className={cn(fieldClass, errors.purchaseDate && 'ring-2 ring-danger/30')}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            {errors.purchaseDate && (
              <p className="mt-1 text-xs text-danger">{errors.purchaseDate}</p>
            )}
          </div>
        </div>

        <section>
          <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#904D00]">
            <Egg className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
            Inventory Details
          </p>

          <div className="space-y-4">
            {items.map((item, idx) => {
              const subtotal =
                (parseFloat(item.ratePerUnit) || 0) * (parseInt(item.totalUnits, 10) || 0);
              return (
                <div
                  key={idx}
                  className="space-y-4 rounded-2xl border border-[#E9E8E6] bg-[#FAFAF9] p-4"
                >
                  <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[1fr_1fr_auto]">
                    <div>
                      <label className={sectionLabelClass}>Rate Per Unit</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#777777]">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          className={cn(cardInputClass, 'pl-8')}
                          value={item.ratePerUnit}
                          onChange={(e) => updateItem(idx, 'ratePerUnit', e.target.value)}
                        />
                      </div>
                      {errors[`item_${idx}_rate`] && (
                        <p className="mt-1 text-xs text-danger">{errors[`item_${idx}_rate`]}</p>
                      )}
                    </div>
                    <div>
                      <label className={sectionLabelClass}>Units / QTY</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        className={cardInputClass}
                        value={item.totalUnits}
                        onChange={(e) => updateItem(idx, 'totalUnits', e.target.value)}
                      />
                      {errors[`item_${idx}_units`] && (
                        <p className="mt-1 text-xs text-danger">{errors[`item_${idx}_units`]}</p>
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-3 sm:flex-col sm:items-end">
                      <div className="sm:text-right">
                        <p className={sectionLabelClass}>Subtotal</p>
                        <p className="text-base font-bold text-[#212121]">
                          {subtotal > 0 ? formatPurchaseMoney(subtotal) : '—'}
                        </p>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[#EF4444] transition hover:bg-red-50"
                          aria-label="Remove item"
                        >
                          <Trash2 className="size-4" strokeWidth={2.25} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={sectionLabelClass}>Good Eggs</label>
                      <input
                        type="number"
                        min="0"
                        max={parseInt(item.totalUnits, 10) > 0 ? item.totalUnits : undefined}
                        placeholder="0"
                        className={cardInputClass}
                        value={item.goodUnits}
                        onChange={(e) => updateItem(idx, 'goodUnits', e.target.value)}
                      />
                      {errors[`item_${idx}_good`] && (
                        <p className="mt-1 text-xs text-danger">{errors[`item_${idx}_good`]}</p>
                      )}
                    </div>
                    <div>
                      <label className={sectionLabelClass}>Damaged Eggs</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        readOnly
                        className={cn(cardInputClass, 'bg-[#F5F5F4] text-[#777777]')}
                        value={item.damagedUnits}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#D4C4B0] text-sm font-semibold text-[#904D00] transition hover:border-[#904D00]/50 hover:bg-[#FFF8F0]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Add More Items
          </button>
        </section>

        <div className="space-y-3 rounded-2xl bg-[#F5F5F4] p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#777777]">Items Subtotal</span>
            <span className="font-semibold text-[#212121]">{formatPurchaseMoney(itemsSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[#777777]">Tax &amp; Logistics (2.5%)</span>
            <span className="font-semibold text-[#212121]">{formatPurchaseMoney(taxAmount)}</span>
          </div>
          <div className="border-t border-light-grey pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#904D00]">
                  Total Amount Due
                </p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#212121]">
                  {formatPurchaseMoney(totalDue)}
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFF4E5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#904D00]">
                <LayoutGrid className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                Auto-Calculated
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 border-t border-[#E9E8E6] pt-5">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-semibold text-[#57534e] transition hover:text-[#212121]"
          >
            Cancel
          </button>
          <Button
            type="submit"
            loading={submitting}
            className="rounded-md px-6 py-2.5 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          >
            Save Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
