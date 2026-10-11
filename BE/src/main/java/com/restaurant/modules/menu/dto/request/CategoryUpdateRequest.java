package com.restaurant.modules.menu.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Sửa danh mục món (UC010).
 *
 * @param sortOrder thứ tự hiển thị, nhỏ hơn thì hiển thị trước
 */
public record CategoryUpdateRequest(
        @NotBlank(message = "Tên danh mục không được để trống")
        @Size(max = 100, message = "Tên danh mục tối đa 100 ký tự")
        String name,

        @NotNull(message = "Thứ tự hiển thị không được để trống")
        @PositiveOrZero(message = "Thứ tự hiển thị không được âm")
        Integer sortOrder) {
}
