import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ClipboardList, Wallet, PackageCheck, AlertTriangle, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/auth.store';
import { notificationsApi } from '@/api/notifications.api';
import type { AppNotification, NotificationType } from '@/types';
import dummyProfilePic from '@/assets/dummy-profile-pic.png';

const NOTIF_ICONS: Record<NotificationType, { Icon: typeof Bell; className: string }> = {
  HANDOVER_SUBMITTED: { Icon: ClipboardList, className: 'bg-amber-100 text-amber-600' },
  PAYMENT_SUBMITTED: { Icon: Wallet, className: 'bg-blue-100 text-blue-600' },
  DELIVERY_RECORDED: { Icon: PackageCheck, className: 'bg-emerald-100 text-emerald-600' },
  DAMAGED_EGGS_REPORTED: { Icon: AlertTriangle, className: 'bg-red-100 text-red-600' },
  VEHICLE_ASSIGNMENT: { Icon: Bell, className: 'bg-neutral-100 text-neutral-600' },
  HANDOVER_APPROVAL: { Icon: ClipboardList, className: 'bg-amber-100 text-amber-600' },
  PAYMENT_CONFIRMATION: { Icon: Wallet, className: 'bg-blue-100 text-blue-600' },
};

function notificationRoute(notification: AppNotification): string {
  const data = (notification.data ?? {}) as Record<string, unknown>;
  switch (notification.type) {
    case 'HANDOVER_SUBMITTED':
      return '/handovers';
    case 'PAYMENT_SUBMITTED':
      return '/payments';
    case 'DAMAGED_EGGS_REPORTED':
      return '/inventory/damaged-eggs';
    case 'DELIVERY_RECORDED':
      return typeof data.storeId === 'string' ? `/stores/${data.storeId}` : '/dashboard';
    default:
      return '/dashboard';
  }
}

/** Orange search bar — fixed flush to the top of the main content column. */
export function PageTopBar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase()
    : 'Admin';

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['admin-notif-count'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  });

  const { data: notifData } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => notificationsApi.list({ page: 1, limit: 10 }),
    enabled: notifOpen,
    staleTime: 10_000,
  });

  const notifications = notifData?.data ?? [];

  const handleNotificationClick = async (notification: AppNotification) => {
    setNotifOpen(false);
    if (!notification.isRead) {
      await notificationsApi.markRead(notification.id);
      queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
    navigate(notificationRoute(notification));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead();
    queryClient.invalidateQueries({ queryKey: ['admin-notif-count'] });
    queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
  };

  return (
    <div className="relative z-30 shrink-0 bg-primary shadow-[0px_4px_12px_rgba(254,113,2,0.35)] print:hidden">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-3.5 lg:px-10">
        <div className="relative min-w-0 w-full sm:max-w-3xl sm:flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search customers, or stock..."
            className="w-full rounded-md border-0 bg-[#FDB881] py-3 pl-12 pr-5 text-body-sm font-medium text-dark shadow-inner placeholder:text-dark focus:outline-none focus:ring-2 focus:ring-[#A06D49]"
            aria-label="Search customers or stock"
          />
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto sm:gap-4">
          <div className="relative">
            <button
              ref={bellRef}
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative shrink-0 rounded-full p-2.5 text-white transition hover:bg-white/15"
              aria-label="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell className="size-6" strokeWidth={2} color='black'/>
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-white ring-2 ring-primary" />
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-light-grey bg-white shadow-[0px_8px_32px_rgba(0,0,0,0.14)]">
                <div className="flex items-center justify-between border-b border-light-grey px-4 py-3">
                  <p className="text-sm font-bold text-[#1a1c1b]">Notifications</p>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="rounded-full p-1 text-[#757575] hover:bg-neutral-100"
                      aria-label="Close notifications"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map((notification) => {
                    const { Icon, className } = NOTIF_ICONS[notification.type] ?? NOTIF_ICONS.VEHICLE_ASSIGNMENT;
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${
                          notification.isRead ? '' : 'bg-orange-50/60'
                        }`}
                      >
                        <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${className}`}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1a1c1b]">{notification.title}</p>
                          <p className="mt-0.5 truncate text-xs text-[#757575]">{notification.body}</p>
                          <p className="mt-0.5 text-[10px] text-[#9e9e9e]">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}

                  {notifications.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto mb-2 size-8 text-light-grey" />
                      <p className="text-sm font-medium text-[#757575]">No notifications yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="ml-1 flex min-w-0 max-w-[240px] items-center gap-3 border-l border-white/40 pl-4 sm:max-w-[260px]">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-black">{user?.name ?? 'Admin User'}</p>
              <p className="truncate text-xs font-medium text-black/85">
                {user?.role === 'ADMIN' ? 'Logistics Head' : roleLabel}
              </p>
            </div>
            <img
              src={dummyProfilePic}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white/35 sm:size-11"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
