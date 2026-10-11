# Kịch bản Use Case & Test Cases: Đặt bàn

Tác nhân: Khách và Khách hàng (UC013, UC017), Nhân viên phục vụ và Quản lý (UC014, UC007). Quy ước chung, cấu hình giờ mở cửa/thời
lượng/mốc hủy và cách hiểu SRS (A1, A3–A7, A23): xem [`../README.md`](../README.md).

Trạng thái đặt bàn: `PENDING` → `CONFIRMED` → `CHECKED_IN`; nhánh phụ `CANCELLED`, `NO_SHOW` (sơ đồ ở README mục 2.4). Mã đặt bàn dạng
`DB20261009-001` (README mục 2.9). Khung giờ giữ bàn của một đặt bàn là `[reserved_at, reserved_at + 120 phút)`.

## 1. Kịch bản Use Case

### 1.1 Đặt bàn trực tuyến (UC013)

- **Kiểm tra bàn trống** — `GET /reservations/availability?reserved_at=...&guest_count=...` (công khai): hệ thống kiểm tra giờ hợp lệ và
  còn bàn phù hợp (luồng 3–4). Trả `{available, suggestions[]}`; khi `available = false`, `suggestions` là tối đa 4 khung giờ gần nhất
  còn bàn (luồng 4b, A5). Client gọi bước này khi khách chọn xong ngày, giờ, số khách.
- **Kịch bản chính (201)** — `POST /reservations` (công khai): Khách nhập `guest_name`, `phone`, `email` (tùy chọn),
  `reserved_at`, `guest_count`, `preferred_zone` (tùy chọn), `note` (tùy chọn). Khách hàng đã đăng nhập (gửi Bearer token) được client điền sẵn
  từ `GET /users/me` và đặt bàn được gắn `customer_id`. Hệ thống kiểm tra lại giờ và bàn trống, sinh mã, tạo đặt bàn `PENDING`, trả mã đặt bàn
  và gửi email xác nhận đã nhận yêu cầu nếu có `email` (luồng 5–7).
- Hợp lệ về thời điểm: `reserved_at` nằm trong giờ mở cửa `[10:00, 22:00)` theo múi giờ nhà hàng, cách hiện tại **tối thiểu 2 giờ** và **tối đa
  30 ngày**. Còn bàn: tồn tại bàn không `OUT_OF_SERVICE`, `capacity ≥ guest_count`, không trùng đặt bàn `CONFIRMED`/`CHECKED_IN` trong khung 120 phút
  (A3). Đặt bàn `PENDING` khác không chiếm chỗ.
- **Kịch bản ngoại lệ**:
  - Thời điểm đã qua, ngoài giờ mở cửa, cách dưới 2 giờ hoặc quá 30 ngày → 400 `RESERVATION_TIME_INVALID` (luồng 4a).
  - Hết bàn phù hợp → 409 `RESERVATION_NO_TABLE_AVAILABLE`, `error.detail.suggestions` chứa các khung giờ gợi ý (luồng 4b).
  - Thiếu trường bắt buộc, điện thoại không đủ 10 chữ số, email sai định dạng, `guest_count` ngoài 1–50, ghi chú quá 255 ký tự → 400
    `VALIDATION_ERROR` (luồng 6a).
  - Lưu lỗi → 500 `INTERNAL_ERROR` (luồng 7a).

### 1.2 Quản lý đặt bàn (UC014)

- **Xem / Tìm kiếm (R, S)** — `GET /reservations` (WAITER, MANAGER): tiêu chí của Bảng 2-16: `keyword` (tên khách hoặc số điện thoại, chứa chuỗi),
  `code` (mã đặt bàn), `date` (ngày đặt, theo múi giờ nhà hàng), `status`. Không truyền `date`, `status`, `code`, `keyword` thì mặc định `date` = hôm nay (A24).
  Chi tiết `GET /reservations/{id}` gồm thông tin khách, thời gian, số khách, bàn được gán, ghi chú, lý do hủy.
  - Không có đặt bàn nào → 200 `items: []` (luồng 2a).
