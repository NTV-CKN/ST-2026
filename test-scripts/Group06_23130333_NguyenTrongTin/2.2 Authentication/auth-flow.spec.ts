import { expect, test, type Page } from '@playwright/test';
import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dependencies: Record<string, string[]> = {
  'AUTH_Register-4': ['AUTH_Register-3'],
  'AUTH_Reset-3': ['AUTH_Reset-2'],
  'AUTH_Reset-4': ['AUTH_Reset-3'],
};

// Playwright restarts the worker after a failed test, which wipes module state.
// Persist case results per run (keyed by the runner's pid) so dependency checks survive that.
const resultsFile = path.join(os.tmpdir(), `pw-auth-results-${process.ppid}.json`);

function readResults(): Record<string, boolean> {
  try {
    return JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
  } catch {
    return {};
  }
}

const caseResults = {
  get(caseId: string): boolean | undefined {
    return readResults()[caseId];
  },
  set(caseId: string, passed: boolean): void {
    fs.writeFileSync(resultsFile, JSON.stringify({ ...readResults(), [caseId]: passed }));
  },
};

let activeResetToken = '';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    test.skip(true, `Blocked: configure ${name} in Playwright/.env.`);
    return '';
  }
  return value;
}

function requireDestructiveDbPermission(): void {
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  const database = process.env.DB_NAME;
  test.skip(
      !allowed || database !== 'phu_kien_cong_nghe',
      'Blocked: this case changes a user or password-reset record and requires ALLOW_DESTRUCTIVE_DB=true with DB_NAME=phu_kien_cong_nghe.',
  );
}

function databaseConfig() {
  return {
    host: requiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: requiredEnv('DB_USER'),
    password: process.env.DB_PASSWORD ?? '',
    database: requiredEnv('DB_NAME'),
  };
}

async function ensureResetToken(email: string): Promise<string> {
  if (activeResetToken) return activeResetToken;
  requireDestructiveDbPermission();
  const connection = await mysql.createConnection(databaseConfig());
  try {
    const [rows] = await connection.execute<Array<RowDataPacket & { token: string }>>(
        'SELECT token FROM password_resets WHERE email = ? AND expiry_date > NOW() ORDER BY expiry_date DESC LIMIT 1',
        [email],
    );
    activeResetToken = rows[0]?.token ?? '';
    if (!activeResetToken) {
      const seeded = `pwtest-${Date.now()}`;
      try {
        await connection.execute(
            'INSERT INTO password_resets (email, token, expiry_date) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))',
            [email, seeded],
        );
      } catch (error) {
        test.skip(true, `Blocked: cannot seed password_resets (${(error as Error).message}).`);
      }
      activeResetToken = seeded;
    }
    return activeResetToken;
  } finally {
    await connection.end();
  }
}

async function readPasswordHash(email: string): Promise<string | null> {
  const connection = await mysql.createConnection(databaseConfig());
  try {
    const [rows] = await connection.execute<Array<RowDataPacket & { password: string | null }>>(
        'SELECT password FROM users WHERE email = ?',
        [email],
    );
    return rows[0]?.password ?? null;
  } finally {
    await connection.end();
  }
}

async function restorePasswordHash(email: string, hash: string): Promise<void> {
  const connection = await mysql.createConnection(databaseConfig());
  try {
    await connection.execute('UPDATE users SET password = ? WHERE email = ?', [hash, email]);
  } finally {
    await connection.end();
  }
}

async function signIn(page: Page, loginInfo: string, password: string): Promise<void> {
  await page.goto('login');
  await page.locator('form.login input[name="loginInfo"]').fill(loginInfo);
  await page.locator('form.login input[name="password"]').fill(password);
  await page.locator('form.login input[type="submit"]').click();
}

