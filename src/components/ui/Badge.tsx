import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  muted: 'bg-neutral-100 text-muted',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClass[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Helpers for common statuses
export function statusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: 'success',
    COMPLETED: 'success',
    PAID: 'success',
    APPROVED: 'success',
    REJECTED: 'danger',
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    PARTIAL: 'warning',
    INACTIVE: 'muted',
    DISPUTED: 'danger',
    FAILED: 'danger',
  };
  return map[status] ?? 'default';
}
