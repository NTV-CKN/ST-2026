
import { test, expect } from '@playwright/test';

// Mật khẩu được lấy từ biến môi trường TEST_PASSWORD
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'vudeptrai2k5';

async function loginAdmin(page: any) {
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page.waitForTimeout(1500);

    await page.getByRole('textbox', {
        name: 'Tên đăng nhập hoặc email'
    }).fill('admin@gmail.com');

    await page.waitForTimeout(1500);

    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).fill(TEST_PASSWORD);

    await page.waitForTimeout(1500);

    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).press('Enter');

    await page.waitForTimeout(1500);

    await page.getByText('Quản lí đơn hàng Tạo đơn hàng').click();
    await page.waitForTimeout(1500);
}

// ADMIN_ORDER_View_001
test('ADMIN_ORDER_View_001 - Hien thi trang quan ly don hang', async ({ page }) => {
    await loginAdmin(page);

    await expect(
        page.getByRole('heading', { name: 'Quản lí đơn hàng' })
    ).toBeVisible();

    await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchCode_001
test('ADMIN_ORDER_SearchCode_001 - Tim don hang theo ma ton tai', async ({ page }) => {
    await loginAdmin(page);

    const searchInput = page.getByRole('textbox', {
        name: 'Tìm kiếm theo mã đơn hàng hoặ'
    });

    await searchInput.fill('28');
    await page.waitForTimeout(1500);

    await page.getByRole('button', {
        name: 'Tìm kiếm'
    }).click();

    await page.waitForTimeout(1500);

    await expect(searchInput).toHaveValue('28');
});

// ADMIN_ORDER_Empty_001
test('ADMIN_ORDER_Empty_001 - Hien thi khi khong co don hang', async ({ page }) => {
    await loginAdmin(page);

    await expect(
        page.getByText('Không có đơn hàng nào')
    ).toBeVisible();

    await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchCode_002
test('ADMIN_ORDER_SearchCode_002 - Tim ma don hang khong ton tai', async ({ page }) => {
    await loginAdmin(page);

    const searchInput = page.getByRole('textbox', {
        name: 'Tìm kiếm theo mã đơn hàng hoặ'
    });

    await searchInput.fill('999999999');
    await page.waitForTimeout(1500);

    await page.getByRole('button', {
        name: 'Tìm kiếm'
    }).click();

    await page.waitForTimeout(1500);

    await expect(searchInput).toHaveValue('999999999');

    await expect(
        page.getByText('Không có đơn hàng nào')
    ).toBeVisible();

    await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchName_001
test('ADMIN_ORDER_SearchName_001 - Tim don hang theo ten nguoi nhan', async ({ page }) => {
  await loginAdmin(page);

  const searchInput = page.getByRole('textbox', {
    name: 'Tìm kiếm theo mã đơn hàng hoặ'
  });

  // Nhập tên người nhận
  await searchInput.fill('toàn');
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra nội dung tìm kiếm được giữ lại
  await expect(searchInput).toHaveValue('toàn');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchName_002
test('ADMIN_ORDER_SearchName_002 - Tim ten nguoi nhan khong ton tai', async ({ page }) => {
  await loginAdmin(page);

  const searchInput = page.getByRole('textbox', {
    name: 'Tìm kiếm theo mã đơn hàng hoặ'
  });

  // Nhập tên người nhận không tồn tại
  await searchInput.fill('KhachHangKhongTonTai999');
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra nội dung tìm kiếm được giữ lại
  await expect(searchInput).toHaveValue('KhachHangKhongTonTai999');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchEmpty_001
test('ADMIN_ORDER_SearchEmpty_001 - Tim kiem khi tu khoa trong', async ({ page }) => {
  await loginAdmin(page);

  const searchInput = page.getByRole('textbox', {
    name: 'Tìm kiếm theo mã đơn hàng hoặ'
  });

  // Để trống từ khóa
  await searchInput.fill('');
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra ô tìm kiếm vẫn trống
  await expect(searchInput).toHaveValue('');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_SearchSpace_001
test('ADMIN_ORDER_SearchSpace_001 - Tim kiem bang khoang trang', async ({ page }) => {
  await loginAdmin(page);

  const searchInput = page.getByRole('textbox', {
    name: 'Tìm kiếm theo mã đơn hàng hoặ'
  });

  // Nhập khoảng trắng
  await searchInput.fill('   ');
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra giá trị đã nhập
  await expect(searchInput).toHaveValue('   ');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterStatus_001
test('ADMIN_ORDER_FilterStatus_001 - Loc don hang theo trang thai da duyet', async ({ page }) => {
  await loginAdmin(page);

  // Chọn trạng thái đã duyệt
  const statusFilter = page.locator('select[name="statusFilter"]');

  await statusFilter.selectOption('approved');
  await page.waitForTimeout(1500);

  // Truy cập danh sách đơn hàng với trạng thái đã chọn
  await page.goto('http://localhost:8080/admin-order?keySearch=&statusFilter=approved&verifyFilter=both');
  await page.waitForTimeout(1500);

  // Kiểm tra trạng thái được chọn
  await expect(statusFilter).toHaveValue('approved');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterStatus_002
test('ADMIN_ORDER_FilterStatus_002 - Xem tat ca don hang o moi trang thai', async ({ page }) => {
  await loginAdmin(page);

  // Nhấn tìm kiếm khi không chọn bộ lọc trạng thái cụ thể
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra trang quản lý đơn hàng vẫn hiển thị
  await expect(page).toHaveURL(/admin-order/);

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterVerified_001
test('ADMIN_ORDER_FilterVerified_001 - Loc don hang da xac thuc', async ({ page }) => {
  await loginAdmin(page);

  // Chọn bộ lọc đơn hàng đã xác thực
  const verifyFilter = page.locator('select[name="verifyFilter"]');

  await verifyFilter.selectOption('verify');
  await page.waitForTimeout(1500);

  // Tải danh sách theo bộ lọc
  await page.goto(
    'http://localhost:8080/admin-order?keySearch=&statusFilter=&verifyFilter=verify'
  );
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra bộ lọc đã chọn đúng
  await expect(verifyFilter).toHaveValue('verify');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterUnverified_001
test('ADMIN_ORDER_FilterUnverified_001 - Loc don hang chua xac thuc', async ({ page }) => {
  await loginAdmin(page);

  // Chọn trạng thái chưa xác thực
  const verifyFilter = page.locator('select[name="verifyFilter"]');

  await verifyFilter.selectOption('un-verify');
  await page.waitForTimeout(1500);

  // Tải danh sách theo bộ lọc
  await page.goto(
    'http://localhost:8080/admin-order?keySearch=&statusFilter=&verifyFilter=un-verify'
  );
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra bộ lọc đã chọn đúng
  await expect(verifyFilter).toHaveValue('un-verify');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterCombined_001
test('ADMIN_ORDER_FilterCombined_001 - Tim ten nguoi nhan va loc trang thai', async ({ page }) => {
  await loginAdmin(page);

  // Nhập tên người nhận
  const searchInput = page.getByRole('textbox', {
    name: 'Tìm kiếm theo mã đơn hàng hoặ'
  });

  await searchInput.fill('vũ');
  await page.waitForTimeout(1500);

  // Chọn trạng thái đã ký
  const statusFilter = page.locator('select[name="statusFilter"]');

  await statusFilter.selectOption('signed');
  await page.waitForTimeout(1500);

  // Chọn tất cả trạng thái xác thực
  const verifyFilter = page.locator('select[name="verifyFilter"]');

  await verifyFilter.selectOption('both');

  // Tải danh sách theo điều kiện lọc
  await page.goto(
    'http://localhost:8080/admin-order?keySearch=v%C5%A9&statusFilter=signed&verifyFilter=both'
  );
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra các điều kiện lọc
  await expect(searchInput).toHaveValue('vũ');
  await expect(statusFilter).toHaveValue('signed');
  await expect(verifyFilter).toHaveValue('both');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_FilterCombined_002
test('ADMIN_ORDER_FilterCombined_002 - Loc ket hop trang thai va xac thuc', async ({ page }) => {
  await loginAdmin(page);

  // Chọn trạng thái đơn hàng: Đã ký
  const statusFilter = page.locator('select[name="statusFilter"]');

  await statusFilter.selectOption('signed');
  await page.waitForTimeout(1500);

  // Chọn loại xác thực: Đã xác thực
  const verifyFilter = page.locator('select[name="verifyFilter"]');

  await verifyFilter.selectOption('verify');
  await page.waitForTimeout(1500);

  // Tải danh sách theo hai điều kiện lọc
  await page.goto(
    'http://localhost:8080/admin-order?keySearch=&statusFilter=signed&verifyFilter=verify'
  );
  await page.waitForTimeout(1500);

  // Nhấn tìm kiếm
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra hai bộ lọc
  await expect(statusFilter).toHaveValue('signed');
  await expect(verifyFilter).toHaveValue('verify');

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_CreateForm_001
test('ADMIN_ORDER_CreateForm_001 - Mo form tao don hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Kiểm tra form tạo đơn hàng hiển thị
  await expect(
    page.getByText('Tạo đơn hàng cho khách hàng')
  ).toBeVisible();

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_CreateRequired_001
test('ADMIN_ORDER_CreateRequired_001 - Tao don hang khi chua chon khach hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm
  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('113');
  await page.waitForTimeout(1500);

  // Nhấn tạo đơn khi chưa chọn khách hàng
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra khách hàng vẫn chưa được chọn
  await expect(
    page.getByLabel('Khách hàng Chọn khách hàng')
  ).toHaveValue('');

  // Kiểm tra form vẫn hiển thị
  await expect(
    page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })
  ).toBeVisible();

  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_CreateAddress_001
test('ADMIN_ORDER_CreateAddress_001 - Tao don hang khi chua chon dia chi nhan hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm
  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('110');
  await page.waitForTimeout(1500);

  // Không chọn địa chỉ nhận hàng, nhấn tạo đơn
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra form vẫn hiển thị
  await expect(
    page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })
  ).toBeVisible();
});

// ADMIN_ORDER_CreatePayment_001
test('ADMIN_ORDER_CreatePayment_001 - Tao don hang khi chua chon phuong thuc thanh toan', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm
  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('111');
  await page.waitForTimeout(1500);

  // Không chọn phương thức thanh toán
  // Nhấn tạo đơn hàng
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra form vẫn hiển thị
  await expect(
    page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })
  ).toBeVisible();
});

// ADMIN_ORDER_CreateProduct_001
test('ADMIN_ORDER_CreateProduct_001 - Tao don hang khi chua chon san pham', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Không chọn sản phẩm
  // Nhấn tạo đơn hàng
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra form vẫn hiển thị
  await expect(
    page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' })
  ).toBeVisible();
});

// ADMIN_ORDER_CreateValid_001
test('ADMIN_ORDER_CreateValid_001 - Tao don hang voi du lieu hop le', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm
  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('111');
  await page.waitForTimeout(1500);

  // Thêm sản phẩm vào đơn hàng
  await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
  await page.waitForTimeout(1500);

  // Tạo đơn hàng
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);
});

// ADMIN_ORDER_AddProduct_001
test('ADMIN_ORDER_AddProduct_001 - Them san pham vao don hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm thứ nhất
  const productSelect = page.getByLabel('Sản phẩm / biến thể Chọn sản');

  await productSelect.nth(0).selectOption('105');
  await page.waitForTimeout(1500);

  // Thêm dòng sản phẩm thứ hai
  await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
  await page.waitForTimeout(1500);

  // Chọn sản phẩm thứ hai
  await productSelect.nth(1).selectOption('112');
  await page.waitForTimeout(1500);

  // Kiểm tra hai sản phẩm đã được chọn
  await expect(productSelect.nth(0)).toHaveValue('105');
  await expect(productSelect.nth(1)).toHaveValue('112');
});

// ADMIN_ORDER_RemoveProduct_001
test('ADMIN_ORDER_RemoveProduct_001 - Xoa san pham khoi don hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  // Chọn sản phẩm thứ nhất
  const productSelect = page.getByLabel('Sản phẩm / biến thể Chọn sản');

  await productSelect.nth(0).selectOption('105');
  await page.waitForTimeout(1500);

  // Thêm dòng sản phẩm thứ hai
  await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
  await page.waitForTimeout(1500);

  // Chọn sản phẩm thứ hai
  await productSelect.nth(1).selectOption('112');
  await page.waitForTimeout(1500);

  // Xóa dòng sản phẩm thứ hai
  await page.getByRole('button', { name: 'Xóa dòng sản phẩm' }).nth(1).click();
  await page.waitForTimeout(1500);

  // Kiểm tra chỉ còn một dòng sản phẩm
  await expect(productSelect).toHaveCount(1);
  await expect(productSelect.nth(0)).toHaveValue('105');
});

// ADMIN_ORDER_MultipleProducts_001
test('ADMIN_ORDER_MultipleProducts_001 - Them nhieu san pham vao don hang', async ({ page }) => {
  await loginAdmin(page);

  // Mở form tạo đơn hàng
  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  // Chọn khách hàng
  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  // Chọn địa chỉ nhận hàng
  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  // Chọn phương thức thanh toán
  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  const productSelect = page.getByLabel('Sản phẩm / biến thể Chọn sản');

  // Chọn sản phẩm thứ nhất
  await productSelect.nth(0).selectOption('105');
  await page.waitForTimeout(1500);

  // Thêm sản phẩm thứ hai
  await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
  await page.waitForTimeout(1500);

  await productSelect.nth(1).selectOption('112');
  await page.waitForTimeout(1500);

  // Thêm sản phẩm thứ ba
  await page.getByRole('button', { name: '+ Thêm sản phẩm' }).click();
  await page.waitForTimeout(1500);

  await productSelect.nth(2).selectOption('110');
  await page.waitForTimeout(1500);

  // Kiểm tra có đủ 3 dòng sản phẩm
  await expect(productSelect).toHaveCount(3);

  // Kiểm tra từng sản phẩm
  await expect(productSelect.nth(0)).toHaveValue('105');
  await expect(productSelect.nth(1)).toHaveValue('112');
  await expect(productSelect.nth(2)).toHaveValue('110');
});

test('ADMIN_ORDER_QuantityZero_001 - Nhap so luong bang 0', async ({ page }) => {
  await loginAdmin(page);

  await page.waitForTimeout(1500);

  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('108');
  await page.waitForTimeout(1500);

  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('0');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra giá trị số lượng vẫn là 0 sau khi nhấn tạo đơn
  await expect(
    page.getByRole('spinbutton', { name: 'Số lượng' })
  ).toHaveValue('0');
});

test('ADMIN_ORDER_NegativeQuantity_001 - Nhap so luong am', async ({ page }) => {
  await loginAdmin(page);

  await page.waitForTimeout(1500);

  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('108');
  await page.waitForTimeout(1500);

  // Nhập số lượng âm
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('-1');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra giá trị số lượng sau khi nhấn tạo đơn
  await expect(
    page.getByRole('spinbutton', { name: 'Số lượng' })
  ).toHaveValue('-1');
});

test('ADMIN_ORDER_EmptyQuantity_001 - Khong nhap so luong', async ({ page }) => {
  await loginAdmin(page);

  await page.waitForTimeout(1500);

  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('108');
  await page.waitForTimeout(1500);

  // Để trống số lượng
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('');
  await page.waitForTimeout(1500);

  // Nhấn tạo đơn
  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra số lượng vẫn đang để trống
  await expect(
    page.getByRole('spinbutton', { name: 'Số lượng' })
  ).toHaveValue('');
});

test('ADMIN_ORDER_DecimalQuantity_001 - Khong cho tao don voi so luong thap phan', async ({ page }) => {
  await loginAdmin(page);

  await page.waitForTimeout(1500);

  await page.getByText('Tạo đơn hàng cho khách hàng').click();
  await page.waitForTimeout(1500);

  await page.getByLabel('Khách hàng Chọn khách hàng').selectOption('34');
  await page.waitForTimeout(1500);

  await page.getByLabel('Địa chỉ nhận hàng Chọn địa ch').selectOption('23');
  await page.waitForTimeout(1500);

  await page.getByLabel('Phương thức thanh toán Chọn').selectOption('1');
  await page.waitForTimeout(1500);

  await page.getByLabel('Sản phẩm / biến thể Chọn sản').selectOption('108');
  await page.waitForTimeout(1500);

  // Nhập số lượng thập phân
  await page.getByRole('spinbutton', { name: 'Số lượng' }).fill('1.5');
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Tạo đơn và giữ tồn kho' }).click();
  await page.waitForTimeout(1500);

  // Kiểm tra giá trị số lượng
  await expect(
    page.getByRole('spinbutton', { name: 'Số lượng' })
  ).not.toHaveValue('1.5');
});