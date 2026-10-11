package com.restaurant.modules.menu.service.impl;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.exception.ErrorCode;
import com.restaurant.modules.menu.dto.request.CategoryCreateRequest;
import com.restaurant.modules.menu.dto.request.CategoryUpdateRequest;
import com.restaurant.modules.menu.dto.response.CategoryResponse;
import com.restaurant.modules.menu.dto.response.MenuCategoryResponse;
import com.restaurant.modules.menu.entity.Category;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.mapper.CategoryMapper;
import com.restaurant.modules.menu.repository.CategoryCountProjection;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.service.CategoryService;
import com.restaurant.modules.menu.validator.CategoryValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    // Món hiển thị trong thực đơn; món ngừng bán chỉ Quản lý thấy
    private static final Set<DishStatus> VISIBLE_STATUSES = Set.of(DishStatus.AVAILABLE, DishStatus.OUT_OF_STOCK);

    private final CategoryRepository categoryRepository;
    private final DishRepository dishRepository;
    private final CategoryValidator categoryValidator;
    private final CategoryMapper categoryMapper;

    @Override
    @Transactional(readOnly = true)
    public List<MenuCategoryResponse> listMenuCategories() {
        Map<UUID, Long> counts = toCountMap(dishRepository.countVisibleByCategory(VISIBLE_STATUSES));
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(category -> categoryMapper.toMenuResponse(category, counts.getOrDefault(category.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> listCategories() {
        Map<UUID, Long> counts = toCountMap(dishRepository.countAllByCategory());
        return categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(category -> categoryMapper.toResponse(category, counts.getOrDefault(category.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional
    public CategoryResponse createCategory(CategoryCreateRequest request) {
        categoryValidator.validateNameUnique(request.name(), null);
        Category category = categoryMapper.fromCreateRequest(request);
        category.setId(UUID.randomUUID());
        return categoryMapper.toResponse(saveAndFlushUnique(category), 0L);
    }

    @Override
    @Transactional
    public CategoryResponse updateCategory(UUID id, CategoryUpdateRequest request) {
        Category category = loadCategory(id);
        categoryValidator.validateNameUnique(request.name(), id);
        categoryMapper.updateFromRequest(request, category);
        Category saved = saveAndFlushUnique(category);
        return categoryMapper.toResponse(saved, dishRepository.countByCategoryId(id));
    }

    @Override
    @Transactional
    public void deleteCategory(UUID id) {
        Category category = loadCategory(id);
        categoryValidator.validateDeletable(id);
        categoryRepository.delete(category);
    }

    private Map<UUID, Long> toCountMap(List<CategoryCountProjection> rows) {
        return rows.stream().collect(Collectors.toMap(CategoryCountProjection::getCategoryId, CategoryCountProjection::getCount));
    }

    private Category loadCategory(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục."));
    }

    // Unique index uq_categories_name bắt trường hợp hai request cùng tên chạy song song
    private Category saveAndFlushUnique(Category category) {
        try {
            return categoryRepository.saveAndFlush(category);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
    }
}
