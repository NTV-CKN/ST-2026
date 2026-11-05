'use strict';

require('dotenv').config({ path: require('node:path').resolve(__dirname, '.env') });

if (process.env.BASE_URL) {
  const configuredBase = new URL(process.env.BASE_URL);
  configuredBase.pathname = configuredBase.pathname.replace(/\/login\/?$/, '').replace(/\/+$/, '');
  configuredBase.search = '';
  configuredBase.hash = '';
  process.env.BASE_URL = configuredBase.toString().replace(/\/$/, '');
}

if (process.env.ADMIN_EMAIL && !process.env.ADMIN_USER) {
  process.env.ADMIN_USER = process.env.ADMIN_EMAIL;
}
if (process.env.ADMIN_PASSWORD && !process.env.ADMIN_PASS) {
  process.env.ADMIN_PASS = process.env.ADMIN_PASSWORD;
}

const fs = require('node:fs');
const base = require('@playwright/test');
const { BASE_URL } = require('./support/config');
const seed = require('./support/seed');
const { credentialsFor } = require('./support/auth');
const appBase = new URL(BASE_URL);
appBase.pathname = appBase.pathname.replace(/\/login\/?$/, '').replace(/\/?$/, '/');
appBase.search = '';
appBase.hash = '';
const APP_BASE_URL = appBase.toString();
const APP_ORIGIN = new URL(APP_BASE_URL).origin;

function appUrl(path) {
  return new URL(path.replace(/^\/+/, ''), APP_BASE_URL).toString();
}

function installAppNavigation(page) {
  const goto = page.goto.bind(page);
  page.goto = (url, options) => goto(
    typeof url === 'string' && url.startsWith('/') ? appUrl(url) : url,
    options,
  );
  return page;
}

async function loginToApp(page, role) {
  const credentials = role === 'admin'
    ? credentialsFor(role)
    : seed.userCredentials(role);

  await page.goto(appUrl('/login'));
  await page.locator('input[name="loginInfo"]').fill(credentials.username);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.locator('input[type="submit"]').click();
  if (new URL(page.url()).pathname.endsWith('/login')) {
    const error = page.locator('.alert-error');
    const detail = await error.count() ? await error.innerText() : 'No login error message was displayed.';
    throw new Error(`Login failed for ${role}: ${detail}`);
  }
}

