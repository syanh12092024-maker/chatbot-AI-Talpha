// MÀN «ĐƯA SẢN PHẨM MỚI LÊN CHẠY» (G2-F7) — sáu chặng, mỗi chặng một cửa kiểm.
//
// Yêu cầu ghi rõ *«chặng 2 bắt buộc có động cơ»*. Nhưng `90-phu-luc §4` đã đo: hệ thống
// **chưa có ô để bỏ trống**. Nên cửa kiểm chặng 2 không bao giờ qua được bằng cách điền form.
//
// Bài test ở đây canh đúng chỗ dễ nói dối nhất: cho chặng 2 một trạng thái «chưa làm» rồi
// vẽ một ô nhập rỗng. Người ta gõ vào, bấm lưu, chữ đi vào hư không, và màn vẫn xanh.
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
const lc = await import('../../src/ui/len-chay/kho-len-chay.js');

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
const TRANG = path.resolve(THU_MUC, '../../src/ui/len-chay/trang/len-chay.html');

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC' },
];

const rd = (pageId, o = {}) => ({ pageId, blockers: [], warnings: [], aiEnabled: false, aiAllowed: true, ...o });
const kbCo = (o = {}) => ({ pageId: '111', tenPage: 'A', cauHinh: { chao: '', cachBan: '', giongDieu: '', ...o }, sanPham: [] });

function dung(hat = {}, { sanSang, motPage } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: PAGE, ...hat,
  });
  lc.datTaoTruyVan(taoTruyVan);
  lc.datDocSanSang(sanSang === undefined ? async () => ({ pages: [rd('111')] }) : sanSang);
  lc.datDocMotPage(motPage === undefined ? async () => kbCo() : motPage);
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});
const c = (d, so) => d.chang.find((x) => x.so === so);

/* ═══════════ ① CHẶNG 2: «KHÔNG CÓ Ô» ≠ «Ô TRỐNG» ═══════════ */

test('①a · chặng 2 có trạng thái RIÊNG, không phải «chưa làm»', async () => {
  dung();
  const d = await lc.changCuaPage(bc(), '111');
  const c2 = c(d, 2);
  assert.equal(c2.trangThai, lc.CHANG.KHONG_CO_O);
  assert.notEqual(c2.trangThai, lc.CHANG.CHUA,
    'gọi là «chưa làm» thì người ta đi tìm chỗ để làm, và không có chỗ nào');
  assert.match(c2.lam, /không tồn tại|không có chỗ chứa/i);
});

test('①b · chặng 2 KHÔNG bao giờ xong, kể cả khi mọi thứ khác đủ', async () => {
  dung({
    hoi_thoai: [{ id: 'h1', team_id: 't1', page_id: 'p1', trang_thai: 'GREET' }],
    kich_ban: [{ id: 'k1', team_id: 't1', page_id: 'p1', trang_thai: 'LIVE' }],
    so_ai: [{ id: 's1', team_id: 't1', page_id: '111', loai: 'reply' }],
  }, {
    sanSang: async () => ({ pages: [rd('111', { aiEnabled: true })] }),
    motPage: async () => kbCo({ chao: 'xin chào', cachBan: 'bán thế này', giongDieu: 'thân' }),
  });
  const d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 2).trangThai, lc.CHANG.KHONG_CO_O);
  // Cửa kiểm ăn thật: chặng 2 chặn thì page dừng ở 1, không nhảy cóc lên 6.
  assert.equal(d.toiChang, 1, 'một chặng sau xong lẻ không đẩy page đi tiếp được');
  assert.equal(d.dungLaiO.so, 2);
});

test('①c · ba chất liệu khai KHÔNG CÓ TRƯỜNG, hai cái có thì khai chỗ chứa', () => {
  const khong = lc.CHAT_LIEU.filter((x) => x.o === null).map((x) => x.ma);
  assert.deepEqual(khong, ['dong_co', 'loi_hua', 'nhom_nhu_cau']);
  assert.equal(lc.CHAT_LIEU.length, 5);
  assert.ok(lc.CHAT_LIEU.find((x) => x.ma === 'khoi_gia').o, 'khối giá CÓ chỗ chứa');
});

test('①d · TRANG không được vẽ ô nhập cho động cơ', () => {
  // Vẽ một ô nhập ở đây là hứa một chỗ chứa không tồn tại: người ta gõ vào, bấm lưu, và chữ
  // đi vào hư không — rồi tưởng chặng 2 đã xong.
  const html = readFileSync(TRANG, 'utf8');
  const oNhap = html.match(/<(input|textarea)[^>]*>/gi) || [];
  assert.deepEqual(oNhap, [], `trang có ô nhập: ${oNhap.join(' ')} — màn này CHỈ ĐỌC`);
});

