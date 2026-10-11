import { Loader2 } from 'lucide-react';

// vòng xoay chờ tải dữ liệu
export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
      <Loader2 className="size-7 animate-spin text-amber-600" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
