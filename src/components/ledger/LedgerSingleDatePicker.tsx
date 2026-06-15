import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const DateTrigger = forwardRef<
  HTMLButtonElement,
  { value?: string; onClick?: () => void; placeholder?: string }
>(({ value, onClick, placeholder = 'Select date' }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={onClick}
    className="inline-flex h-10 min-w-[180px] items-center gap-2 rounded-full border border-light-grey bg-white px-4 text-sm font-semibold text-[#212121] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
  >
    <Calendar className="size-4 shrink-0 text-[#904D00]" aria-hidden />
    <span className={cn('min-w-0 flex-1 truncate text-left', !value && 'text-[#777777]')}>
      {value || placeholder}
    </span>
    <ChevronDown className="size-4 shrink-0 text-[#212121]" strokeWidth={2.25} aria-hidden />
  </button>
));
DateTrigger.displayName = 'LedgerDateTrigger';

type LedgerSingleDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
};

export function LedgerSingleDatePicker({ value, onChange, className }: LedgerSingleDatePickerProps) {
  const parsed = value ? parseISO(value) : null;
  const selected = parsed && isValid(parsed) ? parsed : null;
  const display = selected ? format(selected, 'MMM dd, yyyy') : '';

  return (
    <div className={className}>
      <DatePicker
        selected={selected}
        onChange={(d: Date | null) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
        dateFormat="MMM dd, yyyy"
        isClearable
        customInput={<DateTrigger value={display} placeholder="Select date" />}
      />
    </div>
  );
}
