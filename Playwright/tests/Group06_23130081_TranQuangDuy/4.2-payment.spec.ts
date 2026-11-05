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
const { PaymentPage } = require('../phu_kien_cong_nghe/playwright/pages/PaymentPage');
const appHelpers = require('../phu_kien_cong_nghe/playwright/support/app');
const { exec } = require('../phu_kien_cong_nghe/playwright/support/db');
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
    if (['addToCart', 'checkout', 'clearCart'].includes(property)) {
      return (request, ...args) => helper(appRequest(request), ...args);
    }
    return helper;
  },
});
const orders = require('../phu_kien_cong_nghe/playwright/support/orders');
const { seedBaseData, loadSeed, setVariantStock } = require('../phu_kien_cong_nghe/playwright/support/seed');
const { one } = require('../phu_kien_cong_nghe/playwright/support/db');

function requireDestructiveDbPermission() {
  const database = process.env.DB_NAME;
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  test.skip(
    !allowed || database !== 'phu_kien_cong_nghe',
    `Blocked: database-writing tests require ALLOW_DESTRUCTIVE_DB=true and DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database || 'unset'}, ALLOW_DESTRUCTIVE_DB=${process.env.ALLOW_DESTRUCTIVE_DB || 'unset'}).`,
  );
}

let seed;

async function variantStock(alias) {
  const row = await one('SELECT stock FROM product_variants WHERE id = ?', [seed.products[alias].variantId]);
  return row.stock;
}

async function productStock(alias) {
  const row = await one('SELECT stock FROM products WHERE id = ?', [seed.products[alias].productId]);
  return row.stock;
}

function daysBetween(from, to) {
  return (new Date(to.replace(' ', 'T')) - new Date(from.replace(' ', 'T'))) / 86_400_000;
}

async function waitForDialogs(dialogs, count) {
  await expect.poll(() => dialogs.length, { message: `Chờ ${count} hộp thoại` }).toBe(count);
}

async function openPaymentWith(page, items) {
  await app.clearCart(page.request);
  for (const [alias, quantity] of items) {
    await app.addToCart(page.request, alias, quantity);
  }
  await page.goto('/view-cart');
  for (const [alias, quantity] of items) {
    const row = page.locator('.row-item').filter({ hasText: seed.products[alias].name });
    await expect(row.locator('input[name="quantity"]')).toHaveValue(String(quantity));
  }
  const paymentPage = new PaymentPage(page);
  await paymentPage.goto();
  return paymentPage;
}

async function ensureSeedProductImages() {
  const image = await one(
    "SELECT url_image FROM product_images WHERE url_image IS NOT NULL AND url_image <> '' ORDER BY id LIMIT 1",
  );
  if (!image) {
    throw new Error('Không tìm thấy ảnh sản phẩm mẫu trong DB để tạo fixture cho sản phẩm test.');
  }

  for (const product of Object.values(seed.products)) {
    await exec(
      `INSERT INTO product_images (product_variant_id, product_id, url_image, is_main)
       SELECT pv.id, pv.product_id, ?, 1
       FROM product_variants pv
       WHERE pv.id = ?
         AND NOT EXISTS (
           SELECT 1 FROM product_images pi WHERE pi.product_variant_id = pv.id
         )`,
      [image.url_image, product.variantId],
    );
  }
}

test.beforeAll(async () => {
  requireDestructiveDbPermission();
  await seedBaseData();
  seed = loadSeed();
  await ensureSeedProductImages();
});

test('PAY_View_01 — Truy cập trang thanh toán khi giỏ hàng trống', async ({ login }) => {
  const page = await login('A');
  await app.clearCart(page.request);

  await page.goto('/view-payment');

  await expect(page).toHaveURL(/\/view-cart$/);
  await expect(page.locator('#formCheckout')).toHaveCount(0);
});

test('PAY_View_02 — Truy cập trang thanh toán khi chưa đăng nhập', async ({ guest }) => {
  const page = await guest();
  await app.addToCart(page.request, 'A', 1);

  await page.goto('/view-payment');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('#formCheckout')).toHaveCount(0);
  await expect(page.locator('#customer_details')).toHaveCount(0);
});

