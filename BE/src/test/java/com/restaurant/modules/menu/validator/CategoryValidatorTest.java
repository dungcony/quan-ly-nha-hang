package com.restaurant.modules.menu.validator;

import com.restaurant.common.exception.BusinessException;
import com.restaurant.modules.menu.repository.CategoryRepository;
import com.restaurant.modules.menu.repository.DishRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryValidatorTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private DishRepository dishRepository;
    @InjectMocks
    private CategoryValidator validator;

    @Test
    void validateNameUnique_passes_when_name_is_free() {
        when(categoryRepository.existsByNameIgnoreCase("Lẩu")).thenReturn(false);

        assertThatCode(() -> validator.validateNameUnique("Lẩu", null)).doesNotThrowAnyException();
    }

    @Test
    void validateNameUnique_rejects_duplicate_ignoring_case_for_new_category() {
        when(categoryRepository.existsByNameIgnoreCase("đồ UỐNG")).thenReturn(true);

        assertThatThrownBy(() -> validator.validateNameUnique("đồ UỐNG", null))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_NAME_EXISTS");
    }

    @Test
    void validateNameUnique_ignores_the_category_being_updated() {
        UUID self = UUID.randomUUID();
        UUID other = UUID.randomUUID();
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Lẩu", self)).thenReturn(false);
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot("Nướng", other)).thenReturn(true);

        assertThatCode(() -> validator.validateNameUnique("Lẩu", self)).doesNotThrowAnyException();
        assertThatThrownBy(() -> validator.validateNameUnique("Nướng", other))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_NAME_EXISTS");
    }

    @Test
    void validateDeletable_passes_when_category_has_no_dish() {
        UUID id = UUID.randomUUID();
        when(dishRepository.existsByCategoryId(id)).thenReturn(false);

        assertThatCode(() -> validator.validateDeletable(id)).doesNotThrowAnyException();
    }

    @Test
    void validateDeletable_rejects_category_that_still_has_dishes() {
        UUID id = UUID.randomUUID();
        when(dishRepository.existsByCategoryId(id)).thenReturn(true);

        assertThatThrownBy(() -> validator.validateDeletable(id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CATEGORY_IN_USE");
    }
}
