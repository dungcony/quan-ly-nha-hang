// thông tin nhà hàng hiển thị cho khách (SRS 3.1); đổi bằng biến môi trường VITE_RESTAURANT_* trong FE/.env
export const RESTAURANT_INFO = {
  name: import.meta.env.VITE_RESTAURANT_NAME || 'FlavorHaven',
  address: import.meta.env.VITE_RESTAURANT_ADDRESS || '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  phone: import.meta.env.VITE_RESTAURANT_PHONE || '0283 123 4567',
  hours: import.meta.env.VITE_RESTAURANT_HOURS || '10:00 – 22:00 hằng ngày',
};

// quy tắc đặt bàn trực tuyến, khớp giá trị mặc định của backend (app.restaurant.* trong application.yaml); backend vẫn là nơi kiểm tra cuối cùng
export const BOOKING_RULES = {
  openTime: '10:00',
  closeTime: '22:00',
  minLeadHours: 2,
  maxAheadDays: 30,
  maxGuests: 50,
};
