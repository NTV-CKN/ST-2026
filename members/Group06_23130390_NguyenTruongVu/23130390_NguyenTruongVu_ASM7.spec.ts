import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:8080/pkcn_war_exploded/';
const SAMPLE_IMG = 'C:\\Users\\pc\\Desktop\\image_st\\sp-1.png';

/**
 * Hàm hỗ trợ đăng nhập Admin và mở trang Quản lý sản phẩm cho mỗi Test Case
 */
async function loginAndGoToProductManager(page: Page) {
  await page.goto(BASE_URL);
  
  // 1. Đăng nhập
  await page.locator('.stateUserLogin, p:has-text("Đăng nhập")').first().click();
  await page.locator('input[placeholder*="Tên đăng nhập"], input[name="username"], input[name="email"]').fill('admin@gmail.com');
  await page.locator('input[type="password"]').fill('vudeptrai2k5'); // Nhập mật khẩu admin
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForLoadState('networkidle');

  // 2. Chuyển sang Quản lý sản phẩm
  const pmLink = page.locator('a[href*="product-manager"]');
  if (await pmLink.isVisible()) {
    await pmLink.click();
  } else {
    await page.goto(`${BASE_URL}product-manager`);
  }
  await page.waitForLoadState('networkidle');
}

type ProductDetails = {
  name: string;
  categoryId?: string | null;
  includeImage?: boolean;
};

async function openAddProduct(page: Page) {
  await page.locator('.edit-product-add-prod').click();
  await expect(page.locator('#popup-add-product')).toBeVisible();
}

async function fillProductDetails(page: Page, details: ProductDetails) {
  await page.locator('#add-prod-name').fill(details.name);
  await page.locator('#add-prod-warranty').fill('12');
  if (details.categoryId !== null) {
    await page.locator('#add-prod-categoryId').selectOption(details.categoryId ?? '23');
  }
  await page.locator('#add-prod-subtitle').fill('Mô tả ngắn hợp lệ');
  await page.locator('#add-prod-description').fill('Mô tả chi tiết sản phẩm hợp lệ');
  if (details.includeImage !== false) {
    await page.locator('#add-prod-productImages').setInputFiles(SAMPLE_IMG);
  }
}

async function fillVariant(page: Page, index: number, sku: string, overrides: Partial<{
  name: string;
  price: string;
  stock: string;
}> = {}) {
  const variant = page.locator('.add-prod-variant-item').nth(index);
  await variant.locator('input[name="variantNames"]').fill(overrides.name ?? `Biến thể ${index + 1}`);
  await variant.locator('input[name="sku"]').fill(sku);
  await variant.locator('input[name="variantPrices"]').fill(overrides.price ?? '100000');
  await variant.locator('input[name="variantStocks"]').fill(overrides.stock ?? '10');
  await variant.locator('input[name="gram"]').fill('1000');
  await variant.locator('input[name="color"]').fill('Đỏ');
  await variant.locator('input[name="size"]').fill('23cm');
  await variant.locator('input[name="add-prod-variantImages"]').setInputFiles(SAMPLE_IMG);
}