const CONTEXT_OPTIONS = {
  baseURL: APP_ORIGIN,
  locale: 'vi-VN',
  timezoneId: 'Asia/Ho_Chi_Minh',
  permissions: ['clipboard-read', 'clipboard-write'],
};
const test = base.test.extend({
  data: async ({}, use) => {
    await use(seed.loadSeed());
  },
  login: async ({ browser }, use) => {
    const contexts = [];
    await use(async (role) => {
      const context = await browser.newContext(CONTEXT_OPTIONS);
      contexts.push(context);
      const page = installAppNavigation(await context.newPage());
      await loginToApp(page, role);
      return page;
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
  guest: async ({ browser }, use) => {
    const contexts = [];
    await use(async () => {
      const context = await browser.newContext(CONTEXT_OPTIONS);
      contexts.push(context);
      return installAppNavigation(await context.newPage());
    });
    await Promise.all(contexts.map((context) => context.close()));
  },
});
const expect = base.expect;
const { UserKeyPage } = require('./pages/UserKeyPage');
const keys = require('./support/keys');
const { exec, one, query } = require('./support/db');
const { watchDialogs, withSlowGuard } = require('./support/app');
const { seedBaseData, loadSeed, USERS } = require('./support/seed');
const { ADMIN, SLOW_CALL_TIMEOUT_MS } = require('./support/config');

function requireDestructiveDbPermission() {
  const database = process.env.DB_NAME;
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  test.skip(
    !allowed || database !== 'phu_kien_cong_nghe',
    `Blocked: database-writing tests require ALLOW_DESTRUCTIVE_DB=true and DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database || 'unset'}, ALLOW_DESTRUCTIVE_DB=${process.env.ALLOW_DESTRUCTIVE_DB || 'unset'}).`,
  );
}

// Chuỗi case có trạng thái kế tiếp bắt buộc: giữ nguyên thứ tự và dừng khi một case hỏng.
test.describe.configure({ mode: 'serial' });

const KEY_1 = 'Khóa RSA số 1';
const KEY_2 = 'Khóa RSA số 2';

let buyerA;
let buyerB;
let rsa1;
let rsa2;
let dsa1;
let revokedAtAfterRevoke;

async function keyRowCount(userId) {
  const row = await one('SELECT COUNT(*) AS total FROM user_keys WHERE user_id = ?', [userId]);
  return row.total;
}

async function waitForDialogs(dialogs, count) {
  await expect
    .poll(() => dialogs.length, {
      message: `Chờ ${count} hộp thoại`,
      timeout: SLOW_CALL_TIMEOUT_MS + 5_000,
    })
    .toBe(count);
}

test.beforeAll(async () => {
  requireDestructiveDbPermission();
  await seedBaseData();
  const data = loadSeed();
  buyerA = data.users.A;
  buyerB = data.users.B;

  // Trạng thái đầu vào của 4.1: A chưa có khóa, B có sẵn "Khóa B" để đối chiếu.
  await keys.resetKeys(buyerA);
  await keys.resetKeys(buyerB);
  const bKey = await keys.insertKey(buyerB, { keyName: 'Khóa B', algorithm: 'RSA' });
  await exec(
    `INSERT INTO key_revoke_requests (user_key_id, token, expired_at, is_completed)
     VALUES (?, 'expired-token-demo', DATE_SUB(NOW(), INTERVAL 5 MINUTE), 0)`,
    [bKey.id],
  );

  rsa1 = keys.generatePair('RSA');
  rsa2 = keys.generatePair('RSA');
  dsa1 = keys.generatePair('DSA');
});

test('USER_KEY_View_01 — Giao diện trang Quản lý khóa số', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);

  await userKeyPage.goto();

  await expect(userKeyPage.title).toHaveText('Khóa số cá nhân');
  await expect(page.locator('.key-subtitle')).toHaveText(
    'Quản lý khóa công khai dùng để xác thực và ký số đơn hàng',
  );
  await expect(page.locator('.breadcrumb')).toContainText('Quản lý khóa số');
  await expect(userKeyPage.downloadTool).toHaveText(/Tải Tool kí điện\s+tử/);
  await expect(userKeyPage.form).toBeVisible();
  await expect(page.locator('.card-title').first()).toHaveText('Đăng ký khóa mới');
  await expect(page.locator('.key-history-card .card-title')).toHaveText('Lịch sử khóa đã dùng');

  await expect(page.locator('.key-table thead th')).toHaveText([
    'Tên gợi nhớ', 'Thuật toán', 'Ngày tạo', 'Trạng thái', 'Thao tác',
  ]);
});

test('USER_KEY_View_02 — Trạng thái chưa có khóa', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);

  await userKeyPage.goto();

  await expect(userKeyPage.rows).toHaveCount(1);
  await expect(userKeyPage.rows.first()).toContainText('Bạn chưa kích hoạt khóa công khai nào.');
  await expect(userKeyPage.rows.first().locator('td')).toHaveAttribute('colspan', '5');
  await expect(userKeyPage.revokeButtons).toHaveCount(0);
});

test('USER_KEY_Access_01 — Truy cập trang khóa khi chưa đăng nhập', async ({ guest, login }) => {
  const page = await guest();
  await page.goto('/user-key');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('#registerKeyForm')).toHaveCount(0);
  await expect(page.locator('.key-table')).toHaveCount(0);

  const loggedIn = await login('A');
  await loggedIn.goto('/user-key');
  await expect(loggedIn.locator('#registerKeyForm')).toBeVisible();
});

test('USER_KEY_Create_01 — Giá trị mặc định của form đăng ký', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);

  await userKeyPage.goto();

  await expect(userKeyPage.nameInput).toHaveValue('');
  await expect(userKeyPage.nameInput).toHaveAttribute('placeholder', 'VD: Laptop ASUS, PC nhà...');
  await expect(page.locator('input[name="algorithm"][value="RSA"]')).toBeChecked();
  await expect(page.locator('input[name="algorithm"][value="DSA"]')).not.toBeChecked();
  await expect(userKeyPage.publicKeyInput).toHaveValue('');
  await expect(userKeyPage.publicKeyInput).toHaveAttribute('placeholder', 'Dán chuỗi Public Key tại đây...');
  await expect(userKeyPage.submitButton).toBeEnabled();
  await expect(userKeyPage.submitButton).toHaveText('Kích hoạt & Lưu');
});

