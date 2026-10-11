package com.restaurant.common.exception;

import com.restaurant.common.response.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleValidation_keeps_the_annotation_message_of_a_constraint_violation() throws Exception {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "fullName", null, false, null, null, "Họ tên không được để trống"));

        ErrorResponse body = handle(result);

        assertThat(body.error().fields()).singleElement().satisfies(f -> {
            assertThat(f.field()).isEqualTo("full_name");
            assertThat(f.message()).isEqualTo("Họ tên không được để trống");
        });
    }

    @Test
    void handleValidation_hides_internal_conversion_message_of_a_binding_failure() throws Exception {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "role", "BOSS", true, null, null,
                "Failed to convert value of type 'java.lang.String' to required type 'com.restaurant.modules.user.enums.Role'"));

        ErrorResponse body = handle(result);

        assertThat(body.error().fields()).singleElement().satisfies(f -> {
            assertThat(f.field()).isEqualTo("role");
            assertThat(f.message()).isEqualTo("Thiếu hoặc sai định dạng.").doesNotContain("java.lang");
        });
    }

    private ErrorResponse handle(BeanPropertyBindingResult result) throws Exception {
        MethodParameter parameter = new MethodParameter(Object.class.getMethod("toString"), -1);
        ResponseEntity<ErrorResponse> response = handler.handleValidation(
                new MethodArgumentNotValidException(parameter, result), new MockHttpServletRequest());
        return response.getBody();
    }

    @Test
    void handleBadRequest_maps_wrong_content_type_and_missing_file_part_to_400_instead_of_500() {
        ResponseEntity<ErrorResponse> wrongType = handler.handleBadRequest(
                new HttpMediaTypeNotSupportedException(MediaType.APPLICATION_JSON, java.util.List.of(MediaType.MULTIPART_FORM_DATA)),
                new MockHttpServletRequest());
        ResponseEntity<ErrorResponse> missingPart = handler.handleBadRequest(
                new MissingServletRequestPartException("file"), new MockHttpServletRequest());

        assertThat(wrongType.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(wrongType.getBody().error().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(missingPart.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // Gọi thẳng handler không chứng minh được Spring sẽ chuyển các exception này tới đó, nên kiểm tra khai báo @ExceptionHandler
    @Test
    void handleBadRequest_is_registered_for_wrong_content_type_and_missing_file_part() throws Exception {
        org.springframework.web.bind.annotation.ExceptionHandler registered = GlobalExceptionHandler.class
                .getMethod("handleBadRequest", Exception.class, jakarta.servlet.http.HttpServletRequest.class)
                .getAnnotation(org.springframework.web.bind.annotation.ExceptionHandler.class);

        assertThat(registered.value()).contains(HttpMediaTypeNotSupportedException.class, MissingServletRequestPartException.class);
    }

    @Test
    void handleUploadTooLarge_returns_400_file_too_large_instead_of_500() {
        ResponseEntity<ErrorResponse> response = handler.handleUploadTooLarge(
                new MaxUploadSizeExceededException(5 * 1024 * 1024), new MockHttpServletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().error().code()).isEqualTo("FILE_TOO_LARGE");
        assertThat(response.getBody().error().message()).contains("5MB");
    }
}
