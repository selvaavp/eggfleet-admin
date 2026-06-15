import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  ShoppingCart,
  Wallet,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { vendorsApi } from '@/api/vendors.api';
import { useAuthStore } from '@/store/auth.store';
import {
  Button, Card, Table, Modal, EmptyState, Pagination, PageLoadError, type Column,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { PurchaseEntryModal } from '@/components/vendors/PurchaseEntryModal';
import { RecordVendorPaymentModal } from '@/components/vendors/RecordVendorPaymentModal';
import { VendorFormModal } from '@/components/vendors/VendorFormModal';
import type { VendorFormValues } from '@/components/vendors/vendor-form.schema';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import type { Vendor } from '@/types';

type VendorStatusFilter = 'all' | 'active' | 'inactive';

const STATUS_TABS: { id: VendorStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function aadhaarCardParts(v?: string | null) {
  const plain = (v ?? '').replace(/\D/g, '');
  if (plain.length < 4) return null;
  return { line1: 'XXXX', line2: 'XXXX', last4: plain.slice(-4) };
}

function maskAccountLast4(v?: string | null) {
  if (!v) return null;
  const plain = v.replace(/\D/g, '');
  if (plain.length < 4) return null;
  return plain.slice(-4);
}

function VendorAadhaarCard({ aadharNumber }: { aadharNumber?: string | null }) {
  const parts = aadhaarCardParts(aadharNumber);
  if (!parts) return <span className="text-body-md text-[#777777]">—</span>;

  const monoLine = 'font-mono text-body-md font-bold leading-none tracking-wide text-[#212121]';

  return (
    <div className="flex justify-center">
      <div className="inline-grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-2 rounded-xl border border-[#E9E8E6] bg-[#F4F3F1] px-6 py-4">
        <span className={cn('col-start-2', monoLine)}>{parts.line1}</span>
        <ShieldCheck
          className="row-start-2 size-4.2 shrink-0 text-[#9CA3AF]"
          strokeWidth={2.25}
          aria-hidden
        />
        <span className={cn('col-start-2 row-start-2', monoLine)}>{parts.line2}</span>
        <span className={cn('col-start-2 row-start-3', monoLine)}>{parts.last4}</span>
      </div>
    </div>
  );
}

function VendorBankCard({
  bankName,
  bankAccountNumber,
  bankIfsc,
}: {
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
}) {
  const last4 = maskAccountLast4(bankAccountNumber);
  const name = bankName?.trim();
  if (!name && !last4) return <span className="text-sm text-[#777777]">—</span>;

  return (
    <div className="inline-flex w-full max-w-[8.4rem] flex-col rounded-xl border border-[#E9E8E6] bg-white px-3.5 py-3 shadow-[0px_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-2">
        {name ? (
          <p className="min-w-0 flex-1 text-body-sm font-extrabold leading-snug text-[#212121]">{name}</p>
        ) : (
          <span className="flex-1" />
        )}
        <Landmark className="size-4 shrink-0 text-[#904D00]" strokeWidth={2.25} aria-hidden />
      </div>
      {last4 ? (
        <div className="mt-3">
          <p className="font-mono text-body-sm font-semibold leading-snug text-[#57534e]">Ending in</p>
          <p className="font-mono text-body-sm font-semibold leading-snug text-[#57534e]">
            .... {last4}
          </p>
        </div>
      ) : null}
      {bankIfsc?.trim() ? (
        <div className="mt-3">
          <p className="text-sm font-medium leading-snug text-[#9CA3AF]">IFSC:</p>
          <p className="text-sm font-medium leading-snug text-[#9CA3AF]">{bankIfsc.trim()}</p>
        </div>
      ) : null}
    </div>
  );
}

function VendorPhoneDisplay({ phone }: { phone?: string | null }) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length !== 10) {
    return <span className="text-sm font-medium text-[#212121]">{phone?.trim() || '—'}</span>;
  }
  return (
    <div className="text-md font-medium leading-snug text-[#212121]">
      <p>+91</p>
      <p>{digits}</p>
    </div>
  );
}

// ─── Row Action Menu ───────────────────────────────────────────────────────────

