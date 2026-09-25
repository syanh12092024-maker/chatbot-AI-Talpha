// GD1 · MỘT NGUỒN CHO MỖI CÂU HỎI — bộ ca của phiếu «điều kiện page và mẫu số dải trạng thái».
//
// Ba chuyện lượt này sửa, và ba chuyện ấy phải đỏ được nếu ai đó làm hỏng lại:
//   ① Điều kiện của page chạy BẢN MỚI đi tới màn dưới dạng MÃ, không phải câu chữ tự do.
//      Trước 23/09 cầu nhét nguyên câu vào ô `code` ⇒ mọi màn tra bảng từ vựng đều trượt và
//      hiện ra một ô đỏ không tên, không nút sửa («mã lạ»).
//   ② Mỗi page khai nó chạy bằng bản nào (`banBot`), và được chấm bằng danh sách điều kiện
//      của CHÍNH bản đó — chấm page bản mới bằng bốn mã của bản cũ thì nó luôn ra «đủ điều
//      kiện» dù đang vướng.
//   ③ Dải trạng thái đếm page CỦA TEAM, bằng đúng phép đếm của màn «Page còn thiếu gì».
//      Trước 23/09 nó đếm toàn hệ nên hiện «1/1 page» trong khi team có 4 page.
//
// Ca ① đọc THẲNG mã nguồn của bên kia (`src/admin-v3/operations.js`) như bài `san-sang` đọc
// `LADDER` — bảng dịch là chép tay, nên nó phải bị khoá vào nguồn, không khoá vào trí nhớ.
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
const dai = await import('../../src/ui/chung/trang-thai.js');

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NGUON_V3 = path.join(GOC, 'src/admin-v3/operations.js');
const { lyDoChuaThuocBotMoi } = await import('../../../src/queue/page-routing.js');
const CAU_NOI = path.join(GOC, 'v3/src/noi-day/van-hanh-v3.js');

/* ═════════════ ① BẢNG DỊCH PHẢI PHỦ HẾT CÂU CỦA BÊN KIA ═════════════ */

/**
 * Bóc mọi câu `blockers.push("…")` ra khỏi mã nguồn bản mới mà KHÔNG nạp module.
 *
 * ⚠️ 25/09 (024): MỘT câu đã dọn ra khỏi `operations.js` — điều kiện «page chưa thuộc bot
 * mới» nay có HAI cách nói, tuỳ cầu dao `V3_GIAO_PAGE_TREN_MAN` (chỗ đi sửa đổi theo). Phép
 * bóc bằng regex không thấy chúng nữa, nên nếu để nguyên thì thước này lặng lẽ thôi canh
 * đúng cái câu hay đổi nhất. Gọi THẲNG hàm sinh câu — đúng nguồn, không phải trí nhớ.
 */
