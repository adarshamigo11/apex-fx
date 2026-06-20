'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname === '/login' || pathname === '/register';
  const isAdmin = pathname?.startsWith('/admin');

  if (isAuth || isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="pb-20 md:pb-0">
      <Sidebar />
      <div className="md:ml-sidebar-expanded min-h-screen transition-all">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