test('PAY_View_03 — Giao diện trang Thanh toán', async ({ login }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 2], ['B', 1]]);

  await expect(page).toHaveTitle(/Thanh Toán/);
  const address = paymentPage.addressBlock;
  await expect(address).toContainText('Nguyễn Văn A');
  await expect(address).toContainText('0901234567');
  await expect(address).toContainText('12 Nguyễn Trãi, Quận 1');
  await expect(address).toContainText('TP.Hồ Chí Minh');
  await expect(address).toContainText('Mặc định');
  await expect(address).toContainText('Thêm/Quản lý địa chỉ');
  await expect(paymentPage.note).toBeVisible();

  await expect(paymentPage.items).toHaveCount(2);
  await expect(paymentPage.itemRow('SP_A')).toContainText('x2');
  await expect(paymentPage.itemRow('SP_A')).toContainText('200.000₫');
  await expect(paymentPage.itemRow('SP_B')).toContainText('x1');
  await expect(paymentPage.itemRow('SP_B')).toContainText('250.000₫');
  await expect(paymentPage.subtotal).toHaveText('450.000₫');
  await expect(paymentPage.shippingFee).toHaveText('25.000₫');
  await expect(paymentPage.total).toHaveText('475.000₫');

  await expect(paymentPage.methodRadios).toHaveCount(2);
  await expect(paymentPage.placeOrderButton).toBeEnabled();
});

test('PAY_View_04 — Chỉ hiển thị địa chỉ mặc định khi có nhiều địa chỉ', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);
  const address = paymentPage.addressBlock;

  await expect(address).toContainText('12 Nguyễn Trãi, Quận 1');
  await expect(address).toContainText('Mặc định');
  await expect(address).not.toContainText('25 Hàng Bài');

  await paymentPage.changeAddressButton.click();
  await expect(page).toHaveURL(/\/address-user$/);
  await expect(page.locator('body')).toContainText('12 Nguyễn Trãi, Quận 1');
  await expect(page.locator('body')).toContainText('25 Hàng Bài, Hoàn Kiếm');

  await paymentPage.goto();
  await expect(paymentPage.addressBlock).toContainText('12 Nguyễn Trãi, Quận 1');
  await expect(paymentPage.addressBlock).not.toContainText('25 Hàng Bài');
  expect(data.addresses.A.A2).toBeGreaterThan(0);
});

test('PAY_View_05 — Phí vận chuyển và tổng tiền tại TP.Hồ Chí Minh', async ({ login }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);

  await expect(paymentPage.subtotal).toHaveText('100.000₫');
  await expect(paymentPage.shippingFee).toHaveText('25.000₫');
  await expect(paymentPage.total).toHaveText('125.000₫');
});

test('PAY_View_06 — Phí vận chuyển tại Hà Nội', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);
  const hanoi = data.addresses.A.A2;

  await appRequest(page.request).get(`/set-address-default?id=${hanoi}`, { maxRedirects: 0 });
  await paymentPage.goto();
  await expect(paymentPage.addressBlock).toContainText('25 Hàng Bài, Hoàn Kiếm');
  await expect(paymentPage.shippingFee).toHaveText('45.000₫');
  await expect(paymentPage.total).toHaveText('145.000₫');

  await appRequest(page.request).get(`/set-address-default?id=${data.addresses.A.A1}`, { maxRedirects: 0 });
  await paymentPage.goto();
  await expect(paymentPage.shippingFee).toHaveText('25.000₫');
});

