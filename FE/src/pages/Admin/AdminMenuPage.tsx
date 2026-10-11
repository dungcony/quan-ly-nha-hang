import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdminMenuPage() {
  const [dishes] = useState([
    { id: 1, name: 'Phở Bò Tái Nạm', category: 'Món chính', price: 65000, status: 'AVAILABLE' },
    { id: 2, name: 'Cơm Rang Dưa Bò', category: 'Món chính', price: 55000, status: 'AVAILABLE' },
    { id: 3, name: 'Gà Không Lối Thoát', category: 'Đặc sản', price: 250000, status: 'OUT_OF_STOCK' },
    { id: 4, name: 'Trà Đá', category: 'Đồ uống', price: 5000, status: 'AVAILABLE' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredDishes = dishes.filter(dish => 
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý thực đơn</h2>
          <p className="text-sm text-slate-500 mt-1">Thêm, sửa và cập nhật giá món ăn</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
            <Plus className="h-4 w-4" />
            Thêm món
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Tên món</th>
              <th className="px-6 py-4 font-semibold">Danh mục</th>
              <th className="px-6 py-4 font-semibold">Giá tiền</th>
              <th className="px-6 py-4 font-semibold">Trạng thái</th>
              <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredDishes.length > 0 ? (
              filteredDishes.map((dish) => (
                <tr key={dish.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{dish.name}</td>
                  <td className="px-6 py-4">{dish.category}</td>
                  <td className="px-6 py-4">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dish.price)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      dish.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {dish.status === 'AVAILABLE' ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50 mr-1" title="Chỉnh sửa">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" title="Xóa">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Không tìm thấy món ăn nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
