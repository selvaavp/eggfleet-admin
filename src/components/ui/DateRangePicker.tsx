import { forwardRef, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DateRangePickerVariant = 'default' | 'pill';

function formatRangeLabel(
  start: Date | null,
  end: Date | null,
  labelFormat: 'default' | 'compact',
): string {
  if (start && end) {
    if (labelFormat === 'compact') {
      const sameYear = start.getFullYear() === end.getFullYear();
      if (sameYear) {
        return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
      }
      return `${format(start, 'MMM dd, yyyy')} - ${format(end, 'MMM dd, yyyy')}`;
    }
    return `${format(start, 'dd MMM yyyy')} – ${format(end, 'dd MMM yyyy')}`;
  }
  if (start) {
    const partial =
      labelFormat === 'compact'
        ? format(start, 'MMM dd, yyyy')
        : format(start, 'dd MMM yyyy');
    return `${partial} – Select end date`;
  }
  return '';
}

/** Ignores react-datepicker's `value` prop so partial range text never shows in the trigger. */
const RangeTrigger = forwardRef<
  HTMLButtonElement,
  {
    displayValue: string;
    emptyLabel: string;
    variant: DateRangePickerVariant;
    onClick?: () => void;
    value?: string;
  }
>(({ displayValue, emptyLabel, variant, onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className={cn(
      'eggfleet-vendor-date-trigger inline-flex h-10 items-center gap-2 bg-white text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
      variant === 'pill'
        ? 'min-w-[220px] rounded-full border border-light-grey px-4 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] hover:border-primary/40'
        : 'w-[280px] rounded-[12px] border border-[#E9E8E6] hover:border-primary/40 focus-visible:border-primary/60',
    )}
  >
    <Calendar className="size-4 shrink-0 text-[#904D00]" aria-hidden />
    <span
      className={cn(
        'min-w-0 flex-1 truncate text-left',
        displayValue ? 'text-[#212121]' : 'text-[#777777]',
      )}
    >
      {displayValue || emptyLabel}
    </span>
    <ChevronDown className="size-4 shrink-0 text-[#212121]" strokeWidth={2.25} aria-hidden />
  </button>
));
RangeTrigger.displayName = 'RangeTrigger';

export interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  className?: string;
  maxDate?: Date;
  placeholder?: string;
  variant?: DateRangePickerVariant;
  labelFormat?: 'default' | 'compact';
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  className,
  maxDate = new Date(),
  placeholder = 'Select Date Range',
  variant = 'default',
  labelFormat = 'default',
}: DateRangePickerProps) {
  const displayValue = useMemo(
    () => formatRangeLabel(startDate, endDate, labelFormat),
    [startDate, endDate, labelFormat],
  );

  return (
    <div className={cn('eggfleet-vendor-date-range shrink-0', className)}>
      <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={(update) => {
          const [s, e] = update as [Date | null, Date | null];
          onChange(s, e);
        }}
        monthsShown={2}
        swapRange
        maxDate={maxDate}
        disabledKeyboardNavigation
        focusSelectedMonth={false}
        openToDate={endDate ?? startDate ?? undefined}
        calendarClassName="eggfleet-range-calendar"
        customInput={
          <RangeTrigger displayValue={displayValue} emptyLabel={placeholder} variant={variant} />
        }
        popperClassName="eggfleet-datepicker-popper eggfleet-vendor-date-popper eggfleet-range-popper"
        popperPlacement="bottom-end"
        popperProps={{ strategy: 'fixed' }}
        showPopperArrow={false}
        preventOpenOnFocus
      />
    </div>
  );
}
