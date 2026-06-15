import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  colorClass?: string;
  className?: string;
}

/** Shared shell for dashboard metric cards — Figma: white, tan border, soft shadow. */
export const statCardShellClass =
  'rounded-2xl border border-primary bg-white p-6 shadow-[0px_2px_12px_rgba(26,28,27,0.04)]';

/** Figma layout: icon → label → value, stacked vertically. */
export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  colorClass = 'bg-[#FFF4E5] text-[#904D00]',
  className,
}: StatCardProps) {
  return (
    <div className={cn(statCardShellClass, className)}>
      <span
        className={cn(
          'inline-flex size-11 items-center justify-center rounded-xl',
          colorClass
        )}
      >
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#777777]">
        {title}
      </p>
      <p className="mt-2 font-sans text-[32px] font-black tabular-nums leading-none tracking-tight text-[#212121] sm:text-[36px]">
        {value}
      </p>
      {trend && (
        <p className={cn('mt-2 text-xs', trend.value >= 0 ? 'text-success' : 'text-danger')}>
          {trend.value >= 0 ? '+' : ''}
          {trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}
