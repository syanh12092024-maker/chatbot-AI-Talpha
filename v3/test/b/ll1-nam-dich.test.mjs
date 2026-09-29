// PHIẾU LL1 — KHUNG NĂM ĐÍCH (CR-28-09c · `docs/v3/03-MAN-HINH.md` bảng «Màn cũ đi đâu»).
//
// LL1 chỉ xếp lại CHỖ NGỒI của màn trên menu: Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt.
// Ba điều phiếu hứa và bộ ca này canh bằng DANH SÁCH chụp trước khi sửa (29/09, `menuCua`
// chạy trên mã `20b9bdb`), không bằng số đếm:
//   ① không đường nào đổi hay mất — liên kết cũ phải còn mở;
//   ② mỗi vai thấy đúng tập màn như trước, trừ MỘT thay đổi có chủ ý (N5);
//   ③ mỗi vai đăng nhập xong đặt chân đúng chỗ cũ — sale vào thẳng Hộp thư.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const GOC_UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui');

// ── Bản chụp TRƯỚC LL1 (mã `20b9bdb`) ─────────────────────────────────────────────────
const DUONG_TRUOC = ['/ai-de-xuat', '/ban-hoi-thoai', '/bao-cao', '/bo-luat', '/cai-dat-team', '/cau-hinh-team',
  '/chi-phi', '/dieu-phoi', '/hieu-qua', '/ho-so-khach', '/ket-noi', '/kich-ban', '/ky-nang', '/len-chay',
  '/lop-0-dong', '/model-ai', '/nguon-khach', '/nhat-ky', '/page', '/page-bot', '/prompt-page', '/rui-ro-hoan',
  '/san-pham', '/suc-khoe', '/thu-vien-anh', '/trang-chu', '/van-hanh-v3'];
const HIEN_TRUOC = {
  QUAN_TRI: ['/ban-hoi-thoai', '/bao-cao', '/bo-luat', '/cai-dat-team', '/cau-hinh-team', '/chi-phi', '/dieu-phoi',
    '/ket-noi', '/kich-ban', '/ky-nang', '/lop-0-dong', '/model-ai', '/nhat-ky', '/page-bot', '/suc-khoe',
    '/trang-chu', '/van-hanh-v3'],
  MARKETER: ['/bao-cao', '/cai-dat-team', '/chi-phi', '/kich-ban', '/ky-nang', '/lop-0-dong', '/san-pham',
    '/suc-khoe', '/trang-chu'],
  SALE: ['/ban-hoi-thoai', '/dieu-phoi'],
  QUAN_LY: ['/bao-cao', '/bo-luat', '/cai-dat-team', '/cau-hinh-team', '/chi-phi', '/kich-ban', '/ky-nang',
    '/lop-0-dong', '/model-ai', '/nhat-ky', '/page-bot', '/suc-khoe', '/trang-chu', '/van-hanh-v3'],
  DUYET_KICH_BAN: ['/bo-luat', '/kich-ban', '/suc-khoe', '/trang-chu'],
};
const DAU_TRUOC = { QUAN_TRI: '/trang-chu', MARKETER: '/trang-chu', SALE: '/ban-hoi-thoai',
  QUAN_LY: '/trang-chu', DUYET_KICH_BAN: '/trang-chu' };

// ── Đích mới của từng đường — đúng cột «Nhà mới» của `03-MAN-HINH.md` ───────────────────
const DICH = {
  'hop-thu': ['/trang-chu', '/ban-hoi-thoai', '/dieu-phoi', '/van-hanh-v3', '/ho-so-khach'],
  'san-pham': ['/san-pham', '/ky-nang'],
  page: ['/page-bot', '/page', '/kich-ban', '/bo-luat', '/lop-0-dong', '/len-chay', '/prompt-page',
    '/thu-vien-anh', '/ai-de-xuat', '/hieu-qua'],
  'so-lieu': ['/bao-cao', '/chi-phi', '/nguon-khach', '/rui-ro-hoan'],
  'cai-dat': ['/cai-dat-team', '/cau-hinh-team', '/ket-noi', '/model-ai', '/suc-khoe', '/nhat-ky'],
};

// «Tới được từ menu» = trên thanh bên, HOẶC là tab của một cụm (LL3 · 29/09 — màn trong cụm rời thanh bên
// nhưng khung vẽ nó thành tab ngay dưới đầu trang). Luật LL1 canh là không màn nào MẤT đường vào.
const hienCua = (v) => mh.menuCua([v]).flatMap((n) => n.man.filter((m) => !m.an || m.trongCum).map((m) => m.duong)).sort();

