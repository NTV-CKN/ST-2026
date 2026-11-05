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

const crypto = require('node:crypto');
const fs = require('node:fs');
const base = require('@playwright/test');
const { BASE_URL } = require('../phu_kien_cong_nghe/playwright/support/config');
const seedData = require('../phu_kien_cong_nghe/playwright/support/seed');
const { credentialsFor } = require('../phu_kien_cong_nghe/playwright/support/auth');
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
    : seedData.userCredentials(role);

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
    await use(seedData.loadSeed());
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
const { SignOrderPage } = require('../phu_kien_cong_nghe/playwright/pages/SignOrderPage');
const { OrderHistoryPage } = require('../phu_kien_cong_nghe/playwright/pages/OrderHistoryPage');
const keys = require('../phu_kien_cong_nghe/playwright/support/keys');
const orders = require('../phu_kien_cong_nghe/playwright/support/orders');
const appHelpers = require('../phu_kien_cong_nghe/playwright/support/app');
function appRequest(request) {
  return new Proxy(request, {
    get(target, property) {
      const method = target[property];
      if (['delete', 'fetch', 'get', 'head', 'patch', 'post', 'put'].includes(property)) {
        return (url, options) => method.call(
          target,
          typeof url === 'string' && url.startsWith('/') ? appUrl(url) : url,
          options,
        );
      }
      return typeof method === 'function' ? method.bind(target) : method;
    },
  });
}
const app = new Proxy(appHelpers, {
  get(target, property) {
    const helper = target[property];
    if (property === 'submitSignature') {
      return (request, ...args) => helper(appRequest(request), ...args);
    }
    return helper;
  },
});
const { seedBaseData, loadSeed, restoreStock } = require('../phu_kien_cong_nghe/playwright/support/seed');
const { exec, one } = require('../phu_kien_cong_nghe/playwright/support/db');
const { ADMIN } = require('../phu_kien_cong_nghe/playwright/support/config');

function requireDestructiveDbPermission() {
  const database = process.env.DB_NAME;
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  test.skip(
    !allowed || database !== 'phu_kien_cong_nghe',
    `Blocked: database-writing tests require ALLOW_DESTRUCTIVE_DB=true and DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database || 'unset'}, ALLOW_DESTRUCTIVE_DB=${process.env.ALLOW_DESTRUCTIVE_DB || 'unset'}).`,
  );
}

test.describe.configure({ mode: 'serial' });

const ORDER_SPECS = {
  O1: { items: [{ alias: 'A', quantity: 1 }], paymentMethodId: 1 },
  O2: { items: [{ alias: 'B', quantity: 1 }], paymentMethodId: 2 },
  O3: { items: [{ alias: 'A', quantity: 2 }, { alias: 'B', quantity: 1 }], paymentMethodId: 1 },
  O4: { items: [{ alias: 'A', quantity: 1 }], paymentMethodId: 1, note: 'a'.repeat(191) },
  O5: { items: [{ alias: 'E', quantity: 2 }], paymentMethodId: 1 },
};

let seed;
let aKey;
let cKey;
let bKeyRow;
let revokedKeyId;
let adminReady;
let O = {};
let o1Hash;
let o1Signature;
let o1ResignSignature;

async function waitForDialogs(dialogs, count) {
  await expect.poll(() => dialogs.length, { message: `Chờ ${count} hộp thoại` }).toBe(count);
}

async function openSigningPage(page, orderId) {
  const history = new OrderHistoryPage(page);
  await history.goto();
  const button = history.signButton(orderId);
  await expect(button).toContainText('Ký đơn hàng');
  await button.hover({ position: { x: 40, y: 10 } });
  await expect(button.locator('.btn-sign-text')).toBeVisible();
  await Promise.all([
    page.waitForURL(new RegExp(`/process-sign-order\\?orderId=${orderId}(?:&|$)`), {
      waitUntil: 'domcontentloaded',
    }),
    button.click({ position: { x: 40, y: 10 } }),
  ]);
  return new SignOrderPage(page);
}

