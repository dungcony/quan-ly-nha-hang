package com.restaurant.modules.menu.service.impl;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.storage.FileStorageService;
import com.restaurant.modules.menu.dto.request.DishCreateRequest;
import com.restaurant.modules.menu.dto.request.DishSearchRequest;
import com.restaurant.modules.menu.dto.request.DishUpdateRequest;
import com.restaurant.modules.menu.dto.response.DishDetailResponse;
import com.restaurant.modules.menu.dto.response.DishOrderingView;
import com.restaurant.modules.menu.dto.response.DishSummaryResponse;
import com.restaurant.modules.menu.entity.Category;
import com.restaurant.modules.menu.entity.Dish;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.mapper.DishMapperImpl;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.service.DishDeletionGuard;
import com.restaurant.modules.menu.validator.DishValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.mock.web.MockMultipartFile;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DishServiceImplTest {

    @Mock
    private DishRepository dishRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private FileStorageService fileStorageService;

    private DishServiceImpl service;
    private Category mainCourse;
    private Category dessert;
    private Dish dish;

    @BeforeEach
    void setUp() {
        service = buildService();
        mainCourse = newCategory("Món chính");
        dessert = newCategory("Tráng miệng");
        dish = newDish("Phở bò tái", mainCourse, DishStatus.AVAILABLE);
    }

    private DishServiceImpl buildService(DishDeletionGuard... guards) {
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int i = 0; i < guards.length; i++) {
            factory.addBean("guard" + i, guards[i]);
        }
        DishValidator validator = new DishValidator(dishRepository, factory.getBeanProvider(DishDeletionGuard.class));
        return new DishServiceImpl(dishRepository, categoryRepository, validator, new DishMapperImpl(), fileStorageService);
    }

    private Category newCategory(String name) {
        Category c = new Category();
        c.setId(UUID.randomUUID());
        c.setName(name);
        return c;
    }

    private Dish newDish(String name, Category category, DishStatus status) {
        Dish d = new Dish();
        d.setId(UUID.randomUUID());
        d.setName(name);
        d.setCategory(category);
        d.setPrice(65000L);
        d.setUnit("Tô");
        d.setStatus(status);
        return d;
    }

    private DishCreateRequest createRequest() {
        return new DishCreateRequest("Phở bò tái", mainCourse.getId(), 65000L, "Tô", "Nước dùng hầm 12 giờ", 10, DishStatus.AVAILABLE);
    }

    // ---- tìm kiếm / thực đơn công khai (UC007, UC012) ----

    @SuppressWarnings("unchecked")
    @Test
    void searchVisibleDishes_returns_summaries_with_default_sort_by_name() {
        when(dishRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(dish)));

        var page = service.searchVisibleDishes(new DishSearchRequest("phở", null, null, null, null),
                PageRequestParams.of(null, null, null, "asc"));

        assertThat(page.getContent()).singleElement().extracting(DishSummaryResponse::name).isEqualTo("Phở bò tái");
        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(dishRepository).findAll(any(Specification.class), pageable.capture());
        assertThat(pageable.getValue().getSort().getOrderFor("name")).isNotNull();
        assertThat(pageable.getValue().getSort().getOrderFor("name").isAscending()).isTrue();
    }

    @Test
    void searchVisibleDishes_rejects_discontinued_status_filter() {
        assertThatThrownBy(() -> service.searchVisibleDishes(
                new DishSearchRequest(null, null, null, null, DishStatus.DISCONTINUED), PageRequestParams.of(null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void searchVisibleDishes_rejects_inverted_price_range() {
        assertThatThrownBy(() -> service.searchVisibleDishes(
                new DishSearchRequest(null, null, 80000L, 30000L, null), PageRequestParams.of(null, null, null, null)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void getVisibleDish_hides_discontinued_dishes() {
        Dish stopped = newDish("Món cũ", dessert, DishStatus.DISCONTINUED);
        when(dishRepository.findById(stopped.getId())).thenReturn(Optional.of(stopped));

        assertThatThrownBy(() -> service.getVisibleDish(stopped.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void getVisibleDish_shows_out_of_stock_dishes() {
        dish.setStatus(DishStatus.OUT_OF_STOCK);
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));

        assertThat(service.getVisibleDish(dish.getId()).status()).isEqualTo(DishStatus.OUT_OF_STOCK);
    }

    // ---- quản lý (UC010) ----

    @Test
    void getDish_unknown_id_is_not_found() {
        UUID id = UUID.randomUUID();
        when(dishRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDish(id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void createDish_saves_the_dish() {
        when(categoryRepository.findById(mainCourse.getId())).thenReturn(Optional.of(mainCourse));
        when(dishRepository.saveAndFlush(any(Dish.class))).thenAnswer(inv -> inv.getArgument(0));

        DishDetailResponse response = service.createDish(createRequest());

        ArgumentCaptor<Dish> captor = ArgumentCaptor.forClass(Dish.class);
        verify(dishRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getId()).isNotNull();
        assertThat(captor.getValue().getPrice()).isEqualTo(65000L);
        assertThat(captor.getValue().getCategory()).isSameAs(mainCourse);
        assertThat(response.name()).isEqualTo("Phở bò tái");
        assertThat(response.status()).isEqualTo(DishStatus.AVAILABLE);
    }

    @Test
    void createDish_unknown_category_is_not_found() {
        UUID missing = UUID.randomUUID();
        when(categoryRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createDish(
                new DishCreateRequest("Phở bò tái", missing, 65000L, "Tô", null, null, DishStatus.AVAILABLE)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
        verify(dishRepository, never()).saveAndFlush(any());
    }

    @Test
    void createDish_rejects_duplicate_name_in_category() {
        when(categoryRepository.findById(mainCourse.getId())).thenReturn(Optional.of(mainCourse));
        when(dishRepository.existsByCategoryIdAndNameIgnoreCase(mainCourse.getId(), "Phở bò tái")).thenReturn(true);

        assertThatThrownBy(() -> service.createDish(createRequest()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_NAME_EXISTS");
        verify(dishRepository, never()).saveAndFlush(any());
    }

    @Test
    void createDish_maps_unique_index_violation_to_name_exists() {
        when(categoryRepository.findById(mainCourse.getId())).thenReturn(Optional.of(mainCourse));
        when(dishRepository.saveAndFlush(any(Dish.class))).thenThrow(new DataIntegrityViolationException("uq_dishes_category_name"));

        assertThatThrownBy(() -> service.createDish(createRequest()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_NAME_EXISTS");
    }

    @Test
    void updateDish_changes_price_and_status() {
        when(categoryRepository.findById(mainCourse.getId())).thenReturn(Optional.of(mainCourse));
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));
        when(dishRepository.saveAndFlush(dish)).thenReturn(dish);

        DishDetailResponse response = service.updateDish(dish.getId(),
                new DishUpdateRequest("Phở bò tái", mainCourse.getId(), 70000L, "Tô", null, null, DishStatus.OUT_OF_STOCK));

        assertThat(dish.getPrice()).isEqualTo(70000L);
        assertThat(dish.getCategory()).isSameAs(mainCourse);
        assertThat(response.status()).isEqualTo(DishStatus.OUT_OF_STOCK);
    }

    @Test
    void updateDish_rejects_name_of_another_dish_in_category() {
        when(categoryRepository.findById(mainCourse.getId())).thenReturn(Optional.of(mainCourse));
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));
        when(dishRepository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(mainCourse.getId(), "Bún chả", dish.getId())).thenReturn(true);

        assertThatThrownBy(() -> service.updateDish(dish.getId(),
                new DishUpdateRequest("Bún chả", mainCourse.getId(), 65000L, "Tô", null, null, DishStatus.AVAILABLE)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_NAME_EXISTS");
    }

    @Test
    void updateDishImage_stores_image_in_dishes_directory() {
        MockMultipartFile file = new MockMultipartFile("file", "pho.jpg", "image/jpeg", new byte[]{1});
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));
        when(fileStorageService.storeImage(file, "dishes")).thenReturn("/files/dishes/x.jpg");
        when(dishRepository.saveAndFlush(dish)).thenReturn(dish);

        assertThat(service.updateDishImage(dish.getId(), file).imageUrl()).isEqualTo("/files/dishes/x.jpg");
    }

    @Test
    void deleteDish_removes_a_dish_never_ordered() {
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));

        buildService(id -> false).deleteDish(dish.getId());

        verify(dishRepository).delete(dish);
    }

    @Test
    void deleteDish_rejects_a_dish_that_was_ordered() {
        when(dishRepository.findById(dish.getId())).thenReturn(Optional.of(dish));

        assertThatThrownBy(() -> buildService(id -> true).deleteDish(dish.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_IN_USE");
        verify(dishRepository, never()).delete(any(Dish.class));
    }

    @Test
    void deleteDish_unknown_id_is_not_found() {
        UUID id = UUID.randomUUID();
        when(dishRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.deleteDish(id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    // ---- API công khai cho ordering ----

    @Test
    void getDishesForOrdering_returns_name_price_and_status() {
        when(dishRepository.findAllById(List.of(dish.getId()))).thenReturn(List.of(dish));

        List<DishOrderingView> views = service.getDishesForOrdering(List.of(dish.getId()));

        assertThat(views).singleElement().satisfies(v -> {
            assertThat(v.id()).isEqualTo(dish.getId());
            assertThat(v.price()).isEqualTo(65000L);
            assertThat(v.status()).isEqualTo(DishStatus.AVAILABLE);
        });
    }

    @Test
    void getDishesForOrdering_unknown_dish_is_not_found() {
        UUID missing = UUID.randomUUID();
        when(dishRepository.findAllById(List.of(dish.getId(), missing))).thenReturn(List.of(dish));

        assertThatThrownBy(() -> service.getDishesForOrdering(List.of(dish.getId(), missing)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }
}