test('PAY_Method_01 — Danh sách và lựa chọn mặc định phương thức thanh toán', async ({ login }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);

  await expect(page.locator('.payment-methods li')).toHaveCount(2);
  await expect(page.locator('.payment-methods')).toContainText('Thanh toán khi nhận hàng');
  await expect(page.locator('.payment-methods')).toContainText('Thanh toán ngân hàng');
  await expect(page.locator('#payment-method-1')).toBeChecked();
  await expect(page.locator('#box-1')).toBeVisible();
  await expect(page.locator('#box-2')).toBeHidden();

  await paymentPage.chooseMethod(2);
  await expect(page.locator('#payment-method-2')).toBeChecked();
  await expect(page.locator('#payment-method-1')).not.toBeChecked();
  await expect(page.locator('input[name="paymentMethodId"]:checked')).toHaveCount(1);
});

test('PAY_Checkout_01 — Đặt hàng thành công với thanh toán khi nhận hàng', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);
  const stockBefore = await variantStock('A');
  const productStockBefore = await productStock('A');

  await expect(paymentPage.total).toHaveText('125.000₫');
  await paymentPage.note.fill('Giao giờ hành chính');
  await paymentPage.chooseMethod(1);

  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 2);
  expect(dialogs[0].message).toBe('Đặt hàng thành công!');
  expect(dialogs[1].message).toBe('Bạn có muốn ký đơn hàng?');
  await expect(page).toHaveURL(/\/order-history$/);

  await page.goto('/view-cart');
  await expect(page.locator('.title-shopping-cart')).toContainText('Bạn chưa có sản phẩm trong giỏ hàng');

  const orderId = await orders.latestOrderId(data.users.A);
  orders.saveOrder('O1', orderId);

  const order = await orders.orderById(orderId);
  expect(order.status_order).toBe('pending_signature');
  expect(order.payment_method_snapshot).toBe('Thanh toán khi nhận hàng');
  expect(Number(order.shipping_fee)).toBe(25000);
  expect(Number(order.total_must_pay)).toBe(125000);
  expect(order.note).toBe('Giao giờ hành chính');
  expect(daysBetween(order.order_date, order.expire_sign_key)).toBeGreaterThan(1.9);
  expect(daysBetween(order.order_date, order.expire_sign_key)).toBeLessThan(2.1);

  expect(order.receiver_name).toBe('Nguyễn Văn A');
  expect(order.phone_number).toBe('0901234567');
  expect(order.address_detail).toBe('12 Nguyễn Trãi, Quận 1');
  expect(order.province_city).toBe('TP.Hồ Chí Minh');

  const details = await orders.orderDetails(orderId);
  expect(details).toHaveLength(1);
  expect(details[0].product_variant_id).toBe(seed.products.A.variantId);
  expect(details[0].quantity).toBe(1);
  expect(Number(details[0].variant_price_snapshot)).toBe(100000);
  expect(Number(details[0].price_total)).toBe(100000);

  expect(await variantStock('A')).toBe(stockBefore - 1);
  expect(await productStock('A')).toBe(productStockBefore - 1);
});

test('PAY_Checkout_02 — Đặt hàng thành công với thanh toán ngân hàng', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['B', 1]]);

  await paymentPage.chooseMethod(2);
  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 2);
  expect(dialogs[0].message).toBe('Đặt hàng thành công!');
  await expect(page).toHaveURL(/\/order-history$/);

  const orderId = await orders.latestOrderId(data.users.A);
  orders.saveOrder('O2', orderId);

  const order = await orders.orderById(orderId);
  expect(order.payment_method_snapshot).toBe('Thanh toán ngân hàng');
  expect(Number(order.shipping_fee)).toBe(25000);
  expect(Number(order.total_must_pay)).toBe(275000);
  expect(order.status_order).toBe('pending_signature');
});

