# Thiết kế API & Biểu đồ tuần tự: Gọi món & Chế biến

Quy ước URL, response, phân trang và mã lỗi: xem [`../README.md`](../README.md).

## 1. Mô tả API Endpoints

| Method | URL | Vai trò | UC | Request | Response (`data`) |
|---|---|---|---|---|---|
| POST | `/orders` | `WAITER` | UC015 | `OrderOpenRequest` | 201 `OrderResponse` |
| GET | `/orders` | `WAITER`, `CASHIER` | UC015, UC018 | Query `OrderSearchRequest` + phân trang | 200 `{items: OrderSummaryResponse[], meta}` |
| GET | `/orders/{id}` | `WAITER`, `CASHIER` | UC015 | — | 200 `OrderResponse` |
| POST | `/orders/{id}/items` | `WAITER` | UC015 | `OrderItemsAddRequest` | 201 `OrderResponse` |
| DELETE | `/orders/{id}` | `WAITER` | UC015 | — | 200 `null` |
| GET | `/order-items/ready` | `WAITER` | UC015 | — | 200 `ReadyItemResponse[]` |
| PUT | `/order-items/{id}/served` | `WAITER` | UC015 | — | 200 `OrderItemResponse` |
| GET | `/kitchen/items` | `CHEF` | UC016 | Query `status` (tùy chọn) | 200 `KitchenItemResponse[]` |
| PUT | `/kitchen/items/{id}/start` | `CHEF` | UC016 | — | 200 `KitchenItemResponse` |
| PUT | `/kitchen/items/{id}/ready` | `CHEF` | UC016 | — | 200 `KitchenItemResponse` |

Ghi chú:

- `GET /orders` mặc định `status=OPEN`; `table_id` lọc theo bàn. `sort_by`: `opened_at` (mặc định), `closed_at`. Thu ngân dùng endpoint này để tìm đơn của bàn cần thanh toán.
- `GET /kitchen/items` và `GET /order-items/ready` là hàng đợi giới hạn (tối đa 200 dòng), trả mảng thường, không có `meta`. Cả hai sắp cũ nhất trước (`sent_at`, `ready_at`).
  Client gọi lại mỗi ~5 giây; response nhỏ, không cần `ETag` ở bản này.
- Các hàm đổi trạng thái dòng món là `PUT .../start`, `.../ready`, `.../served`; không nhận body. Dùng `PUT` vì idempotent về kết quả cuối; gọi lại khi đã qua trạng thái đó trả 409
  `ORDER_ITEM_STATUS_CONFLICT` để client biết thao tác đã có người làm.
- `DELETE /orders/{id}` tự an toàn khi gọi lại (lần hai trả 404).
- `OrderItemsAddRequest` gồm `items` tối đa 50 dòng. Dòng món lưu `dish_name`, `unit_price` tại thời điểm gửi.
- Hàm nội bộ cho module khác (không có endpoint), chi tiết ở `lopthucthe.md`: `openOrder` (cho `reservation`), `lockOrderForPayment`, `closeOrder` (cho `billing`).

Ví dụ `POST /orders/{id}/items`:

```json
{
  "items": [
    { "dish_id": "7b0c2d9e-2f0b-4d6e-8d63-0c3f6a0f2a11", "quantity": 2, "note": "Không hành, ít cay" },
    { "dish_id": "2e4f8a10-5d12-4c8b-9a77-5a1d3e9b7c02", "quantity": 1 }
  ]
}
```

Ví dụ lỗi món không gọi được:

```json
{
  "success": false,
  "error": {
    "code": "DISH_NOT_ORDERABLE",
    "message": "Có món đang hết hoặc ngừng bán.",
    "fields": [],
    "detail": { "dish_ids": ["2e4f8a10-5d12-4c8b-9a77-5a1d3e9b7c02"] }
  }
}
```

## 2. Biểu đồ Tuần tự (Sequence Diagram) - Gọi món và gửi bếp (UC015)

