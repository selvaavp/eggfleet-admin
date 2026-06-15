import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Lock, ChevronDown, ChevronsDown } from 'lucide-react';
import { paymentsApi } from '@/api/payments.api';
import { vendorsApi } from '@/api/vendors.api';
import { Button, DatePickerField, Modal } from '@/components/ui';
import { PAYMENT_METHOD_OPTIONS } from '@/constants';
import { cn } from '@/lib/utils';

const schema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  amount: z.string().min(1, 'Amount is required'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  status: z.enum(['PAID', 'PARTIAL', 'PENDING']),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const STATUS_TABS: { value: FormValues['status']; label: string }[] = [
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'PENDING', label: 'Pending' },
];

const labelClass = 'mb-2 block text-sm font-semibold text-[#212121]';

const sectionLabelClass =
  'mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#777777]';

const fieldClass =
  'h-12 w-full rounded-xl border-0 bg-[#F5F5F4] px-4 text-sm font-medium text-[#212121] focus:outline-none focus:ring-2 focus:ring-primary/20';

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface RecordVendorPaymentModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-selected vendor — when set, vendor selector is hidden */
  vendorId?: string;
  vendorOptions: { value: string; label: string }[];
  onSuccess?: () => void;
}

export function RecordVendorPaymentModal({
  open,
  onClose,
  vendorId: initialVendorId,
  vendorOptions,
  onSuccess,
}: RecordVendorPaymentModalProps) {
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendorId: initialVendorId ?? '',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'PAID',
      paymentMethod: 'UPI',
    },
  });

  const selectedVendorId = watch('vendorId');

  const { data: vendorSummary } = useQuery({
    queryKey: ['vendor-summary-modal', selectedVendorId],
    queryFn: () => vendorsApi.getSummary(selectedVendorId),
    enabled: !!selectedVendorId && open,
  });

  const selectedVendorLabel =
    vendorOptions.find((o) => o.value === selectedVendorId)?.label ?? '';

  const pendingLoad =
    vendorSummary?.pendingAmount != null ? formatMoney(vendorSummary.pendingAmount) : null;

  useEffect(() => {
    if (open) {
      reset({
        vendorId: initialVendorId ?? '',
        amount: '',
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'PAID',
        paymentMethod: 'UPI',
        notes: '',
      });
    }
  }, [open, initialVendorId, reset]);

  const handleClose = () => {
    reset({
      vendorId: initialVendorId ?? '',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      status: 'PAID',
      paymentMethod: 'UPI',
    });
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await paymentsApi.createVendorPayment({
        vendorId: values.vendorId,
        amount: parseFloat(values.amount),
        paymentMethod: values.paymentMethod,
        paymentDate: values.paymentDate,
        status: values.status,
        notes: values.notes ?? undefined,
      });
      toast.success('Payment recorded successfully');
      qc.invalidateQueries({ queryKey: ['vendor-payments'] });
      qc.invalidateQueries({ queryKey: ['vendor-detail'] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      onSuccess?.();
      handleClose();
    } catch {
      toast.error('Failed to record payment');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Record Payment"
      subtitle="Add a new financial transaction to the ledger."
      size="md"
      className="max-w-[480px]"
      bodyClassName="px-6 pb-6 pt-5"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={labelClass}>Vendor Name</label>
          {initialVendorId ? (
            <div
              className={cn(
                'flex h-12 items-center gap-2 rounded-xl bg-[#F5F5F4] px-3',
                errors.vendorId && 'ring-2 ring-danger/30',
              )}
            >
              <Lock className="size-4 shrink-0 text-[#777777]" strokeWidth={2.25} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#212121]">
                {selectedVendorLabel}
              </span>
              {pendingLoad && (
                <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                  LOAD: {pendingLoad}
                </span>
              )}
              <ChevronsDown className="size-4 shrink-0 text-[#777777]" aria-hidden />
            </div>
          ) : (
            <div className="relative">
              <div
                className={cn(
                  'flex h-12 items-center gap-2 rounded-xl bg-[#F5F5F4] px-3',
                  errors.vendorId && 'ring-2 ring-danger/30',
                )}
              >
                <Lock className="size-4 shrink-0 text-[#777777]" strokeWidth={2.25} aria-hidden />
                <select
                  className="min-w-0 flex-1 appearance-none bg-transparent text-sm font-semibold text-[#212121] focus:outline-none"
                  value={selectedVendorId}
                  onChange={(e) => setValue('vendorId', e.target.value, { shouldValidate: true })}
                >
                  <option value="">Select Vendor</option>
                  {vendorOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {pendingLoad && selectedVendorId && (
                  <span className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    LOAD: {pendingLoad}
                  </span>
                )}
                <ChevronsDown className="size-4 shrink-0 text-[#777777]" aria-hidden />
              </div>
            </div>
          )}
          {errors.vendorId && (
            <p className="mt-1 text-xs text-danger">{errors.vendorId.message}</p>
          )}
        </div>

        <div>
          <label className={labelClass}>Payment Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#777777]">
              ₹
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className={cn(fieldClass, 'h-12 pl-8', errors.amount && 'ring-2 ring-danger/30')}
              {...register('amount')}
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-danger">{errors.amount.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Payment Method</label>
            <div className="relative">
              <select
                className={cn(fieldClass, 'appearance-none pr-10')}
                {...register('paymentMethod')}
              >
                {PAYMENT_METHOD_OPTIONS.map((o) => (
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
          </div>
          <DatePickerField
            control={control}
            name="paymentDate"
            label="Payment Date"
            labelClassName="text-[#212121]"
            dateFormat="dd MMM, yyyy"
            variant="filled"
            popperPlacement="bottom-end"
            error={errors.paymentDate?.message}
          />
        </div>

        <div>
          <label className={sectionLabelClass}>Transaction Status</label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <div
                className="inline-flex w-full rounded-md bg-[#F0EFED] p-1"
                role="tablist"
                aria-label="Transaction status"
              >
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={field.value === tab.value}
                    onClick={() => field.onChange(tab.value)}
                    className={cn(
                      'flex-1 rounded-md py-2.5 text-sm font-semibold transition-all',
                      field.value === tab.value
                        ? 'bg-white text-primary shadow-[0_1px_3px_rgba(26,28,27,0.08)]'
                        : 'bg-transparent text-taupe/75 hover:text-taupe',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            loading={isSubmitting}
            className="h-12 w-full rounded-md text-md font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          >
            Record Payment
          </Button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-1 text-center text-sm font-semibold text-[#57534e] transition hover:text-[#212121]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
