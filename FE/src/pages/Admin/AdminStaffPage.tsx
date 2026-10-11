import { useState, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Eye, Trash2, Lock, Unlock } from 'lucide-react';
import {
  staffApi,
  type StaffCreatePayload,
  type StaffUpdatePayload,
  type UserSearchQuery,
  type UserSummary,
} from '@/api/staffApi';
import { useAuth } from '@/context/AuthContext';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormField from '@/components/ui/FormField';
import Pagination from '@/components/ui/Pagination';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnPrimary, btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getFormErrorMessage } from '@/utils/apiError';
import { assetUrl } from '@/utils/assetUrl';
import { formatDate, formatDateTime, todayIso } from '@/utils/format';
import { ROLE_LABELS, STAFF_ROLES, USER_STATUS_LABELS } from '@/utils/labels';
import type { Gender, Role, UserStatus } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

interface StaffForm {
  full_name: string;
  email: string;
  role: Role;
  phone: string;
  gender: Gender | '';
  date_of_birth: string;
  password: string;
  status: UserStatus;
}

const EMPTY_FORM: StaffForm = {
  full_name: '',
  email: '',
  role: 'WAITER',
  phone: '',
  gender: '',
  date_of_birth: '',
  password: '',
  status: 'ACTIVE',
};

const GENDER_LABELS: Record<Gender, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };

