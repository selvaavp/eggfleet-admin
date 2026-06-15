import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  MapPin,
  Store,
  Truck,
  ClipboardList,
  UserCheck,
  HandshakeIcon,
  Wallet,
  Receipt,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

/** Matches Figma admin: white rail, orange left accent, dark labels, orange active pill */
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/payments', icon: Wallet, label: 'UPI & Hand Over' },
  { to: '/vans', icon: Truck, label: 'Van & Route' },
  { to: '/stores', icon: Store, label: 'Customer' },
  { to: '/employees', icon: UserCheck, label: 'Employee' },
  { to: '/vendors', icon: Users, label: 'Vendor' },
  { to: '/routes', icon: MapPin, label: 'Routes' },
  { to: '/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/handovers', icon: HandshakeIcon, label: 'Handovers' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col overflow-hidden border-r-[3px] border-primary bg-white shadow-[4px_0_24px_rgba(254,113,2,0.08)]">
      <div className="flex items-center justify-center border-b border-border px-4 py-3">
        <img
          src="/assets/auth/login/login-hero-illustration-2c7327.png"
          alt="EggFleet"
          className="h-auto max-h-[80px] w-full max-w-[180px] select-none object-contain"
          draggable={false}
        />
      </div>

      <nav className="scrollbar-hide flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-4 pb-2 font-display text-[12px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
          Menu
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'sidebar-nav-item',
                isActive ||
                  (to === '/inventory' &&
                    (pathname === '/inventory' || pathname.startsWith('/inventory/')))
                  ? 'active'
                  : ''
              )
            }
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={2} />
            <span className="font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border bg-neutral-50/50 px-3 py-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 ring-1 ring-black/[0.04]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-700 ring-1 ring-black/5">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-dark">{user?.name ?? 'Admin'}</p>
            <p className="truncate text-xs font-medium text-muted">{user?.role ?? 'Admin'}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="sidebar-nav-item sidebar-nav-item--logout w-full">
          <LogOut className="size-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
