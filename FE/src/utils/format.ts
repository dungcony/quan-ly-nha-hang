// múi giờ vận hành của nhà hàng (SRS 3.3), dùng thay cho múi giờ của trình duyệt
export const RESTAURANT_TIME_ZONE = 'Asia/Ho_Chi_Minh';
// Việt Nam không có giờ mùa hè nên độ lệch UTC cố định
const RESTAURANT_UTC_OFFSET = '+07:00';

// định dạng tiền việt nam đồng, số nguyên
export function formatVnd(amount: number | null | undefined): string {
  return `${(amount ?? 0).toLocaleString('vi-VN')} đ`;
}

// định dạng ngày giờ theo múi giờ nhà hàng
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: RESTAURANT_TIME_ZONE,
  });
}

// định dạng giờ phút theo múi giờ nhà hàng
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: RESTAURANT_TIME_ZONE });
}

// định dạng ngày từ yyyy-MM-dd hoặc iso
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  // yyyy-MM-dd không có giờ nên không đổi múi giờ để khỏi lệch ngày
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(value).toLocaleDateString('vi-VN', { timeZone: RESTAURANT_TIME_ZONE });
}

// chuyển đối tượng date sang yyyy-MM-dd theo giờ địa phương để gửi làm query param
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ngày hiện tại yyyy-MM-dd theo múi giờ nhà hàng, khớp với "hôm nay" mà backend tính
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: RESTAURANT_TIME_ZONE }).format(new Date());
}

// ngày đầu tháng hiện tại yyyy-MM-dd theo múi giờ nhà hàng
export function monthStartIso(): string {
  return `${todayIso().slice(0, 7)}-01`;
}

// số phút đã trôi qua kể từ một mốc thời gian
export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

// tách một mốc thời gian thành ngày yyyy-MM-dd và giờ HH:mm theo múi giờ nhà hàng, dùng điền vào ô chọn ngày giờ
export function toRestaurantDateTimeParts(iso: string): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: RESTAURANT_TIME_ZONE }).format(new Date(iso));
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: RESTAURANT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
  return { date, time };
}

// ghép ngày yyyy-MM-dd và giờ HH:mm nhập theo giờ nhà hàng thành mốc UTC ISO-8601 để gửi backend
export function fromRestaurantDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00${RESTAURANT_UTC_OFFSET}`).toISOString();
}

// ngày yyyy-MM-dd sau hôm nay (theo múi giờ nhà hàng) đúng số ngày cho trước
export function addDaysIso(days: number): string {
  const [y, m, d] = todayIso().split('-').map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}
