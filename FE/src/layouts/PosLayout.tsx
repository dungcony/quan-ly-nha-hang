import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LogOut,
  ArrowLeft,
  MonitorPlay,
  LayoutGrid,
  BellRing,
  CalendarCheck,
  Receipt,
  History,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { ROLE_LABELS } from '@/utils/labels';
import type { Role } from '@/utils/apiTypes';

interface PosNavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  // các tiền tố đường dẫn làm sáng mục này, vì màn gọi món và thanh toán nằm dưới đường dẫn con
  activePrefixes: string[];
}

const NAV_BY_ROLE: Partial<Record<Role, PosNavItem[]>> = {
  WAITER: [
    { label: 'Sơ đồ bàn', to: '/pos/tables', icon: LayoutGrid, activePrefixes: ['/pos/tables', '/pos/order'] },
    { label: 'Món chờ phục vụ', to: '/pos/serve', icon: BellRing, activePrefixes: ['/pos/serve'] },
    { label: 'Đặt bàn', to: '/pos/reservations', icon: CalendarCheck, activePrefixes: ['/pos/reservations'] },
  ],
  CASHIER: [
    { label: 'Sơ đồ bàn', to: '/pos/tables', icon: LayoutGrid, activePrefixes: ['/pos/tables'] },
    { label: 'Thanh toán', to: '/pos/payment', icon: Receipt, activePrefixes: ['/pos/payment'] },
    { label: 'Hóa đơn hôm nay', to: '/pos/invoices', icon: History, activePrefixes: ['/pos/invoices'] },
  ],
};

export default function PosLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = (user && NAV_BY_ROLE[user.role]) || [];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col text-slate-100">
      {/* POS Header (tối giản, tối màu để tập trung) */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2 text-amber-500 font-bold text-lg">
            <MonitorPlay className="size-5" />
            <span>POS System</span>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-2" />

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.activePrefixes.some((prefix) => location.pathname.startsWith(prefix));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white">{user?.full_name}</div>
            <div className="text-xs text-amber-500">{user ? ROLE_LABELS[user.role] : ''}</div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* POS Content - Tràn viền để dễ chạm */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
}
