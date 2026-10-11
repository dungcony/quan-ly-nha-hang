import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, ImageOff, PauseCircle, PlayCircle } from 'lucide-react';
import { dishApi, type DishPayload, type DishSearchQuery, type DishSummary } from '@/api/dishApi';
import { categoryApi } from '@/api/categoryApi';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormField from '@/components/ui/FormField';
import Pagination from '@/components/ui/Pagination';
import Badge, { type BadgeTone } from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnPrimary, btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getErrorCode, getFormErrorMessage } from '@/utils/apiError';
import { assetUrl } from '@/utils/assetUrl';
import { formatVnd } from '@/utils/format';
import { DISH_STATUS_LABELS } from '@/utils/labels';
import type { DishStatus } from '@/utils/apiTypes';

const PAGE_SIZE = 10;

// ảnh món chỉ nhận png, gif, jpg, jpeg và tối đa 5MB, khớp giới hạn của backend
const IMAGE_TYPES = ['image/png', 'image/gif', 'image/jpeg'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const STATUS_TONE: Record<DishStatus, BadgeTone> = {
  AVAILABLE: 'green',
  OUT_OF_STOCK: 'amber',
  DISCONTINUED: 'slate',
};

interface DishForm {
  name: string;
  category_id: string;
  price: string;
  unit: string;
  description: string;
  prep_time_minutes: string;
  status: DishStatus;
}

const EMPTY_FORM: DishForm = {
  name: '',
  category_id: '',
  price: '',
  unit: '',
  description: '',
  prep_time_minutes: '',
  status: 'AVAILABLE',
};

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // bộ lọc đang áp dụng và bản nháp đang gõ; chỉ áp dụng khi bấm Tìm
  const [filters, setFilters] = useState<DishSearchQuery>({});
  const [draft, setDraft] = useState({ name: '', category_id: '', status: '', min_price: '', max_price: '' });
  const [page, setPage] = useState(1);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DishForm>(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<DishSummary | null>(null);
  // món đã từng được gọi nên không xóa được, gợi ý chuyển sang ngừng bán
  const [discontinuing, setDiscontinuing] = useState<DishSummary | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((res) => res.data),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dishes', filters, page],
    queryFn: () =>
      dishApi.search({ ...filters, page, page_size: PAGE_SIZE, sort_by: 'name', sort_order: 'asc' }).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dishes'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: DishPayload) => {
      const res = editingId ? await dishApi.update(editingId, payload) : await dishApi.create(payload);
      // ảnh tải riêng sau khi món đã có id; ảnh lỗi không được làm mất món vừa lưu
      let imageError: string | null = null;
      if (imageFile) {
        try {
          await dishApi.uploadImage(res.data.id, imageFile);
        } catch (err) {
          imageError = getFormErrorMessage(err, 'Không tải được ảnh');
        }
      }
      return { dish: res.data, imageError };
    },
    onSuccess: ({ dish, imageError }) => {
      refresh();
      if (imageError) {
        // món đã có trong hệ thống nên chuyển form sang chế độ sửa món này để bấm Lưu lại không bị trùng tên
        setEditingId(dish.id);
        setCurrentImage(dish.image_url);
        setImageFile(null);
        setFormError(`Món đã được lưu nhưng ảnh chưa tải lên được: ${imageError}`);
        return;
      }
      toast.success(editingId ? 'Đã cập nhật món' : 'Đã thêm món');
      setIsFormOpen(false);
    },
    onError: (err) => setFormError(getFormErrorMessage(err, 'Không lưu được món ăn')),
  });

  // đổi trạng thái cần gửi đủ các trường nên đọc chi tiết trước rồi cập nhật
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DishStatus }) => {
      const detail = (await dishApi.get(id)).data;
      return dishApi.update(id, {
        name: detail.name,
        category_id: detail.category_id,
        price: detail.price,
        unit: detail.unit,
        description: detail.description ?? undefined,
        prep_time_minutes: detail.prep_time_minutes ?? undefined,
        status,
      });
    },
    onSuccess: (_res, vars) => {
      toast.success(`Đã chuyển món sang "${DISH_STATUS_LABELS[vars.status]}"`);
      refresh();
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không đổi được trạng thái món')),
    onSettled: () => setDiscontinuing(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (dish: DishSummary) => dishApi.remove(dish.id),
    onSuccess: () => {
      toast.success('Đã xóa món');
      refresh();
    },
    onError: (err, dish) => {
      if (getErrorCode(err) === 'DISH_IN_USE') {
        setDiscontinuing(dish);
      } else {
        toast.error(getFormErrorMessage(err, 'Không xóa được món'));
      }
    },
    onSettled: () => setDeleting(null),
  });

  const openForm = async (dish?: DishSummary) => {
    setFormError(null);
    setImageFile(null);
    setEditingId(dish?.id ?? null);
    setCurrentImage(dish?.image_url ?? null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
    if (!dish) return;
    try {
      // danh sách không có mô tả và thời gian chế biến nên đọc chi tiết để sửa
      const detail = (await dishApi.get(dish.id)).data;
      setForm({
        name: detail.name,
        category_id: detail.category_id,
        price: String(detail.price),
        unit: detail.unit,
        description: detail.description ?? '',
        prep_time_minutes: detail.prep_time_minutes ? String(detail.prep_time_minutes) : '',
        status: detail.status,
      });
    } catch (err) {
      setIsFormOpen(false);
      toast.error(getFormErrorMessage(err, 'Không tải được thông tin món'));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    saveMutation.mutate({
      name: form.name.trim(),
      category_id: form.category_id,
      price: Number(form.price),
      unit: form.unit.trim(),
      description: form.description.trim() || undefined,
      prep_time_minutes: form.prep_time_minutes ? Number(form.prep_time_minutes) : undefined,
      status: form.status,
    });
  };

  const applyFilters = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters({
      name: draft.name.trim() || undefined,
      category_id: draft.category_id || undefined,
      status: (draft.status as DishStatus) || undefined,
      min_price: draft.min_price ? Number(draft.min_price) : undefined,
      max_price: draft.max_price ? Number(draft.max_price) : undefined,
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !IMAGE_TYPES.includes(file.type)) {
      e.target.value = '';
      setFormError('Chỉ chấp nhận ảnh png, gif, jpg hoặc jpeg.');
      return;
    }
    if (file && file.size > IMAGE_MAX_BYTES) {
      e.target.value = '';
      setFormError('Ảnh vượt quá dung lượng tối đa 5MB.');
      return;
    }
    setFormError(null);
    setImageFile(file);
  };

  // ảnh vừa chọn xem trước bằng object url, giải phóng khi đổi ảnh hoặc đóng form
  const localPreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);
  const previewUrl = localPreview ?? assetUrl(currentImage);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Quản lý món ăn</h2>
          <p className="mt-1 text-sm text-slate-500">Thêm, sửa, đổi trạng thái và tải ảnh món</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => openForm()}>
          <Plus className="size-4" />
          Thêm món
        </button>
      </div>

      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div className="min-w-48 flex-1">
          <input
            className={inputClass}
            placeholder="Tìm theo tên món..."
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <select
          className={`${inputClass} w-44`}
          value={draft.category_id}
          onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
        >
          <option value="">Mọi danh mục</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className={`${inputClass} w-40`}
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
        >
          <option value="">Mọi trạng thái</option>
          {(Object.keys(DISH_STATUS_LABELS) as DishStatus[]).map((s) => (
            <option key={s} value={s}>
              {DISH_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          className={`${inputClass} w-32`}
          type="number"
          min={0}
          placeholder="Giá từ"
          value={draft.min_price}
          onChange={(e) => setDraft({ ...draft, min_price: e.target.value })}
        />
        <input
          className={`${inputClass} w-32`}
          type="number"
          min={0}
          placeholder="Giá đến"
          value={draft.max_price}
          onChange={(e) => setDraft({ ...draft, max_price: e.target.value })}
        />
        <button type="submit" className={btnSecondary}>
          <Search className="size-4" />
          Tìm
        </button>
      </form>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách món." />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          message={
            Object.values(filters).some((v) => v !== undefined)
              ? 'Không tìm thấy món ăn nào thỏa mãn tiêu chí tìm kiếm.'
              : 'Chưa có món ăn nào.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Món</th>
                <th className="px-6 py-3">Danh mục</th>
                <th className="px-6 py-3">Giá</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((dish) => (
                <tr key={dish.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {dish.image_url ? (
                        <img src={assetUrl(dish.image_url)} alt={dish.name} className="size-12 rounded-lg object-cover" />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <ImageOff className="size-5" />
                        </div>
                      )}
                      <span className="font-medium text-slate-800">{dish.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{dish.category_name}</td>
                  <td className="px-6 py-3 text-slate-600">
                    {formatVnd(dish.price)} / {dish.unit}
                  </td>
                  <td className="px-6 py-3">
                    <Badge tone={STATUS_TONE[dish.status]}>{DISH_STATUS_LABELS[dish.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3 text-right">
                    {dish.status === 'AVAILABLE' && (
                      <button
                        type="button"
                        className={iconBtn}
                        title="Báo hết món"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: dish.id, status: 'OUT_OF_STOCK' })}
                      >
                        <PauseCircle className="size-4" />
                      </button>
                    )}
                    {dish.status === 'OUT_OF_STOCK' && (
                      <button
                        type="button"
                        className={iconBtn}
                        title="Mở bán lại"
                        disabled={statusMutation.isPending}
                        onClick={() => statusMutation.mutate({ id: dish.id, status: 'AVAILABLE' })}
                      >
                        <PlayCircle className="size-4" />
                      </button>
                    )}
                    <button type="button" className={iconBtn} onClick={() => openForm(dish)} aria-label="Sửa">
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} hover:text-red-600`}
                      onClick={() => setDeleting(dish)}
                      aria-label="Xóa"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={data?.meta} onPageChange={setPage} />

      <Modal
        open={isFormOpen}
        title={editingId ? 'Sửa món ăn' : 'Thêm món ăn'}
        onClose={() => setIsFormOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setIsFormOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="dish-form" className={btnPrimary} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="dish-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{formError}</p>}
          <div className="sm:col-span-2">
            <FormField label="Tên món" required>
              <input
                className={inputClass}
                required
                maxLength={255}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Danh mục" required>
            <select
              className={inputClass}
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            >
              <option value="">Chọn danh mục</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>
          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-slate-700">
              Trạng thái<span className="ml-0.5 text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
              {(Object.keys(DISH_STATUS_LABELS) as DishStatus[]).map((s) => (
                <label key={s} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="dish-status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => setForm({ ...form, status: s })}
                  />
                  {DISH_STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Giá bán (VND)" required>
            <input
              className={inputClass}
              type="number"
              min={1}
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </FormField>
          <FormField label="Đơn vị tính" required>
            <input
              className={inputClass}
              required
              maxLength={20}
              placeholder="Tô, đĩa, ly..."
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </FormField>
          <FormField label="Thời gian chế biến (phút)">
            <input
              className={inputClass}
              type="number"
              min={1}
              value={form.prep_time_minutes}
              onChange={(e) => setForm({ ...form, prep_time_minutes: e.target.value })}
            />
          </FormField>
          <FormField label="Ảnh món" hint="png, gif, jpg hoặc jpeg">
            <input
              className={inputClass}
              type="file"
              accept="image/png,image/gif,image/jpeg"
              onChange={handleImageChange}
            />
          </FormField>
          {previewUrl && (
            <img src={previewUrl} alt="Ảnh món" className="h-32 w-full rounded-lg object-cover sm:col-span-2" />
          )}
          <div className="sm:col-span-2">
            <FormField label="Mô tả">
              <textarea
                className={inputClass}
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa món ăn"
        message={`Xóa món "${deleting?.name ?? ''}"? Món đã từng được gọi sẽ không xóa được.`}
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={discontinuing !== null}
        title="Món đã từng được gọi"
        message={`Món "${discontinuing?.name ?? ''}" đã xuất hiện trong đơn hàng nên không thể xóa. Chuyển sang trạng thái Ngừng bán?`}
        confirmLabel="Ngừng bán"
        loading={statusMutation.isPending}
        onConfirm={() => discontinuing && statusMutation.mutate({ id: discontinuing.id, status: 'DISCONTINUED' })}
        onCancel={() => setDiscontinuing(null)}
      />
    </div>
  );
}
