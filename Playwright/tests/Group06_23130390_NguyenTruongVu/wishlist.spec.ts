import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const BASE_URL = requiredEnv('BASE_URL');
const USER_PASSWORD = requiredEnv('USER_PASSWORD');
const USER_EMAIL = requiredEnv('USER_EMAIL');
const WISHLIST_USER5_EMAIL = requiredEnv('PW_WISHLIST_USER5_EMAIL');
const WISHLIST_USER6_EMAIL = requiredEnv('PW_WISHLIST_USER6_EMAIL');
const WISHLIST_USER7_EMAIL = requiredEnv('PW_WISHLIST_USER7_EMAIL');

function appUrl(path: string): string {
  const base = new URL(BASE_URL);
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;
  return new URL(path.replace(/^\/+/, ''), base).toString();
}

function dbConfig() {
  const host = requiredEnv('DB_HOST');
  const user = requiredEnv('DB_USER');
  const database = requiredEnv('DB_NAME');
  const password = process.env.DB_PASSWORD;
  const port = Number(requiredEnv('DB_PORT'));
  if (password === undefined) {
    throw new Error('Missing required environment variable: DB_PASSWORD');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }
  return { host, user, database, password, port };
}

async function withDb<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
  const connection = await mysql.createConnection(dbConfig());
  try {
    return await action(connection);
  } finally {
    await connection.end();
  }
}

function requireDestructiveDbPermission(): void {
  const database = process.env.DB_NAME;
  const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
  test.skip(
    !allowed || database !== 'phu_kien_cong_nghe',
    `Blocked: database-writing test requires ALLOW_DESTRUCTIVE_DB=true and DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database ?? 'unset'}, ALLOW_DESTRUCTIVE_DB=${process.env.ALLOW_DESTRUCTIVE_DB ?? 'unset'}).`,
  );
}

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto(appUrl('login'));
  await page.locator('input[placeholder*="Tên đăng nhập"], input[name="username"], input[name="email"]')
    .fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForLoadState('networkidle');
}

async function createUser5Session(browser: Browser): Promise<{
  context: BrowserContext;
  page: Page;
}> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, WISHLIST_USER5_EMAIL, USER_PASSWORD);
  return { context, page };
}

async function wishlistCount(connection: Connection, userId: number, productId: number): Promise<number> {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM wishlists WHERE user_id = ? AND product_id = ?',
    [userId, productId],
  );
  return Number(rows[0]?.total ?? 0);
}

function productCard(page: Page, productId: number) {
  return page.locator('.wishlist-card').filter({
    has: page.locator(`a[href*="product-detail?id=${productId}"]`),
  });
}

interface PrerequisiteStore {
  runId: number;
  results: Record<string, boolean>;
}