test('N1 · năm đích đúng thứ tự, đúng tên — mục dự trù giữ nguyên, rỗng thì tự ẩn', () => {
  assert.deepEqual(mh.NHOM.map((n) => n.ma), ['hop-thu', 'san-pham', 'page', 'so-lieu', 'cai-dat', 'nhan-cho-khach']);
  assert.deepEqual(mh.NHOM.slice(0, 5).map((n) => n.ten), ['Hộp thư', 'Sản phẩm', 'Page', 'Số liệu', 'Cài đặt']);
  assert.deepEqual(mh.menuCua([VAI.QUAN_TRI]).map((n) => n.ma), ['hop-thu', 'san-pham', 'page', 'so-lieu', 'cai-dat']);
});

test('N2 · biểu tượng của mọi đích CÓ THẬT trong bộ `ui.js` — thiếu là vẽ ra ô trống, không ai báo', () => {
  const ui = readFileSync(path.join(GOC_UI, 'chung/ui.js'), 'utf8');
  const bo = Object.keys(JSON.parse(ui.match(/BIEU_TUONG = Object\.freeze\((\{.*?\})\);/s)[1]));
  const thieu = mh.NHOM.filter((n) => !bo.includes(n.bieuTuong)).map((n) => `${n.ten}: ${n.bieuTuong}`);
  assert.deepEqual(thieu, [], `biểu tượng không có trong bộ: ${thieu.join(', ')}`);
});

test('N3 · KHÔNG đường nào đổi hay mất — so DANH SÁCH với bản chụp trước LL1', () => {
  assert.deepEqual(mh.MAN.map((m) => m.duong).sort(), DUONG_TRUOC);
});

test('N4 · mỗi màn ngồi đúng đích của `03-MAN-HINH.md`', () => {
  const lech = [];
  for (const [nhom, ds] of Object.entries(DICH)) {
    for (const d of ds) {
      const m = mh.MAN.find((x) => x.duong === d);
      if (!m) lech.push(`${d}: không có trong sổ`);
      else if (m.nhom !== nhom) lech.push(`${d}: đang ở «${m.nhom}», phải ở «${nhom}»`);
    }
  }
  assert.deepEqual(lech, []);
  assert.deepEqual(Object.values(DICH).flat().sort(), DUONG_TRUOC, 'bảng đích phải phủ ĐỦ mọi đường');
});

test('N5 · mỗi vai thấy đúng tập màn như trước — trừ «Sản phẩm & kho» hiện lại ở đích Sản phẩm', () => {
  // Thay đổi có chủ ý DUY NHẤT: trước LL1, «Sản phẩm & kho» ẩn với ai mở được trang một page
  // (cờ `moTuManKhac`, 28/09) vì mỗi page đã có tab sản phẩm. Nay Sản phẩm là một ĐÍCH — giữ
  // cờ ấy thì đích Sản phẩm của quản trị chỉ còn «Kỹ năng theo sản phẩm», tức bấm vào đích
  // lõi mà không thấy sản phẩm nào.
  // Mỗi màn THÊM VÀO tập tới-được phải khai tên phiếu đã thêm nó — không thêm lặng lẽ.
  const THEM_CO_CHU_Y = { '/san-pham': 'LL1', '/nguon-khach': 'LL5 (có dữ liệu)', '/rui-ro-hoan': 'LL5 (có dữ liệu)' };
  for (const [ten, truoc] of Object.entries(HIEN_TRUOC)) {
    const v = VAI[ten];
    const mongDoi = new Set(truoc);
    for (const d of Object.keys(THEM_CO_CHU_Y)) if (mh.MAN.find((m) => m.duong === d).vai.includes(v)) mongDoi.add(d);
    assert.deepEqual(hienCua(v), [...mongDoi].sort(), `vai ${ten}`);
  }
});

test('N6 · đích Sản phẩm mở bằng màn sản phẩm', () => {
  for (const v of [VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]) {
    const dich = mh.menuCua([v]).find((n) => n.ma === 'san-pham');
    assert.ok(dich, `vai ${v} phải thấy đích Sản phẩm`);
    assert.equal(dich.man.filter((m) => !m.an)[0].duong, '/san-pham', `vai ${v}`);
  }
});

test('N7 · mỗi vai đặt chân đúng chỗ cũ sau đăng nhập — sale vào thẳng Hộp thư', () => {
  // `vai-b.js#duongSauKhiVao` = màn ĐẦU TIÊN trong gói menu của vai. Xếp lại đích là đổi
  // chỗ đặt chân nếu vô ý — nên so với bản chụp.
  for (const [ten, dau] of Object.entries(DAU_TRUOC)) {
    assert.equal(mh.menuCua([VAI[ten]])[0].man[0].duong, dau, `vai ${ten}`);
  }
  const sale = mh.menuCua([VAI.SALE]);
  assert.deepEqual(sale.map((n) => n.ma), ['hop-thu']);
  assert.deepEqual(sale[0].man.filter((m) => !m.an).map((m) => m.ten), ['Hộp thư', 'Việc đang chờ']);
});
