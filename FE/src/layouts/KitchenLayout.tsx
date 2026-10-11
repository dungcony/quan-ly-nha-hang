import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LogOut, ArrowLeft, ChefHat, UserRound } from 'lucide-react';
import { ROLE_LABELS } from '@/utils/labels';

export default function KitchenLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col text-base 2xl:text-lg">
      {/* Kitchen Header */}
      <header className="h-16 bg-orange-600 text-white shadow-md flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 -ml-2 text-orange-200 hover:text-white rounded-lg hover:bg-orange-700 transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2 font-bold text-xl uppercase tracking-wider">
            <ChefHat className="size-6" />
            <span>KDS - Hệ Thống Bếp</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/account/profile" className="flex items-center gap-2 text-right hover:text-white" title="Thông tin cá nhân và đổi mật khẩu">
            <UserRound className="size-5 text-orange-200" />
            <span>
              <span className="block text-sm font-bold">{user?.full_name}</span>
              <span className="block text-xs text-orange-200">{user ? ROLE_LABELS[user.role] : ''}</span>
            </span>
          </Link>
          <button
            onClick={logout}
            className="p-2 text-orange-200 hover:text-white rounded-lg hover:bg-orange-700 transition-colors"
            title="Đăng xuất"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* Kitchen Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 2xl:p-10">
        <Outlet />
      </main>
    </div>
  );
}

