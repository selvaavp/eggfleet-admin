import { cn } from '@/lib/utils';
import { TableSkeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Ledger tables: fixed column widths for header/body alignment */
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor?: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  isLoading?: boolean;
  /** Figma ledger: #f4f3f1 header, striped body, rgba borders */
  /** Figma van status: white header row, light dividers, no striping */
  variant?:
    | 'default'
    | 'ledger'
    | 'vanStatus'
    | 'employee'
    | 'vendor'
    | 'customer'
    | 'storeLedger'
    | 'inventory'
    | 'damagedEgg';
}

export function Table<T extends object>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  className,
  emptyMessage = 'No data found',
  emptyIcon,
  isLoading,
  variant = 'default',
}: TableProps<T>) {
  /** Store / vendor directory tables — Figma soft header, no row dividers */
  const isDirectoryTable = variant === 'customer' || variant === 'vendor';
  const isEdgePaddedTable = variant === 'employee' || isDirectoryTable;
  const isStoreLedger = variant === 'storeLedger';
  const isInventoryTable = variant === 'inventory';
  const isDamagedEggTable = variant === 'damagedEgg';
  const isLedgerStyleTable = isInventoryTable || isDamagedEggTable;
  const useFixedLayout = variant === 'ledger' || isEdgePaddedTable || isStoreLedger || isLedgerStyleTable;
  const alignClass = (align: Column<T>['align']) => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const edgePaddedCell = (colIndex: number, edge: 'head' | 'body') => {
    const last = columns.length - 1;
    const py = edge === 'head' ? 'py-4' : 'py-4';
    if (colIndex === 0) return cn('pl-16 pr-4', py);
    if (colIndex === last) return cn('pl-4 pr-16', py);
    return cn('px-6', py);
  };

  const getKey =
    keyExtractor ??
    ((row: T) => {
      const r = row as Record<string, unknown>;
      return String(r.id ?? r.assignmentId ?? Math.random());
    });
  return (
    <div className={cn('overflow-x-auto overflow-y-visible', className)}>
      <table className={cn('w-full text-sm', useFixedLayout && 'table-fixed')}>
        {useFixedLayout && columns.some((col) => col.width) && (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.width ? { width: col.width } : undefined} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr
            className={cn(
              variant === 'ledger'
                ? 'border-b border-[rgba(26,28,27,0.2)]'
                : isStoreLedger
                  ? 'border-y border-[#E0DEDC]'
                  : isDirectoryTable
                    ? ''
                    : variant === 'vanStatus' || isEdgePaddedTable || isLedgerStyleTable
                      ? 'border-b border-[#E9E8E6]'
                      : 'border-b border-border'
            )}
          >
            {columns.map((col, colIndex) => (
              <th
                key={col.key}
                className={cn(
                  isDirectoryTable
                    ? cn(
                        'bg-[#F4F3F180] text-body-sm font-bold uppercase tracking-[0.06em] text-[#78716C]',
                        edgePaddedCell(colIndex, 'head'),
                      )
                    : isEdgePaddedTable
                      ? cn(
                          'bg-[#F9F9F9] text-body-sm font-bold uppercase tracking-[0.06em] text-taupe',
                          edgePaddedCell(colIndex, 'head'),
                        )
                      : isStoreLedger
                      ? 'bg-[#A8A29E]/[0.32] px-6 py-4 text-sm font-semibold uppercase tracking-[0.1em] text-taupe/70'
                      : isLedgerStyleTable
                        ? 'bg-[#E8E2D9] px-6 py-4 text-body-sm font-bold uppercase tracking-[0.08em] text-taupe'
                        : variant === 'ledger'
                        ? 'bg-neutral-100 px-6 py-4 text-body-sm font-medium uppercase tracking-[0.06em] text-[#212121]'
                        : variant === 'vanStatus'
                        ? 'bg-[#F9F9F9] px-6 py-3.5 text-left text-body-sm font-medium uppercase tracking-[0.06em] text-[#212121]'
                        : 'bg-neutral-50/80 py-3.5 px-4 text-left text-xs font-bold uppercase tracking-wide text-muted',
                  'whitespace-nowrap',
                  alignClass(col.align),
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={6} cols={columns.length} variant={variant} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-muted">
                <div className="flex flex-col items-center gap-2">
                  {emptyIcon}
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={getKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  variant === 'ledger'
                    ? 'border-b border-[rgba(26,28,27,0.2)] last:border-0'
                    : isDirectoryTable
                      ? 'bg-white'
                      : variant === 'vanStatus' || isEdgePaddedTable || isStoreLedger || isLedgerStyleTable
                        ? 'border-b border-[#E9E8E6] last:border-0 bg-white'
                        : 'border-b border-border last:border-0',
                  onRowClick && 'cursor-pointer hover:bg-neutral-50 transition-colors'
                )}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key}
                    className={cn(
                      isEdgePaddedTable
                        ? cn('text-sm text-dark', edgePaddedCell(colIndex, 'body'))
                        : isStoreLedger
                          ? 'bg-white px-6 py-5 text-body-md text-dark'
                          : isLedgerStyleTable
                            ? 'bg-white px-6 py-5 text-sm text-dark'
                          : variant === 'ledger'
                            ? 'px-6 py-5 text-sm font-medium text-dark'
                            : variant === 'vanStatus'
                            ? 'px-6 py-4 text-sm text-dark'
                            : 'py-3.5 px-4 text-sm font-medium text-dark',
                      alignClass(col.align),
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
