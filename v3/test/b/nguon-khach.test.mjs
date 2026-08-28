// MÀN «NGUỒN KHÁCH VÀO» (G2-G4) — *«Sơ đồ hai luồng đơn chạy song song, chỉ gặp nhau ở đích.
// Chỗ rơi 37,4%»*.
//
// Hai chỗ bài test dồn vào:
//   ① 37,4% là số đo CŨ (`PHIEU-L3-M1`: «37,4% BUY NOW không gửi WhatsApp»). Cột đo nó
//      (`so_lan_thu_wa`) hiện bằng 0 ở tất cả ⇒ chưa đo lại được. Hiện 37,4% như một chỉ số
//      đang sống là trưng một con số cũ dưới lớp sơn mới.
//   ② Phễu `/ops/conv-state` là ẢNH CHỤP, không phải dòng chảy. Lấy hiệu hai bậc rồi gọi là
//      «tỉ lệ rơi» là đọc sai bản chất.
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
const nk = await import('../../src/ui/nguon-khach/kho-nguon.js');

const TRANG = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
  '../../src/ui/nguon-khach/trang/nguon-khach.html');

const d = (id, nguon, o = {}) => ({ id, team_id: 't1', nguon, tong_tien: 100, ...o });
const pheuCo = (byState) => async () => ({
  tong: Object.values(byState).reduce((a, b) => a + b, 0),
  theoBac: byState, theoChuSoHuu: { AI: 5, SALE: 2 }, bac: Object.keys(byState),
});

function dung({ don = [], pheu } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    don_hang: don,
  });
  nk.datTaoTruyVan(taoTruyVan);
  nk.datDocPheu(pheu === undefined ? pheuCo({ GREET: 10, QUALIFY: 4, SELLING: 1 }) : pheu);
}
const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});

/* ═══════════ ① 37,4% LÀ SỐ CŨ ═══════════ */

test('①a · cột đo bằng 0 ở tất cả → khai CHƯA ĐO LẠI ĐƯỢC, không hiện 37,4% như số sống', async () => {
  dung({ don: [d('a', 'trang_ban_hang', { so_lan_thu_wa: 0, ly_do_khong_gui: null }),
               d('b', 'trang_ban_hang', { so_lan_thu_wa: 0, ly_do_khong_gui: null })] });
  const r = await nk.manNguon(bc());
  assert.equal(r.choRoi.doDuoc, false);
  assert.equal(r.choRoi.tiLe, undefined, 'chưa đo được thì KHÔNG được có tỉ lệ nào');
  assert.equal(r.choRoi.taiLieuNoi, 0.374, 'vẫn giữ số cũ, nhưng dán nhãn là số cũ');
  assert.match(r.choRoi.diTiep, /số ĐO CŨ|không phải số đo hôm nay/i);
});

test('①b · có dữ liệu gửi WhatsApp → đo lại được, kèm cả số cũ để so', async () => {
  dung({ don: [
    d('a', 'trang_ban_hang', { so_lan_thu_wa: 2 }),
    d('b', 'trang_ban_hang', { so_lan_thu_wa: 0, ly_do_khong_gui: 'thiếu số điện thoại' }),
  ] });
  const r = await nk.manNguon(bc());
  assert.equal(r.choRoi.doDuoc, true);
  assert.equal(r.choRoi.soKhongGui, 1);
  assert.equal(r.choRoi.tiLe, 0.5);
  assert.deepEqual(r.choRoi.lyDo, ['thiếu số điện thoại']);
});

