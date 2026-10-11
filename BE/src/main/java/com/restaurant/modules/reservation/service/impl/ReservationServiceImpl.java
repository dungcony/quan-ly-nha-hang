package com.restaurant.modules.reservation.service.impl;

import com.restaurant.common.code.DailyCodeGenerator;
import com.restaurant.common.config.RestaurantProperties;
import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.exception.ErrorCode;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.modules.order.dto.request.OpenOrderCommand;
import com.restaurant.modules.order.service.OrderService;
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
import com.restaurant.modules.reservation.entity.Reservation;
import com.restaurant.modules.reservation.enums.ReservationStatus;
import com.restaurant.modules.reservation.events.ReservationCancelledEvent;
import com.restaurant.modules.reservation.events.ReservationConfirmedEvent;
import com.restaurant.modules.reservation.events.ReservationCreatedEvent;
import com.restaurant.modules.reservation.mapper.ReservationMapper;
import com.restaurant.modules.reservation.repository.ReservationRepository;
import com.restaurant.modules.reservation.service.ReservationService;
import com.restaurant.modules.reservation.validator.ReservationValidator;
import com.restaurant.modules.table.dto.response.TableBriefResponse;
import com.restaurant.modules.table.enums.TableStatus;
import com.restaurant.modules.table.service.TableService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Điều phối đặt bàn. Mọi thao tác đổi trạng thái khóa dòng đặt bàn trước ({@code FOR UPDATE}); chống đặt trùng bàn do ràng buộc
 * loại trừ của CSDL, truy vấn {@code findBusyTableIds} chỉ để báo lỗi sớm và gợi ý. Email gửi qua sự kiện sau commit.
 */
