import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Clock, Search } from 'lucide-react';
import { menuApi, type DishSummaryResponse } from '@/api/menuApi';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import Spinner from '@/components/ui/Spinner';
import { assetUrl } from '@/utils/assetUrl';
import { formatVnd } from '@/utils/format';
import { DISH_STATUS_LABELS } from '@/utils/labels';

const PAGE_SIZE = 12;

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  // danh mục đang chọn; chưa chọn thì dùng danh mục đầu tiên (UC012 bước 2), '' nghĩa là tất cả
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(searchParams.get('category') ?? undefined);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  // chờ người dùng ngừng gõ rồi mới tìm để không gọi API mỗi phím
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const categoriesQuery = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuApi.getCategories().then((res) => res.data),
  });
  const categories = categoriesQuery.data ?? [];
  const totalDishes = categories.reduce((sum, c) => sum + c.dish_count, 0);
  const activeCategory = selectedCategory ?? categories[0]?.id ?? '';
  // đang tìm theo tên thì tìm trên toàn thực đơn, không bó trong danh mục đang chọn
  const searching = searchQuery !== '';

  const dishesQuery = useQuery({
    queryKey: ['menu-dishes', activeCategory, searchQuery, page],
    queryFn: () =>
      menuApi
        .getDishes({
          category_id: !searching && activeCategory ? activeCategory : undefined,
          name: searching ? searchQuery : undefined,
          page,
          page_size: PAGE_SIZE,
        })
        .then((res) => res.data),
    enabled: !categoriesQuery.isLoading && totalDishes > 0,
    placeholderData: keepPreviousData,
  });

  const detailQuery = useQuery({
    queryKey: ['menu-dish', detailId],
    queryFn: () => menuApi.getDish(detailId as string).then((res) => res.data),
    enabled: !!detailId,
  });

  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    setPage(1);
  };

  const dishes: DishSummaryResponse[] = dishesQuery.data?.items ?? [];
  const detail = detailQuery.data;

  const renderBody = () => {
    if (categoriesQuery.isLoading) return <Spinner />;
    if (categoriesQuery.isError) return <EmptyState error message="Không tải được thực đơn. Vui lòng thử lại sau." />;
    // UC012 luồng 2a: chưa có món nào đang bán hoặc hết món
    if (totalDishes === 0) return <EmptyState message="Thực đơn đang được cập nhật, vui lòng quay lại sau." />;
    if (dishesQuery.isLoading) return <Spinner />;
    if (dishesQuery.isError) return <EmptyState error message="Không tải được danh sách món. Vui lòng thử lại sau." />;
    // UC012 luồng 4a
    if (dishes.length === 0) return <EmptyState message="Không tìm thấy món ăn nào thỏa mãn điều kiện tìm kiếm." />;
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {dishes.map((dish) => (
            <button
              key={dish.id}
              type="button"
              onClick={() => setDetailId(dish.id)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition flex flex-col text-left"
            >
              <div className="bg-slate-100 relative">
                {dish.image_url ? (
                  <img src={assetUrl(dish.image_url)} alt={dish.name} className="object-cover w-full h-48" />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-slate-200 text-slate-400">Chưa có ảnh</div>
                )}
                {dish.status === 'OUT_OF_STOCK' && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <span className="bg-slate-800 text-white px-4 py-1 rounded-full font-bold text-sm">{DISH_STATUS_LABELS.OUT_OF_STOCK}</span>
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col w-full">
                <div className="text-xs font-semibold text-amber-600 mb-1 uppercase tracking-wider">{dish.category_name}</div>
                <h3 className="font-bold text-slate-900 text-lg mb-1">{dish.name}</h3>
                {dish.description && <p className="text-sm text-slate-500 line-clamp-2 mb-3">{dish.description}</p>}
                <div className="mt-auto flex items-end justify-between gap-2">
                  <span className="font-bold text-xl text-slate-900">
                    {formatVnd(dish.price)} <span className="text-sm text-slate-500 font-normal">/ {dish.unit}</span>
                  </span>
                  <Badge tone={dish.status === 'AVAILABLE' ? 'green' : 'slate'}>{DISH_STATUS_LABELS[dish.status]}</Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white">
          <Pagination meta={dishesQuery.data?.meta} onPageChange={setPage} />
        </div>
      </>
    );
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* Banner */}
      <div className="bg-amber-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Thực Đơn Nhà Hàng</h1>
        <p className="text-amber-200 max-w-2xl mx-auto text-lg">
          Khám phá hương vị tuyệt hảo từ những nguyên liệu tươi ngon nhất, được chế biến bởi các đầu bếp hàng đầu.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        {/* Thanh tìm kiếm & lọc */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm món theo tên..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !searching && activeCategory === cat.id ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({cat.dish_count})
              </button>
            ))}
            {categories.length > 1 && (
              <button
                type="button"
                onClick={() => selectCategory('')}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition ${
                  !searching && activeCategory === '' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả
              </button>
            )}
          </div>
        </div>
        {searching && <p className="mb-4 text-sm text-slate-500">Kết quả tìm kiếm “{searchQuery}” trên toàn thực đơn.</p>}

        {renderBody()}
      </div>

      <Modal open={!!detailId} title={detail?.name ?? 'Chi tiết món'} onClose={() => setDetailId(null)}>
        {detailQuery.isLoading ? (
          <Spinner />
        ) : detailQuery.isError || !detail ? (
          <EmptyState error message="Không tải được chi tiết món." />
        ) : (
          <div className="space-y-4">
            {detail.image_url && <img src={assetUrl(detail.image_url)} alt={detail.name} className="w-full max-h-64 object-cover rounded-lg" />}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{detail.category_name}</span>
              <Badge tone={detail.status === 'AVAILABLE' ? 'green' : 'slate'}>{DISH_STATUS_LABELS[detail.status]}</Badge>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-line">{detail.description || 'Chưa có mô tả cho món này.'}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Giá bán</dt>
                <dd className="font-bold text-slate-900">{formatVnd(detail.price)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Đơn vị tính</dt>
                <dd className="font-medium text-slate-900">{detail.unit}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500">Thời gian chế biến dự kiến</dt>
                <dd className="font-medium text-slate-900 flex items-center gap-1.5">
                  <Clock className="size-4 text-amber-600" />
                  {detail.prep_time_minutes ? `${detail.prep_time_minutes} phút` : 'Chưa cập nhật'}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