async function signCurrentHash(signPage, privateKeyPem) {
  return keys.signHash(await signPage.hash(), privateKeyPem);
}

async function signInUi(page, orderId, privateKeyPem) {
  const signPage = await openSigningPage(page, orderId);
  const signature = await signCurrentHash(signPage, privateKeyPem);
  const dialogs = app.watchDialogs(page);
  await signPage.signWith(signature);
  await waitForDialogs(dialogs, 1);
  return { signPage, signature, dialogs };
}

async function ensureOrdersThroughApp(browser) {
  const context = await browser.newContext(CONTEXT_OPTIONS);
  try {
    await loginToApp(installAppNavigation(await context.newPage()), 'A');
    for (const [key, spec] of Object.entries(ORDER_SPECS)) {
      O[key] = await orders.createOrderThroughApp(appRequest(context.request), {
        user: 'A',
        items: spec.items,
        addressId: seed.addresses.A.A1,
        paymentMethodId: spec.paymentMethodId,
        note: spec.note || '',
      });
    }
  } finally {
    await context.close();
  }
}

test.beforeAll(async ({ browser }) => {
  requireDestructiveDbPermission();
  await seedBaseData();
  seed = loadSeed();
  await restoreStock();

  await keys.resetKeys(seed.users.C);
  await keys.resetKeys(seed.users.F);

  aKey = await keys.ensureActiveKey('A', seed.users.A);
  cKey = await keys.ensureActiveKey('C', seed.users.C, { keyName: 'Khóa DSA của C', algorithm: 'DSA' });
  await keys.ensureActiveKey('B', seed.users.B, { keyName: 'Khóa B', algorithm: 'RSA' });
  bKeyRow = await keys.activeKeyRow(seed.users.B);
  revokedKeyId = await keys.ensureRevokedKey(seed.users.A);

  await ensureOrdersThroughApp(browser);

  const expiredAt = orders.formatDateTime(new Date(Date.now() - 3_600_000));
  O.B = await orders.createPreparedOrder({
    user: 'B',
    receiver: { name: 'Trần Thị B', phone: '0912345678', province: 'Đà Nẵng', district: 'Hải Châu', detail: '88 Bạch Đằng' },
  });
  O.DSA = await orders.createPreparedOrder({
    user: 'C',
    receiver: { name: 'Phạm Văn C', phone: '0923456789', province: 'TP.Hồ Chí Minh', district: 'Quận 3', detail: '9 Võ Văn Tần' },
  });
  O.F = await orders.createPreparedOrder({
    user: 'F',
    receiver: { name: 'Hoàng Thị F', phone: '0956789012', province: 'Đồng Nai', district: 'Biên Hòa', detail: '7 Trảng Dài' },
  });
  O.EXPIRED = await orders.createPreparedOrder({ user: 'A', expireSignKey: expiredAt });
  O.APPROVED = await orders.createPreparedOrder({ user: 'A', status: 'approved' });

  adminReady = Boolean(ADMIN.username && ADMIN.password);
});

test('SIGN_View_01 — Giao diện trang ký và thông tin khóa', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);
  await expect(signPage.heading).toHaveText('Xác Thực Cấu Trúc Đơn Hàng Trước Khi Ký');
  await expect(signPage.keyInfo).toContainText(`Tên khóa: ${aKey.keyName}`);
  await expect(signPage.keyInfo).toContainText('Thuật toán mã hóa: RSA');
  await expect(signPage.keyInfo).toContainText(/Ngày kích hoạt:/);
  await expect(page.locator('.card-body')).toContainText('1. Chi tiết dữ liệu đơn hàng');
  await expect(page.locator('.card-body')).toContainText('2. Mã băm dữ liệu SHA-256 tương ứng');
  await expect(page.locator('.card-body')).toContainText('3. Nhập chữ ký số nhận được từ Tool');
  await expect(signPage.copyHashButton).toBeVisible();
  await expect(signPage.downloadHashButton).toBeVisible();
  await expect(signPage.uploadSignatureButton).toBeVisible();
  await expect(signPage.confirmButton).toHaveText('Xác Nhận Ký');
});

