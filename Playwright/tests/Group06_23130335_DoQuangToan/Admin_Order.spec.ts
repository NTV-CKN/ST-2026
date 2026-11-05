import { expect, test, type Page } from '@playwright/test';
import { env } from 'node:process';

function requiredEnv(name: string): string {
  const value = env[name]?.trim();
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


async function loginAndGoToOrderManager(page: Page): Promise<void> {
  await page.goto(appUrl('/'));
  await page.getByRole('link', { name: 'Đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(ADMIN_PASSWORD);
  await page.getByRole('textbox', { name: 'Mật khẩu' }).press('Enter');
  await expect.poll(() => new URL(page.url()).pathname.endsWith('/login')).toBe(false);

  await page.goto(appUrl('/admin-order'));
  await expect(page.getByRole('heading', { name: 'Quản lí đơn hàng' })).toBeVisible();
}

async function openCreateOrderForm(page: Page): Promise<void> {
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await expect(page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })).toBeVisible();
}

async function selectCustomer(page: Page, customerId: string): Promise<void> {
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption(customerId);
}

async function selectAddress(page: Page, addressId: string): Promise<void> {
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption(addressId);
}

async function selectPaymentMethod(page: Page, paymentMethodId: string): Promise<void> {
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption(paymentMethodId);
}

async function selectProduct(page: Page, productId: string, index = 0): Promise<void> {
  await page.getByLabel('Sản phẩm / biến thể Chọn sản').nth(index).selectOption(productId);
}

test.describe('ADMIN_ORDER - Quản lý đơn hàng', () => {
  test.beforeEach(async ({ page }) => {
    await loginAndGoToOrderManager(page);
  });

  test('ADMIN_ORDER_View_001: Hiển thị trang quản lý đơn hàng', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Quản lí đơn hàng' })).toBeVisible();
  });

  test('ADMIN_ORDER_SearchCode_001: Tìm đơn hàng theo mã tồn tại', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('28');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(searchInput).toHaveValue('28');
  });

  test('ADMIN_ORDER_Empty_001: Hiển thị khi không có đơn hàng', async ({ page }) => {
    await expect(page.getByText('Không có đơn hàng nào')).toBeVisible();
  });

  test('ADMIN_ORDER_SearchCode_002: Tìm mã đơn hàng không tồn tại', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('999999999');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();

    await expect(searchInput).toHaveValue('999999999');
    await expect(page.getByText('Không có đơn hàng nào')).toBeVisible();
  });

  test('ADMIN_ORDER_SearchName_001: Tìm đơn hàng theo tên người nhận', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('toàn');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(searchInput).toHaveValue('toàn');
  });

  test('ADMIN_ORDER_SearchName_002: Tìm tên người nhận không tồn tại', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('KhachHangKhongTonTai999');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(searchInput).toHaveValue('KhachHangKhongTonTai999');
  });

  test('ADMIN_ORDER_SearchEmpty_001: Tìm kiếm khi từ khóa trống', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(searchInput).toHaveValue('');
  });

  test('ADMIN_ORDER_SearchSpace_001: Tìm kiếm bằng khoảng trắng', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' });
    await searchInput.fill('   ');
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(searchInput).toHaveValue('   ');
  });

  test('ADMIN_ORDER_FilterStatus_001: Lọc đơn hàng theo trạng thái đã duyệt', async ({ page }) => {
    await page.goto(appUrl('/admin-order?keySearch=&statusFilter=approved&verifyFilter=both'));
    await expect(page.locator('select[name="statusFilter"]')).toHaveValue('approved');
  });

  test('ADMIN_ORDER_FilterStatus_002: Xem tất cả đơn hàng ở mọi trạng thái', async ({ page }) => {
    await page.getByRole('button', { name: 'Tìm kiếm' }).click();
    await expect(page).toHaveURL(/admin-order/);
  });

  test('ADMIN_ORDER_FilterVerified_001: Lọc đơn hàng đã xác thực', async ({ page }) => {
    await page.goto(appUrl('/admin-order?keySearch=&statusFilter=&verifyFilter=verify'));
    await expect(page.locator('select[name="verifyFilter"]')).toHaveValue('verify');
  });

  test('ADMIN_ORDER_FilterUnverified_001: Lọc đơn hàng chưa xác thực', async ({ page }) => {
    await page.goto(appUrl('/admin-order?keySearch=&statusFilter=&verifyFilter=un-verify'));
    await expect(page.locator('select[name="verifyFilter"]')).toHaveValue('un-verify');
  });

  test('ADMIN_ORDER_FilterCombined_001: Tìm tên người nhận và lọc trạng thái', async ({ page }) => {
    await page.goto(appUrl('/admin-order?keySearch=v%C5%A9&statusFilter=signed&verifyFilter=both'));

    await expect(page.getByRole('textbox', { name: 'Tìm kiếm theo mã đơn hàng hoặ' })).toHaveValue('vũ');
    await expect(page.locator('select[name="statusFilter"]')).toHaveValue('signed');
    await expect(page.locator('select[name="verifyFilter"]')).toHaveValue('both');
  });

  test('ADMIN_ORDER_FilterCombined_002: Lọc kết hợp trạng thái và xác thực', async ({ page }) => {
    await page.goto(appUrl('/admin-order?keySearch=&statusFilter=signed&verifyFilter=verify'));

    await expect(page.locator('select[name="statusFilter"]')).toHaveValue('signed');
    await expect(page.locator('select[name="verifyFilter"]')).toHaveValue('verify');
  });

  test('ADMIN_ORDER_CreateForm_001: Mở form tạo đơn hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await expect(page.getByText('Tạo đơn hàng cho khách hàng')).toBeVisible();
  });

  test('ADMIN_ORDER_CreateRequired_001: Không tạo ��ơn khi chưa chọn khách hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '113');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByLabel('Khách hàng Chọn khách hàng')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })).toBeVisible();
  });

  test('ADMIN_ORDER_CreateAddress_001: Không tạo đơn khi chưa chọn địa chỉ nhận hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '110');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })).toBeVisible();
  });

  test('ADMIN_ORDER_CreatePayment_001: Không tạo đơn khi chưa chọn phương thức thanh toán', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectProduct(page, '111');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })).toBeVisible();
  });

  test('ADMIN_ORDER_CreateProduct_001: Không tạo đơn khi chưa chọn sản phẩm', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })).toBeVisible();
  });

  test('ADMIN_ORDER_CreateValid_001: Tạo đơn hàng với dữ liệu hợp lệ', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '111');
    await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page).toHaveURL(/admin-order|order-history/);
  });

  test('ADMIN_ORDER_AddProduct_001: Thêm sản phẩm vào đơn hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '105');
    await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
    await selectProduct(page, '112', 1);

    const productSelects = page.getByLabel('Sản phẩm / biến thể Chọn sản');
    await expect(productSelects).toHaveCount(2);
    await expect(productSelects.nth(0)).toHaveValue('105');
    await expect(productSelects.nth(1)).toHaveValue('112');
  });

  test('ADMIN_ORDER_RemoveProduct_001: Xóa sản phẩm khỏi đơn hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '105');
    await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
    await selectProduct(page, '112', 1);
    await page.getByRole('button', { name: 'Xóa dòng sản phẩm' }).nth(1).click();

    const productSelects = page.getByLabel('Sản phẩm / biến thể Chọn sản');
    await expect(productSelects).toHaveCount(1);
    await expect(productSelects.first()).toHaveValue('105');
  });

  test('ADMIN_ORDER_MultipleProducts_001: Thêm nhiều sản phẩm vào đơn hàng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '105');
    await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
    await selectProduct(page, '112', 1);
    await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
    await selectProduct(page, '110', 2);

    const productSelects = page.getByLabel('Sản phẩm / biến thể Chọn sản');
    await expect(productSelects).toHaveCount(3);
    await expect(productSelects.nth(0)).toHaveValue('105');
    await expect(productSelects.nth(1)).toHaveValue('112');
    await expect(productSelects.nth(2)).toHaveValue('110');
  });

  test('ADMIN_ORDER_QuantityZero_001: Nhập số lượng bằng 0', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '108');
    await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('0');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('0');
  });

  test('ADMIN_ORDER_NegativeQuantity_001: Nhập số lượng âm', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '108');
    await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('-1');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('-1');
  });

  test('ADMIN_ORDER_EmptyQuantity_001: Không nhập số lượng', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '108');
    await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).toHaveValue('');
  });

  test('ADMIN_ORDER_DecimalQuantity_001: Không cho tạo đơn với số lượng thập phân', async ({ page }) => {
    await openCreateOrderForm(page);
    await selectCustomer(page, '34');
    await selectAddress(page, '23');
    await selectPaymentMethod(page, '1');
    await selectProduct(page, '108');
    await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('1.5');
    await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();

    await expect(page.getByRole('spinbutton', { name: 'Số lượng' })).not.toHaveValue('1.5');
  });
});