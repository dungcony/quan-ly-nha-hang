package com.restaurant.modules.menu.service.impl;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.exception.ErrorCode;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.storage.FileStorageService;
import com.restaurant.common.util.SpecificationUtils;
import com.restaurant.modules.menu.dto.request.DishCreateRequest;
import com.restaurant.modules.menu.dto.request.DishSearchRequest;
import com.restaurant.modules.menu.dto.request.DishUpdateRequest;
import com.restaurant.modules.menu.dto.response.DishDetailResponse;
import com.restaurant.modules.menu.dto.response.DishOrderingView;
import com.restaurant.modules.menu.dto.response.DishSummaryResponse;
import com.restaurant.modules.menu.entity.Category;
import com.restaurant.modules.menu.entity.Dish;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.mapper.DishMapper;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.service.DishService;
import com.restaurant.modules.menu.validator.DishValidator;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DishServiceImpl implements DishService {

    private static final String IMAGE_DIRECTORY = "dishes";

    // Món hiển thị trong thực đơn; món ngừng bán chỉ Quản lý thấy
    private static final Set<DishStatus> VISIBLE_STATUSES = Set.of(DishStatus.AVAILABLE, DishStatus.OUT_OF_STOCK);

    // Tên field client được phép sắp xếp (snake_case) -> thuộc tính entity
    private static final Map<String, String> SORTABLE_FIELDS =
            Map.of("name", "name", "price", "price", "category", "category.sortOrder", "created_at", "createdAt");

    private final DishRepository dishRepository;
    private final CategoryRepository categoryRepository;
    private final DishValidator dishValidator;
    private final DishMapper dishMapper;
    private final FileStorageService fileStorageService;

    @Override
    @Transactional(readOnly = true)
    public Page<DishSummaryResponse> searchVisibleDishes(DishSearchRequest request, PageRequestParams params) {
        dishValidator.validateVisibleStatus(request.status());
        return search(request, params, true);
    }

    @Override
    @Transactional(readOnly = true)
    public DishDetailResponse getVisibleDish(UUID id) {
        Dish dish = loadDish(id);
        if (!VISIBLE_STATUSES.contains(dish.getStatus())) {
            throw dishNotFound();
        }
        return dishMapper.toDetailResponse(dish);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DishSummaryResponse> searchDishes(DishSearchRequest request, PageRequestParams params) {
        return search(request, params, false);
    }

    @Override
    @Transactional(readOnly = true)
    public DishDetailResponse getDish(UUID id) {
        return dishMapper.toDetailResponse(loadDish(id));
    }

    @Override
    @Transactional
    public DishDetailResponse createDish(DishCreateRequest request) {
        Category category = loadCategory(request.categoryId());
        dishValidator.validateNameUnique(category.getId(), request.name(), null);
        Dish dish = dishMapper.fromCreateRequest(request);
        dish.setId(UUID.randomUUID());
        dish.setCategory(category);
        return dishMapper.toDetailResponse(saveAndFlushUnique(dish));
    }

    @Override
    @Transactional
    public DishDetailResponse updateDish(UUID id, DishUpdateRequest request) {
        Dish dish = loadDish(id);
        Category category = loadCategory(request.categoryId());
        dishValidator.validateNameUnique(category.getId(), request.name(), id);
        dishMapper.updateFromRequest(request, dish);
        dish.setCategory(category);
        return dishMapper.toDetailResponse(saveAndFlushUnique(dish));
    }

    @Override
    @Transactional
    public DishDetailResponse updateDishImage(UUID id, MultipartFile file) {
        Dish dish = loadDish(id);
        dish.setImageUrl(fileStorageService.storeImage(file, IMAGE_DIRECTORY));
        return dishMapper.toDetailResponse(saveAndFlushUnique(dish));
    }

    @Override
    @Transactional
    public void deleteDish(UUID id) {
        Dish dish = loadDish(id);
        dishValidator.validateDeletable(id);
        dishRepository.delete(dish);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DishOrderingView> getDishesForOrdering(Collection<UUID> ids) {
        List<Dish> dishes = dishRepository.findAllById(ids);
        if (dishes.size() != Set.copyOf(ids).size()) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "Có món không tồn tại.");
        }
        return dishes.stream().map(dishMapper::toOrderingView).toList();
    }

    // Dựng Specification từ các tiêu chí; thực đơn công khai luôn bị giới hạn ở món đang hiển thị
    private Page<DishSummaryResponse> search(DishSearchRequest request, PageRequestParams params, boolean visibleOnly) {
        dishValidator.validatePriceRange(request.minPrice(), request.maxPrice());
        Specification<Dish> spec = SpecificationUtils.containsIgnoreCase("name", request.name());
        if (visibleOnly) {
            spec = spec.and((root, query, cb) -> root.get("status").in(VISIBLE_STATUSES));
        }
        if (request.categoryId() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category").get("id"), request.categoryId()));
        }
        if (request.minPrice() != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), request.minPrice()));
        }
        if (request.maxPrice() != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), request.maxPrice()));
        }
        if (request.status() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), request.status()));
        }
        return dishRepository.findAll(spec, params.toPageable(SORTABLE_FIELDS, "name"))
                .map(dishMapper::toSummaryResponse);
    }

    private Dish loadDish(UUID id) {
        return dishRepository.findById(id).orElseThrow(DishServiceImpl::dishNotFound);
    }

    private Category loadCategory(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy danh mục."));
    }

    private static BusinessException dishNotFound() {
        return new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy món ăn.");
    }

    // Unique index uq_dishes_category_name bắt trường hợp hai request cùng tên chạy song song
    private Dish saveAndFlushUnique(Dish dish) {
        try {
            return dishRepository.saveAndFlush(dish);
        } catch (DataIntegrityViolationException e) {
            throw new BusinessException(ErrorCode.DISH_NAME_EXISTS);
        }
    }
}
