import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserRound,
  Utensils,
  Tags,
  LogOut,
  FileText,
  Grid,
  CalendarCheck,
  Receipt,
  Menu,
  X,
} from 'lucide-react';
import { ROLE_LABELS } from '@/utils/labels';
import { cn } from '@/utils/cn';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/menu', label: 'Món ăn', icon: Utensils },
  { path: '/admin/categories', label: 'Danh mục', icon: Tags },
  { path: '/admin/tables', label: 'Bàn ăn', icon: Grid },
  { path: '/admin/reservations', label: 'Đặt bàn', icon: CalendarCheck },
  { path: '/admin/invoices', label: 'Hóa đơn', icon: Receipt },
  { path: '/admin/staff', label: 'Nhân sự', icon: Users },
  { path: '/admin/customers', label: 'Khách hàng', icon: UserRound },
  { path: '/admin/reports', label: 'Báo cáo', icon: FileText },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  // dưới màn hình lg sidebar thu gọn thành ngăn kéo để nội dung có đủ chỗ trên máy tính bảng và điện thoại
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {drawerOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setDrawerOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform lg:static lg:translate-x-0',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center">
            <Utensils className="h-6 w-6 text-amber-600 mr-2" />
            <span className="font-bold text-lg text-slate-800">Quản trị</span>
          </div>
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-slate-800 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Chức năng quản trị">
          {NAV_ITEMS.map((item) => {
            const isActive =
              location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive ? 'text-amber-700 bg-amber-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <Link to="/account/profile" className="flex items-center mb-4 rounded-lg hover:bg-slate-50" title="Thông tin cá nhân và đổi mật khẩu">
            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 px-4 sm:px-8 shadow-sm z-10">
          <button
            type="button"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Mở menu"
          >
            <Menu className="size-6" />
          </button>
          <h1 className="text-xl font-semibold text-slate-800">Quản trị hệ thống</h1>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