test('USER_KEY_Create_02 — Hủy hộp thoại xác nhận khi thêm', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page, ['dismiss']);
  await userKeyPage.fillForm({ keyName: 'Khóa tạm', publicKey: rsa1.publicKeyBase64 });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 1);
  expect(dialogs[0]).toEqual({ type: 'confirm', message: 'Xác nhận kích hoạt khóa?' });
  await expect(page).toHaveURL(/\/user-key$/);
  await expect(userKeyPage.rows.first()).toContainText('Bạn chưa kích hoạt khóa công khai nào.');
  await expect(userKeyPage.nameInput).toHaveValue('Khóa tạm');
  await expect(userKeyPage.publicKeyInput).toHaveValue(rsa1.publicKeyBase64);
  expect(await keyRowCount(buyerA)).toBe(0);
});



test('USER_KEY_Create_05 — Public key sai định dạng Base64', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({ keyName: 'Khóa lỗi', publicKey: 'khong-phai-public-key-123456789' });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[0].message).toBe('Xác nhận kích hoạt khóa?');
  expect(dialogs[1].message).toBe('Khóa công khai không hợp lệ');
  await expect(page).toHaveURL(/\/user-key$/);
  expect(await keyRowCount(buyerA)).toBe(0);
});


test('USER_KEY_Create_07 — Chọn RSA nhưng dán khóa DSA', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({
    keyName: 'Khóa lệch thuật toán',
    publicKey: dsa1.publicKeyBase64,
    algorithm: 'RSA',
  });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[1].message).toBe('Khóa công khai không hợp lệ');
  await expect(userKeyPage.nameInput).toHaveValue('Khóa lệch thuật toán');
  await expect(userKeyPage.publicKeyInput).toHaveValue(dsa1.publicKeyBase64);
  expect(await keyRowCount(buyerA)).toBe(0);
});

test('USER_KEY_Create_08 — Chọn file .pub tự điền public key', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  await expect(userKeyPage.fileInput).toHaveAttribute('accept', '.pub,.txt');
  await userKeyPage.fileInput.setInputFiles({
    name: 'rsa_1.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(rsa1.publicKeyBase64, 'utf8'),
  });
  await expect(userKeyPage.publicKeyInput).toHaveValue(rsa1.publicKeyBase64);

  const dialogs = watchDialogs(page, ['dismiss']);
  await userKeyPage.nameInput.fill('Khóa từ file');
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 1);
  await expect(userKeyPage.rows.first()).toContainText('Bạn chưa kích hoạt khóa công khai nào.');
  expect(await keyRowCount(buyerA)).toBe(0);
});

test('USER_KEY_Create_09 — Thêm khóa RSA thành công', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({ keyName: KEY_1, publicKey: rsa1.publicKeyBase64 });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[1].message).toBe('Kích hoạt khóa công khai thành công!');

  const row = userKeyPage.row(KEY_1);
  await expect(row).toBeVisible();
  await expect(row.locator('.algo-badge')).toHaveText('RSA');
  await expect(row.locator('.status-badge')).toContainText('Đang hoạt động');
  await expect(row.locator('.btn-revoke')).toBeVisible();
  await expect(userKeyPage.nameInput).toHaveValue('');

  const saved = await keys.keyByName(buyerA, KEY_1);
  expect(saved.status).toBe('ACTIVE');
  expect(saved.revoked_at).toBeNull();
  expect(await keys.activeCount(buyerA)).toBe(1);

  keys.saveEntry('A', {
    id: saved.id,
    keyName: KEY_1,
    algorithm: 'RSA',
    privateKeyPem: rsa1.privateKeyPem,
  });
});

