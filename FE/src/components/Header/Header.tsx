import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, LogIn, User, Shield } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { roleHomeLabel, roleHomePath } from '@/utils/labels';

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = profile?.full_name || user?.full_name || 'Người dùng';
  const roleName = profile?.role || user?.role || '';

  return (
    // thanh điều hướng trên cùng
    <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="size-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold shadow-sm transition group-hover:bg-amber-700">
            <UtensilsCrossed className="size-6" />
          </div>
          <div>
            <span className="text-xl font-bold text-slate-900">Restaurant Manager</span>
            <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              Spring Boot + React
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition text-sm font-medium text-slate-700 focus:outline-none"
              >
                <div className="size-7 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="size-4" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <span className="block text-xs font-bold leading-none text-slate-800">{displayName}</span>
                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-0.5">
                    <Shield className="size-2.5" />
                    <span>{roleName}</span>
                  </span>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  ></div>
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    {roleName === 'CUSTOMER' && (
                      <>
                        <Link 
                          to="/account/profile" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                        >
                          Thông tin tài khoản
                        </Link>
                        <Link 
                          to="/account/reservations" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                        >
                          Lịch sử đặt bàn
                        </Link>
                        <Link 
                          to="/account/invoices" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                        >
                          Lịch sử ăn uống
                        </Link>
                        <div className="h-px bg-slate-100 my-1"></div>
                      </>
                    )}
                    {roleName !== 'CUSTOMER' && (
                      <>
                        <Link 
                          to={roleHomePath(roleName)}
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                        >
                          {roleHomeLabel(roleName)}
                        </Link>
                        <Link 
                          to="/account/profile" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                        >
                          Thông tin cá nhân
                        </Link>
                        <div className="h-px bg-slate-100 my-1"></div>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => { setIsDropdownOpen(false); handleLogout(); }}
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
                className="hidden sm:inline-flex px-3.5 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                <span>Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
