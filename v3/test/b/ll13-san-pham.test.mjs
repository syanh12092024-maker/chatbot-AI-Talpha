// PHIẾU LL13 · tầng GIAO DIỆN của «sản phẩm là lõi»: vai + nhật ký của gắn/gỡ món POS, đường của router, trang.
// Hành vi SQL (thị trường theo shop, một món một sản phẩm, kẹp team): `test/ll13-san-pham-goc.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
const goc = await import('../../src/ui/san-pham/kho-goc.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const { HANH_DONG } = await import('../../src/audit/hanh-dong.js');

const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
const CUA = () => ({
  ds: async () => [], cho: async () => ({ cho: [], khongCoSoHieu: 0 }), dem: async () => ({}),
  tao: async () => ({}), sua: async () => ({}), bo: async () => ({}),
  chiTiet: async (_b, id) => (id === 'g1' ? { id: 'g1', maGoc: 'fitgum', thiTruong: [], page: [] } : null),
  monChuaGan: async () => [{ posMa: '111:z', ten: 'X', shopId: '111', thiTruong: 'Saudi' }],
  gan: async (_b, id, posMa) => ({ maGoc: 'fitgum', posMa, shopId: posMa.split(':')[0], daCo: false }),
  go: async (_b, id, posMa) => ({ maGoc: 'fitgum', posMa, shopId: posMa.split(':')[0] }),
  kienThuc: async (_b, id, kt) => ({ id, maGoc: 'fitgum', kienThuc: kt, truoc: {} }),
  goiYGop: async () => ({ dem: {}, nhom: [] }), gop: async () => ({}),   // VE8a: kho đòi thêm hai hàm gộp
});

test('U1 · kho gốc đòi ĐỦ mười hàm — thiếu hàm của LL13 là từ chối cả cụm, không nửa cửa', () => {
  const thieu = CUA(); delete thieu.gan;
  assert.throws(() => goc.datKhoGoc(thieu), /thiếu hàm: gan/);
  assert.doesNotThrow(() => goc.datKhoGoc(CUA()));
});

test('U2 · gắn/gỡ món POS: chỉ quản trị; mỗi lượt để MỘT dòng nhật ký đúng mã; đọc chi tiết mọi vai của màn', async () => {
  const nhatKy = [];
  goc.datKhoGoc(CUA());
  goc.datPheuNhatKyGoc(async (_b, g) => { nhatKy.push(g); });
  await assert.rejects(() => goc.ganMonPos(bc(VAI.MARKETER), 'g1', '111:z'), (e) => e.name === 'LoiThieuVai');
  assert.equal(nhatKy.length, 0, 'bị chặn thì không ghi gì');
  await goc.ganMonPos(bc(VAI.QUAN_TRI), 'g1', '111:z');
  await goc.goMonPos(bc(VAI.QUAN_TRI), 'g1', '111:z');
  assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.GAN_MON_POS_GOC, HANH_DONG.GO_MON_POS_GOC]);
  assert.match(nhatKy[0].ghiChu, /111:z.*shop 111.*fitgum/);
  const ct = await goc.chiTietGoc(bc(VAI.MARKETER), 'g1');
  assert.equal(ct.suaDuoc, false, 'marketer đọc được, không sửa được');
  assert.equal(ct.monChuaGan.length, 1);
  assert.equal(await goc.chiTietGoc(bc(VAI.QUAN_TRI), 'khong-co'), null);
});

test('U3 · router: ba đường LL13 đứng TRƯỚC `/api/san-pham/:id` (đứng sau là bị bắt làm mã page)', async () => {
  const { taoRouterSanPham } = await import('../../src/ui/san-pham/router.js');
  const ds = taoRouterSanPham().stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  const viTri = (d) => ds.indexOf(d);
  for (const d of ['GET /api/san-pham/goc/:id/chi-tiet', 'POST /api/san-pham/goc/:id/mon', 'POST /api/san-pham/goc/:id/mon/go']) {
    assert.ok(viTri(d) >= 0, `thiếu đường ${d}`);
    assert.ok(viTri(d) < viTri('GET /api/san-pham/:id'), `${d} đứng sau /api/san-pham/:id`);
  }
});

