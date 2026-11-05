'use strict';

const fs = require('node:fs');
const { exec, one, query } = require('./db');
const { SEED_FILE, STATE_DIR } = require('./config');

const PASSWORD = 'Pw@12345';

/** Tài khoản test, mật khẩu giống nhau để fixture đăng nhập bằng UI một lần cho mỗi role. */
const USERS = {
  A: { fullName: 'PW Buyer A', userName: 'pwbuyera', email: 'pw.buyer.a@example.com' },
  B: { fullName: 'PW Buyer B', userName: 'pwbuyerb', email: 'pw.buyer.b@example.com' },
  C: { fullName: 'PW Buyer C', userName: 'pwbuyerc', email: 'pw.buyer.c@example.com' },
  D: { fullName: 'PW Buyer D', userName: 'pwbuyerd', email: 'pw.buyer.d@example.com' },
  E: { fullName: 'PW Buyer E', userName: 'pwbuyere', email: 'pw.buyer.e@example.com' },
  F: { fullName: 'PW Buyer F', userName: 'pwbuyerf', email: 'pw.buyer.f@example.com' },
};

/** Mỗi alias là một sản phẩm riêng (1 biến thể) để giỏ hàng/tồn kho kiểm soát độc lập. */
const PRODUCTS = {
  A: { name: 'SP_A', price: 100000, stock: 20 },
  B: { name: 'SP_B', price: 250000, stock: 20 },
  C: { name: 'SP_C', price: 150000, stock: 3 },
  D: { name: 'SP_D', price: 200000, stock: 0 },
  E: { name: 'SP_E', price: 100000, stock: 2 },
};

const ADDRESSES = {
  A: [
    {
      key: 'A1', receiverName: 'Nguyễn Văn A', phoneNumber: '0901234567',
      addressDetail: '12 Nguyễn Trãi, Quận 1', district: 'Quận 1',
      provinceCity: 'TP.Hồ Chí Minh', isSelected: 1,
    },
    {
      key: 'A2', receiverName: 'Nguyễn Văn A', phoneNumber: '0901234567',
      addressDetail: '25 Hàng Bài, Hoàn Kiếm', district: 'Hoàn Kiếm',
      provinceCity: 'Hà Nội', isSelected: 0,
    },
  ],
  B: [{
    key: 'B1', receiverName: 'Trần Thị B', phoneNumber: '0912345678',
    addressDetail: '88 Bạch Đằng, Hải Châu', district: 'Hải Châu',
    provinceCity: 'Đà Nẵng', isSelected: 1,
  }],
  D: [{
    key: 'D1', receiverName: 'Lê Văn D', phoneNumber: '0934567890',
    addressDetail: '12 Biên Hòa', district: 'Biên Hòa',
    provinceCity: 'Đồng Nai', isSelected: 1,
  }],
  // Cố ý không đặt mặc định để kiểm thử PAY_View_07.
  E: [{
    key: 'E1', receiverName: 'Phạm Thị E', phoneNumber: '0945678901',
    addressDetail: '45 Cao Lãnh', district: 'Cao Lãnh',
    provinceCity: 'Đồng Tháp', isSelected: 0,
  }],
};

const SEED_MARKER = 'PW_SEED';

let cache;

function loadSeed() {
  if (!cache) {
    if (!fs.existsSync(SEED_FILE)) {
      throw new Error('Chưa có state/seed.json. Hãy chạy `npx playwright test` để globalSetup nạp dữ liệu.');
    }
    cache = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  }
  return cache;
}

function userCredentials(alias) {
  const user = USERS[alias];
  if (!user) throw new Error(`Không có tài khoản test cho alias "${alias}"`);
  return { username: user.userName, password: PASSWORD };
}

async function ensureUser(spec) {
  await exec(
    `INSERT INTO users (role_id, full_name, user_name, email, password, status, avatar)
     VALUES (2, ?, ?, ?, MD5(?), 'active', NULL)
     ON DUPLICATE KEY UPDATE
       full_name = VALUES(full_name),
       email = VALUES(email),
       password = VALUES(password),
       role_id = 2,
       status = 'active'`,
    [spec.fullName, spec.userName, spec.email, PASSWORD],
  );
  const row = await one('SELECT id FROM users WHERE user_name = ?', [spec.userName]);
  if (!row) throw new Error(`Không tạo được tài khoản ${spec.userName}`);
  return row.id;
}

