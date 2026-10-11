import type { ReactNode } from 'react';
import { labelClass } from '@/components/ui/forms';

interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

// nhãn kèm ô nhập, dùng trong các form thêm/sửa
export default function FormField({ label, required, hint, children }: FormFieldProps) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
