import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ClipboardList, Search, Info, Pencil, X, ChevronDown, Truck, MapPin, Package, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { assignmentsApi } from '@/api/assignments.api';
import { inventoryApi } from '@/api/inventory.api';
import { vansApi } from '@/api/vans.api';
import { employeesApi } from '@/api/employees.api';
import { routesApi } from '@/api/routes.api';
import { useAuthStore } from '@/store/auth.store';
import {
  Button, Badge, Card, Table, Modal, Pagination, Select, PageLoadError, type Column,
} from '@/components/ui';
import type { VanAssignment, Inventory } from '@/types';
import {
  DEFAULT_PAGE_SIZE,
  VAN_ASSIGNMENT_STATUS_LABELS,
  VAN_ASSIGNMENT_STATUS_VARIANTS,
} from '@/constants';
import { formatDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockRow {
  inventoryId: string;
  loadQty: number;
}

interface EditVendorRow {
  vanLoadId?: string;
  inventoryId: string;
  vendorName: string;
  smallDoz: number;
  mediumDoz: number;
  largeDoz: number;
}

function unitsToDoz(units: number) {
  return Math.round(units / 12);
}

function dozToUnits(small: number, medium: number, large: number) {
  return (small + medium + large) * 12;
}

// ─── Create Assignment Schema ─────────────────────────────────────────────────

const createSchema = z.object({
  vanId: z.string().min(1, 'Please select a van'),
  routeId: z.string().min(1, 'Please select a route'),
  driverId: z.string().min(1, 'Please select an employee'),
  assignedDate: z.string().min(1, 'Date is required'),
});
type CreateFormValues = z.infer<typeof createSchema>;

// ─── Edit Assignment Schema ───────────────────────────────────────────────────

const editSchema = z.object({
  routeId: z.string().min(1, 'Please select a route'),
  driverId: z.string().min(1, 'Please select an employee'),
});
type EditFormValues = z.infer<typeof editSchema>;

// ─── Modal styling tokens ─────────────────────────────────────────────────────

const modalFieldClass =
  'h-11 rounded-xl border-[#E9E8E6] bg-[#F4F3F1] text-sm font-medium text-[#212121] focus:border-primary focus:ring-primary/25';

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A8475]">{title}</p>
  );
}

function EditSectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Truck;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-[#9A8475]" strokeWidth={2.25} />
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#9A8475]">{title}</p>
      </div>
      {action}
    </div>
  );
}

