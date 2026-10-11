# Thiết kế API & Biểu đồ tuần tự: Xác thực & Tài khoản

Quy ước URL, response, phân trang và mã lỗi: xem [`../README.md`](../README.md).

## 1. Mô tả API Endpoints

| Method | URL | Vai trò | UC | Request | Response (`data`) |
|---|---|---|---|---|---|
| POST | `/auth/register` | Khách | UC002 | `UserRegisterRequest` | 201 `ProfileResponse` |
| POST | `/auth/verify-email` | Khách | UC002 | `EmailVerifyRequest` | 200 `null` |
| POST | `/auth/resend-verification` | Khách | UC002 | `EmailResendRequest` | 200 `null` |
| POST | `/auth/login` | Khách | UC001 | `UserLoginRequest` | 200 `AuthResponse` |
| POST | `/auth/forgot-password` | Khách | UC004 | `PasswordForgotRequest` | 200 `null` |
| POST | `/auth/reset-password` | Khách | UC004 | `PasswordResetRequest` | 200 `null` |
| GET | `/users/me` | Đã đăng nhập | UC005 | — | 200 `ProfileResponse` |
| PUT | `/users/me` | Đã đăng nhập | UC005 | `ProfileUpdateRequest` | 200 `ProfileResponse` |
| PUT | `/users/me/avatar` | Đã đăng nhập | UC005 | multipart, field `file` | 200 `ProfileResponse` |
| PUT | `/users/me/password` | Đã đăng nhập | UC003 | `PasswordChangeRequest` | 200 `null` |

Ghi chú:

- Sáu endpoint `/auth/*` là công khai và đã được mở trong `SecurityConfig`.
- Liên kết trong email: `<frontend-url>/verify-email?token=<token>` và `<frontend-url>/reset-password?token=<token>`.
  `frontend-url` cấu hình ở `app.auth.frontend-url`. Client đọc `token` rồi gọi API tương ứng; token là chuỗi ngẫu nhiên 32 byte
  (Base64URL), server chỉ lưu băm SHA-256.
- `PUT /users/me` không nhận `role`, `status`, `password`; trường thừa bị bỏ qua.
- `access_token` là JWT HS256 (`JwtService`) chứa `sub` = id người dùng, `authorities` = `["ROLE_<role>"]`, `exp`.

Ví dụ `POST /auth/login`:

```json
{ "email": "bich.tran@nhahang.vn", "password": "Matkhau123" }
```

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 3600,
    "user": {
      "id": "4f1c0a52-6a0e-4d63-9a41-2e0f9b8d7c11",
      "email": "bich.tran@nhahang.vn",
      "full_name": "Trần Thị Bích",
      "role": "CASHIER",
      "must_change_password": true
    }
  },
  "msg": ""
}
```

Ví dụ lỗi xác thực trượt (`POST /auth/register` thiếu họ tên):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên không hợp lệ.",
    "fields": [{ "field": "full_name", "message": "Họ tên không được để trống" }],
    "detail": null
  }
}
```

## 2. Biểu đồ Tuần tự (Sequence Diagram) - Đăng nhập (UC001)

```mermaid
sequenceDiagram
    actor Client
    participant Ctrl as AuthController
    participant Svc as AuthServiceImpl
    participant Repo as UserRepository
    participant Enc as PasswordEncoder
    participant Jwt as JwtService
    participant Handler as GlobalExceptionHandler

    Client->>Ctrl: POST /auth/login (UserLoginRequest)
    Ctrl->>Ctrl: @Valid kiểm tra request

    alt Request không hợp lệ
        Ctrl->>Handler: MethodArgumentNotValidException
        Handler-->>Client: 400 VALIDATION_ERROR
    else Request hợp lệ
        Ctrl->>Svc: login(request)
        Svc->>Repo: findByEmail(email)
        Note over Repo: @SQLRestriction bỏ qua tài khoản đã xóa
        Repo-->>Svc: User hoặc rỗng
        Svc->>Enc: matches(password, hash hoặc băm giả)

        alt Không có tài khoản hoặc sai mật khẩu
            Svc->>Handler: BusinessException(AUTH_CREDENTIALS_INVALID)
            Handler-->>Client: 401 AUTH_CREDENTIALS_INVALID
        else status = LOCKED
            Svc->>Handler: BusinessException(AUTH_ACCOUNT_BLOCKED)
            Handler-->>Client: 403 AUTH_ACCOUNT_BLOCKED
        else Chưa xác thực email
            Svc->>Handler: BusinessException(AUTH_ACCOUNT_NOT_VERIFIED)
            Handler-->>Client: 403 AUTH_ACCOUNT_NOT_VERIFIED
        else Hợp lệ
            Svc->>Jwt: generateAccessToken(userId, ["ROLE_" + role])
            Jwt-->>Svc: access_token
            Svc-->>Ctrl: AuthResponse
            Ctrl-->>Client: 200 ApiResponse(AuthResponse)
        end
    end
```

