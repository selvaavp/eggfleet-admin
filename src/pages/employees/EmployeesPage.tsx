import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { UserCheck, Search, Phone, Plus, Truck, MoreVertical, Pencil, Trash2, Download } from 'lucide-react';
import { employeesApi } from '@/api/employees.api';
import { downloadCsv } from '@/lib/csv';
import { AddEmployeeProfileModal } from '@/components/employees/AddEmployeeProfileModal';
import { EditEmployeeProfileModal } from '@/components/employees/EditEmployeeProfileModal';
import {
  Button, Card, Modal, Table, Pagination, PageLoadError, type Column,
} from '@/components/ui';
import type { Employee, Van } from '@/types';
import { DEFAULT_PAGE_SIZE } from '@/constants';

function formatPhone(phone: string | undefined | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone?.trim() || '—';
}

function formatAssignedVan(van: Van | undefined | null): string {
  if (!van) return 'No assigned van';
  const label = van.vanNumber ?? van.registrationNumber ?? '';
  if (!label) return 'No assigned van';
  if (/^van\s*#/i.test(label)) return label;
  return `Van #${label}`;
}

function employeeStatusLabel(isActive: boolean | undefined): string {
  return isActive ? 'Active' : 'Inactive';
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function EmployeeAvatar({ name, url, size = 'md' }: { name?: string; url?: string | null; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'size-8 text-xs' : 'size-9 text-sm';
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? 'avatar'}
        className={`${cls} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0`}>
      <span className="font-bold text-primary">
        {(name?.trim()?.[0] ?? '?').toUpperCase()}
      </span>
    </div>
  );
}

// ─── Row Action Menu ──────────────────────────────────────────────────────────

function RowActionMenu({
  onEdit,
  onDelete,
  align = 'end',
}: {
  onEdit: () => void;
  onDelete: () => void;
  align?: 'center' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuHeight = 96;
  const menuWidth = 168;

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    const top = flip ? rect.top - menuHeight - gap : below;
    const left =
      align === 'center' ? rect.left + rect.width / 2 - menuWidth / 2 : rect.right - menuWidth;
    setMenuPos({ top, left });
  }, [align]);

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
        className="fixed z-[9999] min-w-[168px] overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onEdit();
          }}
        >
          <Pencil className="size-4 text-[#9CA3AF]" />
          Edit Employee
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            onDelete();
          }}
        >
          <Trash2 className="size-4" />
          Delete Employee
        </button>
      </div>,
      document.body,
    );

  return (
    <div
      className={`flex ${align === 'end' ? 'justify-end' : 'justify-center'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-lg p-1.5 text-muted transition-colors hover:bg-primary/10 hover:text-primary"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => {
            const next = !p;
            if (next) requestAnimationFrame(updateMenuPosition);
            return next;
          });
        }}
      >
        <MoreVertical className="size-4" />
      </button>
      {menu}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [deleteEmployee, setDeleteEmployee] = useState<Employee | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees', page],
    queryFn: () => employeesApi.list({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  useEffect(() => {
    setPage(1);
  }, [search]);

  const closeAddModal = () => setShowModal(false);
  const closeEditModal = () => setEditEmployee(null);

  // ── Create ──
  const [isCreating, setIsCreating] = useState(false);
  const onCreateSubmit = async ({
    values,
    photoFile,
  }: {
    values: { name: string; phone: string };
    photoFile: File | null;
  }) => {
    setIsCreating(true);
    try {
      const created = await employeesApi.create({ name: values.name, phone: values.phone });
      if (photoFile && created?.id) {
        try {
          await employeesApi.uploadAvatar(created.id, photoFile);
        } catch {
          toast.error('Employee created but photo upload failed');
        }
      }
      toast.success('Employee created');
      qc.invalidateQueries({ queryKey: ['employees'] });
      closeAddModal();
    } catch {
      toast.error('Failed to create employee');
    } finally {
      setIsCreating(false);
    }
  };

  // ── Update ──
  const [isSaving, setIsSaving] = useState(false);
  const onEditSubmit = async ({
    values,
    photoFile,
  }: {
    values: { name: string; phone: string };
    photoFile: File | null;
    photoRemoved?: boolean;
  }) => {
    if (!editEmployee) return;
    setIsSaving(true);
    try {
      await employeesApi.update(editEmployee.id, { name: values.name, phone: values.phone });
      if (photoFile) {
        try {
          await employeesApi.uploadAvatar(editEmployee.id, photoFile);
        } catch {
          toast.error('Profile saved but photo upload failed');
        }
      }
      toast.success('Employee updated');
      qc.invalidateQueries({ queryKey: ['employees'] });
      closeEditModal();
    } catch {
      toast.error('Failed to update employee');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesApi.deleteEmployee(id),
    onSuccess: () => {
      toast.success('Employee deleted');
      qc.invalidateQueries({ queryKey: ['employees'] });
      setDeleteEmployee(null);
    },
    onError: () => toast.error('Failed to delete employee'),
  });

  const employees = data?.data ?? [];
  const searchLower = search.trim().toLowerCase();
  const filtered = searchLower
    ? employees.filter(
        (e) =>
          (e.name ?? '').toLowerCase().includes(searchLower) ||
          (e.phone ?? '').toLowerCase().includes(searchLower) ||
          (e.email ?? '').toLowerCase().includes(searchLower) ||
          formatAssignedVan(e.currentAssignment?.van).toLowerCase().includes(searchLower),
      )
    : employees;

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('No employees to export');
      return;
    }
    downloadCsv(
      `employees-${new Date().toISOString().slice(0, 10)}`,
      ['Employee Name', 'Phone Number', 'Assigned Van', 'Status', 'Email'],
      filtered.map((e) => [
        e.name ?? '',
        formatPhone(e.phone),
        e.currentAssignment?.van
          ? formatAssignedVan(e.currentAssignment.van)
          : 'No assigned van',
        employeeStatusLabel(e.isActive),
        e.email ?? '',
      ]),
    );
    toast.success(`Exported ${filtered.length} employee${filtered.length === 1 ? '' : 's'}`);
  };

  // ── Columns (matching Figma) ──
  const columns: Column<Employee>[] = [
    {
      key: 'name',
      header: 'Employee Name',
      width: '26%',
      align: 'left',
      render: (e: Employee) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar name={e.name} url={e.profilePictureUrl} />
          <p className="font-bold text-[#212121]">{e.name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone Number',
      width: '20%',
      align: 'center',
      render: (e: Employee) => (
        <span className="text-sm font-medium text-[#212121]">{formatPhone(e.phone)}</span>
      ),
    },
    {
      key: 'assignment',
      header: 'Assigned Van',
      width: '22%',
      align: 'center',
      render: (e: Employee) =>
        e.currentAssignment?.van ? (
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-[#212121]">
            <Truck className="size-4 shrink-0 text-[#757575]" strokeWidth={2} />
            {formatAssignedVan(e.currentAssignment.van)}
          </div>
        ) : (
          <span className="text-sm font-medium text-[#757575]">No assigned van</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '16%',
      align: 'center',
      render: (e: Employee) => (
        <div className="flex items-center justify-center gap-2">
          <span
            className={`size-2 shrink-0 rounded-full ${e.isActive ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
            aria-hidden
          />
          <span
            className={`text-sm font-medium ${e.isActive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}
          >
            {employeeStatusLabel(e.isActive)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '16%',
      align: 'right',
      render: (e: Employee) => (
        <RowActionMenu
          align="end"
          onEdit={() => setEditEmployee(e)}
          onDelete={() => setDeleteEmployee(e)}
        />
      ),
    },
  ];

  if (isError) {
    return <PageLoadError title="Could not load employees" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-disabled" />
          <input
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-4 text-sm text-dark placeholder:text-disabled focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Search by name, phone, or van..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ledgerExport"
            size="sm"
            className="rounded-xl px-4"
            leftIcon={<Download className="size-4 shrink-0" />}
            onClick={exportCsv}
          >
            Export CSV
          </Button>
          <Button type="button" leftIcon={<Plus className="size-4" />} onClick={() => setShowModal(true)}>
            Add Employee
          </Button>
        </div>
      </div>

      <Card
        padding={false}
        className="overflow-visible border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        <Table
          variant="employee"
          columns={columns}
          data={filtered}
          isLoading={isLoading}
          emptyMessage="No employees found."
          emptyIcon={<UserCheck className="size-10 text-border" />}
          onRowClick={(e) => navigate(`/employees/${e.id}`)}
        />
        {!isLoading && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#F9F9F9] px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#757575]">
              Showing{' '}
              <span className="font-semibold text-[#212121]">{rangeFrom}</span> to{' '}
              <span className="font-semibold text-[#212121]">{rangeTo}</span> of{' '}
              <span className="font-semibold text-[#212121]">{total}</span> employees
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

      <AddEmployeeProfileModal
        isOpen={showModal}
        onClose={closeAddModal}
        isCreating={isCreating}
        onCreate={onCreateSubmit}
      />

      <EditEmployeeProfileModal
        isOpen={!!editEmployee}
        employee={editEmployee}
        onClose={closeEditModal}
        isSaving={isSaving}
        onSave={async ({ values, photoFile, photoRemoved }) => {
          await onEditSubmit({ values, photoFile, photoRemoved });
        }}
      />

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteEmployee}
        onClose={() => setDeleteEmployee(null)}
        title="Delete Employee"
        size="sm"
      >
        {deleteEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
              <EmployeeAvatar name={deleteEmployee.name} url={deleteEmployee.profilePictureUrl} />
              <div>
                <p className="text-sm font-semibold text-dark">{deleteEmployee.name}</p>
                <p className="text-xs text-muted">{deleteEmployee.phone}</p>
              </div>
            </div>
            <p className="text-sm text-dark">
              Are you sure you want to delete{' '}
              <span className="font-semibold">{deleteEmployee.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteEmployee(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteEmployee.id)}
              >
                Delete Employee
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

