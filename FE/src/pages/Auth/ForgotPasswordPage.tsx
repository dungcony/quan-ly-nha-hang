import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/authApi';
import { getFormErrorMessage } from '@/utils/apiError';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // xử lý gửi yêu cầu đặt lại mật khẩu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await authApi.forgotPassword({ email });
      setIsSuccess(true);
    } catch (err: unknown) {
      // lỗi theo trường (vd email sai định dạng) được ưu tiên hơn thông báo chung
      setErrorMessage(getFormErrorMessage(err, 'Không thể gửi yêu cầu. Vui lòng kiểm tra lại địa chỉ email.'));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="size-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Đã gửi liên kết!</h2>
          <p className="text-sm text-slate-600 mt-2 text-pretty">
            Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới <strong className="text-slate-800">{email}</strong>. Vui lòng kiểm tra hòm thư của bạn.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition"
            >
              Quay lại Đăng nhập
            </Link>
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
          <h2 className="text-2xl font-bold text-slate-900 text-balance">Quên mật khẩu?</h2>
          <p className="text-sm text-slate-500 mt-1 text-pretty">
            Nhập email đã đăng ký tài khoản để nhận liên kết đặt lại mật khẩu.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span className="text-pretty">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Địa chỉ email
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span>Đang gửi...</span>
            ) : (
              <span>Gửi liên kết khôi phục</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

