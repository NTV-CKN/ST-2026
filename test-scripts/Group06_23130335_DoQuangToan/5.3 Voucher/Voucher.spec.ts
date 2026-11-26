import { expect, test, type Page } from '@playwright/test';
import { env } from 'node:process';

const BASE_URL = env.BASE_URL?.trim();

if (!BASE_URL) {
    throw new Error('Missing required environment variable: BASE_URL');
}

const ADMIN_EMAIL = env.ADMIN_EMAIL?.trim();
const ADMIN_PASSWORD = env.ADMIN_PASSWORD;
const CUSTOMER_EMAIL = env.USER_EMAIL?.trim();
const CUSTOMER_PASSWORD = env.USER_PASSWORD;

function requiredEnv(name: string, value: string | undefined): string {
    if (!value?.trim()) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value.trim();
}

function appUrl(path: string): string {
    const base = new URL(BASE_URL);
    base.pathname = `${base.pathname.replace(/\/+$/, '')}/`;

    return new URL(path.replace(/^\/+/, ''), base).toString();
}

function getDateTimeAfter(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

async function loginAdmin(page: Page): Promise<void> {
    await page.goto(appUrl('/'));

    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page
        .getByRole('textbox', { name: 'Tên đăng nhập hoặc email' })
        .fill(requiredEnv('ADMIN_EMAIL', ADMIN_EMAIL));
    await page
        .getByRole('textbox', { name: 'Mật khẩu' })
        .fill(requiredEnv('ADMIN_PASSWORD', ADMIN_PASSWORD));
    await page.getByRole('textbox', { name: 'Mật khẩu' }).press('Enter');

    // Xác nhận đã đăng nhập bằng Admin, không tiếp tục test với session Customer.
    await expect(page.getByRole('link', { name: 'Quản lí voucher' })).toBeVisible();
}

async function loginCustomer(page: Page): Promise<void> {
    await page.goto(appUrl('/'));

    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page
        .getByRole('textbox', { name: 'Tên đăng nhập hoặc email' })
        .fill(requiredEnv('USER_EMAIL', CUSTOMER_EMAIL));
    await page
        .getByRole('textbox', { name: 'Mật khẩu' })
        .fill(requiredEnv('USER_PASSWORD', CUSTOMER_PASSWORD));
    await page.getByRole('textbox', { name: 'Mật khẩu' }).press('Enter');
}

async function openAdminVoucher(page: Page): Promise<void> {
    await page.getByRole('link', { name: 'Quản lí voucher' }).click();

    await expect(
        page.getByRole('textbox', { name: 'Mã voucher' }),
    ).toBeVisible();
}

async function openVoucherStore(page: Page): Promise<void> {
    const voucherLink = page.getByRole('link', { name: 'KHO VOUCHER' });
    await expect(voucherLink).toBeVisible();
    await voucherLink.click();
    await expect(page.locator('body')).toContainText(/voucher/i);
}

interface VoucherInformation {
    code: string;
    programName: string;
    discountType?: 'PERCENT' | 'FIXED';
    discountValue?: string;
    minimumOrderValue?: string;
    totalUsage?: string;
    maximumDiscount?: string;
    startAfterDays?: number;
    endAfterDays?: number;
}

async function fillVoucherInformation(
    page: Page,
    information: VoucherInformation,
): Promise<void> {
    await page.getByRole('textbox', { name: 'Mã voucher' }).fill(information.code);
    await page
        .getByRole('textbox', { name: 'Tên chương trình' })
        .fill(information.programName);
    await page
        .getByRole('textbox', { name: 'Mô tả' })
        .fill('Voucher kiểm thử tự động');

    await page
        .getByRole('combobox')
        .selectOption(information.discountType ?? 'PERCENT');

    await page
        .getByRole('spinbutton', { name: 'Mức giảm (% hoặc số tiền)' })
        .fill(information.discountValue ?? '10');

    await page
        .getByRole('spinbutton', { name: 'Giá trị đơn tối thiểu Tính tr' })
        .fill(information.minimumOrderValue ?? '5000');

    if (information.maximumDiscount !== undefined) {
        await page
            .getByRole('spinbutton', { name: 'Giảm tối đa (không bắt buộc)' })
            .fill(information.maximumDiscount);
    }

    if (information.totalUsage !== undefined) {
        await page
            .getByRole('spinbutton', { name: /Tổng lượt dùng/ })
            .fill(information.totalUsage);
    }

    await page
        .getByRole('textbox', { name: 'Bắt đầu' })
        .fill(getDateTimeAfter(information.startAfterDays ?? 1));

    await page
        .getByRole('textbox', { name: 'Kết thúc' })
        .fill(getDateTimeAfter(information.endAfterDays ?? 15));
}

async function createVoucher(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'Tạo voucher' }).click();
}