test('①c · TRANG không hiện 37,4% như một con số đang sống', () => {
  // Bỏ chú thích trước khi soi — chú thích NÓI về luật này, và nói là đúng. Cùng phép đã
  // dùng ở `san-pham.test.mjs`: cấm cái làm, không cấm cái giải thích.
  const html = readFileSync(TRANG, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n').filter((d) => !d.trim().startsWith('//')).join('\n');
  // Chỉ được xuất hiện kèm nhãn «số cũ». Trưng trần là trưng số cũ dưới lớp sơn mới.
  const cho = [...html.matchAll(/37[,.]4/g)];
  assert.ok(cho.length, 'trang phải có nhắc số cũ để người đọc biết mốc trước là bao nhiêu');
  for (const m of cho) {
    // Chỉ chấp nhận nhãn «số cũ» — không chấp nhận `class="hint"` chung chung. Bản đầu của
    // bài này cho `hint` qua, và tiêu đề panel ghi «37,4% BUY NOW không được gửi WhatsApp»
    // đọc y như con số hiện tại. Một cái lưới nới ra vừa đủ để lọt là một cái lưới hỏng.
    const quanh = html.slice(Math.max(0, m.index - 60), m.index + 60);
    assert.match(quanh, /số cũ/,
      `con số 37,4% ở «...${quanh.replace(/\s+/g, ' ')}...» không có nhãn «số cũ» cạnh nó`);
  }
});

/* ═══════════ ② PHỄU LÀ ẢNH CHỤP ═══════════ */

test('②a · phễu KHÔNG trả về tỉ lệ rơi nào', async () => {
  dung({ don: [d('a', 'messenger')] });
  const r = await nk.manNguon(bc());
  const van = JSON.stringify(r.pheu);
  assert.ok(!/tiLeRoi|tyLeRoi|"roi"/i.test(van),
    'một hội thoại đã thành đơn không còn nằm ở «đang bán» — hiệu hai bậc không phải tỉ lệ rơi');
  assert.match(r.pheu.canhBao, /ảnh chụp/i, 'phải nói RÕ đây là ảnh chụp');
});

test('②b · phễu khai TOÀN HỆ, không phải theo team', async () => {
  dung({ don: [d('a', 'messenger')] });
  const r = await nk.manNguon(bc());
  assert.equal(r.pheu.laToanHe, true,
    'không khai thì người ta trừ nó với con số theo team ở màn khác rồi tưởng tìm ra chỗ lệch');
});

test('②c · cầu hỏng → phễu để trống, không rơi về 0', async () => {
  dung({ don: [d('a', 'messenger')], pheu: async () => { throw new Error('bot không chạy'); } });
  const r = await nk.manNguon(bc());
  assert.equal(r.pheu.docDuoc, false);
  assert.deepEqual(r.pheu.bac, []);
  assert.match(r.pheu.noi, /bot không chạy/);
});

/* ═══════════ ③ HAI LUỒNG ═══════════ */

test('③a · tách đúng hai luồng, không cộng', async () => {
  dung({ don: [d('a', 'messenger'), d('b', 'messenger'), d('c', 'trang_ban_hang')] });
  const r = await nk.manNguon(bc());
  assert.equal(r.luong.length, 2);
  assert.equal(r.luong.find((l) => l.ma === 'messenger').soDon, 2);
  assert.equal(r.luong.find((l) => l.ma === 'trang_ban_hang').soDon, 1);
  assert.ok(!/"tongDon"|"tong":/.test(JSON.stringify(r.luong)), 'không được có tổng hai luồng');
  assert.match(r.gapNhauO, /POS/, 'phải nói RÕ hai luồng gặp nhau ở đâu');
});

test('③b · đơn mang nguồn LẠ được nêu ra, không nuốt', async () => {
  dung({ don: [d('a', 'messenger'), d('x', 'zalo'), d('y', null)] });
  const r = await nk.manNguon(bc());
  assert.equal(r.donKhac.so, 2);
  assert.ok(r.donKhac.nguon.includes('zalo'));
});

test('③c · tiền thiếu thì nói, không cộng ngầm', async () => {
  dung({ don: [d('a', 'messenger', { tong_tien: 100 }), d('b', 'messenger', { tong_tien: null })] });
  const r = await nk.manNguon(bc());
  const l = r.luong.find((x) => x.ma === 'messenger');
  assert.equal(l.tienDayDu, false);
  assert.equal(l.soDonCoTien, 1);
});

/* ═══════════ ④ TEAM ═══════════ */

test('④ · chỉ đơn của TEAM MÌNH', async () => {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    don_hang: [{ id: 'a', team_id: 't1', nguon: 'messenger' },
               { id: 'x', team_id: 't2', nguon: 'messenger' }],
  });
  nk.datTaoTruyVan(taoTruyVan);
  nk.datDocPheu(pheuCo({ GREET: 1 }));
  const r = await nk.manNguon(bc());
  assert.equal(r.luong.find((l) => l.ma === 'messenger').soDon, 1);
});
