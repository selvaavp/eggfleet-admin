import type { LucideIcon } from 'lucide-react';
import { User, MapPin, Banknote } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Button, Input, Textarea } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { VendorFormValues } from './vendor-form.schema';

export const vendorFieldClass =
  'rounded-[12px] border-0 bg-[#E9E8E6] px-4 py-3 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20';

export const vendorBankFieldClass =
  'rounded-[12px] border-0 bg-white px-4 py-3 text-sm font-medium text-[#212121] placeholder:font-normal placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-primary/20';

const vendorLabelClass = 'mb-2 block text-sm font-semibold text-[#212121]';

function VendorSectionTitle({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-[#904D00]">
      <Icon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
      {children}
    </p>
  );
}

export function VendorFormFields({
  register,
  errors,
}: {
  register: UseFormRegister<VendorFormValues>;
  errors: FieldErrors<VendorFormValues>;
}) {
  return (
    <div className="space-y-6">
      <section>
        <VendorSectionTitle icon={User}>Vendor Identity</VendorSectionTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Vendor Name"
            labelClassName={vendorLabelClass}
            className={vendorFieldClass}
            placeholder="e.g. Sunny Farms Ltd"
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="w-full">
            <label htmlFor="aadharNumber" className={vendorLabelClass}>
              Aadhaar Number{' '}
              <span className="text-xs font-normal text-[#A8A29E]">(Optional)</span>
            </label>
            <input
              id="aadharNumber"
              maxLength={12}
              inputMode="numeric"
              placeholder="12-digit UID"
              className={cn(vendorFieldClass, 'w-full', errors.aadharNumber && 'ring-2 ring-danger/30')}
              {...register('aadharNumber')}
            />
            {errors.aadharNumber?.message && (
              <p className="mt-1 text-xs text-danger">{errors.aadharNumber.message}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <VendorSectionTitle icon={MapPin}>Contact &amp; Address</VendorSectionTitle>
        <div className="space-y-4">
          <Input
            label="Phone Number"
            labelClassName={vendorLabelClass}
            className={vendorFieldClass}
            type="tel"
            maxLength={10}
            onlyDigits
            placeholder="+91 00000 00000"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Textarea
            label="Full Address"
            labelClassName={vendorLabelClass}
            className={cn(vendorFieldClass, 'min-h-[88px] resize-none')}
            placeholder="Street, City, State, ZIP Code"
            rows={3}
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
      </section>

      <section className="rounded-[12px] bg-[#F4F3F1] p-5">
        <VendorSectionTitle icon={Banknote}>
          Bank Details{' '}
          <span className="font-normal normal-case tracking-normal text-[#A8A29E]">(Optional)</span>
        </VendorSectionTitle>
        <div className="space-y-4">
          <Input
            label="Bank Name"
            labelClassName={vendorLabelClass}
            className={vendorBankFieldClass}
            placeholder="Enter bank name"
            error={errors.bankName?.message}
            {...register('bankName')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Account Number"
              labelClassName={vendorLabelClass}
              className={vendorBankFieldClass}
              placeholder="0000 0000 0000"
              maxLength={18}
              onlyDigits
              error={errors.bankAccountNumber?.message}
              {...register('bankAccountNumber')}
            />
            <Input
              label="IFSC Code"
              labelClassName={vendorLabelClass}
              className={vendorBankFieldClass}
              placeholder="IFSC0000000"
              error={errors.bankIfsc?.message}
              {...register('bankIfsc')}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function VendorModalFooter({
  onCancel,
  submitLabel,
  loading,
}: {
  onCancel: () => void;
  submitLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-sm font-semibold text-[#212121] transition hover:text-[#57534e]"
      >
        Cancel
      </button>
      <Button
        type="submit"
        loading={loading}
        className="rounded-[12px] px-6 py-2.5 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
      >
        {submitLabel}
      </Button>
    </div>
  );
}
