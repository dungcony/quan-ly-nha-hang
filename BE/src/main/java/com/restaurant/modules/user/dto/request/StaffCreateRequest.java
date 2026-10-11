package com.restaurant.modules.user.dto.request;

import com.restaurant.modules.user.enums.Gender;
import com.restaurant.modules.user.enums.Role;
import com.restaurant.modules.user.enums.UserStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Quản lý tạo tài khoản nhân viên (UC008, Bảng 2-19).
 *
 * @param role     một trong bốn vai trò nhân viên; {@code CUSTOMER} bị từ chối ở {@code UserValidator}
 * @param password mật khẩu ban đầu, nhân viên được yêu cầu đổi ở lần đăng nhập đầu
 * @param status   {@code ACTIVE} (Unlocked) hoặc {@code LOCKED}
 */
public record StaffCreateRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @NotNull(message = "Vai trò không được để trống")
        Role role,

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = PasswordRules.MIN_LENGTH, max = PasswordRules.MAX_LENGTH, message = PasswordRules.LENGTH_MESSAGE)
        @Pattern(regexp = PasswordRules.PATTERN, message = PasswordRules.PATTERN_MESSAGE)
        String password,

        @NotNull(message = "Trạng thái không được để trống")
        UserStatus status,

        @PastOrPresent(message = "Ngày sinh không được ở tương lai")
        LocalDate dateOfBirth,

        @Pattern(regexp = "\\d{10}", message = "Số điện thoại phải gồm 10 chữ số")
        String phone,

        Gender gender) {
}
