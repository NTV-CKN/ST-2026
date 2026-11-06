# Automation Testing Project - Group 06

Dự án kiểm thử tự động cho website **Phụ kiện công nghệ**, sử dụng Playwright Test và TypeScript. Repository gồm mã kiểm thử, ứng dụng tham chiếu, tài liệu, báo cáo và minh chứng thực thi.

## Cấu trúc thư mục

- [`Automation Testing Project - Group 06/`](./Automation%20Testing%20Project%20-%20Group%2006/) — các file kiểm thử được tổng hợp theo từng thành viên.
- [`Evidence - Group06/`](./Evidence%20-%20Group06/) — ảnh chụp và ghi chú minh chứng khi kiểm thử.
- [`Playwright/`](./Playwright/) — dự án Playwright có thể chạy; gồm cấu hình, test trong `tests/`, ứng dụng tham chiếu `phu_kien_cong_nghe/`, dữ liệu SQL mẫu trong `assets/` và báo cáo Playwright.
- [`Test Report - Group 06/`](./Test%20Report%20-%20Group%2006/) — báo cáo kiểm thử tổng hợp.
- [`docs/`](./docs/) — tài liệu và bảng test case.
- [`members/`](./members/) — tài liệu được sắp xếp theo thành viên.

## Thành viên và phạm vi kiểm thử

| Mã sinh viên | Thành viên | Một số phạm vi kiểm thử |
|---|---|---|
| 23130081 | Trần Quang Duy | Khóa người dùng, thanh toán, xác nhận đơn hàng |
| 23130309 | Phan Văn Thi | Quản lý địa chỉ giao hàng, tìm kiếm nâng cao |
| 23130333 | Nguyễn Trọng Tín | Luồng xác thực, quản lý người dùng và cửa hàng (admin) |
| 23130335 | Đỗ Quang Toàn | Thêm sản phẩm vào giỏ hàng, quản lý đơn hàng (admin) |
| 23130390 | Nguyễn Trường Vũ | Quản lý sản phẩm (admin), bài viết, wishlist |

Các file spec tương ứng nằm trong `Playwright/tests/Group06_<MãSV>_<HọTên>/`.

## Công nghệ và yêu cầu

- Node.js và npm
- Playwright Test (`@playwright/test`) với TypeScript
- Google Chrome được cài trên máy (cấu hình hiện tại chạy qua Chrome channel)
- Website đang chạy và có thể truy cập tại `BASE_URL`
- Nếu test cần truy cập cơ sở dữ liệu: MySQL cùng dữ liệu kiểm thử phù hợp

## Cài đặt và cấu hình

Mở PowerShell tại thư mục repository:

```powershell
cd .\Playwright
npm ci
```

Tạo file cấu hình cục bộ từ mẫu nếu chưa có:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Mở `Playwright/.env` và điền các giá trị phù hợp với môi trường của bạn. `BASE_URL` là bắt buộc. Các test cần đăng nhập hoặc truy cập cơ sở dữ liệu có thể cần thêm thông tin tài khoản và `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` như được liệt kê trong `.env.example`.

Không đưa mật khẩu hoặc thông tin kết nối thật vào Git. Chỉ chạy test trên môi trường và dữ liệu được phép sử dụng; một số test có thể thay đổi dữ liệu. Hãy dùng cơ sở dữ liệu kiểm thử riêng và kiểm tra điều kiện trong test trước khi bật `ALLOW_DESTRUCTIVE_DB=true`.

## Chạy kiểm thử

Thực hiện các lệnh sau trong thư mục `Playwright/`:

```powershell
# Liệt kê các test được Playwright phát hiện
npx playwright test --list

# Chạy toàn bộ test của nhóm
npx playwright test

# Chạy test của một thành viên
npx playwright test tests/Group06_23130333_NguyenTrongTin

# Chạy một file spec
npx playwright test tests/Group06_23130333_NguyenTrongTin/auth-flow.spec.ts
```

Cấu hình hiện tại chạy test lần lượt (`workers: 1`, `fullyParallel: false`) và mở trình duyệt không headless. Sau khi chạy, xem báo cáo HTML bằng:

```powershell
npx playwright show-report playwright-report
```

Kết quả chạy và báo cáo được lưu trong `Playwright/test-results/` và `Playwright/playwright-report/`.
