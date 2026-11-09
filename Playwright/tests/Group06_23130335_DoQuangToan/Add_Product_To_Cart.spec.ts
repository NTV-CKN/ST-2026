import { expect, test, type Page } from '@playwright/test';

import { env } from 'node:process';

const BASE_URL = env.BASE_URL?.trim();
if (!BASE_URL) {
    throw new Error('Missing required environment variable: BASE_URL');
}
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

async function loginCustomer(page: Page): Promise<void> {
    await page.goto(appUrl('/'));

    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });
    if (await loginLink.isVisible()) {
        await loginLink.click();
        await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' })
            .fill(requiredEnv('USER_EMAIL', CUSTOMER_EMAIL));

        await page.getByRole('textbox', { name: 'Mật khẩu' })
            .fill(requiredEnv('USER_PASSWORD', CUSTOMER_PASSWORD));
        await page.getByRole('textbox', { name: 'Mật khẩu' }).press('Enter');

        await expect(page.getByRole('link', { name: 'DANH MỤC SẢN PHẨM' })).toBeVisible();
    }
}


async function ensureGuest(page: Page): Promise<void> {
    await page.goto(appUrl('/'));

    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });
    if (await loginLink.isVisible()) {
        return;
    }

    const logoutLink = page.getByRole('link', { name: /đăng xuất/i });
    if (await logoutLink.isVisible()) {
        await logoutLink.click();
    }

    await expect(page.getByRole('link', { name: 'Đăng nhập' })).toBeVisible();
}

async function openProductDetail(page: Page, productId: number): Promise<void> {
    await page.goto(appUrl(`/product-detail?id=${productId}`));
    await expect(page.getByRole('button', { name: 'THÊM VÀO GIỎ HÀNG' })).toBeVisible();
}

async function addProductToCart(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'THÊM VÀO GIỎ HÀNG' }).click();
}

async function openCart(page: Page): Promise<void> {
    await page.getByRole('link', { name: 'Giỏ hàng' }).click();
}

function productVariants(page: Page) {
    return page.locator('#formAddCart input[type="radio"][name="id"]');
}

async function selectFirstVariant(page: Page): Promise<void> {
    const variants = productVariants(page);

    await expect(variants.first()).toBeAttached();
    await variants.first().check({ force: true });
    await expect(variants.first()).toBeChecked();
}

