package com.restaurant.modules.menu.dto.request;

import com.restaurant.modules.menu.enums.DishStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Sửa món (UC010). Đổi {@code status} ở đây là cách chuyển món sang hết món khi Bếp báo hết nguyên liệu và ngược lại.
 * Giá mới chỉ áp cho dòng món gọi sau đó.
 */
public record DishUpdateRequest(
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
