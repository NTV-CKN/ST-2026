import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

const ADMIN_EMAIL = requiredEnv('ADMIN_EMAIL');
const ADMIN_PASSWORD = requiredEnv('ADMIN_PASSWORD');
const BASE_URL = requiredEnv('BASE_URL');

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

async function loginAdmin(page: Page): Promise<void> {
  await page.goto(appUrl('admin/articles'));
  if (/\/login(?:\?|$)/.test(page.url())) {
    await page.locator('input[placeholder*="Tên đăng nhập"], input[name="username"], input[name="email"]')
      .fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForLoadState('networkidle');
  }
  await page.goto(appUrl('admin/articles'));
}

async function submitServerValidation(page: Page, form: ReturnType<Page['locator']>): Promise<void> {
  // Note: native submit bypasses the page's client-side submit handler to test server-side validation.
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    form.evaluate((node: HTMLFormElement) => {
      node.noValidate = true;
      HTMLFormElement.prototype.submit.call(node);
    }),
  ]);
}

async function withGuestPage<T>(browser: Browser, action: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext();
  try {
    return await action(await context.newPage());
  } finally {
    await context.close();
  }
}

async function articleMetadata(connection: Connection, articleId: number) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT author_id, DATE_FORMAT(post_date, '%Y-%m-%d %H:%i:%s') AS post_date
     FROM articles WHERE id = ?`,
    [articleId],
  );
  return rows[0];
}

const dependencies: Record<string, string[]> = {
  'ARTICLE_MGT_List-2': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_List-3': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_List-4': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_Add-1': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_Add-2': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_Add-3': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_Edit-1': ['ARTICLE_MGT_Add-3'],
  'ARTICLE_MGT_Edit-2': ['ARTICLE_MGT_Edit-1'],
  'ARTICLE_MGT_Delete-1': ['ARTICLE_MGT_Edit-2'],
  'ARTICLE_MGT_AdminComm-1': ['ARTICLE_MGT_List-1'],
  'ARTICLE_MGT_AdminComm-2': ['ARTICLE_MGT_AdminComm-1'],
  'ARTICLE_MGT_AdminComm-3': ['ARTICLE_MGT_AdminComm-1'],
  'ARTICLE_MGT_AdminComm-4': ['ARTICLE_MGT_AdminComm-1'],
  'ARTICLE_MGT_AdminComm-5': ['ARTICLE_MGT_AdminComm-1'],
  'ARTICLE_MGT_Detail-2': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-1': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-2': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-3': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-4': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-5': ['ARTICLE_MGT_Detail-1'],
  'ARTICLE_MGT_Comment-6': ['ARTICLE_MGT_Detail-1'],
};

interface PrerequisiteStore {
  runId: number;
  results: Record<string, boolean>;
  createdArticle?: { id: number; title: string };
}

const runId = process.ppid;
const specName = path.basename(__filename, path.extname(__filename));
const prerequisiteStorePath = path.resolve(
  __dirname,
  '.playwright-state',
  `${specName}-prerequisites-${runId}.json`,
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readPrerequisiteStore(): PrerequisiteStore {
  let contents: string;
  try {
    contents = readFileSync(prerequisiteStorePath, 'utf8');
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') {
      return { runId, results: {} };
    }
    throw error;
  }
  const parsed: unknown = JSON.parse(contents);
  if (!isRecord(parsed) || parsed.runId !== runId || !isRecord(parsed.results)) {
    throw new Error('Article prerequisite result file is invalid or belongs to a different test run.');
  }
  const results: Record<string, boolean> = {};
  for (const [caseId, passed] of Object.entries(parsed.results)) {
    if (typeof passed !== 'boolean') {
      throw new Error(`Invalid prerequisite result for ${caseId}.`);
    }
    results[caseId] = passed;
  }
  const store: PrerequisiteStore = { runId, results };
  if (parsed.createdArticle !== undefined) {
    if (!isRecord(parsed.createdArticle) ||
        typeof parsed.createdArticle.id !== 'number' ||
        typeof parsed.createdArticle.title !== 'string') {
      throw new Error('Invalid created article state in prerequisite result file.');
    }
    store.createdArticle = {
      id: parsed.createdArticle.id,
      title: parsed.createdArticle.title,
    };
  }
  return store;
}

function initializePrerequisiteStore(): PrerequisiteStore {
  mkdirSync(path.dirname(prerequisiteStorePath), { recursive: true });
  if (existsSync(prerequisiteStorePath)) {
    return readPrerequisiteStore();
  }
  const store: PrerequisiteStore = { runId, results: {} };
  writeFileSync(prerequisiteStorePath, JSON.stringify(store));
  return store;
}

function recordPrerequisiteResult(caseId: string, passed: boolean, article?: { id: number; title: string }): void {
  const store = readPrerequisiteStore();
  store.results[caseId] = passed;
  if (article) {
    store.createdArticle = article;
  }
  writeFileSync(prerequisiteStorePath, JSON.stringify(store));
}

let adminContext: BrowserContext;
let adminPage: Page;
let createdArticleId: number | undefined;
let createdArticleTitle: string | undefined;

test.describe('ARTICLE_MGT - Quản lý bài báo', () => {
  test.describe.configure({ mode: 'default' });

  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    const store = initializePrerequisiteStore();
    if (store.createdArticle) {
      createdArticleId = store.createdArticle.id;
      createdArticleTitle = store.createdArticle.title;
    }
    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    await loginAdmin(adminPage);
  });

  test.afterAll(async () => {
    await adminContext?.close();
  });

  test.afterEach(async ({}, testInfo) => {
    const caseId = testInfo.title.match(/\[(ARTICLE_MGT_[^\]]+)\]/)?.[1];
    if (caseId) {
      const article = createdArticleId !== undefined && createdArticleTitle !== undefined
        ? { id: createdArticleId, title: createdArticleTitle }
        : undefined;
      recordPrerequisiteResult(caseId, testInfo.status === 'passed', article);
    }
  });

  function blockIfPrerequisiteFailed(caseId: string): void {
    for (const prerequisite of dependencies[caseId] ?? []) {
      test.skip(readPrerequisiteStore().results[prerequisite] !== true,
        `Blocked: prerequisite [${prerequisite}] has no recorded Passed result (missing state or prerequisite did not pass).`);
    }
  }

  function articleRecord(title?: string) {
    const records = adminPage.locator('.record');
    return title ? records.filter({ has: adminPage.getByRole('heading', { name: title, exact: true }) }) : records;
  }

  function commentRecord(commentId: number) {
    return adminPage.locator('.record').filter({
      has: adminPage.locator(`input[name="commentId"][value="${commentId}"]`),
    });
  }

    function requireCreatedArticle(): { id: number; title: string } {
      if (createdArticleId === undefined || createdArticleTitle === undefined) {
        throw new Error('The article-creation prerequisite did not provide an article ID and title.');
      }
      return { id: createdArticleId, title: createdArticleTitle };
    }

  test.describe('Independent: ARTICLE_MGT_List-1', () => {
    test('[ARTICLE_MGT_List-1] Hiển thị danh sách bài viết dạng card', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_List-1');
      await adminPage.goto(appUrl('admin/articles'));
      const records = adminPage.locator('.record');
      await expect(adminPage.getByRole('heading', { name: 'Quản lý bài viết' })).toBeVisible();
      await expect(records.first()).toBeVisible();
      await expect(records.first().locator('h3')).toBeVisible();
      await expect(records.first().locator('.record-summary p')).toBeVisible();
      await expect(records.first().locator('small')).toContainText(/Mã #\d+ · Tác giả .+ · /);
      await expect(records.first().locator('details.record-edit summary')).toHaveText('Chỉnh sửa');
      await expect(records.first().getByRole('button', { name: 'Xóa' })).toBeVisible();
    });
  });

  test.describe('Independent: ARTICLE_MGT_List-2', () => {
    test('[ARTICLE_MGT_List-2] Kiểm tra sắp xếp mặc định bài viết mới nhất lên đầu', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_List-2');
      await adminPage.goto(appUrl('admin/articles'));
      const dateTexts = await adminPage.locator('.record small').allTextContents();
      const timestamps = dateTexts.map(text => {
        const timestamp = text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?|\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0];
        return timestamp ? Date.parse(timestamp.replace(' ', 'T')) : Number.NaN;
      });
      expect(timestamps.length).toBeGreaterThan(1);
      expect(timestamps.every(Number.isFinite)).toBe(true);
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });
  });

  test.describe('Independent: ARTICLE_MGT_List-3', () => {
    test('[ARTICLE_MGT_List-3] Kiểm tra tìm kiếm bài báo tương đối theo Tên/Nội dung/Tác giả', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_List-3');
      await adminPage.goto(appUrl('admin/articles'));
      const search = adminPage.locator('#article-search');
      await search.fill('Công nghệ');
      await search.press('Enter');
      await expect(search).toHaveValue('Công nghệ');
      await expect(adminPage.locator('.record').first()).toBeVisible();
      await expect(adminPage.locator('[data-testid="search-results-count"]')).toContainText('kết quả cho');
    });
  });

  test.describe('Independent: ARTICLE_MGT_List-4', () => {
    test('[ARTICLE_MGT_List-4] Kiểm tra tìm kiếm bài báo với từ khóa không tồn tại', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_List-4');
      await adminPage.goto(appUrl('admin/articles'));
      const search = adminPage.locator('#article-search');
      await search.fill('XYZ999');
      await search.press('Enter');
      await expect(search).toHaveValue('XYZ999');
      // Lệch app: expected dùng ngoặc kép thẳng, còn app hiển thị ngoặc kép cong.
      await expect(adminPage.getByTestId('search-empty-state'))
        .toHaveText('Không tìm thấy bài viết phù hợp với "XYZ999".');
    });
  });

  test.describe('Independent: ARTICLE_MGT_Add-1', () => {
    test('[ARTICLE_MGT_Add-1] Kiểm tra để trống một trong các trường bắt buộc khi thêm mới bài báo', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Add-1');
      await adminPage.goto(appUrl('admin/articles'));
      const form = adminPage.locator('form.article-editor-form').first();
      await form.locator('input[name="title"]').fill('');
      await form.locator('textarea[name="subdescription"]').fill('Mô tả hợp lệ');
      await form.locator('textarea[name="content"]').fill('Nội dung hợp lệ');
      await submitServerValidation(adminPage, form);
      await expect(adminPage.getByTestId('article-toast'))
        .toHaveText('Vui lòng nhập đầy đủ tiêu đề, mô tả ngắn và nội dung bài viết.');
    });
  });

  test.describe('Independent: ARTICLE_MGT_Add-2', () => {
    test('[ARTICLE_MGT_Add-2] Kiểm tra giới hạn độ dài Tiêu đề bài viết vượt quá 191 ký tự', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Add-2');
      await adminPage.goto(appUrl('admin/articles'));
      const form = adminPage.locator('form.article-editor-form').first();
      const title = 'T'.repeat(192);
      await form.locator('input[name="title"]').fill(title);
      await form.locator('textarea[name="subdescription"]').fill('Mô tả ngắn hợp lệ');
      await form.locator('textarea[name="content"]').fill('Nội dung chi tiết hợp lệ');
      // Note: the form has no maxlength; native submit bypasses client validation to test the server limit.
      await submitServerValidation(adminPage, form);
      await expect(adminPage.getByTestId('article-toast'))
        .toHaveText('Tiêu đề không được vượt quá 191 ký tự.');
    });
  });

  test.describe('Dependency chain: ARTICLE_MGT_Add-3 -> ARTICLE_MGT_Edit-1 -> ARTICLE_MGT_Edit-2 -> ARTICLE_MGT_Delete-1', () => {
    test.describe.configure({ mode: 'serial' });

    test('[ARTICLE_MGT_Add-3] Kiểm tra thêm mới bài báo thành công và tự động xuất bản', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Add-3');
      requireDestructiveDbPermission();
      await adminPage.goto(appUrl('admin/articles'));
      const suffix = Date.now();
      createdArticleTitle = `Bài viết kiểm thử ${suffix}`;
      const form = adminPage.locator('form.article-editor-form').first();
      await form.locator('input[name="title"]').fill(createdArticleTitle);
      await form.locator('textarea[name="subdescription"]').fill(`Mô tả kiểm thử ${suffix}`);
      await form.locator('textarea[name="content"]').fill(`<p>Nội dung kiểm thử ${suffix}</p>`);
      await Promise.all([
        adminPage.waitForNavigation({ waitUntil: 'networkidle' }),
        form.getByRole('button', { name: 'Đăng bài viết' }).click(),
      ]);
      await expect(adminPage.getByTestId('article-toast')).toHaveText('Đã tạo bài viết.');

      await withDb(async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT id, author_id, DATE_FORMAT(post_date, '%Y-%m-%d %H:%i:%s') AS post_date
           FROM articles WHERE title = ? ORDER BY id DESC LIMIT 1`,
          [createdArticleTitle],
        );
        expect(rows).toHaveLength(1);
        createdArticleId = Number(rows[0].id);
        const [admins] = await connection.execute<RowDataPacket[]>(
          'SELECT id FROM users WHERE email = ? AND role_id = 1 LIMIT 1',
          [ADMIN_EMAIL],
        );
        expect(Number(rows[0].author_id)).toBe(Number(admins[0]?.id));
        const postDate = Date.parse(String(rows[0].post_date).replace(' ', 'T'));
        expect(Number.isFinite(postDate)).toBe(true);
        expect(Math.abs(Date.now() - postDate)).toBeLessThan(5 * 60 * 1000);
      });
      await adminPage.goto(appUrl('news'));
      await expect(adminPage.locator('.news-card').filter({
        has: adminPage.getByRole('heading', { name: createdArticleTitle, exact: true }),
      })).toBeVisible();
    });

    test('[ARTICLE_MGT_Edit-1] Kiểm tra cập nhật bài báo với dữ liệu hợp lệ', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Edit-1');
      requireDestructiveDbPermission();
      const article = requireCreatedArticle();
      await adminPage.goto(appUrl('admin/articles'));
      const record = articleRecord(article.title);
      const edit = record.locator('details.record-edit');
      await edit.locator('summary').click();
      const form = edit.locator('form');
      const updatedTitle = `${article.title} - Đã cập nhật`;
      await form.locator('input[name="title"]').fill(updatedTitle);
      await form.locator('textarea[name="subdescription"]').fill('Mô tả bài viết đã được cập nhật');
      await form.locator('textarea[name="content"]').fill('<p>Nội dung bài viết đã được cập nhật.</p>');
      await Promise.all([
        adminPage.waitForNavigation({ waitUntil: 'networkidle' }),
        form.getByRole('button', { name: 'Lưu thay đổi' }).click(),
      ]);
      await expect(adminPage.getByTestId('article-toast')).toHaveText('Đã cập nhật bài viết.');
      createdArticleTitle = updatedTitle;
      await expect(articleRecord(createdArticleTitle)).toBeVisible();
    });

    test('[ARTICLE_MGT_Edit-2] Kiểm tra các trường bị cố định (Mã bài viết, Tác giả, Ngày đăng)', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Edit-2');
      requireDestructiveDbPermission();
      const article = requireCreatedArticle();
      const before = await withDb(connection => articleMetadata(connection, article.id));
      expect(before).toBeDefined();
      await adminPage.goto(appUrl('admin/articles'));
      const edit = articleRecord(article.title).locator('details.record-edit');
      await edit.locator('summary').click();
      const form = edit.locator('form');
      await expect(form.locator('input[type="hidden"][name="id"]')).toHaveValue(String(article.id));
      await expect(form.locator('[name="author_id"], [name="post_date"]')).toHaveCount(0);
      await Promise.all([
        adminPage.waitForNavigation({ waitUntil: 'networkidle' }),
        form.getByRole('button', { name: 'Lưu thay đổi' }).click(),
      ]);
      await expect(adminPage.getByTestId('article-toast')).toHaveText('Đã cập nhật bài viết.');
      const after = await withDb(connection => articleMetadata(connection, article.id));
      expect(after?.author_id).toBe(before?.author_id);
      expect(after?.post_date).toBe(before?.post_date);
    });

    test('[ARTICLE_MGT_Delete-1] Kiểm tra hiển thị hộp thoại xác nhận trước khi xóa bài báo', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Delete-1');
      const article = requireCreatedArticle();
      await adminPage.goto(appUrl('admin/articles'));
      const record = articleRecord(article.title);
      let confirmationMessage = '';
      adminPage.once('dialog', async dialog => {
        confirmationMessage = dialog.message();
        await dialog.dismiss();
      });
      await record.getByRole('button', { name: 'Xóa' }).click();
      expect(confirmationMessage).toBe('Xóa bài viết này? Các bình luận liên quan cũng sẽ bị xóa.');
      await expect(record).toBeVisible();
    });
  });

  test.describe('Independent: ARTICLE_MGT_AdminComm-1', () => {
    test('[ARTICLE_MGT_AdminComm-1] Kiểm tra lọc danh sách bình luận theo bài báo trong Admin', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_AdminComm-1');
      await adminPage.goto(appUrl('admin/article-comment'));
      await adminPage.locator('#article-filter').selectOption('51');
      await adminPage.getByRole('button', { name: 'Lọc' }).click();
      await expect(adminPage).toHaveURL(/\/admin\/article-comment\?articleId=51$/);
      const records = adminPage.locator('#admin-article-comments .record');
      await expect(records.first()).toContainText('Bài viết #51: Tin tức A');
      for (let index = 0; index < await records.count(); index += 1) {
        await expect(records.nth(index)).toContainText('Bài viết #51: Tin tức A');
      }
    });
  });

  test.describe('Independent: ARTICLE_MGT_AdminComm-2', () => {
    test('[ARTICLE_MGT_AdminComm-2] Kiểm tra duyệt bình luận bài báo sang trạng thái approved', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_AdminComm-2');
      requireDestructiveDbPermission();
      const record = commentRecord(101);
      await expect(record).toContainText('Chờ duyệt');
      await record.getByRole('button', { name: 'Duyệt' }).click();
      await expect(adminPage.getByTestId('article-comment-toast')).toHaveText('Đã duyệt bình luận.');
      await expect(commentRecord(101)).toContainText('Đã duyệt');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=51'));
        await page.locator('#toggle-article-comments').click();
        await expect(page.locator('#article-comment-list')).toContainText('Bình luận chờ duyệt (ID 101)');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_AdminComm-3', () => {
    test('[ARTICLE_MGT_AdminComm-3] Kiểm tra ẩn bình luận bài báo sang trạng thái hidden', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_AdminComm-3');
      requireDestructiveDbPermission();
      const record = commentRecord(102);
      await expect(record).toContainText('Đã duyệt');
      await record.getByRole('button', { name: 'Ẩn' }).click();
      await expect(adminPage.getByTestId('article-comment-toast')).toHaveText('Đã ẩn bình luận.');
      await expect(commentRecord(102)).toContainText('Đã ẩn');
      await withDb(async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT status FROM comment_articles WHERE id = ?',
          [102],
        );
        expect(rows[0]?.status).toBe('hidden');
      });
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=51'));
        await page.locator('#toggle-article-comments').click();
        await expect(page.locator('#article-comment-list'))
          .not.toContainText('Bình luận đã duyệt (ID 102)');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_AdminComm-4', () => {
    test('[ARTICLE_MGT_AdminComm-4] Kiểm tra xóa bình luận bài báo thành công', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_AdminComm-4');
      requireDestructiveDbPermission();
      const record = commentRecord(103);
      let confirmationMessage = '';
      adminPage.once('dialog', async dialog => {
        confirmationMessage = dialog.message();
        await dialog.accept();
      });
      await record.getByRole('button', { name: 'Xóa' }).click();
      expect(confirmationMessage).toBe('Bạn có chắc muốn xóa bình luận này?');
      await expect(adminPage.getByTestId('article-comment-toast')).toHaveText('Đã xóa bình luận.');
      await expect(commentRecord(103)).toHaveCount(0);
      await withDb(async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT COUNT(*) AS total FROM comment_articles WHERE id = ?',
          [103],
        );
        expect(Number(rows[0]?.total ?? 0)).toBe(0);
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_AdminComm-5', () => {
    test('[ARTICLE_MGT_AdminComm-5] Kiểm tra xử lý khi thao tác trên bình luận không tồn tại', async () => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_AdminComm-5');
      const response = await adminContext.request.post(appUrl('admin/article-comment'), {
        form: { action: 'approve', commentId: '999', articleId: '51' },
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
      const location = response.headers().location;
      if (!location) {
        throw new Error('Article comment POST redirect did not include a Location header.');
      }
      await adminPage.goto(new URL(location, BASE_URL).toString());
      await expect(adminPage.getByTestId('article-comment-toast'))
        .toHaveText('Không tìm thấy bình luận cần cập nhật.');
    });
  });

  test.describe('Dependency chain: ARTICLE_MGT_Detail-1 -> ARTICLE_MGT_Detail-2', () => {
    test.describe.configure({ mode: 'serial' });

    test('[ARTICLE_MGT_Detail-1] Kiểm tra hiển thị trang Chi tiết bài báo và đếm bình luận đã duyệt', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Detail-1');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await expect(page.locator('h1.news-title')).toHaveText('Xu hướng Công nghệ phụ kiện 2026');
        await expect(page.locator('#comments h3').first()).toHaveText('Bình luận (2)');
      });
    });

    test('[ARTICLE_MGT_Detail-2] Kiểm tra tải danh sách bình luận đã duyệt qua AJAX endpoint', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Detail-2');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        const commentsResponse = page.waitForResponse(response =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname.endsWith('/article-comments') &&
          new URL(response.url()).searchParams.get('articleId') === '10');
        await page.locator('#toggle-article-comments').click();
        const response = await commentsResponse;
        expect(response.ok()).toBe(true);
        const comments = page.locator('#article-comment-list .article-comment-item');
        await expect(comments).toHaveCount(2);
        const commentA = comments.filter({ hasText: 'Khách A' });
        await expect(commentA).toHaveCount(1);
        await expect(commentA).toContainText('Bình luận đã duyệt số 1');
        await expect(commentA).toContainText('2026-10-23');
        const commentB = comments.filter({ hasText: 'Khách B' });
        await expect(commentB).toHaveCount(1);
        await expect(commentB).toContainText('Bình luận đã duyệt số 2');
        await expect(commentB).toContainText('2026-10-23');
        await expect(page.locator('#article-comment-list')).not.toContainText('Khách C');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-1', () => {
    test('[ARTICLE_MGT_Comment-1] Kiểm tra để trống Nội dung bình luận khi gửi', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-1');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill('');
        await page.locator('#article-comment-name').fill('Khách kiểm thử');
        await page.locator('#article-comment-email').fill('guest@example.test');
        const form = page.locator('form.comment-form');
        await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
        await form.getByRole('button', { name: 'Đăng bình luận' }).click();
        await expect(page.getByTestId('article-comment-content-error'))
          .toHaveText('Vui lòng nhập nội dung bình luận.');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-2', () => {
    test('[ARTICLE_MGT_Comment-2] Kiểm tra để trống Tên hiển thị khi chưa đăng nhập', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-2');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill('Nội dung bình luận kiểm thử');
        await page.locator('#article-comment-name').fill('');
        await page.locator('#article-comment-email').fill('guest@example.test');
        const form = page.locator('form.comment-form');
        await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
        await form.getByRole('button', { name: 'Đăng bình luận' }).click();
        await expect(page.getByTestId('article-comment-name-error'))
          .toHaveText('Vui lòng nhập tên hiển thị.');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-3', () => {
    test('[ARTICLE_MGT_Comment-3] Kiểm tra Tên hiển thị vượt quá 50 ký tự', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-3');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill('Nội dung bình luận kiểm thử');
        await page.locator('#article-comment-name').fill('N'.repeat(51));
        await page.locator('#article-comment-email').fill('guest@example.test');
        const form = page.locator('form.comment-form');
        await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
        await form.getByRole('button', { name: 'Đăng bình luận' }).click();
        // Note: the form has no maxlength attribute; the 51-character value reaches validation.
        await expect(page.getByTestId('article-comment-name-error'))
          .toHaveText('Tên hiển thị không được vượt quá 50 ký tự.');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-4', () => {
    test('[ARTICLE_MGT_Comment-4] Kiểm tra để trống trường Email khi chưa đăng nhập', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-4');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill('Nội dung bình luận kiểm thử');
        await page.locator('#article-comment-name').fill('Khách kiểm thử');
        await page.locator('#article-comment-email').fill('');
        const form = page.locator('form.comment-form');
        await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
        await form.getByRole('button', { name: 'Đăng bình luận' }).click();
        await expect(page.getByTestId('article-comment-email-error')).toHaveText('Vui lòng nhập email.');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-5', () => {
    test('[ARTICLE_MGT_Comment-5] Kiểm tra định dạng Email không hợp lệ', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-5');
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill('Nội dung bình luận kiểm thử');
        await page.locator('#article-comment-name').fill('Khách kiểm thử');
        await page.locator('#article-comment-email').fill('abc@xyz');
        const form = page.locator('form.comment-form');
        await form.evaluate((node: HTMLFormElement) => { node.noValidate = true; });
        await form.getByRole('button', { name: 'Đăng bình luận' }).click();
        await expect(page.getByTestId('article-comment-email-error')).toHaveText('Email không hợp lệ.');
      });
    });
  });

  test.describe('Independent: ARTICLE_MGT_Comment-6', () => {
    test('[ARTICLE_MGT_Comment-6] Kiểm tra đăng bình luận thành công và lưu trạng thái pending', async ({ browser }) => {
      blockIfPrerequisiteFailed('ARTICLE_MGT_Comment-6');
      requireDestructiveDbPermission();
      const suffix = Date.now();
      const commentName = `Khách kiểm thử ${suffix}`;
      const commentEmail = `comment-${suffix}@example.test`;
      const commentContent = `Bình luận kiểm thử ${suffix}`;
      await withGuestPage(browser, async page => {
        await page.goto(appUrl('news-detail?id=10'));
        await page.locator('#article-comment-content').fill(commentContent);
        await page.locator('#article-comment-name').fill(commentName);
        await page.locator('#article-comment-email').fill(commentEmail);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle' }),
          page.getByRole('button', { name: 'Đăng bình luận' }).click(),
        ]);
        await expect(page.getByTestId('article-toast'))
          .toHaveText('Đã gửi bình luận. Bình luận sẽ hiển thị sau khi được duyệt.');
      });
      await withDb(async connection => {
        const [rows] = await connection.execute<RowDataPacket[]>(
          'SELECT status FROM comment_articles WHERE article_id = ? AND name_display = ? AND email = ? AND content = ?',
          [10, commentName, commentEmail, commentContent],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe('pending');
      });
    });
  });
});
