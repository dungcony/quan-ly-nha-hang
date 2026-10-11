# Kịch bản Use Case & Test Cases: Gọi món & Chế biến

Tác nhân: Nhân viên phục vụ (UC015), Bếp (UC016); Thu ngân chỉ xem đơn để thanh toán. Quy ước chung, trạng thái dòng món và cách hiểu SRS
(A8–A11): xem [`../README.md`](../README.md).

Đơn hàng (`orders`) gắn với một bàn; mỗi bàn có tối đa một đơn `OPEN`. Dòng món (`order_items`) đi qua `PENDING` (Chờ chế biến) → `COOKING`
(Đang chế biến) → `READY` (Đã xong) → `SERVED` (Đã phục vụ). Giá và tên món được chụp lại ở dòng món lúc gửi bếp. Thông báo "món lên bếp", "món đã xong" là
polling (README mục 2.11).

## 1. Kịch bản Use Case

### 1.1 Gọi món và gửi bếp (UC015)

- **Mở đơn** — `POST /orders` (WAITER) với `table_id` (luồng 1–2): dùng khi bàn đang `AVAILABLE` (khách vãng lai). Hệ thống chuyển bàn sang `OCCUPIED`
  và tạo đơn `OPEN`, `waiter_id` = người gọi. Bàn có khách đặt trước thì đơn được mở ở lúc nhận bàn (module `reservation`), nên bàn `OCCUPIED` đã có đơn: client lấy bằng
  `GET /orders?status=OPEN&table_id=...`.
  - Ngoại lệ: bàn không `AVAILABLE` (đang phục vụ, đang giữ cho đặt bàn, tạm khóa) → 409 `ORDER_TABLE_NOT_OPENABLE`; `table_id` không tồn tại → 404 `NOT_FOUND`.
- **Xem đơn hiện tại** — `GET /orders/{id}` (WAITER, CASHIER): các dòng món kèm trạng thái, tổng tạm tính (dòng `CANCELLED` không tính). Thực đơn lấy từ `GET /menu/dishes`.
- **Gọi món và gửi bếp** — `POST /orders/{id}/items` (WAITER) với danh sách dòng `{dish_id, quantity, note}` (luồng 3–6). Giỏ tạm nằm ở client (A10); một lần gọi
  ghi tất cả dòng ở `PENDING` kèm `sent_at`, và hiện ngay trong hàng đợi của Bếp. Gọi thêm = gọi lại endpoint này với danh sách mới. Mọi `WAITER` thêm được vào đơn của bàn bất kỳ.
  - Ngoại lệ: món `OUT_OF_STOCK`/`DISCONTINUED` → 400 `DISH_NOT_ORDERABLE` (luồng 4a), `error.detail.dish_ids` liệt kê các món bị từ chối, không dòng nào được lưu;
    `quantity` ngoài 1–99, danh sách rỗng hoặc quá 50 dòng, ghi chú quá 255 ký tự → 400 `VALIDATION_ERROR` (luồng 4a); đơn đã đóng → 409 `ORDER_NOT_OPEN`;
    món không tồn tại → 404 `NOT_FOUND`; lưu lỗi → 500 `INTERNAL_ERROR`, không lưu dòng nào, client giữ giỏ để gửi lại (luồng 6a).
- **Hủy mở bàn nhầm** — `DELETE /orders/{id}` (WAITER) khi đơn `OPEN` chưa có dòng món: xóa đơn và trả bàn về `AVAILABLE` (A9).
  - Ngoại lệ: đã có dòng món → 409 `ORDER_HAS_ITEMS`; đơn đã đóng → 409 `ORDER_NOT_OPEN`.
- **Xác nhận đã phục vụ món** — `GET /order-items/ready` rồi `PUT /order-items/{id}/served` (luồng 1–3): danh sách món `READY` của các đơn do mình mở (A11), cũ nhất trước;
  bấm "Đã phục vụ" chuyển dòng sang `SERVED`.
  - Ngoại lệ: dòng không còn `READY` (đã `SERVED` do người khác) → 409 `ORDER_ITEM_STATUS_CONFLICT`; đơn đã đóng → 409 `ORDER_NOT_OPEN`; id sai → 404 `NOT_FOUND`;
    lỗi lưu → 500 `INTERNAL_ERROR` (luồng 3a).
- Không có sửa hay hủy dòng món sau khi gửi bếp (ghi chú Bảng 2-31, A8).

### 1.2 Xử lý món ăn (UC016)

- **Xem hàng đợi** — `GET /kitchen/items` (CHEF) (luồng 1–2): các dòng `PENDING` và `COOKING` của các đơn `OPEN`, cũ nhất trước (`sent_at`), mỗi dòng kèm tên bàn, tên món,
  số lượng, ghi chú. Truyền `status=PENDING` hoặc `status=COOKING` để lọc. Giới hạn 200 dòng. Client làm mới ~5 giây.
  - Hàng đợi rỗng → 200 `[]` (luồng 2a).
