import { useToast } from '@/components/ui/Toast';
import ReservationManager from '@/components/features/ReservationManager';

// Quản lý xử lý đặt bàn giống Phục vụ; nhận bàn mở đơn nên Quản lý chỉ được nhắc chuyển cho Phục vụ gọi món
export default function AdminReservationsPage() {
  const toast = useToast();

  return (
    <ReservationManager
      onCheckedIn={() => toast.success('Khách đã nhận bàn. Nhân viên phục vụ sẽ gọi món tại màn hình POS.')}
    />
  );
}
