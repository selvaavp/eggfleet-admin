import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ChevronDown,
  Download,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Tag,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesApi } from '@/api/expenses.api';
import {
  Card,
  Table,
  EmptyState,
  Pagination,
  PageLoadError,
  DateRangePicker,
  Modal,
  Button,
  StatCard,
  type Column,
} from '@/components/ui';
import { ExpenseEntryModal } from '@/components/expenses/ExpenseEntryModal';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { formatINR } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseCategory } from '@/types';

const CATEGORY_FILTER_OPTIONS: { value: 'ALL' | ExpenseCategory; label: string }[] = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'COMPANY', label: 'Company' },
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'OTHER', label: 'Other' },
];

function CategoryChip({ category }: { category: ExpenseCategory }) {
  const styles: Record<ExpenseCategory, string> = {
    COMPANY: 'bg-[#EFF8FF] text-[#2563EB]',
    VEHICLE: 'bg-[#FFF4E5] text-[#904D00]',
    OTHER: 'bg-[#F4F3F1] text-[#57534E]',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide',
        styles[category] ?? 'bg-[#F5F5F4] text-[#57534E]',
      )}
    >
      {category}
    </span>
  );
}

function ExpenseActionMenu({
  row,
  onEdit,
  onDelete,
}: {
  row: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuHeight = 48;
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + menuHeight > window.innerHeight;
    setMenuPos({
      top: flip ? rect.top - menuHeight - gap : below,
      left: rect.left + rect.width / 2,
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
        className="fixed z-[9999] min-w-[11rem] -translate-x-1/2 overflow-hidden rounded-xl border border-[#E9E8E6] bg-white py-1 shadow-[0px_8px_24px_rgba(26,28,27,0.15)]"
        style={{ top: menuPos.top, left: menuPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-[#212121] transition hover:bg-[#FAFAF9]"
          onClick={() => { setOpen(false); onEdit(row); }}
        >
          <Pencil className="size-3.5 text-[#78716C]" strokeWidth={2} />
          Edit
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          onClick={() => { setOpen(false); onDelete(row); }}
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
          Delete
        </button>
      </div>,
      document.body,
    );

  return (
    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
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
        className="p-1 text-[#9CA3AF] transition hover:text-[#212121]"
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

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Expense | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<Expense | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteEntry(null);
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const dateParams = useMemo(() => {
    if (rangeStart && rangeEnd) {
      return { startDate: format(rangeStart, 'yyyy-MM-dd'), endDate: format(rangeEnd, 'yyyy-MM-dd') };
    }
    return {};
  }, [rangeStart, rangeEnd]);

  const queryParams = useMemo(() => {
    const base: {
      page: number;
      limit: number;
      startDate?: string;
      endDate?: string;
      category?: ExpenseCategory;
    } = { page, limit: DEFAULT_PAGE_SIZE, ...dateParams };
    if (categoryFilter !== 'ALL') base.category = categoryFilter;
    return base;
  }, [page, dateParams, categoryFilter]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['expenses', queryParams],
    queryFn: () => expensesApi.list(queryParams),
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', dateParams],
    queryFn: () => expensesApi.getSummary(dateParams),
  });

  useEffect(() => {
    setPage(1);
  }, [rangeStart, rangeEnd, categoryFilter]);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const pageSize = data?.limit ?? DEFAULT_PAGE_SIZE;
  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(page * pageSize, total);

  const netProfit = summary?.netProfit ?? 0;
  const isProfit = netProfit >= 0;

  const exportExpenses = () => {
    if (!rows.length) {
      toast.error('Nothing to export');
      return;
    }
    downloadCsv(
      `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Date', 'Category', 'Title', 'Vehicle', 'Amount (INR)', 'Notes'],
      rows.map((e) => [
        format(new Date(e.expenseDate), 'MMM dd, yyyy'),
        e.category,
        e.title,
        e.van ? `${e.van.name} (${e.van.vanNumber})` : '—',
        Number(e.amount ?? 0).toFixed(2),
        e.notes ?? '',
      ]),
    );
    toast.success('Export started');
  };

  const columns: Column<Expense>[] = [
    {
      key: 'expenseDate',
      header: 'DATE',
      width: '14%',
      render: (e) => (
        <p className="text-sm font-semibold text-[#212121]">
          {format(new Date(e.expenseDate), 'MMM dd, yyyy')}
        </p>
      ),
    },
    {
      key: 'category',
      header: 'CATEGORY',
      width: '14%',
      align: 'center',
      render: (e) => <CategoryChip category={e.category} />,
    },
    {
      key: 'title',
      header: 'TITLE',
      width: '24%',
      render: (e) => (
        <div>
          <p className="text-sm font-semibold text-[#212121]">{e.title}</p>
          {e.notes && <p className="mt-0.5 text-xs font-medium text-[#9CA3AF]">{e.notes}</p>}
        </div>
      ),
    },
    {
      key: 'van',
      header: 'VEHICLE',
      width: '18%',
      render: (e) => (
        <span className="text-sm font-semibold text-[#212121]">
          {e.van ? `${e.van.name} (${e.van.vanNumber})` : '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'AMOUNT',
      width: '16%',
      align: 'right',
      render: (e) => (
        <span className="text-body-md font-extrabold tabular-nums text-[#212121]">
          {formatINR(Number(e.amount ?? 0))}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'ACTION',
      width: '10%',
      align: 'center',
      render: (e) => (
        <ExpenseActionMenu row={e} onEdit={setEditEntry} onDelete={setDeleteEntry} />
      ),
    },
  ];

  if (isError) {
    return (
      <div className="py-6">
        <PageLoadError title="Could not load expenses" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-sans text-[26px] font-extrabold uppercase leading-tight tracking-tight text-[#212121] sm:text-[28px]">
          Expenses
        </h1>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add Expense
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Expenses"
          value={formatINR(summary?.totalExpenses ?? 0)}
          icon={Receipt}
          colorClass="bg-[#F0FDF4] text-[#16A34A]"
        />
        <StatCard
          title="Company Expenses"
          value={formatINR(summary?.byCategory?.COMPANY ?? 0)}
          icon={Wallet}
          colorClass="bg-[#EFF8FF] text-[#2563EB]"
        />
        <StatCard
          title="Vehicle Expenses"
          value={formatINR(summary?.byCategory?.VEHICLE ?? 0)}
          icon={Truck}
          colorClass="bg-[#FFF4E5] text-[#904D00]"
        />
        <StatCard
          title="Other Expenses"
          value={formatINR(summary?.byCategory?.OTHER ?? 0)}
          icon={Tag}
          colorClass="bg-[#F4F3F1] text-[#57534E]"
        />
        <StatCard
          title="Net Profit"
          value={formatINR(netProfit)}
          icon={isProfit ? TrendingUp : TrendingDown}
          colorClass={isProfit ? 'bg-[#FAF5FF] text-[#9333EA]' : 'bg-[#FDE8EC] text-[#E64566]'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <DateRangePicker
          variant="pill"
          labelFormat="compact"
          placeholder="Select date"
          startDate={rangeStart}
          endDate={rangeEnd}
          onChange={(s, e) => {
            setRangeStart(s);
            setRangeEnd(e);
          }}
        />
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | ExpenseCategory)}
            className="h-10 min-w-[160px] appearance-none rounded-full border border-light-grey bg-white py-2 pl-4 pr-9 text-sm font-semibold text-[#212121] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Filter by category"
          >
            {CATEGORY_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#212121]"
            strokeWidth={2.25}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={exportExpenses}
          className="inline-flex size-10 items-center justify-center rounded-xl border border-[#E9E8E6] bg-white text-[#57534e] transition hover:bg-[#F9F9F9]"
          aria-label="Download CSV"
        >
          <Download className="size-4" strokeWidth={2.25} />
        </button>
      </div>

      {/* Table */}
      <Card
        padding={false}
        className="overflow-visible rounded-none border border-[#E9E8E6] shadow-[0px_20px_50px_rgba(26,28,27,0.05)]"
      >
        {!isLoading && rows.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses found"
            description={
              rangeStart || rangeEnd || categoryFilter !== 'ALL'
                ? 'Try adjusting the date or category filters to see more entries.'
                : 'Company and vehicle expenses recorded here will impact net profit.'
            }
            action={
              <Button type="button" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" /> Add Expense
              </Button>
            }
          />
        ) : (
          <>
            <Table
              variant="damagedEgg"
              columns={columns}
              data={rows}
              keyExtractor={(e) => e.id}
              isLoading={isLoading}
              emptyMessage="No expenses found."
              emptyIcon={<Receipt className="size-10 text-border" />}
            />
            {!isLoading && total > 0 && (
              <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <p className="text-sm text-[#757575]">
                  Showing{' '}
                  <span className="font-semibold text-[#212121]">
                    {rangeFrom}
                    {rangeFrom !== rangeTo ? `-${rangeTo}` : ''}
                  </span>{' '}
                  of <span className="font-semibold text-[#212121]">{total}</span> entries
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

      {/* Add modal */}
      <ExpenseEntryModal open={addOpen} onClose={() => setAddOpen(false)} />

      {/* Edit modal */}
      <ExpenseEntryModal
        open={!!editEntry}
        editEntry={editEntry}
        onClose={() => setEditEntry(null)}
      />

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteEntry}
        onClose={() => !deleteMutation.isPending && setDeleteEntry(null)}
        title="Delete Expense"
        subtitle="This action cannot be undone."
        size="sm"
        className="max-w-[400px] rounded-2xl"
        headerClassName="rounded-t-2xl px-6 py-5"
        bodyClassName="px-6 pb-0 pt-4"
      >
        <p className="text-sm text-[#57534E]">
          Are you sure you want to delete{' '}
          <span className="font-bold text-[#212121]">{deleteEntry?.title}</span> (
          {formatINR(Number(deleteEntry?.amount ?? 0))})?
        </p>
        <div className="-mx-6 mt-5 flex items-center justify-end gap-4 rounded-b-2xl bg-[#F4F3F1] px-6 py-4">
          <button
            type="button"
            onClick={() => setDeleteEntry(null)}
            disabled={deleteMutation.isPending}
            className="text-sm font-bold text-[#212121] transition hover:text-[#57534e] disabled:opacity-50"
          >
            Cancel
          </button>
          <Button
            type="button"
            loading={deleteMutation.isPending}
            onClick={() => deleteEntry && deleteMutation.mutate(deleteEntry.id)}
            className="rounded-[12px] bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-none hover:bg-red-700"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
