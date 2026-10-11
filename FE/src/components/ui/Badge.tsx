import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export type BadgeTone = 'green' | 'amber' | 'blue' | 'red' | 'slate' | 'orange';

const TONE_CLASS: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
};

// nhãn trạng thái nhỏ có màu
export default function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TONE_CLASS[tone])}>
      {children}
    </span>
  );
}
