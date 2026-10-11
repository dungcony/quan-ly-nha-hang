# Kịch bản Use Case & Test Cases: Xác thực & Tài khoản

Tác nhân: Khách (UC002, UC001 trước khi có token), mọi người dùng có tài khoản (UC001, UC003, UC004, UC005). Quy ước chung,
vai trò và mã lỗi: xem [`../README.md`](../README.md).

## 1. Kịch bản Use Case

### 1.1 Đăng nhập (UC001)

- **Kịch bản chính (200)** — `POST /auth/login`: người dùng gửi `email`, `password`. Hệ thống tìm tài khoản chưa xóa theo email,
  so mật khẩu với `password_hash` (BCrypt), kiểm tra tài khoản không bị khóa và đã xác thực email, rồi trả `access_token` kèm
  `role` và `must_change_password`. Client dùng `role` để hiện menu đúng vai trò (luồng 7).
- **Kịch bản ngoại lệ**:
  - Thiếu `email`/`password` hoặc `email` sai định dạng → 400 `VALIDATION_ERROR` (luồng 5a).
  - Không có email hoặc sai mật khẩu → 401 `AUTH_CREDENTIALS_INVALID`, cùng một câu cho cả hai trường hợp (luồng 6a). Khi không
    thấy email, hệ thống vẫn so mật khẩu với một băm giả để thời gian phản hồi không lộ email có tồn tại hay không.
  - Đúng mật khẩu nhưng `status = LOCKED` → 403 `AUTH_ACCOUNT_BLOCKED` (luồng 6b).
  - Đúng mật khẩu nhưng khách hàng chưa xác thực email → 403 `AUTH_ACCOUNT_NOT_VERIFIED` (luồng 6b). Kiểm tra sau khi đã đúng
    mật khẩu để người lạ không dò được trạng thái tài khoản.
- Không có endpoint đăng xuất và không có refresh token (A2): client xóa token; token hết hạn sau 1 giờ (`jwt.access-token-expiry-seconds`).

### 1.2 Đăng ký (UC002)

- **Kịch bản chính (201)** — `POST /auth/register`: Khách nhập `full_name`, `email`, `phone` (tùy chọn), `password`,
  `confirm_password`. Hệ thống tạo tài khoản `CUSTOMER`, `status = ACTIVE`, `email_verified = false`, sinh token xác thực (24 giờ,
  chỉ lưu băm SHA-256) và gửi email chứa liên kết `<frontend-url>/verify-email?token=<token>` (luồng 9). Trả hồ sơ vừa tạo.
- **Xác thực email** — `POST /auth/verify-email` với `token` lấy từ liên kết (luồng 10–11): đặt `email_verified = true`, đánh dấu token
  đã dùng. Sau bước này khách hàng mới đăng nhập được.
- **Gửi lại liên kết** — `POST /auth/resend-verification` với `email`: vô hiệu token cũ chưa dùng, sinh token mới, gửi lại (luồng 11a).
- **Kịch bản ngoại lệ**:
  - Thiếu trường bắt buộc, email sai định dạng, mật khẩu dưới 8 ký tự hoặc thiếu chữ/số → 400 `VALIDATION_ERROR` kèm `fields`
    (luồng 5a, 8a).
  - Email đã có tài khoản chưa xóa → 409 `AUTH_EMAIL_ALREADY_EXISTS` (luồng 6a).
  - `confirm_password` khác `password` → 400 `AUTH_PASSWORD_CONFIRM_MISMATCH` (luồng 7a).
  - Token xác thực sai, hết hạn hoặc đã dùng → 400 `AUTH_CODE_INVALID`; client gợi ý gửi lại liên kết (luồng 11a).
  - Gửi lại cho email không có tài khoản → 404 `NOT_FOUND`; tài khoản đã xác thực → 400 `AUTH_ACCOUNT_ALREADY_VERIFIED`.
- Tài khoản nhân viên không tự đăng ký: do Quản lý tạo (`user-management`), luôn `email_verified = true`.

