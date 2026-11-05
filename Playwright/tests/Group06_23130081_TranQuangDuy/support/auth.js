'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { BASE_URL, ADMIN, AUTH_DIR } = require('./config');
const { userCredentials } = require('./seed');

function statePath(role) {
  return path.join(AUTH_DIR, `${role}.json`);
}

function credentialsFor(role) {
  if (role === 'admin') {
    if (!ADMIN.username || !ADMIN.password) {
      throw new Error('Cần ADMIN_USER và ADMIN_PASS trong .env để đăng nhập admin.');
    }
    return { username: ADMIN.username, password: ADMIN.password };
  }
  return userCredentials(role);
}

/**
 * Đăng nhập một lần bằng UI rồi lưu storageState. Nhờ đó mỗi test chỉ cần mở
 * context mới với cookie sẵn có, không lặp lại thao tác đăng nhập.
 */
async function storageStateFor(browser, role) {
  const file = statePath(role);
  if (fs.existsSync(file)) return file;

  const credentials = credentialsFor(role);
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();

  try {
    await page.goto('/login');
    await page.locator('input[name="loginInfo"]').fill(credentials.username);
    await page.locator('input[name="password"]').fill(credentials.password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 }),
      page.locator('input[type="submit"]').click(),
    ]);
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    await context.storageState({ path: file });
  } finally {
    await context.close();
  }

  return file;
}

async function newAuthedContext(browser, role) {
  const storageState = await storageStateFor(browser, role);
  return browser.newContext({ storageState, baseURL: BASE_URL });
}

module.exports = { storageStateFor, newAuthedContext, credentialsFor };
