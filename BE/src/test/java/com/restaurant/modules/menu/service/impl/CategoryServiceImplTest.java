package com.restaurant.modules.menu.service.impl;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.modules.menu.dto.request.CategoryCreateRequest;
import com.restaurant.modules.menu.dto.request.CategoryUpdateRequest;
import com.restaurant.modules.menu.dto.response.CategoryResponse;
import com.restaurant.modules.menu.dto.response.MenuCategoryResponse;
import com.restaurant.modules.menu.entity.Category;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.mapper.CategoryMapperImpl;
import com.restaurant.modules.menu.repository.CategoryCountProjection;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.validator.CategoryValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceImplTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private DishRepository dishRepository;

    private CategoryServiceImpl service;
    private Category mains;
    private Category drinks;

    @BeforeEach
    void setUp() {
        CategoryValidator validator = new CategoryValidator(categoryRepository, dishRepository);
        service = new CategoryServiceImpl(categoryRepository, dishRepository, validator, new CategoryMapperImpl());
        mains = newCategory("Món chính", 1);
        drinks = newCategory("Đồ uống", 2);
    }

    private Category newCategory(String name, int sortOrder) {
        Category c = new Category();
        c.setId(UUID.randomUUID());
        c.setName(name);
        c.setSortOrder(sortOrder);
        return c;
    }

    private CategoryCountProjection count(UUID categoryId, long count) {
        return new CategoryCountProjection() {
            public UUID getCategoryId() { return categoryId; }
            public long getCount() { return count; }
        };
    }

    // ---- thực đơn công khai (UC012) ----

    @Test
    void listMenuCategories_keeps_sort_order_and_uses_zero_for_empty_categories() {
        when(categoryRepository.findAllByOrderBySortOrderAscNameAsc()).thenReturn(List.of(mains, drinks));
        when(dishRepository.countVisibleByCategory(Set.of(DishStatus.AVAILABLE, DishStatus.OUT_OF_STOCK)))
                .thenReturn(List.of(count(mains.getId(), 3)));

        List<MenuCategoryResponse> categories = service.listMenuCategories();

        assertThat(categories).extracting(MenuCategoryResponse::name).containsExactly("Món chính", "Đồ uống");
        assertThat(categories).extracting(MenuCategoryResponse::dishCount).containsExactly(3L, 0L);
    }

    // ---- quản lý (UC010) ----

    @Test
    void listCategories_counts_dishes_of_every_status() {
        when(categoryRepository.findAllByOrderBySortOrderAscNameAsc()).thenReturn(List.of(mains, drinks));
        when(dishRepository.countAllByCategory()).thenReturn(List.of(count(drinks.getId(), 5)));

        List<CategoryResponse> categories = service.listCategories();

        assertThat(categories).extracting(CategoryResponse::id).containsExactly(mains.getId(), drinks.getId());
        assertThat(categories).extracting(CategoryResponse::dishCount).containsExactly(0L, 5L);
    }

    @Test
    void createCategory_saves_a_category_with_a_new_id() {
        when(categoryRepository.saveAndFlush(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        CategoryResponse response = service.createCategory(new CategoryCreateRequest("Lẩu", 5));

        ArgumentCaptor<Category> captor = ArgumentCaptor.forClass(Category.class);
        verify(categoryRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getId()).isNotNull();
        assertThat(captor.getValue().getName()).isEqualTo("Lẩu");
        assertThat(captor.getValue().getSortOrder()).isEqualTo(5);
        assertThat(response.name()).isEqualTo("Lẩu");
        assertThat(response.dishCount()).isZero();
    }

    @Test
    void createCategory_rejects_duplicate_name() {
        when(categoryRepository.existsByNameIgnoreCase("Lẩu")).thenReturn(true);

        assertThatThrownBy(() -> service.createCategory(new CategoryCreateRequest("Lẩu", 5)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_NAME_EXISTS");
        verify(categoryRepository, never()).saveAndFlush(any());
    }

    @Test
    void createCategory_maps_unique_index_violation_to_name_exists() {
        when(categoryRepository.saveAndFlush(any(Category.class))).thenThrow(new DataIntegrityViolationException("uq_categories_name"));

        assertThatThrownBy(() -> service.createCategory(new CategoryCreateRequest("Lẩu", 5)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_NAME_EXISTS");
    }

    @Test
    void updateCategory_changes_name_and_sort_order_and_returns_dish_count() {
        when(categoryRepository.findById(mains.getId())).thenReturn(Optional.of(mains));
        when(categoryRepository.saveAndFlush(mains)).thenReturn(mains);
        when(dishRepository.countByCategoryId(mains.getId())).thenReturn(4L);

        CategoryResponse response = service.updateCategory(mains.getId(), new CategoryUpdateRequest("Món chính mới", 9));

        assertThat(mains.getName()).isEqualTo("Món chính mới");
        assertThat(mains.getSortOrder()).isEqualTo(9);
        assertThat(response.dishCount()).isEqualTo(4L);
    }

    @Test
    void updateCategory_rejects_name_of_another_category() {
        when(categoryRepository.findById(mains.getId())).thenReturn(Optional.of(mains));
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Đồ uống", mains.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.updateCategory(mains.getId(), new CategoryUpdateRequest("Đồ uống", 1)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_NAME_EXISTS");
    }

    @Test
    void updateCategory_unknown_id_is_not_found() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateCategory(id, new CategoryUpdateRequest("Lẩu", 1)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void deleteCategory_removes_a_category_without_dishes() {
        when(categoryRepository.findById(mains.getId())).thenReturn(Optional.of(mains));
        when(dishRepository.existsByCategoryId(mains.getId())).thenReturn(false);

        service.deleteCategory(mains.getId());

        verify(categoryRepository).delete(mains);
    }

    @Test
    void deleteCategory_rejects_a_category_that_still_has_dishes() {
        when(categoryRepository.findById(mains.getId())).thenReturn(Optional.of(mains));
        when(dishRepository.existsByCategoryId(mains.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.deleteCategory(mains.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_IN_USE");
        verify(categoryRepository, never()).delete(any(Category.class));
    }

    @Test
    void deleteCategory_unknown_id_is_not_found() {
        UUID id = UUID.randomUUID();
        when(categoryRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteCategory(id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }
}
