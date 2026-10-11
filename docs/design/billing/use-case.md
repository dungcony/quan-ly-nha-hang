# Kịch bản Use Case & Test Cases: Thanh toán, Hóa đơn & Báo cáo

Tác nhân: Thu ngân (UC018, UC019, UC007 tìm hóa đơn), Quản lý (UC019, UC020), Khách hàng (UC017 phần hóa đơn của tôi). Quy ước chung, VAT, múi giờ và cách hiểu SRS
(A12–A16, A23): xem [`../README.md`](../README.md).

Mỗi bàn thanh toán đúng một hóa đơn (không tách/gộp). Hóa đơn là bản chụp bất biến của đơn hàng lúc thanh toán: tên bàn, tên thu ngân, tên món, đơn giá, số lượng, VAT. Số tiền VND,
số nguyên. `VAT = làm tròn HALF_UP (thành tiền × vat-rate)`; `tổng tiền = thành tiền + VAT`; `tiền thừa = tiền khách đưa − tổng tiền`.

## 1. Kịch bản Use Case

### 1.1 Thanh toán và xuất hóa đơn (UC018)

- **Xem đơn cần thanh toán** — Thu ngân chọn bàn, client lấy đơn `OPEN` của bàn bằng `GET /orders?status=OPEN&table_id=...` (module `ordering`) rồi gọi
  `GET /billing/orders/{orderId}` (luồng 1–2): các dòng món không `CANCELLED` với đơn giá, số lượng, thành tiền, tổng tạm tính, VAT, tổng tiền và `unserved_count`.
- **Thanh toán** — `POST /invoices` (CASHIER) với `order_id`, `payment_method`, `amount_received` (bắt buộc khi `CASH`), `note` (tùy chọn),
  `confirm_unserved` (mặc định `false`) (luồng 3–6). Trong **một transaction**: khóa đơn (`FOR UPDATE`), tính tiền, lưu hóa đơn `PAID` kèm các dòng chụp, sinh mã `HD...`,
  đóng đơn (`CLOSED`), chuyển bàn `OCCUPIED` → `AVAILABLE`. Trả hóa đơn đầy đủ (201). Với `CARD`/`BANK_TRANSFER`, `amount_received` bị bỏ qua và lưu bằng tổng tiền, tiền thừa 0 (A12).
- **In hóa đơn** — client in từ dữ liệu 201 hoặc `GET /invoices/{id}` (luồng 7–8, A14).
- **Kịch bản ngoại lệ**:
  - Đơn không có dòng món nào (hoặc toàn `CANCELLED`) → 400 `INVOICE_ORDER_EMPTY`.
  - Còn dòng món chưa `SERVED` mà `confirm_unserved = false` → 409 `INVOICE_UNSERVED_ITEMS`, `error.detail.unserved_count` (luồng 2a); Thu ngân xác nhận tiếp tục thì gọi lại
    với `confirm_unserved = true`, hoặc quay lại xử lý.
  - `CASH` mà `amount_received` thiếu → 400 `VALIDATION_ERROR`; nhỏ hơn tổng tiền → 400 `INVOICE_AMOUNT_INSUFFICIENT` (luồng 4a).
  - `payment_method` sai giá trị, `note` quá 255 ký tự → 400 `VALIDATION_ERROR`.
  - Đơn đã đóng (người khác vừa thanh toán) → 409 `ORDER_NOT_OPEN`; đơn không tồn tại → 404 `NOT_FOUND`.
  - Không có luồng "giao dịch thẻ/chuyển khoản thất bại" từ cổng thanh toán (A12); lỗi lưu → 500 `INTERNAL_ERROR`, toàn bộ transaction rollback, đơn giữ `OPEN` (luồng 6a).

### 1.2 Xem lịch sử hóa đơn (UC019) và tìm kiếm hóa đơn (UC007)

- **Kịch bản chính (200)** — `GET /invoices` (CASHIER, MANAGER): tiêu chí của Bảng 2-17: `code` (mã hóa đơn, chứa chuỗi), `from_date`, `to_date` (theo `paid_at`, gồm hai đầu), `table`
  (tên bàn chứa chuỗi), `payment_method`. Mới nhất trước. Thu ngân chỉ thấy hóa đơn của **ngày hôm nay** (A15); Quản lý thấy toàn bộ.
  - `GET /invoices/{id}`: chi tiết gồm bàn, thời gian, các dòng, VAT, tổng tiền, phương thức, người lập (luồng 3–4).
  - `POST /invoices/{id}/reprint`: tăng `print_count`, trả hóa đơn với `reprint = true`; client in kèm dấu "Bản in lại" (luồng 5–6).