## 3. Biểu đồ Tuần tự (Sequence Diagram) - Đăng ký và xác thực email (UC002)

```mermaid
sequenceDiagram
    actor Khach as Khách
    participant Ctrl as AuthController
    participant Svc as AuthServiceImpl
    participant Val as UserValidator
    participant Repo as UserRepository
    participant TokRepo as UserTokenRepository
    participant Mail as EmailService
    participant Handler as GlobalExceptionHandler

    Khach->>Ctrl: POST /auth/register (UserRegisterRequest)
    Ctrl->>Ctrl: @Valid kiểm tra trường bắt buộc, định dạng, độ mạnh mật khẩu
    Ctrl->>Svc: register(request)
    Svc->>Val: validateEmailNotTaken(email, null)

    alt Email đã có tài khoản
        Val->>Handler: BusinessException(AUTH_EMAIL_ALREADY_EXISTS)
        Handler-->>Khach: 409 AUTH_EMAIL_ALREADY_EXISTS
    else Mật khẩu xác nhận lệch
        Svc->>Handler: BusinessException(AUTH_PASSWORD_CONFIRM_MISMATCH)
        Handler-->>Khach: 400 AUTH_PASSWORD_CONFIRM_MISMATCH
    else Hợp lệ
        Svc->>Repo: save(User CUSTOMER, email_verified = false)
        Svc->>TokRepo: save(UserToken EMAIL_VERIFICATION, băm token, hạn 24 giờ)
        Svc-)Mail: sendVerificationLink(email, liên kết) sau khi commit
        Svc-->>Ctrl: ProfileResponse
        Ctrl-->>Khach: 201 ApiResponse(ProfileResponse)
    end

    Khach->>Ctrl: POST /auth/verify-email (token)
    Ctrl->>Svc: verifyEmail(token)
    Svc->>TokRepo: findByTokenHash(băm token)

    alt Không thấy, hết hạn hoặc đã dùng
        Svc->>Handler: BusinessException(AUTH_CODE_INVALID)
        Handler-->>Khach: 400 AUTH_CODE_INVALID
    else Còn hiệu lực
        Svc->>Repo: Đặt email_verified = true
        Svc->>TokRepo: Đánh dấu used_at = now
        Ctrl-->>Khach: 200 ApiResponse(null)
    end
```

## 4. Biểu đồ Tuần tự (Sequence Diagram) - Quên và đặt lại mật khẩu (UC004)

```mermaid
sequenceDiagram
    actor Client
    participant Ctrl as AuthController
    participant Svc as AuthServiceImpl
    participant Repo as UserRepository
    participant TokRepo as UserTokenRepository
    participant Mail as EmailService
    participant Handler as GlobalExceptionHandler

    Client->>Ctrl: POST /auth/forgot-password (email)
    Ctrl->>Svc: forgotPassword(email)
    Svc->>Repo: findByEmail(email)

    alt Không có tài khoản
        Svc->>Handler: BusinessException(NOT_FOUND)
        Handler-->>Client: 404 NOT_FOUND
    else Có tài khoản
        Svc->>TokRepo: Đánh dấu used_at cho token PASSWORD_RESET còn hiệu lực
        Svc->>TokRepo: save(token mới, hạn 60 phút)
        Svc-)Mail: sendPasswordResetLink(email, liên kết) sau khi commit
        Ctrl-->>Client: 200 ApiResponse(null)
    end

    Client->>Ctrl: POST /auth/reset-password (token, new_password, confirm_new_password)
    Ctrl->>Svc: resetPassword(request)
    Svc->>TokRepo: findByTokenHash(băm token)

    alt Token sai, hết hạn hoặc đã dùng
        Svc->>Handler: BusinessException(AUTH_CODE_INVALID)
        Handler-->>Client: 400 AUTH_CODE_INVALID
    else Còn hiệu lực
        Svc->>Repo: Cập nhật password_hash, must_change_password = false, email_verified = true
        Svc->>TokRepo: Đánh dấu used_at = now
        Ctrl-->>Client: 200 ApiResponse(null)
    end
```