test.describe('AUTH - Authentication flows', () => {
  test.describe.configure({ mode: 'default' });

  test.beforeEach(({}, testInfo) => {
    const caseId = testInfo.title.match(/\bAUTH_[A-Za-z]+-\d+\b/)?.[0];
    for (const prerequisite of dependencies[caseId ?? ''] ?? []) {
      test.skip(
          caseResults.get(prerequisite) !== true,
          `Blocked: prerequisite ${prerequisite} did not pass.`,
      );
    }
  });

  test.afterEach(async ({}, testInfo) => {
    const caseId = testInfo.title.match(/\bAUTH_[A-Za-z]+-\d+\b/)?.[0];
    if (caseId) {
      caseResults.set(caseId, testInfo.status === 'passed');
    }
  });

  test.describe('Login form, locked account and active session checks', () => {
    test('AUTH_Login-1: Hiển thị form đăng nhập khi chưa đăng nhập', async ({ page }) => {
      await page.goto('login');

      await expect(page.getByText('Đăng Nhập', { exact: true }).first()).toBeVisible();
      await expect(page.locator('input[name="loginInfo"]')).toBeVisible();
      await expect(page.locator('input[name="loginInfo"]')).toHaveValue('');
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toHaveValue('');
    });

    test('AUTH_Login-5: Từ chối đăng nhập tài khoản bị khóa', async ({ page }) => {
      const lockedEmail = requiredEnv('PW_AUTH_LOCKED_EMAIL');
      const lockedPassword = requiredEnv('PW_AUTH_LOCKED_PASSWORD');

      await signIn(page, lockedEmail, lockedPassword);

      await expect(page.locator('.alert-error')).toContainText('Tài khoản đã bị khóa');
    });

    test('AUTH_Login-2: Chuyển về trang chủ khi tài khoản đang đăng nhập còn hoạt động', async ({ page }) => {
      const email = requiredEnv('USER_EMAIL');
      const password = requiredEnv('USER_PASSWORD');

      await signIn(page, email, password);
      await expect(page).toHaveURL(/\/pkcn\/$/);

      await page.goto('login');
      await expect(page).toHaveURL(/\/pkcn\/$/);
    });
  });

  test('AUTH_Login-4: Báo lỗi khi sai thông tin đăng nhập', async ({ page }) => {
    await signIn(page, `missing-${Date.now()}@example.invalid`, `Invalid-${Date.now()}!`);

    await expect(page.locator('.alert-error')).toHaveText('Tài khoản hoặc mật khẩu không đúng');
  });

  test('AUTH_Login-3: Xóa trạng thái đăng nhập khi tài khoản vừa bị khóa', async ({ page, browser }) => {
    requireDestructiveDbPermission();
    const email = requiredEnv('USER_EMAIL');
    const password = requiredEnv('USER_PASSWORD');
    const adminEmail = requiredEnv('ADMIN_EMAIL');
    const adminPassword = requiredEnv('ADMIN_PASSWORD');
    const userId = requiredEnv('PW_AUTH_SESSION_USER_ID');
    expect(userId).toMatch(/^[1-9]\d*$/);

    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/pkcn\/$/);
    const appBaseUrl = new URL('.', page.url());
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    try {
      await adminPage.goto(new URL('login', appBaseUrl).toString());
      await adminPage.locator('input[name="loginInfo"]').fill(adminEmail);
      await adminPage.locator('input[name="password"]').fill(adminPassword);
      await adminPage.locator('form.login input[type="submit"]').click();
      await expect(adminPage).toHaveURL(/\/admin-order(?:[?#]|$)/);

      const lockUrl = new URL(`lock-unlock-user?action=lock&id=${encodeURIComponent(userId)}`, appBaseUrl);
      await adminPage.goto(lockUrl.toString());
      await page.goto('login');

      await expect(page.locator('input[name="loginInfo"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
    } finally {
      const unlockUrl = new URL(`lock-unlock-user?action=unlock&id=${encodeURIComponent(userId)}`, appBaseUrl);
      await adminPage.goto(unlockUrl.toString());
      await adminContext.close();
    }
  });

  test.describe('Customer login and wishlist redirect checks', () => {
    test('AUTH_Login-6: Đăng nhập Customer và chuyển về trang chủ', async ({ page }) => {
      const email = requiredEnv('USER_EMAIL');
      const password = requiredEnv('USER_PASSWORD');

      await signIn(page, email, password);
      await expect(page).toHaveURL(/\/pkcn\/$/);
    });

    test('AUTH_Login-8: Chuyển đến Wishlist sau khi đăng nhập với continue=wishlist', async ({ page }) => {
      const email = requiredEnv('USER_EMAIL');
      const password = requiredEnv('USER_PASSWORD');

      await page.goto('login?continue=wishlist');
      await page.locator('input[name="loginInfo"]').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('form.login input[type="submit"]').click();

      await expect(page).toHaveURL(/\/wishlist(?:[?#]|$)/);
    });
  });

  test('AUTH_Login-7: Đăng nhập Admin và chuyển đến trang quản trị', async ({ page }) => {
    const email = requiredEnv('ADMIN_EMAIL');
    const password = requiredEnv('ADMIN_PASSWORD');

    await signIn(page, email, password);
    await expect(page).toHaveURL(/\/admin-order(?:[?#]|$)/);
  });

  test('AUTH_Register-1: Hiển thị lỗi client-side khi mật khẩu yếu', async ({ page }) => {
    await page.goto('register');
    await page.locator('input[name="full_name"]').fill('Playwright Test');
    await page.locator('input[name="email"]').fill(`weak-${Date.now()}@example.invalid`);
    await page.locator('input[name="user_name"]').fill(`pwtest${Date.now()}`);
    await page.locator('#password1').fill('weak');
    await page.locator('#password2').fill('weak');
    await page.locator('.btn-register').click();

    await expect(page.locator('#pw1Error')).toHaveText(
        'Mật khẩu 8-16 ký tự, có chữ hoa, số và ký tự đặc biệt',
    );
  });

  test('AUTH_Register-2: Chặn đăng ký khi email đã tồn tại', async ({ page }) => {
    const existingEmail = requiredEnv('USER_EMAIL');

    await page.goto('register');
    await page.locator('input[name="full_name"]').fill('Playwright Duplicate Check');
    await page.locator('input[name="email"]').fill(existingEmail);
    await page.locator('input[name="user_name"]').fill(`pwdup${Date.now()}`);
    await page.locator('#password1').fill('TestPass1!');
    await page.locator('#password2').fill('TestPass1!');
    await page.locator('.btn-register').click();

    await expect(page.locator('#emailError')).toHaveText('Email này đã được đăng ký!');
  });

  test.describe('Firebase registration and email verification dependency', () => {
    test('AUTH_Register-3: Tạo tài khoản Firebase và gửi email xác thực', async () => {
      test.skip(
          true,
          'Blocked: requires an isolated Firebase test tenant and a controlled verification inbox/emulator.',
      );
    });
    test('AUTH_Register-4: Lưu tài khoản sau khi xác thực email', async () => {
      test.skip(
          true,
          'Blocked: requires the Firebase registration and email verification flow from AUTH_Register-3.',
      );
    });
  });

  test('AUTH_Register-5: POST /register với payload thiếu trường không trả lỗi 500', async ({ request }) => {
    const response = await request.post('register', { form: {} });

    expect(response.status()).toBeLessThan(500);
    expect(response.headers()['content-type']).toContain('application/json');
  });

  test('AUTH_Forgot-1: Báo lỗi khi email quên mật khẩu không tồn tại', async ({ request }) => {
    const email = `missing-${Date.now()}@example.invalid`;
    const response = await request.post('forgot-email', { form: { email } });
    const result = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(result.message).toBe('Có vẻ như email này không có trong hệ thống của chúng tôi');
  });

  test('AUTH_Forgot-2: Gửi link đặt lại mật khẩu đến email hợp lệ', async ({ request }) => {
    test.skip(
        process.env.PW_AUTH_ALLOW_EMAIL_SEND !== 'true',
        'Blocked: set PW_AUTH_ALLOW_EMAIL_SEND=true only for a dedicated test inbox before sending a real email.',
    );
    requireDestructiveDbPermission();
    const email = requiredEnv('PW_AUTH_FORGOT_EMAIL');
    const connection = await mysql.createConnection(databaseConfig());
    try {
      const response = await request.post('forgot-email', { form: { email } });
      const result = await response.json();

      expect(response.ok()).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Đã gửi link cập nhật lại mật khẩu');

      const [rows] = await connection.execute<Array<RowDataPacket & { token: string }>>(
          'SELECT token FROM password_resets WHERE email = ? AND expiry_date > NOW() ORDER BY expiry_date DESC LIMIT 1',
          [email],
      );
      activeResetToken = rows[0]?.token ?? '';
      expect(activeResetToken).not.toBe('');
    } finally {
      await connection.end();
    }
  });

  test('AUTH_Reset-1: Từ chối token đặt lại mật khẩu không hợp lệ hoặc hết hạn', async ({ page }) => {
    await page.goto(`view-reset-password?token=invalid-${Date.now()}`);

    await expect(page.locator('#resetForm')).toHaveCount(0);
    await expect(page.locator('h2')).toHaveText('Token hết hạn hoặc không tìm thấy email từ token này');
  });

  test.describe('Valid reset token, password change and token reuse dependency', () => {
    test('AUTH_Reset-2: Hiển thị form khi token đặt lại mật khẩu hợp lệ', async ({ page }) => {
      const token = await ensureResetToken(requiredEnv('PW_AUTH_FORGOT_EMAIL'));

      await page.goto(`view-reset-password?token=${encodeURIComponent(token)}`);

      await expect(page.locator('#resetForm')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Thiết lập mật khẩu mới' })).toBeVisible();
    });

    test('AUTH_Reset-3: Đặt lại mật khẩu thành công qua giao diện', async ({ page }) => {
      requireDestructiveDbPermission();
      const newPassword = requiredEnv('PW_AUTH_RESET_NEW_PASSWORD');
      const email = requiredEnv('PW_AUTH_FORGOT_EMAIL');
      const token = await ensureResetToken(email);
      const originalHash = await readPasswordHash(email);

      try {
        await page.goto(`view-reset-password?token=${encodeURIComponent(token)}`);
        await page.locator('#password').fill(newPassword);
        await page.locator('#confirmPassword').fill(newPassword);
        page.on('dialog', (dialog) => dialog.accept());
        const responsePromise = page.waitForResponse(
            (response) => response.url().includes('/reset-password') && response.request().method() === 'POST',
        );
        await page.locator('.btn-submit').click();
        const response = await responsePromise;
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(result.message).toBe('Cập nhật mật khẩu thành công');
      } finally {
        if (originalHash !== null) await restorePasswordHash(email, originalHash);
      }
    });

    test('AUTH_Reset-4: Không sử dụng lại token sau khi đã đổi mật khẩu', async ({ page }) => {
      await page.goto(`view-reset-password?token=${encodeURIComponent(activeResetToken)}`);

      await expect(page.locator('#resetForm')).toHaveCount(0);
      await expect(page.locator('h2')).toContainText('Token');
    });
  });

  test('AUTH_Reset-5: Kiểm tra API chấp nhận mật khẩu yếu khi bỏ qua JavaScript', async () => {
    test.skip(
        true,
        'Not automated: this case reproduces a weak-password policy bypass against the reset endpoint.',
    );
  });

  test.describe('Logout and protected-page history checks', () => {
    test.describe.configure({ mode: 'default' });

    test('AUTH_Logout-1: Đăng xuất và chuyển về trang chủ', async ({ page }) => {
      const email = requiredEnv('USER_EMAIL');
      const password = requiredEnv('USER_PASSWORD');

      await signIn(page, email, password);
      await expect(page).toHaveURL(/\/pkcn\/$/);
      await page.goto('logout');
      await expect(page).toHaveURL(/\/pkcn\/$/);
    });

    test('AUTH_Logout-3: Không truy cập lại trang nội bộ sau khi đăng xuất', async ({ page }) => {
      const email = requiredEnv('USER_EMAIL');
      const password = requiredEnv('USER_PASSWORD');

      await signIn(page, email, password);
      await page.goto('order-history');
      await expect(page).toHaveURL(/\/order-history(?:[?#]|$)/);
      await page.goto('logout');
      await page.goBack();
      await page.reload();

      await expect(page).toHaveURL(/\/pkcn\/login(?:[?#]|$)/);
    });
  });

  test('AUTH_Logout-2: Truy cập logout khi chưa đăng nhập không gây lỗi 500', async ({ page }) => {
    const response = await page.goto('logout');

    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/pkcn\/$/);
  });
});