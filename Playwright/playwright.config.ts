import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL?.trim();
if (!baseURL) {
  throw new Error('Missing required environment variable: BASE_URL');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Chạy tuần tự để tránh xung đột dữ liệu Admin
  workers: 1,           // Chạy 1 luồng duy nhất
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: baseURL.endsWith('/') ? baseURL : `${baseURL}/`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false, // Đổi thành true nếu muốn chạy ẩn bên dưới
  },

  projects: [
    {
      name: 'Google Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Sử dụng Chrome thật cài trên máy
      },
    },
  ],
});