test.describe('Suite Quản Lý Sản Phẩm Admin (Auto Browser Isolation)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAndGoToProductManager(page);
  });

  // =========================================================================
  // GROUP 1: ADD PRODUCT (THÊM SẢN PHẨM)
  // =========================================================================

  test('PROD_MGT_Add-1: Kiểm tra các ô input trên form Thêm mới mặc định rỗng', async ({ page }) => {
    await openAddProduct(page);
    await expect(page.locator('h2:has-text("Thêm sản phẩm mới")')).toBeVisible();

    const inputs = [
      '#add-prod-name',
      '#add-prod-subtitle',
      '#add-prod-description',
      'input[name="variantNames"]',
      'input[name="sku"]',
      'input[name="variantPrices"]',
      'input[name="variantStocks"]',
      'input[name="gram"]',
      'input[name="color"]',
      'input[name="size"]'
    ];

    for (const selector of inputs) {
      await expect(page.locator(selector).first()).toHaveValue('');
    }
    await expect(page.locator('#add-prod-warranty')).toHaveValue('12');
    await expect(page.locator('#add-prod-categoryId')).toHaveValue('');
    await expect(page.locator('#add-prod-productImages')).toHaveValue('');
    await expect(page.locator('input[name="add-prod-variantImages"]')).toHaveValue('');
  });

  test('PROD_MGT_Add-2: Kiểm tra validation không nhập Tên sản phẩm', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: '' });
    await fillVariant(page, 0, 'SKU-ADD-2');

    await page.locator('#submitAddProd').click();
    await expect(page.getByTestId('add-product-name-error')).toHaveText('Tên sản phẩm không được để trống');
  });

  test('PROD_MGT_Add-3: Kiểm tra validation Thời gian bảo hành bằng 0', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Máy mạng' });
    await page.locator('#add-prod-warranty').fill('0');
    await fillVariant(page, 0, 'SKU-ADD-3');

    await page.locator('#submitAddProd').click();
    await expect(page.getByTestId('add-product-warranty-error'))
      .toHaveText('Thời gian bảo hành phải là số nguyên từ 1 đến 127 tháng');
  });

  test('PROD_MGT_Add-4: Kiểm tra validation chưa chọn Thể loại con', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Test mạng', categoryId: null });
    await page.locator('#add-prod-productImages').setInputFiles(SAMPLE_IMG);
    await fillVariant(page, 0, 'SKU-ADD-4');

    await page.locator('#submitAddProd').click();
    await expect(page.getByTestId('add-product-category-error')).toHaveText('Vui lòng chọn một thể loại con');
  });

  test('PROD_MGT_Add-5: Kiểm tra validation để trống Mô tả ngắn và Mô tả chi tiết', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Mạng' });
    await page.locator('#add-prod-subtitle').fill('');
    await page.locator('#add-prod-description').fill('');
    await fillVariant(page, 0, 'SKU-ADD-5');

    await page.locator('#submitAddProd').click();
    await expect(page.getByTestId('add-product-subtitle-error')).toHaveText('Mô tả ngắn không được để trống');
    await expect(page.getByTestId('add-product-description-error')).toHaveText('Mô tả chi tiết không được để trống');
  });

  test('PROD_MGT_Add-6: Kiểm tra validation không chọn Ảnh sản phẩm', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Mạng KT2', includeImage: false });
    await fillVariant(page, 0, 'SKU-ADD-6');

    await page.locator('#submitAddProd').click();
    await expect(page.getByTestId('add-product-images-error')).toHaveText('Vui lòng chọn ít nhất 1 ảnh sản phẩm');
  });

  test('PROD_MGT_Add-8: Kiểm tra validation khi xóa toàn bộ biến thể', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Mạng' });

    await page.locator('.add-prod-variant-item .removeVariant').click();
    await page.locator('#submitAddProd').click();

    await expect(page.getByTestId('add-variant-list-error')).toHaveText('Sản phẩm phải có ít nhất 1 biến thể');
  });

  // =========================================================================
  // GROUP 2: DELETE PRODUCT & VARIANT (XÓA SẢN PHẨM & BIẾN THỂ)
  // =========================================================================

  test('PROD_MGT_Delete-1: Chặn xóa biến thể cuối cùng của sản phẩm', async ({ page }) => {
    const productName = 'VNNETLAN Cáp mạng Cat6 Pre-Press';
    await page.locator('input[name="keySearch"]').fill(productName);
    await page.locator('button:has-text("Tìm kiếm")').click();

    const targetRow = page.locator('tbody tr').filter({ hasText: productName });
    await expect(targetRow).toHaveCount(1);
    await targetRow.locator('.edit-product-show-var').click();

    const modal = page.locator('#popup-variants');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.product-variant-item')).toHaveCount(1);
    await modal.locator('.edit-product-var-remove').click();

    await expect(page.getByTestId('variant-action-message'))
      .toContainText('sản phẩm phải còn ít nhất một biến thể');
  });

  test('PROD_MGT_Delete-2: Xóa sản phẩm ID 190 và kiểm tra dữ liệu snapshot đơn hàng #28', async ({ page }) => {
    // 1. Kiểm tra Lịch sử đơn hàng trước khi xóa
    await page.goto(`${BASE_URL}order-history`);
    const orderSnapshot = page.locator('.wrap-content-order[data-id="28"]');
    await expect(orderSnapshot).toBeVisible();
    await expect(orderSnapshot).toContainText('Mã đơn hàng:');
    await expect(orderSnapshot).toContainText('signed');
    await expect(orderSnapshot).toContainText('Bộ đổi nguồn 220V sang 12V tẩu Ô tô');
    await expect(orderSnapshot).toContainText('Phân loại: Đen | Màu: Đen');
    await expect(orderSnapshot).toContainText('Số lượng: 1');
    await expect(orderSnapshot).toContainText('Đơn giá: đ200,000');
    await expect(orderSnapshot).toContainText('Tổng số tiền: đ250,000');

    // 2. Vào Admin xóa sản phẩm ID 190
    await page.goto(`${BASE_URL}product-manager`);
    await page.locator('input[name="keySearch"]').fill('190');
    await page.locator('button:has-text("Tìm kiếm")').click();

    const productRow = page.locator('tbody tr').filter({
      has: page.locator('td:nth-child(2)', { hasText: /^190$/ })
    });
    await expect(productRow).toHaveCount(1);

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    await productRow.locator('.edit-product-remove').click();

    // Verify sản phẩm 190 đã bị xóa khỏi Admin
    await page.locator('input[name="keySearch"]').fill('190');
    await page.locator('button:has-text("Tìm kiếm")').click();
    await expect(page.locator('body')).toContainText('Không có sản phẩm nào');

    // 3. Kiểm tra lại Lịch sử đơn hàng (snapshot vẫn còn nguyên)
    await page.goto(`${BASE_URL}order-history`);
    await expect(orderSnapshot).toBeVisible();
    await expect(orderSnapshot).toContainText('Bộ đổi nguồn 220V sang 12V tẩu Ô tô');
    await expect(orderSnapshot).toContainText('Phân loại: Đen | Màu: Đen');
    await expect(orderSnapshot).toContainText('Số lượng: 1');
    await expect(orderSnapshot).toContainText('Đơn giá: đ200,000');
    await expect(orderSnapshot).toContainText('Tổng số tiền: đ250,000');
  });

  // =========================================================================
  // GROUP 3: EDIT PRODUCT & VARIANT (CHỈNH SỬA SẢN PHẨM & BIẾN THỂ)
  // =========================================================================

  test('PROD_MGT_Edit-1: Tải dữ liệu cũ lên Form Edit và verify validation ký tự tối thiểu', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('105');
    await page.locator('button:has-text("Tìm kiếm")').click();

    const targetRow = page.locator('tbody tr').filter({
      has: page.locator('td:nth-child(2)', { hasText: /^105$/ })
    });
    await targetRow.locator('.edit-product-update').click();
    await expect(page.locator('#popup-edit')).toBeVisible();
    await expect(page.locator('#name-product')).toHaveValue(/SteelSeries Apex Pro TKL/);

    // Nhập chuỗi vi phạm độ dài
    await page.locator('#name-product').fill('B');
    await page.locator('#long-desc').fill('asc');
    await page.locator('#short-desc').fill('Ap');

    await page.locator('#submit-update-product').click();

    await expect(page.getByTestId('edit-product-name-error')).toHaveText('Tên sản phẩm phải có ít nhất 3 ký tự.');
    await expect(page.getByTestId('edit-product-subtitle-error')).toHaveText('Mô tả ngắn phải có ít nhất 5 ký tự.');
    await expect(page.getByTestId('edit-product-description-error'))
      .toHaveText('Mô tả chi tiết phải có ít nhất 10 ký tự.');
  });

  test('PROD_MGT_Edit-2: Chặn xóa ảnh đang được chọn làm ảnh chính', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('105');
    await page.locator('button:has-text("Tìm kiếm")').click();
    const targetRow = page.locator('tbody tr').filter({
      has: page.locator('td:nth-child(2)', { hasText: /^105$/ })
    });
    await targetRow.locator('.edit-product-update').click();
    await expect(page.locator('#popup-edit')).toBeVisible();

    const mainImageRemove = page.locator('#popup-edit .image-item').first().locator('.edit-remove-img');
    await mainImageRemove.click();
    await expect(mainImageRemove).not.toBeChecked();
    await expect(page.getByTestId('edit-main-image-delete-error'))
      .toHaveText('Không thể xóa ảnh đang được chọn làm ảnh chính.');
  });

  test('PROD_MGT_Edit-3: Cập nhật Giá (180,000) và Tồn kho (50) của biến thể thành công', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('Hộp test mạng');
    await page.locator('button:has-text("Tìm kiếm")').click();

    const targetRow = page.locator('tbody tr').filter({ hasText: 'Hộp test mạng' });
    await targetRow.locator('.edit-product-show-var').click();

    const modal = page.locator('#popup-variants');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.product-variant-item').first()).toBeVisible();
    await modal.locator('.edit-product-var-update').first().click();
    await expect(page.locator('#popup-edit-variant')).toBeVisible();

    await page.locator('#editVariantForm input[name="variantPrices"]').fill('180000');
    await page.locator('#editVariantForm input[name="variantStocks"]').fill('50');

    page.once('dialog', dialog => dialog.accept());
    await page.locator('#submitEditProdVar').click();

    await page.reload();
    await page.locator('input[name="keySearch"]').fill('Hộp test mạng');
    await page.locator('button:has-text("Tìm kiếm")').click();
    await page.locator('tbody tr').filter({ hasText: 'Hộp test mạng' }).locator('.edit-product-show-var').click();
    const updatedVariant = page.locator('#popup-variants .product-variant-item').first();
    await expect(updatedVariant.locator('td').nth(4)).toContainText('180,000');
    await expect(updatedVariant.locator('td').nth(5)).toHaveText('50');
  });

  test('PROD_MGT_Edit-4: Kiểm tra thuộc tính readonly của ô nhập Mã SKU', async ({ page }) => {
    await page.locator('.edit-product-show-var').first().click();
    await expect(page.locator('#popup-variants')).toBeVisible();
    await page.locator('#popup-variants .edit-product-var-update').first().click();
    await expect(page.locator('#popup-edit-variant')).toBeVisible();

    await expect(page.locator('#edit-variant-sku')).toHaveAttribute('readonly');
  });

  // =========================================================================
  // GROUP 4: LIST & SEARCH PRODUCT (DANH SÁCH & TÌM KIẾM SẢN PHẨM)
  // =========================================================================

  test('PROD_MGT_List-1: Kiểm tra danh sách cột tiêu đề bảng sản phẩm', async ({ page }) => {
    const productTable = page.locator('.main-content-admin table');
    await expect(productTable.locator('th:has-text("Mã sản phẩm")')).toBeVisible();
    await expect(productTable.locator('th:has-text("Tên sản phâm")')).toBeVisible();
    await expect(productTable.locator('th:has-text("Số lượng sản phẩm biến thể")')).toBeVisible();
    await expect(productTable.locator('th:has-text("Tổng số lượng")')).toBeVisible();
    await expect(productTable.locator('th:has-text("Phạm vi giá")')).toBeVisible();
    await expect(productTable.locator('th:has-text("Thao tác")')).toBeVisible();
  });

  test('PROD_MGT_List-2: Kiểm tra thứ tự sắp xếp mặc định tăng dần theo ID sản phẩm', async ({ page }) => {
    await page.reload();
    const idCells = await page.locator('table tbody tr td:nth-child(2)').allInnerTexts();
    const ids = idCells.map(text => parseInt(text.trim())).filter(n => !isNaN(n));
    expect(ids.length).toBeGreaterThan(0);

    const sortedIds = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedIds);
  });

  test('PROD_MGT_List-3: Tìm kiếm sản phẩm chính xác theo ID 105', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('105');
    await page.locator('button:has-text("Tìm kiếm")').click();

    const targetRow = page.locator('tbody tr').filter({
      has: page.locator('td:nth-child(2)', { hasText: /^105$/ })
    });
    await expect(targetRow).toBeVisible();
    await expect(targetRow).toContainText('Bàn phím gaming có dây SteelSeries Apex Pro TKL Gen 3 kèm kê tay');
    await expect(targetRow.locator('td').nth(3)).toHaveText('1');
    await expect(targetRow.locator('td').nth(4)).toHaveText('100');
    await expect(targetRow.locator('td').nth(5)).toHaveText('5,614,940 VND');
  });

  test('PROD_MGT_List-4: Tìm kiếm theo tên sản phẩm có chứa từ khóa', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('Cáp Type C to HDMI');
    await page.locator('button:has-text("Tìm kiếm")').click();

    const targetRow = page.locator('tbody tr').filter({ hasText: 'Cáp Type C to HDMI Feeltek Flexible' });
    await expect(targetRow).toContainText('Cáp Type C to HDMI Feeltek Flexible');
    await expect(targetRow.locator('td').nth(1)).toHaveText('138');
    await expect(targetRow.locator('td').nth(3)).toHaveText('1');
    await expect(targetRow.locator('td').nth(4)).toHaveText('100');
  });

  test('PROD_MGT_List-5: Tìm kiếm với từ khóa không tồn tại', async ({ page }) => {
    await page.locator('input[name="keySearch"]').fill('XYZ123');
    await page.locator('button:has-text("Tìm kiếm")').click();

    await expect(page.locator('text="Không có sản phẩm nào"')).toBeVisible();
  });

  // =========================================================================
  // GROUP 5: STATUS TOGGLE (BẬT / TẮT TRẠNG THÁI HIỂN THỊ)
  // =========================================================================

  test('PROD_MGT_Status-1: Chuyển trạng thái Inactive -> Ẩn khỏi Client -> Khôi phục Active', async ({ page }) => {
    const productName = 'Bàn phím máy tính mini có dây SIDOTECH XKB02';
    const findStatusCheckbox = async () => {
      await page.goto(`${BASE_URL}product-manager`);
      await page.locator('input[name="keySearch"]').fill('100');
      await page.locator('button:has-text("Tìm kiếm")').click();
      const targetRow = page.locator('tbody tr').filter({
        has: page.locator('td:nth-child(2)', { hasText: /^100$/ })
      });
      await targetRow.locator('.edit-product-update').click();
      await expect(page.locator('#popup-edit')).toBeVisible();
      return page.locator('#popup-edit .edit-isActive');
    };

    try {
      // 1. Tắt trạng thái Active
      let chkStatus = await findStatusCheckbox();
      await expect(chkStatus).toBeChecked();
      await chkStatus.uncheck();

      page.once('dialog', dialog => dialog.accept());
      await page.locator('#submit-update-product').click();
      await expect(page.locator('#popup-edit')).toBeHidden();

      // Sản phẩm vẫn được quản lý trong danh sách Admin
      await page.locator('input[name="keySearch"]').fill(productName);
      await page.locator('button:has-text("Tìm kiếm")').click();
      await expect(page.locator('tbody tr').filter({ hasText: productName })).toBeVisible();

      // 2. Sang Client search từ khóa -> Verify bị ẩn
      await page.goto(BASE_URL);
      await page.locator('.search-input').fill(productName);
      await page.locator('.search-button').click();
      await expect(page.locator('body')).toContainText('Không tìm thấy sản phẩm nào');
    } finally {
      // 3. Khôi phục Active để không làm bẩn dữ liệu dùng chung
      const chkStatus = await findStatusCheckbox();
      if (!(await chkStatus.isChecked())) {
        await chkStatus.check();
        page.once('dialog', dialog => dialog.accept());
        await page.locator('#submit-update-product').click();
        await expect(page.locator('#popup-edit')).toBeHidden();
      }
    }
  });

  // =========================================================================
  // GROUP 6: VARIANT MANAGEMENT (QUẢN LÝ BIẾN THỂ VÀ VALIDATION FORM THÊM)
  // =========================================================================

  test('PROD_MGT_Variant-1: Thêm và Xóa khối biến thể động trên giao diện', async ({ page }) => {
    await openAddProduct(page);

    const initialBlocks = await page.locator('#variantList .add-prod-variant-item').count();
    await page.locator('#addVariantBtn').click();

    const afterAddBlocks = await page.locator('#variantList .add-prod-variant-item').count();
    expect(afterAddBlocks).toBeGreaterThan(initialBlocks);

    await page.locator('#variantList .add-prod-variant-item').last().locator('.removeVariant').click();
    const afterRemoveBlocks = await page.locator('#variantList .add-prod-variant-item').count();
    expect(afterRemoveBlocks).toEqual(initialBlocks);
  });

  test('PROD_MGT_Variant-2: Validate biến thể với Giá <= 0 và Số lượng < 0', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Kiểm tra biến thể' });
    await fillVariant(page, 0, 'SKU-VAR-2', { name: 'B', price: '-10000', stock: '-1' });

    await page.locator('#submitAddProd').click();

    await expect(page.getByTestId('add-variant-name-error'))
      .toHaveText('Biến thể 1: Tên phải có ít nhất 3 ký tự');
    await expect(page.getByTestId('add-variant-price-error'))
      .toHaveText('Biến thể 1: Giá phải lớn hơn 0 và có tối đa 2 chữ số thập phân');
    await expect(page.getByTestId('add-variant-stock-error'))
      .toHaveText('Biến thể 1: Số lượng phải là số nguyên từ 0 trở lên');
  });

  test('PROD_MGT_Variant-3: Validate SKU biến thể dưới 2 ký tự', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Kiểm tra SKU' });
    await fillVariant(page, 0, 'B');

    await page.locator('#submitAddProd').click();

    await expect(page.getByTestId('add-variant-sku-error'))
      .toHaveText('Biến thể 1: SKU phải có ít nhất 2 ký tự');
  });

  test('PROD_MGT_Variant-4: Validate các biến thể bị trùng SKU ngay trong Form', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Kiểm tra SKU trùng' });
    await fillVariant(page, 0, 'SKU-SAME-01');

    await page.locator('#addVariantBtn').click();
    await fillVariant(page, 1, 'SKU-SAME-01');

    await page.locator('#submitAddProd').click();

    const errors = page.getByText('SKU bị trùng trong các biến thể của form', { exact: true });
    await expect(errors).toHaveCount(2);
  });

  test('PROD_MGT_Variant-5: Validate SKU đã tồn tại trong CSDL', async ({ page }) => {
    await openAddProduct(page);
    await fillProductDetails(page, { name: 'Kiểm tra SKU đã có' });
    await fillVariant(page, 0, 'HTM_rj45');

    await page.locator('#submitAddProd').click();

    await expect(page.getByTestId('add-variant-sku-error'))
      .toHaveText('SKU này đã tồn tại trong kho dữ liệu', { timeout: 15000 });
  });

  test('PROD_MGT_Variant-6: Thêm sản phẩm thành công với 2 biến thể hợp lệ', async ({ page }) => {
    await openAddProduct(page);

    const uniqueSuffix = Date.now();
    const productName = `Mạng AutoTest ${uniqueSuffix}`;
    const expectedPrice = '100,000 - 200,000 VND';
    await fillProductDetails(page, { name: productName, categoryId: '27' });
    await fillVariant(page, 0, `SKU1-${uniqueSuffix}`, { name: 'Biến thể 1', price: '100000', stock: '10' });

    await page.locator('#addVariantBtn').click();
    await fillVariant(page, 1, `SKU2-${uniqueSuffix}`, { name: 'Biến thể 2', price: '200000', stock: '15' });

    await page.locator('#submitAddProd').click();
    await expect(page.locator('#popup-add-product')).toBeHidden({ timeout: 60000 });

    const createdProduct = page.locator('.main-content-admin tbody tr').filter({ hasText: productName });
    await expect(createdProduct).toHaveCount(1);
    await expect(createdProduct.locator('td').nth(5)).toHaveText(expectedPrice);
    await expect(createdProduct.locator('td').nth(4)).toHaveText('25');
  });

});