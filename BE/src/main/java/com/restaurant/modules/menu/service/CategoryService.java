package com.restaurant.modules.menu.service;

import com.restaurant.modules.menu.dto.request.CategoryCreateRequest;
import com.restaurant.modules.menu.dto.request.CategoryUpdateRequest;
import com.restaurant.modules.menu.dto.response.CategoryResponse;
import com.restaurant.modules.menu.dto.response.MenuCategoryResponse;

import java.util.List;
import java.util.UUID;

/**
 * Danh mục món: thực đơn công khai (UC012) và quản lý của Quản lý (UC010).
 * Danh mục luôn trả theo thứ tự hiển thị {@code sortOrder}, trùng thì theo tên.
 */
public interface CategoryService {

    /** Mọi danh mục kèm số món đang hiển thị ({@code AVAILABLE}, {@code OUT_OF_STOCK}); 0 nếu chưa có món. */
    List<MenuCategoryResponse> listMenuCategories();

    /** Mọi danh mục kèm số món thuộc danh mục ở mọi trạng thái. */
    List<CategoryResponse> listCategories();

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code CATEGORY_NAME_EXISTS} nếu trùng tên
     */
    CategoryResponse createCategory(CategoryCreateRequest request);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code CATEGORY_NAME_EXISTS}
     */
    CategoryResponse updateCategory(UUID id, CategoryUpdateRequest request);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code CATEGORY_IN_USE} nếu danh mục còn món
     */
    void deleteCategory(UUID id);
}
