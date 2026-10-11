import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, LogIn, User, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, roleHomeLabel, roleHomePath } from '@/utils/labels';
import { assetUrl } from '@/utils/assetUrl';
import { RESTAURANT_INFO } from '@/utils/restaurantInfo';
import { cn } from '@/utils/cn';
import type { Role } from '@/utils/apiTypes';

const dropdownLink = 'block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'px-3 py-1.5 rounded-lg text-sm font-medium transition',
    isActive ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  );

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.full_name || 'Người dùng';
  const roleName = (profile?.role || user?.role || '') as Role | '';
  // đặt bàn trực tuyến chỉ dành cho Khách và Khách hàng (SRS bảng 3-1); thực đơn thì ai cũng xem được
  const canBook = !isAuthenticated || roleName === 'CUSTOMER';

  const navLinks = (
    <>
      <NavLink to="/menu" className={navLinkClass}>
        Thực đơn
      </NavLink>
      {canBook && (
        <NavLink to="/reservations" className={navLinkClass}>
          Đặt bàn
        </NavLink>
      )}
    </>
  );

  return (
    // thanh điều hướng trên cùng: tên nhà hàng, thực đơn, đặt bàn, đăng nhập và đăng ký
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="flex items-center gap-3 group min-w-0">
            <div className="size-10 shrink-0 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-sm transition group-hover:bg-amber-700">
              <UtensilsCrossed className="size-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 truncate">{RESTAURANT_INFO.name}</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1" aria-label="Điều hướng chính">
            {navLinks}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-sm font-medium text-slate-700 focus:outline-none"
              >
                <div className="size-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={assetUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-4" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-bold leading-none text-slate-800">{displayName}</span>
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-0.5">
                    <Shield className="size-2.5" />
                    <span>{roleName ? ROLE_LABELS[roleName] : ''}</span>
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    {roleName === 'CUSTOMER' ? (
                      <>
                        <Link to="/account/profile" onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                          Thông tin tài khoản
                        </Link>
                        <Link to="/account/reservations" onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                          Lịch sử đặt bàn
                        </Link>
                        <Link to="/account/invoices" onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                          Lịch sử hóa đơn
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to={roleHomePath(roleName)} onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                          {roleHomeLabel(roleName)}
                        </Link>
                        <Link to="/account/profile" onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                          Thông tin cá nhân
                        </Link>
                      </>
                    )}
                    <Link to="/account/profile#doi-mat-khau" onClick={() => setIsDropdownOpen(false)} className={dropdownLink}>
                      Đổi mật khẩu
                    </Link>
                    <div className="h-px bg-slate-100 my-1"></div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <LogIn className="size-4" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                <span>Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* điện thoại: hàng điều hướng riêng vì không đủ chỗ cạnh logo */}
      <nav className="sm:hidden flex items-center gap-1 border-t px-4 py-1.5" aria-label="Điều hướng chính">
        {navLinks}
      </nav>
    </header>
  );
}
