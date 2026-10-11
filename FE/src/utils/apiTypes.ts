// cấu trúc phản hồi chuẩn từ ApiResponse của Spring Boot backend
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  msg: string;
}

// trạng thái món ăn
export type DishStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'DISCONTINUED';

// trạng thái đặt bàn
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED' | 'NO_SHOW';

// trạng thái đơn hàng
export type OrderStatus = 'OPEN' | 'CLOSED';

// trạng thái từng dòng món trong đơn
export type OrderItemStatus = 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';

// phương thức thanh toán
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

// chi tiết từng trường lỗi từ ErrorResponse
export interface FieldErrorItem {
  field: string;
  message: string;
}

// chi tiết lỗi từ ErrorResponse của Spring Boot
export interface ErrorDetail {
  code: string;
  message: string;
  fields?: FieldErrorItem[];
  detail?: Record<string, unknown> | null;
}

// cấu trúc phản hồi lỗi khi backend ném exception
export interface ErrorResponse {
  success: false;
  error: ErrorDetail;
}

// thông tin phân trang từ PageMeta
export interface PageMeta {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

// dữ liệu phân trang từ PageResponse
export interface PageResponse<T> {
  items: T[];
  meta: PageMeta;
}

// các vai trò trong hệ thống nhà hàng
export type Role = 'CUSTOMER' | 'WAITER' | 'CASHIER' | 'CHEF' | 'MANAGER';

// giới tính người dùng
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

// trạng thái tài khoản
export type UserStatus = 'ACTIVE' | 'LOCKED';

// thông tin tài khoản thu gọn trả về khi đăng nhập
export interface AuthUserResponse {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  must_change_password: boolean;
}

// dữ liệu trả về khi đăng nhập thành công
export interface AuthResponse {
  access_token: string;
  expires_in: number;
  user: AuthUserResponse;
}

// hồ sơ người dùng đầy đủ từ backend
export interface ProfileResponse {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  gender?: Gender | null;
  date_of_birth?: string | null;
  avatar_url?: string | null;
  role: Role;
  status: UserStatus;
  email_verified: boolean;
  must_change_password: boolean;
  created_at: string;
}

// dữ liệu yêu cầu đăng nhập
export interface UserLoginRequest {
  email: string;
  password: string;
}

// dữ liệu yêu cầu đăng ký tài khoản khách hàng
export interface UserRegisterRequest {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  confirm_password: string;
}

// dữ liệu yêu cầu quên mật khẩu
export interface PasswordForgotRequest {
  email: string;
}

// dữ liệu yêu cầu đặt lại mật khẩu
export interface PasswordResetRequest {
  token: string;
  new_password: string;
  confirm_new_password: string;
}

// dữ liệu cập nhật thông tin cá nhân
export interface ProfileUpdateRequest {
  full_name: string;
  email: string;
  phone?: string;
  gender?: Gender;
  date_of_birth?: string;
}

// dữ liệu yêu cầu đổi mật khẩu
export interface PasswordChangeRequest {
  old_password: string;
  new_password: string;
  confirm_new_password: string;
}

// khu vực của bàn ăn
export type TableZone = 'INDOOR' | 'OUTDOOR' | 'VIP_ROOM' | 'SECOND_FLOOR';

// trạng thái bàn ăn
export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'OUT_OF_SERVICE';

// dữ liệu trả về của bàn ăn
export interface TableResponse {
  id: string;
  name: string;
  zone: TableZone;
  capacity: number;
  status: TableStatus;
  note?: string;
}

// dữ liệu yêu cầu tạo mới bàn ăn
export interface TableCreateRequest {
  name: string;
  zone: TableZone;
  capacity: number;
  note?: string;
}

// dữ liệu yêu cầu cập nhật bàn ăn
export interface TableUpdateRequest {
  name: string;
  zone: TableZone;
  capacity: number;
  note?: string;
  status?: TableStatus;
}

// dữ liệu yêu cầu tìm kiếm bàn ăn
export interface TableSearchRequest {
  name?: string;
  zone?: TableZone;
  min_capacity?: number;
  status?: TableStatus;
}
