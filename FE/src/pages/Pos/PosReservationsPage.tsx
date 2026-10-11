import { useNavigate } from 'react-router-dom';
import ReservationManager from '@/components/features/ReservationManager';

// màn đặt bàn của Phục vụ; nhận bàn xong chuyển thẳng sang gọi món cho bàn đó
export default function PosReservationsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <ReservationManager
        onCheckedIn={(result) => {
          const tableId = result.reservation.table?.id;
          if (tableId) navigate(`/pos/order/${tableId}`);
        }}
      />
    </div>
  );
}
