package com.restaurant.modules.user.dto.request;

import com.restaurant.modules.user.enums.Gender;
import com.restaurant.modules.user.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Quản lý sửa tài khoản nhân viên (UC008). Không có mật khẩu (nhân viên tự đổi ở UC003/UC004) và không có trạng thái
 * (khóa/mở khóa là thao tác riêng, kèm chặn token đang dùng).
 */
public record StaffUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @NotNull(message = "Vai trò không được để trống")
        Role role,

        @PastOrPresent(message = "Ngày sinh không được ở tương lai")
        LocalDate dateOfBirth,

        @Pattern(regexp = "\\d{10}", message = "Số điện thoại phải gồm 10 chữ số")
        String phone,

        Gender gender) {
}
