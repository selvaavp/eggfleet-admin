import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type { ApiResponse, PaginationParams, Store, CreateStorePayload, UpdateStorePayload, StoreSummary, StoreDeliveryRow } from '@/types';

export const storesApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/stores', { params }).then((r) => unwrapPaginated<Store>(r)),

  create: (payload: CreateStorePayload) =>
    api.post<ApiResponse<Store>>('/admin/stores', payload).then((r) => r.data.data),

  update: (id: string, payload: UpdateStorePayload) =>
    api.put<ApiResponse<Store>>(`/admin/stores/${id}`, payload).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/stores/${id}`).then((r) => r.data),

  getById: (id: string) =>
    api.get<ApiResponse<Store>>(`/admin/stores/${id}`).then((r) => r.data.data),

  getSummary: (id: string, params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<StoreSummary>>(`/admin/stores/${id}/summary`, { params }).then((r) => r.data.data),

  getDeliveries: (id: string, params?: PaginationParams & { startDate?: string; endDate?: string }) =>
    api.get(`/admin/stores/${id}/deliveries`, { params }).then((r) => unwrapPaginated<StoreDeliveryRow>(r)),
};
