# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: Group06_23130390_NguyenTruongVu\wishlist.spec.ts >> WISHLIST - Quản lý sản phẩm yêu thích >> Independent: WISHLIST_Add-6 >> [WISHLIST_Add-6] Kiểm tra thêm sản phẩm bị Admin ẩn vào Wishlist
- Location: tests\Group06_23130390_NguyenTruongVu\wishlist.spec.ts:336:9

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected substring: "Sản phẩm hiện không khả dụng để lưu vào wishlist."
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByRole('alert') with timeout 10000ms
  - waiting for getByRole('alert')

```

```yaml
- list:
  - listitem:
    - strong: Phụ Kiện Công Nghệ
  - listitem:
    - text: "Kết nối với chúng tôi:"
    - link:
      - /url: ""
    - link:
      - /url: ""
- link "Hello, Wishlist User 5":
  - /url: /pkcn/personal_info
  - paragraph: Hello, Wishlist User 5
- link:
  - /url: /pkcn/
  - img
- searchbox "Tìm kiếm sản phẩm..."
- button
- link "Sản phẩm yêu thích":
  - /url: /pkcn/wishlist
  - text: Yêu thích
- link "Giỏ hàng":
  - /url: /pkcn/view-cart
  - text: "0"
- list:
  - listitem:
    - link "TRANG CHỦ":
      - /url: /pkcn/
  - listitem:
    - link "GIỚI THIỆU":
      - /url: /pkcn/view-introduce
  - listitem:
    - link "DANH MỤC SẢN PHẨM":
      - /url: /pkcn/product-category?id=
  - listitem:
    - link "TIN TỨC":
      - /url: /pkcn/news
  - listitem:
    - link "LIÊN HỆ VỚI CHÚNG TÔI":
      - /url: /pkcn/view-contact-shop
  - listitem:
    - link "KHO VOUCHER":
      - /url: /pkcn/voucher-store
