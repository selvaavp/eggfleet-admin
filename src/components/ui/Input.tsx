import { forwardRef, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Override default label styling (e.g. auth screens use sentence case + brand colors). */
  labelClassName?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** When true, only numeric digits (0-9) are accepted. Automatically sets inputMode="numeric". */
  onlyDigits?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelClassName, error, leftIcon, rightIcon, className, id, onlyDigits, onKeyDown, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (onlyDigits) {
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (!allowed.includes(e.key) && !/^\d$/.test(e.key) && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
        }
      }
      onKeyDown?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={
              labelClassName ??
              'block text-xs font-semibold uppercase tracking-[0.08em] text-muted mb-2'
            }
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            inputMode={onlyDigits ? 'numeric' : props.inputMode}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full rounded-md bg-surface border border-border px-3 py-2.5 text-sm font-medium text-dark placeholder:text-disabled placeholder:font-normal',
              'focus:outline-none focus:ring-2 focus:ring-[rgba(144,77,0,0.20)] focus:border-primary transition',
              'disabled:opacity-50 disabled:bg-neutral-100',
              error && 'border-danger focus:ring-danger/30',
              className,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
            )}
            {...props}
          />
          {rightIcon && (
            <span className="absolute inset-y-0 right-3 flex items-center text-muted">
              {rightIcon}
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

