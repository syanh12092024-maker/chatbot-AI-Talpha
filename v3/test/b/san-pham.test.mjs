// MÀN «SẢN PHẨM & KHO» (G2-F6).
//
// Màn này sinh ra từ một lỗi của chính tôi: tôi báo cáo «chặn — bảng `san_pham` 0 dòng»
// trong khi tiến trình bot đang bán 71 sản phẩm trên 69 page. Cùng đúng lỗi với cột
// `page.bot_ai_bat` (B-Y7): nhìn BẢN SAO rỗng rồi kết luận nguồn cũng rỗng.
//
// Nên bài đầu tiên canh đúng chuyện đó: màn KHÔNG được đọc bảng `san_pham`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const sp = await import('../../src/ui/san-pham/kho-san-pham.js');

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const NGUON = path.resolve(THU_MUC, '../../src/ui/san-pham/kho-san-pham.js');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: 'lan', thi_truong: 'KSA' },
  { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', marketer: '' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC', marketer: '' },
];

const mucDs = (pageId, n, o = {}) => ({
  pageId, ten: 'Page ' + pageId, soSanPham: n, coKichBan: true,
  thiTruong: '', nganhHang: '', marketer: '', botBat: false, ...o,
});

const mucSp = (ma, o = {}) => ({
  ma, ten: '', moTa: '', bienThe: '', tienTe: 'SAR', giaDau: 109,
  bacGia: [{ nhan: 'Mua 1', gia: 109 }], anh: [{ duong: 'https://x/a.jpg', nhan: 'Ảnh' }], ...o,
});

function dung({ danhSach, motPage } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: PAGE,
    // Bảng `san_pham` CÓ trong kho giả và CÓ dòng — nếu màn lỡ đọc nó, bài test dưới sẽ thấy.
    san_pham: [{ id: 's9', team_id: 't1', ma: 'BAY', ten: 'BẪY — không được đọc bảng này' }],
  });
  sp.datTaoTruyVan(taoTruyVan);
  sp.datDocKhoSanPham({ danhSach, motPage });
}

const bc = (team = 't1', vai = [VAI.QUAN_TRI]) => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai,
});

/* ═══════════ ① KHÔNG ĐƯỢC ĐỌC BẢN SAO ═══════════ */

