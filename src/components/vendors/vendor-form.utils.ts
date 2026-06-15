import type { Vendor } from '@/types';
import type { VendorFormValues } from './vendor-form.schema';

export type VendorFormModalMode = 'create' | 'edit';

export const VENDOR_FORM_MODAL_COPY: Record<
  VendorFormModalMode,
  { title: string; subtitle: string; submitLabel: string }
> = {
  create: {
    title: 'Add New Vendor',
    subtitle: 'Onboard a new poultry partner to the ledger.',
    submitLabel: 'Save Vendor',
  },
  edit: {
    title: 'Edit Vendor Profile',
    subtitle: 'Update partner information and financial details.',
    submitLabel: 'Save Changes',
  },
};

export const EMPTY_VENDOR_FORM_VALUES: VendorFormValues = {
  name: '',
  phone: '',
  address: '',
  aadharNumber: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
};

export function vendorToFormValues(vendor: Vendor): VendorFormValues {
  return {
    name: vendor.name ?? '',
    phone: vendor.phone ?? '',
    address: vendor.address ?? '',
    aadharNumber: vendor.aadharNumber ?? '',
    bankName: vendor.bankName ?? '',
    bankAccountNumber: vendor.bankAccountNumber ?? '',
    bankIfsc: vendor.bankIfsc ?? '',
  };
}