test('PAY_Checkout_03 — Đặt hàng với nhiều sản phẩm', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 2], ['B', 1]]);
  const stockABefore = await variantStock('A');
  const stockBBefore = await variantStock('B');
  const productABefore = await productStock('A');

  await expect(paymentPage.subtotal).toHaveText('450.000₫');
  await expect(paymentPage.shippingFee).toHaveText('25.000₫');
  await expect(paymentPage.total).toHaveText('475.000₫');

  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 2);

  const orderId = await orders.latestOrderId(data.users.A);
  orders.saveOrder('O3', orderId);

  const order = await orders.orderById(orderId);
  expect(Number(order.total_must_pay)).toBe(475000);
  expect(Number(order.shipping_fee)).toBe(25000);

  const details = await orders.orderDetails(orderId);
  expect(details).toHaveLength(2);
  const [first, second] = details;
  expect(first.product_variant_id).toBe(seed.products.A.variantId);
  expect(first.quantity).toBe(2);
  expect(Number(first.price_total)).toBe(200000);
  expect(second.product_variant_id).toBe(seed.products.B.variantId);
  expect(second.quantity).toBe(1);
  expect(Number(second.price_total)).toBe(250000);
  expect(second.product_name_snapshot).toBe('SP_B');
  expect(second.sku_snapshot).toBe('PW_B');

  expect(await variantStock('A')).toBe(stockABefore - 2);
  expect(await variantStock('B')).toBe(stockBBefore - 1);
  expect(await productStock('A')).toBe(productABefore - 2);
});

test('PAY_Checkout_04 — Ghi chú đơn hàng dài 191 ký tự', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);
  const note = 'a'.repeat(191);

  await paymentPage.note.fill(note);
  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 2);

  const orderId = await orders.latestOrderId(data.users.A);
  orders.saveOrder('O4', orderId);

  const order = await orders.orderById(orderId);
  expect(order.note).toHaveLength(191);
  expect(order.note).toBe(note);
  expect(order.address_note).toHaveLength(191);
  expect(order.address_note).toBe(note);
});

test('PAY_Checkout_05 — Đặt hàng khi số lượng bằng đúng tồn kho', async ({ login, data }) => {
  await setVariantStock('E', 2);
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['E', 2]]);

  await expect(paymentPage.total).toHaveText('225.000₫');
  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 2);
  expect(dialogs[0].message).toBe('Đặt hàng thành công!');

  const orderId = await orders.latestOrderId(data.users.A);
  orders.saveOrder('O5', orderId);

  const details = await orders.orderDetails(orderId);
  expect(details[0].product_variant_id).toBe(seed.products.E.variantId);
  expect(details[0].quantity).toBe(2);
  expect(Number(details[0].price_total)).toBe(200000);
  expect(await variantStock('E')).toBe(0);
  expect(await productStock('E')).toBe(0);
});

test('PAY_Checkout_06 — Chặn đặt hàng khi số lượng vượt tồn kho', async ({ login, data }) => {
  await setVariantStock('C', 3);
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['C', 5]]);
  const countBefore = await orders.orderCount(data.users.A);

  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 1);

  expect(dialogs[0].message).toBe('Lỗi: Sản phẩm SP_C không đủ hàng. Hiện còn 3 sản phẩm');
  await expect(page).toHaveURL(/\/view-payment$/);
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);
  expect(await variantStock('C')).toBe(3);

  await page.goto('/view-cart');
  expect(await app.cartQuantityOnPage(page, 'SP_C')).toBe(5);
});

test('PAY_Checkout_07 — Chặn đặt hàng khi sản phẩm hết hàng', async ({ login, data }) => {
  await setVariantStock('D', 0);
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['D', 1]]);
  const countBefore = await orders.orderCount(data.users.A);

  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrder();
  await waitForDialogs(dialogs, 1);

  expect(dialogs[0].message).toBe('Lỗi: Sản phẩm SP_D không đủ hàng. Hiện còn 0 sản phẩm');
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);
  expect(await variantStock('D')).toBe(0);
});

test('PAY_Checkout_08 — Từ chối đặt hàng khi thiếu địa chỉ nhận hàng', async ({ login, data }) => {
  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.A);

  const result = await app.checkout(page.request, { paymentMethodId: '1', note: 'Test' });

  expect(result.status).toBe(200);
  expect(result.body).toEqual({
    success: false,
    message: 'Vui lòng thêm địa chỉ nhận hàng trước khi đặt hàng',
  });
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);

  await page.goto('/view-cart');
  expect(await app.cartQuantityOnPage(page, 'SP_A')).toBe(1);
});

