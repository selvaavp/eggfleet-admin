import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Download,
  Phone,
  MapPin,
  Bike,
  Store as StoreIcon,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { storesApi } from '@/api/stores.api';
import { RouteActivityLedger } from '@/components/ledger/RouteActivityLedger';
import { PageLoader, PageLoadError, DateRangePicker } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import {
  buildStoreRouteLedgerColumns,
  formatRouteActivityVanLabel,
} from '@/lib/route-activity-ledger';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import toast from 'react-hot-toast';

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function formatStorePhone(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone?.trim() || '—';
}

function StoreMetaChip({
  icon: Icon,
  children,
  pill = true,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  pill?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-sm font-semibold text-taupe',
        pill && 'rounded-full bg-[#F4F3F1] px-3.5 py-2 shadow-[0px_1px_2px_rgba(0,0,0,0.04)]',
      )}
    >
      <Icon className="size-4 shrink-0 text-[#904D00]" strokeWidth={2.25} aria-hidden />
      <span className="leading-none">{children}</span>
    </span>
  );
}

function StoreKpiCard({
  label,
  value,
  unit,
  valueClassName = 'text-[#212121]',
  unitClassName,
  borderClassName = 'border-primary',
}: {
  label: string;
  value: string;
  unit?: string;
  valueClassName?: string;
  unitClassName?: string;
  borderClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[120px] flex-col justify-between rounded-[12px] border bg-white p-4',
        borderClassName,
      )}
    >
      <p className="text-[12px] font-bold uppercase tracking-wider text-[#777777]">{label}</p>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={cn(
              'text-[36px] font-extrabold leading-none tracking-tight tabular-nums',
              valueClassName,
            )}
          >
            {value}
          </span>
          {unit ? (
            <span
              className={cn(
                'text-[12px] font-bold uppercase leading-none tracking-wide',
                unitClassName ?? valueClassName,
              )}
            >
              {unit}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-xs font-medium italic text-[#9CA3AF]">Till date summary</p>
      </div>
    </div>
  );
}

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const [rangeStart, setRangeStart] = useState<Date | null>(currentMonthStart);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => new Date());
  const [paymentFilter, setPaymentFilter] = useState('ALL');

  const today = format(new Date(), 'yyyy-MM-dd');
  const firstDayOfMonth = format(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    'yyyy-MM-dd',
  );

  const dateParams = useMemo(() => {
    const start = rangeStart ? format(rangeStart, 'yyyy-MM-dd') : firstDayOfMonth;
    const end = rangeEnd ? format(rangeEnd, 'yyyy-MM-dd') : today;
    return { startDate: start, endDate: end };
  }, [rangeStart, rangeEnd, firstDayOfMonth, today]);

  const { data: store, isLoading: storeLoading, isError: storeError } = useQuery({
    queryKey: ['store', id],
    queryFn: () => storesApi.getById(id!),
    enabled: !!id,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['store-summary', id],
    queryFn: () => storesApi.getSummary(id!),
    enabled: !!id,
  });

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['store-deliveries', id, page, dateParams],
    queryFn: () =>
      storesApi.getDeliveries(id!, {
        page,
        limit: DEFAULT_PAGE_SIZE,
        ...dateParams,
      }),
    enabled: !!id,
  });

  const deliveries = deliveriesData?.data ?? [];
  const filteredDeliveries = useMemo(() => {
    if (paymentFilter === 'ALL') return deliveries;
    if (paymentFilter === 'PAID') return deliveries.filter((d) => d.paymentStatus === 'PAID');
    if (paymentFilter === 'PARTIAL') return deliveries.filter((d) => d.paymentStatus === 'PARTIAL');
    if (paymentFilter === 'UNPAID') return deliveries.filter((d) => d.paymentStatus === 'UNPAID');
    return deliveries;
  }, [deliveries, paymentFilter]);

  const displayVanLabel = formatRouteActivityVanLabel(deliveries[0]?.vanName);

  const ledgerCollected = summary?.totalCollected ?? 0;
  const upiTotal = deliveries
    .filter((d) => d.paymentMethod === 'UPI')
    .reduce((s, d) => s + Number(d.totalAmount), 0);
  const partialTotal = deliveries
    .filter((d) => d.paymentStatus === 'PARTIAL')
    .reduce((s, d) => s + Number(d.totalAmount), 0);
  const pendingTotal = deliveries
    .filter((d) => d.paymentStatus === 'UNPAID')
    .reduce((s, d) => s + Number(d.totalAmount), 0);

  const total = deliveriesData?.total ?? 0;
  const totalPages = deliveriesData?.totalPages ?? 1;
  const pageSize = deliveriesData?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = Math.min(page * pageSize, total);

  const ledgerColumns = buildStoreRouteLedgerColumns();

  function handleDownload() {
    if (!filteredDeliveries.length) {
      toast.error('No rows to export');
      return;
    }
    downloadCsv(
      `store-${store?.name ?? id}-deliveries`,
      ['Van', 'Egg Rate', 'Total Units', 'Total Amount', 'Payment Method', 'Status'],
      filteredDeliveries.map((d) => [
        d.vanName,
        d.ratePerUnit,
        d.totalUnits,
        d.totalAmount,
        d.paymentMethod ?? 'PENDING',
        d.paymentStatus,
      ]),
    );
    toast.success('Report downloaded');
  }

  if (storeLoading) return <PageLoader />;

  if (storeError || !store) {
    return (
      <div className="py-6">
        <PageLoadError title="Could not load store details" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Link
              to={APP_ROUTES.STORES}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F4F3F1] text-[#904D00] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#EBE8E4]"
              aria-label="Back to customers"
            >
              <ArrowLeft className="size-5" strokeWidth={2.5} aria-hidden />
            </Link>
            <h1 className="font-sans text-[26px] font-extrabold leading-tight tracking-tight text-[#212121] sm:text-[30px]">
              {store.name}
            </h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 pl-4 sm:gap-2.5">
            <StoreMetaChip icon={Phone} pill={false}>
              {formatStorePhone(store.phone)}
            </StoreMetaChip>
            {store.route?.name ? (
              <StoreMetaChip icon={MapPin}>{store.route.name}</StoreMetaChip>
            ) : null}
            {displayVanLabel ? (
              <StoreMetaChip icon={Bike}>{displayVanLabel}</StoreMetaChip>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-[12px] bg-primary px-5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(254,113,2,0.35)] transition hover:bg-primary-dark sm:mt-0.5"
        >
          <Download className="size-4" strokeWidth={2.25} aria-hidden />
          Download Report
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[120px] animate-pulse rounded-[12px] border border-primary/30 bg-white"
            />
          ))
        ) : (
          <>
            <StoreKpiCard
              label="Total Deliveries"
              value={(summary?.totalDeliveries ?? 0).toLocaleString('en-IN')}
              unit="QTY"
            />
            <StoreKpiCard
              label="Total Sales Amount"
              value={formatINR(summary?.totalSalesAmount ?? 0, { fractionDigits: 0 })}
            />
            <StoreKpiCard
              label="Total Collected"
              value={formatINR(summary?.totalCollected ?? 0, { fractionDigits: 0 })}
              valueClassName="text-[#0F766E]"
            />
            <StoreKpiCard
              label="Pending Amount"
              value={formatINR(summary?.pendingAmount ?? 0, { fractionDigits: 0 })}
              valueClassName="text-red-600"
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-[12px] bg-[#FDF8F3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0 text-[#212121]" strokeWidth={2.25} aria-hidden />
            <span className="text-sm font-bold text-[#212121]">Filters:</span>
          </div>
          <DateRangePicker
            variant="pill"
            labelFormat="compact"
            startDate={rangeStart}
            endDate={rangeEnd}
            onChange={(s, e) => {
              setRangeStart(s);
              setRangeEnd(e);
              setPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="store-payment-filter" className="text-sm font-bold text-[#212121]">
              Payment:
            </label>
            <div className="relative">
              <select
                id="store-payment-filter"
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 min-w-[100px] appearance-none rounded-full border border-light-grey bg-white py-2 pl-4 pr-9 text-sm font-semibold text-[#212121] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="ALL">All</option>
                <option value="PAID">Full</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">None</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#212121]"
                strokeWidth={2.25}
                aria-hidden
              />
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRangeStart(currentMonthStart());
            setRangeEnd(new Date());
            setPaymentFilter('ALL');
            setPage(1);
          }}
          className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#904D00] transition hover:text-[#7A3F00] sm:self-center"
        >
          <RotateCcw className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Reset Filters
        </button>
      </div>

      <RouteActivityLedger
        subtitle={{ kind: 'store', label: store.name }}
        summary={{
          collected: ledgerCollected,
          upi: upiTotal,
          partial: partialTotal,
          pending: pendingTotal,
        }}
        columns={ledgerColumns}
        data={filteredDeliveries}
        isLoading={deliveriesLoading}
        emptyMessage="No deliveries found for this period."
        emptyIcon={<StoreIcon className="size-10 text-border" />}
        page={page}
        totalPages={totalPages}
        total={total}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onPageChange={setPage}
      />
    </div>
  );
}
