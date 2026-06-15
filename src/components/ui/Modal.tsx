import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleIcon?: React.ReactNode;
  /** Rendered beside the close control (e.g. header warning badge). */
  headerEnd?: React.ReactNode;
  /** Hide the header X close button (e.g. footer Cancel only). */
  hideCloseButton?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

const shellClass =
  'relative w-full overflow-hidden rounded-[12px] bg-surface shadow-panel';

export function Modal({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  titleIcon,
  headerEnd,
  hideCloseButton = false,
  children,
  className,
  bodyClassName,
  headerClassName,
  size = 'md',
}: ModalProps) {
  const isVisible = open ?? isOpen ?? false;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isVisible) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className={cn(shellClass, sizeClass[size], className)}>
        <div
          className={cn(
            'flex items-start justify-between gap-4 rounded-t-[12px] border-b border-[#E9E8E6] bg-white px-6 py-5',
            headerClassName
          )}
        >
          <div className="flex min-w-0 items-start gap-3">
            {titleIcon}
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#1a1c1b]">{title}</h2>
              {subtitle && (
                <p className="mt-1 text-sm font-medium text-[#777777]">{subtitle}</p>
              )}
            </div>
          </div>
          {(headerEnd || !hideCloseButton) && (
            <div className="flex shrink-0 items-center gap-2">
              {headerEnd}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-neutral-100 hover:text-dark"
                  aria-label="Close"
                >
                  <X className="size-5" />
                </button>
              )}
            </div>
          )}
        </div>
        <div className={cn('max-h-[75vh] overflow-y-auto p-6 pt-4', bodyClassName)}>{children}</div>
      </div>
    </div>
  );
}
