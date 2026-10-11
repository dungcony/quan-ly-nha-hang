package com.restaurant.modules.user.dto.request;

import com.restaurant.modules.user.enums.Gender;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class ProfileUpdateRequestTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private ProfileUpdateRequest withBirthDate(LocalDate dob) {
        return new ProfileUpdateRequest("Nguyễn Văn An", "an@gmail.com", dob, "0989123456", Gender.MALE);
    }

    @Test
    void birth_date_of_today_is_valid_because_the_srs_only_forbids_the_future() {
        assertThat(validator.validate(withBirthDate(LocalDate.now()))).isEmpty();
    }

    @Test
    void birth_date_in_the_future_is_rejected() {
        assertThat(validator.validate(withBirthDate(LocalDate.now().plusDays(1))))
                .extracting(v -> v.getPropertyPath().toString()).containsExactly("dateOfBirth");
    }
}
