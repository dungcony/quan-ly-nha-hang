import { Clock, MapPin, Phone } from 'lucide-react';
import { RESTAURANT_INFO } from '@/utils/restaurantInfo';

export default function Footer() {
  return (
    // chân trang: địa chỉ, giờ mở cửa, điện thoại theo SRS 3.1
    <footer className="border-t bg-white py-8 text-sm text-slate-600">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <span className="block font-semibold text-slate-800">Địa chỉ</span>
            {RESTAURANT_INFO.address}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <span className="block font-semibold text-slate-800">Giờ mở cửa</span>
            {RESTAURANT_INFO.hours}
          </span>
        </p>
        <p className="flex items-start gap-2">
          <Phone className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            <span className="block font-semibold text-slate-800">Điện thoại</span>
            <a href={`tel:${RESTAURANT_INFO.phone.replace(/\s/g, '')}`} className="hover:text-amber-700">
              {RESTAURANT_INFO.phone}
            </a>
          </span>
        </p>
      </div>
      <p className="mt-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {RESTAURANT_INFO.name}
      </p>
    </footer>
  );
}
