import api from '@/lib/axios';
import { unwrapPaginated } from '@/lib/unwrap-paginated';
import type { ApiResponse, PaginationParams, AppNotification } from '@/types';

export const notificationsApi = {
  list: (params?: PaginationParams) =>
    api.get('/admin/notifications', { params }).then((r) => unwrapPaginated<AppNotification>(r)),

  getUnreadCount: () =>
    api
      .get<ApiResponse<{ unreadCount: number }>>('/admin/notifications/count')
      .then((r) => r.data.data.unreadCount),

  markRead: (id: string) =>
    api.put<ApiResponse<null>>(`/admin/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.put<ApiResponse<null>>('/admin/notifications/read-all').then((r) => r.data),

  updateFcmToken: (fcmToken: string) =>
    api.put<ApiResponse<null>>('/admin/notifications/fcm-token', { fcmToken }).then((r) => r.data),
};
