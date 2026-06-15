import api from '@/lib/axios';
import type { ApiResponse, AdminDashboardData } from '@/types';

export const dashboardApi = {
  getSnapshot: (month?: string) =>
    api
      .get<ApiResponse<AdminDashboardData>>('/admin/dashboard', {
        params: month ? { month } : undefined,
      })
      .then((r) => r.data.data),
};
