package com.restaurant.modules.menu.validator;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.modules.menu.enums.DishStatus;
import com.restaurant.modules.menu.repository.DishRepository;
import com.restaurant.modules.menu.service.DishDeletionGuard;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DishValidatorTest {

    @Mock
    private DishRepository dishRepository;

    private final UUID mainCourse = UUID.randomUUID();
    private final UUID drink = UUID.randomUUID();

    private DishValidator validator(DishDeletionGuard... guards) {
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int i = 0; i < guards.length; i++) {
            factory.addBean("guard" + i, guards[i]);
        }
        ObjectProvider<DishDeletionGuard> provider = factory.getBeanProvider(DishDeletionGuard.class);
        return new DishValidator(dishRepository, provider);
    }

    @Test
    void validateNameUnique_passes_when_name_is_free_in_the_category() {
        when(dishRepository.existsByCategoryIdAndNameIgnoreCase(mainCourse, "Phở bò")).thenReturn(false);

        assertThatCode(() -> validator().validateNameUnique(mainCourse, "Phở bò", null))
                .doesNotThrowAnyException();
    }

    @Test
    void validateNameUnique_rejects_duplicate_ignoring_case_for_new_dish() {
        when(dishRepository.existsByCategoryIdAndNameIgnoreCase(mainCourse, "phở BÒ")).thenReturn(true);

        assertThatThrownBy(() -> validator().validateNameUnique(mainCourse, "phở BÒ", null))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_NAME_EXISTS");
    }

    @Test
    void validateNameUnique_ignores_the_dish_being_updated() {
        UUID self = UUID.randomUUID();
        when(dishRepository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(drink, "Trà đá", self)).thenReturn(false);
        UUID other = UUID.randomUUID();
        when(dishRepository.existsByCategoryIdAndNameIgnoreCaseAndIdNot(drink, "Cà phê", other)).thenReturn(true);

        assertThatCode(() -> validator().validateNameUnique(drink, "Trà đá", self)).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator().validateNameUnique(drink, "Cà phê", other))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_NAME_EXISTS");
    }

    @Test
    void validatePriceRange_rejects_min_greater_than_max() {
        assertThatThrownBy(() -> validator().validatePriceRange(80000L, 30000L))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void validatePriceRange_accepts_open_ended_and_equal_bounds() {
        assertThatCode(() -> validator().validatePriceRange(null, null)).doesNotThrowAnyException();
        assertThatCode(() -> validator().validatePriceRange(30000L, null)).doesNotThrowAnyException();
        assertThatCode(() -> validator().validatePriceRange(null, 30000L)).doesNotThrowAnyException();
        assertThatCode(() -> validator().validatePriceRange(30000L, 30000L)).doesNotThrowAnyException();
    }

    @Test
    void validateVisibleStatus_rejects_discontinued_for_public_search() {
        assertThatThrownBy(() -> validator().validateVisibleStatus(DishStatus.DISCONTINUED))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("VALIDATION_ERROR");
        assertThatCode(() -> validator().validateVisibleStatus(DishStatus.OUT_OF_STOCK)).doesNotThrowAnyException();
        assertThatCode(() -> validator().validateVisibleStatus(null)).doesNotThrowAnyException();
    }

    @Test
    void validateDeletable_passes_when_no_guard_reports_usage() {
        assertThatCode(() -> validator(id -> false).validateDeletable(UUID.randomUUID())).doesNotThrowAnyException();
    }

    @Test
    void validateDeletable_rejects_dish_that_was_ordered() {
        assertThatThrownBy(() -> validator(id -> false, id -> true).validateDeletable(UUID.randomUUID()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("DISH_IN_USE");
    }
}
