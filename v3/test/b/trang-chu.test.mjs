// MÀN «TRANG CHỦ» (G2-F1) — màn người ta mở ĐẦU TIÊN.
//
// Bài học 24/08 (chủ dự án nhìn một bảng rỗng rồi tưởng màn hỏng) đặt nặng nhất vào đây.
// Phần lớn bài dưới canh đúng một chuyện: **một ô rỗng phải nói được VÌ SAO nó rỗng**, và
// ba lý do phải ra ba câu khác nhau — chứ không cùng là chữ «0».
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const tc = await import('../../src/ui/trang-chu/kho-trang-chu.js');

const TEAM = [
  { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
  { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
];

const rd = (pageId, o = {}) => ({
  pageId, readiness: 'READY', aiAllowed: true, blockers: [], warnings: [], aiEnabled: false, ...o,
});
const CAU = (pages) => async () => ({ pages, toanHe: { tong: pages.length } });

function dung(hat = {}, cau) {
  const { taoTruyVan } = dungCongGia({ team: TEAM, ...hat });
  tc.datTaoTruyVan(taoTruyVan);
  tc.datDocSanSang(cau === undefined ? CAU([]) : cau);
}

const bc = (vai, team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: Array.isArray(vai) ? vai : [vai],
});

const oCua = (d, ma) => d.viec.find((v) => v.ma === ma) || null;

/* ═══════════════ ① BA TRẠNG THÁI RỖNG PHẢI KHÁC NHAU ═══════════════ */

test('①a · «xong» — có nguồn, đếm được, đúng là 0. Đây là tin TỐT', async () => {
  dung({
    kich_ban: [{ id: 'k1', team_id: 't1', trang_thai: 'LIVE' }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: 'lan' }],
  }, CAU([rd('111')]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  const o = oCua(d, 'kich_ban_cho_duyet');
  assert.equal(o.so, 0);
  assert.equal(o.viRong, tc.VI_RONG.XONG);
  assert.equal(o.diTiepRong ?? null, null, 'việc đã xong thì không cần chỉ đường đi tiếp');
});

test('①b · «chưa nạp» — bảng có nhưng chưa ai đổ dữ liệu vào', async () => {
  // Đúng cảnh đo được 25/08: `san_pham` = 0 dòng.
  dung({ san_pham: [], page: [] });
  const d = await tc.manTrangChu(bc(VAI.MARKETER));
  const o = oCua(d, 'san_pham_het_hang');
  assert.equal(o.viRong, tc.VI_RONG.CHUA_NAP);
  assert.notEqual(o.viRong, tc.VI_RONG.XONG, '0 dòng KHÔNG phải «không mặt hàng nào hết»');
  assert.match(o.noiRong, /KHÔNG có dòng nào/);
  assert.ok(o.diTiepRong && o.diTiepRong.length > 60, 'chưa nạp thì PHẢI chỉ đường đi tiếp');
  assert.match(o.diTiepRong, /chưa biết/i, 'phải nói rõ 0 ở đây nghĩa là «chưa biết»');
});

test('①c · ba mã lý do là ba chuỗi KHÁC nhau, không mã nào trùng', () => {
  const ds = Object.values(tc.VI_RONG);
  assert.equal(new Set(ds).size, ds.length);
  assert.equal(ds.length, 3);
});

/* ═══════════════ ② Ô DỄ NÓI DỐI NHẤT: HÀNG ĐỢI VIỆC ═══════════════ */

test('②a · `viec_can_xu_ly` rỗng MÀ có hội thoại HANDOFF → «CHƯA NẠP», không phải «hết việc»', async () => {
  // Cảnh THẬT trên máy chủ 25/08: viec_can_xu_ly = 0, hoi_thoai HANDOFF = 988.
  dung({
    viec_can_xu_ly: [],
    hoi_thoai: Array.from({ length: 5 }, (_, i) => ({ id: 'h' + i, team_id: 't1', trang_thai: 'HANDOFF' })),
    page: [],
  });
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  const o = oCua(d, 'viec_cho_nguoi');
  assert.equal(o.viRong, tc.VI_RONG.CHUA_NAP,
    'báo «0 việc» ở cảnh này là nói với sale rằng không có gì phải làm');
  assert.match(o.noiRong, /không thể cùng đúng/i);
  assert.equal(o.doiChung.handoff, 5, 'phải kèm con số đối chứng để kiểm lại được');
});

test('②b · `viec_can_xu_ly` rỗng và KHÔNG có HANDOFF nào → đúng là «hết việc»', async () => {
  dung({
    viec_can_xu_ly: [],
    hoi_thoai: [{ id: 'h1', team_id: 't1', trang_thai: 'GREET' }],
    page: [],
  });
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  const o = oCua(d, 'viec_cho_nguoi');
  assert.equal(o.viRong, tc.VI_RONG.XONG, 'không được báo động khi thật sự hết việc');
  assert.equal(o.diTiepRong, null);
});

/* ═══════════════ ③ CẦU HỎNG THÌ ĐỂ TRỐNG, KHÔNG RƠI VỀ 0 ═══════════════ */

test('③a · cầu cửa kiểm hỏng → hai ô để `null`, KHÔNG phải 0', async () => {
  dung({ page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'A' }] },
    async () => { throw new Error('bot không chạy'); });
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  for (const ma of ['page_bi_chan', 'page_kich_ban_mong']) {
    const o = oCua(d, ma);
    assert.equal(o.so, null, `${ma}: «0 page bị chặn» là tin mừng, và đây không phải tin mừng`);
    assert.equal(o.docDuoc, false);
    assert.match(o.noiRong, /bot không chạy/);
  }
  assert.equal(d.soChuaDocDuoc, 2, 'màn phải tự khai có mấy ô chưa đọc được');
});

