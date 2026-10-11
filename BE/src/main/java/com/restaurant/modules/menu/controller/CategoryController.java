package com.restaurant.modules.menu.controller;

import com.restaurant.common.response.ApiResponse;
import com.restaurant.modules.menu.dto.request.CategoryCreateRequest;
import com.restaurant.modules.menu.dto.request.CategoryUpdateRequest;
import com.restaurant.modules.menu.dto.response.CategoryResponse;
import com.restaurant.modules.menu.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Quản lý danh mục món (UC010); chỉ Quản lý. */
@RestController
@RequestMapping("/categories")
@PreAuthorize("hasRole('MANAGER')")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ApiResponse<List<CategoryResponse>> listCategories() {
        return ApiResponse.of(categoryService.listCategories());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryResponse> createCategory(@Valid @RequestBody CategoryCreateRequest request) {
        return ApiResponse.of(categoryService.createCategory(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<CategoryResponse> updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryUpdateRequest request) {
        return ApiResponse.of(categoryService.updateCategory(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable UUID id) {
        categoryService.deleteCategory(id);
        return ApiResponse.of(null);
    }
}
