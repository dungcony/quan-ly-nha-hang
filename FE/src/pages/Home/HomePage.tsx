import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { menuApi } from '@/api/menuApi';
import { RESTAURANT_INFO } from '@/utils/restaurantInfo';
import { LayoutDashboard, MonitorPlay, ChefHat } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const isGuestOrCustomer = !user || user.role === 'CUSTOMER';

  // thân trang giới thiệu thực đơn theo danh mục (SRS 3.1)
  const categories = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuApi.getCategories().then((res) => res.data),
  });

  return (
    <div className="flex-1 bg-white">
      {/* Hero Section */}
      <div className="bg-amber-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Chào mừng đến với <span className="text-amber-600">{RESTAURANT_INFO.name}</span>
          </h1>
          <p className="max-w-2xl mt-5 mx-auto text-xl text-slate-500">
            Trải nghiệm ẩm thực tuyệt vời với các món ăn đa dạng, không gian sang trọng và dịch vụ chuyên nghiệp.
          </p>

          {/* Role-based Call to Action */}
          <div className="mt-10 flex justify-center gap-4">
            {isGuestOrCustomer ? (
              <>
                <Link to="/menu" className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 md:text-lg">
                  Xem thực đơn
                </Link>
                <Link to="/reservations" className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-amber-700 bg-amber-100 hover:bg-amber-200 md:text-lg">
                  Đặt bàn ngay
                </Link>
              </>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {/* MANAGER chỉ vào khu quản trị; POS và Bếp dành cho đúng vai trò của chúng */}
                {user.role === 'MANAGER' && (
                  <Link to="/admin" className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-slate-800 hover:bg-slate-900">
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Trang Quản Trị
                  </Link>
                )}
                
                {/* WAITER / CASHIER truy cập POS */}
                {(user.role === 'WAITER' || user.role === 'CASHIER') && (
                  <Link to="/pos" className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <MonitorPlay className="mr-2 h-5 w-5" />
                    Mở POS Bán Hàng
                  </Link>
                )}
                
                {/* CHEF truy cập KDS */}
                {user.role === 'CHEF' && (
                  <Link to="/kitchen" className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
                    <ChefHat className="mr-2 h-5 w-5" />
                    Mở KDS (Nhà Bếp)
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* thực đơn theo danh mục */}
      {isGuestOrCustomer && categories.data && categories.data.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">Thực đơn theo danh mục</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {categories.data.map((category) => (
              <Link
                key={category.id}
                to={`/menu?category=${category.id}`}
                className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-amber-400 hover:shadow-md"
              >
                <h3 className="font-semibold text-slate-900">{category.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{category.dish_count} món</p>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link to="/reservations" className="inline-flex rounded-md bg-amber-600 px-8 py-3 text-base font-medium text-white hover:bg-amber-700">
              Đặt bàn ngay
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
