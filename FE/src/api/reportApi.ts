import axiosClient from '@/helpers/axiosClient';
import type { ApiResponse } from '@/utils/apiTypes';

// một điểm doanh thu: báo cáo ngày có date (yyyy-MM-dd), báo cáo tháng có month (yyyy-MM)
export interface RevenuePoint {
  date?: string;
  month?: string;
  invoice_count: number;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
}

export interface RevenueSummary {
  invoice_count: number;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
}

export interface RevenueReport {
  points: RevenuePoint[];
  summary: RevenueSummary;
}

export interface TopDishItem {
  dish_id: string;
  dish_name: string;
  quantity: number;
  revenue: number;
}

export interface TopDishesReport {
  items: TopDishItem[];
}

export interface ReportRange {
  from_date: string;
  to_date: string;
}

export const reportApi = {
  dailyRevenue: (params: ReportRange): Promise<ApiResponse<RevenueReport>> =>
    axiosClient.get('/reports/revenue/daily', { params }),

  monthlyRevenue: (params: ReportRange): Promise<ApiResponse<RevenueReport>> =>
    axiosClient.get('/reports/revenue/monthly', { params }),

  // top_n từ 1 đến 50, mặc định 10
  topDishes: (params: ReportRange & { top_n?: number }): Promise<ApiResponse<TopDishesReport>> =>
    axiosClient.get('/reports/top-dishes', { params }),
};
