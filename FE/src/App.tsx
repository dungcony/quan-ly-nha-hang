import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/routes/ProtectedRoute';
import GuestOrCustomerRoute from '@/routes/GuestOrCustomerRoute';

// Layouts
import CustomerLayout from '@/layouts/CustomerLayout';
import AccountLayout from '@/layouts/AccountLayout';
import AdminLayout from '@/layouts/AdminLayout';
import PosLayout from '@/layouts/PosLayout';
import KitchenLayout from '@/layouts/KitchenLayout';

// Customer Pages
import HomePage from '@/pages/Home/HomePage';
import MenuPage from '@/pages/Home/MenuPage';
import ReservationPage from '@/pages/Home/ReservationPage';
import LoginPage from '@/pages/Auth/LoginPage';
import RegisterPage from '@/pages/Auth/RegisterPage';
import ForgotPasswordPage from '@/pages/Auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/Auth/ResetPasswordPage';
import VerifyEmailPage from '@/pages/Auth/VerifyEmailPage';
import ProfilePage from '@/pages/Profile/ProfilePage';
import MyReservationsPage from '@/pages/Profile/MyReservationsPage';
import MyInvoicesPage from '@/pages/Profile/MyInvoicesPage';

// Admin Pages
import AdminDashboard from '@/pages/Admin/AdminDashboard';
import AdminMenuPage from '@/pages/Admin/AdminMenuPage';
import AdminTablesPage from '@/pages/Admin/AdminTablesPage';
import AdminCategoriesPage from '@/pages/Admin/AdminCategoriesPage';
import AdminStaffPage from '@/pages/Admin/AdminStaffPage';
import AdminCustomersPage from '@/pages/Admin/AdminCustomersPage';
import AdminReservationsPage from '@/pages/Admin/AdminReservationsPage';
import AdminInvoicesPage from '@/pages/Admin/AdminInvoicesPage';
import AdminReportsPage from '@/pages/Admin/AdminReportsPage';

// POS Pages
import PosTablesPage from '@/pages/Pos/PosTablesPage';
import PosOrderPage from '@/pages/Pos/PosOrderPage';
import PosServePage from '@/pages/Pos/PosServePage';
import PosReservationsPage from '@/pages/Pos/PosReservationsPage';
import PosPaymentListPage from '@/pages/Pos/PosPaymentListPage';
import PosPaymentPage from '@/pages/Pos/PosPaymentPage';
import PosInvoicesPage from '@/pages/Pos/PosInvoicesPage';

// Kitchen Pages
import KitchenDashboard from '@/pages/Kitchen/KitchenDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* LUONG KHACH HANG */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route element={<GuestOrCustomerRoute />}>
              <Route path="/reservations" element={<ReservationPage />} />
            </Route>
            
            <Route path="/account" element={<AccountLayout />}>
              <Route index element={<Navigate to="/account/profile" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                <Route path="reservations" element={<MyReservationsPage />} />
                <Route path="invoices" element={<MyInvoicesPage />} />
              </Route>
            </Route>

          </Route>

          {/* LUONG ADMIN */}
          <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="tables" element={<AdminTablesPage />} />
              <Route path="reservations" element={<AdminReservationsPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>

          {/* LUONG POS: Phuc vu va Thu ngan, moi vai tro chi vao man hinh cua minh */}
          <Route element={<ProtectedRoute allowedRoles={['WAITER', 'CASHIER']} />}>
            <Route path="/pos" element={<PosLayout />}>
              <Route index element={<Navigate to="/pos/tables" replace />} />
              <Route path="tables" element={<PosTablesPage />} />

              <Route element={<ProtectedRoute allowedRoles={['WAITER']} />}>
                <Route path="order/:tableId" element={<PosOrderPage />} />
                <Route path="serve" element={<PosServePage />} />
                <Route path="reservations" element={<PosReservationsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['CASHIER']} />}>
                <Route path="payment" element={<PosPaymentListPage />} />
                <Route path="payment/:orderId" element={<PosPaymentPage />} />
                <Route path="invoices" element={<PosInvoicesPage />} />
              </Route>
            </Route>
          </Route>

          {/* LUONG BEP */}
          <Route element={<ProtectedRoute allowedRoles={['CHEF']} />}>
            <Route path="/kitchen" element={<KitchenLayout />}>
              <Route index element={<KitchenDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
