import { test, expect, type Locator, type Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const TRANG_BANK = `${BASE}/admin/bank-info`;
const TRANG_DANG_NHAP = `${BASE}/login`;

const TB_THEM = 'Đã thêm tài khoản ngân hàng.';
const TB_SUA = 'Đã cập nhật tài khoản ngân hàng.';
const TB_XOA = 'Đã xóa tài khoản ngân hàng.';

const PT_NH = 'Thanh toán ngân hàng';
const PT_COD = 'Thanh toán khi nhận hàng';

interface TaiKhoan {
  pt: string;
  ten: string;
  chu: string;
  so: string;
}

// Mỗi test xóa các tài khoản đã tạo
const clear: string[] = [];

// Dữ liệu

function taoChuoi(tienTo: string): string {
  return `${tienTo} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}
// Số tài khoản hợp lệ ngẫu nhiên: 10 chữ số
function taoSo(): string {
  return '0' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');
}
function duLieuMoi(pt: string = PT_NH): TaiKhoan {
  return { pt, ten: taoChuoi('Bank'), chu: 'PHAN VAN THI', so: taoSo() };
}

// Locator

const nut = (scope: Page | Locator, ten: string): Locator =>
  scope.locator('button, summary, a').filter({ hasText: ten });

const formThem = (page: Page): Locator =>
  page.locator('form.editor-form.grid-form:has(input[name="action"][value="create"])');
const formSua = (page: Page, key: string): Locator =>
  mucTheo(page, key).locator('form.editor-form.compact');

const tenTruong: Record<string, string> = {
  'Phương thức thanh toán': 'payment_method_id',
  'Tên ngân hàng': 'bank_name',
  'Chủ tài khoản': 'bank_owner_name',
  'Số tài khoản': 'bank_account_number',
};
const truong = (form: Locator, nhan: string): Locator => {
  const name = tenTruong[nhan];
  if (!name) throw new Error(`Không có selector cho trường "${nhan}"`);
  return form.locator(`[name="${name}"]`);
};

const mucTheo = (page: Page, key: string): Locator =>
  page.locator('article.record').filter({ hasText: key });

async function layDanhSach(page: Page): Promise<string[]> {
  return page.locator('article.record').allInnerTexts();
}

async function demMuc(page: Page, key: string): Promise<number> {
  return (await layDanhSach(page)).filter((t) => t.includes(key)).length;
}

async function soLuong(page: Page): Promise<number> {
  const text = await page.getByTestId('search-results-count').innerText();
  const match = text.match(/^\s*(\d+)/);
  if (!match) throw new Error(`Không đọc được số lượng tài khoản từ "${text}"`);
  return Number(match[1]);
}

// Thao tác

async function dienForm(form: Locator, d: Partial<TaiKhoan>): Promise<void> {
  if (d.pt !== undefined) await truong(form, 'Phương thức thanh toán').selectOption({ label: d.pt });
  if (d.ten !== undefined) await truong(form, 'Tên ngân hàng').fill(d.ten);
  if (d.chu !== undefined) await truong(form, 'Chủ tài khoản').fill(d.chu);
  if (d.so !== undefined) await truong(form, 'Số tài khoản').fill(d.so);
}

async function themTaiKhoan(page: Page, d: Partial<TaiKhoan>, boChonHienThi = false): Promise<void> {
  const form = formThem(page);
  await dienForm(form, d);
  if (boChonHienThi) await form.locator('input[name="is_show"]').uncheck();
  await nut(form, 'Thêm tài khoản').click();
}

// Tạo sẵn 1 tài khoản (pre-condition của Update/Delete/Add-11)
async function taoSan(page: Page, d: TaiKhoan = duLieuMoi()): Promise<TaiKhoan> {
  clear.push(d.ten);
  await themTaiKhoan(page, d);
  await expect(page.getByText(TB_THEM)).toBeVisible();
  await expect.poll(() => demMuc(page, d.ten)).toBe(1);
  return d;
}

async function moFormSua(page: Page, key: string): Promise<Locator> {
  await nut(mucTheo(page, key), 'Chỉnh sửa').click();
  const form = formSua(page, key);
  await expect(form).toBeVisible();
  return form;
}

async function luuThayDoi(page: Page, form: Locator): Promise<void> {
  await nut(form, 'Lưu thay đổi').click();
}

// Trường bị đánh dấu "bắt buộc" của trình duyệt (Please fill out this field / Please select an item...)
async function kiemTraBatBuoc(o: Locator): Promise<void> {
  const thieu = await o.evaluate((el) => (el as HTMLInputElement | HTMLSelectElement).validity.valueMissing);
  expect(thieu, 'Trường phải bị đánh dấu bắt buộc (valueMissing)').toBe(true);
}

// Không thêm được: không có thông báo thành công và số lượng không đổi
async function kiemTraKhongThem(page: Page, soTruoc: number, thongBao?: RegExp): Promise<void> {
  expect(await soLuong(page), 'Số lượng tài khoản không được tăng').toBe(soTruoc);
  await expect(page.getByText(TB_THEM)).toHaveCount(0);
  if (thongBao) await expect(page.getByText(thongBao).first()).toBeVisible();
}

//  Hooks

test.beforeEach(async ({ page }) => {
  test.setTimeout(60_000);
  clear.length = 0;
  const email = process.env.ADMIN_EMAIL;
  const matKhau = process.env.ADMIN_PASSWORD;
  if (!email || !matKhau) throw new Error('Cần đặt biến môi trường ADMIN_EMAIL và ADMIN_PASSWORD (tài khoản Admin)');

  await page.goto(TRANG_DANG_NHAP);
  await page.locator('form.login input[name="loginInfo"]').fill(email);
  await page.locator('form.login input[name="password"]').fill(matKhau);
  await page.locator('form.login input[type="submit"][name="submit"]').click();

  await page.goto(TRANG_BANK);
  await expect(page.getByText('Quản lý tài khoản ngân hàng', { exact: true })).toBeVisible();
});

// Dọn dữ liệu test (kể cả khi test FAILED)
test.afterEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto(TRANG_BANK);
  for (const key of clear) {
    for (let i = 0; i < 5; i++) {
      const n = await demMuc(page, key);
      if (n === 0) break;
      const record = page.locator('article.record').filter({ hasText: key }).first();
      await record.locator('form[data-confirm] button[type="submit"]').click();
      await expect.poll(() => demMuc(page, key)).toBe(n - 1);
    }
  }
});

// GUI

test('GUI-BankAccount-1: giao diện và giá trị mặc định của trang', async ({ page }) => {
  await expect(page.getByText('Quản lý thông tin tài khoản được hiển thị theo phương thức thanh toán.')).toBeVisible();

  const form = formThem(page);
  await expect(page.getByText('Thêm tài khoản ngân hàng', { exact: true })).toBeVisible();
  await expect(truong(form, 'Phương thức thanh toán').locator('option:checked')).toHaveText('Chọn phương thức');
  for (const nhan of ['Tên ngân hàng', 'Chủ tài khoản', 'Số tài khoản']) {
    await expect(truong(form, nhan)).toHaveValue('');
  }
  await expect(form.locator('input[name="is_show"]')).toBeChecked();
  await expect(nut(form, 'Thêm tài khoản')).toBeVisible();

  await expect(page.getByText('Danh sách tài khoản', { exact: true })).toBeVisible();
  await expect(page.getByTestId('search-results-count')).toBeVisible();
  await expect(page.getByText('Tìm tài khoản', { exact: true })).toBeVisible();
  await expect(page.locator('#bank-search')).toBeVisible();
  await expect(nut(page, 'Tìm kiếm')).toBeVisible();
  await expect(page.locator('a[href$="/admin/bank-info"]')).toBeVisible();

  // Mỗi tài khoản có nhãn trạng thái, mã, nút Chỉnh sửa và Xóa
  const ds = await layDanhSach(page);
  expect(ds.length, 'Cần có ít nhất 1 tài khoản trong danh sách').toBeGreaterThan(0);
  expect(ds[0]).toMatch(/Mã #\d+/);
  await expect(nut(page, 'Chỉnh sửa').first()).toBeVisible();
  await expect(nut(page, 'Xóa').first()).toBeVisible();
});

test('GUI-BankAccount-2: các lựa chọn của danh sách Phương thức thanh toán', async ({ page }) => {
  const options = await truong(formThem(page), 'Phương thức thanh toán').locator('option').allTextContents();
  expect(options.map((t) => t.trim())).toEqual(['Chọn phương thức', PT_COD, PT_NH]);
});

// Add

test('Add-BankAccount-1: thêm với đầy đủ các trường hợp lệ', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);

  await themTaiKhoan(page, d);

  await expect(page.getByText(TB_THEM)).toBeVisible();
  expect(await soLuong(page)).toBe(soTruoc + 1);
  const muc = mucTheo(page, d.ten);
  for (const v of [d.ten, d.chu, d.so, d.pt, 'Đang hiển thị']) await expect(muc).toContainText(v);

  // Form được xóa trắng
  const form = formThem(page);
  await expect(truong(form, 'Tên ngân hàng')).toHaveValue('');
  await expect(truong(form, 'Số tài khoản')).toHaveValue('');
});

test('Add-BankAccount-2: để trống tất cả các trường', async ({ page }) => {
  const soTruoc = await soLuong(page);
  await nut(formThem(page), 'Thêm tài khoản').click();

  await kiemTraBatBuoc(truong(formThem(page), 'Phương thức thanh toán')); // ô lỗi đầu tiên
  await kiemTraKhongThem(page, soTruoc);
});

test('Add-BankAccount-3: bỏ trống Phương thức thanh toán', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { ten: d.ten, chu: d.chu, so: d.so });

  await kiemTraBatBuoc(truong(formThem(page), 'Phương thức thanh toán'));
  await kiemTraKhongThem(page, soTruoc);
});

test('Add-BankAccount-4: bỏ trống Tên ngân hàng', async ({ page }) => {
  const d = duLieuMoi();
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { pt: d.pt, chu: d.chu, so: d.so });

  await kiemTraBatBuoc(truong(formThem(page), 'Tên ngân hàng'));
  await kiemTraKhongThem(page, soTruoc);
});

test('Add-BankAccount-5: bỏ trống Chủ tài khoản', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { pt: d.pt, ten: d.ten, so: d.so });

  await kiemTraBatBuoc(truong(formThem(page), 'Chủ tài khoản'));
  await kiemTraKhongThem(page, soTruoc);
});

// Chủ tài khoản chỉ gồm ký tự đặc biệt -> mong đợi bị từ chối
test('Add-BankAccount-6: Chủ tài khoản chỉ gồm ký tự đặc biệt', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { ...d, chu: '.' });

  await kiemTraKhongThem(page, soTruoc, /Chủ tài khoản không hợp lệ/i);
});

test('Add-BankAccount-7: bỏ trống Số tài khoản', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { pt: d.pt, ten: d.ten, chu: d.chu });

  await kiemTraBatBuoc(truong(formThem(page), 'Số tài khoản'));
  await kiemTraKhongThem(page, soTruoc);
});

// Số tài khoản có chữ cái / ký tự đặc biệt -> mong đợi bị từ chối
test('Add-BankAccount-8: Số tài khoản chứa chữ cái hoặc ký tự đặc biệt', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { ...d, so: '12ab#456' });

  await kiemTraKhongThem(page, soTruoc, /Số tài khoản không hợp lệ/i);
});

// Số tài khoản quá ngắn -> mong đợi bị từ chối
test('Add-BankAccount-9: Số tài khoản ngắn hơn mức tối thiểu 8 chữ số', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  const soTruoc = await soLuong(page);
  await themTaiKhoan(page, { ...d, so: '88' });

  await kiemTraKhongThem(page, soTruoc, /Số tài khoản không hợp lệ.*độ dài/i);
});

test('Add-BankAccount-10: bỏ chọn "Hiển thị cho khách hàng"', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.ten);
  await themTaiKhoan(page, d, true);

  await expect(page.getByText(TB_THEM)).toBeVisible();
  const muc = mucTheo(page, d.ten);
  await expect(muc).toContainText(d.ten);
  await expect(muc).not.toContainText('Đang hiển thị');
});

// Thêm trùng tên ngân hàng + số tài khoản -> mong đợi bị từ chối
test('Add-BankAccount-11: thêm trùng với tài khoản đã tồn tại', async ({ page }) => {
  const d = await taoSan(page);
  const soTruoc = await soLuong(page);

  await themTaiKhoan(page, d);

  await kiemTraKhongThem(page, soTruoc, /đã tồn tại/i);
});

// Update

test('Update-BankAccount-1: cập nhật tất cả các trường', async ({ page }) => {
  const goc = await taoSan(page, duLieuMoi(PT_COD));
  const ma = (await mucTheo(page, goc.ten).innerText()).match(/Mã #\d+/)?.[0];
  expect(ma, 'Không đọc được mã tài khoản').toBeTruthy();
  const soLuongTruoc = await soLuong(page);

  const moi: TaiKhoan = { pt: PT_NH, ten: taoChuoi('Techcombank'), chu: 'NGUYEN VAN A', so: taoSo() };
  clear.push(moi.ten);
  const form = await moFormSua(page, goc.ten);
  await dienForm(form, moi);
  await luuThayDoi(page, form);

  await expect(page.getByText(TB_SUA)).toBeVisible();
  const muc = mucTheo(page, moi.ten);
  for (const v of [moi.ten, moi.chu, moi.so, moi.pt, ma as string]) await expect(muc).toContainText(v);
  expect(await demMuc(page, goc.ten)).toBe(0); // dữ liệu cũ không còn
  expect(await soLuong(page)).toBe(soLuongTruoc);
});

test('Update-BankAccount-2: chỉ cập nhật Chủ tài khoản', async ({ page }) => {
  const goc = await taoSan(page);

  const form = await moFormSua(page, goc.ten);
  await dienForm(form, { chu: 'Thi Phan' });
  await luuThayDoi(page, form);

  await expect(page.getByText(TB_SUA)).toBeVisible();
  const muc = mucTheo(page, goc.ten);
  for (const v of [goc.ten, goc.so, goc.pt, 'Thi Phan']) await expect(muc).toContainText(v);
  await expect(muc).not.toContainText(goc.chu);
});

async function suaBoTrong(page: Page, nhan: string): Promise<void> {
  const goc = await taoSan(page);
  const form = await moFormSua(page, goc.ten);
  await truong(form, nhan).fill('');
  await nut(form, 'Lưu thay đổi').click();

  await kiemTraBatBuoc(truong(form, nhan));
  await expect(page.getByText(TB_SUA)).toHaveCount(0);
  // Dữ liệu cũ không bị thay đổi
  await page.goto(TRANG_BANK);
  const muc = mucTheo(page, goc.ten);
  for (const v of [goc.ten, goc.chu, goc.so]) await expect(muc).toContainText(v);
}

test('Update-BankAccount-3: bỏ trống Tên ngân hàng', async ({ page }) => {
  await suaBoTrong(page, 'Tên ngân hàng');
});

test('Update-BankAccount-4: bỏ trống Chủ tài khoản', async ({ page }) => {
  await suaBoTrong(page, 'Chủ tài khoản');
});

test('Update-BankAccount-5: bỏ trống Số tài khoản', async ({ page }) => {
  await suaBoTrong(page, 'Số tài khoản');
});

test('Update-BankAccount-6: bỏ chọn "Hiển thị cho khách hàng" khi cập nhật', async ({ page }) => {
  const goc = await taoSan(page);
  await expect(mucTheo(page, goc.ten)).toContainText('Đang hiển thị');

  const form = await moFormSua(page, goc.ten);
  await form.locator('input[name="is_show"]').uncheck();
  await luuThayDoi(page, form);

  await expect(page.getByText(TB_SUA)).toBeVisible();
  await expect(mucTheo(page, goc.ten)).not.toContainText('Đang hiển thị');
});

// Delete

test('Delete-BankAccount-1: xóa và nhấn OK', async ({ page }) => {
  const goc = await taoSan(page);
  const soTruoc = await soLuong(page);

  let loai = '';
  let noiDung = '';
  page.once('dialog', async (dialog) => {
    loai = dialog.type();
    noiDung = dialog.message();
    await dialog.accept(); // OK
  });
  await nut(mucTheo(page, goc.ten), 'Xóa').click();

  expect(loai).toBe('confirm');
  expect(noiDung).toContain('Xóa thông tin tài khoản ngân hàng này?');
  await expect(page.getByText(TB_XOA)).toBeVisible();
  expect(await demMuc(page, goc.ten)).toBe(0);
  expect(await soLuong(page)).toBe(soTruoc - 1);
});

test('Delete-BankAccount-2: xóa và nhấn Cancel', async ({ page }) => {
  const goc = await taoSan(page);
  const soTruoc = await soLuong(page);

  let loai = '';
  page.once('dialog', async (dialog) => {
    loai = dialog.type();
    await dialog.dismiss(); // Cancel
  });
  await nut(mucTheo(page, goc.ten), 'Xóa').click();

  // Tải lại trang để chắc chắn dữ liệu còn trong hệ thống
  await page.goto(TRANG_BANK);
  expect(loai).toBe('confirm');
  expect(await demMuc(page, goc.ten)).toBe(1);
  expect(await soLuong(page)).toBe(soTruoc);
});

// Search

async function timKiem(page: Page, tuKhoa: string): Promise<void> {
  await page.locator('#bank-search').fill(tuKhoa);
  await nut(page, 'Tìm kiếm').click();
}

test('Search-BankAccount-1: tìm theo tên ngân hàng "BIDV"', async ({ page }) => {
  await timKiem(page, 'BIDV');

  const ds = await layDanhSach(page);
  expect(ds.length, 'Cần có tài khoản BIDV trong dữ liệu').toBeGreaterThan(0);
  for (const t of ds) expect(t, `Tài khoản không phải BIDV: ${t}`).toMatch(/BIDV/i);
});

test('Search-BankAccount-2: tìm theo chủ tài khoản "Trần Quang Duy"', async ({ page }) => {
  await timKiem(page, 'Trần Quang Duy');

  const ds = await layDanhSach(page);
  expect(ds.length, 'Cần có tài khoản của "Trần Quang Duy" trong dữ liệu').toBeGreaterThan(0);
  for (const t of ds) expect(t, `Sai chủ tài khoản: ${t}`).toContain('Trần Quang Duy');
});

test('Search-BankAccount-3: tìm với từ khóa không tồn tại', async ({ page }) => {
  await timKiem(page, 'abcxyz');

  expect(await layDanhSach(page)).toHaveLength(0);
  await expect(page.getByTestId('search-empty-state')).toContainText(
    'Không tìm thấy tài khoản ngân hàng phù hợp',
  );
});
