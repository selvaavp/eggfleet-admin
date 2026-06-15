import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui';
import type { Vendor } from '@/types';
import { VendorFormFields, VendorModalFooter } from './VendorFormFields';
import { vendorFormSchema, type VendorFormValues } from './vendor-form.schema';
import {
  EMPTY_VENDOR_FORM_VALUES,
  VENDOR_FORM_MODAL_COPY,
  vendorToFormValues,
  type VendorFormModalMode,
} from './vendor-form.utils';

export type { VendorFormModalMode };

export interface VendorFormModalSubmitMeta {
  isActive?: boolean;
}

export interface VendorFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: VendorFormModalMode;
  /** Required when `mode` is `edit` */
  vendor?: Vendor | null;
  onSubmit: (values: VendorFormValues, meta?: VendorFormModalSubmitMeta) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Show active/inactive toggle (vendor list edit only) */
  showActiveToggle?: boolean;
}

export function VendorFormModal({
  open,
  onClose,
  mode,
  vendor,
  onSubmit,
  isSubmitting = false,
  showActiveToggle = false,
}: VendorFormModalProps) {
  const copy = VENDOR_FORM_MODAL_COPY[mode];
  const [isActive, setIsActive] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: EMPTY_VENDOR_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && vendor) {
      reset(vendorToFormValues(vendor));
      setIsActive(vendor.isActive ?? true);
    } else {
      reset(EMPTY_VENDOR_FORM_VALUES);
      setIsActive(true);
    }
  }, [open, mode, vendor, reset]);

  const handleClose = () => {
    reset(EMPTY_VENDOR_FORM_VALUES);
    setIsActive(true);
    onClose();
  };

  const handleValidSubmit = async (values: VendorFormValues) => {
    await onSubmit(values, showActiveToggle ? { isActive } : undefined);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={copy.title}
      subtitle={copy.subtitle}
      size="lg"
      className="max-w-[560px]"
      bodyClassName="px-6 pb-6 pt-5"
    >
      <form onSubmit={handleSubmit(handleValidSubmit)}>
        <VendorFormFields register={register} errors={errors} />

        {showActiveToggle && mode === 'edit' && (
          <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-[#F5F5F4] px-4 py-3">
            <label className="flex cursor-pointer select-none items-center gap-2">
              <input
                type="checkbox"
                className="size-4 rounded accent-primary"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className="text-sm font-semibold text-[#212121]">Active</span>
            </label>
            <span className="text-xs text-[#777777]">Uncheck to mark vendor as inactive</span>
          </div>
        )}

        <VendorModalFooter
          submitLabel={copy.submitLabel}
          loading={isSubmitting}
          onCancel={handleClose}
        />
      </form>
    </Modal>
  );
}