async function ensureProduct(alias, spec) {
  let product = await one(
    'SELECT id FROM products WHERE subtitle = ? AND name = ? LIMIT 1',
    [SEED_MARKER, spec.name],
  );

  if (product) {
    await exec(
      `UPDATE products
          SET min_price = ?, max_price = ?, stock = ?, status = 1, warranty_period = 12
        WHERE id = ?`,
      [spec.price, spec.price, spec.stock, product.id],
    );
  } else {
    const inserted = await exec(
      `INSERT INTO products (name, subtitle, description, min_price, max_price, status, stock, warranty_period, is_featured)
       VALUES (?, ?, ?, ?, ?, 1, ?, 12, 0)`,
      [spec.name, SEED_MARKER, SEED_MARKER, spec.price, spec.price, spec.stock],
    );
    product = { id: inserted.insertId };
  }

  const sku = `PW_${alias}`;
  const variant = await one('SELECT id FROM product_variants WHERE sku = ?', [sku]);

  if (variant) {
    await exec(
      `UPDATE product_variants
          SET product_id = ?, name = ?, price = ?, stock = ?, gram = 100, color = 'Đen', size = 'M'
        WHERE id = ?`,
      [product.id, `VAR_${alias}`, spec.price, spec.stock, variant.id],
    );
    return { productId: product.id, variantId: variant.id, name: spec.name, price: spec.price };
  }

  const inserted = await exec(
    `INSERT INTO product_variants (product_id, sku, name, price, stock, gram, color, size)
     VALUES (?, ?, ?, ?, ?, 100, 'Đen', 'M')`,
    [product.id, sku, `VAR_${alias}`, spec.price, spec.stock],
  );
  return { productId: product.id, variantId: inserted.insertId, name: spec.name, price: spec.price };
}

/**
 * Nạp dữ liệu nền (idempotent): tài khoản, địa chỉ, sản phẩm/biến thể.
 * Chạy một lần trong globalSetup, kết quả ghi ra state/seed.json cho các worker.
 */
async function seedBaseData() {
  fs.mkdirSync(STATE_DIR, { recursive: true });

  const users = {};
  for (const [alias, spec] of Object.entries(USERS)) {
    users[alias] = await ensureUser(spec);
  }

  await exec('DELETE FROM user_address WHERE user_id IN (?)', [Object.values(users)]);

  const addresses = {};
  for (const [alias, list] of Object.entries(ADDRESSES)) {
    addresses[alias] = {};
    for (const address of list) {
      const result = await exec(
        `INSERT INTO user_address
           (user_id, phone_number, address_detail, province_city, district, is_selected, receiver_name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [users[alias], address.phoneNumber, address.addressDetail, address.provinceCity,
          address.district, address.isSelected, address.receiverName],
      );
      addresses[alias][address.key] = result.insertId;
    }
  }

  const products = {};
  for (const [alias, spec] of Object.entries(PRODUCTS)) {
    products[alias] = await ensureProduct(alias, spec);
  }

  const data = { users, addresses, products, password: PASSWORD, marker: SEED_MARKER };
  fs.writeFileSync(SEED_FILE, JSON.stringify(data, null, 2), 'utf8');
  cache = data;
  return data;
}

async function setVariantStock(alias, stock) {
  const product = loadSeed().products[alias];
  await exec('UPDATE product_variants SET stock = ? WHERE id = ?', [stock, product.variantId]);
  await exec('UPDATE products SET stock = ? WHERE id = ?', [stock, product.productId]);
}

async function restoreStock() {
  for (const [alias, spec] of Object.entries(PRODUCTS)) {
    await setVariantStock(alias, spec.stock);
  }
}

async function addressRows(userId) {
  return query(
    'SELECT id, address_detail, province_city, district, is_selected FROM user_address WHERE user_id = ? ORDER BY id',
    [userId],
  );
}

module.exports = {
  USERS,
  PRODUCTS,
  ADDRESSES,
  PASSWORD,
  seedBaseData,
  loadSeed,
  userCredentials,
  setVariantStock,
  restoreStock,
  addressRows,
};
