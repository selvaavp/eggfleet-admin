import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type { ApiResponse, PaginationParams, Employee, CreateEmployeePayload, UpdateEmployeePayload, EmployeeSummary, EmployeeDeliveryRow } from '@/types';

export const employeesApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/employees', { params }).then((r) => unwrapPaginated<Employee>(r)),

  getById: (id: string) =>
    api.get<ApiResponse<Employee>>(`/admin/employees/${id}`).then((r) => r.data.data),

  create: (payload: CreateEmployeePayload) =>
    api.post<ApiResponse<Employee>>('/admin/employees', payload).then((r) => r.data.data),

  update: (id: string, payload: UpdateEmployeePayload) =>
    api.put<ApiResponse<Employee>>(`/admin/employees/${id}`, payload).then((r) => r.data.data),

  uploadAvatar: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .patch<ApiResponse<{ profilePictureUrl: string }>>(`/admin/employees/${id}/avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  deleteEmployee: (id: string) =>
    api.delete(`/admin/employees/${id}`).then((r) => r.data),

  toggleStatus: (id: string) =>
    api.patch<ApiResponse<Employee>>(`/admin/employees/${id}/toggle-status`).then((r) => r.data.data),

  getSummary: (id: string, params?: { startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<EmployeeSummary>>(`/admin/employees/${id}/summary`, { params }).then((r) => r.data.data),

  getDeliveries: (id: string, params?: PaginationParams & { startDate?: string; endDate?: string }) =>
    api.get(`/admin/employees/${id}/deliveries`, { params }).then((r) => unwrapPaginated<EmployeeDeliveryRow>(r)),
};
