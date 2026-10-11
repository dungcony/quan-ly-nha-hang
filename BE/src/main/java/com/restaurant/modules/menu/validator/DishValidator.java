package com.restaurant.modules.menu.validator;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.exception.ErrorCode;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.service.DishDeletionGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** Kiểm tra nghiệp vụ của món cần tới CSDL hoặc nhiều trường (rule 2.6, tầng 2). */
@Component
@RequiredArgsConstructor
public class DishValidator {

    private final DishRepository dishRepository;
    private final ObjectProvider<DishDeletionGuard> deletionGuards;

    /**
     * Tên món duy nhất trong cùng danh mục, không phân biệt hoa thường.
     *
     * @param excludeDishId món đang sửa (bỏ qua chính nó); {@code null} khi thêm mới
     * @throws BusinessException {@code DISH_NAME_EXISTS} nếu trùng
     */
    public void validateNameUnique(UUID categoryId, String name, UUID excludeDishId) {
        boolean exists = excludeDishId == null
                ? dishRepository.existsByCategoryIdAndNameIgnoreCase(categoryId, name)
                : dishRepository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(categoryId, name, excludeDishId);
        if (exists) {
            throw new BusinessException(ErrorCode.DISH_NAME_EXISTS);
        }
    }

    public void validatePriceRange(Long minPrice, Long maxPrice) {
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Giá từ không được lớn hơn giá đến.");
        }
    }

    /** Thực đơn công khai không bao giờ có món ngừng bán nên cũng không cho lọc theo trạng thái đó. */
    public void validateVisibleStatus(DishStatus status) {
        if (status == DishStatus.DISCONTINUED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Trạng thái không hợp lệ.");
        }
    }

    /**
     * @throws BusinessException {@code DISH_IN_USE} nếu món đã xuất hiện trong đơn hàng; khi đó chỉ chuyển được sang ngừng bán
     */
    public void validateDeletable(UUID dishId) {
        if (deletionGuards.orderedStream().anyMatch(guard -> guard.isUsed(dishId))) {
            throw new BusinessException(ErrorCode.DISH_IN_USE);
        }
    }
}
