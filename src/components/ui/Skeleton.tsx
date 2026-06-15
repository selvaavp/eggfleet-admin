import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-gray-200',
        className
      )}
    />
  );
}

/** Renders N skeleton table rows each with `cols` columns of skeleton bars. */
export function TableSkeleton({
  rows = 6,
  cols = 4,
  variant = 'default',
}: {
  rows?: number;
  cols?: number;
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
}) {
  const cellPad = (colIdx: number) => {
    if (
      variant === 'ledger' ||
      variant === 'storeLedger' ||
      variant === 'inventory' ||
      variant === 'damagedEgg'
    ) {
      return 'px-6 py-5';
    }
    if (variant === 'employee' || variant === 'vendor' || variant === 'customer') {
      if (colIdx === 0) return 'pl-16 pr-4 py-4';
      if (colIdx === cols - 1) return 'pl-4 pr-16 py-4';
      return 'px-6 py-4';
    }
    if (variant === 'vanStatus') return 'px-6 py-4';
    return 'px-4 py-3.5';
  };

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr
          key={rowIdx}
          className={
            variant === 'customer' || variant === 'vendor' ? 'bg-white' : 'border-b border-border'
          }
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className={cellPad(colIdx)}>
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
