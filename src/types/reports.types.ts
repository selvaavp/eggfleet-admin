export interface RateBreakdown {
  ratePerUnit: number;
  eggCount: number;
  totalAmount: number;
  storesCount: number;
  storeNames: string[];
}

export interface DriverStoreDeliveryItem {
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  unitsDelivered: number;
  rateText: string;
  totalAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingAmount: number;
  paymentStatus: string;
}

export interface DriverDailyReport {
  assignmentId: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vanId: string;
  vanNumber: string;
  vanCapacity: number;
  routeName: string;
  status: string;
  loadedUnits: number;
  soldUnits: number;
  damagedUnits: number;
  balanceUnits: number;
  rateBreakdown: RateBreakdown[];
  storesDeliveredCount: number;
  storesList: DriverStoreDeliveryItem[];
  totalSaleAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingAmount: number;
}

export interface StoreDeliveryReport {
  deliveryId: string;
  storeId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  driverName: string;
  vanNumber: string;
  unitsDelivered: number;
  ratePerUnitText: string;
  totalAmount: number;
  cashCollected: number;
  upiCollected: number;
  totalCollected: number;
  pendingDue: number;
  paymentStatus: string;
  createdAt: string;
}

export interface DailySummaryOverall {
  totalEggsLoaded: number;
  totalEggsSold: number;
  totalEggsDamaged: number;
  totalBalanceEggs: number;
  totalStoresDelivered: number;
  totalDeliveriesCount: number;
  totalSaleAmount: number;
  totalCashCollected: number;
  totalUpiCollected: number;
  totalCollectedAmount: number;
  totalPendingAmount: number;
  activeDriversCount: number;
  activeVansCount: number;
}

export interface DailySummaryData {
  date: string;
  overall: DailySummaryOverall;
  rateDistribution: RateBreakdown[];
  driverSummaries: DriverDailyReport[];
  storeDeliveries: StoreDeliveryReport[];
}
