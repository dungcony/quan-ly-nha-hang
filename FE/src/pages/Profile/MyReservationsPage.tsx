import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Eye, MapPin, User, Users, XCircle } from 'lucide-react';
import { myReservationApi } from '@/api/myReservationApi';
import type { ReservationSummary } from '@/api/reservationApi';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { btnSecondary } from '@/components/ui/forms';
import { getErrorMessage } from '@/utils/apiError';
import { formatDateTime } from '@/utils/format';
import { RESERVATION_STATUS_LABELS, ZONE_LABELS } from '@/utils/labels';
import type { ReservationStatus } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

const STATUS_TONE: Record<ReservationStatus, BadgeTone> = {
  PENDING: 'blue',
  CONFIRMED: 'green',
  CHECKED_IN: 'amber',
  CANCELLED: 'red',
  NO_SHOW: 'slate',
};

// UC017: chỉ hủy được khi Chờ xác nhận hoặc Đã xác nhận
const canCancel = (status: ReservationStatus) => status === 'PENDING' || status === 'CONFIRMED';

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<ReservationSummary | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-reservations', page],
    queryFn: () => myReservationApi.getMyReservations({ page, page_size: PAGE_SIZE }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const detail = useQuery({
    queryKey: ['my-reservation', detailId],
    queryFn: () => myReservationApi.getMyReservation(detailId as string).then((res) => res.data),
    enabled: !!detailId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => myReservationApi.cancelMyReservation(id),
    onSuccess: () => {
      toast.success('Đã hủy đặt bàn');
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['my-reservation'] });
    },
    // RESERVATION_CANCEL_TOO_LATE: còn dưới 2 giờ đến giờ hẹn thì phải liên hệ nhà hàng (UC017 luồng 4a)
    onError: (err) => toast.error(getErrorMessage(err, 'Có lỗi xảy ra khi hủy đặt bàn')),
    onSettled: () => setCancelling(null),
  });

  const reservations = data?.items ?? [];
  const detailData = detail.data;

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">Lịch sử đặt bàn</h2>
          <p className="text-sm text-slate-500 mt-1">Danh sách các bàn bạn đã đặt tại nhà hàng</p>
        </div>

        {isLoading ? (
          <Spinner label="Đang tải danh sách đặt bàn..." />
        ) : isError ? (
          <EmptyState error message="Không tải được danh sách đặt bàn. Vui lòng thử lại sau." />
        ) : reservations.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Calendar className="size-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Chưa có lượt đặt bàn nào</h3>
            <p className="text-slate-500 text-sm">Bạn chưa từng đặt bàn bằng tài khoản này.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 p-6">
              {reservations.map((res) => (
                <div key={res.id} className="border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-amber-300 transition-colors bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-sm">{res.code}</span>
                        <Badge tone={STATUS_TONE[res.status]}>{RESERVATION_STATUS_LABELS[res.status]}</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-slate-700">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-slate-400" />
                          <span>{formatDateTime(res.reserved_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="size-4 text-slate-400" />
                          <span>{res.guest_count} người</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-slate-400" />
                          <span>
                            {res.guest_name} ({res.phone})
                          </span>
                        </div>
                        {res.table_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="size-4 text-slate-400" />
                            <span>Bàn {res.table_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto gap-2">
                      <button type="button" className={`${btnSecondary} flex-1 sm:flex-none`} onClick={() => setDetailId(res.id)}>
                        <Eye className="size-4" />
                        Chi tiết
                      </button>
                      {canCancel(res.status) && (
                        <button
                          type="button"
                          onClick={() => setCancelling(res)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="size-4" />
                          Hủy đặt bàn
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination meta={data?.meta} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal open={!!detailId} title="Chi tiết đặt bàn" onClose={() => setDetailId(null)}>
        {detail.isLoading ? (
          <Spinner />
        ) : detail.isError || !detailData ? (
          <EmptyState error message="Không tải được chi tiết đặt bàn." />
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Mã đặt bàn</dt>
              <dd className="font-mono font-bold text-amber-700">{detailData.code}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <Badge tone={STATUS_TONE[detailData.status]}>{RESERVATION_STATUS_LABELS[detailData.status]}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Giờ hẹn</dt>
              <dd className="font-medium text-slate-900">{formatDateTime(detailData.reserved_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Số khách</dt>
              <dd className="font-medium text-slate-900">{detailData.guest_count} người</dd>
            </div>
            <div>
              <dt className="text-slate-500">Người đặt</dt>
              <dd className="font-medium text-slate-900">{detailData.guest_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Điện thoại</dt>
              <dd className="font-medium text-slate-900">{detailData.phone}</dd>
            </div>
            {detailData.email && (
              <div className="col-span-2">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900">{detailData.email}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-500">Khu vực ưu tiên</dt>
              <dd className="font-medium text-slate-900">{detailData.preferred_zone ? ZONE_LABELS[detailData.preferred_zone] : 'Không ưu tiên'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Bàn được gán</dt>
              <dd className="font-medium text-slate-900">{detailData.table ? `${detailData.table.name} (${ZONE_LABELS[detailData.table.zone]})` : 'Chưa gán bàn'}</dd>
            </div>
            {detailData.note && (
              <div className="col-span-2">
                <dt className="text-slate-500">Ghi chú</dt>
                <dd className="italic text-slate-700">{detailData.note}</dd>
              </div>
            )}
            {detailData.cancel_reason && (
              <div className="col-span-2">
                <dt className="text-slate-500">Lý do hủy</dt>
                <dd className="text-red-700">{detailData.cancel_reason}</dd>
              </div>
            )}
          </dl>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelling}
        title="Hủy đặt bàn"
        message={`Bạn có chắc muốn hủy đặt bàn ${cancelling?.code ?? ''} lúc ${cancelling ? formatDateTime(cancelling.reserved_at) : ''}? Chỉ hủy được khi còn ít nhất 2 giờ đến giờ hẹn.`}
        confirmLabel="Hủy đặt bàn"
        danger
        loading={cancelMutation.isPending}
        onConfirm={() => cancelling && cancelMutation.mutate(cancelling.id)}
        onCancel={() => setCancelling(null)}
      />
    </div>
  );
}
