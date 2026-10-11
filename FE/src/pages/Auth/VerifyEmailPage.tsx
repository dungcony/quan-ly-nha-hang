import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { authApi } from '@/api/authApi';
import type { ErrorResponse } from '@/utils/apiTypes';
import ResendVerificationForm from '@/components/features/ResendVerificationForm';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // StrictMode chạy effect hai lần ở môi trường dev; token chỉ dùng được một lần nên lần hai sẽ ghi đè kết quả thành lỗi
  const verifiedToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Liên kết xác thực không chứa mã token hợp lệ.');
      return;
    }

    if (verifiedToken.current === token) return;
    verifiedToken.current = token;

    // gửi token xác thực sang backend
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
      })
      .catch((err: unknown) => {
        const errorData = err as ErrorResponse;
        setStatus('error');
        setErrorMsg(
          errorData?.error?.code === 'AUTH_CODE_INVALID'
            ? 'Liên kết xác thực không hợp lệ, đã hết hạn hoặc đã được sử dụng. Bạn có thể gửi lại liên kết mới bên dưới.'
            : errorData?.error?.message || 'Xác thực email thất bại hoặc liên kết đã hết hạn.'
        );
      });
  }, [token]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        {status === 'loading' && (
          <div>
            <Loader2 className="size-12 animate-spin text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 text-balance">Đang xác thực email...</h2>
            <p className="text-sm text-slate-500 mt-2 text-pretty">Vui lòng chờ trong giây lát.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-balance">Xác thực thành công!</h2>
            <p className="text-sm text-slate-600 mt-2 text-pretty">
              Tài khoản của bạn đã được kích hoạt hoàn tất. Bạn có thể đăng nhập ngay bây giờ.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition gap-2"
            >
              <span>Tiến hành Đăng nhập</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="size-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="size-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-balance">Xác thực không thành công</h2>
            <p className="text-sm text-red-600 mt-2 mb-6 text-pretty">{errorMsg}</p>
            <ResendVerificationForm />
            <Link
              to="/login"
              className="mt-6 inline-flex items-center justify-center w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium text-sm transition"
            >
              Quay về trang Đăng nhập
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

