// định dạng tiền việt nam đồng, số nguyên
export function formatVnd(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('vi-VN')} đ`;
}

// định dạng ngày giờ theo múi giờ của trình duyệt
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// định dạng giờ phút
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

// định dạng ngày từ yyyy-MM-dd hoặc iso
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

// chuyển đối tượng date sang yyyy-MM-dd theo giờ địa phương để gửi làm query param
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// số phút đã trôi qua kể từ một mốc thời gian
export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}
