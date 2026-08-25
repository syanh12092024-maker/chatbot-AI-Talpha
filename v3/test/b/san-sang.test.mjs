// MÀN «CỬA KIỂM SẴN SÀNG» (G2-F5).
//
// Bài đầu tiên là bài quan trọng nhất: nó ĐỌC THẲNG `src/readiness.js` và so từng mã bậc
// thang. Bảng `DIEU_KIEN` bên v3 là chép tay (không nhập được module đó — nó kéo theo cả
// `wa.js` và `pancake.js`), mà chép tay là đúng cái kiểu lỗi đã từng làm cả hệ mất vai
// (`quan_tri` gạch dưới vs `quan-tri` gạch ngang). Nên nó phải bị khoá vào mã nguồn.
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

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NGUON_V1 = path.join(GOC, 'src/readiness.js');

/* ═════════════ ① BẢNG MÃ PHẢI KHỚP `LADDER` CỦA v1, TỪNG MÃ MỘT ═════════════ */

/** Bóc `export const LADDER = { ... }` ra khỏi mã nguồn v1 mà KHÔNG nạp module. */
function docLadder() {
  const src = readFileSync(NGUON_V1, 'utf8');
  const i = src.indexOf('export const LADDER');
  assert.notEqual(i, -1, '`src/readiness.js` không còn `export const LADDER` — v1 đổi hình, sửa lại màn.');
  const mo = src.indexOf('{', i);
  let sau = 0, j = mo;
  for (; j < src.length; j += 1) {
    if (src[j] === '{') sau += 1;
    else if (src[j] === '}') { sau -= 1; if (!sau) break; }
  }
  const than = src.slice(mo + 1, j);
  const ra = new Map();
  for (const d of than.split('\n')) {
    const m = d.match(/^\s*([A-Z_]+)\s*:\s*\{\s*blocks\s*:\s*(true|false)/);
    if (m) ra.set(m[1], m[2] === 'true');
  }
  return ra;
}

const LADDER = docLadder();

test('①a · đọc được LADDER từ mã nguồn v1 (nếu bài này hỏng thì mọi bài dưới vô nghĩa)', () => {
  assert.ok(LADDER.size >= 6, `chỉ bóc được ${LADDER.size} bậc — phép bóc hỏng, không phải v1 hỏng`);
});

test('①b · MỌI mã của v1 đều có trong bảng của màn — không sót bậc nào', () => {
  const sot = [...LADDER.keys()].filter((m) => !(m in ss.DIEU_KIEN));
  assert.deepEqual(sot, [], `v1 có bậc mà màn không biết: ${sot.join(', ')}. `
    + 'Page vướng bậc này sẽ hiện ra không tên và không có chỗ bấm để sửa.');
});

test('①c · màn KHÔNG bịa thêm mã nào v1 không có', () => {
  const bia = Object.keys(ss.DIEU_KIEN).filter((m) => !LADDER.has(m));
  assert.deepEqual(bia, [], `màn có bậc v1 không có: ${bia.join(', ')} — một điều kiện không ai kiểm.`);
});

test('①d · CHẶN hay CHỈ NHẮC phải khớp `blocks` của v1, từng mã một', () => {
  // Đây mới là chỗ nguy hiểm thật: chép đúng tên mã mà chép sai mức thì màn báo «chỉ nhắc»
  // trong khi v1 đang CHẶN không cho bật AI — người ta ngồi đợi một page không bao giờ chạy.
  const lech = [];
  for (const [ma, chan] of LADDER) {
    if (ss.DIEU_KIEN[ma] && ss.DIEU_KIEN[ma].chan !== chan) {
      lech.push(`${ma}: v1 nói ${chan ? 'CHẶN' : 'nhắc'}, màn nói ${ss.DIEU_KIEN[ma].chan ? 'CHẶN' : 'nhắc'}`);
    }
  }
  assert.deepEqual(lech, [], lech.join(' · '));
});

test('①e · mọi bậc CHẶN đều phải nói người ta làm gì để gỡ', () => {
  for (const ma of ss.MA_DIEU_KIEN) {
    const d = ss.DIEU_KIEN[ma];
    assert.ok(d.lam && d.lam.length > 30, `bậc ${ma} chặn/nhắc mà không nói phải làm gì`);
    // Bậc không có màn để nhảy tới thì lời chỉ việc PHẢI dài hơn — nó thay cả cái nút.
    if (!d.di) assert.ok(d.lam.length > 60, `bậc ${ma} không bấm đi đâu được thì phải nói kỹ hơn`);
  }
});

/* ═════════════ ② LỌC THEO TEAM ═════════════ */

const CAU = (pages) => async () => ({ pages, toanHe: { chan: 0, nhac: 0, san: 0, tong: pages.length } });

function dung(pages, cau) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
           { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
    page: pages,
  });
  ss.datTaoTruyVan(taoTruyVan);
  ss.datDocSanSang(cau);
}

