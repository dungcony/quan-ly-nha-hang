package com.restaurant.modules.menu.dto.response;

import java.util.UUID;

/**
 * Danh mục trong thực đơn công khai.
 *
 * @param dishCount số món đang hiển thị trong thực đơn ({@code AVAILABLE} và {@code OUT_OF_STOCK})
 */
public record MenuCategoryResponse(UUID id, String name, int sortOrder, long dishCount) {
}
