import type { ErrorResponse, FieldErrorItem } from '@/utils/apiTypes';

// lấy thông báo lỗi do GlobalExceptionHandler trả về, không có thì dùng thông báo mặc định
export function getErrorMessage(err: unknown, fallback: string): string {
  const e = err as Partial<ErrorResponse> | undefined;
  return e?.error?.message || fallback;
}

// mã lỗi nghiệp vụ như DISH_IN_USE, dùng để rẽ nhánh xử lý riêng
export function getErrorCode(err: unknown): string | undefined {
  return (err as Partial<ErrorResponse> | undefined)?.error?.code;
}

// lỗi theo từng trường của form
export function getFieldErrors(err: unknown): FieldErrorItem[] {
  return (err as Partial<ErrorResponse> | undefined)?.error?.fields ?? [];
}

// thông báo lỗi kèm danh sách lỗi từng trường nếu có
export function getFormErrorMessage(err: unknown, fallback: string): string {
  const fields = getFieldErrors(err);
  if (fields.length === 0) return getErrorMessage(err, fallback);
  return fields.map((f) => f.message).join('; ');
}

// đọc phần detail của lỗi, ví dụ unserved_count hoặc dish_ids
export function getErrorDetail<T = Record<string, unknown>>(err: unknown): T | undefined {
  return ((err as Partial<ErrorResponse> | undefined)?.error?.detail ?? undefined) as T | undefined;
}
