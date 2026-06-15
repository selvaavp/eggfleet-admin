import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HandshakeIcon, Search, Eye, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { handoversApi } from '@/api/handovers.api';
import {
  Badge, Card, Table, Modal, Pagination, Select, Button, Input, PageLoadError, type Column,
} from '@/components/ui';
import type { Handover, HandoverStatus } from '@/types';
import {
  DEFAULT_PAGE_SIZE,
  HANDOVER_STATUS_LABELS,
  HANDOVER_STATUS_VARIANTS,
  HANDOVER_STATUS_OPTIONS,
} from '@/constants';
import { formatCurrency } from '@/lib/utils';
import { handoverDateTime, handoverEggSummary, handoverVanLabel } from '@/lib/handover-display';
import toast from 'react-hot-toast';

export default function HandoversPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Handover | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [newStatus, setNewStatus] = useState<HandoverStatus>('PENDING');
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['handovers', page],
    queryFn: () => handoversApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: () =>
      handoversApi.updateStatus(
        selected!.id,
        newStatus,
        newStatus === 'REJECTED' ? rejectReason : undefined,
      ),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['handovers'] });
      setShowDetail(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const quickAction = (h: Handover, status: HandoverStatus) => {
    handoversApi.updateStatus(h.id, status).then(() => {
      toast.success(status === 'APPROVED' ? 'Handover approved' : 'Handover rejected');
      qc.invalidateQueries({ queryKey: ['handovers'] });
    }).catch(() => toast.error('Action failed'));
  };

  const handovers = data?.data ?? [];
  const filtered = handovers.filter(
    (h) =>
      h.driver?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (h.vanAssignment?.van?.vanNumber ?? h.vanAssignment?.van?.registrationNumber ?? '')
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const openDetail = (h: Handover & { _preselect?: HandoverStatus }) => {
    setSelected(h);
    setNewStatus(h._preselect ?? h.status);
    setRejectReason('');
    setShowDetail(true);
  };

  const columns: Column<Handover>[] = [
    {
      key: 'driver',
      header: 'Driver',
      render: (h: Handover) => (
        <div>
          <p className="font-medium text-dark">{h.driver?.name ?? '—'}</p>
          <p className="text-xs text-muted">{h.driver?.phone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'van',
      header: 'Van',
      render: (h: Handover) => (
        <span className="font-semibold text-sm text-dark tracking-wide">{handoverVanLabel(h)}</span>
      ),
    },
    {
      key: 'when',
      header: 'Date & time',
      render: (h: Handover) => (
        <span className="text-sm text-muted">{handoverDateTime(h)}</span>
      ),
    },
    {
      key: 'eggs',
      header: 'Eggs (handover)',
      render: (h: Handover) => (
        <span className="text-sm text-dark">{handoverEggSummary(h)}</span>
      ),
    },
    {
      key: 'cash',
      header: 'Cash amount',
      render: (h: Handover) => (
        <span className="text-sm font-bold text-primary">{formatCurrency(Number(h.cashAmount ?? 0))}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (h: Handover) => (
        <Badge variant={HANDOVER_STATUS_VARIANTS[h.status] ?? 'default'}>
          {(h.status && HANDOVER_STATUS_LABELS[h.status]) ?? h.status ?? '—'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (h: Handover) => (
        <HandoverActionMenu
          handover={h}
          onView={() => openDetail(h)}
          onQuickApprove={() => quickAction(h, 'APPROVED')}
          onQuickReject={() => openDetail({ ...h, _preselect: 'REJECTED' } as Handover)}
        />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="p-6 space-y-6">
        <PageLoadError title="Could not load handovers" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/50 bg-primary/[0.05] p-6 space-y-6">
      <p className="text-sm text-muted">
        <span className="font-semibold tabular-nums text-dark">{data?.total ?? 0}</span> handover records
      </p>

      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-disabled" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm text-dark placeholder:text-disabled focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Search by driver or van..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card padding={false} className="overflow-hidden border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]">
        <Table
          variant="ledger"
          columns={columns}
          data={filtered}
          keyExtractor={(h) => h.id}
          isLoading={isLoading}
          emptyMessage="No handovers found."
          emptyIcon={<HandshakeIcon className="size-10 text-border" />}
        />
        {data && data.totalPages > 1 && (
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <Modal
        open={showDetail}
        onClose={() => setShowDetail(false)}
        title="Handover detail"
        size="lg"
      >
        {selected && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Driver', value: selected.driver?.name ?? '—' },
                { label: 'Van', value: handoverVanLabel(selected) },
                {
                  label: 'Route',
                  value: selected.vanAssignment?.route?.name ?? '—',
                },
                { label: 'Date & time', value: handoverDateTime(selected) },
                { label: 'Cash amount', value: formatCurrency(Number(selected.cashAmount ?? 0)) },
                { label: 'Eggs', value: handoverEggSummary(selected) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">{label}</p>
                  <p className="text-sm font-bold text-dark">{value}</p>
                </div>
              ))}
            </div>

            {selected.eggItems && selected.eggItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Egg lines</p>
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f4f3f1]">
                      <tr>
                        {['Van load', 'Rate', 'Good', 'Damaged'].map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-[#212121]"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {selected.eggItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2 font-mono text-xs text-dark">
                            {item.vanLoadId.slice(0, 8)}…
                          </td>
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

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-semibold text-dark">Update status</p>
              <Select
                label="New status"
                options={HANDOVER_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
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
              <Button
                type="button"
                onClick={() => updateStatusMutation.mutate()}
                isLoading={updateStatusMutation.isPending}
              >
                Update
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function HandoverActionMenu({
  handover,
  onView,
  onQuickApprove,
  onQuickReject,
}: {
  handover: Handover;
  onView: () => void;
  onQuickApprove: () => void;
  onQuickReject: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = handover.status === 'PENDING' ? 112 : 48;
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    setMenuPos({
      top: flip ? rect.top - menuHeight - gap : below,
      left: rect.left + rect.width / 2,
    });
  }, [handover.status]);

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
      if (buttonRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const menu = open && menuPos && createPortal(
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
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
        onClick={() => { setOpen(false); onView(); }}
      >
        <Eye className="size-4 text-muted" /> View details
      </button>
      {handover.status === 'PENDING' && (
        <>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
            onClick={() => { setOpen(false); onQuickApprove(); }}
          >
            <CheckCircle2 className="size-4" /> Approve
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-red-50"
            onClick={() => { setOpen(false); onQuickReject(); }}
          >
            <XCircle className="size-4" /> Reject
          </button>
        </>
      )}
    </div>,
    document.body,
  );

  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((p) => { if (!p) requestAnimationFrame(updateMenuPosition); return !p; })}
        className="p-1 text-taupe transition hover:text-[#212121]"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="size-5" strokeWidth={2.5} />
      </button>
      {menu}
    </div>
  );
}
