import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PageHeader } from './PageHeader';
import { PageTopBar } from './PageTopBar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-app print:block print:h-auto print:overflow-visible print:bg-white">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col print:block">
        <PageTopBar />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden print:overflow-visible">
          <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-page-top sm:px-6 lg:px-10 print:max-w-none print:p-0">
            <PageHeader />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