test('③b · chưa nối cầu → cũng để `null` và chỉ đúng biến cần đặt', async () => {
  dung({ page: [] }, null);
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  const o = oCua(d, 'page_bi_chan');
  assert.equal(o.so, null);
  assert.match(o.diTiepRong, /V3_BOT_V1_GOC|ADMIN_USER/);
});

test('③c · cầu chạy được thì hai ô đếm ĐÚNG và chỉ trên page của team', async () => {
  dung({
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A' },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B' },
      { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC' },
    ],
  }, CAU([
    rd('111', { aiAllowed: false, blockers: [{ code: 'NO_TOKEN', detail: 'x' }] }),
    rd('222', { warnings: [{ code: 'THIN_SCRIPT', detail: 'y' }] }),
    // page team khác cũng bị chặn — không được cộng vào.
    rd('999', { aiAllowed: false, blockers: [{ code: 'NO_TOKEN', detail: 'z' }] }),
  ]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  assert.equal(oCua(d, 'page_bi_chan').so, 1, 'page của team khác lọt vào phép đếm');
  assert.equal(oCua(d, 'page_kich_ban_mong').so, 1);
  assert.equal(oCua(d, 'page_bi_chan').tong, 2);
});

/* ═══════════════ ④ LỌC THEO VAI — «ĐÚNG VIỆC CỦA MÌNH» ═══════════════ */

const HAT_DU = {
  page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: '' }],
  kich_ban: [{ id: 'k1', team_id: 't1', trang_thai: 'DRAFT' }],
  bo_luat_chung: [{ id: 'b1', team_id: 't1', phien_ban: 1, nguon: 'ai', duyet_luc: null }],
  viec_can_xu_ly: [], hoi_thoai: [], san_pham: [],
};

test('④a · MARKETER không thấy việc hạ tầng', async () => {
  dung(HAT_DU, CAU([rd('111')]));
  const d = await tc.manTrangChu(bc(VAI.MARKETER));
  const ma = d.viec.map((v) => v.ma);
  assert.ok(ma.includes('page_kich_ban_mong'), 'marketer phải thấy việc kịch bản');
  assert.ok(!ma.includes('de_xuat_cho_duyet'), 'marketer không duyệt bộ luật');
  assert.ok(!ma.includes('page_chua_marketer'), 'phân công người là việc quản trị');
  assert.ok(!ma.includes('viec_cho_nguoi'));
  assert.ok(d.soAnVaiKhac > 0, 'phải khai có việc bị ẩn, đừng để tưởng hệ thống chỉ có bấy nhiêu');
});

test('④b · NGƯỜI DUYỆT KỊCH BẢN chỉ thấy việc duyệt', async () => {
  dung(HAT_DU, CAU([rd('111')]));
  const d = await tc.manTrangChu(bc(VAI.DUYET_KICH_BAN));
  assert.deepEqual(d.viec.map((v) => v.ma), ['kich_ban_cho_duyet']);
});

