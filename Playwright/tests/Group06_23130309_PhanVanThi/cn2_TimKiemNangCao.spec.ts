import { test, expect, type Locator, type Page } from '@playwright/test';

const BASE = 'http://localhost:8080';
const TU_KHOA = 'chuột';
const TU_KHOA_FIXTURE = 'mạng';

// thông báo khi không có sản phẩm nào phù hợp
const THONG_BAO_KHONG_CO = /không tìm thấy|không có sản phẩm|không có kết quả/i;

// Các dữ liệu cố định

interface SanPham {
  key: string; // href của sản phẩm, dùng để nhận biết sản phẩm
  id: number | null;
  ten: string;
  gia: number | null; // đơn vị VND
  danhMucId: number | null;
}

interface BoLoc {
  gia?: string;
  danhMuc?: string;
  sapXep?: string;
  sao?: number;
}

const KHOANG_GIA = {
  'Dưới 100.000đ': { min: 0, minInclusive: true, max: 100000, maxInclusive: false },
  '100.000đ - 300.000đ': { min: 100000, minInclusive: true, max: 300000, maxInclusive: true },
  '300.000đ - 500.000đ': { min: 300000, minInclusive: true, max: 500000, maxInclusive: true },
  '500.000đ - 1.000.000đ': { min: 500000, minInclusive: true, max: 1000000, maxInclusive: true },
  'Trên 1.000.000đ': { min: 1000000, minInclusive: false, max: Infinity, maxInclusive: false },
} as const;
type TenKhoangGia = keyof typeof KHOANG_GIA;

const NHAN_SAO: Record<number, string> = {
  5: '★★★★★ (5 sao)',
  4: '★★★★☆ trở lên',
  3: '★★★☆☆ trở lên',
  2: '★★☆☆☆ trở lên',
  1: '★☆☆☆☆ trở lên',
};

const KET_QUA_SAO_FIXTURE: Record<number, number[]> = {
  5: [1, 4, 12, 13],
  4: [1, 4, 5, 6, 7, 9, 10, 11, 12, 13],
  1: [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
};
const KET_QUA_MOI_NHAT_FIXTURE = [52, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 2, 1];
const KET_QUA_KET_HOP_DANH_MUC_VA_SAO_FIXTURE = [6, 7, 9, 10, 11, 12, 13];
const KET_QUA_KET_HOP_BON_BO_LOC_FIXTURE = [7, 6, 11];

const SAP_XEP_OPTIONS = ['Mặc định', 'Giá tăng dần', 'Giá giảm dần', 'Mới nhất'];
const KHOANG_GIA_OPTIONS = ['Tất cả', ...Object.keys(KHOANG_GIA)];
const DANH_GIA_OPTIONS = ['Tất cả', NHAN_SAO[5], NHAN_SAO[4], NHAN_SAO[3], NHAN_SAO[2], NHAN_SAO[1]];

const DANH_MUC_CAY: Array<[string, string[]]> = [
  ['Phụ Kiện Máy Tính', ['Chuột Máy Tính', 'Bàn Phím', 'Túi Chống Sốc']],
  ['Phụ Kiện Điện Thoại', ['Củ sạc', 'Ốp Lưng', 'Sạc Dự Phòng']],
  ['Dây Cáp Tín Hiệu', ['Cáp HDMI', 'Cáp VGA']],
  ['Bộ Chia Tín Hiệu', ['Bộ Chia AV', 'Bộ Chia VGA']],
  ['Phụ Kiện Xe', ['Phụ Kiện Xe Đạp', 'Phụ Kiện Ô Tô']],
  ['Thiết Bị Mạng', ['Máy Test Mạng', 'Dây Cáp Mạng']],
  ['Thiết Bị Ngoại Vi', ['Phụ Kiện Đàn Ghi-ta', 'Thiết Bị Nhập Cảm Biến']],
  ['Bộ Chuyển Đổi Tín Hiệu', ['Chuyển Đổi HDMI', 'Chuyển Đổi VGA']],
];
const DANH_MUC_CHA = DANH_MUC_CAY.map(([cha]) => cha);
const DANH_MUC_PHANG = ['Tất cả', ...DANH_MUC_CAY.flatMap(([cha, con]) => [cha, ...con])];

//Hàm dùng chung

const chuanHoa = (s: string): string => s.replace(/\s+/g, ' ').trim();

// Bỏ ký tự vẽ cây ở đầu tên danh mục con
const boKyTuCay = (s: string): string => chuanHoa(s).replace(/^[└├│┗┕─—\-\s]+/u, '');

// Ô chọn theo nhãn: Khoảng giá / Danh mục / Sắp xếp / Đánh giá
const oChon = (page: Page, ten: string): Locator =>
  page
    .getByLabel(ten, { exact: true })
    .or(page.locator(`xpath=//label[normalize-space()="${ten}"]/following::select[1]`));

// Chọn lựa chọn theo tên hiển thị (bỏ qua ký tự vẽ cây của danh mục con)
async function chonOption(select: Locator, nhan: string): Promise<void> {
  const tatCa = await select.locator('option').allTextContents();
  const viTri = tatCa.findIndex((t) => boKyTuCay(t) === nhan);
  if (viTri < 0) {
    throw new Error(`Không có lựa chọn "${nhan}". Hiện có: ${tatCa.map(chuanHoa).join(' | ')}`);
  }
  await select.selectOption({ index: viTri });
}

// nhập từ khóa vào ô tìm kiếm và nhấn tìm kiếm (bước đầu tiên dùng chung cho các test case)
async function timKiem(page: Page, tuKhoa: string): Promise<void> {
  const response = await page.goto(`${BASE}/`);
  expect(response?.ok(), `Trang chủ trả về HTTP ${response?.status() ?? 'không có phản hồi'}`).toBe(true);
  const oTim = page.getByPlaceholder('Tìm kiếm sản phẩm...');
  await oTim.fill(tuKhoa);
  const ketQuaTimKiem = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith('/search') && r.request().isNavigationRequest(),
  );
  await Promise.all([ketQuaTimKiem, page.locator('.search-button').click()]);
  const ketQua = await ketQuaTimKiem;
  expect(ketQua.ok(), `Tìm kiếm trả về HTTP ${ketQua.status()}`).toBe(true);
  await expect(page.getByText('Bộ Lọc Sản Phẩm')).toBeVisible();
}

