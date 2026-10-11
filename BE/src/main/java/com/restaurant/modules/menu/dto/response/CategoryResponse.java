package com.restaurant.modules.menu.dto.response;

import java.util.UUID;

/**
 * Danh mục trong màn quản lý.
 *
 * @param dishCount số món thuộc danh mục, mọi trạng thái kể cả ngừng bán
 */
public record CategoryResponse(UUID id, String name, int sortOrder, long dishCount) {
}
