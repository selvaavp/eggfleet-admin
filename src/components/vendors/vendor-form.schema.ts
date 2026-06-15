import { z } from 'zod';

export const vendorFormSchema = z.object({
  name: z.string().min(1, 'Vendor name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Must be a 10-digit number'),
  address: z.string().optional(),
  aadharNumber: z
    .string()
    .refine((v) => !v || /^\d{12}$/.test(v), { message: 'Must be exactly 12 digits' })
    .optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z
    .string()
    .refine((v) => !v || /^\d{9,18}$/.test(v), { message: 'Must be 9–18 digits' })
    .optional(),
  bankIfsc: z
    .string()
    .refine((v) => !v || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v), {
      message: 'Invalid IFSC (e.g. SBIN0001234)',
    })
    .optional(),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;
