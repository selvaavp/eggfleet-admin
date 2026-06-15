import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type { ApiResponse, PaginationParams, Route, CreateRoutePayload, UpdateRoutePayload } from '@/types';

export const routesApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/routes', { params }).then((r) => unwrapPaginated<Route>(r)),

  getById: (id: string) =>
    api.get<ApiResponse<Route>>(`/admin/routes/${id}`).then((r) => r.data.data),

  create: (payload: CreateRoutePayload) =>
    api.post<ApiResponse<Route>>('/admin/routes', payload).then((r) => r.data.data),

  update: (id: string, payload: UpdateRoutePayload) =>
    api.put<ApiResponse<Route>>(`/admin/routes/${id}`, payload).then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/routes/${id}`).then((r) => r.data),
};
