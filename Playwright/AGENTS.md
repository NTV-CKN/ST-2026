# Hướng dẫn cho agent – Playwright Group 06

## Cấu trúc và phạm vi

- Mỗi thành viên đặt test trong `tests/Group06_<MaSV>_<HoTen>/`, mỗi chức năng có thể tách thành một file `*.spec.ts`.
- Chỉ sửa file trong thư mục thành viên được giao. Không sửa test/config của thành viên khác hoặc `playwright.config.ts`, `package.json` nếu chưa được user yêu cầu.
- Có thể đọc `phu_kien_cong_nghe/` để hiểu nghiệp vụ; **không sửa source ứng dụng** trong mọi trường hợp liên quan đến test fail / expected lệch.

## Điều kiện BẮT BUỘC trước khi viết test script

Agent **chỉ được phép viết hoặc sửa test script** khi user (hoặc ngữ cảnh) đã cung cấp **đầy đủ** các thông tin sau:

1. **Danh sách test case đầy đủ** (hoặc phần được giao), gồm tối thiểu:
   - ID test case
   - Mô tả
   - Các bước / input
   - Expected output (kỳ vọng)
   - Phụ thuộc (cột Dependence, nếu có) và thứ tự chạy do user cung cấp
2. **Luồng / chức năng đang phân tích** là gì  
   (ví dụ: Quản lý sản phẩm – Thêm sản phẩm, Xóa biến thể, …)
3. **Thư mục đích trong `tests/`** phải ghi rõ  
   (ví dụ: `tests/Group06_23130390_NguyenTruongVu/`)

Nếu **thiếu bất kỳ mục nào** ở trên:

- **Không** tự viết spec mới
- **Không** đoán bừa expected / selector / thư mục
- Hỏi lại user cho đủ thông tin rồi mới làm

## Khi test FAIL hoặc không đúng kỳ vọng

- **Tuyệt đối không** sửa code / luồng / UI / backend trong thư mục `phu_kien_cong_nghe/` để “cho test pass”.
- `phu_kien_cong_nghe/` chỉ để **đọc hiểu** nghiệp vụ và selector thực tế.
- Khi fail, chỉ được:
  - Sửa **test script** trong thư mục thành viên được giao (locator, wait, assert, data test…)
  - Hoặc báo cáo lệch giữa **Expected (test case)** và **hành vi thực tế của app**
  - Đề xuất hướng xử lý (đổi assert cho khớp app *nếu user đồng ý*, hoặc ghi nhận bug) — **không tự đụng app**

## Quy ước để chạy riêng và chạy chung

Nguyên tắc: **phụ thuộc chỉ được phép nằm BÊN TRONG một file spec; giữa các file spec thì độc lập hoàn toàn.**

- Playwright tự phát hiện các file `*.spec.ts` đệ quy bên trong `testDir: './tests'`. Tạo file spec đúng thư mục là đủ để file được đưa vào lần chạy chung; không cần import spec vào một file tổng hợp.
- **Giữa các file spec (bắt buộc độc lập):**
  - Một file spec phải chạy được một mình (`npx playwright test <file>`) và cho cùng kết quả khi chạy trong lần chạy chung (`npx playwright test`), bất kể thứ tự các file.
  - Không phụ thuộc dữ liệu do spec khác tạo, không phụ thuộc spec khác đã chạy trước hay chưa, không dùng biến trạng thái chia sẻ giữa các spec.
  - Không import file `*.spec.ts` của thành viên khác. Chỉ chia sẻ helper/fixture khi đã được cho phép tạo hoặc sửa file dùng chung.
  - Dữ liệu nền (seed) mà spec cần phải là dữ liệu có sẵn do user cung cấp (ví dụ file SQL seed), không do spec khác tạo ra.