test('PAY_Checkout_09 — Từ chối đặt hàng khi thiếu phương thức thanh toán', async ({ login, data }) => {
  test.fail(true, 'BUG: JsonCheckoutServlet nối chuỗi "null" khi thiếu paymentMethodId thay vì báo lỗi phương thức thanh toán');

  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.A);

  const result = await app.checkout(page.request, {
    selectedAddressId: String(data.addresses.A.A1),
    note: 'Test',
  });

  expect(result.body.success).toBe(false);
  expect(result.body.message).toMatch(/phương thức thanh toán/i);
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);
});

test('PAY_Checkout_10 — Từ chối đặt hàng khi địa chỉ không tồn tại', async ({ login }) => {
  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount();

  const result = await app.checkout(page.request, {
    selectedAddressId: '999999',
    paymentMethodId: '1',
    note: 'Test',
  });

  expect(result.body).toEqual({
    success: false,
    message: 'Lỗi: Địa chỉ không tồn tại trên hệ thống!',
  });
  expect(await orders.orderCount()).toBe(countBefore);
});

test('PAY_Checkout_11 — Không cho dùng địa chỉ của người dùng khác', async ({ login, data }) => {
  test.fail(true, 'BUG: JsonCheckoutServlet không kiểm tra địa chỉ thuộc người dùng nên vẫn tạo đơn với ADDR_B của Buyer B');

  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const addressOrderCountBefore = (await one('SELECT COUNT(*) AS total FROM address_order')).total;

  const result = await app.checkout(page.request, {
    selectedAddressId: String(data.addresses.B.B1),
    paymentMethodId: '1',
    note: 'Test',
  });

  expect(result.body.success).toBe(false);
  expect((await one('SELECT COUNT(*) AS total FROM address_order')).total).toBe(addressOrderCountBefore);
});

test('PAY_Checkout_12 — Từ chối phương thức thanh toán không tồn tại', async ({ login, data }) => {
  test.fail(true, 'BUG: JsonCheckoutServlet tạo đơn với snapshot "Chưa xác định" khi paymentMethodId không tồn tại');

  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.A);

  const result = await app.checkout(page.request, {
    selectedAddressId: String(data.addresses.A.A1),
    paymentMethodId: '999',
    note: 'Test',
  });

  expect(result.body.success).toBe(false);
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);
});

test('PAY_Checkout_13 — Từ chối khi mã phương thức thanh toán không phải số', async ({ login, data }) => {
  const page = await login('A');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.A);

  const result = await app.checkout(page.request, {
    selectedAddressId: String(data.addresses.A.A1),
    paymentMethodId: 'abc',
    note: 'Test',
  });

  expect(result.status).toBe(200);
  expect(result.body.success).toBe(false);
  expect(result.body.message).toMatch(/^Lỗi:/);
  expect(await orders.orderCount(data.users.A)).toBe(countBefore);
});

test('PAY_Checkout_14 — Chỉ tạo một đơn khi bấm Đặt hàng hai lần', async ({ login, data }) => {
  const page = await login('A');
  const paymentPage = await openPaymentWith(page, [['A', 1]]);
  const countBefore = await orders.orderCount(data.users.A);
  const stockBefore = await variantStock('A');

  const dialogs = app.watchDialogs(page);
  await paymentPage.placeOrderButton.dblclick();
  await expect.poll(() => dialogs.length).toBeGreaterThanOrEqual(2);
  await expect(page).toHaveURL(/\/order-history$/);

  expect(await orders.orderCount(data.users.A)).toBe(countBefore + 1);
  const orderId = await orders.latestOrderId(data.users.A);
  const details = await orders.orderDetails(orderId);
  expect(details).toHaveLength(1);
  expect(await variantStock('A')).toBe(stockBefore - 1);
});

