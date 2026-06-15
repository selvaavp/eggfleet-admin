import type { ReactNode } from 'react';
import { Truck, Store as StoreIcon } from 'lucide-react';
import { Table, Pagination, type Column } from '@/components/ui';
import { formatINR } from '@/lib/format';
import {
  ROUTE_ACTIVITY_LEDGER_CARD_CLASS,
  LedgerSummaryStat,
  type RouteActivityLedgerSummary,
} from '@/lib/route-activity-ledger';
import { cn } from '@/lib/utils';

export type RouteActivityLedgerSubtitle =
  | { kind: 'van'; label: string }
  | { kind: 'store'; label: string };

export type RouteActivityLedgerProps<TRow extends { id: string }> = {
  subtitle: RouteActivityLedgerSubtitle;
  summary: RouteActivityLedgerSummary;
  columns: Column<TRow>[];
  data: TRow[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  page: number;
  totalPages: number;
  total: number;
  rangeFrom: number;
  rangeTo: number;
  onPageChange: (page: number) => void;
  filtersSlot?: ReactNode;
  className?: string;
};

export function RouteActivityLedger<TRow extends { id: string }>({
  subtitle,
  summary,
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No deliveries found for this period.',
  emptyIcon,
  page,
  totalPages,
  total,
  rangeFrom,
  rangeTo,
  onPageChange,
  filtersSlot,
  className,
}: RouteActivityLedgerProps<TRow>) {
  const SubtitleIcon = subtitle.kind === 'store' ? StoreIcon : Truck;
  const subtitleText =
    subtitle.kind === 'van' ? `Van: ${subtitle.label}` : `Store: ${subtitle.label}`;

  return (
    <div className={cn(ROUTE_ACTIVITY_LEDGER_CARD_CLASS, className)}>
      <div className="border-b border-[#E9E8E6] px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[22px] font-extrabold leading-tight text-[#212121]">
              Route Activity Ledger
            </h2>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-[#904D00]">
              <SubtitleIcon className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
              {subtitleText}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-5 sm:gap-6 lg:gap-8">
            <LedgerSummaryStat
              label="Collected"
              value={formatINR(summary.collected, { fractionDigits: 0 })}
              valueClassName="text-[#904D00]"
            />
            <div className="hidden h-10 w-px shrink-0 bg-[#E9E8E6] sm:block" aria-hidden />
            <LedgerSummaryStat
              label="UPI"
              value={formatINR(summary.upi, { fractionDigits: 0 })}
              valueClassName="text-blue-600"
            />
            <LedgerSummaryStat
              label="Partial"
              value={formatINR(summary.partial, { fractionDigits: 0 })}
              valueClassName="text-[#904D00]"
            />
            <LedgerSummaryStat
              label="Pending"
              value={formatINR(summary.pending, { fractionDigits: 0 })}
              valueClassName="text-red-600"
            />
          </div>
        </div>
      </div>

      {filtersSlot ? (
        <div className="border-b border-[#E9E8E6] px-6 py-4 sm:px-8">{filtersSlot}</div>
      ) : null}

      <Table
        variant="storeLedger"
        columns={columns}
        data={data}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        emptyIcon={emptyIcon}
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
              onPageChange={onPageChange}
              className="pt-0"
            />
          )}
        </div>
      )}
    </div>
  );
}
