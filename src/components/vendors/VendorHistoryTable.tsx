import { PageLoader, Pagination } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface VendorHistoryColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface VendorHistoryTableProps<T> {
  title: string;
  columns: VendorHistoryColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  /** Tailwind grid template e.g. `grid-cols-[1.4fr_1.2fr_0.7fr_0.8fr_0.8fr]` */
  gridClassName: string;
  isLoading?: boolean;
  emptyMessage?: string;
  headerAction?: React.ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

function alignClass(align?: VendorHistoryColumn<unknown>['align']) {
  if (align === 'right') return 'text-right justify-self-end';
  if (align === 'center') return 'text-center justify-self-center';
  return 'text-left';
}

export function VendorHistoryTable<T>({
  title,
  columns,
  data,
  keyExtractor,
  gridClassName,
  isLoading = false,
  emptyMessage = 'No records in this period',
  headerAction,
  page = 1,
  totalPages = 1,
  onPageChange,
}: VendorHistoryTableProps<T>) {
  return (
    <section className="overflow-hidden border border-primary bg-[#F4F3F1] shadow-[0px_2px_12px_rgba(26,28,27,0.04)]">
      <div className="flex items-center justify-between border-b border-primary/25 px-6 py-4">
        <h2 className="text-lg font-extrabold text-[#212121]">{title}</h2>
        {headerAction}
      </div>

      <div className="p-4">
        <div
          className={cn(
            'mb-3 hidden gap-3 px-3 sm:grid',
            gridClassName,
          )}
          aria-hidden
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                'text-xs font-bold uppercase tracking-[0.06em] text-[#777777]',
                alignClass(col.align),
              )}
            >
              {col.header}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <PageLoader />
          </div>
        ) : data.length === 0 ? (
          <p className="bg-white px-4 py-12 text-center text-sm font-medium text-[#777777]">
            {emptyMessage}
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((row) => (
              <li
                key={keyExtractor(row)}
                className={cn(
                  'grid items-center gap-3 bg-white px-4 py-4 sm:px-5',
                  gridClassName,
                )}
              >
                {columns.map((col) => (
                  <div key={col.key} className={cn('min-w-0', alignClass(col.align))}>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#777777] sm:hidden">
                      {col.header}
                    </p>
                    {col.render(row)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}

        {!isLoading && data.length > 0 && onPageChange && (
          <div className="mt-4 px-1">
            <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
          </div>
        )}
      </div>
    </section>
  );
}