test('U4 · trang (VE1 · theo bản vẽ 2a): hai cột, bốn tầng, bốn tab — và ĐỦ bảy việc của màn cũ còn đường gọi', () => {
  // LL13 neo «khối Sản phẩm đứng trước bảng theo page». VE1 (29/09) dựng lại theo bản vẽ: danh sách sản phẩm bên trái,
  // một sản phẩm bên phải; bảng theo page thành «Bản sao theo page» mở từ ô lưu ý. Thước sửa theo luật mới (án lệ #27).
  const html = fs.readFileSync(new URL('../../src/ui/san-pham/trang/san-pham.html', import.meta.url), 'utf8');
  assert.match(html, /<header class="an-tieu-de">\s*<h1>Sản phẩm &amp; kho<\/h1>/, 'tên màn một nguồn (HK10) — đầu trang chỉ cho trình đọc màn hình');
  assert.match(html, /<main class="chia-hai">/);
  assert.match(html, /<section class="chia-hai-trai" aria-label="Sản phẩm">/);
  assert.match(html, /<ul class="ds-chon" id="dsGoc"/);
  assert.match(html, /aria-label="Bot ghép lời từ bốn tầng"/);
  assert.equal((html.match(/<span class="buoc">[①②③④]/g) || []).length, 4, 'bốn tầng');
  const tab = html.match(/const TABS = (\[[^\n]*\]);/);
  assert.ok(tab, 'không thấy danh sách tab');
  assert.deepEqual(JSON.parse(tab[1].replace(/'/g, '"')).map((x) => x[1]), ['Chung', 'Theo thị trường', 'Page đang bán', 'Lịch sử']);
  // Bảy việc của màn cũ — mỗi việc một đường gọi / một dấu còn nguyên:
  for (const [viec, re] of [
    ['chi tiết', /'\/chi-tiet'\)/], ['gắn món', /'\/mon', \{ method: 'POST'/], ['gỡ món', /'\/mon\/go', \{ method: 'POST'/],
    ['kiến thức', /'\/kien-thuc', \{ method: 'POST'/], ['lịch sử (mới)', /'\/lich-su'\)/],
    ['tạo sản phẩm', /goiGhi\('\/api\/san-pham\/goc', \{ method: 'POST'/], ['bỏ sản phẩm', /\{ method: 'DELETE' \}/],
    ['số hiệu chờ đặt tên', /data-cho=/], ['bản sao theo page', /goi\('\/api\/san-pham\/' \+ encodeURIComponent\(id\)\)/],
    ['số liệu', /metricRow\(\[/], ['cảnh báo thiếu bậc giá', /chưa có bậc giá nào/],
    ['thiếu tên không bịa', /màn này không bịa tên thay/], ['tồn kho để trống', /Tồn kho', value: '—'/],
  ]) assert.match(html, re, `mất việc «${viec}» khi dựng lại màn`);
  // Chỗ chưa có nguồn nói RÕ chưa có — không bịa (marketer từ HRM · ảnh chung · kịch bản tầng nước).
  assert.match(html, /Chưa có nguồn — hồ sơ HRM nối ở phiếu LL15/);
  assert.match(html, /Ảnh chung của sản phẩm chưa có chỗ lưu/);
  // Ảnh chụp VE1 29/09: cột phải cao cố định + nội dung dài ⇒ flex co dải bốn tầng và hàng tab (có overflow) về 0 —
  // chúng BIẾN MẤT ở tab Chung. Luật «con của cột phải không co» phải còn trong hệ kiểu.
  const css = fs.readFileSync(new URL('../../src/ui/chung/kieu.css', import.meta.url), 'utf8');
  assert.match(css, /\.chia-hai-phai > \* \{ flex-shrink: 0; \}/, 'thiếu luật không-co ⇒ dải bốn tầng + tab biến mất khi form dài');
});

test('U5 · UI.button đổi khoá `data` camelCase ⇒ kebab (`moGoc` ⇒ `data-mo-goc`) — nút gắn bằng `[data-mo-goc]` mới bấm được', () => {
  const js = fs.readFileSync(new URL('../../src/ui/chung/ui.js', import.meta.url), 'utf8');
  const win = {}; new Function('window', 'document', js)(win, {});
  const html = win.UI.button('Xem', { data: { moGoc: '7', live: 'x', 'go-mon': '1:a' } });
  assert.match(html, / data-mo-goc="7"/);
  assert.match(html, / data-live="x"/, 'khoá chữ thường giữ nguyên');
  assert.match(html, / data-go-mon="1:a"/, 'khoá đã kebab giữ nguyên');
});

test('U6 · VE1 · lịch sử một sản phẩm: đọc nhật ký ĐÚNG đối tượng, nhãn người đọc được; chưa nối ⇒ 500 nói rõ, không giả «chưa ai sửa»', async () => {
  goc.datDocNhatKyGoc(null);
  await assert.rejects(() => goc.lichSuGoc(bc(VAI.MARKETER), 'g1'), (e) => e.ma === 'chua_noi' && e.status === 500);
  let hoi = null;
  goc.datDocNhatKyGoc(async (_b, bo) => {
    hoi = bo;
    return { dong: [
      { xay_ra_luc: '2026-09-29T08:00:00Z', tac_nhan: 'nguoi:an@talpha.vn', hanh_dong: HANH_DONG.SUA_KIEN_THUC_SAN_PHAM, ghi_chu: 'hoi_size' },
      { xay_ra_luc: '2026-09-28T08:00:00Z', tac_nhan: 'may:keo-danh-muc', hanh_dong: HANH_DONG.GAN_MON_POS_GOC, ghi_chu: '111:a' },
    ], tong: 2 };
  });
  const ds = await goc.lichSuGoc(bc(VAI.MARKETER), 'g1');
  assert.deepEqual(hoi, { doiTuongLoai: 'san_pham_goc', doiTuongId: 'g1', gioiHan: 50 });
  assert.deepEqual(ds.map((x) => [x.ai, x.moTa]), [
    ['an@talpha.vn', 'Sửa kiến thức sản phẩm (bot đọc)'],
    ['máy · keo-danh-muc', 'Gắn món POS vào sản phẩm (thêm thị trường)'],
  ]);
  const { taoRouterSanPham } = await import('../../src/ui/san-pham/router.js');
  const duong = taoRouterSanPham().stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  assert.ok(duong.indexOf('GET /api/san-pham/goc/:id/lich-su') >= 0 && duong.indexOf('GET /api/san-pham/goc/:id/lich-su') < duong.indexOf('GET /api/san-pham/:id'),
    'đường lịch sử phải đứng TRƯỚC /api/san-pham/:id');
});

test('U7 · VE1b · tab Chung nói ĐÚNG bot có đọc kiến thức không — theo công tắc thật, không hứa «mọi page dùng ngay»', async (t) => {
  const { datDocHieuLuc } = await import('../../src/ui/prompt-page/kho-prompt.js');
  t.after(() => datDocHieuLuc(null));
  goc.datKhoGoc(CUA());
  datDocHieuLuc(null);
  assert.equal((await goc.chiTietGoc(bc(VAI.MARKETER), 'g1')).botDocKienThuc, null, 'chưa nối phép đo ⇒ CHƯA BIẾT, không đoán');
  datDocHieuLuc(() => ({ coBat: false }));
  assert.equal((await goc.chiTietGoc(bc(VAI.MARKETER), 'g1')).botDocKienThuc, false);
  datDocHieuLuc(() => ({ coBat: true }));
  assert.equal((await goc.chiTietGoc(bc(VAI.MARKETER), 'g1')).botDocKienThuc, true);
  const html = fs.readFileSync(new URL('../../src/ui/san-pham/trang/san-pham.html', import.meta.url), 'utf8');
  // Mọi câu hứa «bot dùng ngay» phải đứng SAU phép thử `=== true` — gõ cứng là màn nói dối khi prod còn ghép lời bản cũ.
  assert.match(html, /button\(CT\.botDocKienThuc === true \? 'Lưu — mọi page dùng ngay' : 'Lưu'/);
  assert.match(html, /canhBao\(CT\.botDocKienThuc === true\s*\? \{ level: 'success', title: 'Đã lưu', body: 'Lượt chat kế tiếp/);
  assert.equal((html.match(/mọi page dùng ngay/g) || []).length, 1, 'câu «mọi page dùng ngay» chỉ được xuất hiện ở nhánh đã bật');
  assert.match(html, /function veBotDocKt\(\) \{\n  if \(CT\.botDocKienThuc === true\) return '';/);
  assert.match(html, /\$\{veBotDocKt\(\)\}<section class="chia-phu">/, 'cảnh báo phải được vẽ ở tab Chung');
});
