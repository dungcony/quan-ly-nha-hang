import { useState } from 'react';
import { Download, Filter, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';

export default function AdminReportsPage() {
  const [dateRange, setDateRange] = useState('today');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Báo cáo doanh thu</h2>
          <p className="text-sm text-slate-500 mt-1">Phân tích hoạt động kinh doanh của nhà hàng</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
          >
            <option value="today">Hôm nay</option>
            <option value="week">Tuần này</option>
            <option value="month">Tháng này</option>
            <option value="year">Năm nay</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            <Filter className="h-4 w-4" />
            Lọc
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
          </div>
          <span className="text-sm font-medium text-slate-500">Doanh thu thực tế</span>
          <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">18.450.000 đ</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">+5.2%</span>
          </div>
          <span className="text-sm font-medium text-slate-500">Số đơn hoàn thành</span>
          <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">68 đơn</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">+18.1%</span>
          </div>
          <span className="text-sm font-medium text-slate-500">Khách phục vụ</span>
          <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">142 khách</h4>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">-2.4%</span>
          </div>
          <span className="text-sm font-medium text-slate-500">Trung bình / Bàn</span>
          <h4 className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">271.000 đ</h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ phân bổ (Mockup) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Biểu đồ Doanh thu</h3>
            <span className="text-xs font-medium text-slate-500">Theo giờ</span>
          </div>
          <div className="flex-1 min-h-[300px] flex items-end justify-between gap-2 px-4 pb-4 border-b border-slate-100 relative">
            {/* Các cột mock biểu đồ */}
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 w-full">
                <div 
                  className="w-full bg-amber-200 rounded-t-sm hover:bg-amber-400 transition-colors cursor-pointer relative group"
                  style={{ height: `${Math.max(10, Math.random() * 100)}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded hidden group-hover:block whitespace-nowrap z-10">
                    {Math.floor(Math.random() * 5)}M đ
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-400">{i + 8}h</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top món bán chạy */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Top món bán chạy</h3>
          <div className="space-y-4">
            {[
              { name: 'Phở Bò Tái Nạm', qty: 45, price: '2.925.000' },
              { name: 'Cơm Rang Dưa Bò', qty: 38, price: '2.090.000' },
              { name: 'Sườn Nướng BBQs', qty: 24, price: '3.600.000' },
              { name: 'Trà Đá', qty: 68, price: '340.000' },
              { name: 'Salad Cá Hồi', qty: 15, price: '1.275.000' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">{item.name}</h4>
                    <p className="text-xs text-slate-500">{item.qty} phần</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-amber-700">{item.price} đ</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
