package com.restaurant.modules.menu.dto.response;

import com.restaurant.modules.menu.enums.DishStatus;

import java.util.UUID;

/** Một món trong danh sách thực đơn hoặc danh sách quản lý. */
public record DishSummaryResponse(
        UUID id,
        String name,
        UUID categoryId,
        String categoryName,
        long price,
        String unit,
        String description,
        String imageUrl,
        DishStatus status) {
}