/* ═══════════ ② TỪNG CHẶNG ĐỌC ĐÚNG NGUỒN ═══════════ */

test('②a · chặng 1 đếm hội thoại THẬT của page', async () => {
  dung({ hoi_thoai: [
    { id: 'h1', team_id: 't1', page_id: 'p1', trang_thai: 'GREET' },
    { id: 'h2', team_id: 't1', page_id: 'p1', trang_thai: 'QUALIFY' },
  ] });
  const d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 1).soDo, 2);
  assert.equal(c(d, 1).trangThai, lc.CHANG.XONG);
});

test('②b · chặng 3 phân biệt LIVE với còn-nháp', async () => {
  dung({ kich_ban: [{ id: 'k1', team_id: 't1', page_id: 'p1', trang_thai: 'DRAFT' }] });
  let d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 3).trangThai, lc.CHANG.DANG_DO, 'bản nháp KHÔNG phải đã dựng xong');

  dung({ kich_ban: [{ id: 'k1', team_id: 't1', page_id: 'p1', trang_thai: 'LIVE' }] });
  d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 3).trangThai, lc.CHANG.XONG);
});

test('②c · chặng 4 cần ÍT NHẤT câu chào + cách bán; thiếu giọng điệu chỉ là nhắc', async () => {
  dung({}, { motPage: async () => kbCo({ chao: 'hi', cachBan: 'bán' }) });
  let d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 4).trangThai, lc.CHANG.XONG);
  assert.match(c(d, 4).noi, /chỉ nhắc/);

  dung({}, { motPage: async () => kbCo({ chao: 'hi' }) });
  d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 4).trangThai, lc.CHANG.DANG_DO, 'có chào mà không có cách bán thì bot không bán được');
});

test('②d · chặng 5 tách «đủ điều kiện» với «đã bật»', async () => {
  dung({}, { sanSang: async () => ({ pages: [rd('111', { aiEnabled: false })] }) });
  let d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 5).trangThai, lc.CHANG.DANG_DO);
  assert.match(c(d, 5).noi, /CHƯA ai bật/i, 'đủ điều kiện mà chưa bật là hai chuyện khác nhau');

  dung({}, { sanSang: async () => ({ pages: [rd('111', { aiEnabled: true })] }) });
  d = await lc.changCuaPage(bc(), '111');
  assert.equal(c(d, 5).trangThai, lc.CHANG.XONG);
});

/* ═══════════ ③ CẦU HỎNG → «CHƯA BIẾT», KHÔNG PHẢI «CHƯA LÀM» ═══════════ */

test('③ · cầu hỏng thì chặng 4 và 5 là «chưa biết», không rơi về «chưa làm»', async () => {
  dung({}, {
    sanSang: async () => { throw new Error('bot không chạy'); },
    motPage: async () => { throw new Error('bot không chạy'); },
  });
  const d = await lc.changCuaPage(bc(), '111');
  for (const so of [4, 5]) {
    assert.equal(c(d, so).trangThai, lc.CHANG.KHONG_BIET,
      `chặng ${so}: «chưa làm» là một KẾT LUẬN, mà ta chưa có quyền kết luận`);
    assert.equal(c(d, so).soDo, null, 'số 0 ở đây là một kết luận sai');
    assert.match(c(d, so).noi, /bot không chạy/);
  }
});

/* ═══════════ ④ TEAM ═══════════ */

test('④ · page team khác → 404, không phải 403', async () => {
  dung();
  await assert.rejects(() => lc.changCuaPage(bc(), '999'), (e) => {
    assert.equal(e.status, 404);
    assert.equal(e.ma, 'khong_thay');
    return true;
  });
});

/* ═══════════ ⑤ SÁU CHẶNG, ĐÚNG SÁU, ĐÚNG TÊN ═══════════ */

test('⑤ · đúng sáu chặng, đúng thứ tự, đúng tên của `90-phu-luc §2`', async () => {
  dung();
  const d = await lc.changCuaPage(bc(), '111');
  assert.deepEqual(d.chang.map((x) => x.so), [1, 2, 3, 4, 5, 6]);
  assert.deepEqual(d.chang.map((x) => x.ten),
    ['Thu liệu', 'Rút chất', 'Dựng kịch bản', 'Nạp vào máy', 'Chạy có kiểm soát', 'Đo & viết lại']);
  for (const x of d.chang) {
    assert.ok(Object.values(lc.CHANG).includes(x.trangThai), `chặng ${x.so}: trạng thái lạ`);
    assert.ok(x.noi && x.noi.length > 15, `chặng ${x.so}: phải nói vì sao nó ở trạng thái đó`);
  }
});
