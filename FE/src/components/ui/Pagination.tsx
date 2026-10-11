import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PageMeta } from '@/utils/apiTypes';
import { iconBtn } from '@/components/ui/forms';

interface PaginationProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
}

// thanh chuyển trang theo PageMeta của backend (page bắt đầu từ 1)
export default function Pagination({ meta, onPageChange }: PaginationProps) {
  if (!meta || meta.total_items === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600">
      <span>
        Trang {meta.page}/{Math.max(meta.total_pages, 1)} · {meta.total_items} bản ghi
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={iconBtn}
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          className={iconBtn}
          disabled={meta.page >= meta.total_pages}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
