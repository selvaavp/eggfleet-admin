import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Phone,
  Truck,
  Calendar,
  Camera,
  ScrollText,
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { employeesApi } from '@/api/employees.api';
import { RouteActivityLedger } from '@/components/ledger/RouteActivityLedger';
import { LedgerSingleDatePicker } from '@/components/ledger/LedgerSingleDatePicker';
import { PageLoader, PageLoadError, Modal, Input } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { buildEmployeeRouteLedgerColumns } from '@/lib/route-activity-ledger';
import { cn } from '@/lib/utils';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import type { Employee } from '@/types';

function formatEmployeePhone(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone?.trim() || '—';
}

function formatEmployeeRole(role?: string) {
  if (role === 'DRIVER') return 'Logistics Specialist (Driver)';
  return (role ?? 'Driver').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatJoiningDate(createdAt?: string) {
  if (!createdAt) return '—';
  const d = parseISO(createdAt);
  return isValid(d) ? format(d, 'MMM dd, yyyy') : '—';
}

function formatVanAssignmentLabel(employee: Employee) {
  const vanNumber =
    (employee as Employee & { todayAssignment?: { vanNumber?: string } }).todayAssignment?.vanNumber
    ?? employee.currentAssignment?.van?.vanNumber
    ?? employee.currentAssignment?.van?.registrationNumber;
  if (!vanNumber?.trim()) return '—';
  const trimmed = vanNumber.trim();
  if (/^van\s/i.test(trimmed)) return trimmed;
  return trimmed;
}

function ProfileInfoRow({
  icon: Icon,
  label,
  value,
  valueClassName = 'text-[#212121]',
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F5F5F4] px-4 py-3">
      <span className="inline-flex min-w-0 items-center gap-2.5 text-sm font-medium text-taupe">
        <Icon className="size-4 shrink-0 text-taupe" strokeWidth={2} aria-hidden />
        {label}
      </span>
      <span className={cn('shrink-0 text-sm font-bold tabular-nums', valueClassName)}>{value}</span>
    </div>
  );
}

