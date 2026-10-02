// MB2 · CR-02-10 — MỘT CÔNG TẮC «bot mình trả lời page này»: cột `page.bot_ai_bat`.
//
// Đo trên CSDL sandbox thật (không giả), bốn lời hứa của phiếu:
//   ① worker nạp ĐÚNG page bật cột — không cần biến môi trường nào;
//   ② cổng của bot (`setPage` → `pageStatus`) CHẶN bật khi van gửi đóng, cột giữ nguyên; TẮT luôn đi;
//   ③ lượt «Kéo dữ liệu về» KHÔNG chép `ai-enabled.json` đè cột (đảo-vá: khôi phục `napCongTacAi` ⇒ ③ đỏ);
//   ④ đường trả lời đọc lại cột trước khi gửi — tắt giữa chừng thì dừng.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dungSandbox } from '../db/sandbox.js';
import { dsPageChoPhep } from '../src/queue/chay-worker.js';
import { setPage, pageStatus } from '../src/admin-v3/operations.js';
import { diTruTatCa } from '../db/di-tru/nap.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let sb; let pool; let TEAM; let ND; const ID = {};

before(async () => {
  sb = await dungSandbox('mb2');
  pool = sb.pool;
  TEAM = (await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  ND = (await pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('mb2@thu.vn','MB2') RETURNING id")).rows[0].id;
  for (const pid of ['980000000001', '980000000002']) {
    ID[pid] = (await pool.query('INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id', [TEAM, pid, `P${pid.slice(-1)}`])).rows[0].id;
  }
});
after(async () => { if (sb) await sb.don(); });

const bc = () => ({ teamId: String(TEAM), nguoiDungId: String(ND) });
const cot = async (pid) => (await pool.query('SELECT bot_ai_bat FROM page WHERE page_id=$1', [pid])).rows[0].bot_ai_bat;

test('① worker nạp ĐÚNG page bật cột — biến cũ đặt hay vắng cũng không đổi gì', async () => {
  assert.deepEqual(await dsPageChoPhep(pool), [], 'mặc định cột = false ⇒ worker không nạp page nào');
  await pool.query('UPDATE page SET bot_ai_bat = true WHERE page_id = $1', ['980000000001']);
  const cu = process.env.V3_PAGE_XU_LY;
  process.env.V3_PAGE_XU_LY = '980000000002';
  try {
    assert.deepEqual(await dsPageChoPhep(pool), ['980000000001'], 'chỉ cột quyết — biến cũ không thêm page');
  } finally {
    if (cu === undefined) delete process.env.V3_PAGE_XU_LY; else process.env.V3_PAGE_XU_LY = cu;
    await pool.query('UPDATE page SET bot_ai_bat = false');
  }
});

test('② cổng của bot: van gửi ĐÓNG ⇒ chặn BẬT, cột giữ nguyên; TẮT luôn đi được và ghi cột', async () => {
  const env = { PANCAKE_READONLY: '1', V3_PANCAKE_GUI: '0' };
  const p = (await pool.query('SELECT * FROM page WHERE page_id=$1', ['980000000002'])).rows[0];
  const st = await pageStatus(pool, p, env);
  assert.ok(st.blockers.includes('Máy chủ chưa mở gửi tin'), `phải chặn vì van gửi: ${st.blockers.join(' · ')}`);
  assert.ok(!st.blockers.some((b) => /bot mới|danh sách worker/i.test(b)), 'không còn điều kiện «giao cho bot mới»');
  await assert.rejects(() => setPage(pool, bc(), ID['980000000002'], { enabled: true }, env), /Máy chủ chưa mở gửi tin/);
  assert.equal(await cot('980000000002'), false, 'bị chặn thì cột KHÔNG đổi');

  await pool.query('UPDATE page SET bot_ai_bat = true WHERE page_id = $1', ['980000000002']);
  const r = await setPage(pool, bc(), ID['980000000002'], { enabled: false }, env);
  assert.equal(r.bot_ai_bat, false);
  assert.equal(await cot('980000000002'), false, 'tắt phải ghi đúng cột worker đọc');
});

test('③ «Kéo dữ liệu về» KHÔNG chép ai-enabled.json đè công tắc', async () => {
  // Thư mục nguồn chỉ có `ai-enabled.json` RỖNG — đúng hình prod (tệp v1 đứng im từ 28/08).
  const goc = fs.mkdtempSync(path.join(os.tmpdir(), 'mb2-nguon-'));
  fs.writeFileSync(path.join(goc, 'ai-enabled.json'), '[]');
  await pool.query('UPDATE page SET bot_ai_bat = true WHERE page_id = $1', ['980000000001']);
  try {
    const kq = await diTruTatCa(pool, goc);
    assert.equal(kq.congTac, null, 'lượt di trú không còn bước công tắc');
    assert.equal(await cot('980000000001'), true, 'page vừa bật bị lượt kéo dữ liệu TẮT — đúng cái lỗi phiếu chặn');
  } finally {
    fs.rmSync(goc, { recursive: true, force: true });
    await pool.query('UPDATE page SET bot_ai_bat = false');
  }
});

test('④ đường trả lời đọc lại CỘT trước khi gửi — không còn `v3_ai_bat`', () => {
  const kho = fs.readFileSync(path.join(GOC, 'src/chat/kho.js'), 'utf8');
  const hd = fs.readFileSync(path.join(GOC, 'src/chat/handler-v3.js'), 'utf8');
  assert.match(kho, /p\.bot_ai_bat FROM hoi_thoai/, 'câu đọc hội thoại phải mang cột công tắc');
  assert.match(hd, /hoiThoai\.bot_ai_bat !== true/, 'chặn trước khi soạn');
  assert.match(hd, /moi\?\.bot_ai_bat !== true/, 'chặn lại ngay trước khi gửi (tắt giữa chừng)');
  assert.doesNotMatch(kho + hd, /v3_ai_bat/);
});
