package com.restaurant.modules.reservation.service;

import com.restaurant.common.response.PageRequestParams;
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
import com.restaurant.modules.table.dto.response.TableBriefResponse;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.UUID;

/**
 * Đặt bàn từ lúc khách yêu cầu tới lúc nhận bàn (UC013, UC014, UC017). Còn bàn nghĩa là có bàn chưa tạm khóa, đủ sức chứa và
 * không trùng khung giờ với đặt bàn đã xác nhận; đặt bàn chờ xác nhận chưa giữ chỗ.
 */
public interface ReservationService {

    /**
     * Còn bàn không và, nếu hết, các khung giờ gần nhất còn bàn.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code RESERVATION_TIME_INVALID} nếu giờ hẹn không hợp lệ
     */
    AvailabilityResponse checkAvailability(AvailabilityRequest request);

    /**
     * Tạo đặt bàn {@code PENDING} kèm mã và gửi email "đã nhận yêu cầu" sau commit nếu khách có email.
     *
     * @param customerIdOrNull tài khoản khách hàng đang đăng nhập; {@code null} với khách vãng lai
     * @throws com.restaurant.common.exception.BusinessException {@code RESERVATION_TIME_INVALID}; {@code RESERVATION_NO_TABLE_AVAILABLE}
     *                                                          kèm {@code detail.suggestions}
     */
    ReservationResponse createReservation(UUID customerIdOrNull, ReservationCreateRequest request);

    /** Tìm đặt bàn cho nhân viên; mặc định lấy các đặt bàn của hôm nay. */
    Page<ReservationSummaryResponse> searchReservations(ReservationSearchRequest request, PageRequestParams params);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}
     */
    ReservationResponse getReservation(UUID id);

    /**
     * Bàn gán được cho đặt bàn chờ xác nhận (xếp bàn) hoặc đã xác nhận (đổi bàn lúc nhận bàn): đủ sức chứa, không tạm khóa,
     * không trùng giờ; bàn cùng khu vực ưu tiên xếp trước. Với đặt bàn đã xác nhận chỉ trả bàn đang {@code AVAILABLE}.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code RESERVATION_STATUS_INVALID}
     */
    List<TableBriefResponse> findAvailableTables(UUID id);

    /**
     * Xác nhận đặt bàn và gán bàn. Nếu giờ hẹn còn không quá 60 phút thì bàn chuyển sang "Đã đặt" ngay.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code RESERVATION_STATUS_INVALID},
     *                                                          {@code VALIDATION_ERROR} nếu bàn không phù hợp,
     *                                                          {@code RESERVATION_TABLE_CONFLICT} nếu bàn trùng giờ
     */
    ReservationResponse confirm(UUID id, UUID staffId, ReservationConfirmRequest request);

    /**
     * Từ chối hoặc hủy đặt bàn chờ xác nhận / đã xác nhận, giải phóng bàn đang giữ và báo khách kèm lý do.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code RESERVATION_STATUS_INVALID}
     */
    ReservationResponse rejectOrCancel(UUID id, ReservationCancelRequest request);

    /**
     * Nhận bàn: mở đơn hàng cho bàn, đặt bàn thành {@code CHECKED_IN}. Có {@code request.tableId} khác bàn đã gán thì đổi sang
     * bàn đó (phải đang trống và không trùng giờ).
     *
     * @param waiterId người nhận bàn, cũng là nhân viên phụ trách bàn của đơn
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code RESERVATION_STATUS_INVALID},
     *                                                          {@code RESERVATION_TABLE_NOT_READY}, {@code RESERVATION_TABLE_CONFLICT}
     */
    ReservationCheckInResponse checkIn(UUID id, UUID waiterId, ReservationCheckInRequest request);

    /** Lịch sử đặt bàn của khách hàng, mới nhất trước. */
    Page<ReservationSummaryResponse> listMine(UUID customerId, PageRequestParams params);

    /**
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND} nếu không phải đặt bàn của mình
     */
    ReservationResponse getMine(UUID customerId, UUID id);

    /**
     * Khách hàng tự hủy khi còn ít nhất 2 giờ tới giờ hẹn.
     *
     * @throws com.restaurant.common.exception.BusinessException {@code NOT_FOUND}, {@code RESERVATION_STATUS_INVALID},
     *                                                          {@code RESERVATION_CANCEL_TOO_LATE}
     */
    ReservationResponse cancelMine(UUID customerId, UUID id);
}
