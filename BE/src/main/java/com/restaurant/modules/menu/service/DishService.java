package com.restaurant.modules.menu.service;

import com.restaurant.common.response.PageRequestParams;
import com.restaurant.modules.menu.dto.request.DishCreateRequest;
import com.restaurant.modules.menu.dto.request.DishSearchRequest;
import com.restaurant.modules.menu.dto.request.DishUpdateRequest;
import com.restaurant.modules.menu.dto.response.DishDetailResponse;
import com.restaurant.modules.menu.dto.response.DishOrderingView;
import com.restaurant.modules.menu.dto.response.DishSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Món ăn: thực đơn công khai (UC007, UC012), quản lý của Quản lý (UC010) và dữ liệu món cho module gọi món.
 * Hàm {@code *Visible*} luôn chỉ thấy món {@code AVAILABLE} và {@code OUT_OF_STOCK}.
 */
public interface DishService {

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code VALIDATION_ERROR} nếu lọc món ngừng bán hoặc khoảng giá ngược
     */
    Page<DishSummaryResponse> searchVisibleDishes(DishSearchRequest request, PageRequestParams params);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND} nếu món không có hoặc đã ngừng bán
     */
    DishDetailResponse getVisibleDish(UUID id);

    /**
     * Tìm món cho Quản lý, thấy cả món ngừng bán.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code VALIDATION_ERROR} nếu khoảng giá ngược
     */
    Page<DishSummaryResponse> searchDishes(DishSearchRequest request, PageRequestParams params);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}
     */
    DishDetailResponse getDish(UUID id);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND} nếu danh mục không có, {@code DISH_NAME_EXISTS} nếu trùng tên trong cùng danh mục
     */
    DishDetailResponse createDish(DishCreateRequest request);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND} (món hoặc danh mục), {@code DISH_NAME_EXISTS}
     */
    DishDetailResponse updateDish(UUID id, DishUpdateRequest request);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code FILE_TYPE_NOT_SUPPORTED}
     */
    DishDetailResponse updateDishImage(UUID id, MultipartFile file);

    /**
     * Xóa cứng món chưa từng được gọi; mỗi {@link DishDeletionGuard} được hỏi trước.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code DISH_IN_USE}
     */
    void deleteDish(UUID id);

    /**
     * Tên, giá và trạng thái hiện tại của các món để module gọi món chụp lại lúc gửi bếp.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND} nếu có món không tồn tại
     */
    List<DishOrderingView> getDishesForOrdering(Collection<UUID> ids);
}
