import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, MapPin, Search, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { routesApi } from '@/api/routes.api';
import {
  Button, Input, Textarea, Badge, Card, Table, Modal, Pagination, PageLoadError,
} from '@/components/ui';
import type { Route } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const createSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  description: z.string().max(500, 'Max 500 characters').optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  isActive: z.boolean(),
});
type EditFormValues = z.infer<typeof editSchema>;

function RouteActionMenu({
  route,
  onEdit,
  onDelete,
}: {
  route: Route;
  onEdit: (route: Route) => void;
  onDelete: (route: Route) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 90;
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
        className="fixed z-[9999] min-w-[10rem] -translate-x-1/2 overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => { setOpen(false); onEdit(route); }}
        >
          <Pencil className="size-3.5 text-muted" /> Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          onClick={() => { setOpen(false); onDelete(route); }}
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
        aria-label={`Actions for ${route.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="size-5" />
      </button>
      {menu}
    </div>
  );
}

export default function RoutesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRoute, setEditRoute] = useState<Route | null>(null);
  const [deleteRoute, setDeleteRoute] = useState<Route | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['routes', page],
    queryFn: () => routesApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const {
    register: regCreate,
    handleSubmit: submitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<CreateFormValues>({ resolver: zodResolver(createSchema) });

  const {
    register: regEdit,
    handleSubmit: submitEdit,
    reset: resetEdit,
    watch: watchEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<EditFormValues>({ resolver: zodResolver(editSchema) });

  const editIsActive = watchEdit('isActive');

  useEffect(() => {
    if (editRoute) {
      resetEdit({
        name: editRoute.name,
        description: editRoute.description ?? '',
        isActive: editRoute.isActive,
      });
    }
  }, [editRoute, resetEdit]);

  const createMutation = useMutation({
    mutationFn: routesApi.create,
    onSuccess: () => {
      toast.success('Route created successfully');
      qc.invalidateQueries({ queryKey: ['routes'] });
      setShowCreateModal(false);
      resetCreate();
    },
    onError: () => toast.error('Failed to create route'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EditFormValues }) =>
      routesApi.update(id, payload),
    onSuccess: () => {
      toast.success('Route updated');
      qc.invalidateQueries({ queryKey: ['routes'] });
      setEditRoute(null);
    },
    onError: () => toast.error('Failed to update route'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => routesApi.delete(id),
    onSuccess: () => {
      toast.success('Route deleted');
      qc.invalidateQueries({ queryKey: ['routes'] });
      setDeleteRoute(null);
    },
    onError: () => toast.error('Failed to delete route'),
  });

  const routes = data?.data ?? [];
  const filtered = routes.filter((r) =>
    (r.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const columns = [
    {
      key: 'name',
      header: 'Route Name',
      render: (r: Route) => (
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="size-4 text-primary" />
          </div>
          <span className="font-medium text-dark">{r.name ?? '—'}</span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (r: Route) => (
        <span className="text-muted text-sm">{r.description || '—'}</span>
      ),
    },
    {
      key: 'stores',
      header: 'Stores',
      render: (r: Route) => (
        <Badge variant="info">{r.storeCount ?? r.stores?.length ?? 0} stores</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: Route) => (
        <Badge variant={r.isActive ? 'success' : 'muted'}>
          {r.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (r: Route) => (
        <span className="text-muted text-sm">{formatDate(r.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r: Route) => (
        <RouteActionMenu route={r} onEdit={setEditRoute} onDelete={setDeleteRoute} />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <PageLoadError title="Could not load routes" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          <span className="font-semibold tabular-nums text-dark">{data?.total ?? 0}</span> routes
        </p>
        <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="size-4" />}>
          Add Route
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search routes..."
          leftIcon={<Search className="size-4" />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <Table
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No routes found. Add your first route."
          emptyIcon={<MapPin className="size-10 text-border" />}
        />
        {data && data.totalPages > 1 && (
          <div className="border-t border-border px-6 py-4">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetCreate(); }}
        title="Add New Route"
        size="md"
      >
        <form onSubmit={submitCreate((v) => createMutation.mutate(v))} className="space-y-4">
          <Input
            label="Route Name"
            placeholder="e.g. North Zone Route"
            error={createErrors.name?.message}
            {...regCreate('name')}
          />
          <Textarea
            label="Description"
            placeholder="Optional description..."
            rows={3}
            error={createErrors.description?.message}
            {...regCreate('description')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowCreateModal(false); resetCreate(); }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Route
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editRoute}
        onClose={() => setEditRoute(null)}
        title="Edit Route"
        size="md"
      >
        <form
          onSubmit={submitEdit((v) => updateMutation.mutate({ id: editRoute!.id, payload: v }))}
          className="space-y-4"
        >
          <Input
            label="Route Name"
            placeholder="e.g. North Zone Route"
            error={editErrors.name?.message}
            {...regEdit('name')}
          />
          <Textarea
            label="Description"
            placeholder="Optional description..."
            rows={3}
            error={editErrors.description?.message}
            {...regEdit('description')}
          />
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-dark">Active</p>
              <p className="text-xs text-muted">Inactive routes won't appear in assignments</p>
            </div>
            <button
              type="button"
              onClick={() => setEditValue('isActive', !editIsActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editIsActive ? 'bg-primary' : 'bg-[#D1D5DB]'}`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${editIsActive ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditRoute(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={!!deleteRoute}
        onClose={() => setDeleteRoute(null)}
        title="Delete Route"
        size="sm"
      >
        <p className="text-sm text-muted mb-5">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-dark">{deleteRoute?.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => setDeleteRoute(null)}>
            Cancel
          </Button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteRoute && deleteMutation.mutate(deleteRoute.id)}
            className="inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
