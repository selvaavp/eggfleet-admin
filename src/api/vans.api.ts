import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type { ApiResponse, PaginationParams, Van, CreateVanPayload, VanFleetItem, VanDetailResponse } from '@/types';

export const vansApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/vans', { params }).then((r) => unwrapPaginated<Van>(r)),

  getById: (id: string) =>
    api.get<ApiResponse<Van>>(`/admin/vans/${id}`).then((r) => r.data.data),

  create: (payload: CreateVanPayload) =>
    api.post<ApiResponse<Van>>('/admin/vans', payload).then((r) => r.data.data),

  getFleetOverview: (date: string) =>
    api.get<ApiResponse<VanFleetItem[]>>('/admin/vans/fleet-overview', { params: { date } }).then((r) => r.data.data),

  getVanDetail: (vanId: string, date: string, page = 1, limit = 10) =>
    api
      .get<ApiResponse<VanDetailResponse>>(`/admin/vans/${vanId}/detail`, { params: { date, page, limit } })
      .then((r) => r.data.data),
};
