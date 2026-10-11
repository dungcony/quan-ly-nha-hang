# Kịch bản Use Case & Test Cases: Quản lý Món ăn & Thực đơn

Tác nhân: Quản lý (UC010, tìm đầy đủ ở UC007), Khách và mọi người dùng (UC012, tìm món ở UC007). Danh mục món
(bảng `categories`, mặc định Khai vị, Món chính, Đồ uống, Tráng miệng) do Quản lý quản lý ở mục 1.2. Quy ước chung: xem
[`../README.md`](../README.md).

## 1. Kịch bản Use Case

### 1.1 Tìm kiếm món ăn (UC007)

- **Kịch bản chính (200)**: nhập một hoặc nhiều tiêu chí của Bảng 2-14: `name` (chứa chuỗi, không phân biệt hoa thường), `category_id`,
  `min_price` và `max_price` (khoảng giá VND, gồm hai đầu mút), `status`. Hệ thống trả danh sách phân trang thỏa mọi tiêu chí.
- Hai nơi dùng:
  - `GET /menu/dishes` công khai (Khách, Khách hàng, Nhân viên phục vụ, Thu ngân, Bếp): chỉ thấy món `AVAILABLE` và `OUT_OF_STOCK`;
    `status=DISCONTINUED` không bao giờ hiện (A22).
  - `GET /dishes` cho Quản lý: thấy cả `DISCONTINUED`, lọc được theo mọi `status`.
- **Kịch bản ngoại lệ**:
  - Không món nào thỏa mãn → 200 với `items: []` (luồng 5a của UC007, client hiển thị thông báo).
  - `min_price` > `max_price`, giá âm, `category_id`/`status` sai giá trị → 400 `VALIDATION_ERROR`.
  - `GET /menu/dishes` với `status=DISCONTINUED` → 400 `VALIDATION_ERROR`.

### 1.2 Quản lý món ăn (UC010)

- **Xem (R)**: danh sách `GET /dishes` (kèm tìm kiếm) và chi tiết `GET /dishes/{id}`.
  - Ngoại lệ: id không tồn tại → 404 `NOT_FOUND`.
- **Thêm (C)** — `POST /dishes` (201): nhập các trường của Bảng 2-22. `name`, `category_id`, `price`, `unit`, `status` là bắt buộc;
  `description`, `prep_time_minutes` tùy chọn. Ảnh tải lên sau khi tạo.
  - Ngoại lệ: 400 `VALIDATION_ERROR` (luồng 4a); 404 `NOT_FOUND` nếu `category_id` không tồn tại; 409 `DISH_NAME_EXISTS` nếu đã có món cùng tên trong cùng danh mục, không phân biệt
    hoa thường (luồng 4b).
- **Sửa (U)** — `PUT /dishes/{id}` (200): gửi các trường như khi thêm. Đổi `status` ở đây là cách chuyển món sang `OUT_OF_STOCK` khi Bếp
  báo hết nguyên liệu và chuyển lại `AVAILABLE` khi có nguyên liệu (ghi chú Bảng 2-22). Đổi `price` chỉ áp cho dòng món gọi sau đó;
  dòng món đã gửi bếp giữ giá cũ.
  - Ảnh: `PUT /dishes/{id}/image`.
  - Ngoại lệ: 400 `VALIDATION_ERROR`; 400 `FILE_TYPE_NOT_SUPPORTED`; 404 `NOT_FOUND` (món hoặc danh mục); 409 `DISH_NAME_EXISTS`.
- **Xóa (D)** — `DELETE /dishes/{id}` (200): client hỏi xác nhận trước khi gọi. Hệ thống chạy các `DishDeletionGuard` rồi xóa cứng.
  - Ngoại lệ: 409 `DISH_IN_USE` nếu món đã xuất hiện trong đơn hàng hoặc hóa đơn — khi đó chỉ chuyển được sang `DISCONTINUED` (luồng 4a);
    404 `NOT_FOUND`.

### 1.2a Quản lý danh mục món (UC010)

