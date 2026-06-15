import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type {
  ApiResponse,
  PaginationParams,
  DateFilterParams,
  Expense,
  CreateExpensePayload,
  ExpenseCategory,
  ExpenseSummary,
} from '@/types';

export const expensesApi = {
  list: (params?: PaginationParams & DateFilterParams & { category?: ExpenseCategory | 'ALL' }) =>
    api.get('/admin/expenses', { params }).then((r) => unwrapPaginated<Expense>(r)),

  getSummary: (params?: DateFilterParams) =>
    api.get<ApiResponse<ExpenseSummary>>('/admin/expenses/summary', { params }).then((r) => r.data.data),

  create: (payload: CreateExpensePayload) =>
    api.post<ApiResponse<Expense>>('/admin/expenses', payload).then((r) => r.data.data),

  getById: (id: string) =>
    api.get<ApiResponse<Expense>>(`/admin/expenses/${id}`).then((r) => r.data.data),

  update: (id: string, payload: Partial<CreateExpensePayload>) =>
    api.put<ApiResponse<Expense>>(`/admin/expenses/${id}`, payload).then((r) => r.data.data),

  remove: (id: string) =>
    api.delete<ApiResponse<null>>(`/admin/expenses/${id}`).then((r) => r.data),
};
