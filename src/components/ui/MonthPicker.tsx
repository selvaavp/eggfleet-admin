import { forwardRef, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Must forward ref + accept props react-datepicker passes (value, onClick, disabled). */
const MonthTrigger = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<'button'> & { value?: string }
>(({ value, onClick, disabled, className, ...rest }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    disabled={disabled}
    {...rest}
    className={cn(
      'inline-flex min-w-[190px] items-center gap-3 rounded-full border border-light-grey bg-white px-4 py-2.5 text-left text-sm font-bold text-[#212121] shadow-sm transition',
      'hover:border-primary/45 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/35',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
  >
    <Calendar className="size-[18px] shrink-0 text-muted" strokeWidth={2} aria-hidden />
    <span className="min-w-0 flex-1 truncate text-center tabular-nums">
      {value?.trim() || 'Select period'}
    </span>
    <ChevronDown className="size-[18px] shrink-0 text-[#212121]" strokeWidth={2.25} aria-hidden />
  </button>
));
MonthTrigger.displayName = 'MonthTrigger';

interface MonthPickerProps {
  className?: string;
  /** Controlled initial month */
  initialMonth?: Date;
  onChange?: (monthStart: Date) => void;
}

/**
 * Dashboard / reports — month + year via react-datepicker (not native `<input type="month">`).
 * Popper uses high z-index so the calendar appears above the sticky header.
 */
export function MonthPicker({ className, initialMonth, onChange }: MonthPickerProps) {
  const [selected, setSelected] = useState<Date>(() => initialMonth ?? new Date());

  useEffect(() => {
    if (initialMonth) setSelected(initialMonth);
  }, [initialMonth]);

  return (
    <div className={cn('relative z-[60]', className)}>
      <DatePicker
        selected={selected}
        onChange={(date: Date | null) => {
          if (!date) return;
          setSelected(date);
          onChange?.(date);
        }}
        showMonthYearPicker
        showFullMonthYearPicker
        /** 4×3 grid — pairs with CSS `repeat(4, …)` for aligned layout */
        showFourColumnMonthYearPicker
        dateFormat="MMM, yyyy"
        calendarStartDay={1}
        customInput={<MonthTrigger />}
        popperPlacement="bottom-end"
        popperClassName="eggfleet-month-popper"
        calendarClassName="eggfleet-month-calendar"
        showPopperArrow={false}
        shouldCloseOnSelect
        aria-label="Select reporting month"
        placeholderText={format(new Date(), 'MMM, yyyy')}
      />
    </div>
  );
}