### 1.3 Thay đổi mật khẩu (UC003)

- **Kịch bản chính (200)** — `PUT /users/me/password`: người dùng đã đăng nhập gửi `old_password`, `new_password`,
  `confirm_new_password`. Hệ thống kiểm tra mật khẩu cũ, mức an toàn và việc xác nhận khớp, rồi lưu băm mới và hạ
  `must_change_password` về `false`. Áp dụng cho cả 5 vai trò.
- **Kịch bản ngoại lệ** (luồng 5a):
  - Mật khẩu mới thiếu an toàn hoặc thiếu trường → 400 `VALIDATION_ERROR`.
  - `old_password` sai → 400 `AUTH_OLD_PASSWORD_INCORRECT`.
  - `new_password` trùng `old_password` → 400 `AUTH_PASSWORD_SAME_AS_OLD`.
  - `confirm_new_password` khác `new_password` → 400 `AUTH_PASSWORD_CONFIRM_MISMATCH`.
  - Chưa đăng nhập → 401 `UNAUTHENTICATED`.

### 1.4 Thiết lập lại mật khẩu (UC004)

- **Kịch bản chính (200)**:
  - `POST /auth/forgot-password` với `email` (luồng 3–5): nếu có tài khoản chưa xóa, vô hiệu các token đặt lại còn hiệu lực, sinh
    token mới sống 60 phút (`app.auth.reset-token-ttl`), gửi liên kết `<frontend-url>/reset-password?token=<token>`.
  - `POST /auth/reset-password` với `token`, `new_password`, `confirm_new_password` (luồng 6–7): kiểm tra token còn hiệu lực và
    chưa dùng, đặt mật khẩu mới, đánh dấu token đã dùng, hạ `must_change_password`, đặt `email_verified = true` (mở được liên
    kết gửi tới email chứng tỏ người đó sở hữu email).
- **Kịch bản ngoại lệ**:
  - Email sai định dạng → 400 `VALIDATION_ERROR`; không có tài khoản ứng với email → 404 `NOT_FOUND` (luồng 5a, SRS yêu cầu báo lỗi
    dù việc này cho phép dò email; được chấp nhận).
  - Token sai, quá 60 phút hoặc đã dùng → 400 `AUTH_CODE_INVALID` (luồng 7a).
  - Mật khẩu mới thiếu an toàn → 400 `VALIDATION_ERROR`; xác nhận không khớp → 400 `AUTH_PASSWORD_CONFIRM_MISMATCH`.
- Tài khoản `LOCKED` vẫn đặt lại được mật khẩu nhưng vẫn không đăng nhập được.

### 1.5 Cập nhật thông tin cá nhân (UC005)

- **Kịch bản chính (200)**:
  - `GET /users/me`: xem hồ sơ của chính mình (luồng 2).
  - `PUT /users/me`: gửi `full_name`, `email`, `date_of_birth`, `phone`, `gender` (Bảng 2-10); hệ thống kiểm tra và lưu (luồng 3–6).
  - `PUT /users/me/avatar`: tải ảnh png/gif/jpg/jpeg lên, lưu qua `FileStorageService`, cập nhật `avatar_url`.
- **Kịch bản ngoại lệ**:
  - Sai định dạng (họ tên quá 255 ký tự, ngày sinh ở tương lai, điện thoại không đủ 10 chữ số, giới tính ngoài danh sách) → 400
    `VALIDATION_ERROR` (luồng 5a).
  - Email đã thuộc tài khoản khác → 409 `AUTH_EMAIL_ALREADY_EXISTS` (luồng 5a).
  - Ảnh sai định dạng → 400 `FILE_TYPE_NOT_SUPPORTED`.
  - Lỗi lưu → 500 `INTERNAL_ERROR` (luồng 6a).
- Đổi email áp dụng ngay, không xác thực lại email mới (SRS không yêu cầu); `email_verified` giữ nguyên.
- Người dùng không đổi được `role`, `status` của mình qua endpoint này.

