// MÀN «CHI PHÍ AI» (G2-G2).
//
// Yêu cầu: *«127 đ/tin · 6.696 đ/đơn · bảng theo page tìm chỗ đốt tiền mà không ra đơn»*.
//
// Chỗ dễ nói dối nhất ở màn này là con số 0. `so_ai` của CSDL v3 có 0 dòng, còn tiến trình
// bot đo được hơn một triệu đồng. Hiện 0 lên màn chi phí là nói với chủ dự án rằng bot
// không tốn tiền — câu dễ tin nhất và sai nhất.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const cp = await import('../../src/ui/chi-phi/kho-chi-phi.js');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', marketer: 'lan' },
  { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', marketer: '' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC', marketer: '' },
];

const pg = (pageId, o = {}) => ({
  pageId, ten: 'P' + pageId, soLuot: 100, soLuotDoThat: 100, soDon: 2,
  tienVnd: 12700, tienUsd: 0.5, vndMoiTin: 127, vndMoiDon: 6350, tinMoiDon: 50, token: 1000, ...o,
});

const botCo = (pages, o = {}) => async () => ({
  nhaCungCap: 'kimi', soLuotTraLoi: 999, soLuotDoThat: 650, soDon: 20, soLoiGoi: 1200,
  tokenVao: 1e6, tokenRa: 1e5, tokenDocLai: 1e6, tienUsd: 44, tienVnd: 1145472,
  vndMoiTin: 127, vndMoiDon: 6698, tinMoiDon: 52.9, bangGia: {}, page: pages, ...o,
});

function dung({ bot, soAi } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: PAGE,
  });
  cp.datTaoTruyVan(taoTruyVan);
  cp.datDocChiPhiBot(bot === undefined ? botCo([pg('111')]) : bot);
  cp.datDocSoAi(soAi === undefined ? null : soAi);
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});

/* ═══════════ ① SỐ 0 CỦA `so_ai` KHÔNG ĐƯỢC LÊN MÀN NHƯ SỰ THẬT ═══════════ */

test('①a · tiền lấy từ TIẾN TRÌNH BOT, không lấy từ `so_ai`', async () => {
  dung({
    bot: botCo([pg('111', { tienVnd: 500000 })]),
    // Sổ v3 rỗng — đúng cảnh thật 25/08.
    soAi: async () => ({ dsPage: [], tongTienVnd: 0, canhBao: null,
      boiCanh: { coDuLieu: false, viSaoRong: 'bảng `so_ai` không có dòng nào' } }),
  });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.nguon, cp.NGUON.BOT_V1);
  assert.equal(d.tong.tienVnd, 500000, 'lấy 0 của `so_ai` là nói bot không tốn tiền');
});

test('①b · hai sổ lệch → NÓI RA, kèm CẢ HAI con số', async () => {
  dung({
    bot: botCo([pg('111', { soLuot: 300, tienVnd: 500000 })]),
    soAi: async () => ({ dsPage: [], tongTienVnd: 0, canhBao: null,
      boiCanh: { coDuLieu: false, viSaoRong: 'bảng `so_ai` không có dòng nào' } }),
  });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.soAi.coLech, true, 'lệch mà im là màn nói dối');
  assert.match(d.soAi.noi, /0 lượt/, 'phải nêu con số của sổ v3');
  assert.match(d.soAi.noi, /300 lượt/, 'phải nêu cả con số của bot');
  assert.match(d.soAi.noi, /TIẾN TRÌNH BOT/, 'phải nói RÕ màn đang theo bên nào');
  assert.ok(d.soAi.viSao, 'phải nói vì sao sổ v3 rỗng');
});

test('①c · hai sổ KHỚP → không bịa ra cảnh báo', async () => {
  dung({
    bot: botCo([pg('111', { soLuot: 100 })]),
    soAi: async () => ({ dsPage: [{ soLuot: 100 }], tongTienVnd: 12700, canhBao: null,
      boiCanh: { coDuLieu: true, viSaoRong: null } }),
  });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.soAi.coLech, false);
});