test('SIGN_View_02 — Dữ liệu đơn hàng và mã băm SHA-256', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);

  const formatData = await signPage.formatData.textContent();
  expect(formatData).toContain('THÔNG TIN ĐƠN HÀNG');
  expect(formatData).toContain('THÔNG TIN NGƯỜI NHẬN');
  expect(formatData).toContain('CHI TIẾT SẢN PHẨM');
  expect(formatData).toContain('CHI PHÍ THANH TOÁN');
  expect(formatData).toContain(`Mã đơn hàng: ${O.O1}`);
  expect(formatData).toContain('Nguyễn Văn A');
  expect(formatData).toContain('TP.Hồ Chí Minh');
  expect(formatData).toContain('SP_A');
  expect(formatData).toBe(formatData.trim());

  o1Hash = await signPage.hash();
  expect(o1Hash).toMatch(/^[0-9a-f]{64}$/);
  const expected = crypto.createHash('sha256').update(formatData, 'utf8').digest('hex');
  expect(o1Hash).toBe(expected);

  const details = await orders.orderDetails(O.O1);
  expect(details).toHaveLength(1);
});

test('SIGN_View_03 — Copy mã băm', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);

  await signPage.copyHashButton.click();
  await expect(signPage.copyHashButton).toHaveText('Đã Copy ✓');

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(await signPage.hash());
  await expect(signPage.copyHashButton).toHaveText('Copy mã băm', { timeout: 5000 });
});

test('SIGN_View_04 — Tải file chữ ký vào ô nhập', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);
  const signature = await signCurrentHash(signPage, aKey.privateKeyPem);

  await expect(signPage.signatureFileInput).toHaveAttribute('accept', '.txt');
  const buffer = Buffer.from(`\n  ${signature}  \n`, 'utf8');

  await signPage.signatureFileInput.setInputFiles({ name: 'signature.txt', mimeType: 'text/plain', buffer });
  await expect(signPage.signatureInput).toHaveValue(signature);

  await signPage.signatureInput.fill('');
  await signPage.signatureFileInput.setInputFiles({ name: 'signature.txt', mimeType: 'text/plain', buffer });
  await expect(signPage.signatureInput).toHaveValue(signature);
});

test('SIGN_View_05 — Xuất file mã băm', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    signPage.downloadHashButton.click(),
  ]);

  expect(download.suggestedFilename()).toBe(`Ma_Bam_Don_Hang_${O.O1}.txt`);
  const file = await download.path();
  expect(fs.readFileSync(file, 'utf8').trim()).toBe(await signPage.hash());
});

test('SIGN_View_06 — Chặn ký khi không có khóa ACTIVE', async ({ login }) => {
  const page = await login('F');

  await page.goto(`/process-sign-order?orderId=${O.F}`);

  const signPage = new SignOrderPage(page);
  await expect(signPage.errorBox).toContainText('Lỗi Tiến Trình');
  await expect(signPage.errorBox).toContainText(
    'Bạn chưa có hoặc các khóa công khai cũ của bạn không hoạt đông! Vui lòng thêm khóa công khai trước khi kí đơn hàng',
  );
  await expect(signPage.signatureInput).toHaveCount(0);
  await expect(signPage.hashInput).toHaveCount(0);
  await expect(page.locator('.btn-secondary')).toHaveText('Quay lại danh sách');
});

test('SIGN_View_07 — Chặn ký khi đơn hết hạn ký', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);

  await signPage.goto(O.EXPIRED);

  await expect(signPage.errorBox).toContainText('Lỗi Tiến Trình');
  await expect(signPage.errorBox).toContainText('Đơn hàng này đã hết hạn kí, vui lòng tạo đơn mới');
  await expect(signPage.signatureInput).toHaveCount(0);
  await expect(signPage.errorBox).not.toContainText(/java\.|Exception/);

  const order = await orders.orderById(O.EXPIRED);
  expect(order.status_order).toBe('pending_signature');
  expect(order.signature).toBeNull();
});

