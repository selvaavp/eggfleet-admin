import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  DriverPayment,
  VendorPayment,
  CreateVendorPaymentPayload,
  PaymentStatus,
} from '@/types';

export const paymentsApi = {
  listDriverPayments: (params?: PaginationParams) =>
    api.get('/admin/payments/drivers', { params }).then((r) => unwrapPaginated<DriverPayment>(r)),

  updateDriverPaymentStatus: (id: string, status: PaymentStatus, note?: string) =>
    api
      .patch<ApiResponse<DriverPayment>>(`/admin/payments/drivers/${id}/status`, {
        status,
        ...(note?.trim() ? { note: note.trim() } : {}),
      })
      .then((r) => r.data.data),

  listVendorPayments: (params?: PaginationParams) =>
    api.get('/admin/payments/vendors', { params }).then((r) => unwrapPaginated<VendorPayment>(r)),

  createVendorPayment: (payload: CreateVendorPaymentPayload) =>
    api
      .post<ApiResponse<VendorPayment>>('/admin/payments/vendors', payload)
      .then((r) => r.data.data),
};
