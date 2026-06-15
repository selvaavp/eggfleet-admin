import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Truck,
  Wallet,
  ClipboardList,
  Building2,
  MapPin,
  LineChart,
  UserCog,
  ShoppingBasket,
  Handshake,
  Receipt,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { dashboardApi } from '@/api/dashboard.api';
import { vendorsApi } from '@/api/vendors.api';
import { storesApi } from '@/api/stores.api';
import { TransactionLedgerSection } from '@/components/payments/TransactionLedgerSection';
import { StatCard, statCardShellClass, PageLoader, Card, Table } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { APP_ROUTES } from '@/constants';
import { useDashboardStore } from '@/store/dashboard.store';
import type { VanStatusRow } from '@/types';
function initialsFromName(name?: string) {
  if (!name?.trim()) return '—';
  const p = name.trim().split(/\s+/);
  return `${p[0][0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase() || '—';
}

function formatVanLabel(vanNumber?: string) {
  if (!vanNumber?.trim()) return '—';
  return vanNumber.trim().toUpperCase();
}

function vanIconTint(row: VanStatusRow) {
  const cap = row.loadCapacity ?? 0;
  const loaded = row.loadedUnits ?? 0;
  const loadRatio = cap > 0 ? loaded / cap : 1;

  if (row.status === 'COMPLETED') {
    return { box: 'bg-neutral-100', icon: 'text-neutral-500' };
  }
  if (loadRatio <= 0.2 && cap > 0) {
    return { box: 'bg-red-50', icon: 'text-red-500' };
  }
  if (row.status === 'ACTIVE') {
    return { box: 'bg-emerald-50', icon: 'text-emerald-600' };
  }
  return { box: 'bg-primary/10', icon: 'text-primary' };
}

const DASHBOARD_LEDGER_PAGE_SIZE = 10;

export default function DashboardPage() {
  const navigate = useNavigate();
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);

  // Format to 'YYYY-MM' for API
  const monthParam = format(selectedMonth, 'yyyy-MM');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', monthParam],
    queryFn: () => dashboardApi.getSnapshot(monthParam),
  });

  const { data: vendorsPage } = useQuery({
    queryKey: ['dashboard-vendors-total'],
    queryFn: () => vendorsApi.list({ page: 1, limit: 1 }),
  });

  const { data: storesPage } = useQuery({
    queryKey: ['dashboard-stores-total'],
    queryFn: () => storesApi.list({ page: 1, limit: 1 }),
  });

  const d = data ?? {
    today: '',
    totalDeliveries: 0,
    totalCollected: 0,
    activeAssignments: 0,
    pendingHandovers: 0,
    totalEmployees: 0,
    totalStock: 0,
    availableStock: 0,
    availableUnits: 0,
    pendingPayments: 0,
    damagedEggsToday: 0,
    damagedEggsLoad: 0,
    damagedEggsDelivery: 0,
    totalExpenses: 0,
    totalVendorPayments: 0,
    netProfit: 0,
    vanStatus: [] as VanStatusRow[],
  };

  const vendorsTotal = vendorsPage?.total ?? 0;
  const storesTotal = storesPage?.total ?? 0;

  const damageTotal = d.damagedEggsToday ?? 0;
  const loadDamage = d.damagedEggsLoad ?? 0;
  const deliveryDamage = d.damagedEggsDelivery ?? 0;

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <Card className="max-w-lg">
        <p className="font-semibold text-dark">Dashboard could not be loaded</p>
        <p className="mt-2 text-sm text-muted">
          The stats API failed or the server is unreachable. Confirm the API is running and{' '}
          <code className="rounded bg-muted/40 px-1">VITE_API_BASE_URL</code> points to it, then refresh.
        </p>
      </Card>
    );
  }

  /** Figma row 1: orange icon tile, label, value */
  const row1Cards = [
    {
      title: 'Total Sale',
      value: formatINR(d.totalCollected, { fractionDigits: 0 }),
      icon: Wallet,
      colorClass: 'bg-[#FFF4E5] text-[#904D00]',
    },
    {
      title: 'Total Stock',
      value: d.totalStock.toLocaleString('en-IN'),
      icon: ClipboardList,
      colorClass: 'bg-[#FFF4E5] text-[#904D00]',
    },
    {
      title: 'Delivery Units',
      value: d.totalDeliveries.toLocaleString('en-IN'),
      icon: Truck,
      colorClass: 'bg-[#FFF4E5] text-[#904D00]',
    },
    {
      title: 'Available Units',
      value: d.availableUnits.toLocaleString('en-IN'),
      icon: ShoppingBasket,
      colorClass: 'bg-[#FFF4E5] text-[#904D00]',
    },
  ];

  /** Figma row 2: blue icon tile, label, value */
  const row2Cards = [
    {
      title: 'Total Vendors',
      value: vendorsTotal.toLocaleString('en-IN'),
      icon: Building2,
      colorClass: 'bg-[#EFF8FF] text-[#2563EB]',
    },
    {
      title: 'Total Customers',
      value: storesTotal.toLocaleString('en-IN'),
      icon: Handshake,
      colorClass: 'bg-[#EFF8FF] text-[#2563EB]',
    },
    {
      title: 'Total Employees',
      value: d.totalEmployees.toLocaleString('en-IN'),
      icon: UserCog,
      colorClass: 'bg-[#EFF8FF] text-[#2563EB]',
    },
  ];

  const netProfit = d.netProfit ?? 0;
  const isProfit = netProfit >= 0;

  /** Figma row 3: green expenses tile + sign-dependent net profit tile */
  const row3Cards = [
    {
      title: 'Total Expenses',
      value: formatINR(d.totalExpenses ?? 0, { fractionDigits: 0 }),
      icon: Receipt,
      colorClass: 'bg-[#F0FDF4] text-[#16A34A]',
    },
    {
      title: 'Net Profit',
      value: formatINR(netProfit, { fractionDigits: 0 }),
      icon: isProfit ? TrendingUp : TrendingDown,
      colorClass: isProfit ? 'bg-[#FAF5FF] text-[#9333EA]' : 'bg-[#FDE8EC] text-[#E64566]',
    },
  ];

  const vanColumns = [
    {
      key: 'vanDriver',
      header: 'Van / driver',
      render: (row: VanStatusRow) => {
        const tint = vanIconTint(row);
        return (
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-10 shrink-0 items-center justify-center rounded-xl',
                tint.box
              )}
            >
              <Truck className={cn('size-[18px]', tint.icon)} strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-bold leading-tight text-[#212121]">{formatVanLabel(row.vanNumber)}</p>
              <p className="mt-0.5 text-sm font-medium text-[#777777]">{row.driverName || '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (row: VanStatusRow) => (
        <div className="flex items-start gap-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#212121]" strokeWidth={2} />
          <span className="text-sm font-medium leading-snug text-[#212121]">
            {row.routeName?.trim() || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'load',
      header: 'Load stock',
      render: (row: VanStatusRow) => {
        const cap = row.loadCapacity ?? 0;
        const loaded = row.loadedUnits ?? 0;
        return (
          <p className="tabular-nums">
            <span className="text-xl font-bold text-[#212121]">{loaded}</span>
            {cap > 0 && (
              <span className="text-sm font-medium text-[#777777]">{` / ${cap} stock`}</span>
            )}
          </p>
        );
      },
    },
    {
      key: 'balance',
      header: 'Balance stock',
      render: (row: VanStatusRow) => (
        <span className="text-xl font-bold tabular-nums text-[#212121]">{row.balanceStock ?? 0}</span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {row1Cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className={statCardShellClass}>
          <div className="mb-3 flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#777777]">
              Damaged eggs
            </p>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FDE8EC] text-[#E64566]">
              <LineChart className="size-5" strokeWidth={2.2} />
            </span>
          </div>
          <p className="font-sans text-[32px] font-black tabular-nums leading-none tracking-tight text-[#212121] sm:text-[36px]">
            {damageTotal.toLocaleString('en-IN')}
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#777777]">
                <span>Load damage</span>
                <span className="tabular-nums text-[#E64566]">{loadDamage}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#E9E8E6]">
                <div
                  className="h-full rounded-full bg-[#E64566]"
                  style={{
                    width: damageTotal ? `${Math.min(100, Math.round((loadDamage / damageTotal) * 100))}%` : '0%',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#777777]">
                <span>Delivery damage</span>
                <span className="tabular-nums text-[#E64566]">{deliveryDamage}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#E9E8E6]">
                <div
                  className="h-full rounded-full bg-[#E64566]"
                  style={{
                    width: damageTotal
                      ? `${Math.min(100, Math.round((deliveryDamage / damageTotal) * 100))}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {row2Cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {row3Cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <section className="space-y-8">
        <div className="flex items-center justify-between gap-6">
          <h3 className="text-lg font-extrabold tracking-tight text-[#212121]">
            Today&apos;s Van Status
          </h3>
          <button
            type="button"
            onClick={() => navigate(APP_ROUTES.VANS)}
            className="shrink-0 text-md text-primary hover:underline"
          >
            View All Units
          </button>
        </div>
        <div className="overflow-hidden border border-[#E9E8E6] bg-white shadow-[0px_2px_12px_rgba(26,28,27,0.04)]">
          <Table<VanStatusRow>
            variant="vanStatus"
            columns={vanColumns}
            data={d.vanStatus}
            keyExtractor={(row) => row.assignmentId}
            emptyMessage="No van assignments for today"
          />
        </div>
      </section>

      <TransactionLedgerSection
        activeRoutes={d.activeAssignments}
        pageSize={DASHBOARD_LEDGER_PAGE_SIZE}
        queryKeySuffix={monthParam}
        emptyMessage="No payment transactions yet"
        cardClassName="rounded-none border border-[#E9E8E6] bg-white shadow-[0px_2px_12px_rgba(26,28,27,0.04)]"
        onViewDetails={() => navigate(APP_ROUTES.PAYMENTS)}
      />
    </div>
  );
}
