import InvoiceHistory from '@/components/features/InvoiceHistory';

// Thu ngân xem và in lại hóa đơn trong ngày; BE tự giới hạn phạm vi
export default function PosInvoicesPage() {
  return (
    <div className="p-6">
      <InvoiceHistory scope="today" />
    </div>
  );
}