test('④c · QUẢN TRỊ thấy hết', async () => {
  dung(HAT_DU, CAU([rd('111')]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  assert.equal(d.soAnVaiKhac, 0);
  assert.ok(d.viec.length >= 6);
});

test('④d · SALE không vào được màn này — «vào thẳng bảng điều phối»', () => {
  assert.ok(!tc.VAI_VAO_DUOC.includes(VAI.SALE),
    'cho sale vào đây là thêm một bước vào đúng luồng cần nhanh nhất');
});

test('④e · người KHÔNG CÓ VAI NÀO → NÉM ngay lúc dựng bối cảnh, không trả danh sách rỗng', () => {
  // Tiêu chí nghiệm thu: bối cảnh thiếu team/vai thì phải NÉM, không bao giờ trả rỗng. Ở màn
  // này nó đặc biệt quan trọng: một danh sách việc rỗng trông y hệt «hết việc».
  //
  // Chỗ chặn còn sớm hơn tầng truy vấn — `taoBoiCanh` TỪ CHỐI dựng bối cảnh không vai, nên
  // `manTrangChu` không bao giờ được gọi với bối cảnh như vậy.
  //
  // ⇒ Nhánh `trong` trong `manTrangChu` là CHẶN DỰ PHÒNG, không phải đường chạy thường.
  //   Người dùng thật gặp cảnh này ở cái chắn của router: 403 kèm câu «chưa được gán vai,
  //   nhờ quản trị gán ở màn Cấu hình team».
  assert.throws(() => bc([]), (e) => {
    assert.match(String(e.message), /vai|bối cảnh/i);
    return true;
  });
});

/* ═══════════════ ⑤ XẾP HÀNG: VIỆC GẤP LÊN TRƯỚC ═══════════════ */

test('⑤ · việc CÓ số lên trước việc rỗng, và ô chưa đọc được không chen lên đầu', async () => {
  dung(HAT_DU, CAU([rd('111', { aiAllowed: false, blockers: [{ code: 'NO_TOKEN', detail: 'x' }] })]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  const gap = d.viec.filter((v) => v.gap).map((v) => v.ma);
  const dau = d.viec.slice(0, gap.length).map((v) => v.ma);
  assert.deepEqual(dau.sort(), gap.sort(), 'mọi việc gấp phải nằm ở đầu danh sách');
  assert.ok(gap.includes('page_bi_chan'));
  assert.ok(gap.includes('de_xuat_cho_duyet'), 'bản AI chưa duyệt phải là việc gấp');
});

/* ═══════════════ ⑥ TEAM ═══════════════ */

test('⑥ · đếm trên page của TEAM MÌNH, team khác không lọt', async () => {
  dung({
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: '' },
      { id: 'px', team_id: 't2', page_id: '999', ten: 'B', marketer: '' },
    ],
  }, CAU([rd('111'), rd('999')]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  assert.equal(oCua(d, 'page_chua_marketer').so, 1);
  assert.equal(oCua(d, 'page_chua_marketer').tong, 1);
});

/* ═══════════════ ⑦ MỌI Ô PHẢI TỰ KHAI ĐỦ ═══════════════ */

/**
 * ĐƯỜNG CỦA MỌI MÀN ĐÃ DỰNG — đọc thẳng từ thư mục, không chép tay.
 *
 * Bản đầu của bài này chép tay danh sách và tôi tự cho `/san-pham` vào, trong khi màn đó
 * CHƯA DỰNG ⇒ bài test xanh còn nút thì 404. Đúng cái nó sinh ra để chặn.
 * Danh sách phải LẤY TỪ mã nguồn, y như phép đọc `LADDER` ở `san-sang.test.mjs`.
 */
function docDuongDaDung() {
  const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui');
  const ra = new Set();
  for (const ten of readdirSync(goc)) {
    const f = path.join(goc, ten, 'router.js');
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(/DUONG_TRANG\s*=\s*'([^']+)'/g)) ra.add(m[1]);
    // Màn điều phối (giai đoạn 1) khai đường theo cách khác — bắt luôn `r.get('/…'`.
    for (const m of readFileSync(f, 'utf8').matchAll(/r\.get\('(\/[a-z0-9-]+)'/g)) ra.add(m[1]);
  }
  return ra;
}

const DUONG_DA_DUNG = docDuongDaDung();

test('⑦a · phép đọc đường phải bóc được (hỏng thì bài ⑦b vô nghĩa)', () => {
  assert.ok(DUONG_DA_DUNG.size >= 8, `chỉ bóc được ${DUONG_DA_DUNG.size} đường: ${[...DUONG_DA_DUNG]}`);
  assert.ok(DUONG_DA_DUNG.has('/san-sang') && DUONG_DA_DUNG.has('/kich-ban'));
});

test('⑦b · mọi ô đều có vai, lời giải thích, và chỗ bấm TRỎ TỚI MÀN CÓ THẬT', async () => {
  dung(HAT_DU, CAU([rd('111')]));
  const d = await tc.manTrangChu(bc(VAI.QUAN_TRI));
  for (const v of d.viec) {
    assert.ok(v.vai.length, `${v.ma}: không khai vai nào thì không ai thấy`);
    assert.ok(v.lam && v.lam.length > 20, `${v.ma}: phải nói việc này là việc gì`);
    assert.ok(Object.values(tc.VI_RONG).includes(v.viRong), `${v.ma}: mã lý do rỗng lạ`);
    // Ô nào khai `tong` thì phải khai luôn ĐƠN VỊ, vì trình duyệt không đoán được nó đếm
    // gì. Bản đầu để trình duyệt gõ cứng «page», và ô sản phẩm hiện «/ 2 page».
    if (v.tong != null && v.ma === 'san_pham_het_hang') {
      assert.equal(v.donVi, 'sản phẩm', 'ô sản phẩm không được mượn đơn vị «page»');
    }
    if (v.di) {
      assert.ok(DUONG_DA_DUNG.has(v.di),
        `${v.ma}: bấm sang \`${v.di}\` — không màn nào khai đường đó. `
        + `Người ta bấm vào rơi ra 404. Đường đã dựng: ${[...DUONG_DA_DUNG].sort().join(' ')}`);
    }
  }
});