test('PAY_Checkout_15 — Đặt hàng với địa chỉ ngoài TP.Hồ Chí Minh', async ({ login, data }) => {
  const page = await login('A');
  await appRequest(page.request).get(`/set-address-default?id=${data.addresses.A.A2}`, { maxRedirects: 0 });

  try {
    const paymentPage = await openPaymentWith(page, [['A', 1]]);
    await expect(paymentPage.addressBlock).toContainText('Hà Nội');
    await expect(paymentPage.shippingFee).toHaveText('45.000₫');
    await expect(paymentPage.total).toHaveText('145.000₫');

    const dialogs = app.watchDialogs(page);
    await paymentPage.placeOrder();
    await waitForDialogs(dialogs, 2);

    const orderId = await orders.latestOrderId(data.users.A);
    orders.saveOrder('O6', orderId);

    const order = await orders.orderById(orderId);
    expect(Number(order.shipping_fee)).toBe(45000);
    expect(Number(order.total_must_pay)).toBe(145000);
    expect(order.province_city).toBe('Hà Nội');
  } finally {
    await appRequest(page.request).get(`/set-address-default?id=${data.addresses.A.A1}`, { maxRedirects: 0 });
  }
});

test('PAY_Access_01 — Gửi yêu cầu đặt hàng khi chưa đăng nhập', async ({ guest, data }) => {
  const page = await guest();
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount();

  const result = await app.checkout(page.request, {
    selectedAddressId: String(data.addresses.A.A1),
    paymentMethodId: '1',
    note: 'Test',
  });

  expect(result.status).toBe(302);
  expect(result.location).toContain('/login');
  expect(result.body).toBeNull();
  expect(await orders.orderCount()).toBe(countBefore);
});

test('PAY_Access_02 — Gửi yêu cầu đặt hàng khi tài khoản bị khóa', async ({ login, data }) => {
  const page = await login('D');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.D);

  await app.setUserStatus(data.users.D, 'locked');
  try {
    const result = await app.checkout(page.request, {
      selectedAddressId: String(data.addresses.D.D1),
      paymentMethodId: '1',
      note: 'Test',
    });

    expect(result.status).toBe(302);
    expect(result.location).toContain('/login');
    expect(result.body).toBeNull();
    expect(await orders.orderCount(data.users.D)).toBe(countBefore);
  } finally {
    await app.setUserStatus(data.users.D, 'active');
  }
  const dUser = await one('SELECT status FROM users WHERE id = ?', [data.users.D]);
  expect(dUser.status).toBe('active');

  // Sau khi mở khóa, D đăng nhập lại và mở được trang khóa.
  const dPage = await login('D');
  await dPage.goto('/user-key');
  await expect(dPage.locator('.key-title')).toHaveText('Khóa số cá nhân');
});

test('PAY_View_07 — Hiển thị khi chưa có địa chỉ mặc định', async ({ login, data }) => {
  const page = await login('E');
  await app.clearCart(page.request);
  await app.addToCart(page.request, 'A', 1);
  const countBefore = await orders.orderCount(data.users.E);

  const paymentPage = new PaymentPage(page);
  await paymentPage.goto();

  await expect(page.locator('.alert-danger')).toContainText(
    'Bạn chưa thiết lập địa chỉ nhận hàng. Vui lòng thêm địa chỉ để tiến hành thanh toán',
  );
  await expect(page.locator('.no-address')).toContainText('Bạn chưa có địa chỉ nhận hàng.');
  await expect(page.locator('.no-address a')).toHaveText(/Thêm\s+ngay/);
  await expect(paymentPage.shippingFee).toHaveText('0₫');
  await expect(paymentPage.total).toHaveText('100.000₫');
  await expect(paymentPage.placeOrderButton).toBeDisabled();
  await expect(paymentPage.placeOrderButton).toHaveAttribute('title', 'Vui lòng thêm địa chỉ giao hàng');

  await paymentPage.placeOrderButton.dispatchEvent('click');
  await expect(page).toHaveURL(/\/view-payment$/);
  expect(await orders.orderCount(data.users.E)).toBe(countBefore);
});
