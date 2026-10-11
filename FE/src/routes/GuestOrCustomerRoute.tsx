import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { roleHomePath } from '@/utils/labels';

// đặt bàn trực tuyến chỉ dành cho Khách và Khách hàng (SRS bảng 3-1); nhân viên được đưa về khu làm việc của mình
export default function GuestOrCustomerRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (user && user.role !== 'CUSTOMER') {
    return <Navigate to={roleHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
