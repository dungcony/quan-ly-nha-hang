package com.restaurant.modules.menu.dto.request;

import com.restaurant.modules.menu.enums.DishStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Thêm món (UC010, Bảng 2-22). Ảnh không nằm ở đây mà tải riêng qua {@code PUT /dishes/{id}/image}.
 *
 * @param price           giá bán, VND, số nguyên dương
 * @param prepTimeMinutes thời gian chế biến dự kiến, phút; tùy chọn
 */
public record DishCreateRequest(
        @NotBlank(message = "Tên món không được để trống")
        @Size(max = 255, message = "Tên món tối đa 255 ký tự")
        String name,

        @NotNull(message = "Danh mục không được để trống")
        UUID categoryId,

        @NotNull(message = "Giá bán không được để trống")
        @Positive(message = "Giá bán phải lớn hơn 0")
        Long price,

        @NotBlank(message = "Đơn vị tính không được để trống")
        @Size(max = 20, message = "Đơn vị tính tối đa 20 ký tự")
        String unit,

        @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
        String description,

        @Positive(message = "Thời gian chế biến phải lớn hơn 0")
        Integer prepTimeMinutes,

        @NotNull(message = "Trạng thái không được để trống")
        DishStatus status) {
}
