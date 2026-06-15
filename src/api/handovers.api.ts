import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  Handover,
  HandoverStatus,
} from '@/types';

export const handoversApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/handovers', { params }).then((r) => unwrapPaginated<Handover>(r)),

  getById: (id: string) =>
    api.get<ApiResponse<Handover>>(`/admin/handovers/${id}`).then((r) => r.data.data),

  updateStatus: (id: string, status: HandoverStatus, rejectionReason?: string) =>
    api
      .patch<ApiResponse<Handover>>(`/admin/handovers/${id}/status`, {
        status,
        ...(rejectionReason?.trim() ? { rejectionReason: rejectionReason.trim() } : {}),
      })
      .then((r) => r.data.data),

  update: (id: string, payload: Partial<Handover>) =>
    api.patch<ApiResponse<Handover>>(`/admin/handovers/${id}`, payload).then((r) => r.data.data),
};