test('USER_KEY_View_03 — Hiển thị khóa đang hoạt động', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const row = userKeyPage.row(KEY_1);
  await expect(row.locator('.status-badge')).toContainText('Đang hoạt động');
  await expect(row.locator('.status-indicator-active')).toBeVisible();
  await expect(row.locator('.algo-badge')).toHaveText('RSA');
  await expect(row.locator('.btn-revoke')).toHaveText('Báo mất khóa');
  await expect(row.locator('.key-revoked-note')).toHaveCount(0);
  await expect(row).not.toHaveClass(/key-row-revoked/);
});

test('USER_KEY_View_04 — Định dạng ngày tạo khóa', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const createdAt = new Date(saved.created_at.replace(' ', 'T'));
  const day = String(createdAt.getDate()).padStart(2, '0');
  const month = String(createdAt.getMonth() + 1).padStart(2, '0');
  const year = createdAt.getFullYear();
  const expectedDate = `${day}/${month}/${year}`;
  const expectedTime = [
    String(createdAt.getHours()).padStart(2, '0'),
    String(createdAt.getMinutes()).padStart(2, '0'),
    String(createdAt.getSeconds()).padStart(2, '0'),
  ].join(':');

  const dateCell = userKeyPage.row(KEY_1).locator('.key-date');
  await expect(dateCell).toContainText(expectedDate);
  await expect(dateCell).toContainText(expectedTime);
  await expect(dateCell).not.toContainText('---');
});

test('USER_KEY_Access_02 — Tham số userId trên URL bị bỏ qua', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);

  await page.goto(`/user-key?userId=${data.users.B}`);

  await expect(userKeyPage.row(KEY_1)).toBeVisible();
  await expect(page.locator('.key-table')).not.toContainText('Khóa B');
  await expect(page.locator('body')).not.toContainText('pw.buyer.b@example.com');
});

test('USER_KEY_Create_10 — Thêm khóa khi đang có khóa ACTIVE', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({ keyName: KEY_2, publicKey: rsa2.publicKeyBase64 });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[1].message).toBe(
    'Bạn đang có 1 khóa đang hoạt động, vui lòng thu hồi khóa đó nếu muốn thêm khóa mới',
  );
  await expect(page).toHaveURL(/\/user-key$/);
  await expect(userKeyPage.rows).toHaveCount(1);
  await expect(userKeyPage.row(KEY_2)).toHaveCount(0);
  expect(await keys.keyByName(buyerA, KEY_2)).toBeNull();
  expect(await keys.activeCount(buyerA)).toBe(1);
});

test('USER_KEY_View_05 — Tải Tool kí điện tử', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    userKeyPage.downloadTool.click(),
  ]);

  expect(download.suggestedFilename()).toBe('ToolKiDonHang.zip');
  const file = await download.path();
  expect(fs.statSync(file).size).toBeGreaterThan(0);
});

test('USER_KEY_Access_03 — Admin không xem và thu hồi được khóa người dùng', async ({ login, data }) => {
  test.skip(!ADMIN.username || !ADMIN.password, 'Cần ADMIN_USER/ADMIN_PASS để chạy case này');

  const adminPage = await login('admin');
  await adminPage.goto('/admin-order');
  await expect(adminPage).toHaveURL(/\/admin-order/);
  await expect(adminPage.locator('a[href*="user-key"]')).toHaveCount(0);

  await adminPage.goto(`/user-key?userId=${data.users.A}`);
  await expect(adminPage.locator('.key-table')).not.toContainText(KEY_1);
  await expect(adminPage.locator('body')).not.toContainText('pw.buyer.a@example.com');

  const buyerPage = await login('A');
  const userKeyPage = new UserKeyPage(buyerPage);
  await userKeyPage.goto();
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đang hoạt động');
  expect(await keys.activeCount(data.users.A)).toBe(1);
});

test('USER_KEY_Revoke_01 — Hủy hộp thoại xác nhận thu hồi', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const before = await keys.revokeRequestCount(saved.id);

  const dialogs = watchDialogs(page, ['dismiss']);
  await userKeyPage.revoke(KEY_1);

  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe(
    'Xác nhận thu hồi khóa này? Chúng tôi sẽ kiểm tra và gửi đường dẫn cho bạn qua email!',
  );
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đang hoạt động');
  expect(await keys.revokeRequestCount(saved.id)).toBe(before);
});

