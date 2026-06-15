import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parse } from 'date-fns';
import toast from 'react-hot-toast';
import { AlertCircle, ChevronDown, Egg, TriangleAlert } from 'lucide-react';
import { inventoryApi } from '@/api/inventory.api';
import { Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { DamagedEgg, DamageReason } from '@/types';

const REASONS: { value: DamageReason; label: string }[] = [
  { value: 'LOADING', label: 'Loading (warehouse → van)' },
  { value: 'TRANSIT', label: 'Transit (on the road)' },
  { value: 'STORAGE', label: 'Storage (warehouse)' },
];

const damageSchema = z.object({
  inventoryId: z.string(),
  reason: z.enum(['LOADING', 'TRANSIT', 'STORAGE'] as const),
  damageDate: z.string().min(1, 'Date is required'),
  damageTime: z.string().min(1, 'Time is required'),
  eggCount: z.coerce.number().int().min(1, 'Enter count'),
});
type DamageFormValues = z.infer<typeof damageSchema>;

const fieldClass =
  'h-12 rounded-[12px] border-0 bg-[#E9E8E6] px-4 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20';

const labelClass = 'mb-2 block text-sm font-bold text-[#212121]';

type Props = {
  open: boolean;
  onClose: () => void;
  editEntry?: DamagedEgg | null;
};

function todayDateValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

function currentTimeValue() {
  return format(new Date(), 'HH:mm');
}

function formatTimeDisplay(hhmm: string): string {
  if (!hhmm) return '';
  try {
    const d = parse(hhmm, 'HH:mm', new Date());
    return format(d, 'hh:mm a');
  } catch {
    return hhmm;
  }
}

function parseTimeInput(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return currentTimeValue();
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2];
    const pm = ampm[3].toUpperCase() === 'PM';
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return currentTimeValue();
}

const defaultFormValues = (): Partial<DamageFormValues> => ({
  inventoryId: '',
  reason: 'LOADING',
  damageDate: todayDateValue(),
  damageTime: formatTimeDisplay(currentTimeValue()),
  eggCount: undefined,
});

