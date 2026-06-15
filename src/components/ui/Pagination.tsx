import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Page indices to show: up to 5 full sequence, otherwise a 3-page sliding window. */
function visiblePageNumbers(page: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const start = Math.min(Math.max(1, page - 1), totalPages - 2);
  return [start, start + 1, start + 2].filter((n) => n >= 1 && n <= totalPages);
}

const btnBase =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:pointer-events-none';

const btnIdle =
  'border-light-grey bg-white text-[#57534e] hover:bg-stone-50/80 disabled:opacity-40';
const btnActive = 'border-primary bg-primary text-white';

export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  const tp = Number(totalPages);
  if (!Number.isFinite(tp) || tp <= 1) return null;

  const current = Math.min(Math.max(1, page), tp);
  const pages = visiblePageNumbers(current, tp);

  return (
    <div className={cn('flex items-center justify-end gap-1.5 pt-4', className)}>
      <button
        type="button"
        aria-label="Previous page"
        onClick={() => onPageChange(current - 1)}
        disabled={current <= 1}
        className={cn(btnBase, btnIdle)}
      >
        <ChevronLeft className="size-4" strokeWidth={2.25} />
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Page ${n}`}
          aria-current={n === current ? 'page' : undefined}
          onClick={() => onPageChange(n)}
          className={cn(btnBase, n === current ? btnActive : btnIdle)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        aria-label="Next page"
        onClick={() => onPageChange(current + 1)}
        disabled={current >= tp}
        className={cn(btnBase, btnIdle)}
      >
        <ChevronRight className="size-4" strokeWidth={2.25} />
      </button>
    </div>
  );
}
