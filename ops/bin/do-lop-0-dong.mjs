#!/usr/bin/env node
// ĐO LỚP 0 ĐỒNG TRÊN TIN KHÁCH THẬT — không gọi model, không gửi một chữ nào.
//
// Vì sao cần: "cài mẫu trả lời nhanh" là một lời hứa tiết kiệm, và lời hứa đó chỉ có giá
// trị khi đo được trên ĐÚNG tin khách của page đó. Ước lượng bằng mắt lệch rất xa — lần đo
// 17/09 trên page 1220547807799752: đoán ~30% theo bảng phân loại ý định, đo thật 17,8%.
// Chênh nằm ở những cửa mà bảng phân loại không thấy: tin >12 từ, tin có số điện thoại, tin
// có ý định mua — ba cửa đó LUÔN nhường AI, kể cả khi tin có chứa từ khoá "how much".
//
// Chạy:
//   DEVENV=<đường dẫn .env> node ops/bin/do-lop-0-dong.mjs <tin.json> <pageId Facebook>
//
// `tin.json` là MẢNG chuỗi — tin của KHÁCH (không lẫn tin của sale/bot). Lấy bằng bộ quét
// GET-only sang Pancake; đừng gõ tay một danh sách "tin mẫu" — nó sẽ đo trí tưởng tượng
// của người gõ chứ không đo page.
import fs from 'node:fs';
import pg from 'pg';
import { rapKb } from '../../src/chat/rap-prompt.js';
import { fastLane } from '../../src/fast-lane.js';
import { lopTuKhoa } from '../../src/chat/lop-tu-khoa.js';

const [tepTin, pageIdFb] = process.argv.slice(2);
if (!tepTin || !pageIdFb) {
  console.error('Dùng: DEVENV=<.env> node ops/bin/do-lop-0-dong.mjs <tin.json> <pageId>');
  process.exit(2);
}
if (!process.env.DEVENV) { console.error('Thiếu DEVENV — trỏ tới tệp .env của bản đang đo.'); process.exit(2); }

const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, 'utf8').split('\n')
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
  }));
// Chỉ đo trên máy mình. Bộ đo này đọc cả bảng giá lẫn kịch bản LIVE.
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || '')) {
  console.error('Chỉ chạy trên PostgreSQL local.'); process.exit(2);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3 });
const { rows: [trang] } = await pool.query('SELECT id, team_id FROM page WHERE page_id = $1', [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb} trong CSDL này.`); process.exit(1); }

const kb = await rapKb(pool, { teamId: String(trang.team_id), pageIdText: pageIdFb });
const MAU = ['fastLanePrice', 'fastLaneShip', 'fastLaneHowto', 'fastLaneAuth', 'fastLaneSize'];
const uoc = (s) => Math.ceil(String(s || '').length / 3.5);

console.log('═══ KHỐI DỮ LIỆU BOT NHẬN MỖI LƯỢT ═══');
console.log(kb.text);
console.log(`\nkhối dữ liệu: ${kb.text.length} ký tự ≈ ${uoc(kb.text)} token`);
console.log(`mẫu 0 đồng đã cài: ${MAU.filter((k) => kb.config?.[k]).join(', ') || '(chưa có mẫu nào)'}`);
console.log(`mẫu CÒN TRỐNG    : ${MAU.filter((k) => !kb.config?.[k]).join(', ') || '(đủ)'}`);
if (process.env.FASTLANE_TEMPLATES === '0') {
  console.log('⚠️  FASTLANE_TEMPLATES=0 — lớp mẫu ĐANG TẮT, mọi mẫu ở trên sẽ KHÔNG bắn.');
}

const tin = JSON.parse(fs.readFileSync(tepTin, 'utf8'));
const dem = new Map();
let chan = 0;
for (const t of tin) {
  const f = fastLane({ text: t, kb, aiTurns: 1, usedLanes: new Set(), pageId: pageIdFb });
  let lane = f?.handled ? (f.lane || 'fast-lane') : null;
  if (!lane) {
    const k = lopTuKhoa({ text: t, kb });
    if (k?.handled) lane = 'tu-khoa:' + (k.lane || k.y || '?');
  }
  if (lane) { chan += 1; dem.set(lane, (dem.get(lane) || 0) + 1); }
}
const pt = (n) => `${(n * 100 / tin.length).toFixed(1)}%`;
console.log(`\n═══ CHẶN 0 ĐỒNG TRÊN ${tin.length} TIN KHÁCH THẬT ═══`);
for (const [k, v] of [...dem].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(24)} ${String(v).padStart(4)} tin  (${pt(v)})`);
}
console.log(`  ${'TỔNG CHẶN'.padEnd(24)} ${String(chan).padStart(4)} tin  (${pt(chan)})`);
console.log(`  ${'còn lại → gọi model'.padEnd(24)} ${String(tin.length - chan).padStart(4)} tin  (${pt(tin.length - chan)})`);
await pool.end();
