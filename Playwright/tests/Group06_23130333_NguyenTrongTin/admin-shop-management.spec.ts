import { expect, test, type Locator, type Page } from '@playwright/test';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';

interface ShopRecord extends RowDataPacket {
  id: number;
  shop_name: string;
  shop_address: string;
  shop_phone_number: string;
  shop_hotline: string;
  shop_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  img_url: string;
  status: number;
}

interface ShopFormData {
  shop_name: string;
  shop_address: string;
  shop_phone_number: string;
  shop_hotline: string;
  img_url: string;
}

let shopListPassed = false;
let shopEditPassed = false;
let createdShopName: string | undefined;
let createdShopPhone: string | undefined;
let editedShopOriginal: ShopRecord | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    test.skip(true, `Blocked: configure ${name} in Playwright/.env.`);
    return '';
  }
  return value;
}

function requireShopWritePermission(): void {
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  const database = process.env.DB_NAME;
  test.skip(
    !allowed || database !== 'phu_kien_cong_nghe',
    `Blocked: this case writes shop data and requires ALLOW_DESTRUCTIVE_DB=true with DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database ?? 'unset'}).`,
  );
}

function databaseConfig() {
  const port = Number(process.env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535.');
  }
  return {
    host: requiredEnv('DB_HOST'),
    port,
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    database: requiredEnv('DB_NAME'),
  };
}

async function withDb<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await mysql.createConnection(databaseConfig());
  try {
    return await action(connection);
  } finally {
    await connection.end();
  }
}

async function readShop(id: number): Promise<ShopRecord | undefined> {
  return withDb(async (connection) => {
    const [rows] = await connection.execute<ShopRecord[]>(
      `SELECT id, shop_name, shop_address, shop_phone_number, shop_hotline, shop_email,
              facebook_url, instagram_url, img_url, status
       FROM contact_shops WHERE id = ?`,
      [id],
    );
    return rows[0];
  });
}

async function readShopByName(name: string): Promise<ShopRecord | undefined> {
  return withDb(async (connection) => {
    const [rows] = await connection.execute<ShopRecord[]>(
      `SELECT id, shop_name, shop_address, shop_phone_number, shop_hotline, shop_email,
              facebook_url, instagram_url, img_url, status
       FROM contact_shops WHERE shop_name = ?`,
      [name],
    );
    return rows[0];
  });
}

async function readShops(): Promise<ShopRecord[]> {
  return withDb(async (connection) => {
    const [rows] = await connection.execute<ShopRecord[]>(
      `SELECT id, shop_name, shop_address, shop_phone_number, shop_hotline, shop_email,
              facebook_url, instagram_url, img_url, status
       FROM contact_shops ORDER BY id DESC`,
    );
    return rows;
  });
}

async function searchShopsInDb(term: string): Promise<ShopRecord[]> {
  return withDb(async (connection) => {
    const pattern = `%${term}%`;
    const [rows] = await connection.execute<ShopRecord[]>(
      `SELECT id, shop_name, shop_address, shop_phone_number, shop_hotline, shop_email,
              facebook_url, instagram_url, img_url, status
       FROM contact_shops
       WHERE CAST(id AS CHAR) LIKE ? OR shop_name LIKE ? OR shop_address LIKE ?
          OR shop_phone_number LIKE ? OR shop_hotline LIKE ? OR shop_email LIKE ?
          OR facebook_url LIKE ? OR instagram_url LIKE ?
       ORDER BY id DESC`,
      Array(8).fill(pattern),
    );
    return rows;
  });
}

async function deleteCreatedShop(): Promise<void> {
  if (!createdShopName || !createdShopPhone) return;
  await withDb(async (connection) => {
    await connection.execute(
      'DELETE FROM contact_shops WHERE shop_name = ? AND shop_phone_number = ?',
      [createdShopName, createdShopPhone],
    );
  });
  createdShopName = undefined;
  createdShopPhone = undefined;
}