- **Xác nhận** — `GET /reservations/{id}/available-tables` rồi `PUT /reservations/{id}/confirm` với `table_id` (luồng 1–4):
  - `available-tables` trả bàn đủ sức chứa, không `OUT_OF_SERVICE`, không trùng giờ; xếp bàn cùng `preferred_zone` lên đầu, rồi sức chứa tăng dần (A4).
    Dùng được cho đặt bàn `PENDING` (xếp bàn) và `CONFIRMED` (đổi bàn lúc nhận bàn, UC014 2a); với `CONFIRMED` chỉ trả bàn đang `AVAILABLE`. Trạng thái khác → 409 `RESERVATION_STATUS_INVALID`.
  - Xác nhận đổi `PENDING` → `CONFIRMED`, gán bàn, gửi email thông báo nếu có. Nếu giờ hẹn còn ≤ 60 phút và bàn đang `AVAILABLE` thì bàn sang `RESERVED` ngay
    (không đợi job).
  - Ngoại lệ: danh sách rỗng → client báo hết bàn; `PUT` khi không còn bàn → 409 `RESERVATION_NO_TABLE_AVAILABLE` (luồng 2a); bàn vừa được gán cho đặt bàn
    khác → 409 `RESERVATION_TABLE_CONFLICT` (luồng 4a); đặt bàn không phải `PENDING` → 409 `RESERVATION_STATUS_INVALID`; `table_id` không tồn tại hoặc sức chứa nhỏ hơn
    số khách → 400 `VALIDATION_ERROR`.
- **Từ chối / Hủy** — `PUT /reservations/{id}/reject-or-cancel` với `reason` (bắt buộc, ≤ 255 ký tự) (luồng 1–4): `PENDING` hoặc `CONFIRMED` → `CANCELLED`, lưu lý do, giải phóng bàn đã giữ
  (đưa bàn `RESERVED` về `AVAILABLE`), gửi email thông báo kèm lý do nếu có.
  - Ngoại lệ: đã `CHECKED_IN`, `CANCELLED` hoặc `NO_SHOW` → 409 `RESERVATION_STATUS_INVALID` (luồng 4a); thiếu lý do → 400 `VALIDATION_ERROR`.
- **Nhận bàn (check-in)** — `PUT /reservations/{id}/check-in` (body tùy chọn `table_id`) (luồng 1–2): đặt bàn `CONFIRMED` → `CHECKED_IN`, bàn → `OCCUPIED`, mở đơn hàng
  (module `ordering`, `waiter_id` = người bấm nhận bàn) và trả `order_id`.
  - Bàn được gán đang `AVAILABLE` hoặc `RESERVED` (do chính đặt bàn này) thì nhận được. Bàn chưa dọn xong (`OCCUPIED`) hoặc `OUT_OF_SERVICE` → 409
    `RESERVATION_TABLE_NOT_READY` (luồng 2a); nhân viên gọi lại với `table_id` của bàn khác đang `AVAILABLE`, đủ sức chứa và không trùng giờ — hệ thống đổi bàn gán rồi nhận bàn.
  - Ngoại lệ khác: đặt bàn không phải `CONFIRMED` → 409 `RESERVATION_STATUS_INVALID`.
  - Nhận bàn sớm hơn giờ hẹn được phép (khách đến sớm); không giới hạn nhận muộn trước khi job đánh dấu `NO_SHOW` (quá 15 phút).
- Mọi thao tác ghi cần vai trò `WAITER` hoặc `MANAGER`; vai trò khác → 403 `FORBIDDEN`.

### 1.3 Xem lịch sử đặt bàn và hủy đặt bàn (UC017)

- **Xem lịch sử** — `GET /me/reservations` (CUSTOMER) (luồng 1–4): danh sách đặt bàn có `customer_id` là mình, mới nhất trước, kèm trạng thái;
  `GET /me/reservations/{id}` xem chi tiết. Chỉ thấy đặt bàn gắn với tài khoản mình (đặt khi đã đăng nhập). Đặt bàn của người khác → 404 `NOT_FOUND`.
  - Chưa có đặt bàn → 200 `items: []` (luồng 2a).
- **Hủy** — `PUT /me/reservations/{id}/cancel` (luồng 1–4): `PENDING` hoặc `CONFIRMED` → `CANCELLED`, giải phóng bàn đã giữ, `cancel_reason` = "Khách hàng hủy".
  - Ngoại lệ: còn dưới 2 giờ tới giờ hẹn → 409 `RESERVATION_CANCEL_TOO_LATE` (luồng 4a); không phải `PENDING`/`CONFIRMED` → 409 `RESERVATION_STATUS_INVALID`;
    không phải của mình → 404 `NOT_FOUND`.
- Xem hóa đơn của tôi thuộc module `billing`.

## 2. Kịch bản Kiểm thử (Test Cases)

