'use strict';

const fs = require('node:fs');
const { exec, one, query } = require('./db');
const { ORDERS_FILE, STATE_DIR, BASE_URL, SLOW_CALL_TIMEOUT_MS } = require('./config');
const { loadSeed } = require('./seed');

function readMap() {
  if (!fs.existsSync(ORDERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
}

function saveOrder(key, orderId) {
  const map = readMap();
  map[key] = orderId;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(map, null, 2), 'utf8');
}

function savedOrderId(key) {
  return readMap()[key] || null;
}

async function latestOrderId(userId) {
  const row = await one('SELECT MAX(id) AS id FROM orders WHERE user_id = ?', [userId]);
  return row && row.id ? row.id : null;
}

async function orderCount(userId) {
  const row = userId
    ? await one('SELECT COUNT(*) AS total FROM orders WHERE user_id = ?', [userId])
    : await one('SELECT COUNT(*) AS total FROM orders');
  return row.total;
}

async function orderById(orderId) {
  return one(
    `SELECT o.*, ao.receiver_name, ao.phone_number, ao.address_detail, ao.district, ao.province_city,
            ao.note AS address_note
       FROM orders o
       JOIN address_order ao ON ao.id = o.address_order_id
      WHERE o.id = ?`,
    [orderId],
  );
}

async function orderDetails(orderId) {
  return query(
    `SELECT id, order_id, product_variant_id, product_name_snapshot, variant_name_snapshot,
            sku_snapshot, variant_price_snapshot, quantity, price_total
       FROM order_details WHERE order_id = ? ORDER BY id`,
    [orderId],
  );
}

async function orderIsSignable(orderId, userId) {
  const row = await orderById(orderId);
  if (!row || row.user_id !== userId) return false;
  if (!['pending_signature', 'waiting_re_sign'].includes(row.status_order)) return false;
  return new Date(row.expire_sign_key).getTime() > Date.now();
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

/**
 * Tạo đơn thật qua API của ứng dụng (dùng cho 4.3 khi chạy độc lập, không cần 4.2).
 * Trả về id đơn mới nhất của người dùng.
 */
async function createOrderThroughApp(request, { user, items, addressId, paymentMethodId = 1, note = '' }) {
  const seed = loadSeed();
  await clearCart(request);
  for (const item of items) {
    await addToCart(request, item.alias, item.quantity);
  }

  const response = await request.post('/checkout', {
    form: {
      selectedAddressId: String(addressId),
      note,
      paymentMethodId: String(paymentMethodId),
    },
  });
  const body = await response.json();
  if (!body.success) {
    throw new Error(`Không tạo được đơn dự phòng: ${body.message}`);
  }
  return latestOrderId(seed.users[user]);
}

function formatDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/** Đơn chuẩn bị trực tiếp trong DB (ORDER_B, ORDER_DSA, ORDER_F, ORDER_EXPIRED, ORDER_APPROVED). */
async function createPreparedOrder({
  user,
  items = [{ alias: 'A', quantity: 1 }],
  status = 'pending_signature',
  paymentMethod = 'Thanh toán khi nhận hàng',
  shippingFee = 25000,
  note = '',
  expireSignKey = formatDateTime(new Date(Date.now() + 2 * 86_400_000)),
  receiver = { name: 'PW Receiver', phone: '0900000000', province: 'TP.Hồ Chí Minh', district: 'Quận 1', detail: '1 PW Street' },
}) {
  const seed = loadSeed();
  const userId = seed.users[user];
  const total = items.reduce((sum, item) => sum + seed.products[item.alias].price * item.quantity, 0) + shippingFee;

  const address = await exec(
    `INSERT INTO address_order (receiver_name, phone_number, address_detail, district, province_city, note)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [receiver.name, receiver.phone, receiver.detail, receiver.district, receiver.province, note],
  );

  const order = await exec(
    `INSERT INTO orders
       (user_id, payment_method_snapshot, address_order_id, status_order, total_must_pay,
        order_date, shipping_fee, note, expire_sign_key)
     VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
    [userId, paymentMethod, address.insertId, status, total, shippingFee, note, expireSignKey],
  );

  for (const item of items) {
    const product = seed.products[item.alias];
    await exec(
      `INSERT INTO order_details
         (order_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot,
          variant_price_snapshot, gram_snapshot, color_snapshot, size_snapshot, quantity, price_total)
       VALUES (?, ?, ?, ?, ?, ?, 100, 'Đen', 'M', ?, ?)`,
      [order.insertId, product.variantId, product.name, `VAR_${item.alias}`, `PW_${item.alias}`,
        product.price, item.quantity, product.price * item.quantity],
    );
  }

  return order.insertId;
}

/** Payload đúng định dạng JsonUpdateOrderServlet mong đợi (mảng id dạng chuỗi). */
async function adminEditPayload(orderId, { quantities } = {}) {
  const order = await orderById(orderId);
  const details = await orderDetails(orderId);

  return {
    orderId,
    receiverName: order.receiver_name,
    phoneNumber: order.phone_number,
    addressDetail: order.address_detail,
    province: order.province_city,
    district: order.district || '',
    orderDetailIds: details.map((detail) => String(detail.id)),
    variantIds: details.map((detail) => String(detail.product_variant_id)),
    quantities: details.map((detail, index) => {
      const value = quantities && quantities[index] !== undefined ? quantities[index] : detail.quantity;
      return String(value);
    }),
  };
}

async function adminEditOrder(request, orderId, options) {
  const payload = await adminEditPayload(orderId, options);
  try {
    const response = await request.post('/update-order', {
      data: payload,
      timeout: SLOW_CALL_TIMEOUT_MS,
    });
    return { status: response.status(), body: await response.json() };
  } catch (error) {
    if (error.name === 'TimeoutError' || /timeout/i.test(error.message)) {
      throw new Error(
        `Quá ${SLOW_CALL_TIMEOUT_MS / 1000}s chưa nhận phản hồi POST /update-order (Admin sửa đơn phải gửi email đồng bộ). ` +
        'Kiểm tra EmailUtils/SMTP rồi chạy lại; case bị đánh Failed để không chặn thời gian chạy.',
      );
    }
    throw error;
  }
}

async function setDefaultAddress(userId, addressId) {
  await exec('UPDATE user_address SET is_selected = 0 WHERE user_id = ?', [userId]);
  await exec('UPDATE user_address SET is_selected = 1 WHERE id = ? AND user_id = ?', [addressId, userId]);
}

module.exports = {
  readMap,
  saveOrder,
  savedOrderId,
  latestOrderId,
  orderCount,
  orderById,
  orderDetails,
  orderIsSignable,
  clearCart,
  addToCart,
  createOrderThroughApp,
  createPreparedOrder,
  adminEditOrder,
  formatDateTime,
  setDefaultAddress,
};
