import InvoiceHistory from '@/components/features/InvoiceHistory';

// Quản lý xem toàn bộ hóa đơn, không bị giới hạn trong ngày như Thu ngân
export default function AdminInvoicesPage() {
  return <InvoiceHistory scope="all" />;
}