test('SIGN_View_08 — Chặn ký khi đơn sai trạng thái', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);

  await signPage.goto(O.APPROVED);

  await expect(signPage.errorBox).toContainText('Đơn hàng này không ở trạng thái kí');
  await expect(signPage.formatData).toHaveCount(0);

  const order = await orders.orderById(O.APPROVED);
  expect(order.status_order).toBe('approved');
});

test('SIGN_View_09 — Không xem được đơn của người dùng khác', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  const before = await orders.orderById(O.B);

  await signPage.goto(O.B);

  await expect(signPage.errorBox).toContainText('Không tìm thấy đơn hàng này');
  await expect(page.locator('body')).not.toContainText('Trần Thị B');
  await expect(page.locator('body')).not.toContainText('88 Bạch Đằng');

  const after = await orders.orderById(O.B);
  expect(after.status_order).toBe(before.status_order);
  expect(after.signature).toBeNull();
  expect(after.user_key_id).toBeNull();
});

test('SIGN_View_10 — Truy cập trang ký khi chưa đăng nhập', async ({ guest }) => {
  const page = await guest();
  const before = await orders.orderById(O.O1);

  await page.goto(`/process-sign-order?orderId=${O.O1}`);

  const signPage = new SignOrderPage(page);
  await expect(signPage.errorBox).toContainText('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
  await expect(signPage.signatureInput).toHaveCount(0);
  await expect(signPage.hashInput).toHaveCount(0);

  const after = await orders.orderById(O.O1);
  expect(after.status_order).toBe(before.status_order);
  expect(after.signature).toBe(before.signature);
});

test('SIGN_View_11 — Tham số orderId thiếu hoặc không phải số', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);

  const response = await page.goto('/process-sign-order?orderId=abc');
  expect(response.status()).toBe(200);
  await expect(signPage.errorBox).toContainText('Lỗi Tiến Trình');
  await expect(signPage.errorBox).not.toContainText(/java\.|Exception|at vn\./);
  await expect(signPage.formatData).toHaveCount(0);
  await expect(signPage.signatureInput).toHaveCount(0);

  await page.goto('/process-sign-order');
  await expect(signPage.errorBox).toContainText('Lỗi Tiến Trình');
  await expect(signPage.signatureInput).toHaveCount(0);
});

test('SIGN_Confirm_01 — Ký đơn thành công với khóa RSA', async ({ login }) => {
  const page = await login('A');
  const signPage = await openSigningPage(page, O.O1);
  const signature = await signCurrentHash(signPage, aKey.privateKeyPem);

  const dialogs = app.watchDialogs(page);
  await signPage.signWith(signature);
  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe('Xác nhận chữ ký số thành công! Đơn hàng đã được ký bảo vệ.');
  await expect(page).toHaveURL(new RegExp(`/order-success\\?orderId=${O.O1}`));

  const order = await orders.orderById(O.O1);
  expect(order.status_order).toBe('signed');
  expect(order.signature).toBe(signature);
  expect(Number(order.user_key_id)).toBe(aKey.id);
  o1Signature = signature;

  const history = new OrderHistoryPage(page);
  await history.goto();
  await expect(history.unverifiedIcon(O.O1)).toBeVisible();
  await expect(history.card(O.O1)).toContainText('signed');
  await expect(history.signButton(O.O1)).toHaveCount(0);
});

