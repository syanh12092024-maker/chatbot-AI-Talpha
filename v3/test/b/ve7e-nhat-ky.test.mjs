// PHIẾU VE7e · «CÀI ĐẶT › NHẬT KÝ» THEO BẢN VẼ 4 — «Ghi cả việc người làm lẫn việc máy làm. Không ai sửa hay xoá được.» Mỗi dòng
// một CÂU đọc được: lúc · ai · việc · đối tượng bằng TÊN. Tên lấy theo thứ tự, KHÔNG đoán: ① bảng sống của team · ② ảnh chụp
// trong chính dòng nhật ký (`sau.ten`/`truoc.ten` — đối tượng đã xoá) · ③ «Loại #id». Dòng máy nói việc gì («máy · cửa POS»),
// việc lạ hiện nguyên mã. Máy chủ thật (vai-b) + bộ đọc nhật ký THẬT (`audit#docNhatKy`) trên cổng CSDL giả; trang chạy THẬT.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const nk = await import('../../src/ui/nhat-ky/kho-nhat-ky.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const luc = (phut) => new Date(Date.parse('2026-10-01T08:00:00Z') - phut * 60000).toISOString();
const DONG = [
  { id: 'n1', team_id: 't1', xay_ra_luc: luc(1), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'tao_san_pham_goc',
    doi_tuong: 'san_pham_goc', doi_tuong_id: 'g1', ghi_chu: 'tạo sản phẩm gốc', sau: { ma: 'KEM' } },
  // sản phẩm ĐÃ XOÁ — bảng không còn, tên lấy từ ảnh chụp trong dòng
  { id: 'n2', team_id: 't1', xay_ra_luc: luc(2), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'bo_san_pham_goc',
    doi_tuong: 'san_pham_goc', doi_tuong_id: 'g9', ghi_chu: 'bỏ sản phẩm gốc', truoc: { ten: 'Trà cũ', ma: 'TRA' } },
  { id: 'n3', team_id: 't1', xay_ra_luc: luc(3), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'v3_sua_anh_san_pham',
    doi_tuong: 'anh_san_pham', doi_tuong_id: 's1', ghi_chu: '' , sau: { soAnh: 2 } },
  { id: 'n4', team_id: 't1', xay_ra_luc: luc(4), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'bat_tat_ky_nang',
    doi_tuong: 'ky_nang', doi_tuong_id: 'k1', ghi_chu: 'tắt kỹ năng' },
  // không còn bảng, không ảnh chụp ⇒ «Page #p404» — không đoán
  { id: 'n5', team_id: 't1', xay_ra_luc: luc(5), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'sua',
    doi_tuong: 'page', doi_tuong_id: 'p404', ghi_chu: 'sửa page' },
  // id có ở TEAM KHÁC — đọc qua cổng của team t1 thì không thấy ⇒ không được mượn tên của team khác
  { id: 'n6', team_id: 't1', xay_ra_luc: luc(6), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'tao_san_pham_goc',
    doi_tuong: 'san_pham_goc', doi_tuong_id: 'gT2', ghi_chu: 'tạo' },
  { id: 'm1', team_id: 't1', xay_ra_luc: luc(7), tac_nhan: 'may:cua-pos', nguoi_dung_id: null, hanh_dong: 'pos_doc_danh_muc_refresh',
    doi_tuong: 'san_pham', doi_tuong_id: 's1', ghi_chu: 'kéo lại danh mục' },
  { id: 'm2', team_id: 't1', xay_ra_luc: luc(8), tac_nhan: 'may:nap-khoi-chung', nguoi_dung_id: null, hanh_dong: 'v3_sua_khoi_dung_chung',
    doi_tuong: 'khoi_dung_chung', doi_tuong_id: '1', ghi_chu: 'nạp' },
  { id: 'm3', team_id: 't1', xay_ra_luc: luc(9), tac_nhan: 'may', nguoi_dung_id: null, hanh_dong: 'them', doi_tuong: 'don_hang', doi_tuong_id: 'd1', ghi_chu: 'thêm đơn' },
  { id: 'n7', team_id: 't1', xay_ra_luc: luc(0.5), tac_nhan: 'nguoi:qt@talpha.vn', nguoi_dung_id: 'u1', hanh_dong: 'tao_nguoi_dung',
    doi_tuong: 'nguoi_dung', doi_tuong_id: 'u2', ghi_chu: 'tạo người dùng' },
  { id: 'x1', team_id: 't2', xay_ra_luc: luc(1), tac_nhan: 'nguoi:khac@t.vn', nguoi_dung_id: 'u9', hanh_dong: 'sua', doi_tuong: 'page', doi_tuong_id: 'p1', ghi_chu: 'team khác' },
];

