import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { requestFcmToken, onForegroundMessage } from '@/lib/firebase';
import { notificationsApi } from '@/api/notifications.api';

/**
 * Registers the browser for FCM push (Android-style: token sent to backend,
 * which sends pushes for driver activity) and refreshes the in-app notification
 * feed/badge when a push arrives while the tab is open.
 */
export function useAdminNotifications() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;

    requestFcmToken().then((token) => {
      if (token) notificationsApi.updateFcmToken(token).catch(() => {});
    });

    onForegroundMessage((payload) => {
      if (payload.title) toast(payload.title, { icon: '🔔' });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] });
    });
  }, [isAuthenticated, queryClient]);
}
