import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Controller } from 'react-hook-form';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  labelClassName?: string;
  error?: string;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  className?: string;
  /** Display format on trigger and in calendar */
  dateFormat?: string;
  /** `filled` — gray pill used in modals */
  variant?: 'default' | 'filled';
  popperPlacement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
};

function parseDateString(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const s = String(value);
  try {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/** Used as react-datepicker customInput — must forward ref */
const DateTrigger = forwardRef<
  HTMLButtonElement,
  {
    value?: string;
    onClick?: () => void;
    error?: boolean;
    placeholder?: string;
    variant?: 'default' | 'filled';
  }
>(({ value, onClick, error, placeholder, variant = 'default' }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={cn(
      'flex w-full items-center justify-between gap-2 text-left text-sm font-medium transition focus:outline-none',
      variant === 'filled'
        ? cn(
            'h-12 rounded-xl bg-[#F5F5F4] px-4 text-[#212121] focus:ring-2 focus:ring-primary/20',
            error && 'ring-2 ring-danger/30',
          )
        : cn(
            'rounded-lg border bg-white px-3 py-2.5 text-dark shadow-sm focus:ring-2 focus:ring-primary/25',
            error ? 'border-red-500 focus:ring-red-200' : 'border-border hover:border-border-strong',
          ),
    )}
  >
    <span className={cn('flex-1', !value && variant === 'default' && 'text-muted')}>
      {value || placeholder || 'Select date'}
    </span>
    <Calendar
      className={cn('size-4 shrink-0', variant === 'filled' ? 'text-taupe' : 'text-muted')}
      strokeWidth={variant === 'filled' ? 2 : undefined}
      aria-hidden
    />
  </button>
));
DateTrigger.displayName = 'DateTrigger';

export function DatePickerField<T extends FieldValues>({
  control,
  name,
  label,
  labelClassName,
  error,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled,
  className,
  dateFormat = 'dd/MM/yyyy',
  variant = 'default',
  popperPlacement = 'bottom-start',
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const selected = parseDateString(field.value);
        return (
          <div className={cn('eggfleet-datepicker-field w-full', className)}>
            {label && (
              <label
                className={cn(
                  'mb-2 block text-sm font-semibold text-taupe',
                  labelClassName,
                )}
              >
                {label}
              </label>
            )}
            <DatePicker
              selected={selected}
              onChange={(date: Date | null) => {
                field.onChange(date ? format(date, 'yyyy-MM-dd') : '');
              }}
              dateFormat={dateFormat}
              minDate={minDate}
              maxDate={maxDate}
              disabled={disabled}
              placeholderText={placeholder}
              customInput={
                <DateTrigger error={!!error} placeholder={placeholder} variant={variant} />
              }
              popperClassName="eggfleet-datepicker-popper"
              popperPlacement={popperPlacement}
              showPopperArrow={false}
              popperProps={{ strategy: 'fixed' }}
            />
            {error && <p className="mt-1 text-xs font-medium text-danger">{error}</p>}
          </div>
        );
      }}
    />
  );
}
