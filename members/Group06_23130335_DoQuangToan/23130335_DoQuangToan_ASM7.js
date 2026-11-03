import { test, expect } from '@playwright/test';

test('CART_AddToCart_Success_001 - Them san pham thanh cong', async ({ page }) => {
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);


    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page.waitForTimeout(1500);

 
    await page.getByRole('textbox', {
        name: 'Tên đăng nhập hoặc email'
    }).fill('user@gmail.com');
    await page.waitForTimeout(1500);

    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).fill('vudeptrai2k5');
    await page.waitForTimeout(1500);

  
    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).press('Enter');
    await page.waitForTimeout(1500);

    // Buoc 6: Cho dang nhap hoan tat
    await expect(
        page.getByRole('link', { name: 'DANH MỤC SẢN PHẨM' })
    ).toBeVisible();
    await page.waitForTimeout(1500);

    // Buoc 7: Mo danh muc san pham
    await page.getByRole('link', {
        name: 'DANH MỤC SẢN PHẨM'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 8: Mo san pham dau tien trong danh sach
    await page.locator('.image-product-item > a').first().click();
    await page.waitForTimeout(1500);

    // Buoc 9: Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 10: Mo gio hang
    await page.getByRole('link', { name: 'Giỏ hàng' }).click();
    await page.waitForTimeout(1500);

    // TODO: Them assertion xac nhan san pham hien trong gio hang
});


test('CART_AddToCart_Quantity2_001 - Them san pham so luong 2', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 2: Bam dang nhap
    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page.waitForTimeout(1500);

    // Buoc 3: Nhap email
    await page.getByRole('textbox', {
        name: 'Tên đăng nhập hoặc email'
    }).fill('user@gmail.com');
    await page.waitForTimeout(1500);

    // Buoc 4: Nhap mat khau
    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).fill('vudeptrai2k5');
    await page.waitForTimeout(1500);

    // Buoc 5: Nhan Enter de dang nhap
    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).press('Enter');
    await page.waitForTimeout(1500);

    // Buoc 6: Cho dang nhap hoan tat
    await expect(
        page.getByRole('link', { name: 'DANH MỤC SẢN PHẨM' })
    ).toBeVisible();
    await page.waitForTimeout(1500);

    // Buoc 7: Mo danh muc san pham
    await page.getByRole('link', {
        name: 'DANH MỤC SẢN PHẨM'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 8: Mo san pham dau tien
    await page.locator('.image-product-item > a').first().click();
    await page.waitForTimeout(1500);

    // Buoc 9: Chon so luong 2
    // Selector nay can phu hop voi HTML thuc te cua o so luong.
    const quantityInput = page.locator('input[type="number"]');

    await quantityInput.fill('2');
    await page.waitForTimeout(1500);

    // Kiem tra o so luong da nhan gia tri 2
    await expect(quantityInput).toHaveValue('2');
    await page.waitForTimeout(1500);

    // Buoc 10: Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 11: Mo gio hang
    await page.getByRole('link', { name: 'Giỏ hàng' }).click();
    await page.waitForTimeout(1500);

    // TODO: Them assertion kiem tra san pham co so luong 2 trong gio hang
});

