package com.restaurant.modules.billing.controller;

import com.restaurant.common.response.ApiResponse;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.common.response.PageResponse;
import com.restaurant.common.security.SecurityContextUtil;
import com.restaurant.modules.billing.dto.request.InvoiceCreateRequest;
import com.restaurant.modules.billing.dto.request.InvoiceSearchRequest;
import com.restaurant.modules.billing.dto.response.InvoiceResponse;
import com.restaurant.modules.billing.dto.response.InvoiceSummaryResponse;
import com.restaurant.modules.billing.service.InvoiceService;
import com.restaurant.modules.user.enums.Role;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Hóa đơn: Thu ngân thanh toán (UC018); Thu ngân và Quản lý tìm, xem và in lại (UC007, UC019)..
 */
@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @PostMapping
    @PreAuthorize("hasRole('CASHIER')")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InvoiceResponse> createInvoice(@Valid @RequestBody InvoiceCreateRequest request) {
        return ApiResponse.of(invoiceService.createInvoice(SecurityContextUtil.currentUserId(), request));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER')")
    public ApiResponse<PageResponse<InvoiceSummaryResponse>> searchInvoices(InvoiceSearchRequest request, PageRequestParams params) {
        return ApiResponse.of(PageResponse.of(invoiceService.searchInvoices(viewerRole(), request, params)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER')")
    public ApiResponse<InvoiceResponse> getInvoice(@PathVariable UUID id) {
        return ApiResponse.of(invoiceService.getInvoice(viewerRole(), id));
    }

    @PostMapping("/{id}/reprint")
    @PreAuthorize("hasAnyRole('CASHIER', 'MANAGER')")
    public ApiResponse<InvoiceResponse> reprintInvoice(@PathVariable UUID id) {
        return ApiResponse.of(invoiceService.reprintInvoice(viewerRole(), id));
    }

    private Role viewerRole() {
        return SecurityContextUtil.hasRole("MANAGER") ? Role.MANAGER : Role.CASHIER;
    }
}