/* ═══════════ ② ĐỐT TIỀN KHÔNG RA ĐƠN ═══════════ */

test('②a · CHỈ page có tiêu mà 0 đơn — page 0 lượt không đốt gì cả', async () => {
  dung({ bot: botCo([
    pg('111', { soLuot: 200, soDon: 0, tienVnd: 25000 }),   // đốt thật
    pg('222', { soLuot: 0, soDon: 0, tienVnd: 0 }),          // không tiêu gì
  ]) });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.dotTien.so, 1, 'gộp page 0 lượt vào là biến cảnh báo thật thành danh sách rác');
  assert.equal(d.dotTien.ds[0].pageId, '111');
  assert.equal(d.dotTien.tien, 25000);
});

test('②b · page có đơn thì KHÔNG bị gắn cờ đốt tiền', async () => {
  dung({ bot: botCo([pg('111', { soLuot: 200, soDon: 3 })]) });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.dotTien.so, 0);
  assert.equal(d.page[0].dotTienKhongRaDon, false);
});

/* ═══════════ ③ ĐO THẬT vs ƯỚC ═══════════ */

test('③ · khai tỉ lệ đo thật, không gộp với ước', async () => {
  dung({ bot: botCo([pg('111', { soLuot: 100, soLuotDoThat: 65 })]) });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.tong.tiLeDoThat, 65,
    'một con số tiền không kèm «bao nhiêu phần trăm đo thật» thì người ta tin nó hơn thực tế');
  assert.equal(d.page[0].tiLeDoThat, 65);
});

/* ═══════════ ④ TEAM ═══════════ */

test('④ · cầu trả TOÀN HỆ, màn chỉ cộng page của team mình', async () => {
  dung({ bot: botCo([
    pg('111', { tienVnd: 10000, soLuot: 100, soDon: 1 }),
    pg('999', { tienVnd: 900000, soLuot: 9000, soDon: 90, ten: 'CỦA TEAM KHÁC' }),
  ]) });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.tong.tienVnd, 10000, 'cộng nhầm tiền của team khác');
  assert.equal(d.page.length, 1);
  assert.ok(!JSON.stringify(d.page).includes('999'));
  // Con số toàn hệ vẫn giữ để đối chiếu, nhưng KHÔNG phải con số của team.
  assert.equal(d.toanHe.tienVnd, 1145472);
});

/* ═══════════ ⑤ CẦU HỎNG ≠ 0 ĐỒNG ═══════════ */

test('⑤a · cầu hỏng thì NÉM, tuyệt đối không hiện 0 đồng', async () => {
  dung({ bot: async () => { throw new Error('bot không chạy'); } });
  await assert.rejects(() => cp.manChiPhi(bc()), (e) => {
    assert.equal(e.ma, 'cau_hong');
    assert.equal(e.status, 502);
    assert.match(e.message, /0 đồng/, 'lỗi phải nói RÕ vì sao không hiện 0');
    return true;
  });
});

test('⑤b · chưa nối cầu → nói rõ, và nói luôn `so_ai` KHÔNG thay được', async () => {
  dung({ bot: null });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.nguon, cp.NGUON.KHONG_DOC_DUOC);
  assert.equal(d.tong, null, 'không có nguồn thì không được dựng ra con số nào');
  assert.match(d.trong.diTiep, /so_ai.*KHÔNG dùng thay được|KHÔNG dùng thay/);
});

test('⑤c · sổ `so_ai` hỏng KHÔNG làm hỏng cả màn', async () => {
  dung({
    bot: botCo([pg('111')]),
    soAi: async () => { throw new Error('CSDL sập'); },
  });
  const d = await cp.manChiPhi(bc());
  assert.equal(d.tong.tienVnd, 12700, 'tiền vẫn phải hiện — sổ đối chiếu hỏng là chuyện khác');
  assert.equal(d.soAi.docDuoc, false);
  assert.match(d.soAi.noi, /CSDL sập/);
});
