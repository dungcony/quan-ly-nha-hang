import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { tableApi } from '@/api/tableApi';
import { orderApi } from '@/api/orderApi';
import { useAuth } from '@/context/AuthContext';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { getFormErrorMessage } from '@/utils/apiError';
import { TABLE_STATUS_LABELS, ZONE_LABELS } from '@/utils/labels';
import { cn } from '@/utils/cn';
import type { TableResponse, TableStatus, TableZone } from '@/utils/apiTypes';

const STATUS_STYLE: Record<TableStatus, string> = {
  AVAILABLE: 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20',
  RESERVED: 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20',
  OCCUPIED: 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20',
  OUT_OF_SERVICE: 'border-slate-600 bg-slate-800/60 opacity-60',
};

const STATUS_DOT: Record<TableStatus, string> = {
  AVAILABLE: 'bg-emerald-400',
  RESERVED: 'bg-amber-400',
  OCCUPIED: 'bg-blue-400',
  OUT_OF_SERVICE: 'bg-slate-500',
};

const filterInput =
  'rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500';

export default function PosTablesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isCashier = user?.role === 'CASHIER';

  // bộ lọc tìm bàn (UC007): tên, khu vực, trạng thái, sức chứa tối thiểu
  const [filterName, setFilterName] = useState('');
  const [filterZone, setFilterZone] = useState<TableZone | ''>('');
  const [filterStatus, setFilterStatus] = useState<TableStatus | ''>('');
  const [filterMinCapacity, setFilterMinCapacity] = useState('');
  const hasFilters = !!(filterName || filterZone || filterStatus || filterMinCapacity);

  // làm tươi 10 giây để thấy bàn vừa được đặt hoặc vừa thanh toán
  const { data, isLoading, isError } = useQuery({
    queryKey: ['tables', 'pos', filterName, filterZone, filterStatus, filterMinCapacity],
    queryFn: () =>
      tableApi
        .searchTables({
          name: filterName.trim() || undefined,
          zone: filterZone || undefined,
          status: filterStatus || undefined,
          min_capacity: filterMinCapacity ? Number(filterMinCapacity) : undefined,
          page_size: 100,
          sort_by: 'name',
          sort_order: 'asc',
        })
        .then((res) => res.data.items),
    refetchInterval: 10_000,
    staleTime: 0,
  });

  const handleSelect = async (table: TableResponse) => {
    if (table.status === 'OUT_OF_SERVICE') {
      toast.error(`Bàn ${table.name} đang tạm khóa.`);
      return;
    }

    if (isCashier) {
      if (table.status !== 'OCCUPIED') {
        toast.error(`Bàn ${table.name} chưa có đơn cần thanh toán.`);
        return;
      }
      try {
        // tìm đơn đang mở của bàn để vào màn thanh toán
        const res = await orderApi.search({ status: 'OPEN', table_id: table.id, page_size: 1 });
        const order = res.data.items[0];
        if (order) navigate(`/pos/payment/${order.id}`);
        else toast.error(`Không tìm thấy đơn đang mở của bàn ${table.name}.`);
      } catch (err) {
        toast.error(getFormErrorMessage(err, 'Không tải được đơn của bàn'));
      }
      return;
    }

    if (table.status === 'RESERVED') {
      toast.error(`Bàn ${table.name} đã được đặt trước. Nhận bàn ở mục Đặt bàn khi khách đến.`);
      return;
    }
    navigate(`/pos/order/${table.id}`);
  };

  // gom bàn theo khu vực để dễ tìm
  const grouped = (data ?? []).reduce<Partial<Record<TableZone, TableResponse[]>>>((acc, table) => {
    (acc[table.zone] ??= []).push(table);
    return acc;
  }, {});
  const zones = (Object.keys(ZONE_LABELS) as TableZone[]).filter((z) => grouped[z]?.length);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Sơ đồ bàn</h2>
          <p className="mt-1 text-sm text-slate-400">
            {isCashier ? 'Chọn bàn đang phục vụ để thanh toán' : 'Chọn bàn để mở đơn hoặc gọi thêm món'}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-slate-300">
          {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={cn('size-2.5 rounded-full', STATUS_DOT[s])} />
              {TABLE_STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          className={filterInput}
          placeholder="Tìm theo tên bàn..."
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />
        <select className={filterInput} value={filterZone} onChange={(e) => setFilterZone(e.target.value as TableZone | '')}>
          <option value="">Mọi khu vực</option>
          {(Object.keys(ZONE_LABELS) as TableZone[]).map((z) => (
            <option key={z} value={z}>
              {ZONE_LABELS[z]}
            </option>
          ))}
        </select>
        <select className={filterInput} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TableStatus | '')}>
          <option value="">Mọi trạng thái</option>
          {(Object.keys(TABLE_STATUS_LABELS) as TableStatus[]).map((st) => (
            <option key={st} value={st}>
              {TABLE_STATUS_LABELS[st]}
            </option>
          ))}
        </select>
        <input
          className={cn(filterInput, 'w-44')}
          type="number"
          min={1}
          placeholder="Sức chứa tối thiểu"
          value={filterMinCapacity}
          onChange={(e) => setFilterMinCapacity(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Spinner label="Đang tải sơ đồ bàn..." />
      ) : isError ? (
        <EmptyState error message="Không tải được sơ đồ bàn." />
      ) : zones.length === 0 ? (
        <EmptyState message={hasFilters ? 'Không tìm thấy bàn nào thỏa mãn tiêu chí tìm kiếm.' : 'Chưa có bàn nào.'} />
      ) : (
        <div className="space-y-8">
          {zones.map((zone) => (
            <section key={zone}>
              <h3 className="mb-3 border-b border-slate-700 pb-2 text-sm font-semibold uppercase tracking-wider text-amber-500">
                {ZONE_LABELS[zone]}
                <span className="ml-2 font-normal normal-case text-slate-400">({grouped[zone]?.length} bàn)</span>
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {grouped[zone]?.map((table) => (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => handleSelect(table)}
                    className={cn(
                      'flex min-h-24 flex-col justify-between rounded-xl border p-4 text-left transition-colors',
                      STATUS_STYLE[table.status]
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-lg font-bold text-slate-100">{table.name}</span>
                      <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', STATUS_DOT[table.status])} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {table.capacity}
                      </span>
                      <span>{TABLE_STATUS_LABELS[table.status]}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