- **Nhận chế biến** — `PUT /kitchen/items/{id}/start` (luồng 3–4): `PENDING` → `COOKING`, lưu `started_at`, `chef_id`.
  - Ngoại lệ: dòng không còn `PENDING` (đã có người nhận) → 409 `ORDER_ITEM_STATUS_CONFLICT`, client làm mới hàng đợi (luồng 4a). Hai bếp bấm cùng lúc: chỉ một người thành công (README mục 2.10).
- **Hoàn thành** — `PUT /kitchen/items/{id}/ready` (luồng 5–6): `COOKING` → `READY`, lưu `ready_at`. Món xuất hiện ở `GET /order-items/ready` của nhân viên phục vụ phụ trách bàn.
  - Ngoại lệ: dòng không ở `COOKING` → 409 `ORDER_ITEM_STATUS_CONFLICT`; lỗi lưu → 500 `INTERNAL_ERROR`, Bếp thực hiện lại (luồng 6a).
- Dòng của đơn đã đóng (Thu ngân thanh toán khi còn món chưa phục vụ, A13) không còn trong hàng đợi và không thao tác được: 409 `ORDER_NOT_OPEN`.
- Hết nguyên liệu: Bếp báo trực tiếp Quản lý để chuyển món `OUT_OF_STOCK` (UC010). Không có chức năng riêng.

## 2. Kịch bản Kiểm thử (Test Cases)