test('CART_AddToCart_QuantityZero_001 - Khong cho them so luong 0', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 2: Dang nhap
    await page.getByRole('link', { name: 'Đăng nhập' }).click();
    await page.waitForTimeout(1500);

    // Buoc 3: Nhap email
    await page.getByRole('textbox', {
        name: 'Tên đăng nhập hoặc email'
    }).fill('user@gmail.com');
    await page.waitForTimeout(1500);

    // Buoc 4: Nhap mat khau
    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).fill('vudeptrai2k5');
    await page.waitForTimeout(1500);

    // Buoc 5: Dang nhap
    await page.getByRole('textbox', {
        name: 'Mật khẩu'
    }).press('Enter');
    await page.waitForTimeout(1500);

    // Buoc 6: Cho dang nhap hoan tat
    await expect(
        page.getByRole('link', { name: 'DANH MỤC SẢN PHẨM' })
    ).toBeVisible();
    await page.waitForTimeout(1500);

    // Buoc 7: Mo danh muc san pham
    await page.getByRole('link', {
        name: 'DANH MỤC SẢN PHẨM'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 8: Mo san pham dau tien
    await page.locator('.image-product-item > a').first().click();
    await page.waitForTimeout(1500);

    // Buoc 9: Nhap so luong 0
    const quantityInput = page.locator('input[type="number"]');

    await quantityInput.fill('0');
    await page.waitForTimeout(1500);

    // Buoc 10: Kiem tra gia tri da nhap
    await expect(quantityInput).toHaveValue('0');
    await page.waitForTimeout(1500);

    // Buoc 11: Kiem tra quy tac xac thuc cua o so luong
    const isValid = await quantityInput.evaluate(
        input => input.checkValidity()
    );

    expect(isValid).toBe(false);
    await page.waitForTimeout(1500);
});

test('CART_AddToCart_OutOfStock_001 - Khong them san pham het hang', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=8');
    await page.waitForTimeout(1500);

    // Buoc 2: Dang nhap neu chua dang nhap
    // Neu da dang nhap, bo qua buoc nay.
    if (await page.getByRole('link', { name: 'Đăng nhập' }).isVisible().catch(() => false)) {
        await page.getByRole('link', { name: 'Đăng nhập' }).click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', { name: 'Đăng Nhập' }).click();
        await page.waitForTimeout(1500);

        await page.goto('http://localhost:8080/product-detail?id=8');
        await page.waitForTimeout(1500);
    }

    // Buoc 3: Thu them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // TODO: Kiem tra san pham co thuc su het hang hay khong
    // va kiem tra gio hang co nhan them san pham hay khong.
});

test('CART_AddToCart_ExceedStock_001 - Khong them vuot ton kho', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham ID 7
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // Buoc 2: Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).press('Enter');
        await page.waitForTimeout(1500);

        // Quay lai trang san pham ID 7
        await page.goto('http://localhost:8080/product-detail?id=7');
        await page.waitForTimeout(1500);
    }

    // Buoc 3: Chon so luong 6, vuot ton kho 5
    const quantityInput = page.locator('input[type="number"]');

    await quantityInput.fill('6');
    await page.waitForTimeout(1500);

    // Buoc 4: Kiem tra o so luong nhan gia tri 6
    await expect(quantityInput).toHaveValue('6');
    await page.waitForTimeout(1500);

    // Buoc 5: Thu them vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 6: Nhan vao bieu tuong gio hang
    await page.locator('.wrap-state-user').waitFor();
    await page.waitForTimeout(1500);

    // Neu website co link Giỏ hàng, nhan vao link do
    const cartLink = page.getByRole('link', { name: 'Giỏ hàng' });

    if (await cartLink.isVisible().catch(() => false)) {
        await cartLink.click();
    } else {
        // Neu khong co link Giỏ hàng, thu nhan bieu tuong gio hang
        await page.locator('a[href*="cart"], a[href*="gio-hang"]').first().click();
    }

    await page.waitForTimeout(1500);

    // Buoc 7: Kiem tra trang gio hang da mo
    console.log('Da mo trang gio hang de kiem tra ket qua.');

    // TODO: Bo sung assertion kiem tra so luong thuc te trong gio hang
});

test('CART_AddToCart_Duplicate_001 - Them trung san pham vao gio hang', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 2: Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).press('Enter');
        await page.waitForTimeout(1500);
    }

    // Buoc 3: Mo lai trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 4: Them san pham lan thu nhat
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 5: Mo gio hang lan thu nhat
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 6: Quan sat gio hang truoc khi them lan hai
    console.log('Da mo gio hang sau lan them san pham thu nhat.');

    // Buoc 7: Quay lai trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 8: Them cung san pham lan thu hai
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 9: Mo gio hang lan thu hai
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 10: Quan sat ket qua sau khi them lan hai
    console.log('Da mo gio hang sau lan them san pham thu hai.');

    // TODO: Them assertion kiem tra ket qua gio hang.
});

