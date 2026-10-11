import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { menuApi, type DishSummaryResponse, type MenuCategoryResponse, type MenuDishQuery } from '@/api/menuApi';
import { assetUrl } from '@/utils/assetUrl';
import { formatVnd } from '@/utils/format';

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategoryResponse[]>([]);
  const [dishes, setDishes] = useState<DishSummaryResponse[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDishes();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [activeCategory, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await menuApi.getCategories();
      if (response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Lỗi khi lấy danh mục:', error);
    }
  };

  const fetchDishes = async () => {
    setIsLoading(true);
    try {
      const params: MenuDishQuery = { page_size: 50 };
      if (activeCategory) params.category_id = activeCategory;
      if (searchQuery) params.name = searchQuery;
      
      const response = await menuApi.getDishes(params);
      if (response.data?.items) {
        setDishes(response.data.items);
      }
    } catch (error) {
      console.error('Lỗi khi lấy món ăn:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner */}
      <div className="bg-amber-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Thực Đơn Nhà Hàng</h1>
        <p className="text-amber-200 max-w-2xl mx-auto text-lg">
          Khám phá hương vị tuyệt hảo từ những nguyên liệu tươi ngon nhất, được chế biến bởi các đầu bếp hàng đầu.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Thanh tìm kiếm & lọc */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm món ăn..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 hide-scrollbar">
            <button
              onClick={() => setActiveCategory('')}
              className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeCategory === '' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeCategory === cat.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({cat.dish_count})
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách món ăn */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500 text-lg">Không tìm thấy món ăn nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {dishes.map((dish) => (
              <div key={dish.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col">
                <div className="aspect-w-4 aspect-h-3 bg-slate-100 relative">
                  {dish.image_url ? (
                    <img src={assetUrl(dish.image_url)} alt={dish.name} className="object-cover w-full h-48" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center bg-slate-200 text-slate-400">
                      Chưa có ảnh
                    </div>
                  )}
                  {dish.status === 'OUT_OF_STOCK' && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-slate-800 text-white px-4 py-1 rounded-full font-bold text-sm">Tạm hết món</span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wider">
                    {dish.category_name}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{dish.name}</h3>
                  <div className="mt-auto flex items-end justify-between">
                    <span className="font-bold text-xl text-slate-900">
                      {formatVnd(dish.price)} <span className="text-sm text-slate-500 font-normal">/ {dish.unit}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