test('SIGN_Confirm_02 — Chặn gửi khi chưa nhập chữ ký', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O2);
  const before = await orders.orderById(O.O2);

  let posts = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/process-sign-order')) posts += 1;
  });

  const dialogs = app.watchDialogs(page);
  await signPage.confirmButton.click();
  await waitForDialogs(dialogs, 1);

  expect(dialogs[0].message).toBe(
    'Vui lòng nhập hoặc tải tệp chứa chuỗi chữ ký số Base64 nhận được từ Tool của chúng tôi!',
  );
  expect(posts).toBe(0);

  const after = await orders.orderById(O.O2);
  expect(after.status_order).toBe('pending_signature');
  expect(after.signature).toBe(before.signature);
  expect(after.user_key_id).toBeNull();
});

test('SIGN_Confirm_03 — Từ chối chữ ký sai định dạng', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O2);
  await expect(signPage.signatureInput).toHaveValue('');

  const dialogs = app.watchDialogs(page);
  await signPage.signWith('abc123');
  await waitForDialogs(dialogs, 1);

  expect(dialogs[0].message).toBe('LỖI XÁC THỰC: Chữ kí này không hợp lệ');
  await expect(signPage.confirmButton).toBeEnabled();
  await expect(signPage.confirmButton).toHaveText('Xác Nhận Ký');

  const order = await orders.orderById(O.O2);
  expect(order.status_order).toBe('pending_signature');
  expect(order.signature).toBeNull();
  expect(order.user_key_id).toBeNull();
});

test('SIGN_Confirm_04 — Từ chối chữ ký khi dữ liệu đơn đã thay đổi', async ({ login }) => {
  test.skip(!adminReady, 'Cần ADMIN_USER/ADMIN_PASS để chạy case này');

  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O2);
  const staleHash = await signPage.hash();

  const adminPage = await login('admin');
  const edit = await orders.adminEditOrder(appRequest(adminPage.request), O.O2, { quantities: [2] });
  expect(edit.body.message).toBe(`Cập nhật đơn hàng #${O.O2} thành công`);

  const edited = await orders.orderById(O.O2);
  expect(edited.status_order).toBe('waiting_re_sign');
  expect(edited.signature).toBeNull();
  expect(edited.user_key_id).toBeNull();

  const staleSignature = keys.signHash(staleHash, aKey.privateKeyPem);
  const dialogs = app.watchDialogs(page);
  await signPage.signWith(staleSignature);
  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe('LỖI XÁC THỰC: Chữ kí này không hợp lệ');

  const after = await orders.orderById(O.O2);
  expect(after.status_order).toBe('waiting_re_sign');
  expect(after.signature).toBeNull();
  expect(after.user_key_id).toBeNull();
});

test('SIGN_Confirm_05 — Từ chối khi userKeyId không phải khóa ACTIVE', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O3);
  const signature = await signCurrentHash(signPage, aKey.privateKeyPem);

  const result = await app.submitSignature(page.request, {
    userId: String(seed.users.A),
    orderId: String(O.O3),
    userKeyId: String(revokedKeyId),
    signature,
  });

  expect(result.status).toBe(200);
  expect(result.body.success).toBe(false);
  expect(result.body.message).toBe(
    'Chúng tôi nhận ra khóa của bạn hiện tại không khớp với khóa đang hoạt động. Vui long kiểm tra lại khóa!',
  );

  const order = await orders.orderById(O.O3);
  expect(order.status_order).toBe('pending_signature');
  expect(order.signature).toBeNull();

  const revoked = await one('SELECT status FROM user_keys WHERE id = ?', [revokedKeyId]);
  expect(revoked.status).toBe('REVOKED');
});

test('SIGN_Confirm_06 — Ký đơn thành công với khóa DSA', async ({ login }) => {
  const page = await login('C');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.DSA);

  await expect(signPage.keyInfo).toContainText('Thuật toán mã hóa: DSA');
  await expect(signPage.keyInfo).toContainText(cKey.keyName);

  const signature = await signCurrentHash(signPage, cKey.privateKeyPem);
  const dialogs = app.watchDialogs(page);
  await signPage.signWith(signature);
  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe('Xác nhận chữ ký số thành công! Đơn hàng đã được ký bảo vệ.');

  const order = await orders.orderById(O.DSA);
  expect(order.status_order).toBe('signed');
  expect(order.signature).toBe(signature);
  expect(Number(order.user_key_id)).toBe(cKey.id);

  const history = new OrderHistoryPage(page);
  await history.goto();
  await expect(history.unverifiedIcon(O.DSA)).toBeVisible();
});

