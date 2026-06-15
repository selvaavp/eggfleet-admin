import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { PageHeader } from './PageHeader';
import { PageTopBar } from './PageTopBar';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PageTopBar />
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto max-w-[1440px] px-4 pb-12 pt-page-top sm:px-6 lg:px-10">
            <PageHeader />
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