function docCauChan() {
  const src = readFileSync(NGUON_V3, 'utf8');
  const ra = [...src.matchAll(/blockers\.push\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);
  return [...new Set([
    ...ra,
    lyDoChuaThuocBotMoi({}),
    lyDoChuaThuocBotMoi({ V3_GIAO_PAGE_TREN_MAN: '1' }),
  ])];
}

/** Bóc bảng dịch câu → mã ở cầu nối. */
function docBangDich() {
  const src = readFileSync(CAU_NOI, 'utf8');
  const khoi = src.slice(src.indexOf('const MA_CUA_CAU'), src.indexOf('});', src.indexOf('const MA_CUA_CAU')));
  return new Map([...khoi.matchAll(/"([^"]+)":\s*"([A-Z0-9_]+)"/g)].map((m) => [m[1], m[2]]));
}

const CAU_CHAN = docCauChan();
const BANG_DICH = docBangDich();

test('①a · bóc được câu chặn của bản mới (hỏng phép bóc thì mọi ca dưới vô nghĩa)', () => {
  assert.ok(CAU_CHAN.length >= 5, `chỉ bóc được ${CAU_CHAN.length} câu — phép bóc hỏng, không phải bên kia hỏng`);
  assert.ok(BANG_DICH.size >= 5, `bảng dịch chỉ có ${BANG_DICH.size} dòng`);
});

test('①b · MỌI câu chặn của bản mới đều có mã — không câu nào rơi ra thành «mã lạ»', () => {
  const sot = CAU_CHAN.filter((c) => !BANG_DICH.has(c));
  assert.deepEqual(sot, [], 'bản mới thêm điều kiện mà cầu chưa đặt tên: '
    + `${sot.join(' · ')}. Người dùng sẽ thấy một ô đỏ không tên và không có nút sửa.`);
});

test('①c · mã nào bảng dịch trả ra cũng phải có trong bảng từ vựng', () => {
  const thieu = [...BANG_DICH.values()].filter((m) => !ss.DIEU_KIEN_V3[m]);
  assert.deepEqual(thieu, [], `mã không có tên: ${thieu.join(', ')}`);
});

test('①d · bảng dịch không đặt tên cho câu bên kia KHÔNG còn nói nữa', () => {
  const thua = [...BANG_DICH.keys()].filter((c) => !CAU_CHAN.includes(c));
  assert.deepEqual(thua, [], `dịch câu không còn tồn tại: ${thua.join(' · ')} — bên kia đã đổi chữ, `
    + 'và điều kiện thật sẽ rơi ra thành «mã lạ».');
});

test('①e · hai mã NHẮC của bản mới có mặt và đúng là không chặn', () => {
  for (const ma of ['BOTMOI_DIEN_TAP', 'BOTMOI_CHUA_DO_MAY_CHAY_BOT']) {
    assert.ok(ss.DIEU_KIEN_V3[ma], `thiếu ${ma}`);
    assert.equal(ss.DIEU_KIEN_V3[ma].chan, false, `${ma} phải là nhắc, không phải chặn`);
  }
  // Bảng CHUNG phải chở được cả hai bản bot: màn tra một bảng, không tra hai.
  assert.ok(ss.DIEU_KIEN_TAT_CA.NO_TOKEN && ss.DIEU_KIEN_TAT_CA.BOTMOI_THIEU_GIA);
});

/* ═════════════ ② PAGE KHAI BẢN BOT, VÀ ĐƯỢC CHẤM BẰNG DANH SÁCH CỦA BẢN ĐÓ ═════════════ */

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'Page bản mới', bot_ai_bat: true, marketer: 'lan' },
  { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page bản cũ', bot_ai_bat: false, marketer: '' },
  { id: 'p3', team_id: 't1', page_id: '333', ten: 'Page bot không thấy', bot_ai_bat: false, marketer: '' },
];

const dongV3 = (pageId, { batDuoc = false, dangChay = true, chan = ['BOTMOI_THIEU_GIA'] } = {}) => ({
  pageId, runtime: 'v3', aiEnabled: dangChay, aiAllowed: batDuoc,
  readiness: batDuoc ? 'READY' : 'BLOCKED',
  blockers: chan.map((ma) => ({ code: ma, detail: '' })),
  warnings: [{ code: 'BOTMOI_CHUA_DO_MAY_CHAY_BOT', detail: '' }],
  missing: chan, tokens: 1, name: 'x',
});

const dongV1 = (pageId, { chan = ['NO_TOKEN'] } = {}) => ({
  pageId, readiness: 'BLOCKED', aiAllowed: false, aiEnabled: false,
  blockers: chan.map((ma) => ({ code: ma, detail: 'v1 nói cụ thể' })),
  warnings: [], missing: chan, tokens: 0, name: 'x',
});

function dung(pages, dsCuaKiem) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    page: pages,
  });
  ss.datTaoTruyVan(taoTruyVan);
  ss.datDocSanSang(async () => ({ pages: dsCuaKiem, toanHe: { chan: 0, nhac: 0, san: 0, tong: dsCuaKiem.length } }));
}

const bc = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI] });

test('②a · page bản mới mang nhãn «moi», page bản cũ mang «cu», bot không thấy thì vẫn «cu»', async () => {
  dung(PAGE, [dongV3('111'), dongV1('222')]);
  const d = await ss.manSanSang(bc());
  const theo = new Map(d.page.map((p) => [p.pageId, p]));
  assert.equal(theo.get('111').banBot, 'moi');
  assert.equal(theo.get('222').banBot, 'cu');
  assert.equal(theo.get('333').banBot, 'cu', 'không biết thì KHÔNG được đoán là bản mới');
  assert.equal(theo.get('333').botKhongThay, true);
});

