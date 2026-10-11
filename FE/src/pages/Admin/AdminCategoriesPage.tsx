import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { categoryApi, type CategoryPayload, type CategoryResponse } from '@/api/categoryApi';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormField from '@/components/ui/FormField';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { btnPrimary, btnSecondary, iconBtn, inputClass, tableHeadClass } from '@/components/ui/forms';
import { getFormErrorMessage } from '@/utils/apiError';

const EMPTY_FORM = { name: '', sort_order: '0' };

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CategoryResponse | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list().then((res) => res.data),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] });

  const saveMutation = useMutation({
    mutationFn: (payload: CategoryPayload) =>
      editing ? categoryApi.update(editing.id, payload) : categoryApi.create(payload),
    onSuccess: () => {
      toast.success(editing ? 'Đã cập nhật danh mục' : 'Đã thêm danh mục');
      setIsFormOpen(false);
      refresh();
    },
    onError: (err) => setFormError(getFormErrorMessage(err, 'Không lưu được danh mục')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.remove(id),
    onSuccess: () => {
      toast.success('Đã xóa danh mục');
      refresh();
    },
    onError: (err) => toast.error(getFormErrorMessage(err, 'Không xóa được danh mục')),
    onSettled: () => setDeleting(null),
  });

  const openForm = (category?: CategoryResponse) => {
    setFormError(null);
    setEditing(category ?? null);
    setForm(category ? { name: category.name, sort_order: String(category.sort_order) } : EMPTY_FORM);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    saveMutation.mutate({ name: form.name.trim(), sort_order: Number(form.sort_order) });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Danh mục món</h2>
          <p className="mt-1 text-sm text-slate-500">Thứ tự hiển thị nhỏ hơn sẽ hiện trước trên thực đơn</p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => openForm()}>
          <Plus className="size-4" />
          Thêm danh mục
        </button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <EmptyState error message="Không tải được danh sách danh mục." />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Chưa có danh mục nào." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-6 py-3">Tên danh mục</th>
                <th className="px-6 py-3">Thứ tự</th>
                <th className="px-6 py-3">Số món</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{category.name}</td>
                  <td className="px-6 py-3 text-slate-600">{category.sort_order}</td>
                  <td className="px-6 py-3 text-slate-600">{category.dish_count}</td>
                  <td className="px-6 py-3 text-right">
                    <button type="button" className={iconBtn} onClick={() => openForm(category)} aria-label="Sửa">
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} hover:text-red-600`}
                      onClick={() => setDeleting(category)}
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

      <Modal
        open={isFormOpen}
        title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
        onClose={() => setIsFormOpen(false)}
        size="sm"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setIsFormOpen(false)}>
              Hủy
            </button>
            <button type="submit" form="category-form" className={btnPrimary} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Đang lưu...' : 'Lưu'}
            </button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
          {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          <FormField label="Tên danh mục" required>
            <input
              className={inputClass}
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </FormField>
          <FormField label="Thứ tự hiển thị" required hint="Số nguyên không âm, nhỏ hơn thì hiện trước">
            <input
              className={inputClass}
              type="number"
              min={0}
              required
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa danh mục"
        message={`Xóa danh mục "${deleting?.name ?? ''}"? Danh mục còn món sẽ không xóa được.`}
        confirmLabel="Xóa"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