async function dungThu() {
  const mk = await bam('matkhau1');
  const { kho, taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ team', hoat_dong: true },
      { id: 'u2', email: 'binh@talpha.vn', mat_khau_hash: mk, ten: 'Bình', hoat_dong: true }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }],
    san_pham_goc: [{ id: 'g1', team_id: 't1', ten: 'Kem Kreain' }, { id: 'gT2', team_id: 't2', ten: 'Của team khác' }],
    san_pham: [{ id: 's1', team_id: 't1', ma: '1:1', ten: 'Gel lô hội' }],
    ky_nang: [{ id: 'k1', team_id: 't1', ten: 'Chốt đơn nhanh' }],
    page: [{ id: 'p1', team_id: 't2', page_id: '111', ten: 'Page của team khác' }],
    nhat_ky: DONG,
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@talpha.vn', matKhau: 'matkhau1' }) });
  return { goc, sv, cookie: dn.headers.get('set-cookie').split(';')[0], kho, taoTruyVan };
}
const moMan = (o) => moTrang('nhat-ky/trang/nhat-ky.html', { goc: o.goc, cookie: o.cookie, duong: '/nhat-ky' });
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();
const dong = (m, id) => { const r = m.$(`tr[data-dong-nk="${id}"]`); assert.ok(r, `thiếu dòng ${id}`); return r.querySelectorAll('td').map(chu); };

test('E1 · đầu trang theo bản vẽ: «Nhật ký» + câu «ghi cả việc người lẫn việc máy, không ai sửa hay xoá được»; bảng ba cột Lúc · Ai · Việc', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(chu(m.$('h1')), 'Nhật ký');
  assert.equal(chu(m.$('header .sub')), 'Ghi cả việc người làm lẫn việc máy làm. Không ai sửa hay xoá được.');
  assert.deepEqual(m.$('#ds').querySelectorAll('th').map(chu), ['Lúc', 'Ai', 'Việc', 'Chi tiết'], 'cột cuối: nhãn cho trình đọc màn hình');
  // mặc định làn NGƯỜI (dòng máy chôn dòng người — prod 01/10: 472/500 dòng mới nhất là máy)
  assert.ok(m.$('tr[data-dong-nk="n1"]'));
  assert.equal(m.$('tr[data-dong-nk="m1"]'), null);
});