test('SIGN_Confirm_07 — Từ chối chữ ký Base64 không khớp dữ liệu', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O3);

  const dialogs = app.watchDialogs(page);
  await signPage.signWith(crypto.randomBytes(64).toString('base64'));
  await waitForDialogs(dialogs, 1);

  expect(dialogs[0].message).toBe('LỖI XÁC THỰC: Chữ kí này không hợp lệ');
  const order = await orders.orderById(O.O3);
  expect(order.status_order).toBe('pending_signature');
  expect(order.signature).toBeNull();
});

test('SIGN_Confirm_08 — Chữ ký có khoảng trắng đầu cuối vẫn hợp lệ', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O3);
  const signature = await signCurrentHash(signPage, aKey.privateKeyPem);

  const dialogs = app.watchDialogs(page);
  await signPage.signWith(`\n   ${signature}   \n\n`);
  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe('Xác nhận chữ ký số thành công! Đơn hàng đã được ký bảo vệ.');

  const order = await orders.orderById(O.O3);
  expect(order.status_order).toBe('signed');
  expect(order.signature).toBe(signature);
  expect(Number(order.user_key_id)).toBe(aKey.id);
});

test('SIGN_Confirm_09 — Thiếu trường chữ ký trong body', async ({ login }) => {
  const page = await login('A');
  const before = await orders.orderById(O.O4);

  const result = await app.submitSignature(page.request, {
    userId: String(seed.users.A),
    orderId: String(O.O4),
    userKeyId: String(aKey.id),
  });

  expect(result.status).toBe(200);
  expect(result.body.success).toBe(false);
  expect(result.body.message).toBe('Chữ kí này không hợp lệ');

  const after = await orders.orderById(O.O4);
  expect(after.status_order).toBe(before.status_order);
  expect(after.signature).toBeNull();
});

test('SIGN_Confirm_10 — Không ký được đơn của người dùng khác', async ({ login }) => {
  const page = await login('A');

  const result = await app.submitSignature(page.request, {
    userId: String(seed.users.A),
    orderId: String(O.B),
    userKeyId: String(aKey.id),
    signature: o1Signature,
  });

  expect(result.status).toBe(200);
  expect(result.body.success).toBe(false);
  expect(result.body.message).toBe('Không tìm thấy đơn hàng');

  const order = await orders.orderById(O.B);
  expect(order.status_order).toBe('pending_signature');
  expect(order.signature).toBeNull();
  expect(order.user_key_id).toBeNull();
});


test('SIGN_Confirm_11 — Không dùng lại chữ ký của đơn khác', async ({ login }) => {
  const page = await login('A');
  const signPage = new SignOrderPage(page);
  await signPage.goto(O.O5);
  const signatureForO5 = await signCurrentHash(signPage, aKey.privateKeyPem);

  const result = await app.submitSignature(page.request, {
    userId: String(seed.users.A),
    orderId: String(O.O4),
    userKeyId: String(aKey.id),
    signature: signatureForO5,
  });

  expect(result.body.success).toBe(false);
  expect(result.body.message).toBe('Chữ kí này không hợp lệ');

  const o4 = await orders.orderById(O.O4);
  const o5 = await orders.orderById(O.O5);
  expect(o4.status_order).toBe('pending_signature');
  expect(o4.signature).toBeNull();
  expect(o5.status_order).toBe('pending_signature');
  expect(o5.signature).toBeNull();
});