- main:
  - img
  - img
  - img
  - img
  - separator
  - text: SẢN PHẨM MỚI
  - link:
    - /url: /pkcn/product-detail?id=223
    - img
  - link "Mạng AutoTest 1793880554996":
    - /url: /pkcn/product-detail?id=223
  - text: 100,000 VND
  - link:
    - /url: /pkcn/product-detail?id=216
    - img
  - link "qwqwqwqwqwqw":
    - /url: /pkcn/product-detail?id=216
  - text: 1,222 VND
  - link:
    - /url: /pkcn/product-detail?id=185
    - img
  - link "Bộ dụng cụ dán Phim cách nhiệt, dán Decal Ô tô":
    - /url: /pkcn/product-detail?id=185
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=186
    - img
  - link "Dây cáp cứu hộ Ô tô dài chịu tải nặng":
    - /url: /pkcn/product-detail?id=186
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=187
    - img
  - link "Búa thoát hiểm Ô tô đa năng":
    - /url: /pkcn/product-detail?id=187
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=188
    - img
  - link "Bơm Ô tô nguồn 12V cắm tẩu":
    - /url: /pkcn/product-detail?id=188
  - text: 500,000 VND
  - link:
    - /url: /pkcn/product-detail?id=189
    - img
  - link "Tẩu đổi nguồn 12v sang 220v trên Ô tô 150W":
    - /url: /pkcn/product-detail?id=189
  - text: 300,000 VND
  - link:
    - /url: /pkcn/product-detail?id=191
    - img
  - link "Dây câu bình Ắc quy 2000A cứu hộ Ô tô":
    - /url: /pkcn/product-detail?id=191
  - text: 250,000 VND
  - link:
    - /url: /pkcn/product-detail?id=192
    - img
  - link "Dây câu bình Ắc quy 1000A cứu hộ Ô tô":
    - /url: /pkcn/product-detail?id=192
  - text: 200,000 VND
  - link:
    - /url: /pkcn/product-detail?id=193
    - img
  - link "Tấm che nắng kính bên Ô tô dạng lưới dạng tốt":
    - /url: /pkcn/product-detail?id=193
  - text: 60,000 VND
  - link:
    - /url: /pkcn/product-detail?id=128
    - img
  - link "Cáp chuyển đổi Ugreen HDMI 2.0 HD104":
    - /url: /pkcn/product-detail?id=128
  - text: 90,000 VND
  - link:
    - /url: /pkcn/product-detail?id=129
    - img
  - link "Cáp HDMI 2.0 Orico":
    - /url: /pkcn/product-detail?id=129
  - text: 100,000 VND SẢN PHẨM NỔI BẬT
  - link:
    - /url: /pkcn/product-detail?id=39
    - img
  - link "Cáp chuyển 3.5 sang 6.5mm":
    - /url: /pkcn/product-detail?id=39
  - text: 80,000 VND
  - link:
    - /url: /pkcn/product-detail?id=35
    - img
  - link "Bộ VGA2HDMI chuyển đổi VGA sang HDMI chất lượng cao":
    - /url: /pkcn/product-detail?id=35
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=33
    - img
  - link "Cáp chuyển VGA sang HDMI có rắc Audio 3.5 (VGA to HDMI)":
    - /url: /pkcn/product-detail?id=33
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=30
    - img
  - link "Bộ chuyển đổi MceHKF HDMI Female sang VGA Male với bộ chuyển đổi âm thanh Hỗ trợ đầu ra tín hiệu 1080P Mới":
    - /url: /pkcn/product-detail?id=30
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=29
    - img
  - link "Bộ chuyển đổi MKEB BNC sang VGA":
    - /url: /pkcn/product-detail?id=29
  - text: 200,000 VND
  - link:
    - /url: /pkcn/product-detail?id=28
    - img
  - link "Bộ chuyển đổi DITIPOO, Bộ chuyển đổi TV DP sang VGA, Cáp máy chiếu HDVD DTV bền bỉ Đa năng":
    - /url: /pkcn/product-detail?id=28
  - text: 200,000 VND
  - link:
    - /url: /pkcn/product-detail?id=27
    - img
  - link "Bộ chuyển đổi USB type C sang HDMI + VGA":
    - /url: /pkcn/product-detail?id=27
  - text: 600,000 VND
  - link:
    - /url: /pkcn/product-detail?id=25
    - img
  - link "Bộ Chuyển Đổi HDMI Sang VGA Vention 1080P@60Hz":
    - /url: /pkcn/product-detail?id=25
  - text: 90,000 VND
  - link:
    - /url: /pkcn/product-detail?id=23
    - img
  - link "Đầu chuyển Micro HDMI sang HDMI":
    - /url: /pkcn/product-detail?id=23
  - text: 25,000 VND
  - link:
    - /url: /pkcn/product-detail?id=22
    - img
  - link "Bộ chuyển đổi HDMI sang VGA UGREEN MM102 | Không có Audio | Độ phân giải 1920*1080":
    - /url: /pkcn/product-detail?id=22
  - text: 100,000 VND
  - link:
    - /url: /pkcn/product-detail?id=21
    - img
  - link "Bộ Chuyển Đổi Vention DP, Chuyển Đổi Video Âm Thanh Mạ Vàng Cổng Hiển Thị Cho PC Laptop":
    - /url: /pkcn/product-detail?id=21
  - text: 60,000 VND
  - link:
    - /url: /pkcn/product-detail?id=19
    - img
  - link "hub chia cổng usb 5 trong 1 Acer sang 4K":
    - /url: /pkcn/product-detail?id=19
  - text: 200,000 VND Chuyển Đổi VGA
  - link:
    - /url: /pkcn/product-detail?id=35
    - img
  - link "Bộ VGA2HDMI chuyển đổi VGA sang HDMI chất lượng cao":
    - /url: /pkcn/product-detail?id=35
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=34
    - img
  - link "Đầu chuyển VGA to HDMI có hỗ trợ âm thanh":
    - /url: /pkcn/product-detail?id=34
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=33
    - img
  - link "Cáp chuyển VGA sang HDMI có rắc Audio 3.5 (VGA to HDMI)":
    - /url: /pkcn/product-detail?id=33
  - text: 150,000 VND
  - link:
    - /url: /pkcn/product-detail?id=32
    - img
  - link "Cáp chuyển VGA sang HDMI có âm thanh nguồn USB":
    - /url: /pkcn/product-detail?id=32
  - text: 250,000 VND
  - link:
    - /url: /pkcn/product-detail?id=31
    - img
  - link "Bộ chuyển đổi HDMI-Tương thích sang VGA Chất lượng hàng đầu Đầu ra màn hình kỹ thuật số 1080P cho PC HDTV":
    - /url: /pkcn/product-detail?id=31
  - text: 100,000 VND
  - link:
    - /url: /pkcn/product-detail?id=30
    - img
  - link "Bộ chuyển đổi MceHKF HDMI Female sang VGA Male với bộ chuyển đổi âm thanh Hỗ trợ đầu ra tín hiệu 1080P Mới":
    - /url: /pkcn/product-detail?id=30
  - text: 150,000 VND
  - button "Xem thêm"
  - text: Bàn Phím
  - link:
    - /url: /pkcn/product-detail?id=96
    - img
  - link "Bàn phím cơ Gaming DAREU EK75":
    - /url: /pkcn/product-detail?id=96
  - text: 625,000 VND
  - link:
    - /url: /pkcn/product-detail?id=97
    - img
  - link "Bàn phím cơ không dây Aula F87 Pro":
    - /url: /pkcn/product-detail?id=97
  - text: 773,329 VND
  - link:
    - /url: /pkcn/product-detail?id=98
    - img
  - link "Bàn phím gaming giả cơ PANTSAN PK100":
    - /url: /pkcn/product-detail?id=98
  - text: 100,619 VND
  - link:
    - /url: /pkcn/product-detail?id=99
    - img
  - link "Bàn phím máy tính giá rẻ SIDOTECH KM10":
    - /url: /pkcn/product-detail?id=99
  - text: 92,019 VND
  - link:
    - /url: /pkcn/product-detail?id=100
    - img
  - link "Bàn phím máy tính mini có dây SIDOTECH XKB02":
    - /url: /pkcn/product-detail?id=100
  - text: 110,077 VND
  - link:
    - /url: /pkcn/product-detail?id=101
    - img
  - link "Bàn phím máy tính có dây gaming SIDOTECH V4 giả cơ":
    - /url: /pkcn/product-detail?id=101
  - text: 115,240 VND
  - button "Xem thêm"
  - text: TIN TỨC
  - heading "Bài viết kiểm thử 1793880581506 - Đã cập nhật" [level=3]
  - paragraph: Mô tả bài viết đã được cập nhật
  - emphasis:
    - link "Đọc thêm":
      - /url: /pkcn/news-detail?id=52
  - separator
  - text: "Ngày đăng: 05/11/2026"
  - heading "Tin tức A" [level=3]
  - paragraph: Bài viết dùng cho test lọc và duyệt/ẩn/xóa bình luận trong Admin
  - emphasis:
    - link "Đọc thêm":
      - /url: /pkcn/news-detail?id=51
  - separator
  - text: "Ngày đăng: 23/10/2026"
  - heading "Xu hướng Công nghệ phụ kiện 2026" [level=3]
  - paragraph: Bài viết test trang chi tiết và đếm bình luận đã duyệt
  - emphasis:
    - link "Đọc thêm":
      - /url: /pkcn/news-detail?id=10
  - separator
  - text: "Ngày đăng: 23/10/2026"
  - heading "Lắp thêm Gác Baga phía sau cho Xe đạp" [level=3]
  - paragraph: Tại sao nên lắp thêm Gác Baga phía sau cho Xe đạp?
  - emphasis:
    - link "Đọc thêm":
      - /url: /pkcn/news-detail?id=8
  - separator
  - text: "Ngày đăng: 17/12/2025"
  - separator
  - img
  - heading "Phụ Kiện Công Nghệ Cam Kết:" [level=2]
  - list:
    - listitem:
      - strong: "Giá sản phẩm:"
      - text: Phụ Kiện Công Nghệ cam kết luôn bán giá tôt nhất trên thị trường vì vậy Quý khách không sợ bị mua đắt, mua hớ. Hơn nữa giá cả được niêm yết công khai trên báo giá hàng ngày.
    - listitem:
      - strong: "Chất lượng sản phẩm:"
      - text: Chúng tôi cam kết cung cấp cho Quý khách các loại hàng hóa có chất lượng cao, sản phẩm được test kiểm tra cẩn thận trước khi bàn giao tới tay khách hàng… không bán
    - listitem:
      - strong: "Thái độ phục vụ:"
      - text: "Đến với Phụ kiện công nghệ, các Bạn sẽ được phục vụ theo đúng phương châm:"
      - strong:
        - emphasis: “SỰ HÀI LÒNG CỦA BẠN LÀ THÀNH CÔNG CỦA CHÚNG TÔI”
    - listitem:
      - strong: "Dịch vụ hoàn hảo:"
      - text: Chúng tôi áp dụng chế độ bảo hành siêu tốt, 1 đổi 1 trong suốt thời gian bảo hành, hỗ trợ nhanh 24/7 khi Quý khách mua sản phẩm tại Shop chúng tôi.
  - separator
