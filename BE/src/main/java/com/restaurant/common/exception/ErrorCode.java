package com.restaurant.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Toàn bộ mã lỗi nghiệp vụ của backend, mỗi mã gắn sẵn HTTP status và câu thông báo mặc định.
 *
 * <p>
 * <b>Vì sao là enum chứ không phải hằng số String.</b> Tham số của {@link BusinessException} nhận kiểu {@code ErrorCode}
 * nên gõ tay một chuỗi mã là lỗi biên dịch; với {@code String}, gõ sai mã vẫn build và test xanh, chỉ lộ khi client rơi vào
 * nhánh xử lý mặc định.
 *
 * <p>
 * <b>Tên hằng số CHÍNH LÀ mã lỗi đi ra JSON</b> — {@link #getCode()} trả {@code name()}. Đổi tên một hằng số là đổi hợp đồng
 * API với frontend: phải sửa {@code docs/design} và frontend trong cùng lần thay đổi.
 *
 * <p>
 * <b>Câu thông báo ở đây chỉ là mặc định.</b> Chỗ cần câu cụ thể hơn theo ngữ cảnh, nhất là {@link #NOT_FOUND}, dùng
 * {@link BusinessException#BusinessException(ErrorCode, String)} để ghi đè.
 *
 * <p>
 * Bảng mã lỗi đầy đủ theo module: {@code docs/design/README.md} mục 2.7.
 */
@Getter
public enum ErrorCode {

    // ---------------------------------------------------------------------
    // Dùng chung
    // ---------------------------------------------------------------------

    /**
     * Dữ liệu gửi lên sai định dạng hoặc thiếu. {@code GlobalExceptionHandler} cũng phát mã này khi bean validation trượt, kèm danh sách lỗi theo từng trường.
     */
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "Dữ liệu gửi lên không hợp lệ."),
    CONCURRENT_MODIFICATION(HttpStatus.CONFLICT, "Dữ liệu vừa được người khác thay đổi, vui lòng tải lại và thử lại."),
    // Thiếu thẻ truy cập. Do {@code GlobalExceptionHandler} phát, không ném từ service.
    UNAUTHENTICATED(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập để tiếp tục."),

    // Thẻ truy cập đã hết hạn. Do {@code GlobalExceptionHandler} phát.
    TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "Phiên đăng nhập đã hết hạn."),

    // Thẻ sai hoặc đã bị thu hồi. Do {@code GlobalExceptionHandler} phát.
    TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "Thẻ truy cập không hợp lệ."),

    // Không được phép truy cập tài nguyên này. Do {@code GlobalExceptionHandler} phát.
    FORBIDDEN(HttpStatus.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này."),

    /**
     * Không tìm thấy bản ghi.
     *
     * <p>
     * <b>Cố ý dùng chung một mã cho mọi loại tài nguyên.</b> Khi người dùng không phải chủ sở hữu (khách hàng xem đặt bàn,
     * hóa đơn của người khác), trả 404 chứ không 403 để không lộ việc bản ghi có tồn tại hay không (rule 2.9). Tách thành
     * mã riêng cho từng loại sẽ để chính mã lỗi tiết lộ loại tài nguyên vừa dò trúng. Câu thông báo được ghi đè theo ngữ cảnh.
     */
    NOT_FOUND(HttpStatus.NOT_FOUND, "Không tìm thấy bản ghi."),

    // Vi phạm ràng buộc duy nhất.
    DUPLICATE(HttpStatus.CONFLICT, "Bản ghi đã tồn tại."),

    // Phương thức HTTP không được hỗ trợ ở điểm cuối này. Do {@code GlobalExceptionHandler} phát.
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "Phương thức không được hỗ trợ."),

    // Lỗi ngoài dự kiến. Không bao giờ đưa message gốc ra response.
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "Đã có lỗi xảy ra, vui lòng thử lại."),

    // Ảnh tải lên không phải png, gif, jpg, jpeg.
    FILE_TYPE_NOT_SUPPORTED(HttpStatus.BAD_REQUEST, "Chỉ chấp nhận ảnh png, gif, jpg hoặc jpeg."),

    // Ảnh tải lên vượt giới hạn dung lượng của multipart (spring.servlet.multipart.max-file-size).
    FILE_TOO_LARGE(HttpStatus.BAD_REQUEST, "Ảnh vượt quá dung lượng tối đa 5MB."),

    // ---------------------------------------------------------------------
    // Xác thực & tài khoản
    // ---------------------------------------------------------------------

    // Mật khẩu xác nhận không trùng mật khẩu mới.
    AUTH_PASSWORD_CONFIRM_MISMATCH(HttpStatus.BAD_REQUEST, "Mật khẩu xác nhận không trùng với mật khẩu."),

    // Đăng ký hoặc thêm nhân viên với email đã có người dùng.
    AUTH_EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "Email đã có người dùng."),

    // Sai email hoặc mật khẩu khi đăng nhập. Cố ý không nói sai cái nào.
    AUTH_CREDENTIALS_INVALID(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng."),

    // Khách hàng đăng ký xong nhưng chưa mở liên kết xác thực email.
    AUTH_ACCOUNT_NOT_VERIFIED(HttpStatus.FORBIDDEN, "Tài khoản chưa được xác thực email."),

    // Tài khoản bị Quản lý khóa (status LOCKED); không tự mở.
    AUTH_ACCOUNT_BLOCKED(HttpStatus.FORBIDDEN, "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ."),

    // Mã trong liên kết xác thực email hoặc đặt lại mật khẩu sai, hết hạn hoặc đã dùng. Một mã chung cho cả hai luồng
    // vì client xử lý như nhau và không cần cho người dùng biết sai hay hết hạn.
    AUTH_CODE_INVALID(HttpStatus.BAD_REQUEST, "Mã không hợp lệ, đã hết hạn hoặc đã được sử dụng."),

    // Tài khoản đã được kích hoạt trước đó.
    AUTH_ACCOUNT_ALREADY_VERIFIED(HttpStatus.BAD_REQUEST, "Tài khoản đã được xác thực."),

    // Đổi mật khẩu nhưng gõ sai mật khẩu hiện tại.
    AUTH_OLD_PASSWORD_INCORRECT(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng."),

    // Mật khẩu mới trùng với mật khẩu cũ hiện tại.
    AUTH_PASSWORD_SAME_AS_OLD(HttpStatus.BAD_REQUEST, "Mật khẩu mới không được trùng với mật khẩu cũ."),

    // ---------------------------------------------------------------------
    // Quản lý người dùng
    // ---------------------------------------------------------------------

    // Quản lý tự khóa, xóa hoặc đổi vai trò tài khoản của chính mình.
    USER_CANNOT_MODIFY_SELF(HttpStatus.FORBIDDEN, "Bạn không thể thực hiện thao tác này với chính tài khoản của mình."),

    // Xóa tài khoản đã phát sinh dữ liệu (đơn hàng, hóa đơn, đặt bàn còn hiệu lực); khi đó chỉ khóa được.
    USER_HAS_ACTIVITY(HttpStatus.CONFLICT, "Tài khoản đã phát sinh dữ liệu nên không thể xóa, chỉ có thể khóa."),

    // ---------------------------------------------------------------------
    // Thực đơn
    // ---------------------------------------------------------------------

    // Tên món đã có trong cùng danh mục.
    DISH_NAME_EXISTS(HttpStatus.CONFLICT, "Tên món đã tồn tại trong danh mục này."),

    // Xóa món đã xuất hiện trong đơn hàng; khi đó chỉ chuyển sang ngừng bán được.
    DISH_IN_USE(HttpStatus.CONFLICT, "Món đã được gọi nên không thể xóa, chỉ có thể chuyển sang ngừng bán."),

    // Tên danh mục món đã tồn tại.
    CATEGORY_NAME_EXISTS(HttpStatus.CONFLICT, "Tên danh mục đã tồn tại."),

    // Xóa danh mục còn món; phải chuyển hoặc xóa hết món trước.
    CATEGORY_IN_USE(HttpStatus.CONFLICT, "Danh mục còn món nên không thể xóa."),

    // ---------------------------------------------------------------------
    // Bàn
    // ---------------------------------------------------------------------

    // Tên/số bàn đã tồn tại.
    TABLE_NAME_EXISTS(HttpStatus.CONFLICT, "Tên hoặc số bàn đã tồn tại."),

    // Xóa hoặc tạm khóa bàn đang phục vụ, còn đặt bàn hoặc đơn chưa hoàn tất.
    TABLE_IN_USE(HttpStatus.CONFLICT, "Bàn đang được sử dụng hoặc còn đặt bàn chưa hoàn tất."),

    // Giảm sức chứa xuống thấp hơn số khách của đặt bàn đang gán cho bàn.
    TABLE_CAPACITY_BELOW_RESERVATION(HttpStatus.CONFLICT, "Sức chứa mới nhỏ hơn số khách của đặt bàn đang gán cho bàn."),

    // Quản lý đổi trạng thái tay khi bàn đang được giữ hoặc đang phục vụ.
    TABLE_STATUS_NOT_EDITABLE(HttpStatus.CONFLICT, "Bàn đang được giữ hoặc đang phục vụ nên không đổi được trạng thái."),

    // ---------------------------------------------------------------------
    // Gọi món và chế biến
    // ---------------------------------------------------------------------

    // Gọi món đang hết hoặc đã ngừng bán; detail.dish_ids liệt kê các món bị từ chối.
    DISH_NOT_ORDERABLE(HttpStatus.BAD_REQUEST, "Có món đang hết hoặc ngừng bán nên không gọi được."),

    // Mở đơn cho bàn không ở trạng thái cho phép (đang phục vụ, đang giữ cho đặt bàn, tạm khóa) hoặc đã có đơn mở.
    ORDER_TABLE_NOT_OPENABLE(HttpStatus.CONFLICT, "Bàn này hiện không mở được đơn mới."),

    // Thao tác lên đơn đã đóng.
    ORDER_NOT_OPEN(HttpStatus.CONFLICT, "Đơn hàng đã đóng."),

    // Hủy đơn đã có dòng món.
    ORDER_HAS_ITEMS(HttpStatus.CONFLICT, "Đơn đã có món nên không thể hủy."),

    // Dòng món đã được người khác xử lý trước (hai bếp cùng nhận, hai phục vụ cùng xác nhận).
    ORDER_ITEM_STATUS_CONFLICT(HttpStatus.CONFLICT, "Món này đã được xử lý trước đó, vui lòng làm mới danh sách."),

    // ---------------------------------------------------------------------
    // Đặt bàn
    // ---------------------------------------------------------------------

    // Giờ hẹn đã qua, ngoài giờ mở cửa, đặt trước dưới 2 giờ hoặc quá 30 ngày.
    RESERVATION_TIME_INVALID(HttpStatus.BAD_REQUEST, "Giờ hẹn không hợp lệ: cần trong giờ mở cửa, đặt trước tối thiểu 2 giờ và tối đa 30 ngày."),

    // Hết bàn phù hợp ở khung giờ đã chọn; detail.suggestions liệt kê các khung giờ gần nhất còn bàn.
    RESERVATION_NO_TABLE_AVAILABLE(HttpStatus.CONFLICT, "Khung giờ này đã hết bàn phù hợp."),

    // Bàn vừa được gán cho một đặt bàn khác trùng khung giờ.
    RESERVATION_TABLE_CONFLICT(HttpStatus.CONFLICT, "Bàn đã được gán cho một đặt bàn khác trong khung giờ này."),

    // Thao tác không hợp lệ với trạng thái hiện tại của đặt bàn.
    RESERVATION_STATUS_INVALID(HttpStatus.CONFLICT, "Đặt bàn đang ở trạng thái không cho phép thao tác này."),

    // Khách hàng hủy khi còn dưới 2 giờ tới giờ hẹn.
    RESERVATION_CANCEL_TOO_LATE(HttpStatus.CONFLICT, "Còn dưới 2 giờ tới giờ hẹn nên không thể tự hủy, vui lòng liên hệ nhà hàng."),

    // Nhận bàn nhưng bàn chưa dọn xong hoặc đang được dùng.
    RESERVATION_TABLE_NOT_READY(HttpStatus.CONFLICT, "Bàn chưa sẵn sàng để nhận khách, vui lòng chọn bàn khác."),

    // ---------------------------------------------------------------------
    // Thanh toán và báo cáo
    // ---------------------------------------------------------------------

    // Thanh toán đơn không có dòng món nào chưa hủy.
    INVOICE_ORDER_EMPTY(HttpStatus.BAD_REQUEST, "Đơn chưa có món nào để thanh toán."),

    // Còn dòng món chưa phục vụ mà Thu ngân chưa xác nhận; detail.unserved_count là số dòng.
    INVOICE_UNSERVED_ITEMS(HttpStatus.CONFLICT, "Còn món chưa được phục vụ, vui lòng xác nhận nếu vẫn muốn thanh toán."),

    // Tiền mặt khách đưa nhỏ hơn tổng tiền.
    INVOICE_AMOUNT_INSUFFICIENT(HttpStatus.BAD_REQUEST, "Số tiền khách đưa nhỏ hơn tổng tiền cần thanh toán."),

    // Khoảng báo cáo ngược hoặc quá dài.
    REPORT_RANGE_INVALID(HttpStatus.BAD_REQUEST, "Khoảng thời gian báo cáo không hợp lệ: ngày kết thúc phải sau ngày bắt đầu và tối đa 366 ngày.");

    private final HttpStatus status;
    private final String defaultMessage;

    ErrorCode(HttpStatus status, String defaultMessage) {
        this.status = status;
        this.defaultMessage = defaultMessage;
    }

    // Mã lỗi đi ra JSON — chính là tên hằng số. Giữ nguyên tên là giữ nguyên hợp đồng với frontend.
    public String getCode() {
        return name();
    }

    // HTTP status dạng số, tiện cho {@code ResponseEntity.status(...)}.
    public int getHttpStatus() {
        return status.value();
    }
}
