import { forwardRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isValid } from 'date-fns';
import DatePicker from 'react-datepicker';
import {
  Truck,
  Plus,
  MapPin,
  User2,
  BadgeCheck,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { vansApi } from '@/api/vans.api';
import {
  Button,
  Input,
  Modal,
  Spinner,
  PageLoadError,
  Pagination,
} from '@/components/ui';
import type { VanFleetItem, VanDetailResponse } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const schema = z.object({
  vanNumber: z.string().min(1, 'Van number is required'),
  name: z.string().min(1, 'Van name is required'),
  loadCapacity: z
    .string()
    .refine((v) => !v || (/^\d+$/.test(v) && parseInt(v, 10) >= 1), {
      message: 'Must be a positive whole number',
    })
    .optional(),
});
type FormValues = z.infer<typeof schema>;

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Parse yyyy-MM-dd as local calendar date (avoids UTC shift from parseISO). */
function parseLocalDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  return isValid(parsed) ? parsed : new Date();
}

function fmtCurrency(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtRate(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DateTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'> & { value?: string }
>(({ value, onClick, disabled, className, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    disabled={disabled}
    {...rest}
    className={cn(
      'inline-flex w-full items-center gap-2 rounded-full border border-light-grey bg-white px-4 py-2.5 text-left text-sm font-bold text-[#212121] shadow-sm transition',
      'hover:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/35',
      'eggfleet-van-date-trigger',
      className
    )}
  >
    <Calendar className="size-[18px] shrink-0 text-[#78716C]" strokeWidth={2} aria-hidden />
    <span className="min-w-0 flex-1 truncate tabular-nums">{value?.trim() || 'Select date'}</span>
    <ChevronDown className="size-[18px] shrink-0 text-[#212121]" strokeWidth={2.25} aria-hidden />
  </button>
));
DateTrigger.displayName = 'DateTrigger';

function VanStatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-primary bg-white px-6 py-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#777777]">{label}</p>
      <p
        className={cn(
          'mt-2 text-[32px] font-black tabular-nums leading-none tracking-tight sm:text-[36px]',
          highlight ? 'text-[#904D00]' : 'text-[#212121]'
        )}
      >
        {value.toLocaleString('en-IN')}
      </p>
    </div>
  );
}

function FleetVanCard({
  van,
  selected,
  onSelect,
}: {
  van: VanFleetItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const assigned = !!van.assignment;
  const displayName = van.name || van.vanNumber;
  const routeLabel = van.assignment?.route?.name
    ? `Route: ${van.assignment.route.name}`
    : 'Route: —';
  const totalLoad = (van.assignment?.totalLoaded ?? 0).toLocaleString('en-IN');

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col rounded-2xl border-2 bg-white p-5 text-left transition',
        selected ? 'border-primary' : 'border-[#E9E8E6] hover:border-primary/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight text-[#212121]">{displayName}</p>
          <p className="mt-1.5 text-sm font-normal text-[#777777]">{routeLabel}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-3 py-1 text-xs font-bold',
            assigned ? 'bg-[#FFF4E5] text-primary' : 'bg-neutral-100 text-[#777777]'
          )}
        >
          {assigned ? 'Assigned' : 'Not Assigned'}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm font-normal text-[#777777]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <User2 className="size-4 shrink-0" strokeWidth={2} />
          <span className="truncate">{van.assignment?.driver?.name ?? 'Not Assigned'}</span>
        </span>
        <span className="shrink-0 tabular-nums">Total Load : {totalLoad}</span>
      </div>
    </button>
  );
}

