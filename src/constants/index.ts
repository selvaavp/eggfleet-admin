// ─── App Routes ───────────────────────────────────────────────────────────────

export const APP_ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  VENDORS: '/vendors',
  VENDOR_DETAIL: (id: string) => `/vendors/${id}` as const,
  INVENTORY: '/inventory',
  /** Damaged eggs ledger (full screen from Inventory) */
  INVENTORY_DAMAGED_EGGS: '/inventory/damaged-eggs',
  ROUTES: '/routes',
  STORES: '/stores',
  VANS: '/vans',
  ASSIGNMENTS: '/assignments',
  EMPLOYEES: '/employees',
  HANDOVERS: '/handovers',
  PAYMENTS: '/payments',
  EXPENSES: '/expenses',
} as const;

// ─── Auth layout (login, forgot password, reset password, success) ───────────

/** Left hero column fill — same as Tailwind `colors.auth.hero` / class `bg-auth-hero` */
export const AUTH_LEFT_PANEL_BG = 'rgba(254, 113, 2, 0.2)' as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

// ─── Status Labels ────────────────────────────────────────────────────────────

/** Backend enum values */
export const HANDOVER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/** Admin “UPI & handover” screen copy (matches product / Figma wording). */
export const HANDOVER_UI_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Verified',
  REJECTED: 'Discrepancy',
};

export const VAN_ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const VENDOR_PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIAL: 'Partial',
};

// ─── Select Options ───────────────────────────────────────────────────────────

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
] as const;

export const DAMAGE_REASON_OPTIONS = [
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'LOADING', label: 'Loading' },
  { value: 'UNLOADING', label: 'Unloading' },
  { value: 'STORAGE', label: 'Storage' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const HANDOVER_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

export const VAN_ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'PENDING', label: 'Pending' },
] as const;

export const DRIVER_PAYMENT_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

// ─── Badge Variants ───────────────────────────────────────────────────────────

export const HANDOVER_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export const VAN_ASSIGNMENT_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  ACTIVE: 'success',
  INACTIVE: 'muted',
  PENDING: 'warning',
};

export const PAYMENT_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
};

export const VENDOR_PAYMENT_STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  PENDING: 'warning',
  PAID: 'success',
  PARTIAL: 'info',
};

// ─── Local Storage Keys ───────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  AUTH: 'eggfleet_admin_auth',
} as const;
