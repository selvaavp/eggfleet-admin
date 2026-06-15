import type { LucideIcon } from 'lucide-react';
import { PackageOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title = 'Nothing here yet',
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="size-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold font-display text-dark mb-1">{title}</h3>
      {description && <p className="text-sm text-muted max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