- **Xem** — `GET /categories` (200): mọi danh mục theo `sort_order` rồi theo tên, kèm `dish_count` là số món ở mọi trạng thái.
- **Thêm** — `POST /categories` (201): `name` (tối đa 100 ký tự), `sort_order` (số nguyên không âm).
  - Ngoại lệ: 400 `VALIDATION_ERROR`; 409 `CATEGORY_NAME_EXISTS` nếu trùng tên, không phân biệt hoa thường.
- **Sửa** — `PUT /categories/{id}` (200): gửi các trường như khi thêm.
  - Ngoại lệ: 400 `VALIDATION_ERROR`; 404 `NOT_FOUND`; 409 `CATEGORY_NAME_EXISTS`.
- **Xóa** — `DELETE /categories/{id}` (200): client hỏi xác nhận trước khi gọi.
  - Ngoại lệ: 404 `NOT_FOUND`; 409 `CATEGORY_IN_USE` nếu danh mục còn món (kể cả món ngừng bán), phải chuyển hoặc xóa hết món trước.

### 1.3 Xem thực đơn (UC012)

- **Kịch bản chính (200)**:
  - `GET /menu/categories` trả mọi danh mục theo `sort_order` kèm số món đang hiển thị mỗi danh mục (luồng 2); client chọn danh mục đầu tiên có món.
  - `GET /menu/dishes?category_id=...` trả món của danh mục (luồng 4), mỗi món có `name`, `image_url`, `price`, `status`.
  - `GET /menu/dishes?name=...` tìm theo tên (luồng 3, UC007).
  - `GET /menu/dishes/{id}` trả chi tiết: `description`, `unit`, `price`, `prep_time_minutes` (luồng 6).
- **Kịch bản ngoại lệ**:
  - Chưa có món `AVAILABLE`/`OUT_OF_STOCK` nào → `/menu/categories` trả mọi `dish_count = 0`; client hiện "Thực đơn đang cập nhật" (luồng 2a).
  - Danh mục hoặc từ khóa không có kết quả → 200 `items: []` (luồng 4a).
  - Chi tiết món `DISCONTINUED` hoặc không tồn tại → 404 `NOT_FOUND`.
- Món `OUT_OF_STOCK` vẫn hiện trong thực đơn nhưng nhân viên phục vụ không gọi được (`DISH_NOT_ORDERABLE`, module `ordering`).

## 2. Kịch bản Kiểm thử (Test Cases)

