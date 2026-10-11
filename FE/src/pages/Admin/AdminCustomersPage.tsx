import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Eye, Trash2, Lock, Unlock } from 'lucide-react';
import { customerApi } from '@/api/customerApi';
import type { UserSearchQuery, UserSummary } from '@/api/staffApi';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getFormErrorMessage } from '@/utils/apiError';
import { assetUrl } from '@/utils/assetUrl';
import { formatDate, formatDateTime } from '@/utils/format';
import { USER_STATUS_LABELS } from '@/utils/labels';
import type { UserStatus } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

const GENDER_LABELS = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' } as const;

export default function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [filters, setFilters] = useState<UserSearchQuery>({});
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', status: '', verified: '' });
  const [page, setPage] = useState(1);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<UserSummary | null>(null);
  // khóa hoặc mở khóa phải qua bước xác nhận (UC009)
  const [statusChange, setStatusChange] = useState<{ customer: UserSummary; status: UserStatus } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customers', filters, page],
    queryFn: () => customerApi.search({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'created_at', sort_order: 'desc' }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['customer', viewingId],
    queryFn: () => customerApi.get(viewingId as string).then((res) => res.data),
    enabled: viewingId !== null,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customer'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => customerApi.changeStatus(id, status),
    onSuccess: (_res, vars) => {
      toast.success(vars.status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      refresh();
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không đổi được trạng thái tài khoản')),
    onSettled: () => setStatusChange(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa khách hàng');
      refresh();
    },
    // USER_HAS_ACTIVITY: khách còn đặt bàn chờ hoặc đã xác nhận thì không xóa được
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không xóa được khách hàng')),
    onSettled: () => setDeleting(null),
  });

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      name: draft.name.trim() || undefined,
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      status: (draft.status as UserStatus) || undefined,
      email_verified: draft.verified === '' ? undefined : draft.verified === 'true',
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800">Quản lý khách hàng</h2>
        <p className="mt-1 text-sm text-slate-500">Khách hàng tự đăng ký; Quản lý có thể khóa hoặc xóa tài khoản</p>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="min-w-40 flex-1">
          <input
            className={inputClass}
            placeholder="Tìm theo tên..."
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="min-w-40 flex-1">
          <input
            className={inputClass}
            placeholder="Email..."
            value={draft.email}
            onChange={(e) => setDraft({ ...draft, email: e.target.value })}
          />
        </div>
        <input
          className={`${inputClass} w-40`}
          placeholder="Số điện thoại"
          inputMode="numeric"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <select className={`${inputClass} w-44`} value={draft.verified} onChange={(e) => setDraft({ ...draft, verified: e.target.value })}>
          <option value="">Mọi trạng thái email</option>
          <option value="true">Đã xác thực email</option>
          <option value="false">Chưa xác thực email</option>
        </select>
        <select className={`${inputClass} w-40`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
          <option value="">Mọi trạng thái</option>
          {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => (
            <option key={s} value={s}>
              {USER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="submit" className={btnSecondary}>
          <Search className="size-4" />
          Tìm
        </button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách khách hàng." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message={
            Object.values(filters).some((v) => v !== undefined)
              ? 'Không tìm thấy tài khoản nào thỏa mãn tiêu chí tìm kiếm.'
              : 'Chưa có khách hàng nào.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Họ tên</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Điện thoại</th>
                <th className="px-6 py-3">Email xác thực</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((customer) => {
                const locked = customer.status === 'LOCKED';
                return (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">{customer.full_name}</td>
                    <td className="px-6 py-3 text-slate-600">{customer.email}</td>
                    <td className="px-6 py-3 text-slate-600">{customer.phone ?? '—'}</td>
                    <td className="px-6 py-3">
                      <Badge tone={customer.email_verified ? 'green' : 'amber'}>
                        {customer.email_verified ? 'Đã xác thực' : 'Chưa xác thực'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={locked ? 'red' : 'green'}>{USER_STATUS_LABELS[customer.status]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <button type="button" className={iconBtn} onClick={() => setViewingId(customer.id)} aria-label="Xem chi tiết">
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={iconBtn}
                        title={locked ? 'Mở khóa' : 'Khóa tài khoản'}
                        disabled={statusMutation.isPending}
                        onClick={() => setStatusChange({ customer, status: locked ? 'ACTIVE' : 'LOCKED' })}
                      >
                        {locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      </button>
                      <button
                        type="button"
                        className={`${iconBtn} hover:text-red-600`}
                        onClick={() => setDeleting(customer)}
                        aria-label="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} />

      <Modal open={viewingId !== null} title="Thông tin khách hàng" onClose={() => setViewingId(null)} size="md">
        {isDetailLoading || !detail ? (
          <Spinner />
        ) : (
          <div className="space-y-4">
            {detail.avatar_url && (
              <img src={assetUrl(detail.avatar_url)} alt={detail.full_name} className="size-20 rounded-full object-cover" />
            )}
            <dl className="grid grid-cols-3 gap-y-3 text-sm">
              <dt className="text-slate-500">Họ tên</dt>
              <dd className="col-span-2 font-medium text-slate-800">{detail.full_name}</dd>
              <dt className="text-slate-500">Email</dt>
              <dd className="col-span-2 text-slate-800">{detail.email}</dd>
              <dt className="text-slate-500">Điện thoại</dt>
              <dd className="col-span-2 text-slate-800">{detail.phone ?? '—'}</dd>
              <dt className="text-slate-500">Giới tính</dt>
              <dd className="col-span-2 text-slate-800">{detail.gender ? GENDER_LABELS[detail.gender] : '—'}</dd>
              <dt className="text-slate-500">Ngày sinh</dt>
              <dd className="col-span-2 text-slate-800">{formatDate(detail.date_of_birth)}</dd>
              <dt className="text-slate-500">Ngày đăng ký</dt>
              <dd className="col-span-2 text-slate-800">{formatDateTime(detail.created_at)}</dd>
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={statusChange !== null}
        title={statusChange?.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        message={
          statusChange?.status === 'LOCKED'
            ? `Khóa tài khoản "${statusChange.customer.full_name}"? Khách sẽ không đăng nhập được và phiên đang dùng bị chặn ngay.`
            : `Mở khóa tài khoản "${statusChange?.customer.full_name ?? ''}"?`
        }
        confirmLabel={statusChange?.status === 'LOCKED' ? 'Khóa' : 'Mở khóa'}
        danger={statusChange?.status === 'LOCKED'}
        loading={statusMutation.isPending}
        onConfirm={() => statusChange && statusMutation.mutate({ id: statusChange.customer.id, status: statusChange.status })}
        onCancel={() => setStatusChange(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa khách hàng"
        message={`Xóa khách hàng "${deleting?.full_name ?? ''}"? Khách còn đặt bàn đang chờ hoặc đã xác nhận sẽ không xóa được.`}
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
