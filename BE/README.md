# Restaurant (backend)

Hệ thống quản lý nhà hàng — backend Spring Boot 3.4, Java 17, PostgreSQL, Redis.

Thiết kế dựng từ `docs/srs-restaurant.md` nằm ở [`../docs/design/`](../docs/design/README.md): use case, API, entity cho 7 module
(`auth-profile`, `user-management`, `menu-management`, `table-management`, `reservation`, `ordering`, `billing`).

## Tiến độ

| Module | Trạng thái |
|---|---|
| `auth-profile` (đăng ký, xác thực email, đăng nhập, quên và đặt lại mật khẩu, hồ sơ, đổi mật khẩu) | Đã có API |
| `user-management` (quản lý nhân viên, khách hàng) | Đã có API |
| `menu-management` (thực đơn công khai, quản lý món) | Đã có API |
| `table-management` (quản lý bàn) | Đã có API |
| `ordering` (mở đơn, gọi món, hàng đợi bếp, xác nhận phục vụ) | Đã có API |
| `reservation` (kiểm tra còn bàn, đặt bàn, xác nhận, nhận bàn, tự giữ bàn và đánh dấu không đến mỗi 60 giây) | Đã có API |
| `billing` (thanh toán, hóa đơn, báo cáo doanh thu) | Đã có API |

## Chạy ứng dụng

Cần PostgreSQL (database trống) và Redis. Schema do Flyway tạo lúc khởi động (`src/main/resources/db/migration`).

| Biến môi trường | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `JWT_SECRET` | có | — | Khóa HS256 dạng base64, tối thiểu 32 byte sau khi giải mã, vd `openssl rand -base64 48` |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | có | — | Kết nối PostgreSQL, vd `jdbc:postgresql://localhost:5432/quanlycuahang` (phải có tiền tố `jdbc:`) |
| `REDIS_HOST`, `REDIS_PORT` | có | — | Redis dùng cho danh sách chặn token của tài khoản bị khóa hoặc xóa |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | không | `localhost`, `1025` | SMTP gửi email xác thực và đặt lại mật khẩu |
| `APP_FRONTEND_URL` | không | `http://localhost:3000` | Gốc URL frontend trong liên kết email |
| `APP_ADMIN_EMAIL`, `APP_ADMIN_PASSWORD` | không | — | Nếu có cả hai và chưa có Quản lý nào, tạo tài khoản Quản lý đầu tiên lúc khởi động |
| `APP_STORAGE_DIR` | không | `./uploads` | Thư mục lưu ảnh tải lên, phục vụ công khai ở `/files/**` |
| `SPRING_PROFILES_ACTIVE=test` | không | — | Không gửi email thật: liên kết xác thực / đặt lại mật khẩu được ghi ra log (chỉ dùng khi phát triển) |

> Lưu ý: `application.yaml` hiện vẫn còn giá trị mặc định kết nối DB/Redis cũ; luôn đặt các biến trên khi chạy.

```bash
export JWT_SECRET=$(openssl rand -base64 48)
export DB_URL=jdbc:postgresql://localhost:5432/quanlycuahang DB_USERNAME=postgres DB_PASSWORD='<mật-khẩu>'
export REDIS_HOST=localhost REDIS_PORT=6379
export APP_ADMIN_EMAIL=quanly@nhahang.vn APP_ADMIN_PASSWORD='đổi-mật-khẩu-này'
mvn spring-boot:run
```

Chạy nhanh trên Windows: chép `BE/.env.example` thành `BE/.env.local` (không commit), điền giá trị, rồi chạy `.\run-be.ps1`
ở thư mục gốc repo. Script nạp các biến trên, tự sinh `JWT_SECRET` nếu để trống và chạy BE ở `:8080`. FE chạy riêng bằng
`.\run-fe.ps1` (`:3000`). Mỗi script chạy trong terminal hiện tại, Ctrl+C để dừng.

## Kiểm thử

```bash
# Test đơn vị và kiểm tra kiến trúc (ArchUnit), không cần database
mvn test
```

Hiện chưa có integration test (cần Docker cho Testcontainers). Kiểm tra API bằng tay xem các kịch bản trong
`../docs/design/auth-profile/use-case.md`.