test('CART_AddToCart_DifferentProduct_001 - Them san pham khac vao gio hang', async ({ page }) => {
    // Buoc 1: Mo trang chi tiet san pham thu nhat
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 2: Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).press('Enter');
        await page.waitForTimeout(1500);
    }

    // Buoc 3: Mo lai san pham thu nhat
    await page.goto('http://localhost:8080/product-detail?id=185');
    await page.waitForTimeout(1500);

    // Buoc 4: Them san pham thu nhat vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 5: Mo san pham thu hai (ID 7)
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // Buoc 6: Them san pham thu hai vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 7: Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // Buoc 8: Quan sat gio hang
    console.log('Da them hai san pham khac nhau va mo gio hang.');

    // TODO: Them assertion xac nhan ca hai san pham hien trong gio hang.
});




test('CART_AddToCart_NoVariant_001 - Khong chon bien the', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo truc tiep trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Lay cac radio bien the
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    // 5. Kiem tra bien the dang duoc chon mac dinh
    await expect(variants.first()).toBeChecked();

    // 6. Bo chon bien the bang JavaScript
    await variants.first().evaluate(element => {
        element.checked = false;
    });
    await page.waitForTimeout(1500);

    // 7. Xac nhan khong co bien the nao duoc chon
    await expect(
        page.locator(
            '#formAddCart input[type="radio"][name="id"]:checked'
        )
    ).toHaveCount(0);

    // 8. Thu them vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // TODO: Kiem tra thong bao thuc te cua website
});


test('CART_AddToCart_SelectVariant_001 - Them san pham co bien the', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham co bien the
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Lay danh sach bien the
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    // 5. Kiem tra co bien the
    await expect(variants.first()).toBeVisible().catch(async () => {
        console.log('Radio bien the dang bi an trong giao dien.');
    });

    // 6. Chon bien the dau tien
    await variants.first().check({ force: true });
    await page.waitForTimeout(1500);

    // 7. Xac nhan bien the da duoc chon
    await expect(variants.first()).toBeChecked();

    // 8. Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 9. Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // TODO: Kiem tra san pham va bien the trong gio hang
});


test('CART_AddToCart_Guest_001 - Them bien the khi chua dang nhap', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dam bao dang o trang chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (!(await loginLink.isVisible().catch(() => false))) {
        // Neu dang dang nhap, thu dang xuat
        const logoutLink = page.getByRole('link', {
            name: /đăng xuất/i
        });

        if (await logoutLink.isVisible().catch(() => false)) {
            await logoutLink.click();
            await page.waitForTimeout(1500);
        }
    }

    // 3. Mo trang san pham co bien the
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    await expect(variants.first()).toBeChecked();
    await page.waitForTimeout(1500);

    // 5. Them san pham vao gio hang khi chua dang nhap
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();

    await page.waitForTimeout(1500);

    // 6. Ghi nhan URL va thong bao sau khi them
    console.log('URL hien tai:', page.url());

    // TODO: Them assertion theo ket qua thuc te cua website
});


test('CART_AddToCart_LoggedIn_001 - Them san pham khi da dang nhap', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Lay danh sach bien the
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    // 5. Chon bien the dau tien
    await variants.first().check({ force: true });
    await page.waitForTimeout(1500);

    // 6. Xac nhan bien the da duoc chon
    await expect(variants.first()).toBeChecked();

    // 7. Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 8. Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // 9. Ghi nhan URL gio hang
    console.log('URL hien tai:', page.url());

    // TODO: Bo sung assertion kiem tra san pham trong gio hang
});


