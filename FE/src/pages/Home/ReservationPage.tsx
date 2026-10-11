import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, CheckCircle2, AlertCircle, ChevronRight, Loader2, MapPin } from 'lucide-react';
import { reservationApi, type ReservationResponse } from '@/api/reservationApi';
import { useAuth } from '@/context/AuthContext';
import { getErrorCode, getErrorDetail, getFormErrorMessage } from '@/utils/apiError';
import {
  addDaysIso,
  formatDate,
  formatDateTime,
  fromRestaurantDateTime,
  toRestaurantDateTimeParts,
  todayIso,
} from '@/utils/format';
import { ZONE_LABELS } from '@/utils/labels';
import { BOOKING_RULES } from '@/utils/restaurantInfo';
import type { TableZone } from '@/utils/apiTypes';

type Step = 'TIME' | 'INFO' | 'SUCCESS';

const inputClass = 'block w-full py-3 border border-slate-300 rounded-xl focus:ring-amber-500 focus:border-amber-500';

export default function ReservationPage() {
  const { profile, isAuthenticated } = useAuth();
  const [step, setStep] = useState<Step>('TIME');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // các khung giờ gần nhất còn bàn khi khung giờ đã chọn hết bàn (UC013 luồng 4b)
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guestCount, setGuestCount] = useState<number>(2);
  const [zone, setZone] = useState<TableZone | ''>('');

  const [formData, setFormData] = useState({ guest_name: '', phone: '', email: '', note: '' });
  const [reservationResult, setReservationResult] = useState<ReservationResponse | null>(null);

  // Khách hàng đã đăng nhập được điền sẵn thông tin liên hệ từ tài khoản (UC013 bước 5)
  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      guest_name: prev.guest_name || profile.full_name || '',
      phone: prev.phone || profile.phone || '',
      email: prev.email || profile.email || '',
    }));
  }, [profile]);

  const minDate = todayIso();
  const maxDate = addDaysIso(BOOKING_RULES.maxAheadDays);

  const applyError = (err: unknown, fallback: string) => {
    const code = getErrorCode(err);
    if (code === 'RESERVATION_NO_TABLE_AVAILABLE') {
      setSuggestions(getErrorDetail<{ suggestions?: string[] }>(err)?.suggestions ?? []);
      setError('Rất tiếc, khung giờ này đã hết bàn phù hợp.');
    } else {
      setSuggestions([]);
      setError(getFormErrorMessage(err, fallback));
    }
  };

  const checkAvailability = async (selectedDate: string, selectedTime: string) => {
    setIsLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const response = await reservationApi.checkAvailability({
        reserved_at: fromRestaurantDateTime(selectedDate, selectedTime),
        guest_count: guestCount,
      });
      if (response.data?.available) {
        setStep('INFO');
      } else {
        setSuggestions(response.data?.suggestions ?? []);
        setError('Rất tiếc, khung giờ này đã hết bàn phù hợp.');
      }
    } catch (err) {
      applyError(err, 'Có lỗi xảy ra khi kiểm tra bàn trống.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Vui lòng chọn ngày và giờ');
      return;
    }
    void checkAvailability(date, time);
  };

  // chọn một khung giờ gợi ý thì dùng luôn, không bắt khách nhập lại
  const pickSuggestion = (iso: string) => {
    const parts = toRestaurantDateTimeParts(iso);
    setDate(parts.date);
    setTime(parts.time);
    void checkAvailability(parts.date, parts.time);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const response = await reservationApi.createReservation({
        guest_name: formData.guest_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        note: formData.note.trim() || undefined,
        reserved_at: fromRestaurantDateTime(date, time),
        guest_count: guestCount,
        preferred_zone: zone || undefined,
      });
      setReservationResult(response.data);
      setStep('SUCCESS');
    } catch (err) {
      // hết bàn giữa chừng thì quay lại bước chọn giờ kèm gợi ý
      if (getErrorCode(err) === 'RESERVATION_NO_TABLE_AVAILABLE') setStep('TIME');
      applyError(err, 'Không thể tạo đơn đặt bàn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Đặt Bàn Trực Tuyến</h1>
          <p className="text-slate-600">Vui lòng điền thông tin để chúng tôi chuẩn bị tốt nhất cho bữa ăn của bạn.</p>
          {!isAuthenticated && (
            <p className="text-sm text-slate-500 mt-2">
              <Link to="/login" className="text-amber-700 font-medium hover:underline">
                Đăng nhập
              </Link>{' '}
              để điền sẵn thông tin và xem lại lịch sử đặt bàn.
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-center mb-10 text-sm font-medium">
          <div className={`flex items-center ${step === 'TIME' ? 'text-amber-600' : 'text-slate-800'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 border-2 ${step === 'TIME' ? 'border-amber-600 bg-amber-50' : 'border-amber-600 bg-amber-600 text-white'}`}>1</span>
            Thời gian
          </div>
          <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${step === 'TIME' ? 'bg-slate-200' : 'bg-amber-600'}`} />
          <div className={`flex items-center ${step === 'INFO' ? 'text-amber-600' : step === 'SUCCESS' ? 'text-slate-800' : 'text-slate-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 border-2 ${step === 'INFO' ? 'border-amber-600 bg-amber-50' : step === 'SUCCESS' ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-200 bg-slate-50'}`}>2</span>
            Thông tin
          </div>
          <div className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${step === 'SUCCESS' ? 'bg-amber-600' : 'bg-slate-200'}`} />
          <div className={`flex items-center ${step === 'SUCCESS' ? 'text-amber-600' : 'text-slate-400'}`}>
            <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 border-2 ${step === 'SUCCESS' ? 'border-amber-600 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>3</span>
            Hoàn tất
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100 flex items-start gap-3" role="alert">
              <AlertCircle className="size-5 text-red-500 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700">
                <p>{error}</p>
                {suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-2">Các khung giờ gần nhất còn bàn:</p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((iso) => (
                        <button
                          key={iso}
                          type="button"
                          disabled={isLoading}
                          onClick={() => pickSuggestion(iso)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          {formatDateTime(iso)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="p-6 sm:p-10">
            {step === 'TIME' && (
              <form onSubmit={handleCheckAvailability} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="r-date" className="block text-sm font-medium text-slate-700 mb-2">Ngày đặt</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="size-5 text-slate-400" />
                      </div>
                      <input
                        id="r-date"
                        type="date"
                        min={minDate}
                        max={maxDate}
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`${inputClass} pl-10 pr-3`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Từ hôm nay đến tối đa {BOOKING_RULES.maxAheadDays} ngày sau.</p>
                  </div>
                  <div>
                    <label htmlFor="r-time" className="block text-sm font-medium text-slate-700 mb-2">Giờ đến</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Clock className="size-5 text-slate-400" />
                      </div>
                      <input
                        id="r-time"
                        type="time"
                        min={BOOKING_RULES.openTime}
                        max={BOOKING_RULES.closeTime}
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={`${inputClass} pl-10 pr-3`}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Trong giờ mở cửa {BOOKING_RULES.openTime} – {BOOKING_RULES.closeTime}, đặt trước tối thiểu {BOOKING_RULES.minLeadHours} giờ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="r-guests" className="block text-sm font-medium text-slate-700 mb-2">Số lượng khách</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Users className="size-5 text-slate-400" />
                      </div>
                      <input
                        id="r-guests"
                        type="number"
                        min={1}
                        max={BOOKING_RULES.maxGuests}
                        step={1}
                        required
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className={`${inputClass} pl-10 pr-3`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="r-zone" className="block text-sm font-medium text-slate-700 mb-2">Khu vực ưu tiên (tùy chọn)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="size-5 text-slate-400" />
                      </div>
                      <select
                        id="r-zone"
                        value={zone}
                        onChange={(e) => setZone(e.target.value as TableZone | '')}
                        className={`${inputClass} pl-10 pr-3 bg-white`}
                      >
                        <option value="">Không ưu tiên</option>
                        {(Object.keys(ZONE_LABELS) as TableZone[]).map((z) => (
                          <option key={z} value={z}>
                            {ZONE_LABELS[z]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? <Loader2 className="size-6 animate-spin" /> : 'Kiểm tra bàn trống'}
                  </button>
                </div>
              </form>
            )}

            {step === 'INFO' && (
              <form onSubmit={handleSubmitReservation} className="space-y-6">
                <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-600">Thời gian:</p>
                    <p className="font-bold text-slate-900">{time} - {formatDate(date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Số lượng:</p>
                    <p className="font-bold text-slate-900">
                      {guestCount} người{zone ? ` · ${ZONE_LABELS[zone]}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => setStep('TIME')} className="text-amber-700 text-sm font-medium hover:underline">
                    Thay đổi
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="r-name" className="block text-sm font-medium text-slate-700 mb-2">Họ và tên *</label>
                    <input
                      id="r-name"
                      type="text"
                      name="guest_name"
                      required
                      maxLength={255}
                      value={formData.guest_name}
                      onChange={handleInputChange}
                      className={`${inputClass} px-4`}
                    />
                  </div>
                  <div>
                    <label htmlFor="r-phone" className="block text-sm font-medium text-slate-700 mb-2">Số điện thoại *</label>
                    <input
                      id="r-phone"
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      required
                      pattern="\d{10}"
                      title="Số điện thoại gồm 10 chữ số"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`${inputClass} px-4`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="r-email" className="block text-sm font-medium text-slate-700 mb-2">Email (Tùy chọn)</label>
                  <input
                    id="r-email"
                    type="email"
                    name="email"
                    maxLength={255}
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`${inputClass} px-4`}
                  />
                  <p className="mt-1 text-xs text-slate-500">Nhập email để nhận thư xác nhận đã nhận yêu cầu.</p>
                </div>

                <div>
                  <label htmlFor="r-note" className="block text-sm font-medium text-slate-700 mb-2">Ghi chú yêu cầu đặc biệt</label>
                  <textarea
                    id="r-note"
                    name="note"
                    rows={3}
                    maxLength={255}
                    value={formData.note}
                    onChange={handleInputChange}
                    className={`${inputClass} px-4`}
                    placeholder="Dị ứng đậu phộng, ăn chay, trang trí sinh nhật..."
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('TIME')}
                    disabled={isLoading}
                    className="flex-1 py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm text-lg font-bold text-slate-700 bg-white hover:bg-slate-50 transition"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-lg font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-70 disabled:cursor-not-allowed transition"
                  >
                    {isLoading ? <Loader2 className="size-6 animate-spin" /> : 'Xác nhận Đặt Bàn'}
                  </button>
                </div>
              </form>
            )}

            {step === 'SUCCESS' && (
              <div className="text-center py-8">
                <div className="mx-auto flex items-center justify-center size-20 rounded-full bg-green-100 mb-6">
                  <CheckCircle2 className="size-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Đã ghi nhận yêu cầu đặt bàn!</h2>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">
                  Cảm ơn bạn, <span className="font-bold text-slate-800">{reservationResult?.guest_name ?? formData.guest_name}</span>. Đặt bàn đang ở trạng thái
                  chờ xác nhận, nhà hàng sẽ xác nhận sớm nhất
                  {reservationResult?.email ? ` và gửi email tới ${reservationResult.email}` : ''}.
                </p>

                <div className="bg-slate-50 rounded-xl p-6 mb-8 text-left max-w-sm mx-auto border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Mã đặt bàn</p>
                  <p className="text-lg font-bold text-amber-700 font-mono mb-4">{reservationResult?.code}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Thời gian:</p>
                      <p className="font-semibold text-slate-900">{time}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Ngày:</p>
                      <p className="font-semibold text-slate-900">{formatDate(date)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Số khách:</p>
                      <p className="font-semibold text-slate-900">{guestCount} người</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Số ĐT:</p>
                      <p className="font-semibold text-slate-900">{reservationResult?.phone ?? formData.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  {isAuthenticated && (
                    <Link to="/account/reservations" className="text-amber-700 font-bold hover:text-amber-800">
                      Xem lịch sử đặt bàn
                    </Link>
                  )}
                  <Link to="/" className="inline-flex items-center text-amber-600 font-bold hover:text-amber-700">
                    Trở về Trang chủ <ChevronRight className="size-5 ml-1" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