function DozField({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[#777777]">{label}</p>
      <div className="flex h-11 items-center overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(26,28,27,0.04)]">
        <input
          type="number"
          min={0}
          readOnly={readOnly}
          value={value || ''}
          onChange={(e) => onChange?.(parseInt(e.target.value, 10) || 0)}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm font-bold text-[#212121] focus:outline-none read-only:cursor-default"
          placeholder="0"
        />
        <span className="shrink-0 border-l border-[#E9E8E6] px-3 text-xs font-bold uppercase tracking-wide text-[#777777]">
          Doz
        </span>
      </div>
    </div>
  );
}

function EditVendorLoadCard({
  row,
  inventoryList,
  onChange,
  onRemove,
}: {
  row: EditVendorRow;
  inventoryList: Inventory[];
  onChange: (row: EditVendorRow) => void;
  onRemove: () => void;
}) {
  const isExisting = !!row.vanLoadId;
  const selectedInv = inventoryList.find((i) => i.id === row.inventoryId);

  return (
    <div className="relative rounded-2xl border border-[#E9E8E6] border-l-4 border-l-[#A68966] bg-[#F4F3F1] p-4">
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove vendor"
        className="absolute right-3 top-3 rounded-lg p-1 text-[#777777] transition hover:bg-white/80 hover:text-[#B23B3B]"
      >
        <Trash2 className="size-4" strokeWidth={2} />
      </button>

      {!isExisting ? (
        <div className="mb-4 pr-8">
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#777777]">
            Vendor Name
          </label>
          <div className="relative">
            <select
              className="h-11 w-full appearance-none rounded-xl border-0 bg-white px-3 pr-9 text-sm font-bold text-[#212121] focus:outline-none focus:ring-2 focus:ring-primary/25"
              value={row.inventoryId}
              onChange={(e) => {
                const inv = inventoryList.find((i) => i.id === e.target.value);
                onChange({
                  ...row,
                  inventoryId: e.target.value,
                  vendorName: inv?.vendor?.name ?? '',
                });
              }}
            >
              <option value="">Select vendor</option>
              {inventoryList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.vendor?.name ?? '—'} — ₹{Number(inv.ratePerUnit ?? 0).toFixed(2)}/unit · {Number(inv.availableUnits ?? 0).toLocaleString('en-IN')} avail.
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
          </div>
        </div>
      ) : (
        <div className="mb-4 pr-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#777777]">Vendor Name</p>
          <p className="mt-1 text-base font-bold text-[#212121]">{row.vendorName || '—'}</p>
          {selectedInv && (
            <p className="mt-0.5 text-xs font-medium text-[#9A8475]">
              ₹{Number(selectedInv.ratePerUnit ?? 0).toFixed(2)}/unit · {Number(selectedInv.availableUnits ?? 0).toLocaleString('en-IN')} avail.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DozField
          label="Small Eggs"
          value={row.smallDoz}
          readOnly={isExisting}
          onChange={(n) => onChange({ ...row, smallDoz: n })}
        />
        <DozField
          label="Medium Eggs"
          value={row.mediumDoz}
          readOnly={isExisting}
          onChange={(n) => onChange({ ...row, mediumDoz: n })}
        />
        <DozField
          label="Large Eggs"
          value={row.largeDoz}
          readOnly={isExisting}
          onChange={(n) => onChange({ ...row, largeDoz: n })}
        />
      </div>
    </div>
  );
}

// ─── Stock Loading Row ────────────────────────────────────────────────────────

function StockLoadRow({
  index,
  inventoryList,
  isLoadingInventory,
  row,
  onChange,
  onRemove,
  canRemove,
  warningMsg,
}: {
  index: number;
  inventoryList: Inventory[];
  isLoadingInventory?: boolean;
  row: StockRow;
  onChange: (row: StockRow) => void;
  onRemove: () => void;
  canRemove: boolean;
  warningMsg?: string;
}) {
  const selected = inventoryList.find((i) => i.id === row.inventoryId);
  const available = selected?.availableUnits ?? selected?.quantity ?? 0;

  return (
    <div className={cn(
      'relative rounded-[20px] border bg-[#F5F3F0] p-5',
      warningMsg ? 'border-amber-400' : 'border-[#E9E8E6]',
    )}>
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove load ${index + 1}`}
        className={cn(
          'absolute right-4 top-4 flex size-5 items-center justify-center rounded-full bg-[#B23B3B] text-white shadow-sm transition hover:bg-[#9E3333]',
          !canRemove && 'cursor-not-allowed opacity-45 hover:bg-[#B23B3B]'
        )}
      >
        <X className="size-4" strokeWidth={2.5} />
      </button>

      <label className="mb-2 block pr-10 text-sm font-bold text-[#212121]">Select Vendor</label>
      <div className="relative mb-1">
        <select
          className="h-11 w-full appearance-none rounded-xl border-0 bg-[#EBEBEB] px-3 pr-9 text-sm font-medium text-[#212121] focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
          value={row.inventoryId}
          disabled={isLoadingInventory}
          onChange={(e) => onChange({ ...row, inventoryId: e.target.value, loadQty: 0 })}
        >
          <option value="">
            {isLoadingInventory ? 'Loading inventory…' : inventoryList.length === 0 ? 'No inventory available' : 'Select vendor'}
          </option>
          {inventoryList.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.vendor?.name ?? '—'} — ₹{Number(inv.ratePerUnit ?? 0).toFixed(2)}/unit · {Number(inv.availableUnits ?? 0).toLocaleString('en-IN')} avail.
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#5C5958]" />
      </div>
      {!isLoadingInventory && inventoryList.length === 0 && (
        <p className="mb-3 text-xs text-amber-600">No inventory records found. Add stock from Vendors first.</p>
      )}
      {isLoadingInventory && <div className="mb-3" />}

      <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(26,28,27,0.04)]">
        <div className="grid grid-cols-3 divide-x divide-[#E9E8E6]">
          <div className="px-4 py-4">
            <p className="text-xs font-medium text-[#777777]">Egg Rate</p>
            <p className="mt-2 text-lg font-bold leading-none text-[#A68966]">
              {selected ? `₹${Number(selected.ratePerUnit ?? selected.pricePerUnit ?? 0).toFixed(2)}` : '—'}
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-medium text-[#777777]">Available Stock</p>
            <p className="mt-2 text-base font-bold leading-none text-[#212121]">
              {selected ? `${Number(available).toLocaleString('en-IN')} Units` : '—'}
            </p>
          </div>
          <div className="px-4 py-4">
            <p className="text-xs font-medium text-[#777777]">Load Qty</p>
            <input
              type="number"
              min={0}
              max={available || undefined}
              disabled={!selected}
              value={row.loadQty || ''}
              onChange={(e) => onChange({ ...row, loadQty: parseInt(e.target.value, 10) || 0 })}
              className="mt-2 h-10 w-full rounded-lg border-0 bg-[#EBEBEB] px-2 text-center text-sm font-bold text-[#3D4F5F] focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {warningMsg && (
        <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold text-amber-700">
          <span className="mt-px shrink-0">⚠</span>
          {warningMsg}
        </p>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<VanAssignment | null>(null);

  // Stock rows for Assign Van modal
  const [stockRows, setStockRows] = useState<StockRow[]>([{ inventoryId: '', loadQty: 0 }]);
  const [editVendorRows, setEditVendorRows] = useState<EditVendorRow[]>([]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['assignments', page],
    queryFn: () => assignmentsApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  // Dropdown data — loaded when either modal is open
  const modalOpen = showCreate || !!editTarget;
  const { data: vansData } = useQuery({
    queryKey: ['vans-select'],
    queryFn: () => vansApi.list({ page: 1, limit: 500 }),
    enabled: modalOpen,
  });
  const { data: driversData } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => employeesApi.list({ page: 1, limit: 500 }),
    enabled: modalOpen,
  });
  const { data: routesData } = useQuery({
    queryKey: ['routes-select'],
    queryFn: () => routesApi.list({ page: 1, limit: 500 }),
    enabled: modalOpen,
  });
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory-select'],
    queryFn: () => inventoryApi.list({ page: 1, limit: 500 }),
    enabled: modalOpen,
  });

  const { data: editVanLoads } = useQuery({
    queryKey: ['assignment-van-loads', editTarget?.id],
    queryFn: () => inventoryApi.getVanLoadsByAssignment(editTarget!.id),
    enabled: !!editTarget,
  });

  // ─── Create form ───────────────────────────────────────────────────────────

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { vanId: '', routeId: '', driverId: '', assignedDate: format(new Date(), 'yyyy-MM-dd') },
  });

  const createMutation = useMutation({
    mutationFn: async (v: CreateFormValues) => {
      const assignment = await assignmentsApi.create({
        vanId: v.vanId,
        driverId: v.driverId,
        routeId: v.routeId,
        assignedDate: v.assignedDate,
        createdBy: user?.id ?? '',
      });
      const validRows = stockRows.filter((r) => r.inventoryId && r.loadQty > 0);
      const invList = inventoryData?.data ?? [];
      const loadResults = await Promise.allSettled(
        validRows.map((r) => {
          const inv = invList.find((i) => i.id === r.inventoryId);
          return inventoryApi.createVanLoad({
            vanAssignmentId: (assignment as VanAssignment).id,
            inventoryId: r.inventoryId,
            loadedUnits: r.loadQty,
            ratePerUnit: inv?.pricePerUnit ?? inv?.ratePerUnit ?? 0,
          });
        }),
      );
      const failed = loadResults.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} vendor load(s) failed to save — check inventory availability`);
      }
      return assignment;
    },
    onSuccess: () => {
      toast.success('Assignment created successfully');
      qc.invalidateQueries({ queryKey: ['assignments'] });
      setShowCreate(false);
      createForm.reset();
      setStockRows([{ inventoryId: '', loadQty: 0 }]);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? 'Failed to create assignment';
      toast.error(msg);
    },
  });

  // ─── Edit form ─────────────────────────────────────────────────────────────

  const editForm = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  const openEdit = (a: VanAssignment) => {
    setEditTarget(a);
    editForm.reset({
      routeId: a.route?.id ?? '',
      driverId: a.driver?.id ?? '',
    });
  };

  useEffect(() => {
    if (!editTarget) {
      setEditVendorRows([]);
      return;
    }
    if (editVanLoads === undefined) return;

    if (editVanLoads.length === 0) {
      setEditVendorRows([]);
      return;
    }

    setEditVendorRows(
      editVanLoads.map((load) => {
        const totalDoz = unitsToDoz(load.loadedUnits);
        return {
          vanLoadId: load.id,
          inventoryId: load.inventoryId,
          vendorName: load.inventory?.vendor?.name ?? '—',
          smallDoz: 0,
          mediumDoz: totalDoz,
          largeDoz: 0,
        };
      })
    );
  }, [editTarget, editVanLoads]);

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const closeEdit = () => {
    setEditTarget(null);
    setEditVendorRows([]);
    setDeleteConfirm(false);
  };

  const editMutation = useMutation({
    mutationFn: async (v: EditFormValues) => {
      await assignmentsApi.update(editTarget!.id, {
        routeId: v.routeId,
        driverId: v.driverId,
      });

      const invList = inventoryData?.data ?? [];
      const newRows = editVendorRows.filter(
        (r) => !r.vanLoadId && r.inventoryId && dozToUnits(r.smallDoz, r.mediumDoz, r.largeDoz) > 0
      );

      await Promise.allSettled(
        newRows.map((r) => {
          const inv = invList.find((i) => i.id === r.inventoryId);
          return inventoryApi.createVanLoad({
            vanAssignmentId: editTarget!.id,
            inventoryId: r.inventoryId,
            loadedUnits: dozToUnits(r.smallDoz, r.mediumDoz, r.largeDoz),
            ratePerUnit: inv?.pricePerUnit ?? inv?.ratePerUnit ?? 0,
          });
        })
      );
    },
    onSuccess: () => {
      toast.success('Assignment updated');
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['assignment-van-loads'] });
      closeEdit();
    },
    onError: () => toast.error('Failed to update assignment'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => assignmentsApi.delete(editTarget!.id),
    onSuccess: () => {
      toast.success('Assignment deleted');
      qc.invalidateQueries({ queryKey: ['assignments'] });
      closeEdit();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      const msg = err?.response?.data?.message ?? 'Failed to delete assignment';
      toast.error(msg);
      setDeleteConfirm(false);
    },
  });

  // ─── Table ─────────────────────────────────────────────────────────────────

  const assignments = data?.data ?? [];
  const filtered = assignments.filter(
    (a) =>
      a.driver?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (a.van?.vanNumber ?? a.van?.registrationNumber ?? '').toLowerCase().includes(search.toLowerCase()) ||
      a.route?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const vanOptions = (vansData?.data ?? []).filter((v) => v.isActive).map((v) => ({
    value: v.id,
    label: v.name || v.vanNumber || v.registrationNumber || v.id,
  }));
  const driverOptions = (driversData?.data ?? []).filter((d) => d.isActive).map((d) => ({
    value: d.id,
    label: d.name ?? '—',
  }));
  const routeOptions = (routesData?.data ?? []).filter((r) => r.isActive).map((r) => ({
    value: r.id,
    label: r.name ?? r.id,
  }));
  const inventoryList = inventoryData?.data ?? [];

  // Per-vendor total qty across all stock rows (for duplicate vendor validation)
  const vendorQtyMap = new Map<string, number>();
  for (const row of stockRows) {
    if (row.inventoryId) {
      vendorQtyMap.set(row.inventoryId, (vendorQtyMap.get(row.inventoryId) ?? 0) + row.loadQty);
    }
  }
  const getRowWarning = (row: StockRow, idx: number): string | undefined => {
    if (!row.inventoryId) return undefined;
    const inv = inventoryList.find((i) => i.id === row.inventoryId);
    const available = inv?.availableUnits ?? 0;
    const totalForVendor = vendorQtyMap.get(row.inventoryId) ?? 0;
    const isDupe = stockRows.some((r, i) => i !== idx && r.inventoryId === row.inventoryId);
    if (isDupe && totalForVendor > available) {
      return `Combined load (${totalForVendor.toLocaleString('en-IN')} units) exceeds available stock (${available.toLocaleString('en-IN')} units) — reduce quantities before assigning.`;
    }
    if (!isDupe && row.loadQty > 0 && row.loadQty > available) {
      return `Load quantity exceeds available stock (${available.toLocaleString('en-IN')} units).`;
    }
    return undefined;
  };
  const hasExceedErrors = stockRows.some((row, idx) => !!getRowWarning(row, idx));

  // Disable submit when any required dropdown is empty
  const watchVanId = createForm.watch('vanId');
  const watchRouteId = createForm.watch('routeId');
  const watchDriverId = createForm.watch('driverId');
  const isFormIncomplete = !watchVanId || !watchRouteId || !watchDriverId;

  // Disable submit when a vendor is selected but load qty is not entered
  const hasIncompleteStockRows = stockRows.some(
    (row) => row.inventoryId !== '' && row.loadQty <= 0,
  );

  const cannotSubmit = isFormIncomplete || hasIncompleteStockRows || hasExceedErrors;

  const columns: Column<VanAssignment>[] = [
    {
      key: 'driver',
      header: 'Employee',
      render: (a: VanAssignment) => (
        <div>
          <p className="font-medium text-dark">{a.driver?.name ?? '—'}</p>
          <p className="text-xs text-muted">{a.driver?.phone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'van',
      header: 'Van / Route',
      render: (a: VanAssignment) => (
        <div>
          <p className="font-semibold text-sm text-dark tracking-wide">{a.van?.vanNumber ?? a.van?.registrationNumber ?? '—'}</p>
          <p className="text-xs text-muted">{a.route?.name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a: VanAssignment) => (
        <Badge variant={VAN_ASSIGNMENT_STATUS_VARIANTS[a.status] ?? 'default'}>
          {VAN_ASSIGNMENT_STATUS_LABELS[a.status] ?? a.status ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'assignedAt',
      header: 'Assigned',
      render: (a: VanAssignment) => (
        <span className="text-muted text-sm">{formatDate(a.assignedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (a: VanAssignment) => (
        <button
          type="button"
          onClick={() => openEdit(a)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-muted hover:text-dark transition-colors"
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ];

  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <PageLoadError title="Could not load assignments" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <span className="font-semibold tabular-nums text-dark">{data?.total ?? 0}</span> assignments
        </p>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="size-4" />}>
          Assign Van
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-disabled" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-dark placeholder:text-disabled focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Search driver, van, or route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No assignments found."
          emptyIcon={<ClipboardList className="size-10 text-border" />}
        />
        {data && data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* ── Assign Van Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showCreate}
        onClose={() => { setShowCreate(false); createForm.reset(); setStockRows([{ inventoryId: '', loadQty: 0 }]); }}
        title="Assign Van"
        size="lg"
      >
        <form
          onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
          className="space-y-6"
        >
          {/* GENERAL INFORMATION */}
          <div className="space-y-4">
            <SectionHeader title="General Information" />

            <Select
              label="Van Name"
              options={vanOptions}
              placeholder="e.g. North-Star-04"
              className={modalFieldClass}
              error={createForm.formState.errors.vanId?.message}
              {...createForm.register('vanId')}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Select Route"
                options={routeOptions}
                placeholder="Select route"
                className={modalFieldClass}
                error={createForm.formState.errors.routeId?.message}
                {...createForm.register('routeId')}
              />
              <Select
                label="Assign Employee"
                options={driverOptions}
                placeholder="Select employee"
                className={modalFieldClass}
                error={createForm.formState.errors.driverId?.message}
                {...createForm.register('driverId')}
              />
            </div>

            <input type="hidden" {...createForm.register('assignedDate')} />
          </div>

          {/* STOCK LOADING */}
          <div className="space-y-4">
            <SectionHeader title="Stock Loading" />

            {stockRows.map((row, i) => (
              <StockLoadRow
                key={i}
                index={i}
                inventoryList={inventoryList}
                isLoadingInventory={isLoadingInventory}
                row={row}
                onChange={(updated) =>
                  setStockRows((prev) => prev.map((r, idx) => (idx === i ? updated : r)))
                }
                onRemove={() => setStockRows((prev) => prev.filter((_, idx) => idx !== i))}
                canRemove={stockRows.length > 1}
                warningMsg={getRowWarning(row, i)}
              />
            ))}

            <button
              type="button"
              onClick={() => setStockRows((prev) => [...prev, { inventoryId: '', loadQty: 0 }])}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D4C4B0] bg-[#FFF5F0] py-3.5 text-sm font-semibold text-taupe transition hover:border-primary/45 hover:text-primary"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              More Load
            </button>

            <div className="flex items-start gap-2.5 rounded-xl bg-[#FFF4E5] px-4 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-[#904D00]" strokeWidth={2.25} />
              <p className="text-xs leading-relaxed text-taupe">
                Loading quantity cannot exceed the available vendor stock.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl border-[#E9E8E6] bg-[#F4F3F1] text-sm font-bold text-taupe hover:bg-neutral-200"
              onClick={() => { setShowCreate(false); createForm.reset(); setStockRows([{ inventoryId: '', loadQty: 0 }]); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
              disabled={cannotSubmit || createMutation.isPending}
              className="h-12 rounded-xl text-sm font-bold disabled:opacity-60"
            >
              Assign Van
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Assignment Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!editTarget}
        onClose={closeEdit}
        title="Edit Assignment"
        subtitle={
          editTarget
            ? `Update logistics details for ${editTarget.van?.name || editTarget.van?.vanNumber || 'van'}`
            : undefined
        }
        size="lg"
      >
        <form
          onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))}
          className="space-y-6"
        >
          <div className="space-y-4">
            <EditSectionHeader icon={Truck} title="General Information" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#212121]">Van Name</label>
              <input
                readOnly
                value={editTarget?.van?.name || editTarget?.van?.vanNumber || '—'}
                className="h-11 w-full cursor-default rounded-xl border-0 bg-[#EBEBEB] px-3 text-sm font-medium text-[#212121] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4">
            <EditSectionHeader icon={MapPin} title="Route & Team Assignment" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Select Route"
                options={routeOptions}
                placeholder="Select route"
                className={modalFieldClass}
                error={editForm.formState.errors.routeId?.message}
                {...editForm.register('routeId')}
              />
              <Select
                label="Assign Employee"
                options={driverOptions}
                placeholder="Select employee"
                className={modalFieldClass}
                error={editForm.formState.errors.driverId?.message}
                {...editForm.register('driverId')}
              />
            </div>
          </div>

          <div className="space-y-4">
            <EditSectionHeader
              icon={Package}
              title="Inventory Loading"
              action={
                <button
                  type="button"
                  onClick={() =>
                    setEditVendorRows((prev) => [
                      ...prev,
                      {
                        inventoryId: '',
                        vendorName: '',
                        smallDoz: 0,
                        mediumDoz: 0,
                        largeDoz: 0,
                      },
                    ])
                  }
                  className="text-xs font-bold text-[#904D00] transition hover:text-primary"
                >
                  + Add Another Vendor
                </button>
              }
            />

            {editVendorRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D4C4B0] bg-[#FFF5F0] px-4 py-8 text-center text-sm text-[#777777]">
                No vendor loads for this assignment.
              </div>
            ) : (
              <div className="space-y-3">
                {editVendorRows.map((row, i) => (
                  <EditVendorLoadCard
                    key={row.vanLoadId ?? `new-${i}`}
                    row={row}
                    inventoryList={inventoryList}
                    onChange={(updated) =>
                      setEditVendorRows((prev) => prev.map((r, idx) => (idx === i ? updated : r)))
                    }
                    onRemove={() =>
                      setEditVendorRows((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {deleteConfirm ? (
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">
                Delete this assignment and all its van loads?
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="text-sm font-semibold text-[#57534e] transition hover:text-[#212121]"
                >
                  Cancel
                </button>
                <Button
                  type="button"
                  isLoading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate()}
                  className="h-9 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-700 shadow-none"
                >
                  Yes, Delete
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirm(true)}
                className="text-sm font-semibold text-red-600 transition hover:text-red-700"
              >
                Delete Assignment
              </button>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="text-sm font-semibold text-taupe transition hover:text-primary"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  isLoading={editMutation.isPending}
                  className="h-11 rounded-full px-8 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
