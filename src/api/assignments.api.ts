import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  VanAssignment,
  CreateVanAssignmentPayload,
  UpdateVanAssignmentPayload,
} from '@/types';

export const assignmentsApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/assignments', { params }).then((r) => unwrapPaginated<VanAssignment>(r)),

  create: (payload: CreateVanAssignmentPayload) =>
    api
      .post<ApiResponse<VanAssignment>>('/admin/assignments', payload)
      .then((r) => r.data.data),

  update: (id: string, payload: UpdateVanAssignmentPayload) =>
    api
      .patch<ApiResponse<VanAssignment>>(`/admin/assignments/${id}`, payload)
      .then((r) => r.data.data),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/assignments/${id}`).then((r) => r.data),
};
