package com.restaurant.modules.menu.controller;

import com.restaurant.common.response.ApiResponse;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.response.PageResponse;
import com.restaurant.modules.menu.dto.request.DishSearchRequest;
import com.restaurant.modules.menu.dto.response.DishDetailResponse;
import com.restaurant.modules.menu.dto.response.DishSummaryResponse;
import com.restaurant.modules.menu.dto.response.MenuCategoryResponse;
import com.restaurant.modules.menu.service.CategoryService;
import com.restaurant.modules.menu.service.DishService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Thực đơn công khai cho Khách và mọi người dùng (UC007, UC012); chỉ thấy món đang bán hoặc hết món. */
@RestController
@RequestMapping("/menu")
@RequiredArgsConstructor
public class MenuController {

    private final DishService dishService;
    private final CategoryService categoryService;

    @GetMapping("/categories")
    public ApiResponse<List<MenuCategoryResponse>> listCategories() {
        return ApiResponse.of(categoryService.listMenuCategories());
    }

    @GetMapping("/dishes")
    public ApiResponse<PageResponse<DishSummaryResponse>> searchDishes(@Valid DishSearchRequest request, PageRequestParams params) {
        return ApiResponse.of(PageResponse.of(dishService.searchVisibleDishes(request, params)));
    }

    @GetMapping("/dishes/{id}")
    public ApiResponse<DishDetailResponse> getDish(@PathVariable UUID id) {
        return ApiResponse.of(dishService.getVisibleDish(id));
    }
}
