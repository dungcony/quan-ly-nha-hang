import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { User, CalendarCheck, ReceiptText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AccountLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <span className="text-slate-500">Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // lịch sử đặt bàn và hóa đơn chỉ dành cho Khách hàng; nhân viên chỉ có hồ sơ và đổi mật khẩu
  const navItems = [
    { name: 'Thông tin tài khoản', path: '/account/profile', icon: User },
    ...(user?.role === 'CUSTOMER'
      ? [
          { name: 'Lịch sử đặt bàn', path: '/account/reservations', icon: CalendarCheck },
          { name: 'Lịch sử hóa đơn', path: '/account/invoices', icon: ReceiptText },
        ]
      : []),
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full min-h-[80vh]">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden sticky top-24">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Quản lý tài khoản</h2>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-50 text-amber-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="size-5" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

