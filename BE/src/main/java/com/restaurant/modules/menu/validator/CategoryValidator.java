package com.restaurant.modules.menu.validator;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.exception.ErrorCode;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Kiểm tra nghiệp vụ của danh mục món cần tới CSDL (rule 2.6, tầng 2). */
@Component
@RequiredArgsConstructor
public class CategoryValidator {

    private final CategoryRepository categoryRepository;
    private final DishRepository dishRepository;

    /**
     * Tên danh mục duy nhất, không phân biệt hoa thường.
     *
     * @param excludeCategoryId danh mục đang sửa (bỏ qua chính nó); {@code null} khi thêm mới
     * @throws BusinessException {@code CATEGORY_NAME_EXISTS} nếu trùng
     */
    public void validateNameUnique(String name, UUID excludeCategoryId) {
        boolean exists = excludeCategoryId == null
                ? categoryRepository.existsByNameIgnoreCase(name)
                : categoryRepository.existsByNameIgnoreCaseAndIdNot(name, excludeCategoryId);
        if (exists) {
            throw new BusinessException(ErrorCode.CATEGORY_NAME_EXISTS);
        }
    }

    /**
     * @throws BusinessException {@code CATEGORY_IN_USE} nếu danh mục còn món, kể cả món ngừng bán
     */
    public void validateDeletable(UUID categoryId) {
        if (dishRepository.existsByCategoryId(categoryId)) {
            throw new BusinessException(ErrorCode.CATEGORY_IN_USE);
        }
    }
}
