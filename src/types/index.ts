// ─── Generic API types ────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateFilterParams {
  startDate?: string;
  endDate?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  identifier: string;
  password: string;
  rememberDevice?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  role: 'ADMIN' | 'DRIVER';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
}

export interface OtpRequestPayload {
  identifier: string;
  type: 'FORGOT_PASSWORD';
}

export interface VerifyOtpPayload {
  identifier: string;
  otp: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

// ─── Dashboard (matches GET /admin/dashboard) ─────────────────────────────────

export interface VanStatusRow {
  assignmentId: string;
  driverName: string;
  vanNumber: string;
  status: string;
  /** Present when dashboard API joins route + van loads */
  routeName?: string;
  loadedUnits?: number;
  soldUnits?: number;
  balanceStock?: number;
  loadCapacity?: number;
}

export interface AdminDashboardData {
  today: string;
  totalDeliveries: number;
  totalCollected: number;
  activeAssignments: number;
  pendingHandovers: number;
  totalEmployees: number;
  totalStock: number;
  availableStock: number;
  availableUnits: number;
  pendingPayments: number;
  /** Sum of damaged egg counts recorded today */
  damagedEggsToday?: number;
  /** Loading / storage damage today */
  damagedEggsLoad?: number;
  /** Transit damage today */
  damagedEggsDelivery?: number;
  /** Sum of expenses recorded in the selected range */
  totalExpenses?: number;
  /** Sum of vendor payments made in the selected range */
  totalVendorPayments?: number;
  /** totalCollected - totalVendorPayments - totalExpenses */
  netProfit?: number;
  vanStatus: VanStatusRow[];
}

// ─── Vendor ───────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  vendorCode: string;
  name: string;
  phone: string;
  address?: string | null;
  aadharNumber?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVendorPayload {
  name: string;
  phone: string;
  address?: string;
  aadharNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}

export interface UpdateVendorPayload extends Partial<CreateVendorPayload> {
  isActive?: boolean;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface Inventory {
  id: string;
  vendor: Vendor;
  quantity?: number;
  pricePerUnit?: number;
  purchaseDate?: string;
  totalUnits?: number;
  goodUnits?: number;
  damagedUnits?: number;
  availableUnits?: number;
  ratePerUnit?: number;
  totalAmount: number;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateInventoryPayload {
  vendorId: string;
  purchaseDate: string;
  totalUnits: number;
  goodUnits: number;
  ratePerUnit: number;
  createdBy: string;
}

export interface VanLoad {
  id: string;
  van: Van;
  driver: Employee;
  quantity: number;
  loadDate: string;
  createdAt: string;
}

/** Van loads returned for a specific assignment (admin inventory API). */
export interface AssignmentVanLoad {
  id: string;
  vanAssignmentId: string;
  inventoryId: string;
  loadedUnits: number;
  ratePerUnit: number;
  soldUnits?: number;
  inventory?: Inventory;
}

export interface CreateVanLoadPayload {
  vanAssignmentId: string;
  inventoryId: string;
  loadedUnits: number;
  ratePerUnit: number;
}

export interface DamagedEgg {
  id: string;
  vanAssignmentId?: string | null;
  vanName?: string | null;
  van?: { id?: string; name?: string; vanNumber?: string };
  driverId?: string | null;
  driverName?: string | null;
  driver?: { id?: string; name?: string; profilePictureUrl?: string | null };
  inventoryId?: string | null;
  eggCount: number;
  reason: DamageReason;
  damageDate: string;
  damageTime: string;
  recordedBy?: string | null;
  createdAt: string;
  /** @deprecated old UI field */
  quantity?: number;
  /** @deprecated old UI field */
  reportedAt?: string;
}

export type DamageReason = 'LOADING' | 'TRANSIT' | 'STORAGE';

export interface CreateDamagedEggPayload {
  vanAssignmentId?: string;
  driverId?: string;
  inventoryId?: string;
  eggCount: number;
  reason: DamageReason;
  damageDate: string;
  damageTime: string;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export interface Route {
  id: string;
  name: string;
  description?: string;
  stores?: Store[];
  storeCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateRoutePayload {
  name: string;
  description?: string;
  storeIds?: string[];
}

export interface UpdateRoutePayload {
  name?: string;
  description?: string;
  storeIds?: string[];
  isActive?: boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  ownerContactName: string;
  phone: string;
  address: string;
  routeId?: string | null;
  route?: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  /** Present on list/summary responses when API includes ledger totals */
  totalSalesAmount?: number;
  totalCollected?: number;
  pendingAmount?: number;
}

export interface CreateStorePayload {
  name: string;
  ownerContactName: string;
  phone: string;
  address: string;
  routeId?: string;
}

export interface UpdateStorePayload {
  name?: string;
  ownerContactName?: string;
  phone?: string;
  address?: string;
  routeId?: string | null;
  isActive?: boolean;
}

export interface StoreSummary {
  totalDeliveries: number;
  totalSalesAmount: number;
  totalCollected: number;
  pendingAmount: number;
}

export interface StoreDeliveryRow {
  id: string;
  deliveryDate: string;
  vanName: string;
  ratePerUnit: number;
  totalUnits: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
}

// ─── Van ──────────────────────────────────────────────────────────────────────

export interface Van {
  id: string;
  vanNumber: string;
  name: string;
  loadCapacity: number;
  isActive: boolean;
  createdAt: string;
  /** @deprecated kept for backward-compat — use vanNumber */
  registrationNumber?: string;
  /** @deprecated kept for backward-compat — use name */
  model?: string;
  /** @deprecated kept for backward-compat — use loadCapacity */
  capacity?: number;
}

export interface CreateVanPayload {
  vanNumber: string;
  name: string;
  loadCapacity?: number;
}

export interface VanFleetItem extends Van {
  assignment: {
    id: string;
    status: string;
    driver: { id: string; name: string };
    route: { id: string; name: string };
    totalLoaded: number;
  } | null;
}

export interface StockSpecRow {
  ratePerUnit: number;
  loaded: number;
  sold: number;
  balance: number;
}

export interface RouteActivityRow {
  storeName: string;
  qtySold: number;
  paid: number;
  pending: number;
}

export interface VanDetailResponse {
  van: Van;
  assignment: VanAssignment | null;
  stats: { totalLoaded: number; totalSold: number; currentBalance: number };
  stockSpec: StockSpecRow[];
  routeActivity: { data: RouteActivityRow[]; total: number; page: number; totalPages: number };
}

// ─── Employee (Driver) ────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'DRIVER';
  isActive: boolean;
  createdAt: string;
  profilePictureUrl?: string | null;
  currentAssignment?: VanAssignment | null;
}

// ─── Van Assignment ───────────────────────────────────────────────────────────

export type VanAssignmentStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

export interface VanAssignment {
  id: string;
  van: Van;
  driver: Employee;
  route: Route;
  status: VanAssignmentStatus;
  assignedAt: string;
  createdBy: string;
}

export interface CreateVanAssignmentPayload {
  vanId: string;
  driverId: string;
  routeId: string;
  assignedDate: string;
  createdBy: string;
}

export interface UpdateVanAssignmentPayload {
  vanId?: string;
  driverId?: string;
  routeId?: string;
}

// ─── Handover ─────────────────────────────────────────────────────────────────

/** Matches backend `HandoverStatus` enum (driver cash handover workflow). */
export type HandoverStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Line items returned with admin handover detail (`handover_egg_items`). */
export interface HandoverEggItemRow {
  id: string;
  vanLoadId: string;
  ratePerUnit?: number;
  goodUnits?: number;
  damagedUnits?: number;
}

export interface Handover {
  id: string;
  driver?: Employee;
  /** From joined `van_assignment.van` when API includes relations */
  van?: Van;
  vanAssignment?: {
    id: string;
    van?: Van;
    route?: { id: string; name?: string };
  };
  status: HandoverStatus;
  handoverDate: string;
  handoverTime?: string;
  cashAmount: number;
  rejectionReason?: string | null;
  eggItems?: HandoverEggItemRow[];
  createdAt?: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

/** Matches backend `payments.status` (PaymentStatus enum). */
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER';
export type VendorPaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL';

export interface DriverPayment {
  id: string;
  driver: Employee;
  amount: number;
  status: PaymentStatus;
  paymentDate?: string;
  paymentTime?: string;
  paymentMethod?: string;
  proofUrl?: string | null;
  adminNote?: string | null;
  reference?: string;
  createdAt: string;
  store?: { id: string; name: string; ownerContactName?: string; phone?: string };
  vanAssignment?: {
    van?: { vanNumber?: string; registrationNumber?: string };
    route?: { name?: string };
  };
}

export interface VendorPayment {
  id: string;
  vendor: Vendor;
  amount: number;
  paymentMethod: PaymentMethod;
  status: VendorPaymentStatus;
  paidAt?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateVendorPaymentPayload {
  vendorId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  status?: VendorPaymentStatus;
  notes?: string;
}

// ─── Vendor Detail ────────────────────────────────────────────────────────────

export interface VendorSummary {
  totalEggsPurchased: number;
  saleEggValue: number;
  netProfit: number;
  pendingAmount: number;
  damagedEggs: number;
  totalPaid: number;
}

export interface VendorPurchase {
  id: string;
  vendorId: string;
  vendor?: Vendor;
  purchaseDate: string;
  totalUnits: number;
  goodUnits: number;
  damagedUnits: number;
  availableUnits: number;
  ratePerUnit: number;
  totalAmount: number;
  createdAt: string;
}

// ─── Employee Create ──────────────────────────────────────────────────────────

export interface CreateEmployeePayload {
  name: string;
  phone: string;
  email?: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  phone?: string;
  email?: string | null;
}

export interface EmployeeSummary {
  totalDeliveries: number;
  totalSalesAmount: number;
  totalCollected: number;
  cashOnHand: number;
  pendingAmount: number;
}

export interface EmployeeDeliveryRow {
  id: string;
  storeName: string;
  deliveryDate: string;
  vanName: string;
  ratePerUnit: number;
  totalUnits: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'VEHICLE_ASSIGNMENT'
  | 'HANDOVER_APPROVAL'
  | 'PAYMENT_CONFIRMATION'
  | 'HANDOVER_SUBMITTED'
  | 'PAYMENT_SUBMITTED'
  | 'DELIVERY_RECORDED'
  | 'DAMAGED_EGGS_REPORTED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Expenses ──────────────────────────────────────────────────────────────────

export type ExpenseCategory = 'COMPANY' | 'VEHICLE' | 'OTHER';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  expenseDate: string;
  vanId?: string | null;
  van?: { id: string; name: string; vanNumber: string } | null;
  notes?: string | null;
  createdBy: string;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  title: string;
  amount: number;
  expenseDate: string;
  vanId?: string;
  notes?: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  byCategory: { COMPANY: number; VEHICLE: number; OTHER: number };
  totalCollected: number;
  totalVendorPayments: number;
  netProfit: number;
}
