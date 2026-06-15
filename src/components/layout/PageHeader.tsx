import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Store } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboard.store';
import { useStoresPageStore } from '@/store/stores-page.store';
import { Button, MonthPicker } from '@/components/ui';
import { APP_ROUTES } from '@/constants';

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: '',
  },
  '/vendors': { title: 'Vendor Management', subtitle: '' },
  '/inventory': { title: 'Inventory', subtitle: '' },
  '/inventory/damaged-eggs': { title: 'Damaged Egg', subtitle: '' },
  '/routes': { title: 'Routes', subtitle: 'Delivery routes and store order' },
  '/stores': { title: 'Customer Management', subtitle: '' },
  '/vans': { title: 'Van & Route', subtitle: '' },
  '/assignments': { title: 'Van assignments', subtitle: 'Daily driver, route, and load planning' },
  '/employees': { title: 'Employee Management', subtitle: '' },
  '/handovers': { title: 'Handovers', subtitle: 'Cash and returns submitted by drivers' },
  '/payments': { title: 'UPI & Hand Over', subtitle: '' },
};

/** Page title row — scrolls with main content below the fixed top search bar. */
export function PageHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const setSelectedMonth = useDashboardStore((s) => s.setSelectedMonth);
  const meta = ROUTE_META[pathname] ?? { title: 'EggFleet', subtitle: '' };
  const isVendorDetail = Boolean(matchPath({ path: '/vendors/:id', end: true }, pathname));
  const isStoreDetail = Boolean(matchPath({ path: '/stores/:id', end: true }, pathname));
  const isEmployeeDetail = Boolean(matchPath({ path: '/employees/:id', end: true }, pathname));
  const isDamagedEggsPage = pathname === '/inventory/damaged-eggs';
  const isStoresPage = pathname === '/stores';
  const openAddCustomer = useStoresPageStore((s) => s.openAddCustomer);

  if (isStoreDetail || isEmployeeDetail || isDamagedEggsPage) {
    return null;
  }

  if (isVendorDetail) {
    return (
      <div className="mb-5 flex items-center gap-3">
        <Link
          to={APP_ROUTES.VENDORS}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#E9E8E6] bg-[#F4F3F1] text-[#212121] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[#FAFAF9]"
          aria-label="Back to vendors"
        >
          <ArrowLeft className="size-5" strokeWidth={2.25} aria-hidden />
        </Link>
        <h1 className="font-sans text-3xl font-extrabold leading-tight tracking-tight text-[#212121]">
          Vendor Information
        </h1>
      </div>
    );
  }

  return (
    <div
      className={
        isStoresPage
          ? 'mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          : 'mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
      }
    >
      <div className="min-w-0">
        <h1 className="font-sans text-4xl font-extrabold leading-tight tracking-tight text-dark">
          {meta.title}
        </h1>
        {meta.subtitle && pathname !== '/dashboard' && (
          <p className="mt-1.5 max-w-2xl text-sm font-normal text-[#757575]">{meta.subtitle}</p>
        )}
      </div>
      {(pathname === '/dashboard' || pathname === '/payments') && (
        <MonthPicker className="shrink-0" onChange={setSelectedMonth} />
      )}
      {pathname === '/vans' && (
        <button
          type="button"
          onClick={() => navigate(APP_ROUTES.ASSIGNMENTS)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#FDB88133] px-4 py-2.5 text-sm font-bold text-[#904D00] transition hover:bg-[#FFECD6]"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Manage Assignment
        </button>
      )}
      {isStoresPage && (
        <Button
          type="button"
          className="h-10 shrink-0 rounded-[12px] px-5 text-sm font-bold shadow-[0_4px_14px_rgba(254,113,2,0.35)]"
          onClick={openAddCustomer}
          leftIcon={
            <span className="relative flex size-5 items-center justify-center" aria-hidden>
              <Store className="size-4" strokeWidth={2.25} />
              <Plus className="absolute -bottom-0.5 -right-0.5 size-2.5 stroke-[3]" />
            </span>
          }
        >
          Add New Customer
        </Button>
      )}
    </div>
  );
}
