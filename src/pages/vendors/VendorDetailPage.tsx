import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Building2,
  Download,
  Smartphone,
  Banknote,
  Landmark,
  Calendar,
  Phone,
  MapPin,
} from 'lucide-react';
import { vendorsApi } from '@/api/vendors.api';
import { PageLoader, PageLoadError, DateRangePicker } from '@/components/ui';
import { VendorFormModal } from '@/components/vendors/VendorFormModal';
import { VendorHistoryTable, type VendorHistoryColumn } from '@/components/vendors/VendorHistoryTable';
import type { VendorFormValues } from '@/components/vendors/vendor-form.schema';
import { formatINR } from '@/lib/format';
import { formatDateTime, cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import type { VendorPurchase, VendorPayment } from '@/types';

const sectionCardClass =
  'overflow-hidden rounded-[12px] border border-[#E9E8E6] bg-white shadow-[0px_2px_12px_rgba(26,28,27,0.04)]';

function formatCompactCount(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = n / 1000;
    return Number.isInteger(k) ? `${k.toFixed(0)}k` : `${k.toFixed(1)}k`;
  }
  return n.toLocaleString('en-IN');
}

const kpiBorderDefault = 'border-primary';
const kpiBorderPending = 'border-[#E5C4E8]';

function VendorKpiCard({
  label,
  value,
  valueNode,
  valueClassName = 'text-[#212121]',
  borderClassName = kpiBorderDefault,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  valueClassName?: string;
  borderClassName?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[104px] flex-col justify-between rounded-[12px] border bg-white p-4',
        borderClassName,
      )}
    >
      <p className="text-md font-semibold leading-snug text-taupe">{label}</p>
      <div className={cn('mt-3 text-[26px] font-extrabold tabular-nums leading-none tracking-tight', valueClassName)}>
        {valueNode ?? value}
      </div>
    </div>
  );
}

function PaymentMethodIcon({ method }: { method: string }) {
  if (method === 'UPI') return <Smartphone className="size-4 shrink-0 text-primary" strokeWidth={2} />;
  if (method === 'BANK_TRANSFER') return <Landmark className="size-4 shrink-0 text-blue-600" strokeWidth={2} />;
  return <Banknote className="size-4 shrink-0 text-emerald-600" strokeWidth={2} />;
}

