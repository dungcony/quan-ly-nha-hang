import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Check, X, LogIn } from 'lucide-react';
import {
  reservationApi,
  type ReservationCheckInResult,
  type ReservationSearchQuery,
  type ReservationSummary,
} from '@/api/reservationApi';
import Modal from '@/components/ui/Modal';
import FormField from '@/components/ui/FormField';
import Pagination from '@/components/ui/Pagination';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnDanger, btnPrimary, btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getFormErrorMessage } from '@/utils/apiError';
import { formatDateTime } from '@/utils/format';
import { RESERVATION_STATUS_LABELS, TABLE_STATUS_LABELS, ZONE_LABELS } from '@/utils/labels';
import type { ReservationStatus } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

const STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  PENDING: 'amber',
  CONFIRMED: 'blue',
  CHECKED_IN: 'green',
  CANCELLED: 'slate',
  NO_SHOW: 'red',
};

// thao tác đang mở hộp thoại: xác nhận chọn bàn, hủy/từ chối nhập lý do, nhận bàn
type Action = { kind: 'confirm' | 'cancel' | 'checkin'; reservation: ReservationSummary } | null;

interface ReservationManagerProps {
  // gọi sau khi nhận bàn thành công, Phục vụ dùng để chuyển sang màn gọi món
  onCheckedIn?: (result: ReservationCheckInResult) => void;
}

