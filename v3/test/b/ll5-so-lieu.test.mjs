// PHIẾU LL5 · SỐ LIỆU — MỘT dòng thanh bên, bốn tab (Tổng quan · Chi phí AI · Nguồn khách · Rủi ro hoàn),
// và hai màn thôi ẩn thì PHẢI nói con số tính tới ngày nào (prod 29/09: lát nạp 28/08, chưa job kéo đơn).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI, taoBoiCanh } = await import('../../src/auth/boi-canh.js');
const { KhoGia, taoTruyVanGia } = await import('../../testkit/db-gia.js');
const ruiRo = await import('../../src/ui/rui-ro-hoan/kho-rui-ro.js');
const nguon = await import('../../src/ui/nguon-khach/kho-nguon.js');

const soLieu = (v) => mh.menuCua([v]).find((n) => n.ma === 'so-lieu');

test('S1 · Số liệu của quản trị: MỘT dòng thanh bên, bốn tab theo thứ tự bản vẽ', () => {
  const n = soLieu(VAI.QUAN_TRI);
  assert.deepEqual(n.man.filter((m) => !m.an).map((m) => m.tenMenu || m.ten), ['Số liệu']);
  assert.deepEqual(n.man.filter((m) => m.cum === 'so-lieu' && (!m.an || m.trongCum)).map((m) => m.nhanCum),
    // VE6c · 30/09 (bản vẽ 3c + bản đồ phủ màn «Nguồn khách · Rủi ro hoàn → Số liệu › Khách · Gộp»): cụm còn BA tab; Rủi ro hoàn mở bằng «Xem đủ →» ở tab Khách và Tổng quan.
    ['Tổng quan', 'Chi phí AI', 'Khách']);
});

test('S2 · marketer không có quyền Rủi ro hoàn ⇒ không có tab đó (không tab nào dẫn tới 403)', () => {
  const tab = soLieu(VAI.MARKETER).man.filter((m) => m.cum === 'so-lieu' && (!m.an || m.trongCum)).map((m) => m.nhanCum);
  // VE6c · 30/09 (bản vẽ 3c + bản đồ phủ màn «Nguồn khách · Rủi ro hoàn → Số liệu › Khách · Gộp»): cụm còn BA tab; Rủi ro hoàn mở bằng «Xem đủ →» ở tab Khách và Tổng quan.
  assert.deepEqual(tab, ['Tổng quan', 'Chi phí AI', 'Khách']);
});

const bc = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });
function dung() {
  const kho = new KhoGia({
    khach: [
      { id: 'k1', team_id: 't1', tang_hoan: 'tot', so_don_ket: 3, so_don_hoan: 0, cham_hoan_luc: Date.parse('2026-08-28T03:00:00Z') },
      { id: 'k2', team_id: 't1', tang_hoan: null, cham_hoan_luc: null },
      { id: 'k9', team_id: 't2', tang_hoan: 'tot', so_don_ket: 3, cham_hoan_luc: Date.parse('2026-09-20T00:00:00Z') },
    ],
    don_hang: [
      { id: 'd1', team_id: 't1', nguon: 'messenger', tao_luc: Date.parse('2026-08-27T22:00:00Z') },
      { id: 'd9', team_id: 't2', nguon: 'messenger', tao_luc: Date.parse('2026-09-25T00:00:00Z') },
    ],
  });
  ruiRo.datTaoTruyVan((b) => taoTruyVanGia(kho, b));
  ruiRo.datDocPhanBo(null);
  nguon.datTaoTruyVan((b) => taoTruyVanGia(kho, b));
}

test('S3 · Rủi ro hoàn (đường đọc cột) nói lần chấm cuối — của CHÍNH team, không lẫn team khác', async () => {
  dung();
  const d = await ruiRo.manRuiRo(bc);
  assert.equal(d.tuoi.chamLuc, Date.parse('2026-08-28T03:00:00Z'));
});

test('S4 · Nguồn khách nói đơn mới nhất trong hệ — của CHÍNH team', async () => {
  dung();
  const d = await nguon.manNguon(bc);
  assert.equal(d.donMoiNhat, Date.parse('2026-08-27T22:00:00Z'));
});

test('S5 · hai trang IN dòng tuổi dưới đầu trang (đọc mã trang — không in thì tầng đọc nói cũng vô ích)', async () => {
  const fs = await import('node:fs');
  const r = fs.readFileSync(new URL('../../src/ui/rui-ro-hoan/trang/rui-ro-hoan.html', import.meta.url), 'utf8');
  const n = fs.readFileSync(new URL('../../src/ui/nguon-khach/trang/nguon-khach.html', import.meta.url), 'utf8');
  assert.match(r, /<span class="sub" id="tuoi"><\/span>/); assert.match(r, /\$\('#tuoi'\)\.textContent = .*t\.chamLuc/s);
  assert.match(n, /<span class="sub" id="tuoi"><\/span>/); assert.match(n, /\$\('#tuoi'\)\.textContent = d\.donMoiNhat/);
});