test.describe('CART - Thêm sản phẩm vào giỏ hàng', () => {
    test('CART_AddToCart_Success_001: Thêm sản phẩm thành công', async ({ page }) => {
        await loginCustomer(page);

        await page.goto(appUrl('/'));
        await page.getByRole('link', { name: 'DANH MỤC SẢN PHẨM' }).click();
        await page.locator('.image-product-item > a').first().click();

        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion xác nhận sản phẩm hiển thị trong giỏ hàng.
    });

    test('CART_AddToCart_Quantity2_001: Thêm sản phẩm với số lượng 2', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 185);

        const quantityInput = page.locator('input[type="number"]');
        await quantityInput.fill('2');
        await expect(quantityInput).toHaveValue('2');

        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion kiểm tra sản phẩm có số lượng 2 trong giỏ hàng.
    });

    test('CART_AddToCart_QuantityZero_001: Không cho thêm số lượng 0', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 185);

        const quantityInput = page.locator('input[type="number"]');
        await quantityInput.fill('0');
        await expect(quantityInput).toHaveValue('0');

        const isValid = await quantityInput.evaluate(
            input => (input as HTMLInputElement).checkValidity(),
        );

        expect(isValid).toBe(false);
    });

    test('CART_AddToCart_OutOfStock_001: Không thêm sản phẩm hết hàng', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 8);
        await addProductToCart(page);

        // TODO: Đối chiếu trạng thái hết hàng và xác nhận sản phẩm không được thêm vào giỏ.
    });

    test('CART_AddToCart_ExceedStock_001: Không thêm vượt tồn kho', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);

        const quantityInput = page.locator('input[type="number"]');
        await quantityInput.fill('6');
        await expect(quantityInput).toHaveValue('6');
        await addProductToCart(page);

        await expect(page.locator('.wrap-state-user')).toBeVisible();

        const cartLink = page.getByRole('link', { name: 'Giỏ hàng' });
        if (await cartLink.isVisible()) {
            await cartLink.click();
        } else {
            await page.locator('a[href*="cart"], a[href*="gio-hang"]').first().click();
        }

        // TODO: Bổ sung assertion kiểm tra số lượng thực tế trong giỏ hàng.
    });

    test('CART_AddToCart_Duplicate_001: Thêm trùng sản phẩm vào giỏ hàng', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 185);
        await addProductToCart(page);
        await openCart(page);

        await openProductDetail(page, 185);
        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion kiểm tra kết quả giỏ hàng sau lần thêm thứ hai.
    });

    test('CART_AddToCart_DifferentProduct_001: Thêm sản phẩm khác vào giỏ hàng', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 185);
        await addProductToCart(page);

        await openProductDetail(page, 7);
        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion xác nhận cả hai sản phẩm hiển thị trong giỏ hàng.
    });

    test('CART_AddToCart_NoVariant_001: Không chọn biến thể', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);

        const variants = productVariants(page);
        await expect(variants.first()).toBeChecked();

        await variants.first().evaluate(element => {
            (element as HTMLInputElement).checked = false;
        });

        await expect(
            page.locator('#formAddCart input[type="radio"][name="id"]:checked'),
        ).toHaveCount(0);

        await addProductToCart(page);

        // TODO: Xác nhận thông báo thực tế của website.
    });

    test('CART_AddToCart_SelectVariant_001: Thêm sản phẩm có biến thể', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        await addProductToCart(page);
        await openCart(page);

        // TODO: Xác nhận sản phẩm và biến thể trong giỏ hàng.
    });

    test('CART_AddToCart_Guest_001: Thêm biến thể khi chưa đăng nhập', async ({ page }) => {
        await ensureGuest(page);
        await openProductDetail(page, 7);

        await expect(productVariants(page).first()).toBeChecked();
        await addProductToCart(page);

        // TODO: Bổ sung assertion theo kết quả thực tế của website.
    });

    test('CART_AddToCart_LoggedIn_001: Thêm sản phẩm khi đã đăng nhập', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion kiểm tra sản phẩm trong giỏ hàng.
    });

    test('CART_AddToCart_CartBadge_001: Cập nhật số lượng trên biểu tượng giỏ hàng', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion kiểm tra badge của biểu tượng giỏ hàng.
    });

    test('CART_AddToCart_Subtotal_001: Kiểm tra thành tiền sản phẩm', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        await addProductToCart(page);
        await openCart(page);

        // TODO: Bổ sung assertion kiểm tra đơn giá, số lượng và thành tiền.
    });

    test('CART_AddToCart_Refresh_001: Giữ sản phẩm sau khi tải lại trang', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        await addProductToCart(page);
        await openCart(page);
        await page.reload();

        await expect(page.locator('body')).toContainText(
            'Dây Cáp Mạng, loại: Dây cáp mạng CAT 6 Orico 30 mét',
        );
    });

    test('CART_AddToCart_NetworkError_001: Xử lý lỗi mạng khi thêm sản phẩm', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        let networkErrorOccurred = false;
        await page.route('**/add-cart', async route => {
            networkErrorOccurred = true;
            await route.abort('failed');
        });

        await addProductToCart(page);
        await expect.poll(() => networkErrorOccurred).toBe(true);

        // TODO: Xác nhận thông báo lỗi thực tế của website.
    });

    test('CART_AddToCart_EmptyQuantity_001: Không nhập số lượng sản phẩm', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        const quantityInput = page.locator('#formAddCart input[type="number"]');
        await expect(quantityInput).toBeVisible();
        await quantityInput.fill('');
        await expect(quantityInput).toHaveValue('');

        await addProductToCart(page);

        // TODO: Xác nhận kết quả hoặc validation thực tế của website.
    });

    test('CART_AddToCart_DecimalQuantity_001: Không cho nhập số thập phân', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        const quantityInput = page.locator('#formAddCart input[type="number"]');
        await expect(quantityInput).toBeVisible();
        await quantityInput.fill('1.5');

        const actualValue = await quantityInput.inputValue();
        const validity = await quantityInput.evaluate(element => {
            const input = element as HTMLInputElement;

            return {
                valid: input.validity.valid,
                stepMismatch: input.validity.stepMismatch,
                badInput: input.validity.badInput,
            };
        });

        expect(
            actualValue === '' ||
            (!Number.isInteger(Number(actualValue)) && !validity.valid),
        ).toBe(true);

        await addProductToCart(page);
    });

    test('CART_AddToCart_MaxQuantity_001: Kiểm tra số lượng tối đa', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 7);
        await selectFirstVariant(page);

        const quantityInput = page.locator('#formAddCart input[type="number"]');
        await expect(quantityInput).toBeVisible();
        await quantityInput.fill('10');

        await addProductToCart(page);

        // TODO: Bổ sung assertion theo giới hạn số lượng thực tế.
    });

    test('CART_AddToCart_VariantOutOfStock_001: Không thể thêm biến thể hết hàng', async ({ page }) => {
        await loginCustomer(page);
        await openProductDetail(page, 1);

        const variants = productVariants(page);
        await expect(variants.first()).toBeAttached();
        await variants.first().check({ force: true });

        const variantInfo = await variants.first().evaluate(element => {
            const input = element as HTMLInputElement;

            return {
                value: input.value,
                checked: input.checked,
                disabled: input.disabled,
                stock: input.getAttribute('data-stock'),
            };
        });

        console.log('Thông tin biến thể:', variantInfo);
        await addProductToCart(page);

        // TODO: Xác nhận website từ chối thêm biến thể hết hàng.
    });
});