import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, type RevenuePoint } from '@/api/reportApi';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { btnSecondary, inputClass, labelClass, tableHeadClass } from '@/components/ui/forms';
import { cn } from '@/utils/cn';
import { addDaysIso, formatVnd, todayIso } from '@/utils/format';
import { getErrorMessage } from '@/utils/apiError';

type Granularity = 'daily' | 'monthly';

// khoảng mặc định là 7 ngày gần nhất tính cả hôm nay, theo múi giờ nhà hàng
function defaultRange() {
  return { from: addDaysIso(-6), to: todayIso() };
}

// backend chỉ trả ngày hoặc tháng có hóa đơn; điền thêm các mốc trống bằng 0 để biểu đồ liền mạch
function fillGaps(points: RevenuePoint[], granularity: Granularity, from: string, to: string): RevenuePoint[] {
  const byLabel = new Map(points.map((p) => [pointLabel(p), p]));
  const empty = { invoice_count: 0, subtotal: 0, vat_amount: 0, total_amount: 0 };
  const result: RevenuePoint[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  if (granularity === 'monthly') cursor.setUTCDate(1);
  // chặn vòng lặp quá dài nếu khoảng ngày bất thường
  for (let i = 0; cursor <= end && i < 1000; i++) {
    const iso = cursor.toISOString().slice(0, 10);
    const label = granularity === 'daily' ? iso : iso.slice(0, 7);
    result.push(byLabel.get(label) ?? (granularity === 'daily' ? { date: label, ...empty } : { month: label, ...empty }));
    if (granularity === 'daily') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

function pointLabel(point: RevenuePoint): string {
  return point.date ?? point.month ?? '';
}

function SummaryCard({ title, value, tone }: { title: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-medium text-slate-500">{title}</h3>
      <p className={cn('text-2xl font-bold text-slate-900', tone)}>{value}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [draft, setDraft] = useState(defaultRange);
  const [range, setRange] = useState(defaultRange);

  const [topN, setTopN] = useState(10);
  const [appliedTopN, setAppliedTopN] = useState(10);

  const missingDate = !draft.from || !draft.to;
  const invalidRange = !missingDate && draft.from > draft.to;
  const invalidTopN = !Number.isInteger(topN) || topN < 1 || topN > 50;

  const revenue = useQuery({
    queryKey: ['report-revenue', granularity, range],
    queryFn: () => {
      const params = { from_date: range.from, to_date: range.to };
      return (granularity === 'daily' ? reportApi.dailyRevenue(params) : reportApi.monthlyRevenue(params)).then((res) => res.data);
    },
  });

  const topDishes = useQuery({
    queryKey: ['report-top-dishes', range, appliedTopN],
    queryFn: () => reportApi.topDishes({ from_date: range.from, to_date: range.to, top_n: appliedTopN }).then((res) => res.data),
  });

  const hasData = (revenue.data?.points.length ?? 0) > 0;
  const points = hasData ? fillGaps(revenue.data!.points, granularity, range.from, range.to) : [];
  const maxTotal = Math.max(...points.map((p) => p.total_amount), 1);
  const maxQuantity = Math.max(...(topDishes.data?.items.map((d) => d.quantity) ?? []), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Báo cáo doanh thu</h2>
          <p className="mt-1 text-sm text-slate-500">Tính trên các hóa đơn đã thanh toán trong khoảng ngày chọn</p>
        </div>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalidRange && !missingDate && !invalidTopN) {
              setRange(draft);
              setAppliedTopN(topN);
            }
          }}
        >
          <div>
            <span className={labelClass}>Loại báo cáo</span>
            <select className={inputClass} value={granularity} onChange={(e) => setGranularity(e.target.value as Granularity)}>
              <option value="daily">Doanh thu theo ngày</option>
              <option value="monthly">Doanh thu theo tháng</option>
            </select>
          </div>
          <div>
            <span className={labelClass}>Từ ngày</span>
            <input
              type="date"
              required
              className={inputClass}
              value={draft.from}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
          </div>
          <div>
            <span className={labelClass}>Đến ngày</span>
            <input
              type="date"
              required
              className={inputClass}
              value={draft.to}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
          </div>
          <div>
            <span className={labelClass}>Số món hiển thị (Top N)</span>
            <input
              type="number"
              min={1}
              max={50}
              step={1}
              className={`${inputClass} w-28`}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            />
          </div>
          <button type="submit" className={btnSecondary} disabled={invalidRange || missingDate || invalidTopN}>
            Xem báo cáo
          </button>
        </form>
      </div>
      {missingDate && <p className="text-sm text-red-600">Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.</p>}
      {invalidRange && <p className="text-sm text-red-600">Ngày bắt đầu không được sau ngày kết thúc.</p>}
      {invalidTopN && <p className="text-sm text-red-600">Số món hiển thị phải là số nguyên từ 1 đến 50.</p>}

      {revenue.isLoading ? (
        <Spinner />
      ) : revenue.isError ? (
        <EmptyState error message={getErrorMessage(revenue.error, 'Không tải được báo cáo doanh thu.')} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Số hóa đơn" value={String(revenue.data?.summary.invoice_count ?? 0)} />
            <SummaryCard title="Doanh thu trước VAT" value={formatVnd(revenue.data?.summary.subtotal)} />
            <SummaryCard title="Tiền VAT" value={formatVnd(revenue.data?.summary.vat_amount)} />
            <SummaryCard title="Tổng doanh thu" value={formatVnd(revenue.data?.summary.total_amount)} tone="text-amber-600" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-800">Doanh thu {granularity === 'daily' ? 'theo ngày' : 'theo tháng'}</h3>
            {!hasData ? (
              <EmptyState message="Không có dữ liệu trong khoảng thời gian đã chọn." />
            ) : (
              <>
                <div className="flex h-56 items-end gap-2 overflow-x-auto pb-1">
                  {points.map((p) => (
                    <div key={pointLabel(p)} className="flex h-full min-w-10 flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[10px] text-slate-500">{formatVnd(p.total_amount)}</span>
                      <div
                        className="w-full rounded-t bg-amber-500"
                        style={{ height: `${Math.max((p.total_amount / maxTotal) * 100, 2)}%` }}
                        title={`${pointLabel(p)}: ${formatVnd(p.total_amount)}`}
                      />
                      <span className="text-[10px] text-slate-500">{pointLabel(p)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="px-4 py-2">{granularity === 'daily' ? 'Ngày' : 'Tháng'}</th>
                        <th className="px-4 py-2">Số hóa đơn</th>
                        <th className="px-4 py-2">Trước VAT</th>
                        <th className="px-4 py-2">VAT</th>
                        <th className="px-4 py-2">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {points.map((p) => (
                        <tr key={pointLabel(p)}>
                          <td className="px-4 py-2">{pointLabel(p)}</td>
                          <td className="px-4 py-2">{p.invoice_count}</td>
                          <td className="px-4 py-2">{formatVnd(p.subtotal)}</td>
                          <td className="px-4 py-2">{formatVnd(p.vat_amount)}</td>
                          <td className="px-4 py-2 font-medium">{formatVnd(p.total_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-slate-800">Món bán chạy (top {appliedTopN})</h3>
        {topDishes.isLoading ? (
          <Spinner />
        ) : topDishes.isError ? (
          <EmptyState error message={getErrorMessage(topDishes.error, 'Không tải được món bán chạy.')} />
        ) : !topDishes.data || topDishes.data.items.length === 0 ? (
          <EmptyState message="Không có dữ liệu trong khoảng thời gian đã chọn." />
        ) : (
          <ol className="space-y-3">
            {topDishes.data.items.map((dish, index) => (
              <li key={dish.dish_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-right font-bold text-slate-400">{index + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-800">{dish.dish_name}</span>
                    <span className="text-slate-500">
                      {dish.quantity} phần · {formatVnd(dish.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(dish.quantity / maxQuantity) * 100}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
