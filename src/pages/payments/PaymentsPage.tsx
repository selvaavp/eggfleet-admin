import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Wallet,
  Plus,
  Search,
  ShieldCheck,
  Smartphone,
  Banknote,
  Building2,
  Download,
  History,
  Check,
  SlidersHorizontal,
  MoreVertical,
} from 'lucide-react';
import { paymentsApi } from '@/api/payments.api';
import { vendorsApi } from '@/api/vendors.api';
import { handoversApi } from '@/api/handovers.api';
import { dashboardApi } from '@/api/dashboard.api';
import { useDashboardStore } from '@/store/dashboard.store';
import {
  Button,
  Badge,
  Card,
  Table,
  Modal,
  Pagination,
  Select,
  Input,
  PageLoadError,
  type Column,
} from '@/components/ui';
import type {
  DriverPayment,
  VendorPayment,
  PaymentStatus,
  PaymentMethod,
  VendorPaymentStatus,
  Handover,
  HandoverStatus,
} from '@/types';
import {
  DEFAULT_PAGE_SIZE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANTS,
  VENDOR_PAYMENT_STATUS_LABELS,
  VENDOR_PAYMENT_STATUS_VARIANTS,
  PAYMENT_METHOD_OPTIONS,
  HANDOVER_UI_STATUS_LABELS,
  HANDOVER_STATUS_VARIANTS,
  HANDOVER_STATUS_OPTIONS,
} from '@/constants';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { TRANSACTION_LEDGER_QUERY_KEY, formatLedgerAmount } from '@/lib/transaction-ledger';
import { TransactionLedgerSection } from '@/components/payments/TransactionLedgerSection';
import {
  handoverDateTime,
  handoverEggSummary,
  handoverVanLabel,
} from '@/lib/handover-display';

// ─── Vendor Payment Modal Schema ──────────────────────────────────────────────

const vendorPaymentSchema = z.object({
  vendorId: z.string().min(1, 'Please select a vendor'),
  amount: z.string().min(1, 'Amount is required'),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']),
  paymentDate: z.string().min(1, 'Payment date is required'),
  status: z.enum(['PAID', 'PARTIAL', 'PENDING']),
  notes: z.string().optional(),
});
type VendorPaymentForm = z.infer<typeof vendorPaymentSchema>;

// ─── Shared ───────────────────────────────────────────────────────────────────

function initialsFromName(name?: string) {
  if (!name?.trim()) return '—';
  const p = name.trim().split(/\s+/);
  return `${p[0][0] ?? ''}${p[1]?.[0] ?? ''}`.toUpperCase() || '—';
}

function handoverStackedDateTime(h: Handover): { date: string; time: string } {
  if (!h.handoverDate) return { date: '—', time: '—' };
  const dt = new Date(h.handoverDate);
  if (!isValid(dt)) return { date: '—', time: '—' };
  let timeLine = '—';
  const t = h.handoverTime?.trim();
  if (t) {
    const normalized = t.length === 5 ? `${t}:00` : t;
    const timeParsed = new Date(`1970-01-01T${normalized}`);
    timeLine = isValid(timeParsed) ? format(timeParsed, 'hh:mm a') : t;
  }
  return { date: format(dt, 'MMM dd, yyyy'), time: timeLine };
}

function formatHistoryVanId(h: Handover): string {
  const v = h.vanAssignment?.van ?? h.van;
  const num = (v?.vanNumber ?? v?.registrationNumber ?? '').trim();
  if (!num) return '—';
  return num.toUpperCase().startsWith('VAN') ? num.toUpperCase() : `VAN- ${num}`;
}

function employeeNumberLabel(driverId?: string): string {
  if (!driverId) return 'Emp #—';
  const tail = driverId.replace(/-/g, '').slice(-4).toUpperCase();
  return `Emp #${tail || '—'}`;
}

function HandoverStatusPill({ status }: { status: HandoverStatus }) {
  const label = (HANDOVER_UI_STATUS_LABELS[status] ?? status).toUpperCase();
  const tone =
    status === 'APPROVED'
      ? 'bg-[#DCFCE7] text-[#166534]'
      : status === 'REJECTED'
        ? 'bg-[#FEE2E2] text-[#B91C1C]'
        : 'bg-[#FFF4E5] text-[#904D00]';
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide',
        tone,
      )}
    >
      {label}
    </span>
  );
}

function HandoverAvatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) {
    return (
      <img src={url} alt={name ?? ''} className="size-9 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E9E8E6] text-xs font-bold text-[#78716c]">
      {initialsFromName(name)}
    </div>
  );
}

function HandoverRowActionMenu({ onView }: { onView: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex justify-end">
      <button
        type="button"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 min-w-[160px] rounded-xl border border-border bg-white py-1 shadow-lg">
          <button
            type="button"
            className="flex w-full px-4 py-2.5 text-left text-sm text-dark transition-colors hover:bg-surface"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onView();
            }}
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
}