test('①a · mã nguồn KHÔNG TRUY VẤN bảng `san_pham` của v3', () => {
  // Cấm đúng thứ cần cấm: một LỜI GỌI TRUY VẤN lên bảng đó. Không cấm nhắc tên nó — màn
  // BUỘC phải nhắc, vì nó phải giải thích cho người dùng «vì sao bảng rỗng mà vẫn có số».
  // Bản đầu của bài này soi mọi chuỗi `'san_pham'` nên bắt nhầm cả mã lỗi lẫn câu giải
  // thích: một cái lưới bắt nhầm thì người ta gỡ nó, rồi nó không bắt được gì nữa.
  const src = readFileSync(NGUON, 'utf8');
  const ma = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((d) => !d.trim().startsWith('//')).join('\n');
  const goi = ma.match(/\.\s*(chon|mot|dem|them|sua|xoa)\s*\(\s*['"`]san_pham['"`]/g) || [];
  assert.deepEqual(goi, [],
    `màn đang TRUY VẤN bảng \`san_pham\` (${goi.join(', ')}) — bảng đó 0 dòng, đọc nó là lặp lại lỗi B-Y7`);
});

test('①a2 · lưới ① có bắt được thật không', () => {
  // Một lưới không tự kiểm là một lưới trang trí. Dựng đúng dòng cấm và bắt nó phải khớp.
  const gia = "const x = await d.chon('san_pham', {});";
  const goi = gia.match(/\.\s*(chon|mot|dem|them|sua|xoa)\s*\(\s*['"`]san_pham['"`]/g) || [];
  assert.equal(goi.length, 1, 'phép soi không khớp nổi một lời gọi rành rành');
});

test('①b · đọc thật thì ra sản phẩm của NGUỒN, không ra bẫy trong bảng', async () => {
  dung({ danhSach: async () => [mucDs('111', 2)], motPage: async () => ({ pageId: '111', tenPage: 'A', sanPham: [mucSp('SP01')] }) });
  const d = await sp.manSanPham(bc());
  assert.equal(d.dem.tongSanPham, 2);
  assert.ok(!JSON.stringify(d).includes('BẪY'), 'màn đọc nhầm bảng `san_pham` của v3');
});

test('①c · màn PHẢI khai nó đọc từ đâu, và khai luôn nó KHÔNG đọc từ đâu', async () => {
  dung({ danhSach: async () => [mucDs('111', 1)] });
  const d = await sp.manSanPham(bc());
  assert.ok(d.nguon, 'người ta sẽ hỏi «bảng san_pham rỗng mà sao có số» — phải trả lời sẵn');
  assert.match(d.nguon.ten, /bot|Sheet/i);
  assert.match(d.nguon.khongPhai, /san_pham/);
  assert.ok(d.nguon.viSao.length > 60);
});

/* ═══════════ ② LỖ MỤC 12: SẢN PHẨM KHÔNG CÓ TÊN ═══════════ */

test('②a · sản phẩm thiếu tên được ĐÁNH DẤU, và KHÔNG bị bịa tên', async () => {
  dung({
    danhSach: async () => [mucDs('111', 2)],
    motPage: async () => ({ pageId: '111', tenPage: 'Page A', sanPham: [mucSp('SP01'), mucSp('SP02', { ten: 'Kem dưỡng' })] }),
  });
  const d = await sp.sanPhamCuaMotPage(bc(), '111');
  const trong = d.sanPham.find((s) => s.ma === 'SP01');
  const co = d.sanPham.find((s) => s.ma === 'SP02');
  assert.equal(trong.thieuTen, true);
  assert.equal(co.thieuTen, false);
  assert.equal(d.dem.thieuTen, 1);
  // Chỗ hiện thay PHẢI trông như một chỗ trống, không như một cái tên.
  assert.match(trong.goiLa, /chưa có tên/i);
  assert.ok(!/Page A/.test(trong.goiLa), 'lấy tên page làm tên sản phẩm là BỊA');
  assert.equal(co.goiLa, 'Kem dưỡng');
});

test('②b · giá, tiền tệ, ảnh vẫn đi ra đủ dù thiếu tên', async () => {
  dung({
    danhSach: async () => [mucDs('111', 1)],
    motPage: async () => ({ pageId: '111', tenPage: 'A', sanPham: [mucSp('SP01', {
      bacGia: [{ nhan: 'Mua 1', gia: 109 }, { nhan: 'Combo 2', gia: 159 }],
      anh: [{ duong: 'https://x/1.jpg', nhan: 'Ảnh' }, { duong: 'https://x/2.jpg', nhan: '' }],
    })] }),
  });
  const d = await sp.sanPhamCuaMotPage(bc(), '111');
  const s = d.sanPham[0];
  assert.equal(s.soBac, 2);
  assert.equal(s.soAnh, 2);
  assert.equal(s.tienTe, 'SAR');
  assert.deepEqual(d.dem.tienTe, ['SAR']);
  assert.equal(d.dem.tongAnh, 2);
});

/* ═══════════ ③ TỒN KHO: KHÔNG CÓ NGUỒN THÌ ĐỪNG HIỆN 0 ═══════════ */

test('③ · tồn kho khai là CHƯA CÓ NGUỒN, và nói rõ vì sao không hiện 0', async () => {
  dung({ danhSach: async () => [mucDs('111', 1)] });
  const d = await sp.manSanPham(bc());
  assert.equal(d.tonKho.co, false);
  assert.equal(d.tonKho.vi, sp.VI_RONG.CHUA_CO_NGUON);
  // Nghiệm thu đòi «hết hàng thì tự tắt bot» — chưa làm được thì phải nói ra, không im.
  assert.match(d.tonKho.diTiep, /hết hàng/i);
  assert.match(d.tonKho.diTiep, /0 nghĩa là hết hàng/i, 'phải nói RÕ vì sao để trống thay vì hiện 0');
});

/* ═══════════ ④ TEAM ═══════════ */

test('④a · cầu trả TOÀN HỆ, màn chỉ trả page của team mình', async () => {
  dung({ danhSach: async () => [mucDs('111', 3), mucDs('222', 1), mucDs('999', 9, { ten: 'CỦA TEAM KHÁC' })] });
  const d = await sp.manSanPham(bc());
  assert.deepEqual(d.page.map((p) => p.pageId).sort(), ['111', '222']);
  assert.ok(!JSON.stringify(d).includes('999'), 'page team khác lọt qua dây mạng');
  assert.equal(d.dem.tongSanPham, 4, 'không được cộng 9 sản phẩm của team khác');
});

test('④b · xem chi tiết page của team KHÁC → 404, không phải 403', async () => {
  dung({ danhSach: async () => [], motPage: async () => ({ pageId: '999', tenPage: 'x', sanPham: [] }) });
  await assert.rejects(() => sp.sanPhamCuaMotPage(bc(), '999'), (e) => {
    assert.equal(e.status, 404, '403 xác nhận page đó có thật ở team khác');
    assert.equal(e.ma, 'khong_thay');
    return true;
  });
});

/* ═══════════ ⑤ CẦU HỎNG ≠ KHÔNG CÓ SẢN PHẨM ═══════════ */

test('⑤a · cầu hỏng thì NÉM, không trả danh sách rỗng', async () => {
  dung({ danhSach: async () => { throw new Error('bot không chạy'); } });
  await assert.rejects(() => sp.manSanPham(bc()), (e) => {
    assert.equal(e.ma, 'cau_hong');
    assert.equal(e.status, 502);
    assert.match(e.message, /chưa có sản phẩm nào/i, 'phải nói rõ vì sao không trả rỗng');
    return true;
  });
});

test('⑤b · chưa nối cầu → nói RÕ là chưa cài đặt, kèm biến cần đặt', async () => {
  dung({});
  const d = await sp.manSanPham(bc());
  assert.equal(d.trong.vi, sp.VI_RONG.CHUA_NAP);
  assert.match(d.trong.diTiep, /V3_BOT_V1_GOC|ADMIN_USER/);
});

test('⑤c · team không page nào có sản phẩm → chỉ sang Cửa kiểm, không bỏ lửng', async () => {
  dung({ danhSach: async () => [] });
  const d = await sp.manSanPham(bc());
  assert.equal(d.page.length, 0);
  assert.ok(d.trong, 'rỗng thì phải nói vì sao');
  assert.match(d.trong.diTiep, /Cửa kiểm/i);
});
