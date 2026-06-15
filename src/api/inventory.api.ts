import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  DateFilterParams,
  Inventory,
  CreateInventoryPayload,
  VanLoad,
  AssignmentVanLoad,
  CreateVanLoadPayload,
  DamagedEgg,
  CreateDamagedEggPayload,
  DamageReason,
} from '@/types';

export const inventoryApi = {
  list: (params?: PaginationParams & DateFilterParams) =>
    api.get('/admin/inventory', { params }).then((r) => unwrapPaginated<Inventory>(r)),

  create: (payload: CreateInventoryPayload) =>
    api.post<ApiResponse<Inventory>>('/admin/inventory', payload).then((r) => r.data.data),

  getVanLoadsByAssignment: (vanAssignmentId: string) =>
    api
      .get<ApiResponse<AssignmentVanLoad[]>>(`/admin/inventory/van-loads/${vanAssignmentId}`)
      .then((r) => r.data.data),

  listVanLoads: (params?: PaginationParams) =>
    api.get('/admin/inventory/van-loads', { params }).then((r) => unwrapPaginated<VanLoad>(r)),

  createVanLoad: (payload: CreateVanLoadPayload) =>
    api.post<ApiResponse<VanLoad>>('/admin/inventory/van-loads', payload).then((r) => r.data.data),

  listDamaged: (
    params?: PaginationParams &
      DateFilterParams & { reason?: DamageReason | 'ALL' },
  ) =>
    api.get('/admin/inventory/damaged', { params }).then((r) => unwrapPaginated<DamagedEgg>(r)),

  createDamaged: (payload: CreateDamagedEggPayload) =>
    api
      .post<ApiResponse<DamagedEgg>>('/admin/inventory/damaged', payload)
      .then((r) => r.data.data),

  getDamagedById: (id: string) =>
    api.get<ApiResponse<DamagedEgg>>(`/admin/inventory/damaged/${id}`).then((r) => r.data.data),

  updateDamaged: (id: string, payload: Partial<CreateDamagedEggPayload>) =>
    api
      .put<ApiResponse<DamagedEgg>>(`/admin/inventory/damaged/${id}`, payload)
      .then((r) => r.data.data),

  deleteDamaged: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/inventory/damaged/${id}`).then((r) => r.data),
};