test('E2 · đối tượng bằng TÊN: bảng sống → ảnh chụp trong dòng (đã xoá) → «Loại #id»; không mượn tên của team khác', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.match(dong(m, 'n1')[2], /· Sản phẩm gốc · Kem Kreain/);
  assert.doesNotMatch(dong(m, 'n1')[2], /#g1/, 'đã ra tên thì thôi in #id');
  assert.match(dong(m, 'n2')[2], /· Sản phẩm gốc · Trà cũ/, 'đối tượng đã xoá: tên chụp trong dòng');
  assert.match(dong(m, 'n3')[2], /· Ảnh sản phẩm · Gel lô hội/);
  assert.match(dong(m, 'n4')[2], /· Kỹ năng · Chốt đơn nhanh/);
  assert.match(dong(m, 'n5')[2], /· Page #p404/, 'không tên, không ảnh chụp ⇒ #id, không đoán');
  assert.match(dong(m, 'n7')[2], /· Người dùng · binh@talpha\.vn/, 'người dùng làm đối tượng ra tên, không «Người dùng #u2»');
  assert.match(dong(m, 'n6')[2], /· Sản phẩm gốc #gT2/);
  assert.doesNotMatch(chu(m.$('#ds')), /Của team khác|team khác/, 'lọt tên / dòng của team khác');
  assert.equal(dong(m, 'n1')[1], 'qt@talpha.vn');
  // giờ theo bản vẽ «28/09 15:04» (máy người xem; năm chỉ hiện khi khác năm nay)
  const d1 = new Date(Date.parse(luc(1)));
  const h = (n) => String(n).padStart(2, '0');
  const nam = d1.getFullYear() === new Date().getFullYear() ? '' : `/${d1.getFullYear()}`;
  assert.equal(dong(m, 'n1')[0], `${h(d1.getDate())}/${h(d1.getMonth() + 1)}${nam} ${h(d1.getHours())}:${h(d1.getMinutes())}`);
  assert.match(dong(m, 'n1')[2], /tạo sản phẩm gốc/, 'ghi chú ngay dưới câu');
});

test('E3 · dòng MÁY nói việc gì: «máy · cửa POS» · việc lạ hiện nguyên mã · `may` trơn chỉ «máy»', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  await m.document.querySelectorAll('[data-lan]').find((b) => b.dataset.lan === 'may').click();
  await m.cho();
  assert.equal(dong(m, 'm1')[1], 'máy cửa POS');
  assert.match(dong(m, 'm1')[2], /· Sản phẩm · Gel lô hội/);
  assert.equal(dong(m, 'm2')[1], 'máy nap-khoi-chung', 'việc lạ: không đoán nghĩa');
  assert.match(dong(m, 'm2')[2], /· Chính sách · FAQ · Phản đối #1/);
  assert.equal(dong(m, 'm3')[1], 'máy');
});

test('E4 · tra tên hỏng (cổng ném) ⇒ nhật ký VẪN hiện, rơi về ảnh chụp / #id — không chết vì một cái nhãn', async () => {
  const { taoTruyVan } = dungCongGia({ nhat_ky: DONG });
  const cu = nk.datTaoTruyVan(() => ({ chon: async () => { throw new Error('bảng đang khoá'); } }));
  nk.datDocNhatKy(async (bc, bo) => { const db = taoTruyVan(bc); return { dong: await db.chon('nhat_ky', {}, { sapXep: 'xay_ra_luc', giamDan: true, gioiHan: bo.gioiHan }), tong: DONG.length }; });
  try {
    const d = await nk.manNhatKy(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt', teamId: 't1', vai: [VAI.QUAN_TRI] }));
    const n1 = d.dong.find((x) => x.id === 'n1');
    assert.deepEqual([n1.doiTuong, n1.tenDoiTuong, n1.doiTuongId], ['Sản phẩm gốc', null, 'g1']);
    const n2 = d.dong.find((x) => x.id === 'n2');
    assert.equal(n2.tenDoiTuong, 'Trà cũ');
  } finally { nk.datTaoTruyVan(cu); nk.datDocNhatKy(null); }
});

test('E5 · ngăn «Xem» nói đối tượng bằng tên + ai/máy; trạng thái trước/sau vẫn đủ', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  await m.$('tr[data-dong-nk="n2"] [data-dong]').click();
  assert.equal(m.$('#ngan').open, true);
  assert.match(chu(m.$('#ngan-than')), /Đối tượng\s*Sản phẩm gốc · Trà cũ\s*Ghi chú/, 'đã ra tên thì ngăn cũng thôi in #id');
  assert.match(chu(m.$('#ngan-than')), /"ten": "Trà cũ"/);
  assert.match(chu(m.$('#ngan-phu')), /^qt@talpha\.vn · /);
});

test('E6 · mã tầng A ghi thẳng (`sua`/`them`/`doc`, lượt kéo POS…) ra CHỮ trên màn — nhưng KHÔNG thành mã v3 được ghi', async () => {
  const { hopLeHanhDong } = await import('../../src/audit/hanh-dong.js');
  nk.datDocNhatKy(async () => ({ dong: [
    { id: 'a1', team_id: 't1', xay_ra_luc: luc(1), tac_nhan: 'may:tang-truy-van', hanh_dong: 'sua', doi_tuong: 'don_hang', doi_tuong_id: '' },
    { id: 'a2', team_id: 't1', xay_ra_luc: luc(2), tac_nhan: 'may:cua-pos', hanh_dong: 'pos_doc_danh_muc_refresh', doi_tuong: 'san_pham', doi_tuong_id: '' },
  ], tong: 2 }));
  try {
    const d = await nk.manNhatKy(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt', teamId: 't1', vai: [VAI.QUAN_TRI] }), { lan: nk.LAN.MAY });
    assert.deepEqual(d.dong.map((x) => [x.chuHanhDong, x.viecMay]),
      [['Sửa dòng (việc nền)', 'tầng dữ liệu'], ['Cập nhật món từ lượt kéo POS', 'cửa POS']]);
  } finally { nk.datDocNhatKy(null); }
  for (const ma of ['sua', 'them', 'doc', 'pos_doc_danh_muc_refresh']) assert.equal(hopLeHanhDong(ma), false, `v3 được ghi mã tầng A «${ma}»`);
});