function ActionMenu({
  vendor,
  onEdit,
  onDelete,
}: {
  vendor: Vendor;
  onEdit: (v: Vendor) => void;
  onDelete: (v: Vendor) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 88;
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    setMenuPos({
      top: flip ? rect.top - menuHeight - gap : below,
      left: rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    window.addEventListener('scroll', updateMenuPosition, true);
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true);
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const menu =
    open &&
    menuPos &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[9999] w-40 -translate-x-full overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onEdit(vendor);
          }}
        >
          <Pencil className="size-3.5 text-primary" /> Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onDelete(vendor);
          }}
        >
          <Trash2 className="size-3.5" /> Delete
        </button>
      </div>,
      document.body,
    );

  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => {
            const next = !p;
            if (next) requestAnimationFrame(updateMenuPosition);
            return next;
          });
        }}
        className="flex size-10 items-center justify-center rounded-md bg-[#F5F5F4] text-[#57534e] transition hover:bg-[#EEEDEB] hover:text-[#212121]"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="size-5" strokeWidth={2.25} />
      </button>
      {menu}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<VendorStatusFilter>('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['vendors', page],
    queryFn: () => vendorsApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  // All vendors for dropdowns
  const { data: allVendors } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: () => vendorsApi.list({ limit: 500 }),
  });
  const vendorOptions = (allVendors?.data ?? []).map((v) => ({ value: v.id, label: v.name ?? '—' }));

  const createMutation = useMutation({
    mutationFn: vendorsApi.create,
    onSuccess: () => {
      toast.success('Vendor created');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-all'] });
      setShowAddModal(false);
    },
    onError: () => toast.error('Failed to create vendor'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: VendorFormValues & { isActive?: boolean } }) =>
      vendorsApi.update(id, payload),
    onSuccess: () => {
      toast.success('Vendor updated');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-all'] });
      setEditVendor(null);
    },
    onError: () => toast.error('Failed to update vendor'),
  });

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => {
      toast.success('Vendor deleted');
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['vendors-all'] });
      setDeleteVendor(null);
    },
    onError: () => toast.error('Failed to delete vendor'),
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const pageRows = data?.data ?? [];
  const vendors = pageRows.filter((v) => {
    if (statusFilter === 'active') return v.isActive;
    if (statusFilter === 'inactive') return !v.isActive;
    return true;
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const columns: Column<Vendor>[] = [
    {
      key: 'name',
      header: 'Vendor Name',
      width: '18%',
      align: 'left',
      render: (v) => <p className="text-body-md font-bold text-[#212121]">{v.name ?? '—'}</p>,
    },
    {
      key: 'phone',
      header: 'Phone Number',
      width: '14%',
      align: 'left',
      render: (v) => <VendorPhoneDisplay phone={v.phone} />,
    },
    {
      key: 'address',
      header: 'Address',
      width: '22%',
      align: 'left',
      render: (v) =>
        v.address ? (
          <p className="text-body-md font-medium leading-snug text-[#212121] line-clamp-3 whitespace-pre-line">
            {v.address}
          </p>
        ) : (
          <span className="text-body-md text-[#777777]">—</span>
        ),
    },
    {
      key: 'aadhaar',
      header: 'Aadhaar Number',
      width: '16%',
      align: 'center',
      render: (v) => <VendorAadhaarCard aadharNumber={v.aadharNumber} />,
    },
    {
      key: 'bank',
      header: 'Bank Details',
      width: '22%',
      align: 'left',
      render: (v) => (
        <VendorBankCard
          bankName={v.bankName}
          bankAccountNumber={v.bankAccountNumber}
          bankIfsc={v.bankIfsc}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '8%',
      align: 'right',
      render: (v) => (
        <ActionMenu
          vendor={v}
          onEdit={(vendor) => setEditVendor(vendor)}
          onDelete={(vendor) => setDeleteVendor(vendor)}
        />
      ),
    },
  ];

  if (isError) {
    return <PageLoadError title="Could not load vendors" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="inline-flex rounded-md bg-[#F0EFED] p-1"
          role="tablist"
          aria-label="Vendor status"
        >
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                'min-w-[4.5rem] rounded-md px-5 py-2 text-sm font-semibold transition-all',
                statusFilter === tab.id
                  ? 'bg-white text-taupe shadow-[0_1px_3px_rgba(26,28,27,0.08)]'
                  : 'bg-transparent text-taupe/75 hover:text-taupe',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => setShowPurchaseModal(true)}>
            <ShoppingCart className="size-4" /> Purchase Entry
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowPaymentModal(true)}>
            <Wallet className="size-4" /> Record Payment
          </Button>
          <Button type="button" onClick={() => setShowAddModal(true)}>
            <Plus className="size-4" /> Add Vendor
          </Button>
        </div>
      </div>

      <Card
        padding={false}
        className="overflow-visible border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        {!isLoading && vendors.length === 0 && pageRows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No vendors yet"
            description="Add your first vendor to get started"
            action={
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="size-4" /> Add Vendor
              </Button>
            }
          />
        ) : (
          <>
            <Table
              variant="vendor"
              columns={columns}
              data={vendors}
              keyExtractor={(v) => v.id}
              isLoading={isLoading}
              emptyMessage={
                statusFilter === 'all'
                  ? 'No vendors found.'
                  : `No ${statusFilter} vendors on this page.`
              }
              emptyIcon={<Building2 className="size-10 text-border" />}
              onRowClick={(v) => navigate(APP_ROUTES.VENDOR_DETAIL(v.id))}
            />
            {!isLoading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#F9F9F9] px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-[#777777]">
                  Showing{' '}
                  <span className="text-[#212121]">
                    {rangeFrom}-{rangeTo}
                  </span>{' '}
                  of <span className="text-[#212121]">{total}</span> vendors
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
          </>
        )}
      </Card>

      <VendorFormModal
        mode="create"
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={(values) => createMutation.mutate(values)}
        isSubmitting={createMutation.isPending}
      />

      <VendorFormModal
        mode="edit"
        open={!!editVendor}
        vendor={editVendor}
        onClose={() => setEditVendor(null)}
        showActiveToggle
        onSubmit={(values, meta) =>
          updateMutation.mutate({
            id: editVendor!.id,
            payload: { ...values, isActive: meta?.isActive },
          })
        }
        isSubmitting={updateMutation.isPending}
      />

      {/* ── Delete Confirm Modal ── */}
      <Modal open={!!deleteVendor} onClose={() => setDeleteVendor(null)} title="Delete Vendor" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-dark">
            Are you sure you want to delete <strong>{deleteVendor?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteVendor(null)}>Cancel</Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => deleteVendor && deleteMutation.mutate(deleteVendor.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Purchase Entry Modal ── */}
      <PurchaseEntryModal
        open={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        vendorOptions={vendorOptions}
        userId={user?.id ?? ''}
        onSuccess={() => {}}
      />

      {/* ── Record Payment Modal ── */}
      <RecordVendorPaymentModal
        open={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        vendorOptions={vendorOptions}
      />
    </div>
  );
}