- **Bên trong một file spec (được phép phụ thuộc theo test case):**
  - Các test case có thể phụ thuộc kết quả/dữ liệu của test case trước **trong cùng file**, đúng theo cột Dependence và thứ tự chạy trong bảng test case của user.
  - Đặt các test phụ thuộc trong cùng `test.describe` với `test.describe.configure({ mode: 'serial' })`, sắp xếp theo thứ tự chạy user cung cấp.
  - Trạng thái dùng chung giữa các test trong cùng file (ví dụ ID bản ghi vừa tạo, context đã đăng nhập) được lưu trong biến cấp `describe`/file hoặc `test.beforeAll`; chỉ dùng trong phạm vi file đó.
  - Test phụ thuộc `[ID]` chỉ chạy khi test tiền đề Passed. Nếu tiền đề fail/không chạy thì test phụ thuộc không được chạy và phải ghi rõ lý do Blocked (dùng `test.skip(...)` kèm lý do hoặc dựa vào cơ chế bỏ qua của serial); không được báo Passed.
  - Mỗi file spec tự thiết lập trạng thái đầu vào của chính nó (đăng nhập, mở trang, chuẩn bị dữ liệu) ở `test.beforeAll`/test đầu tiên, không giả định trạng thái còn lại từ file khác.
  - Test chỉ đọc dữ liệu chạy trước test ghi/xóa dữ liệu đó; test phá hủy (xóa thật) đặt cuối file.
- **Dữ liệu và dọn dẹp:**
  - Dữ liệu tạo mới dùng suffix `Date.now()` hoặc dữ liệu riêng của spec để không đụng spec khác; dọn dữ liệu do test tạo nếu phù hợp.
  - Test chỉ được sửa/xóa dữ liệu thuộc phạm vi spec của mình. Nếu test case bắt buộc sửa/xóa dữ liệu seed dùng chung với spec khác, phải đặt ở cuối file, ghi chú rõ trong spec và hỏi user trước khi viết.
  - Không reseed/import lại DB giữa chừng trong lúc chạy, trừ khi user yêu cầu rõ.
- Ứng dụng dùng chung dữ liệu Admin; cấu hình hiện tại đặt `workers: 1` và `fullyParallel: false` để giảm xung đột (các file chạy lần lượt, test trong file chạy theo thứ tự khai báo). Không tự tăng song song hoặc đổi cấu hình chung.

## Chạy test

Chạy tại thư mục dự án Playwright:

```bash
# Chạy một file độc lập
npx playwright test tests/Group06_<MaSV>_<HoTen>/<ten-file>.spec.ts

# Chạy toàn bộ test của một thành viên
npx playwright test tests/Group06_<MaSV>_<HoTen>

# Liệt kê các test được phát hiện
npx playwright test --list

# Chạy toàn bộ test của nhóm
npx playwright test
```

Trước khi bàn giao, chạy file spec của mình **riêng một mình**; nếu môi trường cho phép, kiểm tra thêm `npx playwright test --list` để xác nhận Playwright phát hiện file. Chỉ báo kết quả test là thành công khi lệnh chạy thực sự thành công.

## Quy ước test

- Dùng Playwright Test với TypeScript và `@playwright/test`.
- Tổ chức bằng `test.describe`; dùng locator theo thứ tự ưu tiên `getByTestId`, `getByRole`, locator theo thuộc tính ổn định.
- Assertion phải kiểm chứng kết quả thực tế bằng `expect`; không bỏ qua lỗi hoặc đánh dấu pass giả.
- Không hard-code thông tin bí mật hay đường dẫn tuyệt đối trên máy cá nhân (mật khẩu, thông tin kết nối DB lấy từ biến môi trường / `.env`).
- Đọc hướng dẫn `tests/<thư-mục-thành-viên>/AGENTS.md` nếu có; hướng dẫn trong thư mục đó bổ sung cho phạm vi thành viên tương ứng.

## Scope (BẮT BUỘC)

**Chỉ được đọc (tham khảo)** luồng nghiệp vụ / mô tả / source trong thư mục:
- `phu_kien_cong_nghe/` (và các subfolder của nó)

**Chỉ được sửa / tạo / xóa** file trong thư mục thành viên được chỉ định, ví dụ:
- `tests/Group06_<MaSV>_<HoTen>/`
- hoặc path thành viên do user nêu rõ trong prompt

**Cấm:**
- Sửa file của thành viên khác
- Sửa `playwright.config.ts`, `package.json`, root config trừ khi user yêu cầu rõ
- Sửa source / luồng app trong `phu_kien_cong_nghe/` — kể cả khi test failed hoặc expected không khớp
- Commit secrets, password hard-code mới, path máy local tuyệt đối
- Viết test khi chưa có đủ: bảng test case + chức năng đang làm + thư mục `tests/` đích

## Project context

