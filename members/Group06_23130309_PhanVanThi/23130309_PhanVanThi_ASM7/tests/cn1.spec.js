import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8080';
const TRANG_DIA_CHI = `${BASE}/address-user`;

// Thông báo mong đợi 
const THONG_BAO_BAT_BUOC = /bắt buộc|vui lòng nhập/i;
const THONG_BAO_SAI_DINH_DANG = /sai định dạng|không đúng định dạng|không hợp lệ/i;

// Các test dùng chung 1 tài khoản và đếm dòng trong bảng nên phải chạy lần lượt (không song song) để không lẫn dữ liệu của nhau.
test.describe.configure({ mode: 'default' });

// clear sau mỗi test
const clear = [];

// Tạo chuỗi duy nhất để biết chính xác dòng nào là của test này
function taoChuoi(tienTo) {
  return `${tienTo} ${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
}

// Số điện thoại hợp lệ ngẫu nhiên: 0 + 9 chữ số (10 số)
function taoSdt() {
  return '09' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
}

// Bộ dữ liệu địa chỉ đầy đủ, không trùng với test khác
function duLieuMoi() {
  return {
    hoTen: taoChuoi('Thi'),
    sdt: taoSdt(),
    tinh: 'TP.Hồ Chí Minh',
    chiTiet: taoChuoi('KTX khu B'),
  };
}

// Tìm dòng (<tr>) trong bảng có chứa chuỗi key
const dongTheo = (page, key) => page.getByRole('row').filter({ hasText: key });

async function vaoTrangDiaChi(page) {
  await page.getByRole('link', { name: 'Hello, USER' }).click();
  await page.getByRole('link', { name: 'Địa chỉ' }).click();
  await expect(page.getByRole('button', { name: '+ Thêm địa chỉ mới' })).toBeVisible();
}

// Điền form, trường nào không truyền vào (undefined) thì bỏ qua
async function dienForm(page, { hoTen, sdt, tinh, chiTiet }) {
  if (hoTen !== undefined) await page.getByRole('textbox', { name: 'Họ và tên' }).fill(hoTen);
  if (sdt !== undefined) await page.getByRole('textbox', { name: 'Số điện thoại' }).fill(sdt);
  if (tinh !== undefined) await page.getByRole('combobox').selectOption(tinh);
  if (chiTiet !== undefined) await page.getByRole('textbox', { name: 'Địa chỉ chi tiết' }).fill(chiTiet);
}

const nhanHoanThanh = (page) => page.getByRole('button', { name: 'Hoàn thành' }).click();

// Mở form thêm, điền, bấm Hoàn thành
async function themDiaChi(page, duLieu) {
  await page.getByRole('button', { name: '+ Thêm địa chỉ mới' }).click();
  await dienForm(page, duLieu);
  await nhanHoanThanh(page);
}

// Pre-condition của Update/Delete: "Đã thêm địa chỉ giao hàng thành công"
// Mỗi test tự tạo dữ liệu của riêng mình nên không phụ thuộc test khác.
async function taoSanDiaChi(page) {
  const goc = duLieuMoi();
  clear.push(goc.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, goc);
  await expect(dongTheo(page, goc.sdt)).toHaveCount(1);
  return goc;
}

// Bấm "Cập nhật" ở đúng dòng có chứa key
const moFormCapNhat = (page, key) =>
  dongTheo(page, key).getByRole('button', { name: 'Cập nhật' }).click();

// Kiểm tra 1 dòng chứa đủ các trường (trường nào undefined thì bỏ qua)
async function kiemTraDong(dong, { hoTen, sdt, tinh, chiTiet }) {
  for (const giaTri of [hoTen, sdt, tinh, chiTiet]) {
    if (giaTri !== undefined) await expect(dong).toContainText(giaTri);
  }
}

// Thông báo "cần nhập các trường bắt buộc" phải hiện
async function kiemTraThongBaoBatBuoc(page) {
  await expect(page.getByText(THONG_BAO_BAT_BUOC).first()).toBeVisible();
}

// Số dòng hiện tại trong bảng
async function demDong(page) {
  const rows = page.getByRole('row');
  await expect(rows.first()).toBeVisible();
  return rows.count();
}



test.beforeEach(async ({ page }) => {
  clear.length = 0;
  await page.goto(`${BASE}/`);
  await page.getByRole('link', { name: 'Đăng nhập' }).click();
  await page.getByRole('textbox', { name: 'Tên đăng nhập hoặc email' }).fill('user@gmail.com');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill(process.env.TEST_PASSWORD ?? 'vudeptrai2k5');
  await page.getByRole('button', { name: 'Đăng Nhập' }).click();
  await expect(page.getByRole('link', { name: 'Hello, USER' })).toBeVisible();
});

// Dọn dữ liệu test (kể cả khi test FAILED) để lần chạy sau không bị trùng
test.afterEach(async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto(TRANG_DIA_CHI);
  for (const key of clear) {
    const rows = dongTheo(page, key);
    for (let i = 0; i < 5; i++) {
      const n = await rows.count();
      if (n === 0) break;
      await rows.first().getByRole('link', { name: 'Xóa' }).click();
      await expect(rows).toHaveCount(n - 1);
    }
  }
});


// Thêm với nội dung đầy đủ
test('Add-DeliveryAddress-1: thêm với đầy đủ các trường', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, d);

  const dong = dongTheo(page, d.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, d);
});

//Để trống tất cả -> mong đợi thông báo bắt buộc
test('Add-DeliveryAddress-2: để trống tất cả các trường', async ({ page }) => {
  await vaoTrangDiaChi(page);
  const soTruoc = await demDong(page);

  await page.getByRole('button', { name: '+ Thêm địa chỉ mới' }).click();
  await nhanHoanThanh(page);

  await kiemTraThongBaoBatBuoc(page);

  await page.goto(TRANG_DIA_CHI);
  await expect(page.getByRole('row')).toHaveCount(soTruoc); // không được thêm dòng nào
});

// Chỉ nhập Họ và tên -> mong đợi thông báo bắt buộc
test('Add-DeliveryAddress-3: chỉ nhập Họ và tên', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.hoTen);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { hoTen: d.hoTen });

  await kiemTraThongBaoBatBuoc(page);

  await page.goto(TRANG_DIA_CHI);
  await expect(dongTheo(page, d.hoTen)).toHaveCount(0);
});

// Đủ trường nhưng bỏ Họ và tên -> vẫn thêm được
test('Add-DeliveryAddress-4: đủ các trường, bỏ Họ và tên', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { sdt: d.sdt, tinh: d.tinh, chiTiet: d.chiTiet });

  const dong = dongTheo(page, d.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { sdt: d.sdt, tinh: d.tinh, chiTiet: d.chiTiet });
});

// Chỉ nhập Số điện thoại -> vẫn thêm được, chỉ hiện SĐT
test('Add-DeliveryAddress-5: chỉ nhập Số điện thoại', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { sdt: d.sdt });

  const dong = dongTheo(page, d.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { sdt: d.sdt });
});

// Đủ trường nhưng bỏ Số điện thoại -> thông báo bắt buộc
test('Add-DeliveryAddress-6: đủ các trường, bỏ Số điện thoại', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.hoTen);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { hoTen: d.hoTen, tinh: d.tinh, chiTiet: d.chiTiet });

  await kiemTraThongBaoBatBuoc(page);

  await page.goto(TRANG_DIA_CHI);
  await expect(dongTheo(page, d.hoTen)).toHaveCount(0);
});

//  Số điện thoại sai định dạng (chạy từng trường hợp)
const sdtSaiDinhDang = [
  ['thiếu số (5 số)', '12345'],
  ['thiếu 1 số (9 số)', '037887240'],
  ['thừa số (11 số)', '03788724033'],
  ['có chữ cái', '03788abc03'],
  ['có ký tự đặc biệt', '0378@#$%03'],
];

for (const [moTa, sdtSai] of sdtSaiDinhDang) {
  test(`Add-DeliveryAddress-7: SĐT sai định dạng - ${moTa}`, async ({ page }) => {
    const d = duLieuMoi();
    clear.push(d.chiTiet);
    await vaoTrangDiaChi(page);
    await themDiaChi(page, { ...d, sdt: sdtSai });

    // Bên dưới ô "Số điện thoại" hiện thông báo sai định dạng
    await expect(page.getByText(THONG_BAO_SAI_DINH_DANG).first()).toBeVisible();

    // Địa chỉ không được thêm
    await page.goto(TRANG_DIA_CHI);
    await expect(dongTheo(page, d.chiTiet)).toHaveCount(0);
  });
}

// Chỉ chọn Tỉnh/Thành -> thông báo bắt buộc
test('Add-DeliveryAddress-8: chỉ chọn Tỉnh/Thành phố', async ({ page }) => {
  await vaoTrangDiaChi(page);
  const soTruoc = await demDong(page);

  await themDiaChi(page, { tinh: 'TP.Hồ Chí Minh' });

  await kiemTraThongBaoBatBuoc(page);

  await page.goto(TRANG_DIA_CHI);
  await expect(page.getByRole('row')).toHaveCount(soTruoc);
});

// Đủ trường nhưng bỏ Tỉnh/Thành -> vẫn thêm được
test('Add-DeliveryAddress-9: đủ các trường, bỏ Tỉnh/Thành phố', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { hoTen: d.hoTen, sdt: d.sdt, chiTiet: d.chiTiet });

  const dong = dongTheo(page, d.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { hoTen: d.hoTen, sdt: d.sdt, chiTiet: d.chiTiet });
});

// Chỉ nhập Địa chỉ chi tiết -> thông báo bắt buộc
test('Add-DeliveryAddress-10: chỉ nhập Địa chỉ chi tiết', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.chiTiet);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { chiTiet: d.chiTiet });

  await kiemTraThongBaoBatBuoc(page);

  await page.goto(TRANG_DIA_CHI);
  await expect(dongTheo(page, d.chiTiet)).toHaveCount(0);
});

// Đủ trường nhưng bỏ Địa chỉ chi tiết -> vẫn thêm được
test('Add-DeliveryAddress-11: đủ các trường, bỏ Địa chỉ chi tiết', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);
  await themDiaChi(page, { hoTen: d.hoTen, sdt: d.sdt, tinh: d.tinh });

  const dong = dongTheo(page, d.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { hoTen: d.hoTen, sdt: d.sdt, tinh: d.tinh });
});

// Nhập đủ rồi nhấn "Trở lại" -> không thêm
test('Add-DeliveryAddress-12: nhập đủ rồi nhấn Trở lại', async ({ page }) => {
  const d = duLieuMoi();
  clear.push(d.sdt);
  await vaoTrangDiaChi(page);

  await page.getByRole('button', { name: '+ Thêm địa chỉ mới' }).click();
  await dienForm(page, d);

  // "Trở lại" có thể là button hoặc link, nên cho phép cả hai
  await page
    .getByRole('button', { name: 'Trở lại' })
    .or(page.getByRole('link', { name: 'Trở lại' }))
    .click();

  await page.goto(TRANG_DIA_CHI);
  await expect(dongTheo(page, d.sdt)).toHaveCount(0);
});

// Cập nhật tất cả các trường
test('Update-DeliveryAddress-1: cập nhật tất cả các trường', async ({ page }) => {
  const goc = await taoSanDiaChi(page);
  const moi = { ...duLieuMoi(), tinh: 'Quảng Trị' };
  clear.push(moi.sdt);

  await moFormCapNhat(page, goc.sdt);
  await dienForm(page, moi);
  await nhanHoanThanh(page);

  const dongMoi = dongTheo(page, moi.sdt);
  await expect(dongMoi).toHaveCount(1);
  await kiemTraDong(dongMoi, moi);
  await expect(dongTheo(page, goc.sdt)).toHaveCount(0); // dữ liệu cũ không còn
});

//Không đổi gì -> dữ liệu giữ nguyên
test('Update-DeliveryAddress-2: không thay đổi nội dung nào', async ({ page }) => {
  const goc = await taoSanDiaChi(page);
  const soTruoc = await demDong(page);

  await moFormCapNhat(page, goc.sdt);
  await nhanHoanThanh(page);

  const dong = dongTheo(page, goc.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, goc);
  await expect(page.getByRole('row')).toHaveCount(soTruoc); // không sinh thêm dòng
});

// Chỉ sửa Họ và tên
test('Update-DeliveryAddress-3: chỉ cập nhật Họ và tên', async ({ page }) => {
  const goc = await taoSanDiaChi(page);
  const hoTenMoi = taoChuoi('Ten moi');

  await moFormCapNhat(page, goc.sdt);
  await dienForm(page, { hoTen: hoTenMoi });
  await nhanHoanThanh(page);

  const dong = dongTheo(page, goc.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { ...goc, hoTen: hoTenMoi }); // các trường khác giữ nguyên
  await expect(dong).not.toContainText(goc.hoTen);
});

// Chỉ sửa Số điện thoại
test('Update-DeliveryAddress-4: chỉ cập nhật Số điện thoại', async ({ page }) => {
  const goc = await taoSanDiaChi(page);
  const sdtMoi = taoSdt();
  clear.push(sdtMoi);

  await moFormCapNhat(page, goc.sdt);
  await dienForm(page, { sdt: sdtMoi });
  await nhanHoanThanh(page);

  const dong = dongTheo(page, sdtMoi);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { ...goc, sdt: sdtMoi });
  await expect(dongTheo(page, goc.sdt)).toHaveCount(0);
});

// Chỉ sửa Tỉnh/Thành phố
test('Update-DeliveryAddress-5: chỉ cập nhật Tỉnh/Thành phố', async ({ page }) => {
  const goc = await taoSanDiaChi(page);

  await moFormCapNhat(page, goc.sdt);
  await dienForm(page, { tinh: 'Quảng Trị' });
  await nhanHoanThanh(page);

  const dong = dongTheo(page, goc.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { ...goc, tinh: 'Quảng Trị' });
  await expect(dong).not.toContainText(goc.tinh);
});

// Chỉ sửa Địa chỉ chi tiết
test('Update-DeliveryAddress-6: chỉ cập nhật Địa chỉ chi tiết', async ({ page }) => {
  const goc = await taoSanDiaChi(page);
  const chiTietMoi = taoChuoi('Nha so 99');

  await moFormCapNhat(page, goc.sdt);
  await dienForm(page, { chiTiet: chiTietMoi });
  await nhanHoanThanh(page);

  const dong = dongTheo(page, goc.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, { ...goc, chiTiet: chiTietMoi });
  await expect(dong).not.toContainText(goc.chiTiet);
});

// Xóa và bấm OK trên hộp thoại xác nhận
test('Delete-DeliveryAddress-1: xóa và nhấn OK', async ({ page }) => {
  const goc = await taoSanDiaChi(page);

  let loaiHopThoai = '';
  page.once('dialog', async (dialog) => {
    loaiHopThoai = dialog.type();
    await dialog.accept(); // bấm OK
  });
  await dongTheo(page, goc.sdt).getByRole('link', { name: 'Xóa' }).click();

  await expect(dongTheo(page, goc.sdt)).toHaveCount(0);
  expect(loaiHopThoai).toBe('confirm'); // chắc chắn có hộp thoại xác nhận hiện ra
});

//Xóa nhưng bấm Cancel -> vẫn còn
test('Delete-DeliveryAddress-2: xóa và nhấn Cancel', async ({ page }) => {
  const goc = await taoSanDiaChi(page);

  let loaiHopThoai = '';
  page.once('dialog', async (dialog) => {
    loaiHopThoai = dialog.type();
    await dialog.dismiss(); // bấm Cancel
  });
  await dongTheo(page, goc.sdt).getByRole('link', { name: 'Xóa' }).click();

  // Tải lại trang để chắc chắn dữ liệu còn trong hệ thống, không chỉ còn trên giao diện
  await page.goto(TRANG_DIA_CHI);
  const dong = dongTheo(page, goc.sdt);
  await expect(dong).toHaveCount(1);
  await kiemTraDong(dong, goc);
  expect(loaiHopThoai).toBe('confirm');
});