import { cn } from '@/lib/utils';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'ledgerExport'
  | 'ledgerView';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-btn hover:bg-primary-dark active:scale-[0.98] disabled:opacity-50',
  secondary:
    'bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]',
  outline:
    'border border-border text-dark bg-surface hover:bg-neutral-100 active:scale-[0.98]',
  /** Transaction ledger toolbar — no border, soft gray pill */
  ledgerExport:
    'border-0 bg-[#F5F5F4] text-[#57534e] font-bold shadow-none hover:bg-[#EEEDEB] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/25',
  /** Transaction ledger row action — cream pill, taupe label, no border/ring */
  ledgerView:
    'min-w-[5.25rem] border-0 bg-[#FF8C001A] font-bold leading-tight text-[#904D00] shadow-none ring-0 hover:bg-[#FFF0E5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/25',
  ghost:
    'text-muted hover:bg-neutral-100 hover:text-dark',
  danger:
    'bg-danger text-white hover:opacity-90 active:scale-[0.98]',
};

const sizeClass: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs rounded-xs',
  sm: 'px-3.5 py-1.5 text-sm rounded-sm',
  md: 'px-4 py-2 text-base rounded',
  lg: 'px-5 py-2.5 text-[15px] font-bold rounded-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, isLoading, leftIcon, className, children, disabled, ...props }, ref) => {
    const isSpinning = loading || isLoading;
    return (
      <button
        ref={ref}
        disabled={disabled || isSpinning}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer',
          variantClass[variant],
          sizeClass[size],
          className
        )}
        {...props}
      >
        {isSpinning && (
          <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        )}
        {!isSpinning && leftIcon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