async function nhanLoc(page: Page): Promise<void> {
  const ketQuaLoc = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith('/search') && r.request().isNavigationRequest(),
  );
  await Promise.all([ketQuaLoc, page.getByRole('button', { name: 'Lọc' }).click()]);
  const response = await ketQuaLoc;
  expect(response.ok(), `Lọc sản phẩm trả về HTTP ${response.status()}`).toBe(true);
}

async function datBoLoc(page: Page, bl: BoLoc): Promise<void> {
  if (bl.gia !== undefined) await chonOption(oChon(page, 'Khoảng giá'), bl.gia);
  if (bl.danhMuc !== undefined) await chonOption(oChon(page, 'Danh mục'), bl.danhMuc);
  if (bl.sapXep !== undefined) await chonOption(oChon(page, 'Sắp xếp'), bl.sapXep);
  if (bl.sao !== undefined) await chonOption(oChon(page, 'Đánh giá'), NHAN_SAO[bl.sao]);
}

// Chọn bộ lọc rồi nhấn "Lọc"
async function loc(page: Page, bl: BoLoc): Promise<void> {
  await datBoLoc(page, bl);
  await nhanLoc(page);
}

// Đọc các thông tin hiển thị trên từng card kết quả tìm kiếm.
async function laySanPham(page: Page): Promise<SanPham[]> {
  return page.evaluate((): SanPham[] => {
    const SEL = 'a[href*="product-detail"]';
    const hrefCua = (e: Element): Set<string | null> =>
      new Set(Array.from(e.querySelectorAll(SEL)).map((x) => x.getAttribute('href')));

    const cards = new Set<HTMLElement>();
    for (const a of Array.from(document.querySelectorAll<HTMLElement>(SEL))) {
      let el: HTMLElement = a;
      while (
        el.parentElement &&
        el.parentElement !== document.body &&
        hrefCua(el.parentElement).size <= 1 &&
        !(el.parentElement.textContent ?? '').includes('Bộ Lọc Sản Phẩm')
      ) {
        el = el.parentElement;
      }
      cards.add(el);
    }

    const rePrice = /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:₫|đ|VND)/i;
    return Array.from(cards).map((el) => {
      const a = el.matches(SEL) ? el : el.querySelector<HTMLElement>(SEL);
      const href = a?.getAttribute('href') ?? '';
      const text = el.innerText ?? '';
      const dong = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const m = text.match(rePrice);
      const idMatch = href.match(/id=(\d+)/);
      const categoryMatch = el
        .querySelector<HTMLButtonElement>('.search-similar')
        ?.getAttribute('onclick')
        ?.match(/product-category\?id=(\d+)/);
      return {
        key: href,
        id: idMatch ? Number(idMatch[1]) : null,
        ten: (a?.textContent ?? '').trim() || dong[0] || '',
        gia: m ? Number(m[1].replace(/[.,]/g, '')) : null,
        danhMucId: categoryMatch ? Number(categoryMatch[1]) : null,
      };
    });
  });
}

