import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { tableApi } from '@/api/tableApi';
import type {
  TableResponse,
  TableZone,
  TableStatus,
  TableCreateRequest,
  TableUpdateRequest,
  ErrorResponse,
} from '@/utils/apiTypes';
import { cn } from '@/utils/cn';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { getErrorMessage } from '@/utils/apiError';
import { TABLE_STATUS_LABELS as STATUS_LABELS, ZONE_LABELS } from '@/utils/labels';

const STATUS_COLORS: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RESERVED: 'bg-amber-100 text-amber-800 border-amber-200',
  OCCUPIED: 'bg-blue-100 text-blue-800 border-blue-200',
  OUT_OF_SERVICE: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function TableManagement() {
  const { user } = useAuth();
  const isManager = user?.role === 'MANAGER';
  const toast = useToast();

  const [tables, setTables] = useState<TableResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter state
  const [filterZone, setFilterZone] = useState<TableZone | ''>('');
  const [filterStatus, setFilterStatus] = useState<TableStatus | ''>('');
  const [filterName, setFilterName] = useState('');
  const [filterMinCapacity, setFilterMinCapacity] = useState('');
  const [deletingTable, setDeletingTable] = useState<TableResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableResponse | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<TableCreateRequest & { status?: TableStatus }>({
    name: '',
    zone: 'INDOOR',
    capacity: 4,
    note: '',
    status: 'AVAILABLE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTables = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Gọi API với page_size lớn để lấy hết sơ đồ bàn
      const res = await tableApi.searchTables({
        name: filterName || undefined,
        zone: (filterZone as TableZone) || undefined,
        status: (filterStatus as TableStatus) || undefined,
        min_capacity: filterMinCapacity ? Number(filterMinCapacity) : undefined,
        page_size: 100,
        sort_by: 'name',
        sort_order: 'asc',
      });
      setTables(res.data.items);
    } catch (err: unknown) {
      setErrorMsg('Không thể tải danh sách bàn. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    // Thực tế có thể thiết lập setInterval ở đây để auto-refresh (polling) sơ đồ bàn mỗi 10s
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [filterZone, filterStatus, filterName, filterMinCapacity]);

  const handleOpenModal = (table?: TableResponse) => {
    setFormError(null);
    if (table) {
      setEditingTable(table);
      setFormData({
        name: table.name,
        zone: table.zone,
        capacity: table.capacity,
        note: table.note || '',
        status: table.status,
      });
    } else {
      setEditingTable(null);
      setFormData({
        name: '',
        zone: 'INDOOR',
        capacity: 4,
        note: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTable(null);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingTable) {
        const updateData: TableUpdateRequest = {
          name: formData.name,
          zone: formData.zone,
          capacity: formData.capacity,
          note: formData.note,
          status: formData.status,
        };
        await tableApi.updateTable(editingTable.id, updateData);
      } else {
        const createData: TableCreateRequest = {
          name: formData.name,
          zone: formData.zone,
          capacity: formData.capacity,
          note: formData.note,
        };
        await tableApi.createTable(createData);
      }
      toast.success(editingTable ? 'Đã cập nhật bàn' : 'Đã thêm bàn');
      handleCloseModal();
      fetchTables();
    } catch (err: unknown) {
      const errorData = err as ErrorResponse;
      if (errorData?.error?.fields && errorData.error.fields.length > 0) {
        setFormError(errorData.error.fields.map((f) => f.message).join('. '));
      } else {
        setFormError(errorData?.error?.message || 'Có lỗi xảy ra khi lưu thông tin bàn.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!deletingTable) return;
    setIsDeleting(true);
    try {
      await tableApi.deleteTable(deletingTable.id);
      toast.success(`Đã xóa bàn ${deletingTable.name}`);
      fetchTables();
    } catch (err: unknown) {
      // TABLE_IN_USE: bàn đang phục vụ hoặc còn đặt bàn chưa hoàn tất
      toast.error(getErrorMessage(err, 'Không thể xóa bàn lúc này.'));
    } finally {
      setIsDeleting(false);
      setDeletingTable(null);
    }
  };

  const hasFilters = !!(filterName || filterZone || filterStatus || filterMinCapacity);

  // Gom nhóm bàn theo zone
  const groupedTables = tables.reduce((acc, table) => {
    if (!acc[table.zone]) acc[table.zone] = [];
    acc[table.zone].push(table);
    return acc;
  }, {} as Record<TableZone, TableResponse[]>);

  const zones: TableZone[] = ['INDOOR', 'OUTDOOR', 'VIP_ROOM', 'SECOND_FLOOR'];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-900">Quản lý Sơ đồ Bàn</h2>
          {isManager && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition"
            >
              <Plus className="size-4" />
              <span>Thêm bàn mới</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên bàn..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
            />
          </div>
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value as TableZone | '')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">Tất cả khu vực</option>
            {Object.entries(ZONE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            placeholder="Sức chứa tối thiểu"
            value={filterMinCapacity}
            onChange={(e) => setFilterMinCapacity(e.target.value)}
            className="w-44 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TableStatus | '')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading && tables.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">Đang tải dữ liệu sơ đồ bàn...</div>
      ) : tables.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm shadow-sm">
          {hasFilters ? 'Không tìm thấy bàn nào thỏa mãn tiêu chí tìm kiếm.' : 'Chưa có bàn nào.'}
        </div>
      ) : (
        <div className="space-y-8">
          {zones.map((zone) => {
            const zoneTables = groupedTables[zone];
            if (!zoneTables || zoneTables.length === 0) return null;

            return (
              <div key={zone}>
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs uppercase tracking-wider">
                    {ZONE_LABELS[zone]}
                  </span>
                  <span className="text-sm text-slate-500 font-medium">({zoneTables.length} bàn)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {zoneTables.map((table) => (
                    <div
                      key={table.id}
                      className={cn(
                        "relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md",
                        STATUS_COLORS[table.status]
                      )}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg truncate pr-2">{table.name}</h4>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 px-1.5 py-0.5 rounded bg-white/50 backdrop-blur-sm">
                            {STATUS_LABELS[table.status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium opacity-75">
                          <Users className="size-3.5" />
                          <span>{table.capacity} ghế</span>
                        </div>
                        {table.note && (
                          <p className="text-xs mt-2 line-clamp-2 opacity-70 italic">{table.note}</p>
                        )}
                      </div>

                      {/* nút luôn hiện để dùng được trên màn hình cảm ứng (chỉ dành cho Quản lý) */}
                      {isManager && (
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(table)}
                            className="p-2 bg-white/80 text-slate-700 hover:text-amber-600 rounded-full shadow-sm"
                            aria-label={`Sửa bàn ${table.name}`}
                            title="Sửa bàn"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTable(table)}
                            className="p-2 bg-white/80 text-slate-700 hover:text-red-600 rounded-full shadow-sm"
                            aria-label={`Xóa bàn ${table.name}`}
                            title="Xóa bàn"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deletingTable !== null}
        title="Xóa bàn"
        message={`Xóa bàn "${deletingTable?.name ?? ''}"? Bàn đang phục vụ hoặc còn đặt bàn chưa hoàn tất sẽ không xóa được.`}
        confirmLabel="Xóa"
        danger
        loading={isDeleting}
        onConfirm={handleDeleteTable}
        onCancel={() => setDeletingTable(null)}
      />

      {/* Modal form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">
                {editingTable ? 'Cập nhật bàn ăn' : 'Thêm bàn mới'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span className="text-balance">{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên/Số bàn <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="VD: Bàn 01, VIP 1..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Khu vực <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value as TableZone })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {Object.entries(ZONE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sức chứa <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={50}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Chỉ cho sửa status nếu đang edit, và chỉ đổi giữa AVAILABLE / OUT_OF_SERVICE */}
              {editingTable && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TableStatus })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {editingTable.status === 'RESERVED' || editingTable.status === 'OCCUPIED' ? (
                      <option value={editingTable.status}>{STATUS_LABELS[editingTable.status]} (Không thể sửa tay)</option>
                    ) : (
                      <>
                        <option value="AVAILABLE">Trống (Sẵn sàng)</option>
                        <option value="OUT_OF_SERVICE">Tạm khóa (không nhận khách)</option>
                      </>
                    )}
                  </select>
                  {(editingTable.status === 'RESERVED' || editingTable.status === 'OCCUPIED') && (
                    <p className="mt-1 text-xs text-amber-600">
                      Bàn đang trong phiên phục vụ hoặc có khách đặt trước, không thể ép đổi trạng thái.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
                <textarea
                  rows={2}
                  maxLength={255}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  placeholder="Vị trí góc, gần cửa sổ..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : (editingTable ? 'Lưu thay đổi' : 'Tạo bàn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
