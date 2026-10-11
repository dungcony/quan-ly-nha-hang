package com.restaurant.modules.reservation.service.impl;

import com.restaurant.common.code.DailyCodeGenerator;
import com.restaurant.common.config.RestaurantProperties;
import com.restaurant.common.exception.BusinessException;
import com.restaurant.common.response.PageRequestParams;
import com.restaurant.modules.order.dto.request.OpenOrderCommand;
import com.restaurant.modules.order.service.OrderService;
import com.restaurant.modules.reservation.dto.request.AvailabilityRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCancelRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCheckInRequest;
import com.restaurant.modules.reservation.dto.request.ReservationConfirmRequest;
import com.restaurant.modules.reservation.dto.request.ReservationCreateRequest;
import com.restaurant.modules.reservation.dto.response.AvailabilityResponse;
import com.restaurant.modules.reservation.dto.response.ReservationCheckInResponse;
import com.restaurant.modules.reservation.dto.response.ReservationResponse;
import com.restaurant.modules.reservation.entity.Reservation;
import com.restaurant.modules.reservation.enums.ReservationStatus;
import com.restaurant.modules.reservation.events.ReservationCancelledEvent;
import com.restaurant.modules.reservation.events.ReservationConfirmedEvent;
import com.restaurant.modules.reservation.events.ReservationCreatedEvent;
import com.restaurant.modules.reservation.mapper.ReservationMapperImpl;
import com.restaurant.modules.reservation.repository.ReservationRepository;
import com.restaurant.modules.reservation.validator.ReservationValidator;
import com.restaurant.modules.table.dto.response.TableBriefResponse;
import com.restaurant.modules.table.enums.TableStatus;
import com.restaurant.modules.table.enums.TableZone;
import com.restaurant.modules.table.service.TableService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationServiceImplTest {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    // 09/10/2026 09:00 giờ Việt Nam
    private static final Instant NOW = Instant.parse("2026-10-09T02:00:00Z");
    private static final Instant EVENING = at("2026-10-12T19:00:00");

    @Mock
    private ReservationRepository reservationRepository;
    @Mock
    private TableService tableService;
    @Mock
    private OrderService orderService;
    @Mock
    private DailyCodeGenerator dailyCodeGenerator;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ReservationServiceImpl service;
    private TableBriefResponse table6;
    private TableBriefResponse table4;

    private static Instant at(String vietnamLocal) {
        return LocalDateTime.parse(vietnamLocal).atZone(VN).toInstant();
    }

    @BeforeEach
    void setUp() {
        RestaurantProperties properties = new RestaurantProperties(LocalTime.of(10, 0), LocalTime.of(22, 0),
                Duration.ofMinutes(120), Duration.ofMinutes(60), Duration.ofMinutes(15), Duration.ofHours(2), 30, 2, 4,
                new BigDecimal("0.08"), 366);
        Clock clock = Clock.fixed(NOW, VN);
        service = new ReservationServiceImpl(reservationRepository, new ReservationValidator(properties, clock),
                new ReservationMapperImpl(), tableService, orderService, dailyCodeGenerator, properties, clock, eventPublisher);
        table6 = new TableBriefResponse(UUID.randomUUID(), "B02", TableZone.INDOOR, 6, TableStatus.AVAILABLE);
        table4 = new TableBriefResponse(UUID.randomUUID(), "B01", TableZone.OUTDOOR, 4, TableStatus.AVAILABLE);
    }

    private ReservationCreateRequest createRequest(Instant reservedAt, int guests) {
        return new ReservationCreateRequest("Nguyễn Văn An", "0989123456", "an@gmail.com", reservedAt, guests,
                TableZone.INDOOR, "Sinh nhật");
    }

    private Reservation reservation(ReservationStatus status, Instant reservedAt, UUID tableId) {
        Reservation r = new Reservation();
        r.setId(UUID.randomUUID());
        r.setCode("DB20261009-001");
        r.setGuestName("Nguyễn Văn An");
        r.setPhone("0989123456");
        r.setEmail("an@gmail.com");
        r.setReservedAt(reservedAt);
        r.setReservedEnd(reservedAt.plus(Duration.ofMinutes(120)));
        r.setGuestCount(4);
        r.setPreferredZone(TableZone.INDOOR);
        r.setStatus(status);
        r.setTableId(tableId);
        return r;
    }

    private void stubForUpdate(Reservation r) {
        when(reservationRepository.findByIdForUpdate(r.getId())).thenReturn(Optional.of(r));
    }

    // ---- kiểm tra còn bàn và gợi ý khung giờ (UC013) ----

    @Test
    void checkAvailability_true_when_a_table_is_free_in_the_window() {
        when(tableService.listBookableTables(4)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(EVENING, EVENING.plus(Duration.ofMinutes(120)))).thenReturn(Set.of());

        AvailabilityResponse response = service.checkAvailability(new AvailabilityRequest(EVENING, 4));

        assertThat(response.available()).isTrue();
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void checkAvailability_false_with_the_nearest_free_slots_alternating_after_and_before() {
        when(tableService.listBookableTables(4)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(any(Instant.class), any(Instant.class))).thenAnswer(inv ->
                inv.getArgument(0).equals(EVENING) ? Set.of(table4.id()) : Set.of());

        AvailabilityResponse response = service.checkAvailability(new AvailabilityRequest(EVENING, 4));

        assertThat(response.available()).isFalse();
        assertThat(response.suggestions()).containsExactly(
                at("2026-10-12T19:30:00"), at("2026-10-12T18:30:00"), at("2026-10-12T20:00:00"), at("2026-10-12T18:00:00"));
    }

    @Test
    void checkAvailability_suggestions_stay_inside_opening_hours_of_the_same_day() {
        Instant lateSlot = at("2026-10-12T21:30:00");
        when(tableService.listBookableTables(4)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(any(Instant.class), any(Instant.class))).thenAnswer(inv ->
                inv.getArgument(0).equals(lateSlot) ? Set.of(table4.id()) : Set.of());

        AvailabilityResponse response = service.checkAvailability(new AvailabilityRequest(lateSlot, 4));

        assertThat(response.suggestions()).doesNotContain(at("2026-10-12T22:00:00"), at("2026-10-12T22:30:00"));
        assertThat(response.suggestions()).contains(at("2026-10-12T21:00:00"));
    }

    @Test
    void checkAvailability_rejects_an_invalid_time() {
        assertThatThrownBy(() -> service.checkAvailability(new AvailabilityRequest(at("2026-10-12T23:00:00"), 4)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TIME_INVALID");
    }

    // ---- đặt bàn trực tuyến (UC013) ----

    @Test
    void createReservation_saves_a_pending_reservation_with_code_and_window() {
        UUID customerId = UUID.randomUUID();
        when(tableService.listBookableTables(4)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(any(Instant.class), any(Instant.class))).thenReturn(Set.of());
        when(dailyCodeGenerator.next("DB", java.time.LocalDate.of(2026, 10, 9))).thenReturn("DB20261009-001");
        when(reservationRepository.saveAndFlush(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        ReservationResponse response = service.createReservation(customerId, createRequest(EVENING, 4));

        ArgumentCaptor<Reservation> captor = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationRepository).saveAndFlush(captor.capture());
        Reservation saved = captor.getValue();
        assertThat(saved.getCode()).isEqualTo("DB20261009-001");
        assertThat(saved.getStatus()).isEqualTo(ReservationStatus.PENDING);
        assertThat(saved.getCustomerId()).isEqualTo(customerId);
        assertThat(saved.getTableId()).isNull();
        assertThat(saved.getReservedAt()).isEqualTo(EVENING);
        assertThat(saved.getReservedEnd()).isEqualTo(EVENING.plus(Duration.ofMinutes(120)));
        assertThat(response.code()).isEqualTo("DB20261009-001");
        assertThat(response.table()).isNull();

        ArgumentCaptor<ReservationCreatedEvent> event = ArgumentCaptor.forClass(ReservationCreatedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().email()).isEqualTo("an@gmail.com");
        assertThat(event.getValue().code()).isEqualTo("DB20261009-001");
    }

    @Test
    void createReservation_for_a_guest_has_no_customer() {
        when(tableService.listBookableTables(2)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(any(Instant.class), any(Instant.class))).thenReturn(Set.of());
        when(dailyCodeGenerator.next(any(), any())).thenReturn("DB20261009-002");
        when(reservationRepository.saveAndFlush(any(Reservation.class))).thenAnswer(inv -> inv.getArgument(0));

        service.createReservation(null, createRequest(EVENING, 2));

        ArgumentCaptor<Reservation> captor = ArgumentCaptor.forClass(Reservation.class);
        verify(reservationRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getCustomerId()).isNull();
    }

    @Test
    void createReservation_rejects_an_invalid_time_without_saving() {
        assertThatThrownBy(() -> service.createReservation(null, createRequest(at("2026-10-09T10:30:00"), 4)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TIME_INVALID");
        verify(reservationRepository, never()).saveAndFlush(any());
    }

    @Test
    void createReservation_without_a_free_table_fails_with_suggestions_in_detail() {
        when(tableService.listBookableTables(4)).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(any(Instant.class), any(Instant.class))).thenAnswer(inv ->
                inv.getArgument(0).equals(EVENING) ? Set.of(table4.id()) : Set.of());

        assertThatThrownBy(() -> service.createReservation(null, createRequest(EVENING, 4)))
                .isInstanceOfSatisfying(BusinessException.class, e -> {
                    assertThat(e.getCode()).isEqualTo("RESERVATION_NO_TABLE_AVAILABLE");
                    assertThat(e.getDetail()).isEqualTo(Map.of("suggestions", List.of(
                            at("2026-10-12T19:30:00"), at("2026-10-12T18:30:00"), at("2026-10-12T20:00:00"), at("2026-10-12T18:00:00"))));
                });
        verify(reservationRepository, never()).saveAndFlush(any());
    }

    @Test
    void createReservation_for_more_guests_than_any_table_is_rejected() {
        when(tableService.listBookableTables(50)).thenReturn(List.of());

        assertThatThrownBy(() -> service.createReservation(null, createRequest(EVENING, 50)))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_NO_TABLE_AVAILABLE");
    }

    // ---- xem và gợi ý bàn (UC014) ----

    @SuppressWarnings("unchecked")
    @Test
    void searchReservations_returns_summaries_with_table_names() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        when(reservationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(r)));
        when(tableService.getTableBriefs(Set.of(table6.id()))).thenReturn(List.of(table6));

        var page = service.searchReservations(new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(null, null, null, null),
                PageRequestParams.of(null, null, null, "asc"));

        assertThat(page.getContent()).singleElement().satisfies(s -> {
            assertThat(s.code()).isEqualTo("DB20261009-001");
            assertThat(s.tableName()).isEqualTo("B02");
        });
    }

    @Test
    void getReservation_includes_the_assigned_table() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        when(reservationRepository.findById(r.getId())).thenReturn(Optional.of(r));
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));

        assertThat(service.getReservation(r.getId()).table().name()).isEqualTo("B02");
    }

    @Test
    void getReservation_unknown_id_is_not_found() {
        UUID id = UUID.randomUUID();
        when(reservationRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReservation(id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void findAvailableTables_lists_free_tables_with_the_preferred_zone_first() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        TableBriefResponse outdoorSmall = new TableBriefResponse(UUID.randomUUID(), "O1", TableZone.OUTDOOR, 4, TableStatus.AVAILABLE);
        TableBriefResponse busy = new TableBriefResponse(UUID.randomUUID(), "B03", TableZone.INDOOR, 4, TableStatus.AVAILABLE);
        when(reservationRepository.findById(r.getId())).thenReturn(Optional.of(r));
        when(tableService.listBookableTables(4)).thenReturn(List.of(outdoorSmall, busy, table6));
        when(reservationRepository.findBusyTableIds(EVENING, EVENING.plus(Duration.ofMinutes(120)))).thenReturn(Set.of(busy.id()));

        List<TableBriefResponse> tables = service.findAvailableTables(r.getId());

        assertThat(tables).extracting(TableBriefResponse::name).containsExactly("B02", "O1");
    }

    @Test
    void findAvailableTables_for_a_confirmed_reservation_lists_only_tables_ready_to_seat_now() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        TableBriefResponse ready = new TableBriefResponse(UUID.randomUUID(), "O1", TableZone.OUTDOOR, 4, TableStatus.AVAILABLE);
        TableBriefResponse heldForOthers = new TableBriefResponse(UUID.randomUUID(), "O2", TableZone.OUTDOOR, 4, TableStatus.RESERVED);
        TableBriefResponse occupied = new TableBriefResponse(UUID.randomUUID(), "O3", TableZone.OUTDOOR, 4, TableStatus.OCCUPIED);
        when(reservationRepository.findById(r.getId())).thenReturn(Optional.of(r));
        when(tableService.listBookableTables(4)).thenReturn(List.of(ready, heldForOthers, occupied, table6));
        when(reservationRepository.findBusyTableIds(EVENING, EVENING.plus(Duration.ofMinutes(120)))).thenReturn(Set.of(table6.id()));

        List<TableBriefResponse> tables = service.findAvailableTables(r.getId());

        assertThat(tables).extracting(TableBriefResponse::name).containsExactly("O1");
    }

    @Test
    void findAvailableTables_rejects_a_reservation_that_is_already_checked_in_or_closed() {
        Reservation r = reservation(ReservationStatus.CHECKED_IN, EVENING, table6.id());
        when(reservationRepository.findById(r.getId())).thenReturn(Optional.of(r));

        assertThatThrownBy(() -> service.findAvailableTables(r.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_STATUS_INVALID");
    }

    @Test
    void searchReservations_defaults_to_today_only_when_no_criteria_is_given() {
        var none = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(null, null, null, null);
        var blank = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(" ", " ", null, null);

        assertThat(ReservationServiceImpl.defaultsToToday(none)).isTrue();
        assertThat(ReservationServiceImpl.defaultsToToday(blank)).isTrue();
    }

    @Test
    void searchReservations_with_only_a_status_looks_across_all_dates() {
        var byStatus = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(null, null, null, ReservationStatus.PENDING);
        var byDate = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(null, null, java.time.LocalDate.of(2026, 10, 10), null);
        var byCode = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest(null, "DB20261009-001", null, null);
        var byKeyword = new com.restaurant.modules.reservation.dto.request.ReservationSearchRequest("an", null, null, null);

        assertThat(ReservationServiceImpl.defaultsToToday(byStatus)).isFalse();
        assertThat(ReservationServiceImpl.defaultsToToday(byDate)).isFalse();
        assertThat(ReservationServiceImpl.defaultsToToday(byCode)).isFalse();
        assertThat(ReservationServiceImpl.defaultsToToday(byKeyword)).isFalse();
    }

    // ---- xác nhận (UC014) ----

    @Test
    void confirm_assigns_the_table_and_notifies_without_holding_a_far_away_table() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        UUID staff = UUID.randomUUID();
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of());
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);

        ReservationResponse response = service.confirm(r.getId(), staff, new ReservationConfirmRequest(table6.id()));

        assertThat(r.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(r.getTableId()).isEqualTo(table6.id());
        assertThat(r.getConfirmedBy()).isEqualTo(staff);
        assertThat(response.status()).isEqualTo(ReservationStatus.CONFIRMED);
        verify(tableService, never()).transitionStatus(any(), any(), any());
        ArgumentCaptor<ReservationConfirmedEvent> event = ArgumentCaptor.forClass(ReservationConfirmedEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().tableName()).isEqualTo("B02");
    }

    @Test
    void confirm_holds_the_table_right_away_when_the_booking_is_within_the_hold_window() {
        Instant soon = NOW.plus(Duration.ofMinutes(40));
        Reservation r = reservation(ReservationStatus.PENDING, soon, null);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of());
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);

        service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(table6.id()));

        verify(tableService).transitionStatus(table6.id(), Set.of(TableStatus.AVAILABLE), TableStatus.RESERVED);
    }

    @Test
    void confirm_rejects_a_reservation_that_is_not_pending() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        stubForUpdate(r);

        assertThatThrownBy(() -> service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(table4.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_STATUS_INVALID");
    }

    @Test
    void confirm_rejects_a_table_that_is_too_small() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        TableBriefResponse tiny = new TableBriefResponse(UUID.randomUUID(), "O1", TableZone.OUTDOOR, 2, TableStatus.AVAILABLE);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(tiny.id()))).thenReturn(List.of(tiny));

        assertThatThrownBy(() -> service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(tiny.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void confirm_rejects_a_table_already_taken_in_that_window() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of(table6.id()));

        assertThatThrownBy(() -> service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(table6.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TABLE_CONFLICT");
        verify(reservationRepository, never()).saveAndFlush(any());
    }

    @Test
    void confirm_turns_the_exclusion_constraint_violation_into_a_table_conflict() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of());
        when(reservationRepository.saveAndFlush(r)).thenThrow(
                new DataIntegrityViolationException("ERROR: conflicting key value violates exclusion constraint \"ex_reservations_table_no_overlap\""));

        assertThatThrownBy(() -> service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(table6.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TABLE_CONFLICT");
        verify(eventPublisher, never()).publishEvent(any(ReservationConfirmedEvent.class));
    }

    @Test
    void confirm_rethrows_other_integrity_violations() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of());
        DataIntegrityViolationException other = new DataIntegrityViolationException("uq_reservations_code");
        when(reservationRepository.saveAndFlush(r)).thenThrow(other);

        assertThatThrownBy(() -> service.confirm(r.getId(), UUID.randomUUID(), new ReservationConfirmRequest(table6.id())))
                .isSameAs(other);
    }

    // ---- từ chối / hủy (UC014) ----

    @Test
    void rejectOrCancel_pending_reservation_records_reason_and_notifies() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        stubForUpdate(r);
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);

        ReservationResponse response = service.rejectOrCancel(r.getId(), new ReservationCancelRequest("Hết bàn"));

        assertThat(response.status()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(response.cancelReason()).isEqualTo("Hết bàn");
        verify(tableService, never()).transitionStatus(any(), any(), any());
        ArgumentCaptor<ReservationCancelledEvent> event = ArgumentCaptor.forClass(ReservationCancelledEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertThat(event.getValue().reason()).isEqualTo("Hết bàn");
    }

    @Test
    void rejectOrCancel_confirmed_reservation_releases_a_held_table() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        stubForUpdate(r);
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));

        service.rejectOrCancel(r.getId(), new ReservationCancelRequest("Khách báo bận"));

        verify(tableService).transitionStatus(table6.id(), Set.of(TableStatus.RESERVED), TableStatus.AVAILABLE);
    }

    @Test
    void rejectOrCancel_rejects_checked_in_cancelled_and_no_show() {
        for (ReservationStatus status : List.of(ReservationStatus.CHECKED_IN, ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW)) {
            Reservation r = reservation(status, EVENING, table6.id());
            stubForUpdate(r);
            assertThatThrownBy(() -> service.rejectOrCancel(r.getId(), new ReservationCancelRequest("x")))
                    .as(status.name())
                    .isInstanceOf(BusinessException.class)
                    .extracting("code").isEqualTo("RESERVATION_STATUS_INVALID");
        }
    }

    // ---- nhận bàn (UC014) ----

    @Test
    void checkIn_opens_an_order_on_the_assigned_table_which_may_be_reserved() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        r.setCustomerId(UUID.randomUUID());
        UUID waiter = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        stubForUpdate(r);
        when(orderService.openOrder(new OpenOrderCommand(table6.id(), r.getId(), r.getCustomerId(), waiter, true))).thenReturn(orderId);
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));

        ReservationCheckInResponse response = service.checkIn(r.getId(), waiter, null);

        assertThat(r.getStatus()).isEqualTo(ReservationStatus.CHECKED_IN);
        assertThat(response.orderId()).isEqualTo(orderId);
        assertThat(response.reservation().status()).isEqualTo(ReservationStatus.CHECKED_IN);
    }

    @Test
    void checkIn_with_the_same_table_id_behaves_like_no_table_id() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        UUID waiter = UUID.randomUUID();
        stubForUpdate(r);
        when(orderService.openOrder(new OpenOrderCommand(table6.id(), r.getId(), null, waiter, true))).thenReturn(UUID.randomUUID());
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));

        service.checkIn(r.getId(), waiter, new ReservationCheckInRequest(table6.id()));

        verify(reservationRepository, never()).findBusyTableIds(any(), any());
    }

    @Test
    void checkIn_can_switch_to_another_available_table_and_release_the_old_held_table() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        UUID waiter = UUID.randomUUID();
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table4.id()))).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of());
        when(orderService.openOrder(new OpenOrderCommand(table4.id(), r.getId(), null, waiter, false))).thenReturn(UUID.randomUUID());
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);
        when(tableService.getTableBriefs(List.of(table4.id()))).thenReturn(List.of(table4));

        service.checkIn(r.getId(), waiter, new ReservationCheckInRequest(table4.id()));

        assertThat(r.getTableId()).isEqualTo(table4.id());
        verify(tableService).transitionStatus(table6.id(), Set.of(TableStatus.RESERVED), TableStatus.AVAILABLE);
    }

    @Test
    void checkIn_rejects_a_replacement_table_that_is_held_for_someone_else() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        TableBriefResponse held = new TableBriefResponse(UUID.randomUUID(), "B03", TableZone.INDOOR, 4, TableStatus.RESERVED);
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(held.id()))).thenReturn(List.of(held));

        assertThatThrownBy(() -> service.checkIn(r.getId(), UUID.randomUUID(), new ReservationCheckInRequest(held.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TABLE_NOT_READY");
        verify(orderService, never()).openOrder(any());
    }

    @Test
    void checkIn_rejects_a_replacement_table_with_an_overlapping_reservation() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        stubForUpdate(r);
        when(tableService.getTableBriefs(List.of(table4.id()))).thenReturn(List.of(table4));
        when(reservationRepository.findBusyTableIds(r.getReservedAt(), r.getReservedEnd())).thenReturn(Set.of(table4.id()));

        assertThatThrownBy(() -> service.checkIn(r.getId(), UUID.randomUUID(), new ReservationCheckInRequest(table4.id())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TABLE_CONFLICT");
    }

    @Test
    void checkIn_reports_table_not_ready_when_the_order_cannot_be_opened() {
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        stubForUpdate(r);
        when(orderService.openOrder(any(OpenOrderCommand.class))).thenThrow(
                new BusinessException(com.restaurant.common.exception.ErrorCode.ORDER_TABLE_NOT_OPENABLE));

        assertThatThrownBy(() -> service.checkIn(r.getId(), UUID.randomUUID(), null))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_TABLE_NOT_READY");
        assertThat(r.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
    }

    @Test
    void checkIn_requires_a_confirmed_reservation() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        stubForUpdate(r);

        assertThatThrownBy(() -> service.checkIn(r.getId(), UUID.randomUUID(), null))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_STATUS_INVALID");
    }

    // ---- lịch sử và hủy của khách hàng (UC017) ----

    @SuppressWarnings("unchecked")
    @Test
    void listMine_returns_only_the_customers_reservations() {
        UUID customer = UUID.randomUUID();
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        when(reservationRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(r)));

        assertThat(service.listMine(customer, PageRequestParams.of(null, null, null, null)).getContent()).hasSize(1);
    }

    @Test
    void getMine_of_someone_elses_reservation_is_not_found() {
        UUID customer = UUID.randomUUID();
        UUID id = UUID.randomUUID();
        when(reservationRepository.findByIdAndCustomerId(id, customer)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMine(customer, id))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void cancelMine_cancels_and_releases_the_held_table_without_emailing() {
        UUID customer = UUID.randomUUID();
        Reservation r = reservation(ReservationStatus.CONFIRMED, EVENING, table6.id());
        r.setCustomerId(customer);
        stubForUpdate(r);
        when(reservationRepository.saveAndFlush(r)).thenReturn(r);
        when(tableService.getTableBriefs(List.of(table6.id()))).thenReturn(List.of(table6));

        ReservationResponse response = service.cancelMine(customer, r.getId());

        assertThat(response.status()).isEqualTo(ReservationStatus.CANCELLED);
        assertThat(r.getCancelReason()).isEqualTo("Khách hàng hủy");
        verify(tableService).transitionStatus(table6.id(), Set.of(TableStatus.RESERVED), TableStatus.AVAILABLE);
    }

    @Test
    void cancelMine_rejects_when_less_than_two_hours_remain() {
        UUID customer = UUID.randomUUID();
        Reservation r = reservation(ReservationStatus.CONFIRMED, NOW.plus(Duration.ofMinutes(90)), table6.id());
        r.setCustomerId(customer);
        stubForUpdate(r);

        assertThatThrownBy(() -> service.cancelMine(customer, r.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_CANCEL_TOO_LATE");
    }

    @Test
    void cancelMine_of_someone_elses_reservation_is_not_found() {
        Reservation r = reservation(ReservationStatus.PENDING, EVENING, null);
        r.setCustomerId(UUID.randomUUID());
        stubForUpdate(r);

        assertThatThrownBy(() -> service.cancelMine(UUID.randomUUID(), r.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("NOT_FOUND");
    }

    @Test
    void cancelMine_rejects_an_already_cancelled_reservation() {
        UUID customer = UUID.randomUUID();
        Reservation r = reservation(ReservationStatus.CANCELLED, EVENING, null);
        r.setCustomerId(customer);
        stubForUpdate(r);

        assertThatThrownBy(() -> service.cancelMine(customer, r.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("RESERVATION_STATUS_INVALID");
    }
}
