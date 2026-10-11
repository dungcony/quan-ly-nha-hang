import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// FE gọi backend bằng địa chỉ tuyệt đối trong VITE_API_BASE_URL (xem helpers/axiosClient.ts) nên không cần proxy dev
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    },
  },
  css: {
    // thư mục chứa postcss.config.js
    postcss: __dirname,
  },
  server: {
    port: 3000,
  },
});