```mermaid
sequenceDiagram
    actor Waiter as Nhân viên phục vụ
    participant Ctrl as OrderController
    participant Svc as OrderServiceImpl
    participant Dish as DishService
    participant Repo as OrderRepository
    participant ItemRepo as OrderItemRepository
    participant Handler as GlobalExceptionHandler

    Waiter->>Ctrl: POST /orders/{id}/items (OrderItemsAddRequest)
    Ctrl->>Ctrl: @PreAuthorize WAITER, @Valid kiểm tra request

    alt Request không hợp lệ
        Ctrl->>Handler: MethodArgumentNotValidException
        Handler-->>Waiter: 400 VALIDATION_ERROR
    else Request hợp lệ
        Ctrl->>Svc: addItems(id, request)
        Svc->>Repo: findById(id)

        alt Không tìm thấy
            Svc->>Handler: BusinessException(NOT_FOUND)
            Handler-->>Waiter: 404 NOT_FOUND
        else Đơn đã đóng
            Svc->>Handler: BusinessException(ORDER_NOT_OPEN)
            Handler-->>Waiter: 409 ORDER_NOT_OPEN
        else Đơn OPEN
            Svc->>Dish: getDishesForOrdering(dishIds)

            alt Có món không tồn tại
                Dish->>Handler: BusinessException(NOT_FOUND)
                Handler-->>Waiter: 404 NOT_FOUND
            else Có món không AVAILABLE
                Svc->>Handler: BusinessException(DISH_NOT_ORDERABLE, detail.dish_ids)
                Handler-->>Waiter: 400 DISH_NOT_ORDERABLE
            else Mọi món AVAILABLE
                Svc->>ItemRepo: saveAll(dòng PENDING, sent_at = now, chụp tên và giá)
                Svc-->>Ctrl: OrderResponse
                Ctrl-->>Waiter: 201 ApiResponse(OrderResponse)
            end
        end
    end
```

## 3. Biểu đồ Tuần tự (Sequence Diagram) - Bếp chế biến và phục vụ món (UC016, UC015)

```mermaid
sequenceDiagram
    actor Chef as Bếp
    actor Waiter as Nhân viên phục vụ
    participant KCtrl as KitchenController
    participant WCtrl as OrderItemController
    participant Svc as OrderItemServiceImpl
    participant Repo as OrderItemRepository
    participant Handler as GlobalExceptionHandler

    loop Mỗi ~5 giây
        Chef->>KCtrl: GET /kitchen/items
        KCtrl->>Svc: getKitchenQueue(statuses)
        Svc->>Repo: Dòng PENDING/COOKING của đơn OPEN, sent_at tăng dần
        Svc-->>Chef: 200 KitchenItemResponse[]
    end

    Chef->>KCtrl: PUT /kitchen/items/{id}/start
    KCtrl->>Svc: startCooking(id, chefId)
    Svc->>Repo: UPDATE ... SET status = COOKING WHERE id = ? AND status = PENDING AND đơn OPEN

    alt 0 dòng bị ảnh hưởng
        Svc->>Repo: Dòng còn tồn tại? Đơn còn OPEN?
        alt Không tồn tại
            Svc->>Handler: BusinessException(NOT_FOUND)
            Handler-->>Chef: 404 NOT_FOUND
        else Đơn đã đóng
            Svc->>Handler: BusinessException(ORDER_NOT_OPEN)
            Handler-->>Chef: 409 ORDER_NOT_OPEN
        else Đã có người nhận
            Svc->>Handler: BusinessException(ORDER_ITEM_STATUS_CONFLICT)
            Handler-->>Chef: 409 ORDER_ITEM_STATUS_CONFLICT
        end
    else 1 dòng bị ảnh hưởng
        Svc-->>Chef: 200 KitchenItemResponse (COOKING)
    end

    Chef->>KCtrl: PUT /kitchen/items/{id}/ready
    KCtrl->>Svc: markReady(id)
    Svc->>Repo: UPDATE ... SET status = READY, ready_at = now WHERE id = ? AND status = COOKING AND đơn OPEN
    Svc-->>Chef: 200 KitchenItemResponse (READY)

    loop Mỗi ~5 giây
        Waiter->>WCtrl: GET /order-items/ready
        WCtrl->>Svc: getReadyItems(waiterId)
        Svc->>Repo: Dòng READY của đơn OPEN có waiter_id = mình, ready_at tăng dần
        Svc-->>Waiter: 200 ReadyItemResponse[]
    end

    Waiter->>WCtrl: PUT /order-items/{id}/served
    WCtrl->>Svc: markServed(id)
    Svc->>Repo: UPDATE ... SET status = SERVED, served_at = now WHERE id = ? AND status = READY AND đơn OPEN
    Svc-->>Waiter: 200 OrderItemResponse (SERVED)
```

Ba hàm `startCooking`, `markReady`, `markServed` dùng chung cách xử lý 0 dòng bị ảnh hưởng: phân biệt `NOT_FOUND`, `ORDER_NOT_OPEN`, `ORDER_ITEM_STATUS_CONFLICT`.
