import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  Vendor,
  VendorSummary,
  VendorPurchase,
  VendorPayment,
  CreateVendorPayload,
  UpdateVendorPayload,
} from '@/types';

export interface VendorDetailParams extends PaginationParams {
  startDate?: string;
  endDate?: string;
}

export const vendorsApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/vendors', { params }).then((r) => unwrapPaginated<Vendor>(r)),

  getById: (id: string) =>
    api.get<ApiResponse<Vendor>>(`/admin/vendors/${id}`).then((r) => r.data.data),

  create: (payload: CreateVendorPayload) =>
    api.post<ApiResponse<Vendor>>('/admin/vendors', payload).then((r) => r.data.data),

  update: (id: string, payload: UpdateVendorPayload) =>
    api.put<ApiResponse<Vendor>>(`/admin/vendors/${id}`, payload).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/vendors/${id}`).then((r) => r.data),

  getSummary: (id: string, params?: VendorDetailParams) =>
    api.get<ApiResponse<VendorSummary>>(`/admin/vendors/${id}/summary`, { params }).then((r) => r.data.data),

  getPurchases: (id: string, params?: VendorDetailParams) =>
    api.get(`/admin/vendors/${id}/purchases`, { params }).then((r) => unwrapPaginated<VendorPurchase>(r)),

  getPaymentHistory: (id: string, params?: VendorDetailParams) =>
    api.get(`/admin/vendors/${id}/payment-history`, { params }).then((r) => unwrapPaginated<VendorPayment>(r)),
};
