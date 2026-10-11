import { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users] = useState([
    { id: 1, full_name: 'Nguyễn Văn Quản Lý', email: 'manager@restaurant.com', role: 'MANAGER', status: 'ACTIVE' },
    { id: 2, full_name: 'Trần Văn Bếp', email: 'chef@restaurant.com', role: 'CHEF', status: 'ACTIVE' },
    { id: 3, full_name: 'Lê Thị Thu', email: 'cashier@restaurant.com', role: 'CASHIER', status: 'ACTIVE' },
    { id: 4, full_name: 'Phạm Văn Phục Vụ', email: 'waiter@restaurant.com', role: 'WAITER', status: 'ACTIVE' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý nhân sự</h2>
          <p className="text-sm text-slate-500 mt-1">Quản lý tài khoản và phân quyền nhân viên</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
            <Plus className="h-4 w-4" />
            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Họ tên</th>
              <th className="px-6 py-4 font-semibold">Email / Tài khoản</th>
              <th className="px-6 py-4 font-semibold">Vai trò</th>
              <th className="px-6 py-4 font-semibold">Trạng thái</th>
              <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.full_name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'CHEF' ? 'bg-orange-100 text-orange-700' :
                      user.role === 'CASHIER' ? 'bg-green-100 text-green-700' :
                      user.role === 'WAITER' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'ACTIVE' ? 'Hoạt động' : 'Khóa'}
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
                  Không tìm thấy nhân viên nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
