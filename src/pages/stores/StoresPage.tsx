import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Store as StoreIcon, MoreVertical, SlidersHorizontal, Download, Pencil, Trash2 } from 'lucide-react';
import { storesApi } from '@/api/stores.api';
import { routesApi } from '@/api/routes.api';
import {
  Button,
  Card,
  Table,
  Pagination,
  PageLoadError,
  EmptyState,
  Modal,
  type Column,
} from '@/components/ui';
import { StoreFormModal, type StoreFormValues } from '@/components/stores/StoreFormModal';
import type { Store } from '@/types';
import { APP_ROUTES, DEFAULT_PAGE_SIZE } from '@/constants';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import toast from 'react-hot-toast';
import { useStoresPageStore } from '@/store/stores-page.store';

function storeFinancials(store: Store) {
  const totalSale = Number(store.totalSalesAmount ?? 0);
  const totalPayment = Number(store.totalCollected ?? 0);
  const pending =
    store.pendingAmount != null
      ? Number(store.pendingAmount)
      : Math.max(0, totalSale - totalPayment);
  return { totalSale, totalPayment, pending };
}

function formatStorePhone(phone?: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone?.trim() || '—';
}

const paymentChipBase =
  'inline-flex w-fit items-center justify-center gap-2 rounded-full px-3.5 py-1.5';

function PendingPaymentCell({ pending, totalSale }: { pending: number; totalSale: number }) {
  // No sales yet — show neutral dash instead of "Paid"
  if (totalSale === 0) {
    return (
      <div className="flex justify-center">
        <span className="text-sm font-medium text-[#A8A29E]">—</span>
      </div>
    );
  }

  if (pending <= 0) {
    return (
      <div className="flex justify-center">
        <span className={cn(paymentChipBase, 'bg-emerald-50')}>
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
          <span className="text-sm font-bold text-emerald-700">Paid</span>
        </span>
      </div>
    );
  }

  const ratio = totalSale > 0 ? pending / totalSale : 1;
  const isHigh = pending >= 3000 || ratio >= 0.25;

  return (
    <div className="flex justify-center">
      <span
        className={cn(
          paymentChipBase,
          isHigh ? 'bg-red-50' : 'bg-amber-50'
        )}
      >
        <span
          className={cn(
            'size-2 shrink-0 rounded-full',
            isHigh ? 'bg-red-500' : 'bg-amber-500'
          )}
          aria-hidden
        />
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            isHigh ? 'text-red-700' : 'text-amber-800'
          )}
        >
          {formatINR(pending, { fractionDigits: 2 })}
        </span>
      </span>
    </div>
  );
}

