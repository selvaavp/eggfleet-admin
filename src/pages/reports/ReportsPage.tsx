import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Truck,
  Wallet,
  ShoppingBasket,
  LineChart,
  Store as StoreIcon,
  Download,
  Printer,
  RefreshCw,
  Coins,
  UserCheck,
  Eye,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  AlertCircle,
  Tag,
  Search,
} from 'lucide-react';
import { reportsApi } from '@/api/reports.api';
import { StatCard, Card, PageLoader, Modal, Badge } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { downloadReportExcel } from '@/lib/report-excel';
import {
  buildDriverTable,
  buildRateTable,
  buildStoreTable,
  buildSummaryTable,
  type ReportTable,
} from '@/lib/report-tables';
import { cn } from '@/lib/utils';
import { ReportPrintView } from '@/components/reports/ReportPrintView';
import type { DriverDailyReport } from '@/types/reports.types';

function getInitials(name?: string) {
  if (!name?.trim()) return '—';
  const parts = name.trim().split(/\s+/);
  return `${parts[0][0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '—';
}

function DownloadExcelButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 hover:text-dark"
    >
      <Download className="size-3.5" />
      <span>Download Excel</span>
    </button>
  );
}

export default function ReportsPage() {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeDriverModal, setActiveDriverModal] = useState<DriverDailyReport | null>(null);
  const [activeTab, setActiveTab] = useState<'drivers' | 'stores'>('drivers');
  const [storeSearch, setStoreSearch] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: () => reportsApi.getDailySummary(selectedDate),
  });

  const overall = data?.overall ?? {
    totalEggsLoaded: 0,
    totalEggsSold: 0,
    totalEggsDamaged: 0,
    totalBalanceEggs: 0,
    totalStoresDelivered: 0,
    totalDeliveriesCount: 0,
    totalSaleAmount: 0,
    totalCashCollected: 0,
    totalUpiCollected: 0,
    totalCollectedAmount: 0,
    totalPendingAmount: 0,
    activeDriversCount: 0,
    activeVansCount: 0,
  };

  const rateDistribution = data?.rateDistribution ?? [];
  const driverSummaries = data?.driverSummaries ?? [];
  const storeDeliveries = useMemo(() => data?.storeDeliveries ?? [], [data]);

  const filteredStoreDeliveries = useMemo(() => {
    if (!storeSearch.trim()) return storeDeliveries;
    const q = storeSearch.toLowerCase();
    return storeDeliveries.filter(
      (s) =>
        s.storeName.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.driverName.toLowerCase().includes(q) ||
        s.vanNumber.toLowerCase().includes(q)
    );
  }, [storeDeliveries, storeSearch]);

  /** Formatted .xlsx with the given tables stacked on one sheet. */
  const downloadExcel = async (name: string, title: string, tables: ReportTable[], note?: string) => {
    try {
      await downloadReportExcel({
        filename: `EggFleet_${name}_${selectedDate}`,
        sheetName: 'Daily Report',
        title: `EggFleet - ${title}`,
        meta: [
          `Report Date: ${format(parseISO(selectedDate), 'dd MMM yyyy (EEEE)')}`,
          `Generated On: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
          ...(note ? [note] : []),
        ],
        tables,
      });
    } catch {
      toast.error('Could not create the Excel file. Please try again.');
    }
  };

  /** A single section as its own file. */
  const downloadSection = (name: string, table: ReportTable, note?: string) =>
    downloadExcel(name, table.title, [table], note);

  const handleExportExcel = () => {
    if (!data) return;
    downloadExcel('Daily_Report', 'Daily Operations & Sales Report', [
      buildSummaryTable(overall),
      buildRateTable(rateDistribution, overall.totalEggsSold),
      buildDriverTable(driverSummaries),
      buildStoreTable(storeDeliveries),
    ]);
  };

  const handlePrint = () => {
    // Browsers use the tab title as the default "Save as PDF" file name.
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);
    document.title = `EggFleet Daily Report ${selectedDate}`;
    window.print();
  };

  if (isLoading) return <PageLoader />;

  if (isError) {
    return (
      <Card className="max-w-lg">
        <p className="font-semibold text-dark">Daily Report could not be loaded</p>
        <p className="mt-2 text-sm text-muted">
          Could not fetch report data for {selectedDate}. Please verify the API is running and try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <RefreshCw className="size-4" /> Retry
        </button>
      </Card>
    );
  }

  const isToday = selectedDate === todayStr;
  const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <>
      <ReportPrintView
        date={selectedDate}
        overall={overall}
        rateDistribution={rateDistribution}
        driverSummaries={driverSummaries}
        storeDeliveries={filteredStoreDeliveries}
        totalStoreDeliveries={storeDeliveries.length}
        storeSearch={storeSearch}
      />

      <div className="space-y-8 pb-12 print:hidden">
        {/* Header & Date Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold tracking-tight text-dark">
                Daily Operations & Sales Report
              </h1>
              {isToday ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  Today&apos;s Live Summary
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-500/20">
                  Historical Date: {selectedDate}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              Egg rate breakdowns, total sales, shop deliveries, cash in-hand, net payments (UPI), and pending amounts.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Date Buttons */}
            <div className="flex rounded-lg border border-border bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  isToday ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(yesterdayStr)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                  selectedDate === yesterdayStr ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100'
                )}
              >
                Yesterday
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="relative flex items-center">
              <CalendarIcon className="pointer-events-none absolute left-3 size-4 text-muted" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="h-9 rounded-lg border border-border bg-white pl-9 pr-3 text-xs font-semibold text-dark shadow-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Data"
              className="flex size-9 items-center justify-center rounded-lg border border-border bg-white text-neutral-600 shadow-sm hover:bg-neutral-50 hover:text-dark disabled:opacity-50"
            >
              <RefreshCw className={cn('size-4', isFetching && 'animate-spin text-primary')} />
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 hover:text-dark"
            >
              <Download className="size-3.5" />
              <span>Export Excel</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
            >
              <Printer className="size-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Row 1: Stock Volumes */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
            1. Egg Movement & Volumes ({selectedDate})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Eggs Loaded"
              value={overall.totalEggsLoaded.toLocaleString('en-IN')}
              icon={Truck}
              colorClass="bg-[#FFF4E5] text-[#904D00]"
            />
            <StatCard
              title="Total Eggs Sold"
              value={overall.totalEggsSold.toLocaleString('en-IN')}
              icon={ShoppingBasket}
              colorClass="bg-[#EFF8FF] text-[#2563EB]"
            />
            <StatCard
              title="Total Eggs Damaged"
              value={overall.totalEggsDamaged.toLocaleString('en-IN')}
              icon={LineChart}
              colorClass="bg-[#FDE8EC] text-[#E64566]"
            />
            <StatCard
              title="Total Shops Visited"
              value={`${overall.totalStoresDelivered} Shops`}
              icon={StoreIcon}
              colorClass="bg-[#FAF5FF] text-[#9333EA]"
            />
          </div>
        </div>

        {/* Row 2: Financial Sales & Collections Highlights */}
        <div>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">
            2. Sales & Collection Breakdown
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Sale Value */}
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#777777]">
                    Total Sale Amount
                  </p>
                  <p className="text-[11px] font-medium text-muted">Gross billed revenue</p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF4E5] text-[#904D00]">
                  <Wallet className="size-5" strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-3 font-sans text-2xl font-black tabular-nums leading-none tracking-tight text-dark">
                {formatINR(overall.totalSaleAmount, { fractionDigits: 2 })}
              </p>
              <p className="mt-3 text-xs font-medium text-neutral-500">
                Across {overall.totalDeliveriesCount} total delivery drops
              </p>
            </div>

            {/* Cash in Hand */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-800">
                    Cash in Hand
                  </p>
                  <p className="text-[11px] font-medium text-emerald-700/80">Physical cash collected</p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Banknote className="size-5" strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-3 font-sans text-2xl font-black tabular-nums leading-none tracking-tight text-emerald-700">
                {formatINR(overall.totalCashCollected, { fractionDigits: 2 })}
              </p>
              <p className="mt-3 text-xs font-medium text-emerald-800/80">Direct cash received by drivers</p>
            </div>

            {/* Net Pay / UPI */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-blue-800">
                    Net Pay / UPI
                  </p>
                  <p className="text-[11px] font-medium text-blue-700/80">Digital bank / QR payments</p>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <CreditCard className="size-5" strokeWidth={2.2} />
                </span>
              </div>
              <p className="mt-3 font-sans text-2xl font-black tabular-nums leading-none tracking-tight text-blue-700">
                {formatINR(overall.totalUpiCollected, { fractionDigits: 2 })}
              </p>
              <p className="mt-3 text-xs font-medium text-blue-800/80">Direct online receipts</p>
            </div>

            {/* Amount Still Due */}
            <div
              className={cn(
                'rounded-2xl border p-5 shadow-sm',
                overall.totalPendingAmount > 0
                  ? 'border-rose-100 bg-rose-50/40'
                  : 'border-neutral-100 bg-neutral-50/40'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p
                    className={cn(
                      'text-xs font-bold uppercase tracking-[0.08em]',
                      overall.totalPendingAmount > 0 ? 'text-rose-800' : 'text-neutral-700'
                    )}
                  >
                    Amount Still Due
                  </p>
                  <p
                    className={cn(
                      'text-[11px] font-medium',
                      overall.totalPendingAmount > 0 ? 'text-rose-700/80' : 'text-neutral-500'
                    )}
                  >
                    Outstanding credit due
                  </p>
                </div>
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl',
                    overall.totalPendingAmount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-neutral-200 text-neutral-600'
                  )}
                >
                  <AlertCircle className="size-5" strokeWidth={2.2} />
                </span>
              </div>
              <p
                className={cn(
                  'mt-3 font-sans text-2xl font-black tabular-nums leading-none tracking-tight',
                  overall.totalPendingAmount > 0 ? 'text-rose-700' : 'text-neutral-700'
                )}
              >
                {formatINR(overall.totalPendingAmount, { fractionDigits: 2 })}
              </p>
              <p className="mt-3 text-xs font-medium text-neutral-500">Unpaid / pending credit from shops</p>
            </div>
          </div>
        </div>

        {/* Row 3: Egg Sales Rate Breakdown & Shops Sold */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-dark">
                Egg Rate Breakdown & Shops Sold
              </h2>
              <p className="text-xs text-muted">
                Shows how many eggs were sold at each individual rate and which shops bought them.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {rateDistribution.length} Active Rate{rateDistribution.length === 1 ? '' : 's'}
              </span>
              <DownloadExcelButton
                title="Download Egg Rate Breakdown & Shops Sold"
                onClick={() =>
                  downloadSection('Egg_Rate_Breakdown', buildRateTable(rateDistribution, overall.totalEggsSold))
                }
              />
            </div>
          </div>

          {rateDistribution.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center">
              <Coins className="mx-auto size-8 text-muted/60" />
              <p className="mt-2 text-sm font-semibold text-dark">No eggs sold yet for {selectedDate}</p>
              <p className="text-xs text-muted">Sales and rate breakdowns will appear once drivers record deliveries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {rateDistribution.map((item) => (
                <div
                  key={item.ratePerUnit}
                  className="flex flex-col justify-between rounded-xl border border-border bg-white p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-extrabold text-amber-900 ring-1 ring-amber-500/20">
                        <Tag className="size-3.5 text-amber-600" /> ₹{item.ratePerUnit.toFixed(2)} / egg
                      </span>
                      <span className="text-xs font-medium text-muted">
                        {overall.totalEggsSold > 0
                          ? `${Math.round((item.eggCount / overall.totalEggsSold) * 100)}% volume`
                          : '0%'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <p className="text-2xl font-black text-dark tabular-nums">
                        {item.eggCount.toLocaleString('en-IN')}{' '}
                        <span className="text-sm font-medium text-muted">eggs sold</span>
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-600 tabular-nums">
                        Total Sale: {formatINR(item.totalAmount, { fractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {/* Shops list for this rate */}
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      Shops ({item.storesCount ?? item.storeNames?.length ?? 0}):
                    </p>
                    {item.storeNames && item.storeNames.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.storeNames.slice(0, 3).map((sn, idx) => (
                          <span
                            key={idx}
                            className="inline-block truncate max-w-[150px] rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700"
                          >
                            {sn}
                          </span>
                        ))}
                        {item.storeNames.length > 3 && (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-muted">
                            +{item.storeNames.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">—</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Row 4: Detailed Breakdown Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('drivers')}
                className={cn(
                  'relative pb-3 text-sm font-bold transition-all',
                  activeTab === 'drivers'
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                    : 'text-muted hover:text-dark'
                )}
              >
                Driver & Van Operations ({driverSummaries.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('stores')}
                className={cn(
                  'relative pb-3 text-sm font-bold transition-all',
                  activeTab === 'stores'
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                    : 'text-muted hover:text-dark'
                )}
              >
                Shop-Wise Delivery & Payment Details ({storeDeliveries.length})
              </button>
            </div>

            <div className="flex w-full items-center gap-2.5 sm:w-auto">
              {activeTab === 'stores' && (
                <div className="relative w-full sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
                  <input
                    type="text"
                    placeholder="Search shop, owner, driver, van..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-xs placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
                  />
                </div>
              )}
              {activeTab === 'drivers' ? (
                <DownloadExcelButton
                  title="Download Driver & Van Operations"
                  onClick={() => downloadSection('Driver_Van_Operations', buildDriverTable(driverSummaries))}
                />
              ) : (
                <DownloadExcelButton
                  title="Download Shop-Wise Delivery & Payment Details"
                  onClick={() =>
                    downloadSection(
                      'Shop_Wise_Deliveries',
                      buildStoreTable(filteredStoreDeliveries),
                      filteredStoreDeliveries.length !== storeDeliveries.length
                        ? `Filter: "${storeSearch.trim()}" (${filteredStoreDeliveries.length} of ${storeDeliveries.length} deliveries)`
                        : undefined
                    )
                  }
                />
              )}
            </div>
          </div>

          {/* Tab 1: Driver & Van Summary Table */}
          {activeTab === 'drivers' && (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              {driverSummaries.length === 0 ? (
                <div className="p-12 text-center">
                  <Truck className="mx-auto size-10 text-muted/50" />
                  <p className="mt-3 text-base font-semibold text-dark">No driver assignments recorded for this date</p>
                  <p className="mt-1 text-xs text-muted">
                    Assign drivers to vans on the Assignments page to track daily sales and collections.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3.5">Driver & Phone</th>
                        <th className="px-4 py-3.5">Van & Route</th>
                        <th className="px-4 py-3.5 text-right">Loaded</th>
                        <th className="px-4 py-3.5 text-right">Sold</th>
                        <th className="px-4 py-3.5 text-right">Damaged</th>
                        <th className="px-4 py-3.5">Rates Sold</th>
                        <th className="px-4 py-3.5 text-center">Shops</th>
                        <th className="px-4 py-3.5 text-right">Cash in Hand</th>
                        <th className="px-4 py-3.5 text-right">Net Pay / UPI</th>
                        <th className="px-4 py-3.5 text-right">Total Sale</th>
                        <th className="px-4 py-3.5 text-right">Amount Still Due</th>
                        <th className="px-4 py-3.5 text-center">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {driverSummaries.map((row) => (
                        <tr key={row.assignmentId} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {getInitials(row.driverName)}
                              </div>
                              <div>
                                <p className="font-bold text-dark">{row.driverName}</p>
                                <p className="text-xs text-muted">{row.driverPhone || '—'}</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-bold text-dark">
                                <Truck className="size-3 text-muted" /> {row.vanNumber}
                              </span>
                              <p className="mt-0.5 text-xs text-muted truncate max-w-[130px]">{row.routeName || '—'}</p>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-dark">
                            {row.loadedUnits.toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-blue-600">
                            {row.soldUnits.toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-semibold tabular-nums">
                            {row.damagedUnits > 0 ? (
                              <span className="text-rose-600 font-bold">{row.damagedUnits}</span>
                            ) : (
                              <span className="text-muted">0</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {row.rateBreakdown.length > 0 ? (
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {row.rateBreakdown.map((rb, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200"
                                  >
                                    {rb.eggCount} @ ₹{rb.ratePerUnit.toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveDriverModal(row)}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                            >
                              <StoreIcon className="size-3" />
                              <span>{row.storesDeliveredCount} Shops</span>
                            </button>
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700">
                            {formatINR(row.cashCollected, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-blue-700">
                            {formatINR(row.upiCollected, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-black tabular-nums text-dark">
                            {formatINR(row.totalSaleAmount, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums">
                            {row.pendingAmount > 0 ? (
                              <span className="text-rose-600">{formatINR(row.pendingAmount, { fractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">₹0</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setActiveDriverModal(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-dark transition-colors"
                              title="View Full Shop Breakdown"
                            >
                              <Eye className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Shop Deliveries Full Details Table */}
          {activeTab === 'stores' && (
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              {filteredStoreDeliveries.length === 0 ? (
                <div className="p-12 text-center">
                  <StoreIcon className="mx-auto size-10 text-muted/50" />
                  <p className="mt-3 text-base font-semibold text-dark">No shop deliveries found</p>
                  <p className="mt-1 text-xs text-muted">No delivery transactions matching your search on {selectedDate}.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3.5">Shop Name & Owner</th>
                        <th className="px-4 py-3.5">Phone</th>
                        <th className="px-4 py-3.5">Driver & Van</th>
                        <th className="px-4 py-3.5">Rate / Egg</th>
                        <th className="px-4 py-3.5 text-right">Eggs Delivered</th>
                        <th className="px-4 py-3.5 text-right">Total Bill</th>
                        <th className="px-4 py-3.5 text-right text-emerald-800 bg-emerald-50/50">Cash in Hand</th>
                        <th className="px-4 py-3.5 text-right text-blue-800 bg-blue-50/50">Net Pay / UPI</th>
                        <th className="px-4 py-3.5 text-right text-rose-800 bg-rose-50/50">Amount Still Due</th>
                        <th className="px-4 py-3.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredStoreDeliveries.map((item) => (
                        <tr key={item.deliveryId} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-dark">{item.storeName}</p>
                            <p className="text-xs text-muted">{item.ownerName || '—'}</p>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-muted">
                            {item.phone || '—'}
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="size-3.5 text-primary" />
                              <span className="font-semibold text-dark">{item.driverName}</span>
                            </div>
                            <span className="mt-0.5 inline-block text-[11px] text-muted">({item.vanNumber})</span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
                              {item.ratePerUnitText || '—'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-dark">
                            {item.unitsDelivered.toLocaleString('en-IN')}
                          </td>

                          <td className="px-4 py-3.5 text-right font-black tabular-nums text-dark">
                            {formatINR(item.totalAmount, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-700 bg-emerald-50/20">
                            {formatINR(item.cashCollected ?? 0, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums text-blue-700 bg-blue-50/20">
                            {formatINR(item.upiCollected ?? 0, { fractionDigits: 2 })}
                          </td>

                          <td className="px-4 py-3.5 text-right font-bold tabular-nums bg-rose-50/20">
                            {item.pendingDue > 0 ? (
                              <span className="text-rose-600 font-black">{formatINR(item.pendingDue, { fractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">₹0</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <Badge
                              variant={
                                item.paymentStatus === 'PAID'
                                  ? 'success'
                                  : item.paymentStatus === 'PARTIAL'
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {item.paymentStatus}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal: Driver Stores Detailed View */}
        {activeDriverModal && (
          <Modal
            isOpen={Boolean(activeDriverModal)}
            onClose={() => setActiveDriverModal(null)}
            title={`Shop Deliveries & Collections — ${activeDriverModal.driverName}`}
            className="max-w-4xl"
          >
            <div className="space-y-6">
              {/* Driver Summary Pill Header */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-4 text-xs">
                <div>
                  <p className="text-muted">Van & Route</p>
                  <p className="font-bold text-dark text-sm">{activeDriverModal.vanNumber} • {activeDriverModal.routeName}</p>
                </div>
                <div>
                  <p className="text-muted">Loaded / Sold Eggs</p>
                  <p className="font-bold text-dark text-sm">
                    {activeDriverModal.loadedUnits} / {activeDriverModal.soldUnits}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Cash in Hand / Net Pay</p>
                  <p className="font-bold text-dark text-sm">
                    {formatINR(activeDriverModal.cashCollected, { fractionDigits: 2 })} / {formatINR(activeDriverModal.upiCollected, { fractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-muted">Amount Still Due</p>
                  <p className="font-bold text-rose-600 text-sm">
                    {formatINR(activeDriverModal.pendingAmount, { fractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Rate Breakdown */}
              {activeDriverModal.rateBreakdown.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                    Egg Rates Sold (Unit Price Breakdown)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeDriverModal.rateBreakdown.map((r, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs shadow-sm"
                      >
                        <span className="font-extrabold text-amber-900">₹{r.ratePerUnit.toFixed(2)} / egg</span>
                        <span className="ml-2 text-neutral-600">• {r.eggCount} eggs</span>
                        <span className="ml-2 font-bold text-dark">({formatINR(r.totalAmount, { fractionDigits: 2 })})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stores List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                  Shops Delivered on {selectedDate} ({activeDriverModal.storesList.length})
                </h4>

                {activeDriverModal.storesList.length === 0 ? (
                  <p className="text-sm text-muted italic">No shops recorded yet for this driver on this date.</p>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border rounded-xl border border-border">
                    {activeDriverModal.storesList.map((st) => (
                      <div key={st.storeId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 hover:bg-neutral-50 gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-dark text-sm">{st.storeName}</p>
                            <Badge variant={st.paymentStatus === 'PAID' ? 'success' : 'warning'} className="text-[10px]">
                              {st.paymentStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {st.ownerName} • {st.phone}
                          </p>
                          <p className="text-xs font-medium text-amber-800 mt-1">
                            {st.unitsDelivered} eggs @ {st.rateText || '—'}
                          </p>
                        </div>

                        <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                          <p className="text-xs font-black text-dark">Total Bill: {formatINR(st.totalAmount, { fractionDigits: 2 })}</p>
                          <div className="text-[11px] text-muted mt-0.5 space-x-2">
                            <span className="text-emerald-700 font-semibold">Cash: {formatINR(st.cashCollected, { fractionDigits: 2 })}</span>
                            <span className="text-blue-700 font-semibold">UPI: {formatINR(st.upiCollected, { fractionDigits: 2 })}</span>
                          </div>
                          {st.pendingAmount > 0 ? (
                            <p className="text-xs font-bold text-rose-600 mt-0.5">
                              Due: {formatINR(st.pendingAmount, { fractionDigits: 2 })}
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-emerald-600 mt-0.5">Fully Paid</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDriverModal(null)}
                  className="rounded-lg bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}
