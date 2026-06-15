import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { ChevronDown, Receipt } from 'lucide-react';
import { expensesApi } from '@/api/expenses.api';
import { vansApi } from '@/api/vans.api';
import { Button, Input, Textarea, Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/types';

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'COMPANY', label: 'Company Expense' },
  { value: 'VEHICLE', label: 'Vehicle Expense' },
  { value: 'OTHER', label: 'Other Expense' },
];

const expenseSchema = z
  .object({
    category: z.enum(['COMPANY', 'VEHICLE', 'OTHER'] as const),
    title: z.string().min(1, 'Title is required'),
    amount: z.coerce.number().positive('Enter an amount greater than 0'),
    expenseDate: z.string().min(1, 'Date is required'),
    vanId: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.category !== 'VEHICLE' || !!v.vanId, {
    message: 'Select a vehicle for vehicle expenses',
    path: ['vanId'],
  });
type ExpenseFormValues = z.infer<typeof expenseSchema>;

const fieldClass =
  'h-12 rounded-[12px] border-0 bg-[#E9E8E6] px-4 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20';

const labelClass = 'mb-2 block text-sm font-bold text-[#212121]';

type Props = {
  open: boolean;
  onClose: () => void;
  editEntry?: Expense | null;
};

function todayDateValue() {
  return format(new Date(), 'yyyy-MM-dd');
}

const defaultFormValues = (): Partial<ExpenseFormValues> => ({
  category: 'COMPANY',
  title: '',
  amount: undefined,
  expenseDate: todayDateValue(),
  vanId: '',
  notes: '',
});

export function ExpenseEntryModal({ open, onClose, editEntry = null }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editEntry;

  const { data: vansData } = useQuery({
    queryKey: ['vans-for-expense'],
    queryFn: () => vansApi.list({ page: 1, limit: 500 }),
    enabled: open,
  });
  const vanList = vansData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: defaultFormValues(),
  });

  const category = watch('category');
  const expenseDate = watch('expenseDate');

  useEffect(() => {
    if (!open) { reset(defaultFormValues()); return; }
    if (isEdit && editEntry) {
      reset({
        category: editEntry.category,
        title: editEntry.title,
        amount: editEntry.amount,
        expenseDate: editEntry.expenseDate,
        vanId: editEntry.vanId ?? '',
        notes: editEntry.notes ?? '',
      });
    } else {
      reset(defaultFormValues());
    }
  }, [open, isEdit, editEntry?.id, reset]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['expenses-summary'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const createMutation = useMutation({
    mutationFn: (v: ExpenseFormValues) =>
      expensesApi.create({
        category: v.category,
        title: v.title,
        amount: v.amount,
        expenseDate: v.expenseDate,
        vanId: v.category === 'VEHICLE' ? v.vanId : undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Expense recorded');
      invalidate();
      reset(defaultFormValues());
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to record expense');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (v: ExpenseFormValues) =>
      expensesApi.update(editEntry!.id, {
        category: v.category,
        title: v.title,
        amount: v.amount,
        expenseDate: v.expenseDate,
        vanId: v.category === 'VEHICLE' ? v.vanId : undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Expense updated');
      invalidate();
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to update expense');
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const close = () => { if (!isPending) onClose(); };

  return (
    <Modal
      open={open}
      onClose={close}
      title={isEdit ? 'Edit Expense' : 'Add Expense'}
      subtitle={isEdit ? 'Update the expense details.' : 'Record a company or vehicle expense.'}
      size="md"
      className="max-w-[520px] rounded-2xl"
      headerClassName="rounded-t-2xl px-6 py-5 sm:px-8"
      bodyClassName="px-6 pb-0 pt-5 sm:px-8"
      hideCloseButton
      headerEnd={
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#F0FDF4]" aria-hidden>
          <Receipt className="size-5 text-[#16A34A]" strokeWidth={1.5} />
        </div>
      }
    >
      <form
        onSubmit={handleSubmit((v) => {
          if (isEdit) {
            updateMutation.mutate(v);
          } else {
            createMutation.mutate(v);
          }
        })}
      >
        <div className="space-y-5">
          <div>
            <label className={labelClass}>Category</label>
            <div className="relative">
              <select
                className={cn(fieldClass, 'w-full appearance-none pr-9', errors.category && 'ring-2 ring-danger/30')}
                {...register('category')}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
            </div>
          </div>

          {category === 'VEHICLE' && (
            <div>
              <label className={labelClass}>Vehicle</label>
              <div className="relative">
                <select
                  className={cn(fieldClass, 'w-full appearance-none pr-9', errors.vanId && 'ring-2 ring-danger/30')}
                  {...register('vanId')}
                >
                  <option value="">Select vehicle</option>
                  {vanList.map((van) => (
                    <option key={van.id} value={van.id}>
                      {van.name} ({van.vanNumber})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
              </div>
              {errors.vanId?.message && (
                <p className="mt-1 text-xs text-danger">{errors.vanId.message}</p>
              )}
            </div>
          )}

          <Input
            label="Title"
            labelClassName={labelClass}
            className={fieldClass}
            placeholder="e.g. Diesel refill, Office rent"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Amount (₹)"
              labelClassName={labelClass}
              className={fieldClass}
              type="number"
              min={0.01}
              step="0.01"
              placeholder="Enter amount"
              error={errors.amount?.message}
              {...register('amount')}
            />
            <div className="w-full">
              <label htmlFor="expense-date" className={labelClass}>Date</label>
              <input
                id="expense-date"
                type="date"
                className={fieldClass + ' w-full'}
                value={expenseDate}
                onChange={(e) => setValue('expenseDate', e.target.value, { shouldValidate: true })}
              />
              {errors.expenseDate?.message && (
                <p className="mt-1 text-xs text-danger">{errors.expenseDate.message}</p>
              )}
            </div>
          </div>

          <Textarea
            label="Notes (optional)"
            labelClassName={labelClass}
            className="rounded-[12px] border-0 bg-[#E9E8E6] px-4 py-3 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Add any extra details"
            rows={3}
            {...register('notes')}
          />
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
            {isEdit ? 'Save Changes' : 'Add Expense'}
            <Receipt className="size-4" strokeWidth={2.25} aria-hidden />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
