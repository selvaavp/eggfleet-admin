import api from '@/lib/axios';
import type { ApiResponse } from '@/types';
import type { DailySummaryData } from '@/types/reports.types';

export const reportsApi = {
  getDailySummary: (date?: string) =>
    api
      .get<ApiResponse<DailySummaryData>>('/admin/reports/daily-summary', {
        params: date ? { date } : undefined,
      })
      .then((r) => r.data.data),
};