Giả định "bây giờ" là 09/10/2026 09:00 (giờ Việt Nam), 6 bàn đủ chỗ, giờ mở cửa 10:00–22:00.

| Mã TC | Loại | UC | Kịch bản | Input | Kết quả kỳ vọng |
|---|---|---|---|---|---|
| TC_RES_01 | Luồng chuẩn | UC013 | Kiểm tra còn bàn | `reserved_at=2026-10-12T19:00+07:00, guest_count=4` | 200, `available` = `true`, `suggestions` rỗng |
| TC_RES_02 | Luồng chuẩn | UC013 | Hết bàn kèm gợi ý | Mọi bàn đủ chỗ đã `CONFIRMED` lúc 19:00 | 200, `available` = `false`, `suggestions` có ≤ 4 khung cách nhau 30 phút còn bàn |
| TC_RES_03 | Ngoại lệ | UC013 | Giờ ngoài giờ mở cửa | `reserved_at` 22:00 hoặc 09:30 | 400 `RESERVATION_TIME_INVALID` |
| TC_RES_04 | Ngoại lệ | UC013 | Đặt trước dưới 2 giờ | `reserved_at` = 10:30 hôm nay | 400 `RESERVATION_TIME_INVALID` |
| TC_RES_05 | Luồng chuẩn | UC013 | Đặt đúng mốc 2 giờ | `reserved_at` = 11:00 hôm nay | 201 |
| TC_RES_06 | Ngoại lệ | UC013 | Đặt quá 30 ngày | `reserved_at` sau 31 ngày | 400 `RESERVATION_TIME_INVALID` |
| TC_RES_07 | Ngoại lệ | UC013 | Giờ trong quá khứ | `reserved_at` hôm qua | 400 `RESERVATION_TIME_INVALID` |
| TC_RES_08 | Luồng chuẩn | UC013 | Khách vãng lai đặt bàn | Không token, đủ trường | 201, `status` = `PENDING`, có `code`, `customer_id` null; gửi email nếu có `email` |
| TC_RES_09 | Luồng chuẩn | UC013 | Khách hàng đặt bàn | Token `CUSTOMER`, đủ trường | 201, `customer_id` = id tài khoản |
| TC_RES_10 | Ngoại lệ | UC013 | Thiếu số điện thoại | Không có `phone` | 400 `VALIDATION_ERROR` |
| TC_RES_11 | Ngoại lệ | UC013 | Số khách ngoài 1–50 | `guest_count=0` hoặc `51` | 400 `VALIDATION_ERROR` |
| TC_RES_12 | Ngoại lệ | UC013 | Số khách lớn hơn mọi bàn | `guest_count=50` khi bàn lớn nhất 8 chỗ | 409 `RESERVATION_NO_TABLE_AVAILABLE` |
| TC_RES_13 | Ngoại lệ | UC013 | Hết bàn khi đặt | Như TC_RES_02 | 409 `RESERVATION_NO_TABLE_AVAILABLE`, `error.detail.suggestions` có giá trị |
| TC_RES_15 | Luồng chuẩn | UC013 | Mã đặt bàn tăng dần trong ngày | Hai đặt bàn liên tiếp cùng ngày | `DB20261009-001`, `DB20261009-002` |
| TC_RES_16 | Luồng chuẩn | UC013 | `PENDING` không chiếm chỗ | Hai đặt bàn `PENDING` cùng giờ khi chỉ còn 1 bàn | Cả hai 201 |
| TC_RES_17 | Luồng chuẩn | UC014 | Xem danh sách mặc định | Không tiêu chí | 200, chỉ đặt bàn hôm nay, `reserved_at` tăng dần khi `sort_order=asc` |
| TC_RES_18 | Luồng chuẩn | UC007 | Tìm theo số điện thoại | `keyword=0989` | 200, đặt bàn có `phone` chứa "0989" (mọi ngày) |
| TC_RES_19 | Luồng chuẩn | UC007 | Tìm theo mã | `code=DB20261009-001` | 200, đúng 1 đặt bàn |
| TC_RES_20 | Luồng chuẩn | UC007 | Tìm theo trạng thái | `status=PENDING&date=2026-10-12` | 200, chỉ đặt bàn chờ xác nhận ngày 12 |
| TC_RES_21 | Luồng chuẩn | UC014 | Gợi ý bàn | Đặt bàn 4 khách ưu tiên `OUTDOOR` | 200, bàn ngoài trời đủ chỗ xếp trước; không có bàn `OUT_OF_SERVICE`, bàn nhỏ hơn 4 chỗ, bàn trùng giờ |
| TC_RES_22 | Luồng chuẩn | UC014 | Xác nhận đặt bàn | `table_id` hợp lệ | 200, `status` = `CONFIRMED`, `table_id` đúng; gửi email nếu có |
| TC_RES_23 | Luồng chuẩn | UC014 | Xác nhận khi sắp tới giờ | Giờ hẹn còn 40 phút, bàn `AVAILABLE` | 200; bàn chuyển `RESERVED` ngay |
| TC_RES_24 | Luồng chuẩn | UC014 | Xác nhận khi còn xa | Giờ hẹn còn 3 ngày | 200; bàn vẫn `AVAILABLE` (A1) |
| TC_RES_25 | Ngoại lệ | UC014 | Gán bàn trùng giờ | Bàn đã `CONFIRMED` cho đặt bàn 19:00, gán tiếp đặt bàn 20:00 cùng bàn | 409 `RESERVATION_TABLE_CONFLICT` |
| TC_RES_26 | Luồng chuẩn | UC014 | Gán cùng bàn khác khung giờ | Đặt bàn 19:00 và 21:00 (đúng bằng `reserved_end`) | Cả hai 200 (khoảng nửa mở) |
| TC_RES_27 | Ngoại lệ | UC014 | Hai nhân viên cùng gán một bàn | Hai `confirm` song song, hai đặt bàn trùng giờ | Một 200, một 409 `RESERVATION_TABLE_CONFLICT` |
| TC_RES_28 | Ngoại lệ | UC014 | Gán bàn nhỏ hơn số khách | `table_id` 2 chỗ cho 4 khách | 400 `VALIDATION_ERROR` |
| TC_RES_29 | Ngoại lệ | UC014 | Gán bàn tạm khóa | Bàn `OUT_OF_SERVICE` | 400 `VALIDATION_ERROR` |
| TC_RES_30 | Ngoại lệ | UC014 | Xác nhận đặt bàn đã xác nhận | Đặt bàn `CONFIRMED` | 409 `RESERVATION_STATUS_INVALID` |
| TC_RES_31 | Luồng chuẩn | UC014 | Từ chối đặt bàn chờ | `reason` hợp lệ | 200, `CANCELLED`, `cancel_reason` có giá trị; gửi email nếu có |
| TC_RES_32 | Luồng chuẩn | UC014 | Hủy đặt bàn đã xác nhận khi bàn đang giữ | Bàn `RESERVED` vì đặt bàn này | 200; bàn về `AVAILABLE` |
| TC_RES_33 | Ngoại lệ | UC014 | Hủy thiếu lý do | `reason` rỗng | 400 `VALIDATION_ERROR` |
| TC_RES_34 | Ngoại lệ | UC014 | Hủy đặt bàn đã nhận bàn | `CHECKED_IN` | 409 `RESERVATION_STATUS_INVALID` |
| TC_RES_35 | Luồng chuẩn | UC014 | Nhận bàn | Đặt bàn `CONFIRMED`, bàn `RESERVED` | 200, `CHECKED_IN`, bàn `OCCUPIED`, có `order_id`; đơn có `waiter_id` = người nhận, `reservation_id`, `customer_id` |
| TC_RES_36 | Luồng chuẩn | UC014 | Nhận bàn sớm | Đến sớm 30 phút, bàn `AVAILABLE` | 200 |
| TC_RES_37 | Ngoại lệ | UC014 | Bàn chưa dọn xong | Bàn được gán đang `OCCUPIED` | 409 `RESERVATION_TABLE_NOT_READY` |
| TC_RES_38 | Luồng chuẩn | UC014 | Đổi bàn khi nhận | Gọi lại với `table_id` bàn `AVAILABLE` đủ chỗ | 200; `table_id` đổi; bàn cũ (nếu `RESERVED`) về `AVAILABLE`; bàn mới `OCCUPIED` |
| TC_RES_39 | Ngoại lệ | UC014 | Đổi sang bàn đang được giữ cho đặt bàn khác | Bàn thay thế `RESERVED` | 409 `RESERVATION_TABLE_NOT_READY` |
| TC_RES_40 | Ngoại lệ | UC014 | Nhận bàn đặt bàn chưa xác nhận | `PENDING` | 409 `RESERVATION_STATUS_INVALID` |
| TC_RES_41 | Ngoại lệ | UC014 | Thu ngân thao tác đặt bàn | Token `CASHIER` gọi `PUT /reservations/{id}/confirm` | 403 `FORBIDDEN` |
| TC_RES_42 | Luồng chuẩn | UC017 | Khách hàng xem lịch sử | Token `CUSTOMER` | 200, chỉ đặt bàn của mình, mới nhất trước |
| TC_RES_43 | Ngoại lệ | UC017 | Xem đặt bàn của người khác | id của khách khác | 404 `NOT_FOUND` |
| TC_RES_44 | Luồng chuẩn | UC017 | Khách hàng hủy đặt bàn | `CONFIRMED`, còn 5 giờ | 200, `CANCELLED`, bàn đang giữ được giải phóng |
| TC_RES_45 | Ngoại lệ | UC017 | Hủy khi còn dưới 2 giờ | Còn 1 giờ 59 phút | 409 `RESERVATION_CANCEL_TOO_LATE` |
| TC_RES_46 | Ngoại lệ | UC017 | Hủy đặt bàn đã hủy | `CANCELLED` | 409 `RESERVATION_STATUS_INVALID` |
| TC_RES_47 | Ngoại lệ | UC017 | Khách vãng lai xem lịch sử | Không token | 401 `UNAUTHENTICATED` |
| TC_RES_48 | Luồng chuẩn | Job | Giữ bàn khi gần giờ | Đặt bàn `CONFIRMED`, còn 59 phút, bàn `AVAILABLE` | Sau một chu kỳ, bàn `RESERVED` |
| TC_RES_49 | Luồng chuẩn | Job | Không giữ bàn đang phục vụ | Như trên nhưng bàn `OCCUPIED` | Bàn giữ nguyên `OCCUPIED` |
| TC_RES_50 | Luồng chuẩn | Job | Không đến | `CONFIRMED`, quá giờ hẹn 16 phút, chưa nhận bàn | `NO_SHOW`, bàn `RESERVED` về `AVAILABLE` |
| TC_RES_51 | Luồng chuẩn | Job | Chờ xác nhận quá hạn | `PENDING`, quá giờ hẹn 16 phút | `NO_SHOW` |
| TC_RES_52 | Luồng chuẩn | Job | Chưa quá 15 phút | `CONFIRMED`, quá giờ hẹn 14 phút | Giữ nguyên `CONFIRMED` |
| TC_RES_53 | Luồng chuẩn | Job | Đã nhận bàn thì không bị đánh dấu | `CHECKED_IN` quá giờ hẹn nhiều giờ | Giữ nguyên |
| TC_RES_54 | Luồng chuẩn | Guard | Xóa khách hàng còn đặt bàn | `PENDING`/`CONFIRMED` | `UserDeletionGuard` trả `true` |
| TC_RES_55 | Luồng chuẩn | Guard | Xóa bàn còn đặt bàn | `CONFIRMED` chưa hết khung | `TableDeletionGuard.hasBlockingData` trả `true`; `maxGuestCountAssigned` trả số khách lớn nhất |