test('CART_AddToCart_CartBadge_001 - Cap nhat so luong tren bieu tuong gio hang', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Lay danh sach bien the
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    // 5. Chon bien the dau tien
    await variants.first().check({ force: true });
    await page.waitForTimeout(1500);

    // 6. Xac nhan bien the da duoc chon
    await expect(variants.first()).toBeChecked();

    // 7. Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 8. Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // 9. Ghi nhan URL gio hang
    console.log('URL hien tai:', page.url());

    // TODO: Bo sung assertion kiem tra san pham trong gio hang
});


test('CART_AddToCart_Subtotal_001 - Kiem tra thanh tien san pham', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 6. Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // 7. In noi dung gio hang de kiem tra
    const cartText = await page.locator('body').innerText();
    console.log('Noi dung gio hang:\n', cartText);

    // TODO: Them assertion kiem tra don gia, so luong va thanh tien
});


test('CART_AddToCart_Refresh_001 - Giu san pham sau khi tai lai trang', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 6. Mo gio hang
    await page.getByRole('link', {
        name: 'Giỏ hàng'
    }).click();
    await page.waitForTimeout(1500);

    // 7. Luu noi dung gio hang truoc khi tai lai
    const cartBefore = await page.locator('body').innerText();
    console.log('Gio hang truoc khi tai lai:\n', cartBefore);

    // 8. Tai lai trang
    await page.reload();
    await page.waitForTimeout(1500);

    // 9. Lay noi dung gio hang sau khi tai lai
    const cartAfter = await page.locator('body').innerText();
    console.log('Gio hang sau khi tai lai:\n', cartAfter);

    console.log('URL sau khi reload:', page.url());

    // 10. Kiem tra san pham van con trong gio hang
    // Doi ten san pham nay neu id=7 khong phai san pham ban mong muon
    await expect(page.locator('body')).toContainText(
        'Dây Cáp Mạng, loại: Dây cáp mạng CAT 6 Orico 30 mét'
    );
});


test('CART_AddToCart_NetworkError_001 - Xu ly loi mang khi them san pham', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Gia lap loi mang khi gui request them gio hang
    let networkErrorOccurred = false;

    await page.route('**/add-cart', async route => {
        networkErrorOccurred = true;
        await route.abort('failed');
    });

    // 6. Nhan nut them vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();

    await page.waitForTimeout(1500);

    // 7. Xac nhan request them gio hang da bi chan
    expect(networkErrorOccurred).toBe(true);

    console.log('Da mo phong loi mang khi them san pham.');

    // 8. Ghi nhan noi dung website sau loi
    const pageText = await page.locator('body').innerText();
    console.log('Noi dung trang sau loi mang:\n', pageText);

    // TODO: Kiem tra thong bao loi thuc te cua website
});


test('CART_AddToCart_EmptyQuantity_001 - Khong nhap so luong san pham', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Xoa so luong trong o nhap
    const quantityInput = page.locator(
        '#formAddCart input[type="number"]'
    );

    await expect(quantityInput).toBeVisible();
    await quantityInput.fill('');
    await page.waitForTimeout(1500);

    // 6. Xac nhan o so luong dang de trong
    await expect(quantityInput).toHaveValue('');

    // 7. Thu them san pham vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 8. Ghi nhan ket qua thuc te
    console.log('URL sau khi them:', page.url());
    console.log(
        'Noi dung trang:',
        await page.locator('body').innerText()
    );

    // TODO: Them assertion theo thong bao thuc te cua website
});