@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private static final String CUSTOMER_CANCEL_REASON = "Khách hàng hủy";
    private static final String EXCLUSION_CONSTRAINT = "ex_reservations_table_no_overlap";
    private static final Duration SUGGESTION_STEP = Duration.ofMinutes(30);
    // Quét tối đa 24 giờ quanh giờ yêu cầu; thực tế bị chặn sớm bởi giờ mở cửa và số gợi ý
    private static final int MAX_SUGGESTION_STEPS = 48;
    private static final Set<ReservationStatus> CANCELLABLE = Set.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED);

    // Tên field client được phép sắp xếp (snake_case) -> thuộc tính entity
    private static final Map<String, String> SORTABLE_FIELDS =
            Map.of("reserved_at", "reservedAt", "created_at", "createdAt", "guest_count", "guestCount");

    private final ReservationRepository reservationRepository;
    private final ReservationValidator reservationValidator;
    private final ReservationMapper reservationMapper;
    private final TableService tableService;
    private final OrderService orderService;
    private final DailyCodeGenerator dailyCodeGenerator;
    private final RestaurantProperties properties;
    private final Clock clock;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public AvailabilityResponse checkAvailability(AvailabilityRequest request) {
        reservationValidator.validateReservationTime(request.reservedAt());
        List<TableBriefResponse> candidates = tableService.listBookableTables(request.guestCount());
        if (hasFreeTable(request.reservedAt(), candidates)) {
            return new AvailabilityResponse(true, List.of());
        }
        return new AvailabilityResponse(false, suggestSlots(request.reservedAt(), candidates));
    }

    @Override
    @Transactional
    public ReservationResponse createReservation(UUID customerIdOrNull, ReservationCreateRequest request) {
        reservationValidator.validateReservationTime(request.reservedAt());
        List<TableBriefResponse> candidates = tableService.listBookableTables(request.guestCount());
        if (!hasFreeTable(request.reservedAt(), candidates)) {
            throw new BusinessException(ErrorCode.RESERVATION_NO_TABLE_AVAILABLE,
                    ErrorCode.RESERVATION_NO_TABLE_AVAILABLE.getDefaultMessage(),
                    Map.of("suggestions", suggestSlots(request.reservedAt(), candidates)));
        }

        Reservation reservation = reservationMapper.fromCreateRequest(request);
        reservation.setId(UUID.randomUUID());
        reservation.setCode(dailyCodeGenerator.next("DB", LocalDate.now(clock)));
        reservation.setCustomerId(customerIdOrNull);
        reservation.setPhone(request.phone().trim());
        reservation.setEmail(StringUtils.hasText(request.email()) ? request.email().trim() : null);
        reservation.setReservedEnd(request.reservedAt().plus(properties.reservationDuration()));
        reservation.setStatus(ReservationStatus.PENDING);
        reservationRepository.saveAndFlush(reservation);

        eventPublisher.publishEvent(new ReservationCreatedEvent(reservation.getEmail(), reservation.getCode(),
                reservation.getGuestName(), reservation.getReservedAt(), reservation.getGuestCount()));
        return toResponse(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationSummaryResponse> searchReservations(ReservationSearchRequest request, PageRequestParams params) {
        Specification<Reservation> spec = (root, query, cb) -> cb.conjunction();
        if (StringUtils.hasText(request.keyword())) {
            String pattern = "%" + request.keyword().trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("guestName")), pattern, '\\'),
                    cb.like(cb.lower(root.get("phone")), pattern, '\\')));
        }
        if (StringUtils.hasText(request.code())) {
            String code = request.code().trim().toLowerCase();
            spec = spec.and((root, query, cb) -> cb.equal(cb.lower(root.get("code")), code));
        }
        LocalDate date = request.date() != null ? request.date() : (defaultsToToday(request) ? LocalDate.now(clock) : null);
        if (date != null) {
            ZoneId zone = clock.getZone();
            Instant from = date.atStartOfDay(zone).toInstant();
            Instant to = date.plusDays(1).atStartOfDay(zone).toInstant();
            spec = spec.and((root, query, cb) -> cb.and(cb.greaterThanOrEqualTo(root.get("reservedAt"), from),
                    cb.lessThan(root.get("reservedAt"), to)));
        }
        if (request.status() != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), request.status()));
        }
        return toSummaries(reservationRepository.findAll(spec, params.toPageable(SORTABLE_FIELDS, "reservedAt")));
    }

    // Lọc theo trạng thái cũng là tiêu chí: nếu vẫn ép "hôm nay" thì Chờ xác nhận của các ngày khác sẽ biến mất khỏi danh sách
    static boolean defaultsToToday(ReservationSearchRequest request) {
        return request.date() == null && request.status() == null
                && !StringUtils.hasText(request.code()) && !StringUtils.hasText(request.keyword());
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse getReservation(UUID id) {
        return toResponse(reservationRepository.findById(id).orElseThrow(ReservationServiceImpl::notFound));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TableBriefResponse> findAvailableTables(UUID id) {
        Reservation reservation = reservationRepository.findById(id).orElseThrow(ReservationServiceImpl::notFound);
        reservationValidator.validateStatus(reservation, Set.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED));
        Set<UUID> busy = reservationRepository.findBusyTableIds(reservation.getReservedAt(), reservation.getReservedEnd());
        // Đơn đã xác nhận được tìm bàn khác khi nhận bàn (UC014 2a), nên chỉ gợi ý bàn đang trống ngay lúc này
        boolean seatingNow = reservation.getStatus() == ReservationStatus.CONFIRMED;
        // Sort ổn định: bàn cùng khu vực ưu tiên lên đầu, giữ nguyên thứ tự vừa khít (sức chứa tăng dần) trong mỗi nhóm
        return tableService.listBookableTables(reservation.getGuestCount()).stream()
                .filter(table -> !busy.contains(table.id()))
                .filter(table -> !seatingNow || table.status() == TableStatus.AVAILABLE)
                .sorted(Comparator.comparing((TableBriefResponse table) -> table.zone() != reservation.getPreferredZone()))
                .toList();
    }

    @Override
    @Transactional
    public ReservationResponse confirm(UUID id, UUID staffId, ReservationConfirmRequest request) {
        Reservation reservation = loadForUpdate(id);
        reservationValidator.validateStatus(reservation, Set.of(ReservationStatus.PENDING));
        TableBriefResponse table = findTable(request.tableId());
        reservationValidator.validateTableForReservation(reservation, table);
        if (isBusy(request.tableId(), reservation)) {
            throw new BusinessException(ErrorCode.RESERVATION_TABLE_CONFLICT);
        }

        reservation.setTableId(request.tableId());
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setConfirmedBy(staffId);
        saveAndFlushNoOverlap(reservation);

        // Gần giờ hẹn thì giữ bàn ngay thay vì đợi job nền chạy
        if (!reservation.getReservedAt().isAfter(clock.instant().plus(properties.reservationHoldBefore()))) {
            tableService.transitionStatus(request.tableId(), Set.of(TableStatus.AVAILABLE), TableStatus.RESERVED);
        }
        eventPublisher.publishEvent(new ReservationConfirmedEvent(reservation.getEmail(), reservation.getCode(),
                reservation.getGuestName(), reservation.getReservedAt(), table.name()));
        return reservationMapper.toResponse(reservation, table);
    }

    @Override
    @Transactional
    public ReservationResponse rejectOrCancel(UUID id, ReservationCancelRequest request) {
        Reservation reservation = loadForUpdate(id);
        reservationValidator.validateStatus(reservation, CANCELLABLE);
        cancel(reservation, request.reason());

        eventPublisher.publishEvent(new ReservationCancelledEvent(reservation.getEmail(), reservation.getCode(),
                reservation.getGuestName(), reservation.getReservedAt(), request.reason()));
        return toResponse(reservation);
    }

    @Override
    @Transactional
    public ReservationCheckInResponse checkIn(UUID id, UUID waiterId, ReservationCheckInRequest request) {
        Reservation reservation = loadForUpdate(id);
        reservationValidator.validateStatus(reservation, Set.of(ReservationStatus.CONFIRMED));

        UUID assignedTableId = reservation.getTableId();
        UUID targetTableId = request != null && request.tableId() != null ? request.tableId() : assignedTableId;
        boolean switchingTable = !targetTableId.equals(assignedTableId);
        if (switchingTable) {
            validateReplacementTable(reservation, targetTableId);
        }

        UUID orderId = openOrderForCheckIn(reservation, targetTableId, waiterId, !switchingTable);
        reservation.setTableId(targetTableId);
        reservation.setStatus(ReservationStatus.CHECKED_IN);
        saveAndFlushNoOverlap(reservation);

        if (switchingTable) {
            // Bàn cũ có thể đang được giữ riêng cho đặt bàn này nên trả về trống
            tableService.transitionStatus(assignedTableId, Set.of(TableStatus.RESERVED), TableStatus.AVAILABLE);
        }
        return new ReservationCheckInResponse(toResponse(reservation), orderId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationSummaryResponse> listMine(UUID customerId, PageRequestParams params) {
        Specification<Reservation> spec = (root, query, cb) -> cb.equal(root.get("customerId"), customerId);
        return toSummaries(reservationRepository.findAll(spec, params.toPageable(SORTABLE_FIELDS, "createdAt")));
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationResponse getMine(UUID customerId, UUID id) {
        return toResponse(reservationRepository.findByIdAndCustomerId(id, customerId).orElseThrow(ReservationServiceImpl::notFound));
    }

    @Override
    @Transactional
    public ReservationResponse cancelMine(UUID customerId, UUID id) {
        Reservation reservation = loadForUpdate(id);
        // Không phải của mình thì coi như không tồn tại để không lộ đặt bàn của người khác
        if (!customerId.equals(reservation.getCustomerId())) {
            throw notFound();
        }
        reservationValidator.validateStatus(reservation, CANCELLABLE);
        reservationValidator.validateCustomerCanCancel(reservation);
        cancel(reservation, CUSTOMER_CANCEL_REASON);
        return toResponse(reservation);
    }

    // ---- kiểm tra còn bàn ----

    private boolean hasFreeTable(Instant from, List<TableBriefResponse> candidates) {
        if (candidates.isEmpty()) {
            return false;
        }
        Set<UUID> busy = reservationRepository.findBusyTableIds(from, from.plus(properties.reservationDuration()));
        return candidates.stream().anyMatch(table -> !busy.contains(table.id()));
    }

    // Các khung giờ lệch 30 phút xen kẽ sau/trước giờ yêu cầu, cùng ngày, hợp lệ và còn bàn, tối đa theo cấu hình
    private List<Instant> suggestSlots(Instant requested, List<TableBriefResponse> candidates) {
        List<Instant> suggestions = new ArrayList<>();
        int limit = properties.availabilitySuggestions();
        if (candidates.isEmpty() || limit == 0) {
            return suggestions;
        }
        ZoneId zone = clock.getZone();
        LocalDate day = requested.atZone(zone).toLocalDate();
        for (int step = 1; step <= MAX_SUGGESTION_STEPS && suggestions.size() < limit; step++) {
            for (int direction : new int[]{1, -1}) {
                Instant slot = requested.plus(SUGGESTION_STEP.multipliedBy((long) step * direction));
                if (suggestions.size() < limit
                        && slot.atZone(zone).toLocalDate().equals(day)
                        && reservationValidator.isBookableTime(slot)
                        && hasFreeTable(slot, candidates)) {
                    suggestions.add(slot);
                }
            }
        }
        return suggestions;
    }

    private boolean isBusy(UUID tableId, Reservation reservation) {
        return reservationRepository.findBusyTableIds(reservation.getReservedAt(), reservation.getReservedEnd()).contains(tableId);
    }

    // ---- nhận bàn ----

    // Bàn thay thế phải đang trống hoàn toàn: bàn đang giữ cho đặt bàn khác hoặc đang phục vụ thì chưa nhận khách được
    private void validateReplacementTable(Reservation reservation, UUID tableId) {
        TableBriefResponse table = findTable(tableId);
        reservationValidator.validateTableForReservation(reservation, table);
        if (table.status() != TableStatus.AVAILABLE) {
            throw new BusinessException(ErrorCode.RESERVATION_TABLE_NOT_READY);
        }
        if (isBusy(tableId, reservation)) {
            throw new BusinessException(ErrorCode.RESERVATION_TABLE_CONFLICT);
        }
    }

    private UUID openOrderForCheckIn(Reservation reservation, UUID tableId, UUID waiterId, boolean tableHeldForThisReservation) {
        try {
            return orderService.openOrder(new OpenOrderCommand(tableId, reservation.getId(), reservation.getCustomerId(),
                    waiterId, tableHeldForThisReservation));
        } catch (BusinessException e) {
            // Bàn chưa dọn xong hoặc đang bận: báo theo ngôn ngữ của đặt bàn để nhân viên chọn bàn khác
            if (ErrorCode.ORDER_TABLE_NOT_OPENABLE.getCode().equals(e.getCode())) {
                throw new BusinessException(ErrorCode.RESERVATION_TABLE_NOT_READY);
            }
            throw e;
        }
    }

    // ---- hủy ----

    private void cancel(Reservation reservation, String reason) {
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason(reason);
        reservationRepository.saveAndFlush(reservation);
        if (reservation.getTableId() != null) {
            // Chỉ trả bàn nếu đang được giữ (RESERVED); bàn đang phục vụ khách khác không bị đụng tới
            tableService.transitionStatus(reservation.getTableId(), Set.of(TableStatus.RESERVED), TableStatus.AVAILABLE);
        }
    }

    // ---- hỗ trợ ----

    private Reservation loadForUpdate(UUID id) {
        return reservationRepository.findByIdForUpdate(id).orElseThrow(ReservationServiceImpl::notFound);
    }

    private static BusinessException notFound() {
        return new BusinessException(ErrorCode.NOT_FOUND, "Không tìm thấy đặt bàn.");
    }

    private TableBriefResponse findTable(UUID tableId) {
        return tableService.getTableBriefs(List.of(tableId)).stream().findFirst().orElse(null);
    }

    // Ràng buộc loại trừ của CSDL là hàng rào cuối nếu hai nhân viên cùng gán một bàn trùng giờ
    private void saveAndFlushNoOverlap(Reservation reservation) {
        try {
            reservationRepository.saveAndFlush(reservation);
        } catch (DataIntegrityViolationException e) {
            if (String.valueOf(e.getMostSpecificCause().getMessage()).contains(EXCLUSION_CONSTRAINT)) {
                throw new BusinessException(ErrorCode.RESERVATION_TABLE_CONFLICT);
            }
            throw e;
        }
    }

    private ReservationResponse toResponse(Reservation reservation) {
        TableBriefResponse table = reservation.getTableId() == null ? null : findTable(reservation.getTableId());
        return reservationMapper.toResponse(reservation, table);
    }

    // Tên bàn của cả trang lấy một lần theo lô
    private Page<ReservationSummaryResponse> toSummaries(Page<Reservation> page) {
        Set<UUID> tableIds = page.getContent().stream().map(Reservation::getTableId)
                .filter(java.util.Objects::nonNull).collect(Collectors.toSet());
        Map<UUID, String> tableNames = tableIds.isEmpty() ? Map.of()
                : tableService.getTableBriefs(tableIds).stream().collect(Collectors.toMap(TableBriefResponse::id, TableBriefResponse::name));
        return page.map(reservation -> reservationMapper.toSummaryResponse(reservation,
                reservation.getTableId() == null ? null : tableNames.get(reservation.getTableId())));
    }
}
