import Modal from '@/components/ui/Modal';
import { btnDanger, btnPrimary, btnSecondary } from '@/components/ui/forms';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// hộp xác nhận trước thao tác không hoàn tác được như xóa
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={loading}>
            Hủy
          </button>
          <button type="button" className={danger ? btnDanger : btnPrimary} onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