async function restoreEditedShop(): Promise<void> {
  if (!editedShopOriginal) return;
  const shop = editedShopOriginal;
  await withDb(async (connection) => {
    await connection.execute(
      `UPDATE contact_shops
       SET shop_name = ?, shop_address = ?, shop_phone_number = ?, shop_hotline = ?,
           shop_email = ?, facebook_url = ?, instagram_url = ?, img_url = ?, status = ?
       WHERE id = ?`,
      [
        shop.shop_name,
        shop.shop_address,
        shop.shop_phone_number,
        shop.shop_hotline,
        shop.shop_email,
        shop.facebook_url,
        shop.instagram_url,
        shop.img_url,
        shop.status,
        shop.id,
      ],
    );
  });
  editedShopOriginal = undefined;
}

function newShopData(label: string): ShopFormData {
  const token = `${Date.now()}`;
  return {
    shop_name: `PW ${label} ${token}`,
    shop_address: `Playwright test address ${token}`,
    shop_phone_number: `09${token.slice(-8)}`,
    shop_hotline: `19${token.slice(-8)}`,
    img_url: 'https://example.invalid/shop.png',
  };
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('login');
  await page.locator('form.login input[name="loginInfo"]').fill(requiredEnv('ADMIN_EMAIL'));
  await page.locator('form.login input[name="password"]').fill(requiredEnv('ADMIN_PASSWORD'));
  await page.locator('form.login input[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login(?:[?#]|$)/);

  await page.goto('admin/shop-info');
  await expect(page.getByRole('heading', { name: 'Quản lý cửa hàng' })).toBeVisible();
}

function shopArticle(page: Page, id: number) {
  return page.locator('article.record').filter({
    has: page.locator(`input[name="id"][value="${id}"]`),
  });
}

async function fillRequiredFields(
  form: Locator,
  data: ShopFormData,
): Promise<void> {
  await form.locator('[name="shop_name"]').fill(data.shop_name);
  await form.locator('[name="shop_address"]').fill(data.shop_address);
  await form.locator('[name="shop_phone_number"]').fill(data.shop_phone_number);
  await form.locator('[name="shop_hotline"]').fill(data.shop_hotline);
  await form.locator('[name="img_url"]').fill(data.img_url);
}

async function createShopThroughForm(page: Page, data: ShopFormData): Promise<void> {
  const form = page.locator('form.editor-form').first();
  await fillRequiredFields(form, data);
  await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();
  await expect(page).toHaveURL(/\/admin\/shop-info\?status=created(?:&|$)/);
}

async function postShopAction(
  page: Page,
  form: Record<string, string>,
): Promise<{ status: number; location: string | undefined }> {
  const response = await page.request.post('admin/shop-info', {
    form,
    maxRedirects: 0,
  });
  return {
    status: response.status(),
    location: response.headers().location,
  };
}

test.describe('ADM_SHOP - Admin shop management', () => {
  test('ADM_SHOP_AUTH-01: Chặn truy cập shop-info khi chưa đăng nhập', async ({ request }) => {
    const response = await request.get('admin/shop-info', { maxRedirects: 0 });
    expect(response.status()).toBe(302);
    expect(response.headers().location).toMatch(/\/login(?:[?#]|$)/);
  });

  test('ADM_SHOP_AUTH-02: Hủy session Admin khi tài khoản bị khóa trong DB', async ({ page }) => {
    requireShopWritePermission();
    const adminId = Number(requiredEnv('PW_ADMIN_SHOP_SESSION_ADMIN_ID'));
    expect(Number.isInteger(adminId) && adminId > 0).toBe(true);

    const admin = await withDb(async (connection) => {
      const [rows] = await connection.execute<
        (RowDataPacket & { id: number; email: string; status: string })[]
      >('SELECT id, email, status FROM users WHERE id = ?', [adminId]);
      return rows[0];
    });
    expect(admin, `Expected Admin fixture ID ${adminId}`).toBeDefined();
    expect(admin!.email).toBe(requiredEnv('ADMIN_EMAIL'));
    expect(admin!.status).toBe('active');

    await loginAdmin(page);
    try {
      await withDb(async (connection) => {
        await connection.execute('UPDATE users SET status = ? WHERE id = ?', ['locked', adminId]);
      });
      await page.reload();
      await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
    } finally {
      await withDb(async (connection) => {
        await connection.execute('UPDATE users SET status = ? WHERE id = ?', [admin!.status, adminId]);
      });
    }
  });

  test('ADM_SHOP_AUTH-03: Customer không truy cập được trang Admin Shop', async ({ page }) => {
    await page.goto('login');
    await page.locator('form.login input[name="loginInfo"]').fill(requiredEnv('PW_ADMIN_SHOP_CUSTOMER_EMAIL'));
    await page
      .locator('form.login input[name="password"]')
      .fill(requiredEnv('PW_ADMIN_SHOP_CUSTOMER_PASSWORD'));
    await page.locator('form.login input[type="submit"]').click();

    const response = await page.goto('admin/shop-info');
    expect(response?.status()).toBe(404);
  });

  test('ADM_SHOP_VIEW-01: Hiển thị danh sách cửa hàng theo ID giảm dần', async ({ page }) => {
    await loginAdmin(page);
    const shops = await readShops();
    const renderedIds = await page.locator('article.record').evaluateAll((articles) =>
      articles.map((article) => {
        const match = article.querySelector('small')?.textContent?.match(/Mã #(\d+)/);
        return match ? Number(match[1]) : Number.NaN;
      }),
    );

    expect(renderedIds.length).toBeGreaterThan(0);
    expect(renderedIds).toEqual(shops.map((shop) => shop.id));
    expect(renderedIds).toEqual([...renderedIds].sort((a, b) => b - a));
    shopListPassed = true;
  });

  test.describe('Shop search', () => {
    test('ADM_SHOP_SRCH-01: Tìm chính xác cửa hàng theo ID và số điện thoại', async ({ page }) => {
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      await loginAdmin(page);
      const [shop] = await readShops();
      expect(shop, 'Expected at least one shop search fixture').toBeDefined();

      const searches: Array<[string, string]> = [
        [String(shop!.id), `Mã #${shop!.id}`],
        [shop!.shop_phone_number, shop!.shop_phone_number],
      ];
      for (const [term, expected] of searches) {
        await page.locator('#shop-search').fill(term);
        await page.getByRole('button', { name: 'Tìm kiếm' }).click();
        await expect(page).toHaveURL(/\/admin\/shop-info\?q=/);
        const results = page.locator('article.record');
        await expect(results).toHaveCount(1);
        await expect(results).toContainText(expected);
      }
    });

    test('ADM_SHOP_SRCH-02: Tìm tương đối theo thông tin cửa hàng', async ({ page }) => {
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      const term = process.env.PW_ADMIN_SHOP_FUZZY_TERM?.trim() || 'Cầu Giấy';
      const fixtures = await searchShopsInDb(term);
      test.skip(fixtures.length === 0, `Blocked: no shop fixture contains "${term}".`);

      await loginAdmin(page);
      await page.locator('#shop-search').fill(term);
      await page.getByRole('button', { name: 'Tìm kiếm' }).click();
      await expect(page.locator('article.record')).toHaveCount(fixtures.length);
      for (const article of await page.locator('article.record').all()) {
        await expect(article).toContainText(new RegExp(term, 'i'));
      }
    });

    test('ADM_SHOP_SRCH-03: Hiển thị rỗng khi không có kết quả', async ({ page }) => {
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      const fixtures = await searchShopsInDb('XYZ123');
      test.skip(fixtures.length > 0, 'Blocked: XYZ123 exists in the configured shop database.');

      await loginAdmin(page);
      await page.locator('#shop-search').fill('XYZ123');
      await page.getByRole('button', { name: 'Tìm kiếm' }).click();
      await expect(page.locator('[data-testid="search-empty-state"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-results-count"]')).toContainText('0 cửa hàng');
      await expect(page.locator('article.record')).toHaveCount(0);
    });
  });

  test.describe('Shop creation validation', () => {
    test.describe.configure({ mode: 'serial' });

    test('ADM_SHOP_CREATE-01: Không gửi form khi thiếu trường bắt buộc', async ({ page }) => {
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      await loginAdmin(page);
      const form = page.locator('form.editor-form').first();
      const data = newShopData('required');
      const requiredFields = [
        'shop_name',
        'shop_address',
        'shop_phone_number',
        'shop_hotline',
        'img_url',
      ];
      let postSent = false;
      const requestListener = (request: { url(): string; method(): string }) => {
        if (request.url().includes('/admin/shop-info') && request.method() === 'POST') postSent = true;
      };
      page.on('request', requestListener);

      try {
        for (const missingField of requiredFields) {
          await fillRequiredFields(form, data);
          await form.locator(`[name="${missingField}"]`).fill('');
          await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();
          expect(
            await form.locator(`[name="${missingField}"]`).evaluate((element) =>
              (element as HTMLInputElement).validity.valueMissing,
            ),
          ).toBe(true);
          expect(postSent).toBe(false);
        }
      } finally {
        page.off('request', requestListener);
      }
    });

    test('ADM_SHOP_UX-01: Giữ dữ liệu form khi thiếu Hotline', async ({ page }) => {
      await loginAdmin(page);
      const form = page.locator('form.editor-form').first();
      const data = newShopData('retained');
      await fillRequiredFields(form, data);
      await form.locator('[name="shop_hotline"]').fill('');
      await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();

      await expect(form.locator('[name="shop_name"]')).toHaveValue(data.shop_name);
      await expect(form.locator('[name="shop_address"]')).toHaveValue(data.shop_address);
      expect(
        await form.locator('[name="shop_hotline"]').evaluate((element) =>
          (element as HTMLInputElement).validity.valueMissing,
        ),
      ).toBe(true);
    });
  });

  test('ADM_SHOP_CREATE-02: Thêm cửa hàng khi các trường tùy chọn để trống', async ({ page }) => {
    requireShopWritePermission();
    if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
    await loginAdmin(page);
    const data = newShopData('optional');
    createdShopName = data.shop_name;
    createdShopPhone = data.shop_phone_number;

    try {
      await createShopThroughForm(page, data);
      const created = await readShopByName(data.shop_name);
      expect(created).toMatchObject({
        shop_name: data.shop_name,
        shop_phone_number: data.shop_phone_number,
        shop_email: null,
        facebook_url: null,
        instagram_url: null,
      });
    } finally {
      await deleteCreatedShop();
    }
  });

  test('ADM_SHOP_CREATE-03: Chỉ giữ một cửa hàng ở trạng thái hoạt động', async ({ page }) => {
    requireShopWritePermission();
    if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
    const originalStatuses = await withDb(async (connection) => {
      const [rows] = await connection.execute<(RowDataPacket & { id: number; status: number })[]>(
        'SELECT id, status FROM contact_shops',
      );
      return rows;
    });
    const data = newShopData('active');
    createdShopName = data.shop_name;
    createdShopPhone = data.shop_phone_number;

    try {
      await loginAdmin(page);
      const form = page.locator('form.editor-form').first();
      await fillRequiredFields(form, data);
      await form.locator('[name="status"]').check();
      await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();
      await expect(page).toHaveURL(/\/admin\/shop-info\?status=created(?:&|$)/);

      const created = await readShopByName(data.shop_name);
      expect(created).toBeDefined();
      expect(Number(created!.status)).toBe(1);
      const remainingActive = await withDb(async (connection) => {
        const [rows] = await connection.execute<(RowDataPacket & { id: number })[]>(
          'SELECT id FROM contact_shops WHERE status = 1',
        );
        return rows;
      });
      expect(remainingActive.map((row) => row.id)).toEqual([created!.id]);
    } finally {
      try {
        await deleteCreatedShop();
      } finally {
        await withDb(async (connection) => {
          for (const shop of originalStatuses) {
            await connection.execute('UPDATE contact_shops SET status = ? WHERE id = ?', [
              shop.status,
              shop.id,
            ]);
          }
        });
      }
    }
  });

  test('ADM_SHOP_EDIT-01: Từ chối cập nhật với ID sai định dạng', async ({ page }) => {
    await loginAdmin(page);
    const result = await postShopAction(page, {
      action: 'update',
      id: 'abc',
      shop_name: 'Invalid ID test',
      shop_address: 'Test address',
      shop_phone_number: '0900000000',
      shop_hotline: '1900000000',
      img_url: 'https://example.invalid/shop.png',
    });
    expect(result.status).toBe(400);
  });

  test('ADM_SHOP_EDIT-02: Trả về Not Found khi ID cập nhật không tồn tại', async ({ page }) => {
    const shop = await readShop(99999);
    test.skip(shop !== undefined, 'Blocked: fixture ID 99999 exists; configure a missing shop ID.');
    await loginAdmin(page);
    const result = await postShopAction(page, {
      action: 'update',
      id: '99999',
      shop_name: 'Missing shop test',
      shop_address: 'Test address',
      shop_phone_number: '0900000000',
      shop_hotline: '1900000000',
      img_url: 'https://example.invalid/shop.png',
    });
    expect(result.status).toBe(404);
  });

  test.describe('Shop edit and active-status dependency', () => {
    test.describe.configure({ mode: 'serial' });

    test('ADM_SHOP_EDIT-03: Cập nhật tên và số điện thoại cửa hàng', async ({ page }) => {
      requireShopWritePermission();
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      const id = Number(process.env.PW_ADMIN_SHOP_EDIT_ID || 1);
      editedShopOriginal = await readShop(id);
      expect(editedShopOriginal, `Expected shop fixture ID ${id}`).toBeDefined();

      try {
        await loginAdmin(page);
        const article = shopArticle(page, id);
        await article.locator('details.record-edit > summary').click();
        const form = article.locator('form.editor-form');
        const updatedName = `PW Edited Shop ${Date.now()}`;
        const updatedPhone = `08${Date.now().toString().slice(-8)}`;
        await form.locator('[name="shop_name"]').fill(updatedName);
        await form.locator('[name="shop_phone_number"]').fill(updatedPhone);
        await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
        await expect(page).toHaveURL(/\/admin\/shop-info\?status=updated(?:&|$)/);

        expect(await readShop(id)).toMatchObject({
          shop_name: updatedName,
          shop_phone_number: updatedPhone,
        });
        shopEditPassed = true;
      } finally {
        await restoreEditedShop();
      }
    });

    test('ADM_SHOP_EDIT-04: Chuyển shop sang hoạt động và ẩn các shop còn lại', async ({ page }) => {
      requireShopWritePermission();
      if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
      if (!shopEditPassed) test.skip(true, 'Blocked: ADM_SHOP_EDIT-03 did not pass.');
      const originalStatuses = await withDb(async (connection) => {
        const [rows] = await connection.execute<(RowDataPacket & { id: number; status: number })[]>(
          'SELECT id, status FROM contact_shops ORDER BY id',
        );
        return rows;
      });
      const activeShop = originalStatuses.find((shop) => Number(shop.status) === 1);
      const inactiveShop = originalStatuses.find((shop) => Number(shop.status) === 0);
      test.skip(!activeShop || !inactiveShop, 'Blocked: requires one active and one inactive shop fixture.');
      expect(activeShop!.id).not.toBe(inactiveShop!.id);

      try {
        await loginAdmin(page);
        const article = shopArticle(page, inactiveShop!.id);
        await article.locator('details.record-edit > summary').click();
        const form = article.locator('form.editor-form');
        await form.locator('[name="status"]').check();
        await form.getByRole('button', { name: 'Lưu thay đổi' }).click();
        await expect(page).toHaveURL(/\/admin\/shop-info\?status=updated(?:&|$)/);

        expect(Number((await readShop(inactiveShop!.id))?.status)).toBe(1);
        expect(Number((await readShop(activeShop!.id))?.status)).toBe(0);
      } finally {
        await withDb(async (connection) => {
          for (const shop of originalStatuses) {
            await connection.execute('UPDATE contact_shops SET status = ? WHERE id = ?', [
              shop.status,
              shop.id,
            ]);
          }
        });
      }
    });
  });

  test('ADM_SHOP_DEL-01: Từ chối xóa với ID sai định dạng', async ({ page }) => {
    await loginAdmin(page);
    const result = await postShopAction(page, { action: 'delete', id: 'xyz' });
    expect(result.status).toBe(400);
  });

  test('ADM_SHOP_DEL-02: Chấp nhận yêu cầu xóa với ID hợp lệ nhưng không tồn tại', async ({ page }) => {
    const shop = await readShop(88888);
    test.skip(shop !== undefined, 'Blocked: fixture ID 88888 exists; refusing to target an existing shop.');
    await loginAdmin(page);
    const result = await postShopAction(page, { action: 'delete', id: '88888' });
    expect(result.status).toBe(302);
    expect(result.location).toMatch(/\/admin\/shop-info\?status=deleted/);
  });

  test('ADM_SHOP_DEL-03: Xóa thành công cửa hàng tạm do test tạo', async ({ page }) => {
    requireShopWritePermission();
    if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
    const data = newShopData('delete');
    createdShopName = data.shop_name;
    createdShopPhone = data.shop_phone_number;

    try {
      await loginAdmin(page);
      await createShopThroughForm(page, data);
      const created = await readShopByName(data.shop_name);
      expect(created, 'Expected the test-owned temporary shop to be created').toBeDefined();

      const article = shopArticle(page, created!.id);
      const deleteForm = article.locator('form').filter({
        has: page.locator('input[name="action"][value="delete"]'),
      });
      let confirmation = '';
      page.once('dialog', async (dialog) => {
        confirmation = dialog.message();
        await dialog.accept();
      });
      await deleteForm.getByRole('button', { name: 'Xóa' }).click();
      await expect(page).toHaveURL(/\/admin\/shop-info\?status=deleted/);
      expect(confirmation).toBe('Xóa cửa hàng này?');
      expect(await readShop(created!.id)).toBeUndefined();
      createdShopName = undefined;
      createdShopPhone = undefined;
    } finally {
      await deleteCreatedShop();
    }
  });

  test('ADM_SHOP_SEC-01: Lưu và hiển thị đúng URL Facebook, Instagram', async ({ page }) => {
    requireShopWritePermission();
    if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
    const data = newShopData('social');
    createdShopName = data.shop_name;
    createdShopPhone = data.shop_phone_number;
    const facebookUrl = 'https://facebook.com/myshop';
    const instagramUrl = 'https://instagram.com/myshop';

    try {
      await loginAdmin(page);
      const form = page.locator('form.editor-form').first();
      await fillRequiredFields(form, data);
      await form.locator('[name="facebook_url"]').fill(facebookUrl);
      await form.locator('[name="instagram_url"]').fill(instagramUrl);
      await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();
      await expect(page).toHaveURL(/\/admin\/shop-info\?status=created(?:&|$)/);

      const saved = await readShopByName(data.shop_name);
      expect(saved).toMatchObject({ facebook_url: facebookUrl, instagram_url: instagramUrl });
      const article = shopArticle(page, saved!.id);
      await article.locator('details.record-edit > summary').click();
      await expect(article.locator('[name="facebook_url"]')).toHaveValue(facebookUrl);
      await expect(article.locator('[name="instagram_url"]')).toHaveValue(instagramUrl);
      await expect(article.locator(`a[href="${facebookUrl}"]`)).toBeVisible();
      await expect(article.locator(`a[href="${instagramUrl}"]`)).toBeVisible();
    } finally {
      await deleteCreatedShop();
    }
  });

  test('ADM_SHOP_SEC-02: Escape nội dung XSS khi hiển thị tên cửa hàng', async ({ page }) => {
    requireShopWritePermission();
    if (!shopListPassed) test.skip(true, 'Blocked: ADM_SHOP_VIEW-01 did not pass.');
    const data = newShopData('xss');
    const payload = "<script>alert('XSS')</script>";
    data.shop_name = payload;
    createdShopName = data.shop_name;
    createdShopPhone = data.shop_phone_number;
    let scriptDialogOpened = false;

    try {
      await loginAdmin(page);
      const form = page.locator('form.editor-form').first();
      await fillRequiredFields(form, data);
      page.on('dialog', async (dialog) => {
        scriptDialogOpened = true;
        await dialog.dismiss();
      });
      await form.getByRole('button', { name: 'Thêm cửa hàng' }).click();
      await expect(page).toHaveURL(/\/admin\/shop-info\?status=created(?:&|$)/);

      const created = await readShopByName(payload);
      expect(created).toBeDefined();
      const article = shopArticle(page, created!.id);
      await expect(article.locator('h3')).toContainText(payload);
      await expect(article.locator('h3 script')).toHaveCount(0);
      expect(scriptDialogOpened).toBe(false);
    } finally {
      await deleteCreatedShop();
    }
  });
});