// Lấy danh sách sản phẩm và bắt buộc phải có ít nhất toiThieu sản phẩm
async function layDanhSach(page: Page, toiThieu = 1): Promise<SanPham[]> {
  const ds = await laySanPham(page);
  expect(
    ds.length,
    `Kỳ vọng ít nhất ${toiThieu} sản phẩm trong danh sách kết quả, thực tế có ${ds.length}`,
  ).toBeGreaterThanOrEqual(toiThieu);
  return ds;
}

function giaCua(sp: SanPham): number {
  if (sp.gia === null) {
    throw new Error(`Không đọc được giá của "${sp.ten}" - chỉnh biểu thức rePrice trong laySanPham()`);
  }
  return sp.gia;
}

// Hàm kiểm tra

function kiemTraKhoangGia(ds: SanPham[], ten: TenKhoangGia): void {
  const { min, max } = KHOANG_GIA[ten];
  for (const sp of ds) {
    const gia = giaCua(sp);
    if (KHOANG_GIA[ten].minInclusive) {
      expect(gia, `"${sp.ten}" giá ${gia} nằm ngoài khoảng "${ten}"`).toBeGreaterThanOrEqual(min);
    } else {
      expect(gia, `"${sp.ten}" giá ${gia} nằm ngoài khoảng "${ten}"`).toBeGreaterThan(min);
    }
    if (KHOANG_GIA[ten].maxInclusive) {
      expect(gia, `"${sp.ten}" giá ${gia} nằm ngoài khoảng "${ten}"`).toBeLessThanOrEqual(max);
    } else {
      expect(gia, `"${sp.ten}" giá ${gia} nằm ngoài khoảng "${ten}"`).toBeLessThan(max);
    }
  }
}

async function idDanhMuc(page: Page, ten: string): Promise<number> {
  const options = await oChon(page, 'Danh mục').locator('option').evaluateAll((els) =>
    els.map((el) => ({ text: el.textContent ?? '', value: (el as HTMLOptionElement).value })),
  );
  const option = options.find((item) => boKyTuCay(item.text) === ten);
  expect(option, `Không tìm thấy option danh mục "${ten}"`).toBeDefined();
  const id = Number(option?.value);
  expect(Number.isInteger(id), `Danh mục "${ten}" không có ID hợp lệ`).toBe(true);
  return id;
}

async function kiemTraDanhMuc(page: Page, ds: SanPham[], hopLe: string[]): Promise<void> {
  const idsHopLe = await Promise.all(hopLe.map((ten) => idDanhMuc(page, ten)));
  for (const sp of ds) {
    expect(sp.danhMucId, `"${sp.ten}" không đọc được ID danh mục từ card`).not.toBeNull();
    expect(idsHopLe, `"${sp.ten}" có danh mục ID ${sp.danhMucId}`).toContain(sp.danhMucId);
  }
}

function kiemTraSapXepGia(ds: SanPham[], huong: 'tang' | 'giam'): void {
  expect(ds.length, 'Cần ít nhất 2 sản phẩm để kiểm tra thứ tự').toBeGreaterThanOrEqual(2);
  const gia = ds.map(giaCua);
  const dung = [...gia].sort((a, b) => (huong === 'tang' ? a - b : b - a));
  expect(gia).toEqual(dung);
}