## 3. Công việc nền

Một `@Scheduled(fixedDelay = 60_000)` ở `ReservationScheduler`, gọi `ReservationMaintenanceService` (bean riêng, không gọi `this` để giữ
proxy transaction). Mỗi đặt bàn được xử lý trong transaction riêng (`TransactionTemplate`, `REQUIRES_NEW`), một bản ghi lỗi chỉ ghi log `ERROR`
kèm `Throwable` rồi đi tiếp. Mỗi chu kỳ xử lý tối đa 200 bản ghi.

| Việc | Điều kiện chọn | Hành động |
|---|---|---|
| Giữ bàn | `status = CONFIRMED`, `table_id` khác null, `reserved_at - 60 phút ≤ now < reserved_at + 15 phút` | `TableService.transitionStatus(table_id, [AVAILABLE], RESERVED)`; trả `false` (bàn đang phục vụ hoặc đang khóa) thì bỏ qua |
| Không đến | `status IN (PENDING, CONFIRMED)` và `reserved_at + 15 phút < now` | Đặt `NO_SHOW`; nếu có `table_id` thì `transitionStatus(table_id, [RESERVED], AVAILABLE)` |

Chu kỳ 60 giây nên đặt bàn có thể bị đánh dấu `NO_SHOW` trễ tối đa 1 phút so với mốc 15 phút. Giả định chạy một instance backend (README mục 2.11).