export default function ReservationManager({ onCheckedIn }: ReservationManagerProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState<ReservationSearchQuery>({});
  const [draft, setDraft] = useState({ keyword: '', code: '', date: '', status: '' });
  const [page, setPage] = useState(1);

  const [viewingId, setViewingId] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [tableId, setTableId] = useState('');
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['reservations', filters, page],
    queryFn: () =>
      reservationApi
        .search({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'reserved_at', sort_order: 'asc' })
        .then((res) => res.data),
    placeholderData: keepPreviousData,
    // làm tươi 30 giây để thấy yêu cầu đặt bàn mới của khách
    refetchInterval: 30_000,
    staleTime: 0,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['reservation', viewingId],
    queryFn: () => reservationApi.get(viewingId as string).then((res) => res.data),
    enabled: viewingId !== null,
  });

  // bàn đủ chỗ trong khung giờ, chỉ cần khi xác nhận hoặc đổi bàn lúc nhận
  const needsTables = action?.kind === 'confirm' || action?.kind === 'checkin';
  const {
    data: availableTables,
    isLoading: isTablesLoading,
    isError: isTablesError,
    error: tablesError,
  } = useQuery({
    queryKey: ['reservation-tables', action?.reservation.id],
    queryFn: () => reservationApi.availableTables(action!.reservation.id).then((res) => res.data),
    enabled: needsTables && action !== null,
    // bàn trống thay đổi liên tục nên mỗi lần mở hộp thoại phải lấy lại
    staleTime: 0,
    gcTime: 0,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    queryClient.invalidateQueries({ queryKey: ['reservation'] });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  const closeAction = () => {
    setAction(null);
    setTableId('');
    setReason('');
    setActionError(null);
  };

  const confirmMutation = useMutation({
    mutationFn: ({ id, table }: { id: string; table: string }) => reservationApi.confirm(id, table),
    onSuccess: () => {
      toast.success('Đã xác nhận đặt bàn');
      closeAction();
      refresh();
    },
    onError: (err) => {
      setActionError(getFormErrorMessage(err, 'Không xác nhận được đặt bàn'));
      refresh();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => reservationApi.rejectOrCancel(id, text),
    onSuccess: () => {
      toast.success('Đã hủy đặt bàn');
      closeAction();
      refresh();
    },
    onError: (err) => setActionError(getFormErrorMessage(err, 'Không hủy được đặt bàn')),
  });

  const checkInMutation = useMutation({
    mutationFn: ({ id, table }: { id: string; table?: string }) => reservationApi.checkIn(id, table),
    onSuccess: (res) => {
      toast.success('Đã nhận bàn, đơn hàng đã được mở');
      closeAction();
      refresh();
      onCheckedIn?.(res.data);
    },
    onError: (err) => {
      setActionError(getFormErrorMessage(err, 'Không nhận bàn được'));
      refresh();
    },
  });

  const isSubmitting = confirmMutation.isPending || cancelMutation.isPending || checkInMutation.isPending;

  const submitAction = (e: FormEvent) => {
    e.preventDefault();
    if (!action) return;
    setActionError(null);
    const id = action.reservation.id;
    if (action.kind === 'confirm') confirmMutation.mutate({ id, table: tableId });
    if (action.kind === 'cancel') cancelMutation.mutate({ id, text: reason.trim() });
    if (action.kind === 'checkin') checkInMutation.mutate({ id, table: tableId || undefined });
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      keyword: draft.keyword.trim() || undefined,
      code: draft.code.trim() || undefined,
      date: draft.date || undefined,
      status: (draft.status as ReservationStatus) || undefined,
    });
  };

  const actionTitle =
    action?.kind === 'confirm'
      ? 'Xác nhận đặt bàn'
      : action?.kind === 'checkin'
        ? 'Nhận bàn cho khách'
        : action?.reservation.status === 'PENDING'
          ? 'Từ chối đặt bàn'
          : 'Hủy đặt bàn';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-xl font-bold">Quản lý đặt bàn</h2>
        <p className="mt-1 text-sm text-slate-500">Xác nhận, từ chối, hủy và nhận bàn cho khách đã đặt</p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="min-w-48 flex-1">
          <input
            className={inputClass}
            placeholder="Tên khách hoặc số điện thoại..."
            value={draft.keyword}
            onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
          />
        </div>
        <input
          className={`${inputClass} w-36`}
          placeholder="Mã đặt bàn"
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value })}
        />
        <input
          className={`${inputClass} w-40`}
          type="date"
          value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })}
        />
        <select className={`${inputClass} w-44`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
          <option value="">Mọi trạng thái</option>
          {(Object.keys(RESERVATION_STATUS_LABELS) as ReservationStatus[]).map((s) => (
            <option key={s} value={s}>
              {RESERVATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>
          <Search className="size-4" />
          Tìm
        </button>
      </form>

      {/* BE chỉ mặc định lấy hôm nay khi chưa có tiêu chí nào; chọn trạng thái, ngày, mã hoặc từ khóa thì tìm trên mọi ngày */}
      {!Object.values(filters).some(Boolean) && (
        <p className="border-b border-slate-200 bg-amber-50 px-6 py-2 text-xs text-amber-800">
          Đang hiển thị đặt bàn của hôm nay. Chọn trạng thái, ngày, mã hoặc từ khóa để xem các ngày khác.
        </p>
      )}

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách đặt bàn." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message={
            Object.values(filters).some(Boolean)
              ? 'Không tìm thấy đặt bàn nào thỏa mãn tiêu chí tìm kiếm.'
              : 'Hôm nay chưa có đặt bàn nào.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Mã</th>
                <th className="px-6 py-3">Khách</th>
                <th className="px-6 py-3">Giờ hẹn</th>
                <th className="px-6 py-3">Số khách</th>
                <th className="px-6 py-3">Bàn</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs">{r.code}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium">{r.guest_name}</div>
                    <div className="text-xs text-slate-500">{r.phone}</div>
                  </td>
                  <td className="px-6 py-3">{formatDateTime(r.reserved_at)}</td>
                  <td className="px-6 py-3">{r.guest_count}</td>
                  <td className="px-6 py-3">{r.table_name ?? '—'}</td>
                  <td className="px-6 py-3">
                    <Badge tone={STATUS_TONE[r.status]}>{RESERVATION_STATUS_LABELS[r.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right">
                    <button type="button" className={iconBtn} title="Chi tiết" onClick={() => setViewingId(r.id)}>
                      <Eye className="size-4" />
                    </button>
                    {r.status === 'PENDING' && (
                      <button
                        type="button"
                        className={`${iconBtn} hover:text-emerald-600`}
                        title="Xác nhận và gán bàn"
                        onClick={() => setAction({ kind: 'confirm', reservation: r })}
                      >
                        <Check className="size-4" />
                      </button>
                    )}
                    {r.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        className={`${iconBtn} hover:text-blue-600`}
                        title="Nhận bàn"
                        onClick={() => setAction({ kind: 'checkin', reservation: r })}
                      >
                        <LogIn className="size-4" />
                      </button>
                    )}
                    {(r.status === 'PENDING' || r.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        className={`${iconBtn} hover:text-red-600`}
                        title={r.status === 'PENDING' ? 'Từ chối' : 'Hủy đặt bàn'}
                        onClick={() => setAction({ kind: 'cancel', reservation: r })}
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} />

      <Modal open={viewingId !== null} title="Chi tiết đặt bàn" onClose={() => setViewingId(null)}>
        {isDetailLoading || !detail ? (
          <Spinner />
        ) : (
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-slate-500">Mã</dt>
            <dd className="col-span-2 font-mono">{detail.code}</dd>
            <dt className="text-slate-500">Trạng thái</dt>
            <dd className="col-span-2">
              <Badge tone={STATUS_TONE[detail.status]}>{RESERVATION_STATUS_LABELS[detail.status]}</Badge>
            </dd>
            <dt className="text-slate-500">Khách</dt>
            <dd className="col-span-2">
              {detail.guest_name} · {detail.phone}
              {detail.email && <div className="text-slate-500">{detail.email}</div>}
            </dd>
            <dt className="text-slate-500">Thời gian</dt>
            <dd className="col-span-2">
              {formatDateTime(detail.reserved_at)} – {formatDateTime(detail.reserved_end)}
            </dd>
            <dt className="text-slate-500">Số khách</dt>
            <dd className="col-span-2">{detail.guest_count}</dd>
            <dt className="text-slate-500">Khu vực ưa thích</dt>
            <dd className="col-span-2">{detail.preferred_zone ? ZONE_LABELS[detail.preferred_zone] : '—'}</dd>
            <dt className="text-slate-500">Bàn</dt>
            <dd className="col-span-2">
              {detail.table ? `${detail.table.name} (${ZONE_LABELS[detail.table.zone]}, ${detail.table.capacity} ghế)` : '—'}
            </dd>
            <dt className="text-slate-500">Ghi chú</dt>
            <dd className="col-span-2">{detail.note ?? '—'}</dd>
            {detail.cancel_reason && (
              <>
                <dt className="text-slate-500">Lý do hủy</dt>
                <dd className="col-span-2">{detail.cancel_reason}</dd>
              </>
            )}
            <dt className="text-slate-500">Tạo lúc</dt>
            <dd className="col-span-2">{formatDateTime(detail.created_at)}</dd>
          </dl>
        )}
      </Modal>

      <Modal
        open={action !== null}
        title={actionTitle}
        onClose={closeAction}
        size="sm"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={closeAction}>
              Đóng
            </button>
            <button
              type="submit"
              form="reservation-action-form"
              className={action?.kind === 'cancel' ? btnDanger : btnPrimary}
              disabled={isSubmitting || (action?.kind === 'confirm' && !tableId)}
            >
              {isSubmitting ? 'Đang xử lý...' : action?.kind === 'cancel' ? 'Xác nhận hủy' : action?.kind === 'checkin' ? 'Nhận bàn' : 'Xác nhận'}
            </button>
          </>
        }
      >
        <form id="reservation-action-form" onSubmit={submitAction} className="space-y-4 text-slate-800">
          {action && (
            <p className="text-sm text-slate-600">
              {action.reservation.guest_name} · {action.reservation.guest_count} khách · {formatDateTime(action.reservation.reserved_at)}
            </p>
          )}
          {actionError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{actionError}</p>}

          {needsTables && (
            <FormField
              label={action?.kind === 'confirm' ? 'Chọn bàn' : 'Đổi sang bàn khác (không bắt buộc)'}
              required={action?.kind === 'confirm'}
            >
              {isTablesLoading ? (
                <Spinner />
              ) : (
                <select className={inputClass} value={tableId} onChange={(e) => setTableId(e.target.value)} required={action?.kind === 'confirm'}>
                  <option value="">{action?.kind === 'confirm' ? 'Chọn bàn trống' : `Giữ bàn ${action?.reservation.table_name ?? 'đã gán'}`}</option>
                  {availableTables?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {ZONE_LABELS[t.zone]} · {t.capacity} ghế · {TABLE_STATUS_LABELS[t.status]}
                    </option>
                  ))}
                </select>
              )}
              {isTablesError && (
                <span className="mt-1 block text-xs text-red-600">{getFormErrorMessage(tablesError, 'Không tải được danh sách bàn trống.')}</span>
              )}
              {!isTablesLoading && !isTablesError && availableTables?.length === 0 && (
                <span className="mt-1 block text-xs text-red-600">Không còn bàn phù hợp trong khung giờ này.</span>
              )}
            </FormField>
          )}

          {action?.kind === 'cancel' && (
            <FormField label="Lý do" required>
              <textarea
                className={inputClass}
                rows={3}
                required
                maxLength={255}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </FormField>
          )}
        </form>
      </Modal>
    </div>
  );
}