test.describe('Voucher Management - Admin', () => {
    test.beforeEach(async ({ page }) => {
        await loginAdmin(page);
        await openAdminVoucher(page);
    });

    test('VOUCHER_Create_Success_001: Tạo voucher thành công', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `AUTO${Date.now()}`,
            programName: 'Khuyến mãi tự động',
            discountType: 'PERCENT',
            discountValue: '10',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_EmptyCode_001: Không nhập mã voucher', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: '',
            programName: 'Voucher kiểm thử bỏ trống mã',
            discountType: 'PERCENT',
            discountValue: '0.09',
            totalUsage: '10',
        });

        await createVoucher(page);

        const voucherCode = page.getByRole('textbox', { name: 'Mã voucher' });
        const isValid = await voucherCode.evaluate(
            (element: HTMLInputElement) => element.validity.valid,
        );
        const validationMessage = await voucherCode.evaluate(
            (element: HTMLInputElement) => element.validationMessage,
        );

        expect(isValid).toBe(false);
        expect(validationMessage).not.toBe('');
    });

    test('VOUCHER_DuplicateCode_001: Nhập mã voucher đã tồn tại', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: 'TN1718',
            programName: 'Voucher kiểm thử mã trùng',
            discountType: 'PERCENT',
            discountValue: '0.03',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Mã voucher này đã tồn tại. Hãy chọn mã khác.', {
                exact: true,
            }),
        ).toBeVisible();
    });

    test('VOUCHER_EmptyName_001: Không nhập tên chương trình', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `EMPTY${Date.now()}`,
            programName: '',
            discountType: 'PERCENT',
            discountValue: '0.09',
            totalUsage: '10',
        });

        await createVoucher(page);

        const programName = page.getByRole('textbox', { name: 'Tên chương trình' });
        const isValid = await programName.evaluate(
            (element: HTMLInputElement) => element.validity.valid,
        );
        const validationMessage = await programName.evaluate(
            (element: HTMLInputElement) => element.validationMessage,
        );

        expect(isValid).toBe(false);
        expect(validationMessage).not.toBe('');
    });

    test('VOUCHER_Percentage_001: Tạo voucher giảm giá phần trăm', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `PCT${Date.now()}`,
            programName: 'Voucher giảm giá phần trăm',
            discountType: 'PERCENT',
            discountValue: '0.09',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_FixedAmount_001: Tạo voucher giảm giá số tiền cố định', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `FIX${Date.now()}`,
            programName: 'Voucher giảm giá số tiền cố định',
            discountType: 'FIXED',
            discountValue: '50000',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_PerCustomerLimit_001: Thiết lập giới hạn sử dụng mỗi khách hàng', async ({ page }) => {
        // Bước 1, 2, 3: Nhập mã voucher và các thông tin cần thiết
        await fillVoucherInformation(page, {
            code: `PERUSER${Date.now()}`,
            programName: 'Voucher giới hạn sử dụng mỗi khách hàng',
            discountType: 'PERCENT',
            discountValue: '10',
            totalUsage: '100',
        });

        // Thiết lập giới hạn sử dụng mỗi khách hàng
        await page
            .getByRole('spinbutton', { name: 'Giới hạn mỗi khách hàng' })
            .fill('2');

        // Kiểm tra giá trị giới hạn đã được nhập
        await expect(
            page.getByRole('spinbutton', { name: 'Giới hạn mỗi khách hàng' }),
        ).toHaveValue('2');

        // Bước 4: Nhấn nút Tạo voucher
        await createVoucher(page);

        // Kiểm tra tạo voucher thành công
        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_InvalidDiscount_001: Từ chối mức giảm không hợp lệ', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `INVALID${Date.now()}`,
            programName: 'Voucher kiểm tra mức giảm không hợp lệ',
            discountType: 'PERCENT',
            discountValue: '0',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).not.toBeVisible();
        await expect(
            page.getByRole('textbox', { name: 'Mã voucher' }),
        ).toBeVisible();
    });

    test('VOUCHER_MaxDiscount_001: Tạo voucher có mức giảm tối đa', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `MAX${Date.now()}`,
            programName: 'Voucher kiểm tra mức giảm tối đa',
            discountType: 'PERCENT',
            discountValue: '10',
            maximumDiscount: '50000',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_MinOrder_001: Tạo voucher có giá trị đơn tối thiểu', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `MINORDER${Date.now()}`,
            programName: 'Voucher kiểm tra giá trị đơn hàng tối thiểu',
            discountType: 'PERCENT',
            discountValue: '10',
            minimumOrderValue: '500000',
            totalUsage: '10',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_UsageLimit_001: Tạo voucher có giới hạn tổng lượt dùng', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `USAGELIMIT${Date.now()}`,
            programName: 'Voucher kiểm tra tổng lượt sử dụng',
            discountType: 'PERCENT',
            discountValue: '10',
            totalUsage: '5',
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_InvalidDate_001: Từ chối ngày kết thúc trước ngày bắt đầu', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `INVALIDDATE${Date.now()}`,
            programName: 'Voucher kiểm tra ngày không hợp lệ',
            discountType: 'PERCENT',
            discountValue: '10',
            totalUsage: '10',
            startAfterDays: 10,
            endAfterDays: 5,
        });

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).not.toBeVisible();
        await expect(
            page.getByRole('textbox', { name: 'Mã voucher' }),
        ).toBeVisible();
    });

    test('VOUCHER_CategoryProduct_001: Chọn danh mục và sản phẩm áp dụng', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `CATEGORY${Date.now()}`,
            programName: 'Voucher áp dụng theo danh mục và sản phẩm',
            discountType: 'PERCENT',
            discountValue: '10',
            totalUsage: '10',
        });

        const categoryNames = ['Cáp HDMI', 'Chuyển Đổi HDMI'];
        const productNames = [
            '< Rctlb > Nút cảm biến cảm ứng có thể điều chỉnh độ sáng Công tắc nhà thông minh',
            'Aula SC320 Không Dây Chế Độ Kép Chuột Bluetooth',
        ];

        for (const name of categoryNames) {
            await page.getByRole('checkbox', { name, exact: true }).check();
            await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
        }

        for (const name of productNames) {
            await page.getByRole('checkbox', { name, exact: true }).check();
            await expect(page.getByRole('checkbox', { name, exact: true })).toBeChecked();
        }

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });

    test('VOUCHER_Inactive_001: Tạo voucher ở trạng thái không kích hoạt', async ({ page }) => {
        await fillVoucherInformation(page, {
            code: `INACTIVE${Date.now()}`,
            programName: 'Voucher không kích hoạt',
            discountType: 'PERCENT',
            discountValue: '0.02',
            totalUsage: '10',
            startAfterDays: 1,
            endAfterDays: 15,
        });

        await page.getByRole('checkbox', {
            name: 'Phụ Kiện Xe',
            exact: true,
        }).check();

        await page.getByRole('checkbox', {
            name: 'Baga Xe đạp gắn cọc yên đa nă',
        }).check();

        const activeCheckbox = page.getByRole('checkbox', {
            name: 'Kích hoạt voucher',
        });
        await expect(activeCheckbox).toBeChecked();
        await activeCheckbox.uncheck();
        await expect(activeCheckbox).not.toBeChecked();

        await createVoucher(page);

        await expect(
            page.getByText('Đã tạo voucher.', { exact: true }),
        ).toBeVisible();
    });
});

