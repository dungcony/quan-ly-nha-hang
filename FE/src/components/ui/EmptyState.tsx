import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  error?: boolean;
}

// thông báo khi danh sách rỗng hoặc tải lỗi
export default function EmptyState({ message, error = false }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-slate-500">
      {error && <AlertCircle className="size-6 text-red-500" />}
      <p className={error ? 'text-red-600' : undefined}>{message}</p>
    </div>
  );
}
