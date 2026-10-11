package com.restaurant.modules.order.controller;

import com.restaurant.common.response.ApiResponse;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.response.PageResponse;
import com.restaurant.common.security.SecurityContextUtil;
import com.restaurant.modules.order.dto.request.OrderItemsAddRequest;
import com.restaurant.modules.order.dto.request.OrderOpenRequest;
import com.restaurant.modules.order.dto.request.OrderSearchRequest;
import com.restaurant.modules.order.dto.response.OrderResponse;
import com.restaurant.modules.order.dto.response.OrderSummaryResponse;
import com.restaurant.modules.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Gọi món (UC015): nhân viên phục vụ mở đơn, gọi món, gửi bếp; Thu ngân chỉ xem đơn để thanh toán.
 */
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasRole('WAITER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrderResponse> openOrder(@Valid @RequestBody OrderOpenRequest request) {
        return ApiResponse.of(orderService.openOrderForWalkIn(SecurityContextUtil.currentUserId(), request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('WAITER', 'CASHIER')")
    public ApiResponse<PageResponse<OrderSummaryResponse>> searchOrders(OrderSearchRequest request, PageRequestParams params) {
        return ApiResponse.of(PageResponse.of(orderService.searchOrders(request, params)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('WAITER', 'CASHIER')")
    public ApiResponse<OrderResponse> getOrder(@PathVariable UUID id) {
        return ApiResponse.of(orderService.getOrder(id));
    }

    @PostMapping("/{id}/items")
    @PreAuthorize("hasRole('WAITER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<OrderResponse> addItems(@PathVariable UUID id, @Valid @RequestBody OrderItemsAddRequest request) {
        return ApiResponse.of(orderService.addItems(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('WAITER')")
    public ApiResponse<Void> cancelEmptyOrder(@PathVariable UUID id) {
        orderService.cancelEmptyOrder(id);
        return ApiResponse.of(null);
    }
}