test.describe('Voucher Store - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
        await openVoucherStore(page);
    });

    test('VOUCHER_View_001: Xem kho voucher', async ({ page }) => {
        await expect(page.locator('body')).toContainText(/voucher/i);
    });

    test('VOUCHER_Copy_001: Sao chép mã voucher', async ({ page }) => {
        const voucherCard = page.getByRole('article').filter({
            hasText: '0.09% GIẢM GIÁ không không M',
        });

        await expect(voucherCard).toBeVisible();

        const copyButton = voucherCard.getByRole('button');
        await expect(copyButton).toBeVisible();
        await copyButton.click();

        await expect(
            page.getByText(/đã sao chép|sao chép thành công/i),
        ).toBeVisible();
    });
});

test.describe('Voucher Apply - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_Apply_Success_001: Áp dụng voucher thành công khi thanh toán', async ({ page }) => {
        // Mở trang danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Chọn danh mục Phụ Kiện Điện Thoại
        await page.getByRole('link', {
            name: 'Phụ Kiện Máy tính',
        }).click();

        // Bước 2: Chọn sản phẩm Chuột Gaming Corsair Harpoon
        await page.getByRole('link', {
            name: 'Chuột Gaming Corsair Harpoon',
        }).click();

        // Bước 3: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 4: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 5: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 6: Chọn voucher áp dụng
        const voucherRadio = page.getByRole('radio', {
            name: 'không · KACM Giảm 0.09% trên',
        });

        await expect(voucherRadio).toBeVisible();
        await voucherRadio.check();
        await expect(voucherRadio).toBeChecked();

        // Bước 7: Xác nhận hộp thoại khi đặt hàng (nếu xuất hiện)
        page.once('dialog', async dialog => {
            console.log(`Dialog message: ${dialog.message()}`);
            await dialog.accept();
        });

        await page.getByRole('button', {
            name: 'Đặt hàng',
        }).click();
    });
});
test.describe('Voucher Minimum Order - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_MinOrderFail_001', async ({ page }) => {

        // Bước 1: Mở danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Bước 2: Chọn sản phẩm Hộp test mạng BNC đa năng
        await page.locator(
            'div:nth-child(3) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Chọn phân loại sản phẩm
        const productOption = page.locator('label').filter({
            hasText: 'Hộp test mạng BNC đa năng',
        });

        await productOption.click();
        await productOption.check();

        // Bước 4: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 5: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 6: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 7: Kiểm tra voucher KACM không xuất hiện
        await expect(
            page.getByRole('radio', { name: /KACM/ })
        ).toHaveCount(0);

        // Bước 8: Kiểm tra voucher TN1718 vẫn hiển thị
        // Bước 8: Kiểm tra voucher TN1718 không xuất hiện
        const voucherRadio = page.getByRole('radio', {
            name: /TN1718/,
        });

        await expect(voucherRadio).toHaveCount(0);



        // Bước 9: Kiểm tra không có voucher nào được áp dụng
        await expect(
            page.getByRole('radio', { name: 'Không sử dụng voucher' })
        ).toBeChecked();

        // Bước 10: Kiểm tra đơn hàng chưa được giảm giá
        await expect(
            page.getByText('−0₫', { exact: true })
        ).toBeVisible();
    });
});