function kiemTraIdSanPham(ds: SanPham[], idsMongDoi: number[]): void {
  const ids = ds.map((sp) => sp.id);
  expect(ids, 'Có sản phẩm không đọc được ID từ link').not.toContain(null);
  expect(ids).toEqual(idsMongDoi);
}

function thuocKhoangGia(gia: number, ten: TenKhoangGia): boolean {
  const khoang = KHOANG_GIA[ten];
  const datMucDuoi = khoang.minInclusive ? gia >= khoang.min : gia > khoang.min;
  const datMucTren = khoang.maxInclusive ? gia <= khoang.max : gia < khoang.max;
  return datMucDuoi && datMucTren;
}

async function kiemTraKhongCoKetQua(page: Page): Promise<void> {
  expect(await laySanPham(page)).toHaveLength(0);
  await expect(page.getByText(THONG_BAO_KHONG_CO).first()).toBeVisible();
  // Trang không bị lỗi: bộ lọc vẫn còn hiển thị
  await expect(oChon(page, 'Khoảng giá')).toBeVisible();
}

// Các Test case

test.describe('3.2. Tìm kiếm nâng cao (lọc)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    // không cần đăng nhập
    await timKiem(page, TU_KHOA); 
  });

  //  Filter-GUI 
  test('Filter-GUI-1: giao diện và giá trị mặc định của bộ lọc', async ({ page }) => {
    await expect(page.getByText('Kết quả tìm kiếm', { exact: true })).toBeVisible();
    await expect(page.getByText(/Từ khóa:/)).toContainText(TU_KHOA);
    await expect(page.getByText('Bộ Lọc Sản Phẩm')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lọc' })).toBeVisible();

    await expect(oChon(page, 'Khoảng giá').locator('option:checked')).toHaveText('Tất cả');
    await expect(oChon(page, 'Danh mục').locator('option:checked')).toHaveText('Tất cả');
    await expect(oChon(page, 'Sắp xếp').locator('option:checked')).toHaveText('Mặc định');
    await expect(oChon(page, 'Đánh giá').locator('option:checked')).toHaveText('Tất cả');
  });

  test('Filter-GUI-2: các lựa chọn của 4 danh sách', async ({ page }) => {
    const layOption = async (ten: string): Promise<string[]> =>
      (await oChon(page, ten).locator('option').allTextContents()).map(boKyTuCay);

    expect(await layOption('Khoảng giá')).toEqual(KHOANG_GIA_OPTIONS);
    expect(await layOption('Sắp xếp')).toEqual(SAP_XEP_OPTIONS);
    expect(await layOption('Đánh giá')).toEqual(DANH_GIA_OPTIONS);
    expect(await layOption('Danh mục')).toEqual(DANH_MUC_PHANG);

    // Danh mục con phải thụt vào, danh mục cha thì không
    const goc = await oChon(page, 'Danh mục').locator('option').allTextContents();
    for (const t of goc) {
      const ten = boKyTuCay(t);
      const laCha = ten === 'Tất cả' || DANH_MUC_CHA.includes(ten);
      if (laCha) expect(chuanHoa(t), `"${ten}" là danh mục cha, không được thụt vào`).toBe(ten);
      else expect(chuanHoa(t), `"${ten}" là danh mục con, phải thụt vào`).not.toBe(ten);
    }
  });

  //  Filter-Price 
  const tenKhoangGia = Object.keys(KHOANG_GIA) as TenKhoangGia[];
  tenKhoangGia.forEach((ten, i) => {
    test(`Filter-Price-${i + 1}: lọc theo khoảng giá "${ten}"`, async ({ page }) => {
      const banDau = await layDanhSach(page);
      const mongDoi = banDau
        .filter((sp) => thuocKhoangGia(giaCua(sp), ten))
        .map((sp) => sp.key)
        .sort();
      await loc(page, { gia: ten });
      const ds = await laySanPham(page);
      expect(ds.map((sp) => sp.key).sort()).toEqual(mongDoi);
      kiemTraKhoangGia(ds, ten);
      if (mongDoi.length === 0) await kiemTraKhongCoKetQua(page);
    });
  });

  test('Filter-Price-6: sản phẩm giá đúng mốc 100.000đ chỉ thuộc một khoảng', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    const sanPhamMoc = (await layDanhSach(page)).filter((sp) => sp.gia === 100000);
    expect(sanPhamMoc.length, 'Fixture phải có ít nhất một sản phẩm giá đúng 100.000đ').toBeGreaterThan(0);

    await loc(page, { gia: 'Dưới 100.000đ' });
    const khoangDuoi = new Set((await laySanPham(page)).map((sp) => sp.key));
    await loc(page, { gia: '100.000đ - 300.000đ' });
    const khoangTren = new Set((await laySanPham(page)).map((sp) => sp.key));

    for (const sp of sanPhamMoc) {
      expect(khoangDuoi.has(sp.key), `"${sp.ten}" đúng 100.000đ không được nằm trong khoảng dưới 100.000đ`).toBe(false);
      expect(khoangTren.has(sp.key), `"${sp.ten}" đúng 100.000đ phải nằm trong khoảng 100.000đ - 300.000đ`).toBe(true);
    }
  });

  test('Filter-Price-7: khoảng giá không có sản phẩm nào phù hợp', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { gia: '300.000đ - 500.000đ' });
    await kiemTraKhongCoKetQua(page);
  });

  // Filter-Category 
  test('Filter-Category-1: lọc theo danh mục con "Chuột Máy Tính"', async ({ page }) => {
    const banDau = await layDanhSach(page);
    const idChuot = await idDanhMuc(page, 'Chuột Máy Tính');
    const mongDoi = banDau.filter((sp) => sp.danhMucId === idChuot).map((sp) => sp.key).sort();
    expect(mongDoi.length, 'Fixture phải có sản phẩm chuột trong danh mục con').toBeGreaterThan(0);

    await loc(page, { danhMuc: 'Chuột Máy Tính' });
    const ds = await laySanPham(page);
    expect(ds.map((sp) => sp.key).sort()).toEqual(mongDoi);
    await kiemTraDanhMuc(page, ds, ['Chuột Máy Tính']);
  });

  test('Filter-Category-2: lọc theo danh mục cha "Phụ Kiện Máy Tính"', async ({ page }) => {
    const tenDanhMucHopLe = ['Chuột Máy Tính', 'Bàn Phím', 'Túi Chống Sốc'];
    const banDau = await layDanhSach(page);
    const idsDanhMucHopLe = await Promise.all(tenDanhMucHopLe.map((ten) => idDanhMuc(page, ten)));
    const mongDoi = banDau
      .filter((sp) => sp.danhMucId !== null && idsDanhMucHopLe.includes(sp.danhMucId))
      .map((sp) => sp.key)
      .sort();
    expect(mongDoi.length, 'Fixture phải có sản phẩm thuộc danh mục con của Phụ Kiện Máy Tính').toBeGreaterThan(0);

    await loc(page, { danhMuc: 'Phụ Kiện Máy Tính' });
    const ds = await laySanPham(page);
    expect(ds.map((sp) => sp.key).sort()).toEqual(mongDoi);
    await kiemTraDanhMuc(page, ds, tenDanhMucHopLe);
  });

  //  Filter-Sort
  test('Filter-Sort-1: sắp xếp "Giá tăng dần"', async ({ page }) => {
    await loc(page, { sapXep: 'Giá tăng dần' });
    kiemTraSapXepGia(await layDanhSach(page, 2), 'tang');
  });

  test('Filter-Sort-2: sắp xếp "Giá giảm dần"', async ({ page }) => {
    await loc(page, { sapXep: 'Giá giảm dần' });
    kiemTraSapXepGia(await layDanhSach(page, 2), 'giam');
  });

  test('Filter-Sort-3: sắp xếp "Mới nhất"', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { sapXep: 'Mới nhất' });
    kiemTraIdSanPham(await layDanhSach(page, KET_QUA_MOI_NHAT_FIXTURE.length), KET_QUA_MOI_NHAT_FIXTURE);
  });

  // Filter-Rating
  test('Filter-Rating-1: lọc theo đánh giá "5 sao"', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { sao: 5 });
    kiemTraIdSanPham(await layDanhSach(page, KET_QUA_SAO_FIXTURE[5].length), KET_QUA_SAO_FIXTURE[5]);
  });

  test('Filter-Rating-2: lọc theo đánh giá "4 sao trở lên"', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { sao: 4 });
    kiemTraIdSanPham(await layDanhSach(page, KET_QUA_SAO_FIXTURE[4].length), KET_QUA_SAO_FIXTURE[4]);
  });

  test('Filter-Rating-3: lọc theo đánh giá "1 sao trở lên"', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { sao: 1 });
    kiemTraIdSanPham(await layDanhSach(page, KET_QUA_SAO_FIXTURE[1].length), KET_QUA_SAO_FIXTURE[1]);
  });

  // Filter-Combine
  test('Filter-Combine-1: kết hợp khoảng giá và danh mục', async ({ page }) => {
    await loc(page, { gia: '100.000đ - 300.000đ', danhMuc: 'Chuột Máy Tính' });
    const ds = await layDanhSach(page);
    kiemTraKhoangGia(ds, '100.000đ - 300.000đ');
    await kiemTraDanhMuc(page, ds, ['Chuột Máy Tính']);
  });

  test('Filter-Combine-2: kết hợp khoảng giá và sắp xếp theo giá', async ({ page }) => {
    await loc(page, { gia: '300.000đ - 500.000đ', sapXep: 'Giá tăng dần' });
    const ds = await layDanhSach(page, 2);
    kiemTraKhoangGia(ds, '300.000đ - 500.000đ');
    kiemTraSapXepGia(ds, 'tang');
  });

  test('Filter-Combine-3: kết hợp danh mục và đánh giá', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, { danhMuc: 'Dây Cáp Mạng', sao: 4 });
    const ds = await layDanhSach(page, KET_QUA_KET_HOP_DANH_MUC_VA_SAO_FIXTURE.length);
    await kiemTraDanhMuc(page, ds, ['Dây Cáp Mạng']);
    kiemTraIdSanPham(ds, KET_QUA_KET_HOP_DANH_MUC_VA_SAO_FIXTURE);
  });

  test('Filter-Combine-4: kết hợp cả 4 bộ lọc', async ({ page }) => {
    await timKiem(page, TU_KHOA_FIXTURE);
    await loc(page, {
      gia: '100.000đ - 300.000đ',
      danhMuc: 'Dây Cáp Mạng',
      sapXep: 'Giá giảm dần',
      sao: 3,
    });
    const ds = await layDanhSach(page, KET_QUA_KET_HOP_BON_BO_LOC_FIXTURE.length);
    kiemTraKhoangGia(ds, '100.000đ - 300.000đ');
    await kiemTraDanhMuc(page, ds, ['Dây Cáp Mạng']);
    kiemTraSapXepGia(ds, 'giam');
    kiemTraIdSanPham(ds, KET_QUA_KET_HOP_BON_BO_LOC_FIXTURE);
  });

  test('Filter-Combine-5: kết hợp bộ lọc không có sản phẩm thỏa điều kiện', async ({ page }) => {
    await loc(page, { danhMuc: 'Bộ Chia VGA', gia: 'Dưới 100.000đ', sao: 5 });
    await kiemTraKhongCoKetQua(page);
  });

  test('Filter-Combine-6: từ khóa được giữ nguyên sau khi lọc', async ({ page }) => {
    const truocLoc = new Set((await laySanPham(page)).map((sp) => sp.key));

    await loc(page, { gia: '100.000đ - 300.000đ' });

    await expect(page.locator('.search-result-page form input[name="keyword"]')).toHaveValue(TU_KHOA);
    await expect(page.getByText(/Từ khóa:/)).toContainText(TU_KHOA);
    for (const sp of await laySanPham(page)) {
      expect(truocLoc.has(sp.key), `"${sp.ten}" không nằm trong kết quả tìm "${TU_KHOA}" ban đầu`).toBe(true);
    }
  });

  test('Filter-Combine-7: dùng bộ lọc khi từ khóa không có kết quả', async ({ page }) => {
    await timKiem(page, 'abcxyz');
    await loc(page, { gia: 'Dưới 100.000đ' });
    await kiemTraKhongCoKetQua(page);
  });
});