export function DamageEntryModal({ open, onClose, editEntry = null }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editEntry;

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory-for-damage'],
    queryFn: () => inventoryApi.list({ page: 1, limit: 500 }),
    enabled: open,
  });
  const inventoryList = (inventoryData?.data ?? []).filter((i) => (i.availableUnits ?? 0) > 0);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<DamageFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(damageSchema) as any,
    defaultValues: defaultFormValues(),
  });

  const damageDate = watch('damageDate');
  const reason = watch('reason');

  useEffect(() => {
    if (!open) { reset(defaultFormValues()); return; }
    if (isEdit && editEntry) {
      reset({
        inventoryId: editEntry.inventoryId ?? '',
        reason: editEntry.reason ?? 'LOADING',
        damageDate: editEntry.damageDate,
        damageTime: formatTimeDisplay(editEntry.damageTime ?? currentTimeValue()),
        eggCount: editEntry.eggCount ?? (editEntry as { quantity?: number }).quantity ?? undefined,
      });
    } else {
      reset(defaultFormValues());
    }
  }, [open, isEdit, editEntry?.id, reset]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inventory-damaged'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['inventory-for-damage'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const damageMutation = useMutation({
    mutationFn: inventoryApi.createDamaged,
    onSuccess: () => {
      toast.success('Damage recorded');
      invalidate();
      reset(defaultFormValues());
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to record damage');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: DamageFormValues) =>
      inventoryApi.updateDamaged(editEntry!.id, {
        damageDate: v.damageDate,
        damageTime: parseTimeInput(v.damageTime),
        eggCount: v.eggCount,
      }),
    onSuccess: () => {
      toast.success('Damage entry updated');
      invalidate();
      onClose();
    },
    onError: () => toast.error('Failed to update damage entry'),
  });

  const isPending = damageMutation.isPending || updateMutation.isPending;
  const close = () => { if (!isPending) onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'Edit Damage Entry' : 'Damage Entry'}
      subtitle={isEdit ? 'Update the damage record details.' : 'Record egg losses and reduce stock.'}
      size="md"
      className="max-w-[520px] rounded-2xl"
      headerClassName="rounded-t-2xl px-6 py-5 sm:px-8"
      bodyClassName="px-6 pb-0 pt-5 sm:px-8"
      hideCloseButton
      headerEnd={
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#FEE2E2]" aria-hidden>
          <TriangleAlert className="size-5 fill-red-600 text-red-600" strokeWidth={1.5} />
        </div>
      }
    >
      <form
        onSubmit={handleSubmit((v) => {
          if (isEdit) {
            updateMutation.mutate(v);
          } else {
            if (!v.inventoryId && v.reason !== 'STORAGE') {
              setError('inventoryId', { message: 'Select an inventory batch' });
              return;
            }
            damageMutation.mutate({
              inventoryId: v.inventoryId || undefined,
              reason: v.reason,
              damageDate: v.damageDate,
              damageTime: parseTimeInput(v.damageTime),
              eggCount: v.eggCount,
            });
          }
        })}
      >
        <div className="space-y-5">
          {/* Inventory batch — create only (affects stock, can't change after save) */}
          {!isEdit ? (
            <div>
              <label className={labelClass}>
                Inventory Batch
                {reason === 'STORAGE' && <span className="ml-1 font-normal text-[#78716C]">(optional)</span>}
              </label>
              <div className="relative">
                <select
                  className={cn(fieldClass, 'w-full appearance-none pr-9', errors.inventoryId && 'ring-2 ring-danger/30')}
                  {...register('inventoryId')}
                >
                  <option value="">{reason === 'STORAGE' ? '— Unknown / mixed batch —' : 'Select batch'}</option>
                  {inventoryList.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.vendor?.name ?? '—'} — ₹{Number(inv.ratePerUnit ?? 0).toFixed(2)}/unit · {Number(inv.availableUnits ?? 0).toLocaleString('en-IN')} avail.
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
              </div>
              {errors.inventoryId?.message && (
                <p className="mt-1 text-xs text-danger">{errors.inventoryId.message}</p>
              )}
              {reason === 'STORAGE' && !watch('inventoryId') && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="size-3.5 shrink-0" />
                  Will deduct from oldest available batch automatically (FIFO).
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className={labelClass}>Inventory Batch</p>
              <p className="text-sm font-medium text-[#57534E]">
                {editEntry?.inventoryId
                  ? (inventoryData?.data ?? []).find((i) => i.id === editEntry.inventoryId)?.vendor?.name ?? editEntry.inventoryId
                  : '—'}
              </p>
            </div>
          )}

          {/* Reason — create only */}
          {!isEdit ? (
            <div>
              <label className={labelClass}>Damage Reason</label>
              <div className="relative">
                <select
                  className={cn(fieldClass, 'w-full appearance-none pr-9', errors.reason && 'ring-2 ring-danger/30')}
                  {...register('reason')}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
              </div>
            </div>
          ) : (
            <div>
              <p className={labelClass}>Reason</p>
              <p className="text-sm font-medium text-[#57534E]">{editEntry?.reason ?? '—'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="w-full">
              <label htmlFor="damage-date" className={labelClass}>Date</label>
              <input
                id="damage-date"
                type="date"
                className={fieldClass + ' w-full'}
                value={damageDate}
                onChange={(e) => setValue('damageDate', e.target.value, { shouldValidate: true })}
              />
              {errors.damageDate?.message && (
                <p className="mt-1 text-xs text-danger">{errors.damageDate.message}</p>
              )}
            </div>
            <Input
              id="damage-time"
              label="Time"
              labelClassName={labelClass}
              className={fieldClass}
              placeholder="09:30 AM"
              error={errors.damageTime?.message}
              {...register('damageTime')}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Damaged Egg Count"
              labelClassName={labelClass}
              className={fieldClass}
              type="number"
              min={1}
              onlyDigits
              placeholder="Enter count"
              error={errors.eggCount?.message}
              {...register('eggCount')}
            />
          </div>
        </div>

        <div className="-mx-6 mt-6 flex items-center justify-end gap-4 rounded-b-2xl bg-[#F4F3F1] px-6 py-4 sm:-mx-8 sm:px-8">
          <button
            type="button"
            onClick={close}
            disabled={isPending}
            className="text-sm font-bold text-[#212121] transition hover:text-[#57534e] disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="submit"
            loading={isPending}
            className="inline-flex items-center gap-2 rounded-[12px] px-5 py-2.5 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          >
            {isEdit ? 'Save Changes' : 'Record Damage'}
            <Egg className="size-4" strokeWidth={2.25} aria-hidden />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