test.describe('Voucher Expired - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_Expired_001', async ({ page }) => {

        // Bước 1: Mở danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Bước 2: Chọn sản phẩm Hộp test mạng BNC đa năng
        await page.locator(
            'div:nth-child(3) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Chọn phân loại sản phẩm
        const productOption = page.locator('label').filter({
            hasText: 'Hộp test mạng BNC đa năng',
        });

        await productOption.click();
        await productOption.check();

        // Bước 4: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 5: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 6: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 7: Kiểm tra voucher HETHAN không xuất hiện
        const expiredVoucher = page.getByRole('radio', {
            name: /HETHAN/i,
        });

        await expect(expiredVoucher).toHaveCount(0);
    });
});

test.describe('Voucher Not Started - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_NotStarted_001', async ({ page }) => {

        // Bước 1: Mở danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Bước 2: Chọn sản phẩm Hộp test mạng BNC đa năng
        await page.locator(
            'div:nth-child(3) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Chọn phân loại sản phẩm
        const productOption = page.locator('label').filter({
            hasText: 'Hộp test mạng BNC đa năng',
        });

        await productOption.click();
        await productOption.check();

        // Bước 4: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 5: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 6: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 7: Kiểm tra voucher CHUATOINAGY không xuất hiện
        const notStartedVoucher = page.getByRole('radio', {
            name: /CHUATOINGAY/i,
        });

        await expect(notStartedVoucher).toHaveCount(0);

        // Bước 8: Kiểm tra không có tiền giảm từ voucher
        await expect(
            page.getByText('−0₫', { exact: true })
        ).toBeVisible();
    });
});