export default function VansPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayStr());
  const [selectedVanId, setSelectedVanId] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const selectedDate = parseLocalDate(date);

  const fleetQuery = useQuery({
    queryKey: ['fleet-overview', date],
    queryFn: () => vansApi.getFleetOverview(date),
  });

  const fleet: VanFleetItem[] = fleetQuery.data ?? [];

  useEffect(() => {
    if (fleet.length > 0 && !selectedVanId) {
      setSelectedVanId(fleet[0].id);
    }
  }, [fleet, selectedVanId]);

  const detailQuery = useQuery({
    queryKey: ['van-detail', selectedVanId, date, detailPage],
    queryFn: () => vansApi.getVanDetail(selectedVanId!, date, detailPage),
    enabled: !!selectedVanId,
    placeholderData: keepPreviousData,
  });

  const detail: VanDetailResponse | undefined = detailQuery.data;
  const detailReady = !!detail && detail.van.id === selectedVanId;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (v: FormValues) =>
      vansApi.create({
        vanNumber: v.vanNumber,
        name: v.name,
        loadCapacity: v.loadCapacity ? parseInt(v.loadCapacity, 10) : undefined,
      }),
    onSuccess: () => {
      toast.success('Van created');
      qc.invalidateQueries({ queryKey: ['fleet-overview'] });
      setShowCreateModal(false);
      reset();
    },
    onError: () => toast.error('Failed to create van'),
  });

  const assignment = detail?.assignment as
    | (VanDetailResponse['assignment'] & { route?: { name?: string }; driver?: { name?: string } })
    | null
    | undefined;

  return (
    <>
      <div className="-mx-4 flex min-h-[640px] flex-col gap-0 sm:-mx-6 lg:-mx-10 lg:flex-row">
        {/* Fleet overview — left column */}
        <aside className="w-full shrink-0 border-b border-[#E9E8E6] bg-app px-4 py-5 sm:px-6 lg:w-[380px] lg:border-b-0 lg:border-r lg:px-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#212121]">
              Fleet Overview
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="size-3.5" strokeWidth={2.5} />
              Create Van
            </button>
          </div>

          <div className="space-y-3">
            {fleetQuery.isLoading && (
              <div className="flex justify-center py-16">
                <Spinner className="size-6 text-primary" />
              </div>
            )}
            {fleetQuery.isError && <PageLoadError title="Could not load fleet" />}
            {!fleetQuery.isLoading && fleet.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted">
                <Truck className="size-10 text-border" />
                <p className="text-sm">No vans found</p>
              </div>
            )}
            {fleet.map((van) => (
              <FleetVanCard
                key={van.id}
                van={van}
                selected={van.id === selectedVanId}
                onSelect={() => {
                  setSelectedVanId(van.id);
                  setDetailPage(1);
                }}
              />
            ))}
          </div>
        </aside>

        {/* Van detail — right column */}
        <div className="min-w-0 flex-1 bg-app px-4 py-5 sm:px-6 lg:px-8">
          {!selectedVanId && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 text-muted">
              <Truck className="size-14 text-border" />
              <p className="text-sm">Select a van to view details</p>
            </div>
          )}

          {selectedVanId && !detailReady && detailQuery.isFetching && (
            <div className="flex min-h-[320px] items-center justify-center">
              <Spinner className="size-8 text-primary" />
            </div>
          )}

          {selectedVanId && detailQuery.isError && !detailReady && (
            <PageLoadError title="Could not load van details" />
          )}

          {selectedVanId && detailReady && (
            <div
              className={cn(
                'space-y-5 rounded-2xl border border-primary bg-[#F5F5F5] p-5 sm:p-6',
                detailQuery.isFetching && 'opacity-70'
              )}
            >
              {/* Detail header — sits on gray panel, not a separate white card */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-white">
                    <Truck className="size-7 text-[#904D00]" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold text-[#212121]">
                        {detail.van.name || detail.van.vanNumber}
                      </h2>
                      {assignment && (
                        <BadgeCheck className="size-5 shrink-0 text-primary" strokeWidth={2.5} />
                      )}
                    </div>
                    {assignment ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[#777777]">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="size-4 shrink-0 text-[#777777]" />
                          {assignment.route?.name ?? '—'}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User2 className="size-4 shrink-0 text-[#777777]" />
                          {assignment.driver?.name ?? '—'}
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm italic text-muted">No assignment for this date</p>
                    )}
                  </div>
                </div>
                <div className="relative z-[60] w-[190px] shrink-0 self-start">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(d: Date | null) => {
                      if (!d) return;
                      setDate(format(d, 'yyyy-MM-dd'));
                      setDetailPage(1);
                    }}
                    dateFormat="MMM dd, yyyy"
                    customInput={<DateTrigger />}
                    popperPlacement="bottom-end"
                    popperClassName="eggfleet-month-popper"
                    showPopperArrow={false}
                    disabledKeyboardNavigation
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <VanStatCard label="Total Loaded" value={detail.stats.totalLoaded} />
                <VanStatCard label="Total Sold" value={detail.stats.totalSold} highlight />
                <VanStatCard label="Current Balance" value={detail.stats.currentBalance} />
              </div>

              {/* Stock specification */}
              <section>
                <h3 className="mb-3 text-base font-extrabold text-[#212121]">Stock Specification</h3>
                {detail.stockSpec.length === 0 ? (
                  <div className="rounded-xl border border-[#E9E8E6] bg-white px-6 py-8 text-center text-sm text-muted">
                    No stock data
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E9E8E6] bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#E9E8E6] bg-[#F9FAFB]">
                            {['Egg rate', 'Loaded', 'Sold', 'Balance'].map((h) => (
                              <th
                                key={h}
                                className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-[0.06em] text-[#777777]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.stockSpec.map((row, i) => (
                            <tr key={i} className="border-b border-[#E9E8E6] bg-white last:border-0">
                              <td className="px-6 py-4 text-center font-semibold text-[#212121]">
                                {fmtRate(row.ratePerUnit)}
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums text-[#777777]">
                                {row.loaded.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums font-semibold text-[#904D00]">
                                {row.sold.toLocaleString('en-IN')}
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums text-[#777777]">
                                {row.balance.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>

              {/* Route activity */}
              <section>
                <h3 className="mb-3 text-base font-extrabold text-[#212121]">Route Activity</h3>
                {detail.routeActivity.data.length === 0 ? (
                  <div className="rounded-xl border border-[#E9E8E6] bg-white px-6 py-8 text-center text-sm text-muted">
                    No deliveries for this date
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-[#E9E8E6] bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#E9E8E6] bg-[#F9FAFB]">
                            {['Store name', 'Qty sold', 'Paid', 'Pending'].map((h) => (
                              <th
                                key={h}
                                className="px-6 py-3.5 text-center text-xs font-bold uppercase tracking-[0.06em] text-[#777777]"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {detail.routeActivity.data.map((row, i) => (
                            <tr key={i} className="border-b border-[#E9E8E6] bg-white last:border-0">
                              <td className="px-6 py-4 text-left font-semibold text-[#212121]">
                                {row.storeName}
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums text-[#777777]">
                                {row.qtySold.toLocaleString('en-IN')} Units
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums font-semibold text-[#904D00]">
                                {fmtCurrency(row.paid)}
                              </td>
                              <td className="px-6 py-4 text-center tabular-nums text-[#777777]">
                                {fmtCurrency(row.pending)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {detail.routeActivity.totalPages > 1 && (
                      <div className="border-t border-[#E9E8E6] bg-white px-6 py-3">
                        <Pagination
                          page={detail.routeActivity.page}
                          totalPages={detail.routeActivity.totalPages}
                          onPageChange={setDetailPage}
                          className="pt-0"
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          reset();
        }}
        title="Create New Van"
        size="md"
      >
        <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
          <Input
            label="Van Number"
            placeholder="e.g. TN01AB1234"
            error={errors.vanNumber?.message}
            {...register('vanNumber')}
          />
          <Input
            label="Van Name"
            placeholder="e.g. Van Alpha-01"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Load Capacity (eggs)"
            placeholder="e.g. 2000"
            type="number"
            error={errors.loadCapacity?.message}
            {...register('loadCapacity')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Van
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