const runId = process.ppid;
const prerequisiteStorePath = path.resolve(
  process.cwd(),
  'test-results',
  `wishlist-prerequisites-${runId}.json`,
);
const addLoginStorageStatePath = path.resolve(
  process.cwd(),
  'test-results',
  `wishlist-add-login-${runId}.json`,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPrerequisiteStore(): PrerequisiteStore {
  const parsed: unknown = JSON.parse(readFileSync(prerequisiteStorePath, 'utf8'));
  if (!isRecord(parsed) || parsed.runId !== runId || !isRecord(parsed.results)) {
    throw new Error('Wishlist prerequisite result file is invalid or belongs to a different test run.');
  }
  const results: Record<string, boolean> = {};
  for (const [caseId, passed] of Object.entries(parsed.results)) {
    if (typeof passed !== 'boolean') {
      throw new Error(`Invalid prerequisite result for ${caseId}.`);
    }
    results[caseId] = passed;
  }
  return { runId, results };
}

function initializePrerequisiteStore(workerIndex: number): void {
  mkdirSync(path.dirname(prerequisiteStorePath), { recursive: true });
  if (workerIndex === 0) {
    writeFileSync(prerequisiteStorePath, JSON.stringify({ runId, results: {} }));
    if (existsSync(addLoginStorageStatePath)) {
      unlinkSync(addLoginStorageStatePath);
    }
    return;
  }
  readPrerequisiteStore();
}

function recordPrerequisiteResult(caseId: string, passed: boolean): void {
  const store = readPrerequisiteStore();
  store.results[caseId] = passed;
  writeFileSync(prerequisiteStorePath, JSON.stringify(store));
}

const dependencies: Record<string, string[]> = {
  'WISHLIST_View-2': ['WISHLIST_View-1'],
  'WISHLIST_Add-3': ['WISHLIST_Add-2'],
  'WISHLIST_Add-5': ['WISHLIST_Add-4'],
  'WISHLIST_View-4': ['WISHLIST_Add-4'],
  'WISHLIST_View-5': ['WISHLIST_View-4'],
  'WISHLIST_Remove-1': ['WISHLIST_View-4'],
  'WISHLIST_Move-1': ['WISHLIST_View-4'],
  'WISHLIST_Move-2': ['WISHLIST_Move-1'],
  'WISHLIST_Move-3': ['WISHLIST_View-4'],
  'WISHLIST_Move-4': ['WISHLIST_View-4'],
  'WISHLIST_DB-1': ['WISHLIST_Add-4'],
  'WISHLIST_DB-2': ['WISHLIST_Remove-1'],
  'WISHLIST_DB-3': ['WISHLIST_DB-2'],
};

let sharedContext: BrowserContext | undefined;
let sharedPage: Page;

test.describe('WISHLIST - Quản lý sản phẩm yêu thích', () => {
  test.describe.configure({ mode: 'default' });

  test.beforeAll(({}, testInfo) => {
    initializePrerequisiteStore(testInfo.workerIndex);
  });

  test.beforeEach(async ({ browser }, testInfo) => {
    const caseId = testInfo.title.match(/\[(WISHLIST_[^\]]+)\]/)?.[1];
    if ([
      'WISHLIST_Add-4',
      'WISHLIST_Add-5',
      'WISHLIST_Add-6',
      'WISHLIST_View-4',
      'WISHLIST_View-5',
      'WISHLIST_Remove-1',
      'WISHLIST_Move-1',
      'WISHLIST_Move-2',
      'WISHLIST_Move-3',
      'WISHLIST_Move-4',
    ].includes(caseId ?? '') || caseId?.startsWith('WISHLIST_DB-')) {
      return;
    }
    const storageState = caseId === 'WISHLIST_Add-3' && existsSync(addLoginStorageStatePath)
      ? addLoginStorageStatePath
      : undefined;
    sharedContext = await browser.newContext({ storageState });
    sharedPage = await sharedContext.newPage();
  });

  test.afterEach(async ({}, testInfo) => {
    const caseId = testInfo.title.match(/\[(WISHLIST_[^\]]+)\]/)?.[1];
    if (caseId) {
      recordPrerequisiteResult(caseId, testInfo.status === 'passed');
      if (caseId === 'WISHLIST_Add-2' && testInfo.status === 'passed') {
        if (!sharedContext) {
          throw new Error('WISHLIST_Add-2 completed without its browser context.');
        }
        writeFileSync(addLoginStorageStatePath, JSON.stringify(await sharedContext.storageState()));
      }
    }
    await sharedContext?.close();
    sharedContext = undefined;
  });

  function blockIfPrerequisiteFailed(caseId: string): void {
    for (const prerequisite of dependencies[caseId] ?? []) {
      test.skip(readPrerequisiteStore().results[prerequisite] !== true,
        `Blocked: prerequisite [${prerequisite}] did not pass.`);
    }
  }

  test.describe('Independent: WISHLIST_Add-1', () => {
    test('[WISHLIST_Add-1] Kiểm tra vị trí và giao diện nút Thêm vào Wishlist', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-1');
      await sharedPage.goto(appUrl('product-detail?id=101'));
      await expect(sharedPage.locator('.add-to-wishlist-btn')).toHaveText(/LƯU VÀO WISHLIST/);
      await expect(sharedPage.locator('.add-to-wishlist-form')).toBeVisible();
      await expect(sharedPage.locator('.product-details'))
        .toContainText('Sản phẩm được lưu theo sản phẩm chung; bạn chọn biến thể khi thêm vào giỏ.');
    });
  });

  test.describe('Dependency chain: WISHLIST_View-1 -> WISHLIST_View-2', () => {
    test.describe.configure({ mode: 'serial' });

    test('[WISHLIST_View-1] Kiểm tra truy cập trực tiếp URL /wishlist dưới quyền Guest', async () => {
      blockIfPrerequisiteFailed('WISHLIST_View-1');
      await sharedPage.goto(appUrl('wishlist'));
      await expect(sharedPage.locator('.wishlist-message.guest'))
        .toHaveText('Bạn có thể xem trang này khi chưa đăng nhập. Hãy đăng nhập để lưu sản phẩm vào wishlist gắn với tài khoản của bạn.');
      await expect(sharedPage.getByRole('link', { name: 'Đăng nhập để lưu sản phẩm' }))
        .toHaveAttribute('href', /\/login\?continue=wishlist$/);
    });

    test('[WISHLIST_View-2] Kiểm tra hiển thị trang Wishlist trống của Guest', async () => {
      blockIfPrerequisiteFailed('WISHLIST_View-2');
      await sharedPage.goto(appUrl('wishlist'));
      await expect(sharedPage.getByRole('heading', { name: 'Đăng nhập để xem wishlist của bạn' })).toBeVisible();
      await expect(sharedPage.locator('.wishlist-empty'))
        .toContainText('Sau khi đăng nhập, các sản phẩm yêu thích sẽ được lưu theo tài khoản.');
    });
  });

  test.describe('Independent: WISHLIST_View-6', () => {
    test('[WISHLIST_View-6] Kiểm tra biểu tượng Wishlist trên Header', async () => {
      blockIfPrerequisiteFailed('WISHLIST_View-6');
      await sharedPage.goto(appUrl(''));
      const wishlistLink = sharedPage.locator('.wishlist-header-link');
      await expect(wishlistLink).toHaveAttribute('href', /\/wishlist$/);
      await expect(wishlistLink.locator('[class*="badge"]')).toHaveCount(0);
    });
  });

  test.describe('Dependency chain: WISHLIST_Add-2 -> WISHLIST_Add-3', () => {
    test.describe.configure({ mode: 'serial' });

    test('[WISHLIST_Add-2] Kiểm tra Guest bấm Thêm vào Wishlist bị chuyển hướng sang Đăng nhập', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-2');
      await sharedPage.goto(appUrl('product-detail?id=101'));
      await sharedPage.locator('.add-to-wishlist-btn').click();
      await expect(sharedPage).toHaveURL(/\/login(?:\?|$)/);
    });

    test('[WISHLIST_Add-3] Kiểm tra điều hướng quay lại trang sản phẩm sau khi Guest đăng nhập', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-3');
      await login(sharedPage, WISHLIST_USER5_EMAIL, USER_PASSWORD);
      await expect(sharedPage).toHaveURL(/\/product-detail\?id=101$/);
    });
  });

  test.describe('Dependency chain: WISHLIST_Add-4 -> WISHLIST_Add-5', () => {
    test.describe.configure({ mode: 'serial' });
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Add-4] Kiểm tra User đã đăng nhập thêm sản phẩm vào Wishlist thành công', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-4');
      requireDestructiveDbPermission();
      await user5Page.goto(appUrl('product-detail?id=101'));
      await user5Page.locator('.add-to-wishlist-btn').click();
      await expect(user5Page).toHaveURL(/\/product-detail\?id=101&wishlist=added$/);
      await expect(user5Page.getByRole('status')).toContainText('Đã lưu sản phẩm này vào wishlist.');
      await expect(user5Page.getByRole('link', { name: 'Xem wishlist' })).toBeVisible();
      await withDb(async connection => {
        expect(await wishlistCount(connection, 5, 101)).toBe(1);
      });
    });

    test('[WISHLIST_Add-5] Kiểm tra bấm lưu sản phẩm ĐÃ TỒN TẠI trong Wishlist (Idempotent)', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-5');
      requireDestructiveDbPermission();
      const before = await withDb(connection => wishlistCount(connection, 5, 101));
      await user5Page.goto(appUrl('product-detail?id=101'));
      await user5Page.locator('.add-to-wishlist-btn').click();
      await expect(user5Page).toHaveURL(/\/product-detail\?id=101&wishlist=added$/);
      await expect(user5Page.getByRole('status')).toContainText('Đã lưu sản phẩm này vào wishlist.');
      const after = await withDb(connection => wishlistCount(connection, 5, 101));
      expect(after).toBe(before);
    });
  });

  test.describe('Independent: WISHLIST_Add-6', () => {
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Add-6] Kiểm tra thêm sản phẩm bị Admin ẩn vào Wishlist', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Add-6');
      requireDestructiveDbPermission();
      const before = await withDb(connection => wishlistCount(connection, 5, 102));
      const response = await user5Context.request.post(appUrl('wishlist'), {
        form: { action: 'add', productId: '102' },
        maxRedirects: 0,
      });
      const location = response.headers().location;
      expect(response.status()).toBe(302);
      expect(location).toMatch(/\/product-detail\?id=102&wishlist=unavailable$/);
      // Lệch app: server redirect đúng, nhưng trang chi tiết sản phẩm ẩn chuyển về trang chủ nên alert không hiện.
      await user5Page.goto(new URL(location ?? '', BASE_URL).toString());
      await expect(user5Page.getByRole('alert'))
        .toContainText('Sản phẩm hiện không khả dụng để lưu vào wishlist.');
      const after = await withDb(connection => wishlistCount(connection, 5, 102));
      expect(after).toBe(before);
    });
  });

  test.describe('Dependency chain: WISHLIST_View-4 -> WISHLIST_View-5', () => {
    test.describe.configure({ mode: 'serial' });
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_View-4] Kiểm tra thông tin hiển thị trên Card sản phẩm trong Wishlist', async () => {
      blockIfPrerequisiteFailed('WISHLIST_View-4');
      await user5Page.goto(appUrl('wishlist'));
      const card = productCard(user5Page, 101);
      await expect(card).toBeVisible();
      await expect(card.locator('.wishlist-product-image img, .wishlist-product-image i')).toBeVisible();
      await expect(card.locator('.wishlist-product-name'))
        .toHaveAttribute('href', /\/product-detail\?id=101$/);
      await expect(card.locator('.wishlist-product-price')).toHaveText(/Từ [\d,.]+₫/);
      await expect(card.locator('form.wishlist-add-form')).toBeVisible();
      await expect(card.locator('select[name="variantId"]')).toBeVisible();
      await expect(card.locator('input[name="quantity"]')).toHaveValue('1');
      await expect(card.getByRole('button', { name: 'Thêm vào giỏ' })).toBeVisible();
      await expect(card.getByRole('button', { name: 'Xóa sản phẩm khỏi wishlist' })).toBeVisible();
    });

    test('[WISHLIST_View-5] Kiểm tra định dạng thông tin biến thể trong Dropdown', async () => {
      blockIfPrerequisiteFailed('WISHLIST_View-5');
      const select = productCard(user5Page, 101).locator('select[name="variantId"]');
      await expect(select.locator('option')).not.toHaveCount(0);
      const options = await select.locator('option').allTextContents();
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) {
        expect(option.trim()).toMatch(/^.+ · .+ · [\d,]+₫\s*\(còn \d+\)$/);
      }
    });
  });

  test.describe('Independent: WISHLIST_Remove-1', () => {
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Remove-1] Kiểm tra xóa 1 sản phẩm khỏi Wishlist', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Remove-1');
      requireDestructiveDbPermission();
      await user5Page.goto(appUrl('wishlist'));
      const card = user5Page.locator('.wishlist-card').filter({
        has: user5Page.locator('input[name="wishlistId"][value="12"]'),
      });
      await expect(card).toBeVisible();
      await card.getByRole('button', { name: 'Xóa sản phẩm khỏi wishlist' }).click();
      await expect(user5Page).toHaveURL(/\/wishlist\?success=removed$/);
      await expect(user5Page.getByRole('status')).toContainText('Đã xóa sản phẩm khỏi wishlist.');
      await expect(card).toHaveCount(0);
      await withDb(async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT COUNT(*) AS total FROM wishlists WHERE id = 12 AND user_id = 5',
        );
        expect(Number(rows[0]?.total ?? 0)).toBe(0);
      });
    });
  });

  test.describe('Dependency chain: WISHLIST_Move-1 -> WISHLIST_Move-2', () => {
    test.describe.configure({ mode: 'serial' });
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Move-1] Kiểm tra Chuyển sản phẩm sang Giỏ hàng với số lượng hợp lệ', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Move-1');
      await user5Page.goto(appUrl('wishlist'));
      const card = productCard(user5Page, 3);
      const form = card.locator('form.wishlist-add-form');
      await form.locator('select[name="variantId"]').selectOption('5');
      await form.locator('input[name="quantity"]').fill('2');
      const request = user5Page.waitForRequest(candidate =>
        candidate.url().includes('/wishlist') && candidate.method() === 'POST');
      await form.getByRole('button', { name: 'Thêm vào giỏ' }).click();
      const post = await request;
      expect(post.postData()).toContain('variantId=5');
      expect(post.postData()).toContain('quantity=2');
      await expect(user5Page).toHaveURL(/\/wishlist\?success=added-to-cart$/);
      await expect(user5Page.getByRole('status'))
        .toContainText('Đã thêm sản phẩm vào giỏ hàng. Sản phẩm vẫn được giữ trong wishlist.');
      await expect(productCard(user5Page, 3)).toBeVisible();
    });

    test('[WISHLIST_Move-2] Kiểm tra sản phẩm GIỮ NGUYÊN trong Wishlist sau khi Thêm vào giỏ', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Move-2');
      await user5Page.goto(appUrl('wishlist'));
      await expect(productCard(user5Page, 101)).toBeVisible();
      await expect(productCard(user5Page, 3)).toBeVisible();
    });
  });

  test.describe('Independent: WISHLIST_Move-3', () => {
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Move-3] Kiểm tra nhập số lượng vượt quá 100 khi Thêm vào giỏ', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Move-3');
      await user5Page.goto(appUrl('wishlist'));
      const form = productCard(user5Page, 3).locator('form.wishlist-add-form');
      await form.locator('select[name="variantId"]').selectOption('5');
      await form.locator('input[name="quantity"]').fill('101');
      // Note: noValidate bypasses the HTML max=100 constraint to exercise server validation.
      await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
      await form.getByRole('button', { name: 'Thêm vào giỏ' }).click();
      await expect(user5Page).toHaveURL(/\/wishlist\?error=invalid$/);
      await expect(user5Page.getByRole('alert'))
        .toHaveText('Thông tin gửi lên không hợp lệ. Vui lòng thử lại.');
    });
  });

  test.describe('Independent: WISHLIST_Move-4', () => {
    let user5Context: BrowserContext;
    let user5Page: Page;

    test.beforeAll(async ({ browser }) => {
      ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
    });

    test.afterAll(async () => {
      await user5Context?.close();
    });

    test('[WISHLIST_Move-4] Kiểm tra nhập số lượng <= 0 khi Thêm vào giỏ', async () => {
      blockIfPrerequisiteFailed('WISHLIST_Move-4');
      await user5Page.goto(appUrl('wishlist'));
      const form = productCard(user5Page, 3).locator('form.wishlist-add-form');
      await form.locator('select[name="variantId"]').selectOption('5');
      await form.locator('input[name="quantity"]').fill('0');
      // Note: noValidate bypasses the HTML min=1 constraint to exercise server validation.
      await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
      await form.getByRole('button', { name: 'Thêm vào giỏ' }).click();
      await expect(user5Page).toHaveURL(/\/wishlist\?error=invalid$/);
      await expect(user5Page.getByRole('alert'))
        .toHaveText('Thông tin gửi lên không hợp lệ. Vui lòng thử lại.');
    });
  });

  test.describe('Independent: WISHLIST_View-3', () => {
    test('[WISHLIST_View-3] Kiểm tra hiển thị trang Wishlist trống của User đã đăng nhập', async ({ browser }) => {
      blockIfPrerequisiteFailed('WISHLIST_View-3');
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await login(page, USER_EMAIL, USER_PASSWORD);
        await page.goto(appUrl('wishlist'));
        await expect(page.getByRole('heading', { name: 'Wishlist của bạn đang trống' })).toBeVisible();
        await expect(page.locator('.wishlist-empty'))
          .toContainText('Thêm sản phẩm yêu thích từ trang chi tiết để lưu lại tại đây.');
        await expect(page.getByRole('link', { name: 'Khám phá sản phẩm' })).toBeVisible();
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Independent: WISHLIST_View-7', () => {
    test('[WISHLIST_View-7] Kiểm tra hiển thị sản phẩm Active nhưng tất cả biến thể HẾT HÀNG', async ({ browser }) => {
      blockIfPrerequisiteFailed('WISHLIST_View-7');
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await login(page, WISHLIST_USER6_EMAIL, USER_PASSWORD);
        await page.goto(appUrl('wishlist'));
        const card = productCard(page, 217);
        await expect(card).toBeVisible();
        await expect(card.locator('form.wishlist-add-form')).toHaveCount(0);
        await expect(card.getByRole('button', { name: 'Thêm vào giỏ' })).toHaveCount(0);
        await expect(card).toContainText('Hiện chưa có biến thể còn hàng.');
        await expect(card.getByRole('link', { name: 'Xem sản phẩm' })).toBeVisible();
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Independent: WISHLIST_View-8', () => {
    test('[WISHLIST_View-8] Kiểm tra hiển thị sản phẩm bị Admin ẨN', async ({ browser }) => {
      blockIfPrerequisiteFailed('WISHLIST_View-8');
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await login(page, WISHLIST_USER7_EMAIL, USER_PASSWORD);
        await page.goto(appUrl('wishlist'));
        const card = productCard(page, 102);
        await expect(card).toBeVisible();
        await expect(card.locator('form.wishlist-add-form')).toHaveCount(0);
        await expect(card.getByRole('link', { name: 'Xem sản phẩm' })).toHaveCount(0);
        await expect(card).toContainText('Sản phẩm hiện không còn khả dụng.');
      } finally {
        await context.close();
      }
    });
  });

  test.describe('Dependency chain: WISHLIST_DB-1 -> WISHLIST_DB-2 -> WISHLIST_DB-3', () => {
    test.describe.configure({ mode: 'serial' });

    test('[WISHLIST_DB-1] Kiểm tra Ràng buộc duy nhất uq_wishlist_user_product trong CSDL', async () => {
      blockIfPrerequisiteFailed('WISHLIST_DB-1');
      requireDestructiveDbPermission();
      await withDb(async connection => {
        let duplicateError: unknown;
        await connection.beginTransaction();
        try {
          await connection.execute(
            'INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)',
            [5, 101],
          );
        } catch (error) {
          duplicateError = error;
        } finally {
          await connection.rollback();
        }
        expect(duplicateError).toMatchObject({ code: 'ER_DUP_ENTRY' });
      });
    });

    test('[WISHLIST_DB-2] Kiểm tra Tự động xóa CASCADE Wishlist khi Xóa tài khoản User', async () => {
      blockIfPrerequisiteFailed('WISHLIST_DB-2');
      requireDestructiveDbPermission();
      await withDb(async connection => {
        const [beforeRows] = await connection.execute<RowDataPacket[]>(
          'SELECT COUNT(*) AS total FROM wishlists WHERE user_id = 5',
        );
        expect(Number(beforeRows[0]?.total ?? 0)).toBe(3);
        await connection.beginTransaction();
        try {
          await connection.execute('DELETE FROM users WHERE id = ?', [5]);
          const [rows] = await connection.execute<RowDataPacket[]>(
            'SELECT COUNT(*) AS total FROM wishlists WHERE user_id = 5',
          );
          expect(Number(rows[0]?.total ?? 0)).toBe(0);
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      });
    });

    test('[WISHLIST_DB-3] Kiểm tra Tự động xóa CASCADE Wishlist khi Xóa Sản phẩm', async () => {
      blockIfPrerequisiteFailed('WISHLIST_DB-3');
      requireDestructiveDbPermission();
      await withDb(async connection => {
        const [beforeRows] = await connection.execute<RowDataPacket[]>(
          'SELECT COUNT(*) AS total FROM wishlists WHERE product_id = 101',
        );
        expect(Number(beforeRows[0]?.total ?? 0)).toBe(10);
        await connection.beginTransaction();
        try {
          await connection.execute('DELETE FROM products WHERE id = ?', [101]);
          const [afterRows] = await connection.execute<RowDataPacket[]>(
            'SELECT COUNT(*) AS total FROM wishlists WHERE product_id = 101',
          );
          expect(Number(afterRows[0]?.total ?? 0)).toBe(0);
          await connection.commit();
        } catch (error) {
          await connection.rollback();
          throw error;
        }
      });
    });
  });
});