test.describe('Voucher Out Of Usage - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_OutOfUsage_001', async ({ page }) => {

        // Bước 1: Mở danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Bước 2: Chọn sản phẩm Hộp test mạng BNC đa năng
        await page.locator(
            'div:nth-child(3) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Chọn phân loại sản phẩm
        const productOption = page.locator('label').filter({
            hasText: 'Hộp test mạng BNC đa năng',
        });

        await productOption.click();
        await productOption.check();

        // Bước 4: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 5: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 6: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 7: Kiểm tra voucher VOUCHERHETLUOT không xuất hiện
        const exhaustedVoucher = page.getByRole('radio', {
            name: /VOUCHERHETLUOT/i,
        });

        await expect(exhaustedVoucher).toHaveCount(0);

        // Bước 8: Kiểm tra không có tiền giảm từ voucher
        await expect(
            page.getByText('−0₫', { exact: true })
        ).toBeVisible();
    });
});
test.describe('Voucher Wrong Product - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_WrongProduct_001', async ({ page }) => {

        // Mở trang danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Chọn danh mục Phụ Kiện Điện Thoại
        await page.getByRole('link', {
            name: 'Thiết Bị Mạng',
        }).click();

        // Bước 2: Chọn sản phẩm không thuộc phạm vi áp dụng voucher
        await page.locator(
            'div:nth-child(5) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 4: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 5: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 6: Kiểm tra voucher TN1817 không xuất hiện
        const wrongProductVoucher = page.getByRole('radio', {
            name: /TN1817/i,
        });

        await expect(wrongProductVoucher).toHaveCount(0);

        // Bước 7: Kiểm tra không có tiền giảm từ voucher
        await expect(
            page.getByText('−0₫', { exact: true })
        ).toBeVisible();
    });
});

test.describe('Voucher Customer Limit - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_CustomerLimit_001', async ({ page }) => {

        // Bước 1: Mở danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Bước 2: Chọn sản phẩm Hộp test mạng BNC đa năng
        await page.locator(
            'div:nth-child(3) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Chọn phân loại sản phẩm
        const productOption = page.locator('label').filter({
            hasText: 'Hộp test mạng BNC đa năng',
        });

        await productOption.click();
        await productOption.check();

        // Bước 4: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 5: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 6: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 7: Kiểm tra voucher VUOTGIOIHANMOIKHACHHANG không xuất hiện
        const customerLimitVoucher = page.getByRole('radio', {
            name: /VUOTGIOIHANMOIKHACHHANG/i,
        });

        await expect(customerLimitVoucher).toHaveCount(0);

        // Bước 8: Kiểm tra không có tiền giảm từ voucher
        await expect(
            page.getByText('−0₫', { exact: true })
        ).toBeVisible();
    });
});

test.describe('Voucher Order With Discount - Customer', () => {
    test.beforeEach(async ({ page }) => {
        await loginCustomer(page);
    });

    test('VOUCHER_OrderWithDiscount_001', async ({ page }) => {

        // Mở trang danh mục sản phẩm
        await page.getByRole('link', {
            name: 'DANH MỤC SẢN PHẨM',
        }).click();

        // Chọn danh mục Phụ Kiện Điện Thoại
        await page.getByRole('link', {
            name: 'Phụ Kiện Điện Thoại',
        }).click();

        // Bước 2: Chọn sản phẩm
        await page.locator(
            'div:nth-child(2) > .item-wrap > .container-item > .image-product-item > a'
        ).click();

        // Bước 3: Thêm sản phẩm vào giỏ hàng
        await page.getByRole('button', {
            name: 'THÊM VÀO GIỎ HÀNG',
        }).click();

        // Bước 4: Mở giỏ hàng
        await page.getByRole('link', {
            name: 'Giỏ hàng',
        }).click();

        // Bước 5: Tiến hành thanh toán
        await page.getByRole('button', {
            name: 'TIẾN HÀNH THANH TOÁN',
        }).click();

        // Bước 6: Kiểm tra voucher TN1718 xuất hiện
        const voucherRadio = page.getByRole('radio', {
            name: /VINHVIEN/i,
        });

        await expect(voucherRadio).toBeVisible();

        // Bước 7: Chọn voucher TN1718
        await voucherRadio.check();

        // Bước 8: Kiểm tra voucher đã được chọn
        await expect(voucherRadio).toBeChecked();

        // Bước 9: Đặt hàng và chấp nhận hộp thoại nếu xuất hiện
        page.once('dialog', async dialog => {
            console.log('Thông báo hệ thống:', dialog.message());
            await dialog.accept();
        });

        await page.getByRole('button', {
            name: 'Đặt hàng',
        }).click();

        // Bước 10: Mở trang thông tin cá nhân
        await page.getByRole('link', {
            name: 'Hello, USER',
        }).click();

        // Bước 11: Kiểm tra mục lịch sử đơn hàng
        await expect(
            page.getByText('Lịch sử đơn hàng')
        ).toBeVisible();
    });
});