test('②b · điều kiện của bản mới KHÔNG còn bị gọi là «mã lạ»', async () => {
  dung(PAGE, [dongV3('111', { chan: ['BOTMOI_THIEU_GIA', 'BOTMOI_THIEU_SAN_PHAM'] }), dongV1('222')]);
  const d = await ss.manSanSang(bc());
  const p = d.page.find((x) => x.pageId === '111');
  assert.deepEqual([...p.chan.map((b) => b.ma)].sort(), ['BOTMOI_THIEU_GIA', 'BOTMOI_THIEU_SAN_PHAM'],
    'đủ hai điều kiện đang vướng, không nuốt cái nào');
  assert.equal(p.chan.every((b) => b.la === false), true, 'còn mã nào «lạ» là màn lại hiện ô đỏ không tên');
  assert.equal(p.nhac.every((b) => b.la === false), true);
  // Và bảng từ vựng gửi kèm phải tra được mọi mã màn sắp hiện.
  for (const b of [...p.chan, ...p.nhac]) {
    assert.ok(d.dieuKien[b.ma], `bảng từ vựng thiếu ${b.ma}`);
    assert.ok(d.dieuKien[b.ma].nhan, `${b.ma} chưa có tên cho người đọc`);
  }
});

test('②c · màn «Bắt đầu» chấm page bản mới bằng danh sách của bản mới', async () => {
  dung(PAGE, [dongV3('111', { chan: ['BOTMOI_THIEU_GIA'] }), dongV1('222')]);
  const d = await bd.manBatDau(bc());
  const moi = d.page.find((p) => p.pageId === '111');
  const cu = d.page.find((p) => p.pageId === '222');

  assert.equal(moi.banBot, 'moi');
  assert.ok(moi.maChan.includes('BOTMOI_THIEU_GIA'), 'danh sách chấm của page bản mới phải chứa mã bản mới');
  assert.equal(moi.maChan.includes('NO_TOKEN'), false, 'không chấm page bản mới bằng điều kiện của bản cũ');
  assert.deepEqual(moi.chan.map((b) => b.ma), ['BOTMOI_THIEU_GIA'],
    'điều kiện đang vướng phải nằm trong danh sách chấm — rơi ra là màn báo «đủ điều kiện» cho page không chạy được');

  assert.equal(cu.banBot, 'cu');
  assert.ok(cu.maChan.includes('NO_TOKEN'));
  assert.deepEqual(cu.chan.map((b) => b.ma), ['NO_TOKEN']);
});

/* ═════════════ ③ DẢI TRẠNG THÁI ĐẾM CÙNG MẪU SỐ VỚI DANH SÁCH PAGE ═════════════ */

test('③a · dải trạng thái = phép đếm của màn «Page còn thiếu gì», không phải toàn hệ', async () => {
  // Cầu trả về MỘT page của team và một page của team khác — đúng cảnh làm hiện «1/1 page».
  dung(PAGE, [dongV3('111'), dongV1('222'), dongV1('999')]);
  dai.xoaNho();
  dai.datDocSanSang(async () => ({ pages: [dongV3('111'), dongV1('999')] })); // đường lui: toàn hệ
  dai.datDemTeam(async (boiCanh) => {
    const d = await ss.manSanSang(boiCanh);
    return { aiBat: d.dem.dangChay, tong: d.dem.tong };
  });

  const t = await dai.docTrangThai({ boiCanh: bc() });
  const man = await ss.manSanSang(bc());

  assert.equal(t.docDuoc, true);
  assert.equal(t.theoTeam, true);
  assert.equal(t.tong, man.dem.tong, 'mẫu số của dải phải bằng số page của team');
  assert.equal(t.tong, 3, 'team có 3 page — page 999 của team khác không được đếm');
  assert.equal(t.aiBat, man.dem.dangChay);
});

test('③b · chưa nối phép đếm theo team thì dải KHAI RÕ nó đang đếm toàn hệ', async () => {
  dai.xoaNho();
  dai.datDemTeam(null);
  dai.datDocSanSang(async () => ({ pages: [dongV3('111'), dongV1('999')] }));
  const t = await dai.docTrangThai({ boiCanh: bc() });
  assert.equal(t.theoTeam, false, 'đếm toàn hệ mà không khai là lại hiện hai mẫu số dưới một cái tên');
  assert.equal(t.tong, 2);
});

test('③c · đếm theo team hỏng thì NÓI HỎNG, không tụt về mẫu số khác', async () => {
  dai.xoaNho();
  dai.datDocSanSang(async () => ({ pages: [dongV1('999')] }));
  dai.datDemTeam(async () => { throw new Error('cầu chết'); });
  const t = await dai.docTrangThai({ boiCanh: bc() });
  assert.equal(t.docDuoc, false);
  assert.equal(t.aiBat, null, '0 và «chưa biết» là hai câu khác nhau');
  assert.match(t.viSao, /cầu chết/);
  dai.datDemTeam(null);
  dai.xoaNho();
});