function PaymentMethodIcon({ method }: { method?: string }) {
  if (method === 'UPI') return <Smartphone className="size-4 text-primary" />;
  if (method === 'CASH') return <Banknote className="size-4 text-success" />;
  return <Building2 className="size-4 text-info" />;
}

function paymentDateTime(p: DriverPayment): string {
  const d = p.paymentDate ?? p.createdAt;
  const t = p.paymentTime?.trim();
  if (!d) return '—';
  const datePart = formatDate(typeof d === 'string' ? d : String(d));
  return t ? `${datePart} · ${t}` : datePart;
}

function publicAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!rawBase) return url;
  const origin = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatUpiDateTime(p: DriverPayment): string {
  const d = p.paymentDate ?? p.createdAt;
  const t = p.paymentTime?.trim();
  if (!d) return '—';
  const parsed = new Date(typeof d === 'string' ? d : String(d));
  if (Number.isNaN(parsed.getTime())) return formatDate(String(d));
  const datePart = format(parsed, 'MMM dd, yyyy');
  if (t) {
    const normalized = t.length === 5 ? `${t}:00` : t;
    const timeParsed = new Date(`1970-01-01T${normalized}`);
    const timePart = Number.isNaN(timeParsed.getTime())
      ? t
      : format(timeParsed, 'h:mm a');
    return `${datePart} • ${timePart}`;
  }
  return `${datePart} • ${format(parsed, 'h:mm a')}`;
}

function settlementAmountLabel(amount: number | string | undefined | null) {
  const n = typeof amount === 'number' ? amount : Number(amount);
  const x = Number.isFinite(n) ? n : 0;
  return `₹${x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR`;
}

function LedgerDetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#777777]">{label}</p>
      {children ?? <p className="mt-1.5 text-[15px] font-bold leading-snug text-[#212121]">{value}</p>}
    </div>
  );
}

function PaymentTypeBadge({ method }: { method: string }) {
  const isUpi = method === 'UPI';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold tracking-wide',
        isUpi ? 'bg-[#E8F4FC] text-[#2563EB]' : 'bg-[#E8F4FC] text-[#097939]'
      )}
    >
      <Smartphone className="size-4 shrink-0" strokeWidth={2.25} />
      {method.replace('_', ' ')}
    </span>
  );
}

// ─── UPI Verification Modal ───────────────────────────────────────────────────

