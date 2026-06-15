import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { MoreHorizontal } from 'lucide-react';
import type { Column } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EmployeeDeliveryRow, StoreDeliveryRow } from '@/types';

export const ROUTE_ACTIVITY_LEDGER_CARD_CLASS =
  'overflow-hidden rounded-[12px] border border-[#E9E8E6] bg-white shadow-[0px_2px_12px_rgba(26,28,27,0.04)]';

export type RouteActivityLedgerSummary = {
  collected: number;
  upi: number;
  partial: number;
  pending: number;
};

const chipBase =
  'inline-flex w-fit items-center justify-center rounded-full px-3.5 py-1.5 text-body-md font-bold uppercase tracking-wide';

export function LedgerSummaryStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="min-w-[72px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-taupe">{label}</p>
      <p className={cn('mt-1 text-xl font-extrabold leading-none tabular-nums', valueClassName)}>
        {value}
      </p>
    </div>
  );
}

export function RouteActivityPaymentMethodChip({ method }: { method: string | null }) {
  const key = (method ?? 'PENDING').toUpperCase();
  if (key === 'UPI') {
    return <span className={cn(chipBase, 'bg-blue-50 text-blue-700')}>UPI</span>;
  }
  if (key === 'CASH') {
    return <span className={cn(chipBase, 'bg-[#FFF4E5] text-[#904D00]')}>CASH</span>;
  }
  return <span className={cn(chipBase, 'bg-[#F5F5F4] text-[#57534e]')}>PENDING</span>;
}

export function RouteActivityPaymentStatusChip({ status }: { status: string }) {
  if (status === 'PAID') {
    return (
      <span className={cn(chipBase, 'gap-2 bg-emerald-50 text-emerald-700')}>
        <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        Full
      </span>
    );
  }
  if (status === 'PARTIAL') {
    return (
      <span className={cn(chipBase, 'gap-2 bg-orange-50 text-orange-600')}>
        <span className="size-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
        Partial
      </span>
    );
  }
  return (
    <span className={cn(chipBase, 'gap-2 bg-red-50 text-red-700')}>
      <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
      None
    </span>
  );
}

export function RouteActivityDeliveryActionMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="rounded-lg p-1.5 text-[#9CA3AF] transition hover:bg-[#F5F5F4] hover:text-[#57534e]"
        aria-label="Row actions"
      >
        <MoreHorizontal className="size-5" strokeWidth={2.25} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-lg">
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm font-medium text-[#212121] hover:bg-[#FAFAF9]"
            onClick={() => {
              setOpen(false);
              toast('Delivery details coming soon');
            }}
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}

export function formatRouteActivityVanLabel(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  if (/^van\s/i.test(trimmed)) return trimmed;
  return `Van ${trimmed}`;
}

export function buildStoreRouteLedgerColumns(): Column<StoreDeliveryRow>[] {
  return [
    {
      key: 'vanName',
      header: 'VAN NAME',
      width: '14%',
      render: (d) => (
        <span className="text-body-md font-bold text-[#212121]">{d.vanName || '—'}</span>
      ),
    },
    {
      key: 'ratePerUnit',
      header: 'EGG RATE',
      width: '11%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-medium tabular-nums text-taupe">
          {formatINR(Number(d.ratePerUnit), { fractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'totalUnits',
      header: 'TOTAL EGG UNITS',
      width: '14%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-medium tabular-nums text-taupe">
          {Number(d.totalUnits).toLocaleString('en-IN')} Units
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'TOTAL AMOUNT',
      width: '13%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-extrabold tabular-nums text-[#904D00]">
          {formatINR(Number(d.totalAmount), { fractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'PAYMENT METHOD',
      width: '16%',
      align: 'center',
      render: (d) => (
        <div className="flex justify-center">
          <RouteActivityPaymentMethodChip method={d.paymentMethod} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '14%',
      align: 'center',
      render: (d) => (
        <div className="flex justify-center">
          <RouteActivityPaymentStatusChip status={d.paymentStatus} />
        </div>
      ),
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '10%',
      align: 'center',
      render: () => <RouteActivityDeliveryActionMenu />,
    },
  ];
}

export function buildEmployeeRouteLedgerColumns(): Column<EmployeeDeliveryRow>[] {
  return [
    {
      key: 'storeName',
      header: 'STORE NAME',
      width: '16%',
      render: (d) => (
        <span className="text-body-md font-bold text-[#212121]">{d.storeName || '—'}</span>
      ),
    },
    {
      key: 'ratePerUnit',
      header: 'EGG RATE',
      width: '11%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-medium tabular-nums text-taupe">
          {formatINR(Number(d.ratePerUnit), { fractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'totalUnits',
      header: 'TOTAL EGG UNITS',
      width: '14%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-medium tabular-nums text-taupe">
          {Number(d.totalUnits).toLocaleString('en-IN')} Units
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'TOTAL AMOUNT',
      width: '13%',
      align: 'center',
      render: (d) => (
        <span className="text-body-md font-extrabold tabular-nums text-[#904D00]">
          {formatINR(Number(d.totalAmount), { fractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'PAYMENT METHOD',
      width: '16%',
      align: 'center',
      render: (d) => (
        <div className="flex justify-center">
          <RouteActivityPaymentMethodChip method={d.paymentMethod} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '14%',
      align: 'center',
      render: (d) => (
        <div className="flex justify-center">
          <RouteActivityPaymentStatusChip status={d.paymentStatus} />
        </div>
      ),
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '10%',
      align: 'center',
      render: () => <RouteActivityDeliveryActionMenu />,
    },
  ];
}