test('SIGN_Status_01 — Ký lại sau khi Admin sửa đơn', async ({ login }) => {
  test.skip(!adminReady, 'Cần ADMIN_USER/ADMIN_PASS để chạy case này');

  const adminPage = await login('admin');
  const edit = await orders.adminEditOrder(appRequest(adminPage.request), O.O1, { quantities: [2] });
  expect(edit.body.message).toBe(`Cập nhật đơn hàng #${O.O1} thành công`);

  const edited = await orders.orderById(O.O1);
  expect(edited.status_order).toBe('waiting_re_sign');
  expect(edited.signature).toBeNull();
  expect(edited.user_key_id).toBeNull();
  expect(Number(edited.total_must_pay)).toBe(225000);
  expect((new Date(edited.expire_sign_key.replace(' ', 'T')) - Date.now()) / 86_400_000).toBeGreaterThan(1.9);
  const keyAfterEdit = await one('SELECT status FROM user_keys WHERE id = ?', [aKey.id]);
  expect(keyAfterEdit.status).toBe('ACTIVE');

  const page = await login('A');
  const history = new OrderHistoryPage(page);
  await history.goto();
  await expect(history.card(O.O1)).toContainText('waiting_re_sign');
  await expect(history.unverifiedIcon(O.O1)).toBeVisible();
  await expect(history.signButton(O.O1)).toBeVisible();

  const signPage = await openSigningPage(page, O.O1);
  const newHash = await signPage.hash();
  expect(newHash).not.toBe(o1Hash);

  const signature = keys.signHash(newHash, aKey.privateKeyPem);
  const dialogs = app.watchDialogs(page);
  await signPage.signWith(signature);
  await waitForDialogs(dialogs, 1);
  expect(dialogs[0].message).toBe('Xác nhận chữ ký số thành công! Đơn hàng đã được ký bảo vệ.');

  const order = await orders.orderById(O.O1);
  expect(order.status_order).toBe('signed');
  expect(order.signature).toBe(signature);
  expect(Number(order.total_must_pay)).toBe(225000);
  o1ResignSignature = signature;

  await history.goto();
  await expect(history.unverifiedIcon(O.O1)).toBeVisible();
  await expect(history.signButton(O.O1)).toHaveCount(0);
});

test('SIGN_Status_02 — Icon xác thực khi dữ liệu đơn bị thay đổi', async ({ login }) => {
  const page = await login('A');
  const history = new OrderHistoryPage(page);

  await history.goto();
  await expect(history.unverifiedIcon(O.O3)).toBeVisible();
  await expect(history.card(O.O3)).toContainText('signed');

  const before = await orders.orderById(O.O3);
  await exec('UPDATE orders SET total_must_pay = total_must_pay + 1000 WHERE id = ?', [O.O3]);

  await history.goto();
  await expect(history.unverifiedIcon(O.O3)).toBeVisible();
  await expect(history.card(O.O3)).toContainText('signed');
  const after = await orders.orderById(O.O3);
  expect(after.signature).toBe(before.signature);

  await history.goto('?verifyFilter=verify');
  await expect(history.card(O.O3)).toHaveCount(0);
  await history.goto('?verifyFilter=un-verify');
  await expect(history.card(O.O3)).toBeVisible();
});

test('SIGN_Status_03 — Không ký lại đơn đã ký', async ({ login, data }) => {
  test.skip(!adminReady, 'Blocked: cần chạy SIGN_Status_01 trước, case này phụ thuộc đơn đã được ký lại.');
  const page = await login('A');
  expect(o1ResignSignature).toBeTruthy();

  const before = await orders.orderById(O.O1);
  const result = await app.submitSignature(page.request, {
    userId: String(data.users.A),
    orderId: String(O.O1),
    userKeyId: String(aKey.id),
    signature: o1Signature,
  });

  expect(result.body.success).toBe(false);
  expect(result.body.message).toBe('Đơn hàng này không ở trạng thái kí');

  const after = await orders.orderById(O.O1);
  expect(after.status_order).toBe('signed');
  expect(after.signature).toBe(before.signature);
  expect(Number(after.user_key_id)).toBe(Number(before.user_key_id));
});
