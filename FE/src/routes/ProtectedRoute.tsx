import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/utils/labels';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // nhân viên còn bị buộc đổi mật khẩu thì chưa vào khu làm việc, đưa tới trang đổi mật khẩu
  if (user?.must_change_password) {
    return <Navigate to="/account/profile#doi-mat-khau" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // đã đăng nhập nhưng sai vai trò thì về khu vực làm việc của chính vai trò đó
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}