- **Kịch bản ngoại lệ**:
  - Chưa có hóa đơn nào → 200 `items: []` (luồng 2a).
  - `from_date` sau `to_date`, `payment_method` sai giá trị → 400 `VALIDATION_ERROR`.
  - Thu ngân xem hoặc in lại hóa đơn của ngày khác → 404 `NOT_FOUND` (không lộ sự tồn tại).
  - Id không tồn tại → 404 `NOT_FOUND`. Máy in hỏng là lỗi phía client (luồng 6a).

### 1.3 Xem hóa đơn của tôi (UC017)

- **Kịch bản chính (200)** — `GET /me/invoices` (CUSTOMER): hóa đơn `PAID` có `customer_id` là mình, mới nhất trước (luồng 1–2); `GET /me/invoices/{id}` xem chi tiết: các món, số lượng, VAT, tổng tiền,
  phương thức (luồng 3–4). Hóa đơn gắn tài khoản khi khách hàng đã đặt bàn lúc đăng nhập và nhận bàn (A23).
- **Kịch bản ngoại lệ**: chưa có hóa đơn → 200 `items: []` (luồng 2a); hóa đơn của người khác hoặc không tồn tại → 404 `NOT_FOUND`; khách vãng lai (không token) → 401 `UNAUTHENTICATED`.

### 1.4 Xem báo cáo doanh thu (UC020)

- **Kịch bản chính (200)** — Quản lý chọn loại báo cáo và khoảng thời gian (Bảng 2-38), hệ thống tổng hợp các hóa đơn `PAID` có `paid_at` trong `[from_date, to_date]` theo múi giờ nhà hàng
  (luồng 3–6). Ba loại, ba endpoint:
  - `GET /reports/revenue/daily`: mỗi ngày có hóa đơn một điểm `{date, invoice_count, subtotal, vat_amount, total_amount}`, kèm `summary` cộng dồn.
  - `GET /reports/revenue/monthly`: như trên nhưng gộp theo tháng lịch (`month` = `yyyy-MM`); tháng đầu/cuối chỉ tính hóa đơn nằm trong khoảng (A16).
  - `GET /reports/top-dishes`: `top_n` (1–50, mặc định 10) món bán chạy nhất, xếp theo số lượng bán giảm dần rồi doanh thu giảm dần: `{dish_id, dish_name, quantity, revenue}`.
  - Ngày không có hóa đơn không có điểm; client tự điền 0 khi vẽ biểu đồ.
- **Kịch bản ngoại lệ**:
  - `to_date` trước `from_date`, khoảng quá 366 ngày → 400 `REPORT_RANGE_INVALID` (luồng 4a); thiếu `from_date`/`to_date`, `top_n` ngoài 1–50 → 400 `VALIDATION_ERROR`.
  - Không có hóa đơn nào trong khoảng → 200 với `points: []` / `items: []` và `summary` toàn 0; client hiện "Không có dữ liệu" (luồng 6a).

## 2. Kịch bản Kiểm thử (Test Cases)

Giả định VAT 8%, múi giờ `Asia/Ho_Chi_Minh`.