test('USER_KEY_Revoke_02 — Gửi yêu cầu thu hồi thành công', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const dialogs = watchDialogs(page);
  await userKeyPage.revoke(KEY_1);

  await withSlowGuard(waitForDialogs(dialogs, 2), 'gửi yêu cầu thu hồi khóa');
  expect(dialogs[1].message).toBe(
    `Chúng tôi đã gửi link thu hồi khóa tới email: ${USERS.A.email} vui lòng kiểm tra hộp thư và xác nhận thu hồi`,
  );

  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đang hoạt động');
  await expect(userKeyPage.row(KEY_1).locator('.btn-revoke')).toBeVisible();

  const request = await keys.latestRevokeRequest(saved.id);
  expect(request).not.toBeNull();
  expect(request.completed).toBe(0);
  const minutes = (new Date(request.expired_at.replace(' ', 'T')).getTime() - Date.now()) / 60000;
  expect(minutes).toBeGreaterThan(13);
  expect(minutes).toBeLessThan(17);

  const after = await keys.keyByName(data.users.A, KEY_1);
  expect(after.status).toBe('ACTIVE');
  expect(after.revoked_at).toBeNull();
});

test('USER_KEY_Revoke_03 — Gửi yêu cầu thu hồi lần thứ hai', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const first = await keys.latestRevokeRequest(saved.id);

  const dialogs = watchDialogs(page);
  await userKeyPage.revoke(KEY_1);

  await withSlowGuard(waitForDialogs(dialogs, 2), 'gửi yêu cầu thu hồi khóa');
  expect(dialogs[1].message).toBe(
    `Chúng tôi đã gửi link thu hồi khóa tới email: ${USERS.A.email} vui lòng kiểm tra hộp thư và xác nhận thu hồi`,
  );
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đang hoạt động');

  const requests = await query(
    'SELECT id, token, is_completed + 0 AS completed FROM key_revoke_requests WHERE user_key_id = ? ORDER BY id',
    [saved.id],
  );
  expect(requests).toHaveLength(2);
  expect(requests[0].id).toBe(first.id);
  expect(requests[1].token).not.toBe(requests[0].token);
  expect(requests.every((item) => item.completed === 0)).toBe(true);
});

test('USER_KEY_Revoke_04 — Xác nhận thu hồi qua link trong email', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const request = await keys.latestRevokeRequest(saved.id);

  await page.goto(`/json-revoke-user-key?token=${encodeURIComponent(request.token)}`);
  await expect(page.locator('body')).toContainText('Thu hồi thành công');

  const revoked = await keys.keyByName(data.users.A, KEY_1);
  expect(revoked.status).toBe('REVOKED');
  expect(revoked.revoked_at).not.toBeNull();
  revokedAtAfterRevoke = revoked.revoked_at;

  const requests = await query(
    'SELECT id, is_completed + 0 AS completed FROM key_revoke_requests WHERE user_key_id = ? ORDER BY id',
    [saved.id],
  );
  expect(requests).toHaveLength(2);
  expect(requests[0].completed).toBe(0);
  expect(requests[1].completed).toBe(1);
  expect(requests[1].id).toBe(request.id);

  await page.goto('/user-key');
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đã hủy bỏ');
  expect(await keys.activeCount(data.users.A)).toBe(0);
});


test('USER_KEY_View_06 — Hiển thị khóa đã thu hồi', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const row = userKeyPage.row(KEY_1);
  await expect(row).toHaveClass(/key-row-revoked/);
  await expect(row.locator('.status-badge')).toContainText('Đã hủy bỏ');
  await expect(row.locator('.status-indicator-inactive')).toBeVisible();
  await expect(row.locator('.key-revoked-note')).toContainText(/Đã hủy \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/);
  await expect(row.locator('.btn-revoke')).toHaveCount(0);
  await expect(row.locator('.key-date')).not.toContainText('---');
});

