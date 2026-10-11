package com.restaurant.modules.reservation.controller;

import com.restaurant.common.response.ApiResponse;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.response.PageResponse;
import com.restaurant.common.security.SecurityContextUtil;
import com.restaurant.modules.reservation.dto.request.AvailabilityRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCancelRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCheckInRequest;
import com.restaurant.modules.reservation.dto.request.ReservationConfirmRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCreateRequest;
import com.restaurant.modules.reservation.dto.request.ReservationSearchRequest;
import com.restaurant.modules.reservation.dto.response.AvailabilityResponse;
import com.restaurant.modules.reservation.dto.response.ReservationCheckInResponse;
import com.restaurant.modules.reservation.dto.response.ReservationResponse;
import com.restaurant.modules.reservation.dto.response.ReservationSummaryResponse;
import com.restaurant.modules.reservation.service.ReservationService;
import com.restaurant.modules.table.dto.response.TableBriefResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Đặt bàn. Hai endpoint đầu công khai cho Khách và Khách hàng (UC013); phần còn lại cho nhân viên phục vụ và Quản lý (UC007, UC014).
 */
@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping("/availability")
    public ApiResponse<AvailabilityResponse> checkAvailability(@Valid AvailabilityRequest request) {
        return ApiResponse.of(reservationService.checkAvailability(request));
    }

    // Chỉ gắn tài khoản khi người đặt là khách hàng đã đăng nhập; token của nhân viên không biến đặt bàn thành của nhân viên
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReservationResponse> createReservation(@Valid @RequestBody ReservationCreateRequest request) {
        UUID customerId = SecurityContextUtil.hasRole("CUSTOMER") ? SecurityContextUtil.currentUserId() : null;
        return ApiResponse.of(reservationService.createReservation(customerId, request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<PageResponse<ReservationSummaryResponse>> searchReservations(ReservationSearchRequest request, PageRequestParams params) {
        return ApiResponse.of(PageResponse.of(reservationService.searchReservations(request, params)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<ReservationResponse> getReservation(@PathVariable UUID id) {
        return ApiResponse.of(reservationService.getReservation(id));
    }

    @GetMapping("/{id}/available-tables")
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<List<TableBriefResponse>> findAvailableTables(@PathVariable UUID id) {
        return ApiResponse.of(reservationService.findAvailableTables(id));
    }

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<ReservationResponse> confirm(@PathVariable UUID id, @Valid @RequestBody ReservationConfirmRequest request) {
        return ApiResponse.of(reservationService.confirm(id, SecurityContextUtil.currentUserId(), request));
    }

    @PutMapping("/{id}/reject-or-cancel")
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<ReservationResponse> rejectOrCancel(@PathVariable UUID id, @Valid @RequestBody ReservationCancelRequest request) {
        return ApiResponse.of(reservationService.rejectOrCancel(id, request));
    }

    @PutMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('WAITER', 'MANAGER')")
    public ApiResponse<ReservationCheckInResponse> checkIn(@PathVariable UUID id,
                                                           @RequestBody(required = false) ReservationCheckInRequest request) {
        return ApiResponse.of(reservationService.checkIn(id, SecurityContextUtil.currentUserId(), request));
    }
}