## 2. Kịch bản Kiểm thử (Test Cases)

| Mã TC | Loại | UC | Kịch bản | Input | Kết quả kỳ vọng |
|---|---|---|---|---|---|
| TC_AUTH_01 | Luồng chuẩn | UC001 | Đăng nhập thành công | Email, mật khẩu đúng của `WAITER` | 200, `access_token`, `role` = `WAITER` |
| TC_AUTH_02 | Ngoại lệ | UC001 | Thiếu mật khẩu | Không có `password` | 400 `VALIDATION_ERROR`, `fields` chứa `password` |
| TC_AUTH_03 | Ngoại lệ | UC001 | Sai mật khẩu | Mật khẩu sai | 401 `AUTH_CREDENTIALS_INVALID` |
| TC_AUTH_04 | Ngoại lệ | UC001 | Email không tồn tại | Email lạ | 401 `AUTH_CREDENTIALS_INVALID` (cùng nội dung TC_AUTH_03) |
| TC_AUTH_05 | Ngoại lệ | UC001 | Tài khoản bị khóa | Tài khoản `LOCKED`, mật khẩu đúng | 403 `AUTH_ACCOUNT_BLOCKED` |
| TC_AUTH_06 | Ngoại lệ | UC001 | Khách hàng chưa xác thực email | `email_verified = false`, mật khẩu đúng | 403 `AUTH_ACCOUNT_NOT_VERIFIED` |
| TC_AUTH_07 | Luồng chuẩn | UC001 | Nhân viên mới tạo có cờ đổi mật khẩu | Tài khoản `must_change_password = true` | 200, `must_change_password` = `true` |
| TC_AUTH_08 | Luồng chuẩn | UC002 | Đăng ký thành công | Đủ trường hợp lệ | 201, `role` = `CUSTOMER`, `email_verified` = `false`; có 1 bản ghi `user_tokens` loại `EMAIL_VERIFICATION`, gửi 1 email |
| TC_AUTH_09 | Ngoại lệ | UC002 | Đăng ký thiếu họ tên | Không có `full_name` | 400 `VALIDATION_ERROR` |
| TC_AUTH_10 | Ngoại lệ | UC002 | Email đã dùng | Email của tài khoản chưa xóa | 409 `AUTH_EMAIL_ALREADY_EXISTS` |
| TC_AUTH_11 | Luồng chuẩn | UC002 | Email của tài khoản đã xóa được dùng lại | Email của tài khoản `deleted_at` khác null | 201 |
| TC_AUTH_12 | Ngoại lệ | UC002 | Xác nhận mật khẩu lệch | `confirm_password` khác `password` | 400 `AUTH_PASSWORD_CONFIRM_MISMATCH` |
| TC_AUTH_13 | Ngoại lệ | UC002 | Mật khẩu yếu | `12345678` hoặc `abcdefgh` hoặc `Abc123` | 400 `VALIDATION_ERROR`, `fields` chứa `password` |
| TC_AUTH_14 | Ngoại lệ | UC002 | Số điện thoại sai | `098912345` (9 số) | 400 `VALIDATION_ERROR` |
| TC_AUTH_15 | Luồng chuẩn | UC002 | Xác thực email | Token còn hạn | 200; đăng nhập sau đó thành công |
| TC_AUTH_16 | Ngoại lệ | UC002 | Token xác thực quá 24 giờ | Token hết hạn | 400 `AUTH_CODE_INVALID` |
| TC_AUTH_17 | Ngoại lệ | UC002 | Dùng lại token xác thực | Token đã dùng | 400 `AUTH_CODE_INVALID` |
| TC_AUTH_18 | Luồng chuẩn | UC002 | Gửi lại liên kết xác thực | Email chưa xác thực | 200; token cũ không dùng được nữa, token mới dùng được |
| TC_AUTH_19 | Ngoại lệ | UC002 | Gửi lại cho tài khoản đã xác thực | Email đã xác thực | 400 `AUTH_ACCOUNT_ALREADY_VERIFIED` |
| TC_AUTH_20 | Luồng chuẩn | UC003 | Đổi mật khẩu | Mật khẩu cũ đúng, mới hợp lệ | 200; đăng nhập bằng mật khẩu mới được, mật khẩu cũ không |
| TC_AUTH_21 | Luồng chuẩn | UC003 | Đổi mật khẩu hạ cờ lần đầu | `must_change_password = true` trước khi đổi | 200; `GET /users/me` trả `must_change_password` = `false` |
| TC_AUTH_22 | Ngoại lệ | UC003 | Mật khẩu cũ sai | `old_password` sai | 400 `AUTH_OLD_PASSWORD_INCORRECT` |
| TC_AUTH_23 | Ngoại lệ | UC003 | Mật khẩu mới trùng cũ | `new_password` = `old_password` | 400 `AUTH_PASSWORD_SAME_AS_OLD` |
| TC_AUTH_24 | Ngoại lệ | UC003 | Xác nhận mật khẩu mới lệch | `confirm_new_password` khác | 400 `AUTH_PASSWORD_CONFIRM_MISMATCH` |
| TC_AUTH_25 | Ngoại lệ | UC003 | Chưa đăng nhập | Không có token | 401 `UNAUTHENTICATED` |
| TC_AUTH_26 | Luồng chuẩn | UC004 | Yêu cầu đặt lại mật khẩu | Email có tài khoản | 200; gửi 1 email; token sống 60 phút |
| TC_AUTH_27 | Ngoại lệ | UC004 | Email không có tài khoản | Email lạ | 404 `NOT_FOUND` |
| TC_AUTH_28 | Ngoại lệ | UC004 | Email sai định dạng | `abc` | 400 `VALIDATION_ERROR` |
| TC_AUTH_29 | Luồng chuẩn | UC004 | Đặt mật khẩu mới bằng liên kết | Token còn hạn, mật khẩu hợp lệ | 200; đăng nhập bằng mật khẩu mới được |
| TC_AUTH_30 | Ngoại lệ | UC004 | Liên kết quá 60 phút | Token hết hạn | 400 `AUTH_CODE_INVALID` |
| TC_AUTH_31 | Ngoại lệ | UC004 | Dùng lại liên kết | Token đã dùng | 400 `AUTH_CODE_INVALID` |
| TC_AUTH_32 | Luồng chuẩn | UC004 | Yêu cầu lần hai vô hiệu liên kết lần một | Hai lần `forgot-password`, dùng token lần một | 400 `AUTH_CODE_INVALID`; token lần hai dùng được |
| TC_AUTH_33 | Luồng chuẩn | UC005 | Xem hồ sơ | Token hợp lệ | 200, đúng dữ liệu của chính mình |
| TC_AUTH_34 | Luồng chuẩn | UC005 | Cập nhật hồ sơ | Dữ liệu hợp lệ | 200, các trường đã đổi; `role`, `status` không đổi dù gửi kèm |
| TC_AUTH_35 | Ngoại lệ | UC005 | Email đã thuộc tài khoản khác | Email người khác | 409 `AUTH_EMAIL_ALREADY_EXISTS` |
| TC_AUTH_36 | Ngoại lệ | UC005 | Ngày sinh ở tương lai | Ngày mai | 400 `VALIDATION_ERROR` |
| TC_AUTH_37 | Ngoại lệ | UC005 | Giới tính sai | `X` | 400 `VALIDATION_ERROR` |
| TC_AUTH_38 | Luồng chuẩn | UC005 | Tải ảnh đại diện | File `.png` | 200, `avatar_url` có giá trị |
| TC_AUTH_39 | Ngoại lệ | UC005 | Ảnh đại diện sai định dạng | File `.bmp` | 400 `FILE_TYPE_NOT_SUPPORTED` |
| TC_AUTH_40 | Ngoại lệ | Chung | Token của tài khoản vừa bị khóa | Quản lý khóa, token cũ gọi `GET /users/me` | 403 `AUTH_ACCOUNT_BLOCKED` |
