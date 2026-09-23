// MÀN «BẮT ĐẦU» — lối vào của người mới, nên hỏng ở đây là hỏng ở chỗ đắt nhất.
//
// Bài ① là bài đã trả giá thật: màn gửi MÃ FACEBOOK vào cửa `POST /api/page-bot/:id/bot`,
// mà cửa ấy tra `page.id` (khoá dòng CSDL v3 — `ui/page-bot/kho-page.js#motPage`). Hai mã
// khác hẳn nhau, nên nút «Bật bot» — việc DUY NHẤT màn này có để làm — trả 404. Người mới
// không có cách nào đoán ra vì sao, vì cả bốn điều kiện đều đã tick xanh.
//
// Nên bài này khoá HAI vế lại với nhau: tầng dữ liệu phải trả `id`, và trang phải dùng đúng
// `p.id` khi gọi cửa. Chỉ kiểm một vế thì vế kia trôi lại lần sau.
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
const ss = await import('../../src/ui/san-sang/kho-san-sang.js');
const bd = await import('../../src/ui/bat-dau/kho-bat-dau.js');

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = path.join(THU_MUC, '../../src/ui/bat-dau/trang/bat-dau.html');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '1220547807799752', ten: 'Minty', bot_ai_bat: true, marketer: 'lan' },
  { id: 'p2', team_id: 't1', page_id: '1199704066568106', ten: 'Active KSA', bot_ai_bat: false, marketer: '' },
];

const rd = (pageId, o = {}) => ({
  pageId, readiness: 'READY', aiAllowed: true, blockers: [], warnings: [],
  missing: [], aiEnabled: false, tokens: 100, name: 'x', ...o,
});

function dung(pages, ds) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    page: pages,
  });
  ss.datTaoTruyVan(taoTruyVan);
  ss.datDocSanSang(async () => ({ pages: ds, toanHe: { chan: 0, nhac: 0, san: 0, tong: ds.length } }));
}

const bc = () => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI],
});

test('① mỗi page mang CẢ HAI mã: `id` của CSDL và `pageId` của Facebook, không lẫn nhau', async () => {
  dung(PAGE, [rd('1220547807799752', { aiEnabled: true }), rd('1199704066568106')]);
  const d = await bd.manBatDau(bc());

  assert.equal(d.page.length, 2);
  for (const p of d.page) {
    const goc = PAGE.find((x) => x.page_id === p.pageId);
    assert.ok(goc, `page ${p.pageId} không có trong hạt giống`);
    assert.equal(p.id, goc.id, 'thiếu `id` thì nút «Bật bot» gửi nhầm mã và ăn 404');
    assert.notEqual(p.id, p.pageId, 'hai mã phải tách nhau — trộn một lần nữa là lặp lại lỗi cũ');
  }
});

test('② trang gọi cửa bật bot bằng `p.id`, KHÔNG phải `p.pageId`', () => {
  const html = readFileSync(TRANG, 'utf8');
  const goi = html.match(/\/api\/page-bot\/\$\{encodeURIComponent\(([^)]+)\)\}\/bot/);
  assert.ok(goi, 'không tìm thấy lượt gọi cửa bật bot trong trang — đổi hình thì sửa bài này');
  assert.equal(goi[1].trim(), 'p.id',
    'cửa `POST /api/page-bot/:id/bot` tra `page.id`; gửi mã Facebook vào đó là 404');
});