function StoreActionMenu({
  store,
  onView,
  onEdit,
  onDelete,
}: {
  store: Store;
  onView: (store: Store) => void;
  onEdit: (store: Store) => void;
  onDelete: (store: Store) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 120;
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    setMenuPos({
      top: flip ? rect.top - menuHeight - gap : below,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!open) { setMenuPos(null); return; }
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
        className="fixed z-[9999] min-w-[11rem] -translate-x-1/2 overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="w-full px-3 py-2 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => { setOpen(false); onView(store); }}
        >
          View details
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => { setOpen(false); onEdit(store); }}
        >
          <Pencil className="size-3.5 text-muted" /> Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          onClick={() => { setOpen(false); onDelete(store); }}
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
        onClick={() => {
          setOpen((p) => {
            const next = !p;
            if (next) requestAnimationFrame(updateMenuPosition);
            return next;
          });
        }}
        className="flex size-8 items-center justify-center rounded-full text-[#A8A29E] transition hover:bg-[#EEEDEB] hover:text-[#212121]"
        aria-label={`Actions for ${store.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="size-6" />
      </button>
      {menu}
    </div>
  );
}

const outlineBtnClass =
  'inline-flex h-10 items-center gap-2 rounded-[12px] border-0 bg-[#F5F5F4] px-4 text-sm font-bold text-taupe shadow-none transition hover:bg-[#EEEDEB]';

export default function StoresPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [deleteStore, setDeleteStore] = useState<Store | null>(null);
  const setOpenAddCustomerHandler = useStoresPageStore((s) => s.setOpenAddCustomerHandler);

  useEffect(() => {
    setOpenAddCustomerHandler(() => setShowCreateModal(true));
    return () => setOpenAddCustomerHandler(null);
  }, [setOpenAddCustomerHandler]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stores', page],
    queryFn: () => storesApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const { data: routesData } = useQuery({
    queryKey: ['routes-all'],
    queryFn: () => routesApi.list({ page: 1, limit: 500 }),
    enabled: showCreateModal || !!editStore,
  });
  const routes = (routesData?.data ?? []).filter((r) => r.isActive);

  const createMutation = useMutation({
    mutationFn: (v: StoreFormValues) =>
      storesApi.create({
        name: v.name,
        ownerContactName: v.ownerContactName,
        phone: v.phone,
        address: v.address,
        routeId: v.routeId || undefined,
      }),
    onSuccess: () => {
      toast.success('Store registered successfully');
      qc.invalidateQueries({ queryKey: ['stores'] });
      setShowCreateModal(false);
    },
    onError: () => toast.error('Failed to register store'),
  });

  const updateMutation = useMutation({
    mutationFn: (v: StoreFormValues) =>
      storesApi.update(editStore!.id, {
        name: v.name,
        ownerContactName: v.ownerContactName,
        phone: v.phone,
        address: v.address,
        routeId: v.routeId || undefined,
        isActive: v.isActive,
      }),
    onSuccess: () => {
      toast.success('Store updated');
      qc.invalidateQueries({ queryKey: ['stores'] });
      setEditStore(null);
    },
    onError: () => toast.error('Failed to update store'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => storesApi.delete(id),
    onSuccess: () => {
      toast.success('Store deleted');
      qc.invalidateQueries({ queryKey: ['stores'] });
      setDeleteStore(null);
    },
    onError: () => toast.error('Failed to delete store'),
  });

  const stores = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const columns: Column<Store>[] = [
    {
      key: 'name',
      header: 'STORE NAME',
      width: '22%',
      render: (s) => <p className="text-body-md font-bold text-[#212121]">{s.name ?? '—'}</p>,
    },
    {
      key: 'phone',
      header: 'PHONE NUMBER',
      width: '18%',
      render: (s) => (
        <span className="text-body-md font-medium text-[#57534E]">{formatStorePhone(s.phone)}</span>
      ),
    },
    {
      key: 'totalSale',
      header: 'TOTAL SALE',
      width: '16%',
      align: 'right',
      render: (s) => {
        const { totalSale } = storeFinancials(s);
        return (
          <span className="text-body-md font-semibold tabular-nums text-[#212121]">
            {formatINR(totalSale, { fractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'totalPayment',
      header: 'TOTAL PAYMENT',
      width: '16%',
      align: 'right',
      render: (s) => {
        const { totalPayment } = storeFinancials(s);
        return (
          <span className="text-body-md font-semibold tabular-nums text-[#00658F]">
            {formatINR(totalPayment, { fractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: 'pending',
      header: 'PENDING PAYMENT',
      width: '18%',
      align: 'center',
      render: (s) => {
        const { totalSale, pending } = storeFinancials(s);
        return <PendingPaymentCell pending={pending} totalSale={totalSale} />;
      },
    },
    {
      key: 'actions',
      header: 'ACTION',
      width: '10%',
      align: 'right',
      render: (s) => (
        <StoreActionMenu
          store={s}
          onView={(store) => navigate(APP_ROUTES.STORES + `/${store.id}`)}
          onEdit={setEditStore}
          onDelete={setDeleteStore}
        />
      ),
    },
  ];

  const exportCsv = () => {
    const rows = stores.map((s) => {
      const { totalSale, totalPayment, pending } = storeFinancials(s);
      return [
        s.name,
        s.phone,
        totalSale,
        totalPayment,
        pending,
        s.isActive ? 'Active' : 'Inactive',
      ];
    });
    downloadCsv('customer-stores', ['Store', 'Phone', 'Total Sale', 'Total Payment', 'Pending', 'Status'], rows);
    toast.success('Export downloaded');
  };

  if (isError) {
    return <PageLoadError title="Could not load customers" />;
  }

  return (
    <div className="space-y-4">
      <Card
        padding={false}
        className="overflow-hidden border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        <div className="flex flex-col gap-3 border-b border-[#E9E8E6] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-extrabold text-[#212121]">Store Directory</h2>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={outlineBtnClass} onClick={exportCsv}>
              <Download className="size-4 text-[#777777]" strokeWidth={2} />
              Export
            </button>
          </div>
        </div>

        {!isLoading && stores.length === 0 ? (
          <EmptyState
            icon={StoreIcon}
            title="No customers yet"
            description="Add your first customer store to the directory"
            action={
              <Button size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="size-4" />}>
                Add New Customer
              </Button>
            }
          />
        ) : (
          <>
            <Table
              variant="customer"
              columns={columns}
              data={stores}
              keyExtractor={(s) => s.id}
              isLoading={isLoading}
              emptyMessage="No stores found."
              emptyIcon={<StoreIcon className="size-10 text-border" />}
              onRowClick={(s) => navigate(`/stores/${s.id}`)}
            />
            {!isLoading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#F9F9F9] px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[#757575]">
                  Showing{' '}
                  <span className="font-semibold text-[#212121]">{rangeFrom}</span> to{' '}
                  <span className="font-semibold text-[#212121]">{rangeTo}</span> of{' '}
                  <span className="font-semibold text-[#212121]">{total}</span> stores
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

      {/* Create Modal */}
      <StoreFormModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        routes={routes}
        isSubmitting={createMutation.isPending}
        onSubmit={(values) => createMutation.mutate(values)}
        mode="create"
      />

      {/* Edit Modal */}
      <StoreFormModal
        open={!!editStore}
        onClose={() => setEditStore(null)}
        routes={routes}
        isSubmitting={updateMutation.isPending}
        onSubmit={(values) => updateMutation.mutate(values)}
        store={editStore}
        mode="edit"
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteStore}
        onClose={() => setDeleteStore(null)}
        title="Delete Store"
        size="sm"
      >
        <p className="text-sm text-muted mb-5">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-dark">{deleteStore?.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDeleteStore(null)}>
            Cancel
          </Button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteStore && deleteMutation.mutate(deleteStore.id)}
            className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
