import type {
  DishStatus,
  OrderItemStatus,
  PaymentMethod,
  ReservationStatus,
  Role,
  TableStatus,
  TableZone,
  UserStatus,
} from '@/utils/apiTypes';

export const ROLE_LABELS: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  WAITER: 'Phục vụ',
  CASHIER: 'Thu ngân',
  CHEF: 'Bếp',
  MANAGER: 'Quản lý',
};

// vai trò của nhân viên, không gồm khách hàng
export const STAFF_ROLES: Role[] = ['WAITER', 'CASHIER', 'CHEF', 'MANAGER'];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
};

export const ZONE_LABELS: Record<TableZone, string> = {
  INDOOR: 'Trong nhà',
  OUTDOOR: 'Ngoài trời',
  VIP_ROOM: 'Phòng VIP',
  SECOND_FLOOR: 'Tầng 2',
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  AVAILABLE: 'Trống',
  RESERVED: 'Đã đặt',
  OCCUPIED: 'Đang phục vụ',
  OUT_OF_SERVICE: 'Tạm khóa',
};

export const DISH_STATUS_LABELS: Record<DishStatus, string> = {
  AVAILABLE: 'Đang bán',
  OUT_OF_STOCK: 'Hết món',
  DISCONTINUED: 'Ngừng bán',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã nhận bàn',
  CANCELLED: 'Đã hủy',
  NO_SHOW: 'Không đến',
};

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: 'Chờ chế biến',
  COOKING: 'Đang chế biến',
  READY: 'Đã xong',
  SERVED: 'Đã phục vụ',
  CANCELLED: 'Đã hủy',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  BANK_TRANSFER: 'Chuyển khoản',
};

// trang chủ làm việc của từng vai trò sau khi đăng nhập
export function roleHomePath(role: Role | string | undefined | null): string {
  switch (role) {
    case 'MANAGER':
      return '/admin';
    case 'WAITER':
    case 'CASHIER':
      return '/pos';
    case 'CHEF':
      return '/kitchen';
    default:
      return '/';
  }
}

// tên khu vực làm việc dùng cho nút điều hướng
export function roleHomeLabel(role: Role | string | undefined | null): string {
  switch (role) {
    case 'MANAGER':
      return 'Trang Quản Trị';
    case 'WAITER':
    case 'CASHIER':
      return 'Màn hình POS';
    case 'CHEF':
      return 'Màn hình Bếp';
    default:
      return 'Trang chủ';
  }
}