export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();

  const [filters, setFilters] = useState<UserSearchQuery>({});
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', role: '', status: '' });
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<UserSummary | null>(null);
  // khóa hoặc mở khóa phải qua bước xác nhận (UC008)
  const [statusChange, setStatusChange] = useState<{ staff: UserSummary; status: UserStatus } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['staff', filters, page],
    queryFn: () => staffApi.search({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'full_name', sort_order: 'asc' }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['staff'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const common: StaffUpdatePayload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        gender: form.gender || undefined,
        date_of_birth: form.date_of_birth || undefined,
      };
      const res = editingId
        ? await staffApi.update(editingId, common)
        : await staffApi.create({ ...common, password: form.password, status: form.status } as StaffCreatePayload);
      if (avatarFile) await staffApi.uploadAvatar(res.data.id, avatarFile);
      return res;
    },
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật nhân viên' : 'Đã thêm nhân viên');
      setIsFormOpen(false);
      refresh();
    },
    onError: (err) => setFormError(getFormErrorMessage(err, 'Không lưu được nhân viên')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) => staffApi.changeStatus(id, status),
    onSuccess: (_res, vars) => {
      toast.success(vars.status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      refresh();
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không đổi được trạng thái tài khoản')),
    onSettled: () => setStatusChange(null),
  });

  const detailQuery = useQuery({
    queryKey: ['staff-detail', detailId],
    queryFn: () => staffApi.get(detailId as string).then((res) => res.data),
    enabled: !!detailId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa nhân viên');
      refresh();
    },
    // USER_HAS_ACTIVITY: nhân viên đã có đơn hoặc hóa đơn thì chỉ khóa được
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không xóa được nhân viên')),
    onSettled: () => setDeleting(null),
  });

  const openForm = async (staff?: UserSummary) => {
    setFormError(null);
    setAvatarFile(null);
    setEditingId(staff?.id ?? null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
    if (!staff) return;
    try {
      // danh sách không có ngày sinh và giới tính nên đọc chi tiết để sửa
      const detail = (await staffApi.get(staff.id)).data;
      setForm({
        full_name: detail.full_name,
        email: detail.email,
        role: detail.role,
        phone: detail.phone ?? '',
        gender: detail.gender ?? '',
        date_of_birth: detail.date_of_birth ?? '',
        password: '',
        status: detail.status,
      });
    } catch (err) {
      setIsFormOpen(false);
      toast.error(getFormErrorMessage(err, 'Không tải được thông tin nhân viên'));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    saveMutation.mutate();
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      name: draft.name.trim() || undefined,
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      role: (draft.role as Role) || undefined,
      status: (draft.status as UserStatus) || undefined,
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý nhân sự</h2>
          <p className="mt-1 text-sm text-slate-500">Tài khoản và phân quyền nhân viên</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => openForm()}>
          <Plus className="size-4" />
          Thêm nhân viên
        </button>
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
        <div className="min-w-32 flex-1">
          <input
            className={inputClass}
            placeholder="Điện thoại..."
            inputMode="numeric"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
        </div>
        <select className={`${inputClass} w-40`} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
          <option value="">Mọi vai trò</option>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
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
        <EmptyState error message="Không tải được danh sách nhân viên." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message={
            Object.values(filters).some(Boolean)
              ? 'Không tìm thấy tài khoản nào thỏa mãn tiêu chí tìm kiếm.'
              : 'Chưa có nhân viên nào.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Họ tên</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Vai trò</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((staff) => {
                const isSelf = staff.id === user?.id;
                const locked = staff.status === 'LOCKED';
                return (
                  <tr key={staff.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {staff.full_name}
                      {isSelf && <span className="ml-2 text-xs text-slate-400">(bạn)</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{staff.email}</td>
                    <td className="px-6 py-3">
                      <Badge tone={staff.role === 'MANAGER' ? 'blue' : 'slate'}>{ROLE_LABELS[staff.role]}</Badge>
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={locked ? 'red' : 'green'}>{USER_STATUS_LABELS[staff.status]}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <button
                        type="button"
                        className={iconBtn}
                        title={locked ? 'Mở khóa' : 'Khóa tài khoản'}
                        disabled={isSelf || statusMutation.isPending}
                        onClick={() => setStatusChange({ staff, status: locked ? 'ACTIVE' : 'LOCKED' })}
                      >
                        {locked ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                      </button>
                      <button type="button" className={iconBtn} onClick={() => setDetailId(staff.id)} aria-label="Xem chi tiết" title="Xem chi tiết">
                        <Eye className="size-4" />
                      </button>
                      <button type="button" className={iconBtn} onClick={() => openForm(staff)} aria-label="Sửa">
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={`${iconBtn} hover:text-red-600`}
                        disabled={isSelf}
                        onClick={() => setDeleting(staff)}
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

      <Modal
        open={isFormOpen}
        title={editingId ? 'Sửa nhân viên' : 'Thêm nhân viên'}
        onClose={() => setIsFormOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setIsFormOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="staff-form" className={btnPrimary} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="staff-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError}</p>}
          <FormField label="Họ tên" required>
            <input
              className={inputClass}
              required
              maxLength={255}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </FormField>
          <FormField label="Email" required>
            <input
              className={inputClass}
              type="email"
              required
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </FormField>
          <FormField label="Vai trò" required>
            <select className={inputClass} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Số điện thoại" hint="10 chữ số">
            <input
              className={inputClass}
              inputMode="numeric"
              pattern="\d{10}"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </FormField>
          <FormField label="Giới tính">
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender | '' })}
            >
              <option value="">Không chọn</option>
              {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABELS[g]}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Ngày sinh">
            <input
              className={inputClass}
              type="date"
              max={todayIso()}
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </FormField>
          {!editingId && (
            <>
              <FormField label="Mật khẩu" required hint="Gồm cả chữ và số; nhân viên dùng chức năng đổi mật khẩu sau khi đăng nhập">
                <input
                  className={inputClass}
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormField>
              <FormField label="Trạng thái" required>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as UserStatus })}
                >
                  {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {USER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </FormField>
            </>
          )}
          <FormField label="Ảnh đại diện" hint="png, gif, jpg hoặc jpeg">
            <input
              className={inputClass}
              type="file"
              accept="image/png,image/gif,image/jpeg"
              onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
            />
          </FormField>
        </form>
      </Modal>

      <Modal open={!!detailId} title="Chi tiết nhân viên" onClose={() => setDetailId(null)}>
        {detailQuery.isLoading ? (
          <Spinner />
        ) : detailQuery.isError || !detailQuery.data ? (
          <EmptyState error message="Không tải được chi tiết nhân viên." />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {detailQuery.data.avatar_url ? (
                <img src={assetUrl(detailQuery.data.avatar_url)} alt="Ảnh đại diện" className="size-16 rounded-full object-cover" />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-700">
                  {detailQuery.data.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-bold text-slate-800">{detailQuery.data.full_name}</p>
                <p className="text-sm text-slate-500">{detailQuery.data.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Vai trò</dt>
                <dd>
                  <Badge tone={detailQuery.data.role === 'MANAGER' ? 'blue' : 'slate'}>{ROLE_LABELS[detailQuery.data.role]}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Trạng thái</dt>
                <dd>
                  <Badge tone={detailQuery.data.status === 'LOCKED' ? 'red' : 'green'}>{USER_STATUS_LABELS[detailQuery.data.status]}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Điện thoại</dt>
                <dd className="font-medium text-slate-800">{detailQuery.data.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Giới tính</dt>
                <dd className="font-medium text-slate-800">{detailQuery.data.gender ? GENDER_LABELS[detailQuery.data.gender] : '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày sinh</dt>
                <dd className="font-medium text-slate-800">{formatDate(detailQuery.data.date_of_birth)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Ngày tạo</dt>
                <dd className="font-medium text-slate-800">{formatDateTime(detailQuery.data.created_at)}</dd>
              </div>
              {detailQuery.data.must_change_password && (
                <div className="col-span-2 rounded-lg bg-amber-50 p-3 text-amber-800">Chưa đổi mật khẩu lần đầu.</div>
              )}
            </dl>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={statusChange !== null}
        title={statusChange?.status === 'LOCKED' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        message={
          statusChange?.status === 'LOCKED'
            ? `Khóa tài khoản "${statusChange.staff.full_name}"? Nhân viên sẽ không đăng nhập được và phiên đang dùng bị chặn ngay.`
            : `Mở khóa tài khoản "${statusChange?.staff.full_name ?? ''}"?`
        }
        confirmLabel={statusChange?.status === 'LOCKED' ? 'Khóa' : 'Mở khóa'}
        danger={statusChange?.status === 'LOCKED'}
        loading={statusMutation.isPending}
        onConfirm={() => statusChange && statusMutation.mutate({ id: statusChange.staff.id, status: statusChange.status })}
        onCancel={() => setStatusChange(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa nhân viên"
        message={`Xóa nhân viên "${deleting?.full_name ?? ''}"? Nhân viên đã có đơn hàng hoặc hóa đơn chỉ khóa được, không xóa được.`}
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
