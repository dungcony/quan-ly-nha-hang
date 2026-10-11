import { useState, type FormEvent } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { getFormErrorMessage } from '@/utils/apiError';

interface ResendVerificationFormProps {
  initialEmail?: string;
}

// form gửi lại liên kết xác thực email khi liên kết cũ hết hạn hoặc không nhận được thư
export default function ResendVerificationForm({ initialEmail = '' }: ResendVerificationFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSending(true);
    try {
      await authApi.resendVerification(email.trim());
      setSent(true);
    } catch (err: unknown) {
      setError(getFormErrorMessage(err, 'Không gửi lại được liên kết. Vui lòng thử lại sau.'));
    } finally {
      setIsSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>Đã gửi liên kết xác thực mới tới {email}. Liên kết cũ không còn hiệu lực.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-left">
      <p className="text-sm text-slate-600">Chưa nhận được thư hoặc liên kết đã hết hạn? Nhập email để nhận liên kết mới.</p>
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email đã đăng ký"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isSending}
        className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
      >
        {isSending ? 'Đang gửi...' : 'Gửi lại liên kết xác thực'}
      </button>
    </form>
  );
}