test('USER_KEY_Revoke_05 — Dùng lại link thu hồi đã xác nhận', async ({ login, data }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const saved = await keys.keyByName(data.users.A, KEY_1);
  const request = await keys.latestRevokeRequest(saved.id);
  const requestCountBefore = await keys.revokeRequestCount(saved.id);

  await page.goto(`/json-revoke-user-key?token=${encodeURIComponent(request.token)}`);
  await expect(page.locator('body')).toContainText('Khóa người dùng không tồn tại hoặc đã bị thu hồi');

  await page.goto('/user-key');
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đã hủy bỏ');
  const after = await keys.keyByName(data.users.A, KEY_1);
  expect(after.revoked_at).toBe(revokedAtAfterRevoke);
  expect(await keys.revokeRequestCount(saved.id)).toBe(requestCountBefore);
});

test('USER_KEY_Revoke_06 — Từ chối link thu hồi đã hết hạn', async ({ login, data }) => {
  const page = await login('A');
  await page.goto('/json-revoke-user-key?token=expired-token-demo');
  await expect(page.locator('body')).toContainText('Yêu cầu thu hồi không tồn tại hoặc yêu cầu đã hết hạn');

  const request = await one(
    "SELECT is_completed + 0 AS completed FROM key_revoke_requests WHERE token = 'expired-token-demo'",
  );
  expect(request.completed).toBe(0);

  const bPage = await login('B');
  const bUserKeyPage = new UserKeyPage(bPage);
  await bUserKeyPage.goto();
  await expect(bUserKeyPage.row('Khóa B').locator('.status-badge')).toContainText('Đang hoạt động');

  const active = await keys.findActive(data.users.B);
  expect(active).not.toBeNull();
  expect(active.key_name).toBe('Khóa B');
});

test('USER_KEY_Revoke_07 — Từ chối token thu hồi không tồn tại', async ({ login, data }) => {
  const page = await login('A');
  const saved = await keys.keyByName(data.users.A, KEY_1);
  const before = await keys.revokeRequestCount(saved.id);

  await page.goto('/json-revoke-user-key?token=khong-ton-tai');
  await expect(page.locator('body')).toContainText('Yêu cầu thu hồi không tồn tại hoặc yêu cầu đã hết hạn');
  await expect(page.locator('body')).not.toContainText(/java\.|Exception|at vn\./);

  expect(await keys.revokeRequestCount(saved.id)).toBe(before);
  const after = await keys.keyByName(data.users.A, KEY_1);
  expect(after.revoked_at).toBe(revokedAtAfterRevoke);
});

test('USER_KEY_Create_11 — Public key trùng khóa đã có trong hệ thống', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({ keyName: 'Khóa trùng', publicKey: rsa1.publicKeyBase64 });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[1].message).toBe('Khóa này đã có trong hệ thống, vui lòng thử lại khóa khác');
  await expect(page).toHaveURL(/\/user-key$/);
  await expect(userKeyPage.row('Khóa trùng')).toHaveCount(0);
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đã hủy bỏ');
  expect(await keys.activeCount(buyerA)).toBe(0);
});

test('USER_KEY_Create_12 — Thêm khóa RSA thành công (khóa cuối)', async ({ login }) => {
  const page = await login('A');
  const userKeyPage = new UserKeyPage(page);
  await userKeyPage.goto();

  const dialogs = watchDialogs(page);
  await userKeyPage.fillForm({ keyName: KEY_2, publicKey: rsa2.publicKeyBase64 });
  await userKeyPage.submit();

  await waitForDialogs(dialogs, 2);
  expect(dialogs[1].message).toBe('Kích hoạt khóa công khai thành công!');

  await expect(userKeyPage.row(KEY_2).locator('.status-badge')).toContainText('Đang hoạt động');
  await expect(userKeyPage.row(KEY_2).locator('.btn-revoke')).toBeVisible();
  await expect(userKeyPage.row(KEY_1).locator('.status-badge')).toContainText('Đã hủy bỏ');
  await expect(page.locator('.key-table .status-active')).toHaveCount(1);

  await page.reload();
  await expect(userKeyPage.row(KEY_2).locator('.status-badge')).toContainText('Đang hoạt động');

  const saved = await keys.keyByName(buyerA, KEY_2);
  expect(await keys.activeCount(buyerA)).toBe(1);
  keys.saveEntry('A', {
    id: saved.id,
    keyName: KEY_2,
    algorithm: 'RSA',
    privateKeyPem: rsa2.privateKeyPem,
  });
});
