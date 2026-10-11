import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ErrorResponse } from '@/utils/apiTypes';
import { roleHomePath } from '@/utils/labels';
import ResendVerificationForm from '@/components/features/ResendVerificationForm';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // tài khoản chưa xác thực email thì cho gửi lại liên kết ngay tại đây
  const [needsVerification, setNeedsVerification] = useState(false);

  // xử lý gửi thông tin đăng nhập lên server
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const auth = await login({ email, password });
      // nhân viên mới do Quản lý cấp mật khẩu phải đổi mật khẩu ngay lần đầu (UC008)
      navigate(auth.user.must_change_password ? '/account/profile#doi-mat-khau' : roleHomePath(auth.user.role));
    } catch (err: unknown) {
      const errorData = err as ErrorResponse;
      setNeedsVerification(errorData?.error?.code === 'AUTH_ACCOUNT_NOT_VERIFIED');
      if (errorData?.error?.fields && errorData.error.fields.length > 0) {
        const fieldDetails = errorData.error.fields.map((f) => f.message).join('. ');
        setErrorMessage(fieldDetails);
      } else if (errorData?.error?.message) {
        setErrorMessage(errorData.error.message);
      } else {
        setErrorMessage('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="size-4" />
          <span>Về trang chủ</span>
        </Link>

        <div className="text-center mb-8">
          <div className="size-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <LogIn className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Đăng nhập hệ thống</h2>
          <p className="text-sm text-slate-500 mt-1 text-pretty">
            Nhập email và mật khẩu của bạn để truy cập quyền quản lý hoặc đặt món.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span className="text-pretty">{errorMessage}</span>
          </div>
        )}

        {needsVerification && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ResendVerificationForm initialEmail={email} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="size-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vidu@restaurant.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-amber-600 hover:text-amber-700 transition"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock className="size-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <LogIn className="size-4" />
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-medium text-amber-600 hover:text-amber-700 transition">
            Đăng ký tài khoản khách hàng
          </Link>
        </div>
      </div>
    </div>
  );
}

