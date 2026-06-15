import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Phone, Store } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Route, Store as StoreType } from '@/types';

export const storeFormSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  ownerContactName: z.string().min(1, 'Contact person name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Must be a 10-digit number'),
  address: z.string().min(5, 'Address is required (min 5 chars)'),
  routeId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;

const storeFieldClass =
  'h-12 rounded-[12px] border-0 bg-[#E9E8E6] px-4 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20';

const storeLabelClass = 'mb-2 block text-sm font-bold text-[#212121]';

export interface StoreFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: StoreFormValues) => void;
  isSubmitting?: boolean;
  routes?: Route[];
  store?: StoreType | null;
  mode?: 'create' | 'edit';
}

export function StoreFormModal({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  routes = [],
  store = null,
  mode = 'create',
}: StoreFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: '',
      ownerContactName: '',
      phone: '',
      address: '',
      routeId: '',
      isActive: true,
    },
  });

  const isActive = watch('isActive');

  const handleClose = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!open) { reset(); return; }
    if (mode === 'edit' && store) {
      reset({
        name: store.name,
        ownerContactName: store.ownerContactName,
        phone: store.phone,
        address: store.address,
        routeId: store.routeId ?? store.route?.id ?? '',
        isActive: store.isActive,
      });
    } else {
      reset({ name: '', ownerContactName: '', phone: '', address: '', routeId: '', isActive: true });
    }
  }, [open, mode, store, reset]);

  // Re-apply routeId once routes finish loading (routes query is async and may not be ready on first reset)
  useEffect(() => {
    if (open && mode === 'edit' && store && routes.length > 0) {
      setValue('routeId', store.routeId ?? store.route?.id ?? '');
    }
  }, [open, mode, store?.id, store?.routeId, routes.length, setValue]);

  const isEdit = mode === 'edit';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit Store' : 'Register New Store'}
      subtitle={isEdit ? 'Update store details.' : 'Add a new partner to the delivery ecosystem.'}
      size="lg"
      className="max-w-[560px] rounded-2xl"
      headerClassName="rounded-t-2xl px-6 py-5 sm:px-8"
      bodyClassName="px-6 pb-0 pt-5 sm:px-8"
      titleIcon={
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FFF4E5]"
          aria-hidden
        >
          <Store className="size-5 text-[#904D00]" strokeWidth={2.1} />
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Store Name"
              labelClassName={storeLabelClass}
              className={storeFieldClass}
              placeholder="e.g. Green Valley Artisans"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Owner/Contact Person"
              labelClassName={storeLabelClass}
              className={storeFieldClass}
              placeholder="Full legal name"
              error={errors.ownerContactName?.message}
              {...register('ownerContactName')}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Phone Number"
              labelClassName={storeLabelClass}
              className={storeFieldClass}
              type="tel"
              maxLength={10}
              onlyDigits
              placeholder="+1 (555) 000-0000"
              leftIcon={<Phone className="size-4 text-[#78716C]" strokeWidth={2} />}
              error={errors.phone?.message}
              {...register('phone')}
            />
            <div className="w-full">
              <label htmlFor="store-route" className={storeLabelClass}>
                Van / Route
              </label>
              <div className="relative">
                <select
                  id="store-route"
                  className={cn(
                    storeFieldClass,
                    'w-full appearance-none pr-10',
                    errors.routeId && 'ring-2 ring-danger/30',
                  )}
                  {...register('routeId')}
                >
                  <option value="">Select route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
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
          </div>

          <Textarea
            label="Full Address"
            labelClassName={storeLabelClass}
            className={cn(storeFieldClass, 'h-auto min-h-[100px] resize-none py-3')}
            placeholder="Street, Suite, City, State, ZIP code"
            rows={4}
            error={errors.address?.message}
            {...register('address')}
          />

          {isEdit && (
            <div className="flex items-center justify-between rounded-xl border border-[#E9E8E6] bg-[#FAFAF9] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#212121]">Active Status</p>
                <p className="text-xs text-[#78716C]">Inactive stores won't receive deliveries</p>
              </div>
              <button
                type="button"
                onClick={() => setValue('isActive', !isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-[#D1D5DB]'}`}
              >
                <span
                  className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="-mx-6 mt-6 flex items-center justify-end gap-4 rounded-b-2xl bg-[#F4F3F1] px-6 py-4 sm:-mx-8 sm:px-8">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-bold text-[#212121] transition hover:text-[#57534e]"
          >
            Cancel
          </button>
          <Button
            type="submit"
            loading={isSubmitting}
            className="rounded-[12px] px-5 py-2.5 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          >
            {isEdit ? 'Save Changes' : 'Save & Register Store'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