| Mã TC | Loại | UC | Kịch bản | Input | Kết quả kỳ vọng |
|---|---|---|---|---|---|
| TC_BILL_01 | Luồng chuẩn | UC018 | Xem tổng tiền trước khi trả | Đơn 2 × 65.000 và 1 × 30.000 | 200, `subtotal` = 160.000, `vat_amount` = 12.800, `total_amount` = 172.800 |
| TC_BILL_02 | Luồng chuẩn | UC018 | Thanh toán tiền mặt | `CASH`, `amount_received` = 200.000 | 201, `PAID`, `change_amount` = 27.200; đơn `CLOSED`; bàn `AVAILABLE`; có `code` dạng `HD20261009-001` |
| TC_BILL_03 | Luồng chuẩn | UC018 | Trả đúng số tiền | `amount_received` = tổng tiền | 201, `change_amount` = 0 |
| TC_BILL_04 | Luồng chuẩn | UC018 | Thanh toán thẻ | `CARD`, không `amount_received` | 201, `amount_received` = `total_amount`, `change_amount` = 0 |
| TC_BILL_05 | Luồng chuẩn | UC018 | Thanh toán chuyển khoản có gửi kèm số tiền | `BANK_TRANSFER`, `amount_received` = 1 | 201, `amount_received` = `total_amount` (giá trị gửi bị bỏ qua) |
| TC_BILL_06 | Luồng chuẩn | UC018 | VAT làm tròn | `subtotal` = 33.333 (VAT 8% = 2.666,64) | `vat_amount` = 2.667, `total_amount` = 36.000 |
| TC_BILL_07 | Ngoại lệ | UC018 | Tiền khách đưa thiếu | `CASH`, nhỏ hơn tổng | 400 `INVOICE_AMOUNT_INSUFFICIENT`; đơn vẫn `OPEN` |
| TC_BILL_08 | Ngoại lệ | UC018 | Tiền mặt thiếu `amount_received` | `CASH`, không có trường | 400 `VALIDATION_ERROR` |
| TC_BILL_09 | Ngoại lệ | UC018 | Phương thức sai | `payment_method=CRYPTO` | 400 `VALIDATION_ERROR` |
| TC_BILL_10 | Ngoại lệ | UC018 | Đơn không có món | Đơn `OPEN` chưa gọi món | 400 `INVOICE_ORDER_EMPTY` |
| TC_BILL_11 | Ngoại lệ | UC018 | Còn món chưa phục vụ | 1 dòng `READY`, `confirm_unserved` mặc định | 409 `INVOICE_UNSERVED_ITEMS`, `detail.unserved_count` = 1; chưa có hóa đơn |
| TC_BILL_12 | Luồng chuẩn | UC018 | Xác nhận trả khi còn món chưa phục vụ | Như trên, `confirm_unserved=true` | 201; đơn `CLOSED`; dòng chưa phục vụ không còn trong hàng đợi bếp |
| TC_BILL_13 | Ngoại lệ | UC018 | Đơn đã thanh toán | Gọi lại với đơn `CLOSED` | 409 `ORDER_NOT_OPEN` |
| TC_BILL_14 | Ngoại lệ | UC018 | Hai thu ngân cùng tính một bàn | Hai `POST /invoices` song song | Một 201, một 409 `ORDER_NOT_OPEN`; đúng 1 hóa đơn |
| TC_BILL_16 | Ngoại lệ | UC018 | Đơn không tồn tại | `order_id` lạ | 404 `NOT_FOUND` |
| TC_BILL_17 | Ngoại lệ | UC018 | Thanh toán lỗi giữa chừng | Giả lập lỗi khi chuyển bàn | Rollback: không có hóa đơn, đơn `OPEN`, bàn `OCCUPIED` |
| TC_BILL_18 | Luồng chuẩn | UC018 | Hóa đơn gắn tài khoản | Đơn có `customer_id` | Hóa đơn có `customer_id` đó |
| TC_BILL_19 | Luồng chuẩn | UC018 | Hóa đơn là bản chụp bất biến | Sau khi trả: đổi giá món, đổi tên bàn, xóa thu ngân | `GET /invoices/{id}` vẫn trả giá, tên bàn, tên thu ngân cũ |
| TC_BILL_20 | Luồng chuẩn | UC018 | Dòng `CANCELLED` không tính | Đơn có 1 dòng `CANCELLED` | Hóa đơn không có dòng đó; không tính tiền |
| TC_BILL_21 | Ngoại lệ | UC018 | Phục vụ thanh toán | Token `WAITER` gọi `POST /invoices` | 403 `FORBIDDEN` |
| TC_BILL_22 | Luồng chuẩn | UC019 | Thu ngân xem hóa đơn hôm nay | Có hóa đơn hôm nay và hôm qua | 200, chỉ hóa đơn hôm nay |
| TC_BILL_23 | Luồng chuẩn | UC019 | Thu ngân lọc ngày khác bị cắt | `from_date` = hôm qua | 200, vẫn chỉ hôm nay |
| TC_BILL_24 | Luồng chuẩn | UC019 | Quản lý xem toàn bộ | Token `MANAGER` | 200, cả hôm qua và hôm nay |
| TC_BILL_25 | Luồng chuẩn | UC007 | Tìm theo mã | `code=HD20261009-015` | 200, đúng 1 hóa đơn |
| TC_BILL_26 | Luồng chuẩn | UC007 | Tìm theo bàn và phương thức | `table=b05&payment_method=CASH` | 200, đúng các hóa đơn tiền mặt của bàn B05 |
| TC_BILL_27 | Luồng chuẩn | UC007 | Tìm theo khoảng ngày | `from_date=2026-10-01&to_date=2026-10-09` | 200, hóa đơn có `paid_at` trong khoảng (tính theo giờ Việt Nam, gồm hai đầu) |
| TC_BILL_28 | Ngoại lệ | UC007 | Khoảng ngày ngược | `from_date` sau `to_date` | 400 `VALIDATION_ERROR` |
| TC_BILL_29 | Luồng chuẩn | UC019 | Xem chi tiết | id hợp lệ | 200, đủ bàn, thời gian, dòng món, VAT, tổng, phương thức, người lập |
| TC_BILL_30 | Ngoại lệ | UC019 | Thu ngân xem hóa đơn hôm qua | id hóa đơn hôm qua | 404 `NOT_FOUND` |
| TC_BILL_31 | Luồng chuẩn | UC019 | In lại | `POST /invoices/{id}/reprint` | 200, `reprint` = `true`, `print_count` tăng 1 |
| TC_BILL_32 | Ngoại lệ | UC019 | In lại hóa đơn không tồn tại | id sai | 404 `NOT_FOUND` |
| TC_BILL_33 | Ngoại lệ | UC019 | Bếp xem hóa đơn | Token `CHEF` gọi `GET /invoices` | 403 `FORBIDDEN` |
| TC_BILL_34 | Luồng chuẩn | UC017 | Khách hàng xem hóa đơn của mình | Token `CUSTOMER` | 200, chỉ hóa đơn có `customer_id` là mình |
| TC_BILL_35 | Ngoại lệ | UC017 | Xem hóa đơn của người khác | id hóa đơn khách khác | 404 `NOT_FOUND` |
| TC_BILL_36 | Luồng chuẩn | UC017 | Khách hàng chưa có hóa đơn | Tài khoản mới | 200, `items: []` |
| TC_BILL_37 | Luồng chuẩn | UC020 | Doanh thu theo ngày | Khoảng 3 ngày, 2 ngày có hóa đơn | 200, 2 điểm; `summary` = tổng các điểm |
| TC_BILL_38 | Luồng chuẩn | UC020 | Hóa đơn sát nửa đêm | Thanh toán 23:50 giờ Việt Nam | Tính vào đúng ngày địa phương, không lệch sang ngày UTC |
| TC_BILL_39 | Luồng chuẩn | UC020 | Doanh thu theo tháng | `from_date=2026-09-15&to_date=2026-10-09` | 200, 2 điểm `2026-09`, `2026-10`; tháng 9 chỉ tính từ ngày 15 |
| TC_BILL_40 | Luồng chuẩn | UC020 | Món bán chạy | `top_n=3` | 200, tối đa 3 món theo số lượng giảm dần, hòa thì doanh thu giảm dần |
| TC_BILL_41 | Luồng chuẩn | UC020 | Món bán chạy mặc định | Không `top_n` | 200, tối đa 10 món |
| TC_BILL_42 | Ngoại lệ | UC020 | Khoảng ngược | `to_date` trước `from_date` | 400 `REPORT_RANGE_INVALID` |
| TC_BILL_43 | Ngoại lệ | UC020 | Khoảng quá dài | 400 ngày | 400 `REPORT_RANGE_INVALID` |
| TC_BILL_44 | Ngoại lệ | UC020 | `top_n` ngoài 1–50 | `top_n=0` hoặc `51` | 400 `VALIDATION_ERROR` |
| TC_BILL_45 | Luồng chuẩn | UC020 | Khoảng không có dữ liệu | Không có hóa đơn | 200, `points: []`, `summary` toàn 0 |
| TC_BILL_46 | Ngoại lệ | UC020 | Thu ngân xem báo cáo | Token `CASHIER` | 403 `FORBIDDEN` |
| TC_BILL_47 | Luồng chuẩn | Guard | Thu ngân đã lập hóa đơn | `UserDeletionGuard.hasBlockingData` | `true` |
