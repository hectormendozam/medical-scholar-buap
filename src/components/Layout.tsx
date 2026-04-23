import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Outlet, useLocation } from 'react-router-dom';

export function Layout() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen flex flex-col">
        <TopBar />
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
