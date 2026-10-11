package com.restaurant.modules.user.dto.request;

import com.restaurant.modules.user.enums.Gender;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Cập nhật thông tin cá nhân (UC005). Không nhận vai trò, trạng thái hay mật khẩu.
 *
 * @param fullName    họ tên, tối đa 255 ký tự
 * @param email       email đăng nhập; không được trùng tài khoản khác
 * @param dateOfBirth ngày sinh, không ở tương lai; tùy chọn
 * @param phone       số điện thoại 10 chữ số; tùy chọn
 * @param gender      giới tính; tùy chọn
 */
public record ProfileUpdateRequest(
        @NotBlank(message = "Họ tên không được để trống")
        @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
        String fullName,

        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Size(max = 255, message = "Email tối đa 255 ký tự")
        String email,

        @PastOrPresent(message = "Ngày sinh không được ở tương lai")
        LocalDate dateOfBirth,

        @Pattern(regexp = "\\d{10}", message = "Số điện thoại phải gồm 10 chữ số")
        String phone,

        Gender gender) {
}