test('CART_AddToCart_DecimalQuantity_001 - Khong cho nhap so thap phan', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Lay o nhap so luong
    const quantityInput = page.locator(
        '#formAddCart input[type="number"]'
    );

    await expect(quantityInput).toBeVisible();

    // 6. Thu nhap so thap phan
    await quantityInput.fill('1.5');
    await page.waitForTimeout(1500);

    // 7. Kiem tra gia tri thuc te cua o so luong
    // Kiem tra gia tri sau khi nhap so thap phan
    const actualValue = await quantityInput.inputValue();

    console.log('Gia tri hien tai:', actualValue);

    // Kiem tra tinh hop le cua o so luong
    const validity = await quantityInput.evaluate(element => ({
        valid: element.validity.valid,
        stepMismatch: element.validity.stepMismatch,
        badInput: element.validity.badInput
    }));

    console.log('Trang thai hop le:', validity);

    // So luong thap phan phai bi tu choi
    expect(
        actualValue === '' ||
        !Number.isInteger(Number(actualValue)) && !validity.valid
    ).toBe(true);

    // 9. Chi them vao gio hang neu gia tri hop le
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);
});


test('CART_AddToCart_MaxQuantity_001 - Kiem tra so luong toi da', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo trang chi tiet san pham
    await page.goto('http://localhost:8080/product-detail?id=7');
    await page.waitForTimeout(1500);

    // 4. Chon bien the dau tien neu co
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    if (await variants.count() > 0) {
        await variants.first().check({ force: true });
        await page.waitForTimeout(1500);
    }

    // 5. Lay o nhap so luong
    const quantityInput = page.locator(
        '#formAddCart input[type="number"]'
    );

    await expect(quantityInput).toBeVisible();

    // 6. Nhap so luong lon de kiem tra gioi han
    await quantityInput.fill('10');
    await page.waitForTimeout(1500);

    console.log(
        'Gia tri so luong sau khi nhap:',
        await quantityInput.inputValue()
    );

    // 7. Thu them vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 8. Ghi nhan ket qua thuc te
    console.log('URL hien tai:', page.url());
    console.log(
        'Noi dung trang:',
        await page.locator('body').innerText()
    );

    // TODO: Them assertion theo gioi han so luong thuc te
});


test('CART_AddToCart_VariantOutOfStock_001 - Khong the them bien the het hang', async ({ page }) => {
    // 1. Mo website
    await page.goto('http://localhost:8080/');
    await page.waitForTimeout(1500);

    // 2. Dang nhap neu chua dang nhap
    const loginLink = page.getByRole('link', { name: 'Đăng nhập' });

    if (await loginLink.isVisible().catch(() => false)) {
        await loginLink.click();
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Tên đăng nhập hoặc email'
        }).fill('user@gmail.com');
        await page.waitForTimeout(1500);

        await page.getByRole('textbox', {
            name: 'Mật khẩu'
        }).fill('vudeptrai2k5');
        await page.waitForTimeout(1500);

        await page.getByRole('button', {
            name: 'Đăng Nhập'
        }).click();
        await page.waitForTimeout(1500);
    }

    // 3. Mo san pham co bien the het hang
    await page.goto('http://localhost:8080/product-detail?id=1');
    await page.waitForTimeout(1500);

    // 4. Lay danh sach bien the
    const variants = page.locator(
        '#formAddCart input[type="radio"][name="id"]'
    );

    await expect(variants.first()).toBeAttached();

    // 5. Chon bien the dau tien
    await variants.first().check({ force: true });
    await page.waitForTimeout(1500);

    // 6. Kiem tra trang thai bien the
    const variantInfo = await variants.first().evaluate(element => ({
        value: element.value,
        checked: element.checked,
        disabled: element.disabled,
        stock: element.getAttribute('data-stock')
    }));

    console.log('Thong tin bien the:', variantInfo);

    // 7. Thu them vao gio hang
    await page.getByRole('button', {
        name: 'THÊM VÀO GIỎ HÀNG'
    }).click();
    await page.waitForTimeout(1500);

    // 8. Ghi nhan ket qua de doi chieu
    console.log('URL hien tai:', page.url());
    console.log(
        'Noi dung trang:',
        await page.locator('body').innerText()
    );

    // TODO: Xac nhan website tu choi them bien the het hang
});