| Mã TC | Loại | UC | Kịch bản | Input | Kết quả kỳ vọng |
|---|---|---|---|---|---|
| TC_MENU_01 | Luồng chuẩn | UC007 | Tìm món theo tên | `name=phở` | 200, chỉ món có tên chứa "phở" |
| TC_MENU_02 | Luồng chuẩn | UC007 | Tìm món theo khoảng giá | `min_price=30000&max_price=80000` | 200, mọi món có giá trong khoảng (gồm hai đầu) |
| TC_MENU_03 | Luồng chuẩn | UC007 | Tìm món theo danh mục và trạng thái (Quản lý) | `category_id=<id Đồ uống>&status=OUT_OF_STOCK` | 200, chỉ đồ uống hết món |
| TC_MENU_04 | Ngoại lệ | UC007 | Khoảng giá ngược | `min_price=80000&max_price=30000` | 400 `VALIDATION_ERROR` |
| TC_MENU_05 | Ngoại lệ | UC007 | Công khai tìm món ngừng bán | `GET /menu/dishes?status=DISCONTINUED` | 400 `VALIDATION_ERROR` |
| TC_MENU_06 | Luồng chuẩn | UC007 | Tìm không có kết quả | `name=khongco` | 200, `items: []` |
| TC_MENU_07 | Luồng chuẩn | UC010 | Thêm món | Đủ trường bắt buộc | 201, `status` đúng như gửi |
| TC_MENU_08 | Ngoại lệ | UC010 | Thêm món thiếu giá | Không có `price` | 400 `VALIDATION_ERROR` |
| TC_MENU_09 | Ngoại lệ | UC010 | Giá không dương | `price=0` hoặc `-1` | 400 `VALIDATION_ERROR` |
| TC_MENU_10 | Ngoại lệ | UC010 | Đơn vị tính quá 20 ký tự | `unit` 21 ký tự | 400 `VALIDATION_ERROR` |
| TC_MENU_11 | Ngoại lệ | UC010 | Trùng tên trong danh mục | "Phở bò tái" đã có ở danh mục Món chính, thêm "phở BÒ tái" cùng danh mục | 409 `DISH_NAME_EXISTS` |
| TC_MENU_12 | Luồng chuẩn | UC010 | Trùng tên khác danh mục | Cùng tên nhưng khác `category_id` | 201 |
| TC_MENU_13 | Luồng chuẩn | UC010 | Sửa món | Đổi giá, mô tả | 200, dữ liệu mới |
| TC_MENU_14 | Luồng chuẩn | UC010 | Đổi giá không ảnh hưởng đơn đang mở | Sửa giá khi có dòng món đã gửi bếp | 200; dòng món cũ giữ `unit_price` cũ |
| TC_MENU_15 | Luồng chuẩn | UC010 | Chuyển Hết món rồi Đang bán | `status=OUT_OF_STOCK`, rồi `AVAILABLE` | 200 cả hai; ở giữa món vẫn hiện trong `/menu/dishes` |
| TC_MENU_16 | Ngoại lệ | UC010 | Sửa trùng tên món khác | Đổi tên thành tên món khác cùng danh mục | 409 `DISH_NAME_EXISTS` |
| TC_MENU_17 | Ngoại lệ | UC010 | Sửa món không tồn tại | id sai | 404 `NOT_FOUND` |
| TC_MENU_18 | Luồng chuẩn | UC010 | Xóa món chưa từng được gọi | id hợp lệ | 200; `GET /dishes/{id}` trả 404 |
| TC_MENU_19 | Ngoại lệ | UC010 | Xóa món đã được gọi | Món có trong `order_items` | 409 `DISH_IN_USE`; món vẫn còn |
| TC_MENU_20 | Luồng chuẩn | UC010 | Ngừng bán thay cho xóa | `status=DISCONTINUED` | 200; món biến mất khỏi `/menu/dishes` |
| TC_MENU_21 | Luồng chuẩn | UC010 | Tải ảnh món | File `.jpg` | 200, `image_url` có giá trị |
| TC_MENU_22 | Ngoại lệ | UC010 | Ảnh sai định dạng | File `.webp` | 400 `FILE_TYPE_NOT_SUPPORTED` |
| TC_MENU_23 | Ngoại lệ | Chung | Nhân viên khác gọi API quản lý | Token `WAITER` gọi `POST /dishes` | 403 `FORBIDDEN` |
| TC_MENU_24 | Ngoại lệ | Chung | Khách gọi API quản lý | Không token gọi `GET /dishes` | 401 `UNAUTHENTICATED` |
| TC_MENU_25 | Luồng chuẩn | UC012 | Khách xem danh mục | Không token, `GET /menu/categories` | 200, mọi danh mục kèm `dish_count` chỉ đếm món `AVAILABLE`/`OUT_OF_STOCK` |
| TC_MENU_26 | Luồng chuẩn | UC012 | Khách xem món theo danh mục | Không token, `category_id=<id Khai vị>` | 200; có cả món `OUT_OF_STOCK` với `status` tương ứng; không có `DISCONTINUED` |
| TC_MENU_27 | Luồng chuẩn | UC012 | Khách xem chi tiết món | id món `AVAILABLE` | 200, có `description`, `unit`, `prep_time_minutes` |
| TC_MENU_28 | Ngoại lệ | UC012 | Khách xem chi tiết món ngừng bán | id món `DISCONTINUED` | 404 `NOT_FOUND` |
| TC_MENU_29 | Luồng chuẩn | UC012 | Thực đơn trống | Không có món hiển thị | 200, mọi `dish_count` bằng 0 |