function UpiVerificationModal({
  payment,
  onClose,
  onApprove,
  onReject,
  isPending,
}: {
  payment: DriverPayment;
  onClose: () => void;
  onApprove: () => void;
  onReject: (note?: string) => void;
  isPending: boolean;
}) {
  const storeName = payment.store?.name ?? payment.store?.ownerContactName ?? '—';
  const employeeName = payment.driver?.name ?? '—';
  const vanNumber =
    payment.vanAssignment?.van?.vanNumber ?? payment.vanAssignment?.van?.registrationNumber ?? '—';
  const routeName = payment.vanAssignment?.route?.name ?? '—';
  const paymentType = payment.paymentMethod ?? 'UPI';
  const dateTime = formatUpiDateTime(payment);
  const proofUrl = publicAssetUrl(payment.proofUrl);
  const [rejectNote, setRejectNote] = useState('');

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="UPI Payment Verification"
      titleIcon={
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF4E5] text-[#904D00]">
          <Wallet className="size-5" strokeWidth={2.2} />
        </span>
      }
      size="xl"
      className="max-w-4xl"
      headerClassName="bg-[#F4F3F1]"
      bodyClassName="p-0"
    >
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 space-y-5 bg-white px-7 py-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <LedgerDetailField label="Store Name" value={storeName} />
            <LedgerDetailField label="Employee Name" value={employeeName} />
            <LedgerDetailField label="Van Number" value={vanNumber} />
            <LedgerDetailField label="Route Name" value={routeName} />
            <LedgerDetailField label="Payment Type">
              <div className="mt-1.5">
                <PaymentTypeBadge method={paymentType} />
              </div>
            </LedgerDetailField>
            <LedgerDetailField label="Date & Time" value={dateTime} />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#FFF5F0] px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#904D00]">
                Settlement Amount
              </p>
              <p className="mt-1 text-[26px] font-extrabold leading-tight tracking-tight text-[#904D00]">
                {settlementAmountLabel(payment.amount)}
              </p>
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
              <ShieldCheck className="size-5" strokeWidth={2.25} />
            </span>
          </div>
        </div>

        <div className="flex w-full flex-col  bg-[#F4F3F1] lg:w-[250px] lg:shrink-0 lg:self-stretch">
          <p className="shrink-0 px-5 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A8475]">
            Screenshot Preview
          </p>
          <div className="flex flex-1 items-center justify-center px-5 pb-2 pt-1">
            <div className="aspect-[9/16] h-[300px] w-full max-w-[195px] shrink-0 overflow-hidden rounded-md bg-[#EBEBEB] shadow-[0_4px_20px_rgba(26,28,27,0.08)]">
              {proofUrl ? (
                <img
                  src={proofUrl}
                  alt="Payment proof screenshot"
                  className="h-full w-full object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center">
                  <Smartphone className="mb-2 size-10 text-[#ACADAD]" />
                  <p className="text-xs font-medium text-[#777777]">No screenshot</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#F4F3F1] px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Input
            label="Rejection reason (optional)"
            placeholder="Shown to the driver"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            className="cursor-pointer text-sm font-bold text-primary transition hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onReject(rejectNote || undefined)}
            disabled={isPending}
          >
            Reject Payment
          </button>
          <Button
            type="button"
            onClick={onApprove}
            isLoading={isPending}
            className="h-11 cursor-pointer gap-2 rounded-full px-6 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          >
            Approve &amp; Verify
            <span className="flex size-6 items-center justify-center rounded-full bg-white/25">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab: Transaction History (cash handovers) ─────────────────────────────────

function TransactionHistoryTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<HandoverStatus>('PENDING');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['handovers', page],
    queryFn: () => handoversApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-handover-detail', openId],
    queryFn: () => handoversApi.getById(openId!),
    enabled: !!openId,
  });

  useEffect(() => {
    if (detail) {
      setNewStatus(detail.status);
      setRejectReason('');
    }
  }, [detail?.id]);

  const updateMutation = useMutation({
    mutationFn: () =>
      handoversApi.updateStatus(
        detail!.id,
        newStatus,
        newStatus === 'REJECTED' ? rejectReason : undefined,
      ),
    onSuccess: () => {
      toast.success('Handover updated');
      qc.invalidateQueries({ queryKey: ['handovers'] });
      setOpenId(null);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to update'),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const exportHistory = () => {
    if (!rows.length) {
      toast.error('Nothing to export');
      return;
    }
    downloadCsv(
      `transaction-history-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      [
        'Date & time',
        'Employee',
        'Van / ID',
        'Route',
        'Handover amount (INR)',
        'Status',
      ],
      rows.map((h) => [
        handoverDateTime(h),
        h.driver?.name ?? '—',
        handoverVanLabel(h),
        h.vanAssignment?.route?.name ?? '—',
        Number(h.cashAmount ?? 0).toFixed(2),
        HANDOVER_UI_STATUS_LABELS[h.status] ?? h.status,
      ]),
    );
    toast.success('Export started');
  };

  const columns: Column<Handover>[] = [
    {
      key: 'when',
      header: 'Date & time',
      width: '14%',
      align: 'left',
      render: (h) => {
        const { date, time } = handoverStackedDateTime(h);
        return (
          <div>
            <p className="font-bold leading-snug text-[#212121]">{date}</p>
            <p className="mt-0.5 text-xs font-medium text-[#777777]">{time}</p>
          </div>
        );
      },
    },
    {
      key: 'employee',
      header: 'Employee name',
      width: '22%',
      align: 'left',
      render: (h) => (
        <div className="flex items-center gap-3">
          <HandoverAvatar name={h.driver?.name} url={h.driver?.profilePictureUrl} />
          <div>
            <p className="font-bold leading-tight text-[#212121]">{h.driver?.name ?? '—'}</p>
            <p className="mt-0.5 text-xs font-medium text-[#777777]">
              {employeeNumberLabel(h.driver?.id)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'van',
      header: 'Van ID',
      width: '12%',
      align: 'center',
      render: (h) => (
        <span className="text-sm font-semibold uppercase tracking-wide text-[#212121]">
          {formatHistoryVanId(h)}
        </span>
      ),
    },
    {
      key: 'route',
      header: 'Route name',
      width: '18%',
      align: 'left',
      render: (h) => (
        <p className="text-sm font-medium leading-snug text-[#212121]">
          {h.vanAssignment?.route?.name ?? '—'}
        </p>
      ),
    },
    {
      key: 'amount',
      header: 'Handover amount',
      width: '14%',
      align: 'center',
      render: (h) => (
        <span className="font-bold text-[#212121]">
          {formatLedgerAmount(Number(h.cashAmount ?? 0))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '12%',
      align: 'center',
      render: (h) => (
        <div className="flex justify-center">
          <HandoverStatusPill status={h.status} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '8%',
      align: 'right',
      render: (h) => <HandoverRowActionMenu onView={() => setOpenId(h.id)} />,
    },
  ];

  if (isError) {
    return <PageLoadError title="Could not load transaction history" />;
  }

  return (
    <>
      <Card
        padding={false}
        className="overflow-hidden border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-[#E9E8E6] bg-white px-8 py-5">
          <h2 className="font-sans text-xl font-extrabold tracking-tight text-[#212121]">
            Transaction History
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[#E9E8E6] bg-white text-[#57534e] transition hover:bg-[#F9F9F9]"
              aria-label="Filter"
            >
              <SlidersHorizontal className="size-4" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-xl border border-[#E9E8E6] bg-white text-[#57534e] transition hover:bg-[#F9F9F9]"
              aria-label="Download CSV"
              onClick={exportHistory}
            >
              <Download className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
        <Table
          variant="employee"
          columns={columns}
          data={rows}
          keyExtractor={(h) => h.id}
          isLoading={isLoading}
          emptyMessage="No handover records yet."
          emptyIcon={<History className="size-10 text-border" />}
        />
        {!isLoading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#F9F9F9] px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#777777]">
              Showing <span className="font-semibold text-[#212121]">{rangeFrom}</span> to{' '}
              <span className="font-semibold text-[#212121]">{rangeTo}</span> of{' '}
              <span className="font-semibold text-[#212121]">{total}</span> handovers
            </p>
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                className="pt-0"
              />
            )}
          </div>
        )}
      </Card>

      <Modal
        open={!!openId}
        onClose={() => setOpenId(null)}
        title="Handover detail"
        size="lg"
      >
        {detailLoading && (
          <div className="flex justify-center py-12">
            <span className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {!detailLoading && detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Employee', value: detail.driver?.name ?? '—' },
                { label: 'Van / ID', value: handoverVanLabel(detail) },
                { label: 'Route', value: detail.vanAssignment?.route?.name ?? '—' },
                { label: 'Date & time', value: handoverDateTime(detail) },
                {
                  label: 'Handover amount',
                  value: formatCurrency(Number(detail.cashAmount ?? 0)),
                },
                { label: 'Eggs', value: handoverEggSummary(detail) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-neutral-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
                  <p className="text-sm font-bold text-dark">{value}</p>
                </div>
              ))}
            </div>

            {detail.eggItems && detail.eggItems.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Egg lines</p>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f4f3f1]">
                      <tr>
                        {['Van load', 'Rate', 'Good', 'Damaged'].map((c) => (
                          <th
                            key={c}
                            className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-[#212121]"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detail.eggItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-mono text-xs">{item.vanLoadId.slice(0, 8)}…</td>
                          <td className="px-3 py-2">{item.ratePerUnit ?? '—'}</td>
                          <td className="px-3 py-2">{item.goodUnits ?? 0}</td>
                          <td className="px-3 py-2 text-danger">{item.damagedUnits ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm font-semibold text-dark">Update status</p>
              <Select
                label="Status"
                options={HANDOVER_STATUS_OPTIONS.map((o) => ({
                  value: o.value,
                  label: HANDOVER_UI_STATUS_LABELS[o.value] ?? o.label,
                }))}
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as HandoverStatus)}
              />
              {newStatus === 'REJECTED' && (
                <Input
                  label="Rejection reason (optional)"
                  placeholder="Shown to the driver"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              )}
              <Button type="button" onClick={() => updateMutation.mutate()} isLoading={updateMutation.isPending}>
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

// ─── Tab: Transaction Ledger (store payments / UPI verification) ────────────

function TransactionLedgerTab({ activeRoutes }: { activeRoutes: number }) {
  const qc = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<DriverPayment | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: PaymentStatus; note?: string }) =>
      paymentsApi.updateDriverPaymentStatus(id, status, note),
    onSuccess: () => {
      toast.success('Payment status updated');
      setSelectedPayment(null);
      qc.invalidateQueries({ queryKey: [TRANSACTION_LEDGER_QUERY_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <>
      <TransactionLedgerSection
        activeRoutes={activeRoutes}
        onViewDetails={setSelectedPayment}
      />

      {selectedPayment && (
        <UpiVerificationModal
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onApprove={() => updateMutation.mutate({ id: selectedPayment.id, status: 'APPROVED' })}
          onReject={(note) =>
            updateMutation.mutate({ id: selectedPayment.id, status: 'REJECTED', note })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const selectedMonth = useDashboardStore((s) => s.selectedMonth);
  const monthParam = format(selectedMonth, 'yyyy-MM');

  const { data: dashboardSnap } = useQuery({
    queryKey: ['dashboard', monthParam],
    queryFn: () => dashboardApi.getSnapshot(monthParam),
  });

  const activeRoutes = dashboardSnap?.activeAssignments ?? 0;

  return (
    <div className="space-y-6">
      <TransactionHistoryTab />
      <TransactionLedgerTab activeRoutes={activeRoutes} />
    </div>
  );
}
