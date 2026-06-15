import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Download, ScrollText } from 'lucide-react';
import { paymentsApi } from '@/api/payments.api';
import { Button, Card, Table, Pagination, PageLoadError, type Column } from '@/components/ui';
import { DEFAULT_PAGE_SIZE } from '@/constants';
import { downloadCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import {
  TRANSACTION_LEDGER_QUERY_KEY,
  buildTransactionLedgerCsvRows,
  formatLedgerAmount,
  formatLedgerVanLabel,
  initialsFromName,
  ledgerRowDateTime,
  LedgerPaymentStatus,
} from '@/lib/transaction-ledger';
import type { DriverPayment } from '@/types';

export type TransactionLedgerSectionProps = {
  activeRoutes: number;
  onViewDetails: (payment: DriverPayment) => void;
  pageSize?: number;
  /** Extra query key segment (e.g. dashboard month) to refetch when filters change */
  queryKeySuffix?: unknown;
  className?: string;
  cardClassName?: string;
  emptyMessage?: string;
};

function buildColumns(onViewDetails: (row: DriverPayment) => void): Column<DriverPayment>[] {
  return [
    {
      key: 'createdAt',
      header: 'Date & time',
      width: '14%',
      render: (row) => {
        const { date, time } = ledgerRowDateTime(row);
        return (
          <div>
            <p className="font-bold leading-snug text-[#212121]">{date}</p>
            <p className="mt-0.5 text-xs font-medium text-[#777777]">{time}</p>
          </div>
        );
      },
    },
    {
      key: 'store',
      header: 'Store details',
      width: '17%',
      render: (row) => (
        <p className="font-bold text-[#212121]">{row.store?.name ?? '—'}</p>
      ),
    },
    {
      key: 'employeeVan',
      header: (
        <div className="flex items-center justify-center gap-3">
          <span className="size-8 shrink-0" aria-hidden />
          <span>Employee / van</span>
        </div>
      ),
      width: '24%',
      align: 'center',
      render: (row) => {
        const name = row.driver?.name ?? '—';
        const vanNo =
          row.vanAssignment?.van?.vanNumber ?? row.vanAssignment?.van?.registrationNumber;
        return (
          <div className="flex items-center justify-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#E9E8E6] text-[10px] font-bold text-[#78716c]">
              {initialsFromName(name)}
            </div>
            <div className="text-left">
              <p className="font-bold leading-tight text-[#212121]">{name}</p>
              <p className="mt-0.5 text-xs font-medium text-[#777777]">
                {formatLedgerVanLabel(vanNo)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '11%',
      align: 'center',
      render: (row) => (
        <span className="font-bold text-[#904D00]">{formatLedgerAmount(row.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Method',
      width: '12%',
      align: 'center',
      render: (row) => (
        <div className="flex justify-center">
          <span className="inline-flex rounded-full bg-[#F5F5F4] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#57534e]">
            {(row.paymentMethod ?? 'UPI').replace(/_/g, ' ')}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: (
        <div className="flex items-center justify-center gap-2">
          <span className="size-2 shrink-0" aria-hidden />
          <span>Status</span>
        </div>
      ),
      width: '12%',
      align: 'center',
      render: (row) => <LedgerPaymentStatus status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      align: 'center',
      render: (row) => (
        <div className="flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="ledgerView"
            className="rounded-xl px-3.5 py-2 text-xs"
            onClick={() => onViewDetails(row)}
          >
            <span className="flex flex-col items-center gap-0.5">
              <span>View</span>
              <span>Details</span>
            </span>
          </Button>
        </div>
      ),
    },
  ];
}

export function TransactionLedgerSection({
  activeRoutes,
  onViewDetails,
  pageSize = DEFAULT_PAGE_SIZE,
  queryKeySuffix,
  className,
  cardClassName,
  emptyMessage = 'No payments in the ledger.',
}: TransactionLedgerSectionProps) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [queryKeySuffix, pageSize]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [TRANSACTION_LEDGER_QUERY_KEY, page, pageSize, queryKeySuffix],
    queryFn: () => paymentsApi.listDriverPayments({ page, limit: pageSize }),
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? pageSize;
  const totalPages =
    data?.totalPages ?? Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const rangeFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeTo = Math.min(page * limit, total);

  const columns = useMemo(() => buildColumns(onViewDetails), [onViewDetails]);

  const exportLedger = () => {
    if (!rows.length) {
      toast.error('Nothing to export');
      return;
    }
    downloadCsv(
      `transaction-ledger-${format(new Date(), 'yyyy-MM-dd')}`,
      ['Date & time', 'Store details', 'Employee', 'Van', 'Amount (INR)', 'Method', 'Status'],
      buildTransactionLedgerCsvRows(rows),
    );
    toast.success('Export started');
  };

  if (isError) {
    return <PageLoadError title="Could not load transaction ledger" />;
  }

  return (
    <Card
      padding={false}
      className={cn(
        'overflow-hidden rounded-none border-0 shadow-[0px_20px_50px_rgba(26,28,27,0.05)]',
        cardClassName,
        className,
      )}
    >
      <div className="flex flex-col gap-4 border-b border-[#E9E8E6] bg-white px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-extrabold tracking-tight text-[#1a1c1b]">
            Transaction Ledger
          </h2>
          <p className="mt-1 text-[13px] leading-snug text-taupe">
            Reviewing delivery collections from {activeRoutes} active routes
          </p>
        </div>
        <Button
          type="button"
          variant="ledgerExport"
          size="sm"
          className="shrink-0 rounded-md px-4"
          leftIcon={<Download className="size-4 shrink-0" />}
          onClick={exportLedger}
        >
          Export CSV
        </Button>
      </div>
      <Table
        variant="ledger"
        columns={columns}
        data={rows}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        emptyIcon={<ScrollText className="size-10 text-border" />}
      />
      {!isLoading && total > 0 && (
        <div className="flex flex-col gap-3 border-t border-[#E9E8E6] bg-[#FAFAF980] px-8 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#777777]">
            Showing <span className="font-semibold text-[#212121]">{rangeFrom}</span> to{' '}
            <span className="font-semibold text-[#212121]">{rangeTo}</span> of{' '}
            <span className="font-semibold text-[#212121]">{total}</span> payments
          </p>
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} className="pt-0" />
          )}
        </div>
      )}
    </Card>
  );
}
