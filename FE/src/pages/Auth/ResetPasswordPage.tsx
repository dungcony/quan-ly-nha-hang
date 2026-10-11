import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Lock, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/authApi';
import type { ErrorResponse } from '@/utils/apiTypes';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  // liên kết hết hạn hoặc đã dùng thì gợi ý gửi lại yêu cầu (UC004 luồng ngoại lệ)
  const [isTokenError, setIsTokenError] = useState(false);

  // xử lý gửi yêu cầu đặt lại mật khẩu mới
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsTokenError(false);

    if (!token) {
      setErrorMessage('Không tìm thấy mã token đặt lại mật khẩu trong liên kết.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).+$/;
    if (newPassword.length < 8) {
      setErrorMessage('Mật khẩu mới phải có độ dài tối thiểu 8 ký tự.');
      return;
    }
    if (!passwordPattern.test(newPassword)) {
      setErrorMessage('Mật khẩu phải chứa ít nhất một chữ cái và một chữ số.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({
        token,
        new_password: newPassword,
        confirm_new_password: confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      const errorData = err as ErrorResponse;
      setIsTokenError(errorData?.error?.code === 'AUTH_CODE_INVALID');
      if (errorData?.error?.fields && errorData.error.fields.length > 0) {
        const fieldDetails = errorData.error.fields.map((f) => f.message).join('. ');
        setErrorMessage(fieldDetails);
      } else if (errorData?.error?.message) {
        setErrorMessage(errorData.error.message);
      } else {
        setErrorMessage('Đặt lại mật khẩu thất bại. Mã có thể đã hết hạn hoặc không hợp lệ.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="size-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Liên kết không hợp lệ</h2>
          <p className="text-sm text-slate-600 mt-2 text-pretty">
            Liên kết đặt lại mật khẩu thiếu mã token xác thực. Vui lòng kiểm tra lại email của bạn hoặc gửi lại yêu cầu.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/forgot-password"
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition"
            >
              Yêu cầu cấp lại mật khẩu
            </Link>
            <Link
              to="/login"
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-sm transition"
            >
              Về trang Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Đặt lại mật khẩu thành công!</h2>
          <p className="text-sm text-slate-600 mt-2 text-pretty">
            Mật khẩu tài khoản của bạn đã được cập nhật. Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition"
            >
              Tiến hành Đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
        >
          <ArrowLeft className="size-4" />
          <span>Quay lại đăng nhập</span>
        </Link>

        <div className="text-center mb-6">
          <div className="size-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="size-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Đặt lại mật khẩu mới</h2>
          <p className="text-sm text-slate-500 mt-1 text-pretty">
            Nhập mật khẩu mới gồm ít nhất 8 ký tự, có cả chữ và số.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span className="text-pretty">
              {errorMessage}{' '}
              {isTokenError && (
                <Link to="/forgot-password" className="font-semibold underline">
                  Yêu cầu liên kết mới
                </Link>
              )}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-pwd" className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="size-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="new-pwd"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-pwd" className="block text-sm font-medium text-slate-700 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="size-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="confirm-pwd"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
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
              <span>Đang lưu mật khẩu...</span>
            ) : (
              <span>Cập nhật mật khẩu</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