function formatMethodLabel(method: string) {
  if (method === 'BANK_TRANSFER') return 'BANK';
  return method.replace('_', ' ');
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  const [rangeStart, setRangeStart] = useState<Date | null>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [rangeEnd, setRangeEnd] = useState<Date | null>(new Date());
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);

  const dateParams = useMemo(() => {
    return {
      startDate: rangeStart ? format(rangeStart, 'yyyy-MM-dd') : undefined,
      endDate: rangeEnd ? format(rangeEnd, 'yyyy-MM-dd') : undefined,
    };
  }, [rangeStart, rangeEnd]);

  const { data: vendor, isLoading: vendorLoading, isError: vendorError } = useQuery({
    queryKey: ['vendor-detail', id],
    queryFn: () => vendorsApi.getById(id!),
    enabled: !!id,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['vendor-summary', id, dateParams],
    queryFn: () => vendorsApi.getSummary(id!, dateParams),
    enabled: !!id,
  });

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['vendor-purchases', id, purchasePage, dateParams],
    queryFn: () =>
      vendorsApi.getPurchases(id!, { page: purchasePage, limit: DEFAULT_PAGE_SIZE, ...dateParams }),
    enabled: !!id,
  });

  const { data: paymentHistory, isLoading: paymentsLoading } = useQuery({
    queryKey: ['vendor-payment-history', id, paymentPage, dateParams],
    queryFn: () =>
      vendorsApi.getPaymentHistory(id!, { page: paymentPage, limit: DEFAULT_PAGE_SIZE, ...dateParams }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: VendorFormValues) => vendorsApi.update(id!, payload),
    onSuccess: () => {
      toast.success('Vendor updated');
      qc.invalidateQueries({ queryKey: ['vendor-detail', id] });
      qc.invalidateQueries({ queryKey: ['vendors'] });
      setShowEditModal(false);
    },
    onError: () => toast.error('Failed to update vendor'),
  });

  const purchaseColumns = useMemo((): VendorHistoryColumn<VendorPurchase>[] => {
    const vendorName = vendor?.name ?? '—';
    return [
      {
        key: 'purchaseDate',
        header: 'DATE & TIME',
        render: (row: VendorPurchase) => {
          const dt = row.purchaseDate ? new Date(row.purchaseDate) : null;
          const timeRaw = row.createdAt;
          const timeDt = timeRaw ? new Date(timeRaw) : null;
          return (
            <div>
              <p className="text-sm font-semibold text-[#212121]">
                {dt && isValid(dt) ? format(dt, 'MMM dd, yyyy') : '—'}
              </p>
              <p className="text-xs font-medium text-[#777777]">
                {timeDt && isValid(timeDt) ? format(timeDt, 'hh:mm a') : '—'}
              </p>
            </div>
          );
        },
      },
      {
        key: 'vendor',
        header: 'VENDOR NAME',
        render: (row: VendorPurchase) => (
          <span className="inline-flex max-w-full rounded-full bg-[#F5F5F4] px-3 py-1.5 text-xs font-bold text-[#212121]">
            {row.vendor?.name ?? vendorName}
          </span>
        ),
      },
      {
        key: 'totalUnits',
        header: 'QTY',
        render: (row: VendorPurchase) => (
          <span className="text-sm font-bold text-[#212121]">
            {Number(row.totalUnits).toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        key: 'ratePerUnit',
        header: 'RATE',
        render: (row: VendorPurchase) => (
          <span className="text-sm font-semibold text-[#212121]">
            {formatINR(Number(row.ratePerUnit), { fractionDigits: 2 })}
          </span>
        ),
      },
      {
        key: 'totalAmount',
        header: 'TOTAL',
        render: (row: VendorPurchase) => (
          <span className="text-sm font-extrabold text-[#904D00]">
            {formatINR(Number(row.totalAmount), { fractionDigits: 2 })}
          </span>
        ),
        align: 'right',
      },
    ];
  }, [vendor?.name]);

  const paymentColumns = useMemo((): VendorHistoryColumn<VendorPayment>[] => [
    {
      key: 'transaction',
      header: 'TRANSACTION DETAILS',
      render: (row: VendorPayment) => {
        const raw = row.paidAt ?? row.createdAt;
        const dt = raw ? new Date(raw) : null;
        return (
          <p className="text-sm font-bold text-[#212121]">
            {dt && isValid(dt) ? format(dt, 'MMM dd, yyyy') : '—'}
          </p>
        );
      },
    },
    {
      key: 'paymentMethod',
      header: 'METHOD',
      render: (row: VendorPayment) => (
        <div className="flex items-center gap-2">
          <PaymentMethodIcon method={row.paymentMethod} />
          <span className="text-sm font-bold uppercase tracking-wide text-[#212121]">
            {formatMethodLabel(row.paymentMethod)}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'AMOUNT',
      align: 'right',
      render: (row: VendorPayment) => (
        <span className="text-sm font-extrabold text-[#212121]">
          {formatINR(Number(row.amount), { fractionDigits: 2 })}
        </span>
      ),
    },
  ], []);

  const handleDownloadPayments = () => {
    if (!vendor) return;
    const rows = (paymentHistory?.data ?? []).map((p) => [
      p.id,
      vendor.name,
      p.paymentMethod,
      p.amount,
      formatDateTime(p.paidAt ?? p.createdAt),
      p.notes ?? '',
    ]);
    downloadCsv(`vendor-payments-${vendor.name}-${today}`, ['ID', 'Vendor', 'Method', 'Amount', 'Date', 'Notes'], rows);
    toast.success('Report downloaded');
  };

  if (vendorLoading) return <PageLoader />;
  if (vendorError || !vendor) {
    return (
      <div className="p-6">
        <PageLoadError title="Vendor not found" />
      </div>
    );
  }

  const phoneDigits = (vendor.phone ?? '').replace(/\D/g, '');

  return (
    <div className="space-y-6">
      {/* Profile card — Figma: icon, name, phone · address, Edit + Report */}
      <div className={cn(sectionCardClass, 'px-6 py-5')}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-[52px] shrink-0 items-center justify-center rounded-[12px] bg-[#FFF4E5]">
              <Building2 className="size-6 text-[#904D00]" strokeWidth={2.1} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold leading-tight text-[#212121] sm:text-2xl">
                {vendor.name}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[#777777]">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-[#9CA3AF]" strokeWidth={2.25} aria-hidden />
                  {phoneDigits.length === 10
                    ? `+91 ${phoneDigits.slice(0, 5)} ${phoneDigits.slice(5)}`
                    : vendor.phone?.trim() || '—'}
                </span>
                {vendor.address?.trim() && (
                  <>
                    <span className="text-[#D1D5DB]" aria-hidden>
                      ·
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0 text-[#9CA3AF]" strokeWidth={2.25} aria-hidden />
                      <span className="truncate">{vendor.address}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:pl-4">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#212121] transition hover:bg-[#FAFAF9]"
            >
              Edit Profile
            </button>
            <button
              type="button"
              onClick={handleDownloadPayments}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(254,113,2,0.35)] transition hover:bg-primary-dark"
            >
              <Download className="size-4" strokeWidth={2.25} aria-hidden />
              Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI row — Figma: primary border, colored values, pending has pink border */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4">
        {summaryLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[104px] animate-pulse rounded-[12px] border border-primary/30 bg-white"
            />
          ))
        ) : (
          <>
            <VendorKpiCard
              label="Total Eggs Purchased"
              value={formatCompactCount(summary?.totalEggsPurchased ?? 0)}
              valueClassName="text-[#904D00]"
            />
            <VendorKpiCard
              label="Sale Egg Value"
              value={formatINR(summary?.saleEggValue ?? 0, { fractionDigits: 0 })}
              valueClassName="text-[#212121]"
            />
            <VendorKpiCard
              label="Net Profit"
              value={formatINR(summary?.netProfit ?? 0, { fractionDigits: 0 })}
              valueClassName={(summary?.netProfit ?? 0) >= 0 ? 'text-[#0F766E]' : 'text-red-600'}
            />
            <VendorKpiCard
              label="Pending Amount"
              value={formatINR(summary?.pendingAmount ?? 0, { fractionDigits: 0 })}
              valueClassName="text-red-600"
              borderClassName={kpiBorderPending}
            />
            <VendorKpiCard
              label="Damaged Eggs"
              valueNode={
                <>
                  <span className="text-[#212121]">
                    {formatCompactCount(summary?.damagedEggs ?? 0)}
                  </span>
                  <span className="ml-1 text-base font-semibold text-[#777777]">units</span>
                </>
              }
            />
            <VendorKpiCard
              label="Total Paid"
              value={formatINR(summary?.totalPaid ?? 0, { fractionDigits: 0 })}
              valueClassName="text-[#904D00]"
            />
          </>
        )}
      </div>

      {/* History filters */}
      <div className="flex flex-col gap-3 rounded-[12px] border border-primary bg-[#F4F3F1] px-5 py-4 shadow-[0px_2px_12px_rgba(26,28,27,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-4 shrink-0 text-[#904D00]" strokeWidth={2.25} aria-hidden />
          <span className="text-sm font-bold text-[#212121]">History Filters</span>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            startDate={rangeStart}
            endDate={rangeEnd}
            onChange={(s, e) => {
              setRangeStart(s);
              setRangeEnd(e);
              setPurchasePage(1);
              setPaymentPage(1);
            }}
          />
          {(rangeStart || rangeEnd) && (
            <button
              type="button"
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
                setPurchasePage(1);
                setPaymentPage(1);
              }}
              className="inline-flex h-10 items-center rounded-[12px] border border-[#E9E8E6] bg-white px-4 text-sm font-bold text-[#57534e] transition hover:bg-[#FAFAF9]"
            >
              All time
            </button>
          )}
        </div>
      </div>

      <VendorHistoryTable
        title="Purchase History"
        columns={purchaseColumns}
        data={purchases?.data ?? []}
        keyExtractor={(r) => r.id}
        gridClassName="grid-cols-1 sm:grid-cols-[1.35fr_1.15fr_0.75fr_0.85fr_0.9fr]"
        isLoading={purchasesLoading}
        emptyMessage="No purchases in this period"
        page={purchasePage}
        totalPages={purchases?.totalPages ?? 1}
        onPageChange={setPurchasePage}
      />

      <VendorHistoryTable
        title="Payment History"
        columns={paymentColumns}
        data={paymentHistory?.data ?? []}
        keyExtractor={(r) => r.id}
        gridClassName="grid-cols-1 sm:grid-cols-[1.5fr_1fr_0.85fr]"
        isLoading={paymentsLoading}
        emptyMessage="No payments in this period"
        page={paymentPage}
        totalPages={paymentHistory?.totalPages ?? 1}
        onPageChange={setPaymentPage}
        headerAction={
          <button
            type="button"
            onClick={handleDownloadPayments}
            className="flex size-9 items-center justify-center rounded-[12px] text-[#57534e] transition hover:bg-white/80 hover:text-[#212121]"
            aria-label="Download payment history"
          >
            <Download className="size-5" strokeWidth={2} />
          </button>
        }
      />

      <VendorFormModal
        mode="edit"
        open={showEditModal}
        vendor={vendor}
        onClose={() => setShowEditModal(false)}
        onSubmit={(values) => updateMutation.mutate(values)}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