- Framework: Playwright Test + TypeScript
- Website: phụ kiện công nghệ (admin product, order, …) – hiểu flow từ `phu_kien_cong_nghe`
- Test chạy qua: `npx playwright test`
- Mỗi thành viên: 1 folder riêng, mỗi chức năng ưu tiên 1 file `*.spec.ts`
- Đọc thêm `../../AGENTS.md` (nếu có) để nắm quy ước chung của nhóm về chạy test riêng/chung.
- Playwright tự tìm file `*.spec.ts` bên dưới `tests/`; chỉ cần tạo spec đúng thư mục thành viên, không cần tạo file tổng hợp để import các spec.
- Test case trong cùng một spec được phép phụ thuộc nhau theo thứ tự; các spec với nhau phải độc lập, không phụ thuộc test hoặc dữ liệu do spec khác (của mình hoặc thành viên khác) tạo.
- Lệnh chạy riêng (ví dụ):
  `npx playwright test tests/Group06_23130390_NguyenTruongVu/<ten-file>.spec.ts`
- Chạy chung toàn nhóm bằng `npx playwright test`. Không import spec của thành viên khác và không tự thay đổi cấu hình chạy chung.

## Before writing any test

1. Xác nhận đã có: test case đầy đủ (kèm cột Dependence và thứ tự chạy) + chức năng/luồng + path thư mục thành viên.
2. Đọc mô tả / UI flow liên quan trong `phu_kien_cong_nghe` (form, validation message, selector nếu có) — chỉ đọc.
3. Đọc `playwright.config.ts` (baseURL, timeout, workers, reporter).
4. Đọc helper / pattern đã có trong folder thành viên được chỉ định (nếu đã có file spec).
5. Bám đúng ID test case và expected message tiếng Việt theo bảng test case user cung cấp. Không sửa nội dung test case; nếu thấy mâu thuẫn thì báo user.
6. Từ cột Dependence, xác định test nào là tiền đề của test nào **trong cùng file**, rồi xếp thứ tự chạy theo quy ước ở mục “Quy ước để chạy riêng và chạy chung”.

## Coding conventions (Playwright)

- Import: `import { test, expect, Page } from '@playwright/test'`
- Helper dùng lại: `loginAndGoTo...`, `openAdd...`, `fill...` đặt đầu file hoặc `tests/helpers/` chỉ khi user cho phép tạo shared helper
- `test.describe` theo nhóm chức năng
- `test.describe.configure({ mode: 'serial' })` cho nhóm test có phụ thuộc theo thứ tự (dùng khi test sau cần kết quả/dữ liệu của test trước trong cùng file)
- `test.beforeAll` / `test.beforeEach`: đăng nhập + điều hướng; nhóm serial dùng chung một context/page thì tạo ở `beforeAll` và đóng ở `afterAll`
- Phạm vi chia sẻ trạng thái chỉ trong một file spec; không chia sẻ trạng thái qua file hoặc module dùng chung giữa các spec
- Test phụ thuộc: kiểm tra tiền đề Passed trước khi chạy; nếu không thì `test.skip` kèm lý do (Blocked), không để fail dây chuyền gây nhầm lẫn
- Title test: `'MODULE_Area-N: mô tả ngắn'` (vd: `PROD_MGT_Add-2: ...`)
- Locator ưu tiên: `getByTestId`, `getByRole`, `locator('[name=...]')`, `filter({ hasText })`
- Validation: submit → `expect(errorLocator).toHaveText('...')`
- Dialog: `page.once('dialog', d => d.accept())` trước action
- Data tạo mới: suffix `Date.now()` để tránh trùng SKU/tên
- Ảnh fixture: dùng path relative trong repo (`fixtures/images/...`), không dùng `C:\\Users\\...`
- Không Pass ảo: fail phải `expect` thất bại đúng nghĩa; không đánh dấu pass giả

## Output behavior

- Chỉ đề xuất/sửa file trong scope thành viên
- Nếu thiếu test case / chưa rõ chức năng / chưa rõ thư mục `tests/` → hỏi lại, không viết spec
- Nếu test fail: chỉ chỉnh test trong folder thành viên hoặc báo lệch expected vs app — không sửa `phu_kien_cong_nghe`
- Nếu cần đổi config chung hoặc file người khác → hỏi user, không tự sửa
- Giải thích ngắn: file nào đổi, vì sao
- Không viết lại toàn bộ project khi chỉ cần thêm/sửa vài test