- list:
  - listitem: "Gọi: 0793189034"
  - listitem: "Hotline: 0232323889"
  - listitem: "Địa chỉ: Đại Học Nông Lâm, tp HCM, Linh Trung, Thủ Đức"
  - listitem: "Email: pkcn.sp@gmail.com"
- list:
  - listitem:
    - link "Phương thức thanh toán":
      - /url: /pkcn/view-payment-method
  - listitem:
    - link "Phương thức giao hàng":
      - /url: /pkcn/view-shipping-method
  - listitem:
    - link "Chính sách bảo hành":
      - /url: /pkcn/view-warranty-policy
  - listitem:
    - link "Chính sách bảo mật":
      - /url: /pkcn/view-privacy-policy
  - listitem:
    - link "Điều khoản dịch vụ":
      - /url: /pkcn/view-term-service
- list:
  - listitem:
    - link "Facebook":
      - /url: ""
  - listitem:
    - link "Instagram":
      - /url: ""
- paragraph: Copyright © 2025 Phụ Kiện Công Nghệ
```

# Test source

```ts
  250 |       blockIfPrerequisiteFailed('WISHLIST_View-2');
  251 |       await sharedPage.goto(appUrl('wishlist'));
  252 |       await expect(sharedPage.getByRole('heading', { name: 'Đăng nhập để xem wishlist của bạn' })).toBeVisible();
  253 |       await expect(sharedPage.locator('.wishlist-empty'))
  254 |         .toContainText('Sau khi đăng nhập, các sản phẩm yêu thích sẽ được lưu theo tài khoản.');
  255 |     });
  256 |   });
  257 | 
  258 |   test.describe('Independent: WISHLIST_View-6', () => {
  259 |     test('[WISHLIST_View-6] Kiểm tra biểu tượng Wishlist trên Header', async () => {
  260 |       blockIfPrerequisiteFailed('WISHLIST_View-6');
  261 |       await sharedPage.goto(appUrl(''));
  262 |       const wishlistLink = sharedPage.locator('.wishlist-header-link');
  263 |       await expect(wishlistLink).toHaveAttribute('href', /\/wishlist$/);
  264 |       await expect(wishlistLink.locator('[class*="badge"]')).toHaveCount(0);
  265 |     });
  266 |   });
  267 | 
  268 |   test.describe('Dependency chain: WISHLIST_Add-2 -> WISHLIST_Add-3', () => {
  269 |     test.describe.configure({ mode: 'serial' });
  270 | 
  271 |     test('[WISHLIST_Add-2] Kiểm tra Guest bấm Thêm vào Wishlist bị chuyển hướng sang Đăng nhập', async () => {
  272 |       blockIfPrerequisiteFailed('WISHLIST_Add-2');
  273 |       await sharedPage.goto(appUrl('product-detail?id=101'));
  274 |       await sharedPage.locator('.add-to-wishlist-btn').click();
  275 |       await expect(sharedPage).toHaveURL(/\/login(?:\?|$)/);
  276 |     });
  277 | 
  278 |     test('[WISHLIST_Add-3] Kiểm tra điều hướng quay lại trang sản phẩm sau khi Guest đăng nhập', async () => {
  279 |       blockIfPrerequisiteFailed('WISHLIST_Add-3');
  280 |       await login(sharedPage, WISHLIST_USER5_EMAIL, USER_PASSWORD);
  281 |       await expect(sharedPage).toHaveURL(/\/product-detail\?id=101$/);
  282 |     });
  283 |   });
  284 | 
  285 |   test.describe('Dependency chain: WISHLIST_Add-4 -> WISHLIST_Add-5', () => {
  286 |     test.describe.configure({ mode: 'serial' });
  287 |     let user5Context: BrowserContext;
  288 |     let user5Page: Page;
  289 | 
  290 |     test.beforeAll(async ({ browser }) => {
  291 |       ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
  292 |     });
  293 | 
  294 |     test.afterAll(async () => {
  295 |       await user5Context?.close();
  296 |     });
  297 | 
  298 |     test('[WISHLIST_Add-4] Kiểm tra User đã đăng nhập thêm sản phẩm vào Wishlist thành công', async () => {
  299 |       blockIfPrerequisiteFailed('WISHLIST_Add-4');
  300 |       requireDestructiveDbPermission();
  301 |       await user5Page.goto(appUrl('product-detail?id=101'));
  302 |       await user5Page.locator('.add-to-wishlist-btn').click();
  303 |       await expect(user5Page).toHaveURL(/\/product-detail\?id=101&wishlist=added$/);
  304 |       await expect(user5Page.getByRole('status')).toContainText('Đã lưu sản phẩm này vào wishlist.');
  305 |       await expect(user5Page.getByRole('link', { name: 'Xem wishlist' })).toBeVisible();
  306 |       await withDb(async connection => {
  307 |         expect(await wishlistCount(connection, 5, 101)).toBe(1);
  308 |       });
  309 |     });
  310 | 
  311 |     test('[WISHLIST_Add-5] Kiểm tra bấm lưu sản phẩm ĐÃ TỒN TẠI trong Wishlist (Idempotent)', async () => {
  312 |       blockIfPrerequisiteFailed('WISHLIST_Add-5');
  313 |       requireDestructiveDbPermission();
  314 |       const before = await withDb(connection => wishlistCount(connection, 5, 101));
  315 |       await user5Page.goto(appUrl('product-detail?id=101'));
  316 |       await user5Page.locator('.add-to-wishlist-btn').click();
  317 |       await expect(user5Page).toHaveURL(/\/product-detail\?id=101&wishlist=added$/);
  318 |       await expect(user5Page.getByRole('status')).toContainText('Đã lưu sản phẩm này vào wishlist.');
  319 |       const after = await withDb(connection => wishlistCount(connection, 5, 101));
  320 |       expect(after).toBe(before);
  321 |     });
  322 |   });
  323 | 
  324 |   test.describe('Independent: WISHLIST_Add-6', () => {
  325 |     let user5Context: BrowserContext;
  326 |     let user5Page: Page;
  327 | 
  328 |     test.beforeAll(async ({ browser }) => {
  329 |       ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
  330 |     });
  331 | 
  332 |     test.afterAll(async () => {
  333 |       await user5Context?.close();
  334 |     });
  335 | 
  336 |     test('[WISHLIST_Add-6] Kiểm tra thêm sản phẩm bị Admin ẩn vào Wishlist', async () => {
  337 |       blockIfPrerequisiteFailed('WISHLIST_Add-6');
  338 |       requireDestructiveDbPermission();
  339 |       const before = await withDb(connection => wishlistCount(connection, 5, 102));
  340 |       const response = await user5Context.request.post(appUrl('wishlist'), {
  341 |         form: { action: 'add', productId: '102' },
  342 |         maxRedirects: 0,
  343 |       });
  344 |       const location = response.headers().location;
  345 |       expect(response.status()).toBe(302);
  346 |       expect(location).toMatch(/\/product-detail\?id=102&wishlist=unavailable$/);
  347 |       // Lệch app: server redirect đúng, nhưng trang chi tiết sản phẩm ẩn chuyển về trang chủ nên alert không hiện.
  348 |       await user5Page.goto(new URL(location ?? '', BASE_URL).toString());
  349 |       await expect(user5Page.getByRole('alert'))
> 350 |         .toContainText('Sản phẩm hiện không khả dụng để lưu vào wishlist.');
      |          ^ Error: expect(locator).toContainText(expected) failed
  351 |       const after = await withDb(connection => wishlistCount(connection, 5, 102));
  352 |       expect(after).toBe(before);
  353 |     });
  354 |   });
  355 | 
  356 |   test.describe('Dependency chain: WISHLIST_View-4 -> WISHLIST_View-5', () => {
  357 |     test.describe.configure({ mode: 'serial' });
  358 |     let user5Context: BrowserContext;
  359 |     let user5Page: Page;
  360 | 
  361 |     test.beforeAll(async ({ browser }) => {
  362 |       ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
  363 |     });
  364 | 
  365 |     test.afterAll(async () => {
  366 |       await user5Context?.close();
  367 |     });
  368 | 
  369 |     test('[WISHLIST_View-4] Kiểm tra thông tin hiển thị trên Card sản phẩm trong Wishlist', async () => {
  370 |       blockIfPrerequisiteFailed('WISHLIST_View-4');
  371 |       await user5Page.goto(appUrl('wishlist'));
  372 |       const card = productCard(user5Page, 101);
  373 |       await expect(card).toBeVisible();
  374 |       await expect(card.locator('.wishlist-product-image img, .wishlist-product-image i')).toBeVisible();
  375 |       await expect(card.locator('.wishlist-product-name'))
  376 |         .toHaveAttribute('href', /\/product-detail\?id=101$/);
  377 |       await expect(card.locator('.wishlist-product-price')).toHaveText(/Từ [\d,.]+₫/);
  378 |       await expect(card.locator('form.wishlist-add-form')).toBeVisible();
  379 |       await expect(card.locator('select[name="variantId"]')).toBeVisible();
  380 |       await expect(card.locator('input[name="quantity"]')).toHaveValue('1');
  381 |       await expect(card.getByRole('button', { name: 'Thêm vào giỏ' })).toBeVisible();
  382 |       await expect(card.getByRole('button', { name: 'Xóa sản phẩm khỏi wishlist' })).toBeVisible();
  383 |     });
  384 | 
  385 |     test('[WISHLIST_View-5] Kiểm tra định dạng thông tin biến thể trong Dropdown', async () => {
  386 |       blockIfPrerequisiteFailed('WISHLIST_View-5');
  387 |       const select = productCard(user5Page, 101).locator('select[name="variantId"]');
  388 |       await expect(select.locator('option')).not.toHaveCount(0);
  389 |       const options = await select.locator('option').allTextContents();
  390 |       expect(options.length).toBeGreaterThan(0);
  391 |       for (const option of options) {
  392 |         expect(option.trim()).toMatch(/^.+ · .+ · [\d,]+₫\s*\(còn \d+\)$/);
  393 |       }
  394 |     });
  395 |   });
  396 | 
  397 |   test.describe('Independent: WISHLIST_Remove-1', () => {
  398 |     let user5Context: BrowserContext;
  399 |     let user5Page: Page;
  400 | 
  401 |     test.beforeAll(async ({ browser }) => {
  402 |       ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
  403 |     });
  404 | 
  405 |     test.afterAll(async () => {
  406 |       await user5Context?.close();
  407 |     });
  408 | 
  409 |     test('[WISHLIST_Remove-1] Kiểm tra xóa 1 sản phẩm khỏi Wishlist', async () => {
  410 |       blockIfPrerequisiteFailed('WISHLIST_Remove-1');
  411 |       requireDestructiveDbPermission();
  412 |       await user5Page.goto(appUrl('wishlist'));
  413 |       const card = user5Page.locator('.wishlist-card').filter({
  414 |         has: user5Page.locator('input[name="wishlistId"][value="12"]'),
  415 |       });
  416 |       await expect(card).toBeVisible();
  417 |       await card.getByRole('button', { name: 'Xóa sản phẩm khỏi wishlist' }).click();
  418 |       await expect(user5Page).toHaveURL(/\/wishlist\?success=removed$/);
  419 |       await expect(user5Page.getByRole('status')).toContainText('Đã xóa sản phẩm khỏi wishlist.');
  420 |       await expect(card).toHaveCount(0);
  421 |       await withDb(async connection => {
  422 |         const [rows] = await connection.execute<RowDataPacket[]>(
  423 |           'SELECT COUNT(*) AS total FROM wishlists WHERE id = 12 AND user_id = 5',
  424 |         );
  425 |         expect(Number(rows[0]?.total ?? 0)).toBe(0);
  426 |       });
  427 |     });
  428 |   });
  429 | 
  430 |   test.describe('Dependency chain: WISHLIST_Move-1 -> WISHLIST_Move-2', () => {
  431 |     test.describe.configure({ mode: 'serial' });
  432 |     let user5Context: BrowserContext;
  433 |     let user5Page: Page;
  434 | 
  435 |     test.beforeAll(async ({ browser }) => {
  436 |       ({ context: user5Context, page: user5Page } = await createUser5Session(browser));
  437 |     });
  438 | 
  439 |     test.afterAll(async () => {
  440 |       await user5Context?.close();
  441 |     });
  442 | 
  443 |     test('[WISHLIST_Move-1] Kiểm tra Chuyển sản phẩm sang Giỏ hàng với số lượng hợp lệ', async () => {
  444 |       blockIfPrerequisiteFailed('WISHLIST_Move-1');
  445 |       await user5Page.goto(appUrl('wishlist'));
  446 |       const card = productCard(user5Page, 3);
  447 |       const form = card.locator('form.wishlist-add-form');
  448 |       await form.locator('select[name="variantId"]').selectOption('5');
  449 |       await form.locator('input[name="quantity"]').fill('2');
  450 |       const request = user5Page.waitForRequest(candidate =>
```