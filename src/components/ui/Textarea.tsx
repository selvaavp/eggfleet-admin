import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, labelClassName, error, className, id, rows = 3, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
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
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'w-full rounded-md bg-surface border border-border px-3 py-2.5 text-sm font-medium text-dark placeholder:text-disabled placeholder:font-normal resize-none',
            'focus:outline-none focus:ring-2 focus:ring-[rgba(144,77,0,0.20)] focus:border-primary transition',
            'disabled:opacity-50 disabled:bg-neutral-100',
            error && 'border-danger focus:ring-danger/30',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