| Mã TC | Loại | UC | Kịch bản | Input | Kết quả kỳ vọng |
|---|---|---|---|---|---|
| TC_ORD_01 | Luồng chuẩn | UC015 | Mở đơn cho khách vãng lai | Bàn `AVAILABLE` | 201, đơn `OPEN`, `waiter_id` = người gọi; bàn `OCCUPIED` |
| TC_ORD_02 | Ngoại lệ | UC015 | Mở đơn bàn đang phục vụ | Bàn `OCCUPIED` | 409 `ORDER_TABLE_NOT_OPENABLE` |
| TC_ORD_03 | Ngoại lệ | UC015 | Mở đơn bàn đang giữ cho đặt bàn | Bàn `RESERVED` | 409 `ORDER_TABLE_NOT_OPENABLE` |
| TC_ORD_04 | Ngoại lệ | UC015 | Mở đơn bàn tạm khóa | Bàn `OUT_OF_SERVICE` | 409 `ORDER_TABLE_NOT_OPENABLE` |
| TC_ORD_05 | Ngoại lệ | UC015 | Hai nhân viên cùng mở một bàn | Hai `POST /orders` song song | Một 201, một 409 `ORDER_TABLE_NOT_OPENABLE`; chỉ 1 đơn `OPEN` |
| TC_ORD_06 | Luồng chuẩn | UC015 | Gọi nhiều món một lần | 3 dòng hợp lệ | 201; 3 dòng `PENDING` có `sent_at`; tên và giá chụp từ menu |
| TC_ORD_07 | Luồng chuẩn | UC015 | Gọi thêm lần hai | Gọi tiếp 1 dòng | 201; đơn có 4 dòng; dòng cũ không đổi |
| TC_ORD_08 | Luồng chuẩn | UC015 | Cùng món hai dòng khác ghi chú | Phở bò: "không hành" và "ít cay" | 201; 2 dòng riêng |
| TC_ORD_09 | Ngoại lệ | UC015 | Gọi món hết | Món `OUT_OF_STOCK` | 400 `DISH_NOT_ORDERABLE`, `detail.dish_ids` có món đó |
| TC_ORD_10 | Ngoại lệ | UC015 | Gọi món ngừng bán | Món `DISCONTINUED` | 400 `DISH_NOT_ORDERABLE` |
| TC_ORD_11 | Ngoại lệ | UC015 | Một món hết trong danh sách | 3 dòng, 1 dòng món hết | 400 `DISH_NOT_ORDERABLE`; không dòng nào được lưu |
| TC_ORD_12 | Ngoại lệ | UC015 | Số lượng ngoài 1–99 | `quantity=0` hoặc `100` | 400 `VALIDATION_ERROR` |
| TC_ORD_13 | Ngoại lệ | UC015 | Danh sách rỗng | `items: []` | 400 `VALIDATION_ERROR` |
| TC_ORD_14 | Ngoại lệ | UC015 | Ghi chú quá dài | 256 ký tự | 400 `VALIDATION_ERROR` |
| TC_ORD_15 | Ngoại lệ | UC015 | Món không tồn tại | `dish_id` lạ | 404 `NOT_FOUND` |
| TC_ORD_16 | Ngoại lệ | UC015 | Gọi món vào đơn đã đóng | Đơn `CLOSED` | 409 `ORDER_NOT_OPEN` |
| TC_ORD_17 | Luồng chuẩn | UC015 | Giá món đổi sau khi gọi | Quản lý sửa giá sau khi gửi bếp | Dòng món cũ giữ `unit_price` cũ; dòng gọi sau lấy giá mới |
| TC_ORD_19 | Luồng chuẩn | UC015 | Xem đơn của bàn | `GET /orders?status=OPEN&table_id=...` | 200, đúng đơn kèm các dòng và tổng tạm tính |
| TC_ORD_20 | Luồng chuẩn | UC015 | Thu ngân xem đơn | Token `CASHIER` gọi `GET /orders/{id}` | 200 |
| TC_ORD_21 | Ngoại lệ | UC015 | Thu ngân gọi món | Token `CASHIER` gọi `POST /orders/{id}/items` | 403 `FORBIDDEN` |
| TC_ORD_22 | Luồng chuẩn | UC015 | Hủy đơn mở nhầm | Đơn `OPEN` chưa có dòng món | 200; đơn bị xóa; bàn `AVAILABLE` |
| TC_ORD_23 | Ngoại lệ | UC015 | Hủy đơn đã có món | Có ít nhất một dòng | 409 `ORDER_HAS_ITEMS` |
| TC_ORD_24 | Luồng chuẩn | UC015 | Xem món đã xong | Dòng `READY` của đơn mình mở | 200, chỉ chứa dòng đó, thứ tự `ready_at` tăng dần |
| TC_ORD_25 | Luồng chuẩn | UC015 | Không thấy món của đơn người khác | Dòng `READY` của đơn nhân viên B | Không có trong danh sách của nhân viên A |
| TC_ORD_26 | Luồng chuẩn | UC015 | Xác nhận đã phục vụ | `PUT /order-items/{id}/served`, dòng `READY` | 200, `SERVED`, có `served_at` |
| TC_ORD_27 | Luồng chuẩn | UC015 | Nhân viên khác xác nhận phục vụ hộ | Nhân viên B bấm dòng của đơn A | 200 |
| TC_ORD_28 | Ngoại lệ | UC015 | Xác nhận dòng chưa xong | Dòng `COOKING` | 409 `ORDER_ITEM_STATUS_CONFLICT` |
| TC_ORD_29 | Ngoại lệ | UC015 | Xác nhận hai lần | Dòng đã `SERVED` | 409 `ORDER_ITEM_STATUS_CONFLICT` |
| TC_ORD_30 | Luồng chuẩn | UC016 | Xem hàng đợi | Có dòng `PENDING`, `COOKING`, `READY`, `SERVED` | 200, chỉ `PENDING` và `COOKING`, cũ nhất trước, kèm tên bàn |
| TC_ORD_31 | Luồng chuẩn | UC016 | Hàng đợi rỗng | Không dòng nào | 200 `[]` |
| TC_ORD_32 | Luồng chuẩn | UC016 | Lọc hàng đợi | `status=COOKING` | 200, chỉ dòng đang chế biến |
| TC_ORD_33 | Luồng chuẩn | UC016 | Nhận chế biến | Dòng `PENDING` | 200, `COOKING`, `chef_id` = Bếp, có `started_at` |
| TC_ORD_34 | Ngoại lệ | UC016 | Nhận trùng | Hai Bếp bấm cùng lúc | Một 200, một 409 `ORDER_ITEM_STATUS_CONFLICT` |
| TC_ORD_35 | Ngoại lệ | UC016 | Nhận dòng đã nhận | Dòng `COOKING` | 409 `ORDER_ITEM_STATUS_CONFLICT` |
| TC_ORD_36 | Luồng chuẩn | UC016 | Hoàn thành món | Dòng `COOKING` | 200, `READY`, có `ready_at`; hiện ở `GET /order-items/ready` của nhân viên phụ trách |
| TC_ORD_37 | Ngoại lệ | UC016 | Hoàn thành khi chưa nhận | Dòng `PENDING` | 409 `ORDER_ITEM_STATUS_CONFLICT` |
| TC_ORD_38 | Ngoại lệ | UC016 | Thao tác dòng của đơn đã đóng | Dòng `PENDING` của đơn `CLOSED` | 409 `ORDER_NOT_OPEN`; không có trong hàng đợi |
| TC_ORD_39 | Ngoại lệ | UC016 | Dòng không tồn tại | id sai | 404 `NOT_FOUND` |
| TC_ORD_40 | Ngoại lệ | Chung | Nhân viên khác vào màn bếp | Token `WAITER` gọi `GET /kitchen/items` | 403 `FORBIDDEN` |
| TC_ORD_41 | Luồng chuẩn | Guard | Món đã được gọi | `DishDeletionGuard.isUsed` | `true` |
| TC_ORD_42 | Luồng chuẩn | Guard | Bàn có đơn `OPEN` | `TableDeletionGuard.hasBlockingData` | `true` |
| TC_ORD_43 | Luồng chuẩn | Guard | Nhân viên có đơn hoặc dòng món đã chế biến | `UserDeletionGuard.hasBlockingData` | `true` |