const bc = (team = 't1', vai = [VAI.QUAN_TRI]) => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai,
});

const PAGE = [
  { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', bot_ai_bat: true, marketer: 'lan' },
  { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', bot_ai_bat: false, marketer: '' },
  { id: 'px', team_id: 't2', page_id: '999', ten: 'CỦA TEAM KHÁC', bot_ai_bat: true, marketer: '' },
];

const rd = (pageId, o = {}) => ({
  pageId, readiness: 'READY', aiAllowed: true, blockers: [], warnings: [],
  missing: [], aiEnabled: false, tokens: 100, name: 'x', ...o,
});

test('②a · cầu trả TOÀN HỆ, màn chỉ trả page của TEAM MÌNH', async () => {
  dung(PAGE, CAU([rd('111'), rd('222'), rd('999')]));
  const d = await ss.manSanSang(bc());
  assert.deepEqual(d.page.map((p) => p.pageId).sort(), ['111', '222']);
  assert.ok(!JSON.stringify(d).includes('CỦA TEAM KHÁC'), 'tên page team khác lọt qua dây mạng');
  assert.ok(!JSON.stringify(d).includes('999'), 'id page team khác lọt qua dây mạng');
});

test('②b · page CSDL có mà bot không thấy → «không biết», KHÔNG phải «sẵn sàng»', async () => {
  dung(PAGE, CAU([rd('111')]));   // bot không trả 222
  const d = await ss.manSanSang(bc());
  const p2 = d.page.find((p) => p.pageId === '222');
  assert.equal(p2.botKhongThay, true);
  assert.equal(p2.batDuoc, null, 'không biết thì phải là null, không được đoán thành true');
  assert.equal(d.dem.san, 1, 'page bot không thấy không được đếm vào «đủ điều kiện»');
  assert.equal(d.dem.botKhongThay, 1);
});

/* ═════════════ ③ CẦU HỎNG ≠ MỌI PAGE ĐỀU ỔN ═════════════ */

test('③ · cầu hỏng thì NÉM, không trả bảng rỗng', async () => {
  dung(PAGE, async () => { throw new Error('bot không chạy'); });
  await assert.rejects(() => ss.manSanSang(bc()), (e) => {
    assert.equal(e.ma, 'cau_hong');
    assert.equal(e.status, 502);
    assert.match(e.message, /mọi page đều ổn/i, 'lỗi phải nói RÕ vì sao không trả rỗng');
    return true;
  });
});

test('③b · chưa nối cầu → màn rỗng nói RÕ là «chưa cài đặt» và chỉ đường đi tiếp', async () => {
  dung(PAGE, null);
  const d = await ss.manSanSang(bc());
  assert.equal(d.trong.vi, 'chua-cai-dat', 'rỗng vì chưa cài đặt, không phải vì đã xong');
  assert.ok(d.trong.diTiep && d.trong.diTiep.length > 40, 'phải chỉ ĐƯỜNG ĐI TIẾP, không chỉ báo lỗi');
  assert.match(d.trong.diTiep, /V3_BOT_V1_GOC|ADMIN_USER/, 'chỉ đường phải nêu đúng biến cần đặt');
});

/* ═════════════ ④ HAI CON SỐ BOT — CHỖ ĐÃ LỆCH THẬT ═════════════ */

test('④a · giữ CẢ HAI: bot thật và cột bản sao trong CSDL', async () => {
  dung(PAGE, CAU([rd('111', { aiEnabled: false }), rd('222', { aiEnabled: false })]));
  const d = await ss.manSanSang(bc());
  const p1 = d.page.find((p) => p.pageId === '111');
  assert.equal(p1.botTheoCsdl, true, 'CSDL ghi bật');
  assert.equal(p1.botTheoBot, false, 'bot thật thì tắt');
});

test('④b · lệch giữa CSDL và bot phải được NÊU RA, kèm ví dụ', async () => {
  // Đúng cảnh đo được 25/08 trên máy chủ: CSDL v3 ghi 50 page bật AI, `ai-enabled.json` là `[]`.
  dung(PAGE, CAU([rd('111', { aiEnabled: false }), rd('222', { aiEnabled: false })]));
  const d = await ss.manSanSang(bc());
  assert.ok(d.lech, 'lệch mà màn im lặng là màn nói dối');
  assert.equal(d.lech.soChiCsdl, 1);
  assert.equal(d.lech.soChiBot, 0);
  assert.ok(d.lech.viDu.length >= 1, 'phải kèm ví dụ để đi soát được');
  assert.match(d.lech.noi, /bản sao/i, 'phải nói rõ con số nào mới đúng');
});

test('④c · KHÔNG lệch thì không bịa ra cảnh báo', async () => {
  dung(PAGE, CAU([rd('111', { aiEnabled: true }), rd('222', { aiEnabled: false })]));
  const d = await ss.manSanSang(bc());
  assert.equal(d.lech, null);
});

/* ═════════════ ⑤ ĐANG CHẠY MÀ BỊ CHẶN — HÀNG NGUY HIỂM NHẤT ═════════════ */

test('⑤ · page đang chạy MÀ có điều kiện chặn thì đếm riêng', async () => {
  dung(PAGE, CAU([
    rd('111', { aiEnabled: true, aiAllowed: false, readiness: 'MISSING_SCRIPT',
      blockers: [{ code: 'MISSING_SCRIPT', detail: 'thiếu: cách bán' }] }),
    rd('222', { aiEnabled: false }),
  ]));
  const d = await ss.manSanSang(bc());
  assert.equal(d.dem.dangChay, 1);
  assert.equal(d.dem.chayMaBiChan, 1, 'bot đang trả lời khách trên page chưa đủ điều kiện — phải nêu');
  assert.equal(d.dem.chan, 1);
});

/* ═════════════ ⑥ MÃ LẠ THÌ HIỆN RA, KHÔNG NUỐT ═════════════ */

test('⑥ · v1 trả mã màn chưa biết → hiện ra và đánh dấu, không nuốt', async () => {
  dung(PAGE, CAU([
    rd('111', { aiAllowed: false, blockers: [{ code: 'BAC_MOI_CUA_V1', detail: 'v1 vừa thêm' }] }),
    rd('222'),
  ]));
  const d = await ss.manSanSang(bc());
  const o = d.page.find((p) => p.pageId === '111').chan[0];
  assert.equal(o.ma, 'BAC_MOI_CUA_V1');
  assert.equal(o.la, true, 'mã lạ phải được đánh dấu để người ta biết màn chưa cập nhật');
  assert.equal(o.chan, true, 'nằm trong `blockers` thì phải hiểu là CHẶN, kể cả khi chưa biết mã');
});