function EmployeeKpiCard({
  label,
  value,
  unit,
  footnote,
  valueClassName = 'text-[#212121]',
  unitClassName = 'text-[#0F766E]',
}: {
  label: string;
  value: string;
  unit?: string;
  footnote?: string;
  valueClassName?: string;
  unitClassName?: string;
}) {
  return (
    <div className="flex min-h-[212px] flex-col justify-between rounded-[16px] border border-primary bg-white p-5 shadow-[0px_2px_12px_rgba(26,28,27,0.04)]">
      <p className="text-body-sm font-bold uppercase tracking-[0.1em] text-taupe">{label}</p>
      <div className="flex flex-1 flex-col justify-center py-3">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              'text-[36px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[38px]',
              valueClassName,
            )}
          >
            {value}
          </span>
          {unit ? (
            <span className={cn('text-sm font-bold', unitClassName)}>{unit}</span>
          ) : null}
        </div>
      </div>
      {footnote ? (
        <p className="text-sm font-medium italic leading-snug text-[#9CA3AF]">{footnote}</p>
      ) : (
        <span className="block h-[18px]" aria-hidden />
      )}
    </div>
  );
}

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Must be exactly 10 digits'),
});
type EditForm = z.infer<typeof editSchema>;

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [filterDate, setFilterDate] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const editPhotoFileRef = useRef<File | null>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const { data: employee, isLoading: employeeLoading, isError: employeeError } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: !!id,
  });

  const { data: summary } = useQuery({
    queryKey: ['employee-summary', id, filterDate],
    queryFn: () =>
      employeesApi.getSummary(id!, {
        startDate: filterDate || undefined,
        endDate: filterDate || undefined,
      }),
    enabled: !!id,
  });

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['employee-deliveries', id, page, filterDate],
    queryFn: () =>
      employeesApi.getDeliveries(id!, {
        page,
        limit: DEFAULT_PAGE_SIZE,
        startDate: filterDate || undefined,
        endDate: filterDate || undefined,
      }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EditForm) => {
      await employeesApi.update(id!, { name: values.name, phone: values.phone });
      if (editPhotoFileRef.current) {
        await employeesApi.uploadAvatar(id!, editPhotoFileRef.current);
      }
      if (employee && editIsActive !== employee.isActive) {
        await employeesApi.toggleStatus(id!);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
      closeEditModal();
    },
    onError: () => toast.error('Failed to save changes'),
  });

  function openEditModal() {
    if (!employee) return;
    editForm.reset({ name: employee.name, phone: employee.phone ?? '' });
    setEditIsActive(employee.isActive);
    setEditPhotoPreview(employee.profilePictureUrl ?? null);
    editPhotoFileRef.current = null;
    setShowEditModal(true);
  }

  function closeEditModal() {
    setShowEditModal(false);
    editPhotoFileRef.current = null;
    setEditPhotoPreview(null);
  }

  function handleEditPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    editPhotoFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  const deliveries = deliveriesData?.data ?? [];
  const ledgerColumns = buildEmployeeRouteLedgerColumns();

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

  function handleDownload() {
    if (!deliveries.length) {
      toast.error('No rows to export');
      return;
    }
    downloadCsv(
      `employee-${employee?.name ?? id}-deliveries`,
      ['Store', 'Egg Rate', 'Total Units', 'Total Amount', 'Payment Method', 'Status'],
      deliveries.map((d) => [
        d.storeName,
        d.ratePerUnit,
        d.totalUnits,
        d.totalAmount,
        d.paymentMethod ?? 'PENDING',
        d.paymentStatus,
      ]),
    );
    toast.success('Report downloaded');
  }

  if (employeeLoading) return <PageLoader />;

  if (employeeError || !employee) {
    return (
      <div className="py-6">
        <PageLoadError title="Could not load employee details" />
      </div>
    );
  }

  const vanLabel = formatVanAssignmentLabel(employee);

  return (
    <div className="space-y-6">
      {/* Header — Figma */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Link
              to={APP_ROUTES.EMPLOYEES}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F4F3F1] text-[#904D00] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#EBE8E4]"
              aria-label="Back to employees"
            >
              <ArrowLeft className="size-5" strokeWidth={2.5} aria-hidden />
            </Link>
            <h1 className="font-sans text-[26px] font-extrabold leading-tight tracking-tight text-[#212121] sm:text-[30px]">
              Employee Profile
            </h1>
          </div>
          <p className="mt-2 pl-[52px] text-sm font-medium text-taupe">
            Manage driver details and track field performance
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:mt-0.5">
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#FDB881] px-6 text-body-md font-bold text-[#78471A] transition hover:bg-[#FFECD6]"
          >
            Edit Profile
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex h-10 items-center justify-center rounded-md bg-[#FDB881] px-6 text-body-md font-bold text-[#78471A] transition hover:bg-[#FDB88180]"
          >
            Download Report
          </button>
        </div>
      </div>

      {/* Profile + KPIs — Figma */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-6">
        <div className="rounded-[16px] border border-primary bg-white p-6 shadow-[0px_2px_12px_rgba(26,28,27,0.04)]">
          <div className="relative mx-auto mb-6 w-fit">
            <div className="size-[148px] overflow-hidden rounded-[16px] bg-[#F5F5F4]">
              {employee.profilePictureUrl ? (
                <img
                  src={employee.profilePictureUrl}
                  alt={employee.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-[#FFF4E5]">
                  <span className="text-5xl font-extrabold text-[#904D00]">
                    {(employee.name?.trim()?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span
              className={cn(
                'absolute -bottom-2.5 right-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-[0px_2px_6px_rgba(15,118,110,0.35)]',
                employee.isActive
                  ? 'bg-[#00658F] text-white'
                  : 'bg-red-600 text-white',
              )}
            >
              {employee.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <h2 className="text-center text-[22px] font-extrabold leading-tight text-[#212121]">
            {employee.name}
          </h2>
          <p className="mt-1.5 text-center text-sm font-semibold text-[#904D00]">
            {formatEmployeeRole(employee.role)}
          </p>

          <div className="mt-6 space-y-2">
            <ProfileInfoRow
              icon={Phone}
              label="Phone"
              value={formatEmployeePhone(employee.phone)}
            />
            <ProfileInfoRow
              icon={Truck}
              label="Assigned Van"
              value={vanLabel}
              valueClassName="text-[#212121]"
            />
            <ProfileInfoRow
              icon={Calendar}
              label="Joining Date"
              value={formatJoiningDate(employee.createdAt)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          <EmployeeKpiCard
            label="Total Deliveries"
            value={(summary?.totalDeliveries ?? 0).toLocaleString('en-IN')}
            unit="Units"
            footnote="Total volume this quarter"
          />
          <EmployeeKpiCard
            label="Total Sales"
            value={formatINR(summary?.totalSalesAmount ?? 0, { fractionDigits: 0 })}
            footnote="Net invoiced value"
          />
          <EmployeeKpiCard
            label="Collected Amount"
            value={formatINR(summary?.totalCollected ?? 0, { fractionDigits: 0 })}
            footnote="Verified cash/digital receipts"
          />
          <EmployeeKpiCard
            label="Cash on Hand"
            value={formatINR(summary?.cashOnHand ?? 0, { fractionDigits: 0 })}
          />
        </div>
      </div>

      <RouteActivityLedger
        subtitle={{ kind: 'van', label: vanLabel === '—' ? 'Unassigned' : vanLabel }}
        summary={{
          collected: ledgerCollected,
          upi: upiTotal,
          partial: partialTotal,
          pending: pendingTotal,
        }}
        columns={ledgerColumns}
        data={deliveries}
        isLoading={deliveriesLoading}
        emptyMessage="No deliveries found for this period."
        emptyIcon={<ScrollText className="size-10 text-border" />}
        page={page}
        totalPages={totalPages}
        total={total}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onPageChange={setPage}
        filtersSlot={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LedgerSingleDatePicker
              value={filterDate}
              onChange={(v) => {
                setFilterDate(v);
                setPage(1);
              }}
            />
            {filterDate ? (
              <button
                type="button"
                onClick={() => {
                  setFilterDate('');
                  setPage(1);
                }}
                className="text-sm font-bold text-[#904D00] transition hover:text-[#7A3F00]"
              >
                Clear date
              </button>
            ) : null}
          </div>
        }
      />

      <Modal isOpen={showEditModal} onClose={closeEditModal} title="Edit Profile">
        <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-5">
          <div className="flex flex-col items-center gap-3">
            <div
              className="group relative size-24 cursor-pointer overflow-hidden rounded-2xl bg-[#FFF4E5]"
              onClick={() => editPhotoInputRef.current?.click()}
            >
              {editPhotoPreview ? (
                <img src={editPhotoPreview} alt="Preview" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="text-3xl font-extrabold text-[#904D00]">
                    {(employee.name?.trim()?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="size-6 text-white" />
              </div>
            </div>
            <input
              ref={editPhotoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleEditPhotoChange}
            />
            <p className="text-xs text-muted">Tap photo to change</p>
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-dark">Status</span>
            <button
              type="button"
              onClick={() => setEditIsActive((v) => !v)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                editIsActive
                  ? 'border-[#99F6E4] bg-[#CCFBF1] text-[#0F766E] hover:bg-[#99F6E4]'
                  : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
              )}
            >
              {editIsActive ? 'Active' : 'Inactive'}
            </button>
          </div>

          <Input
            label="Full Name"
            {...editForm.register('name')}
            error={editForm.formState.errors.name?.message}
          />
          <Input
            label="Phone Number"
            {...editForm.register('phone')}
            error={editForm.formState.errors.phone?.message}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeEditModal}
              className="flex-1 rounded-[12px] border border-[#E9E8E6] bg-white px-4 py-2.5 text-sm font-bold text-[#212121] transition hover:bg-[#FAFAF9]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 rounded-[12px] bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(254,113,2,0.35)] transition hover:bg-primary-dark disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
