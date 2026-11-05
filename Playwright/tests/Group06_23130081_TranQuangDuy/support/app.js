'use strict';

const { BASE_URL, SLOW_CALL_TIMEOUT_MS } = require('./config');
const { loadSeed } = require('./seed');
const { exec, one } = require('./db');

/**
 * Gắn bộ thu hộp thoại native. `plan` quyết định accept/dismiss theo thứ tự;
 * mặc định accept tất cả. Trả về mảng message để assert.
 */
function watchDialogs(page, plan = []) {
  const seen = [];
  page.on('dialog', async (dialog) => {
    seen.push({ type: dialog.type(), message: dialog.message() });
    const action = plan.length > 0 ? plan.shift() : 'accept';
    try {
      await (action === 'dismiss' ? dialog.dismiss() : dialog.accept());
    } catch {
      // Dialog có thể đã bị đóng bởi navigation.
    }
  });
  return seen;
}

/**
 * Chặn treo ở bước server phải gửi email đồng bộ (EmailUtils/SMTP) hoặc gọi admin.
 * Quá hạn thì ném lỗi kèm lý do để case được đánh Failed rõ ràng thay vì treo.
 */
async function withSlowGuard(task, reason) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(
        `Quá ${SLOW_CALL_TIMEOUT_MS / 1000}s chưa có phản hồi khi ${reason}. ` +
        'Server gửi email đồng bộ (EmailUtils/SMTP) có thể đang treo nên case bị đánh Failed để không chặn thời gian chạy.',
      ));
    }, SLOW_CALL_TIMEOUT_MS);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function clearCart(request) {
  const seed = loadSeed();
  for (const product of Object.values(seed.products)) {
    await request.post('/delete-cart-item', {
      form: { id: String(product.variantId) },
      headers: { Referer: `${BASE_URL}/view-cart` },
      maxRedirects: 0,
    });
  }
}

async function addToCart(request, alias, quantity = 1) {
  const product = loadSeed().products[alias];
  const response = await request.post('/add-cart', {
    form: {
      id: String(product.variantId),
      name: product.name,
      quantity: String(quantity),
    },
    headers: { Referer: `${BASE_URL}/view-cart` },
    maxRedirects: 0,
  });
  if (response.status() !== 302) {
    throw new Error(`Không thêm được ${product.name} vào giỏ (HTTP ${response.status()})`);
  }
}

async function checkout(request, fields) {
  const response = await request.post('/checkout', { form: fields, maxRedirects: 0 });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status(), location: response.headers()['location'] || '', body };
}

async function submitSignature(request, body) {
  const response = await request.post('/process-sign-order', { data: body });
  return { status: response.status(), body: await response.json() };
}

async function setDefaultAddress(userId, addressId) {
  await exec('UPDATE user_address SET is_selected = 0 WHERE user_id = ?', [userId]);
  await exec('UPDATE user_address SET is_selected = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);
}

async function cartQuantityOnPage(page, productName) {
  const row = page.locator('.row-item').filter({ hasText: productName });
  if (await row.count() === 0) return 0;
  return Number(await row.locator('input[name="quantity"]').inputValue());
}

async function setUserStatus(userId, status) {
  await exec('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
}

async function getUserStatus(userId) {
  const row = await one('SELECT status FROM users WHERE id = ?', [userId]);
  return row.status;
}

module.exports = {
  watchDialogs,
  withSlowGuard,
  clearCart,
  addToCart,
  checkout,
  submitSignature,
  setDefaultAddress,
  cartQuantityOnPage,
  setUserStatus,
  getUserStatus,
};
