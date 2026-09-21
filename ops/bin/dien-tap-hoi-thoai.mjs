#!/usr/bin/env node
// DIỄN TẬP TRÊN HỘI THOẠI THẬT — bot xử lý từng lượt khách, KHÔNG gửi một chữ nào.
//
// Trả lời câu hỏi: «một lần chat với khách tốn bao nhiêu, và bot ĐỊNH nói gì».
//
// ═══ CÁI GÌ LÀ ĐO THẬT, CÁI GÌ LÀ ƯỚC — ĐỪNG TRỘN ═══════════════════════════════════
//   · lớp 0 đồng   → CÂU CHỮ THẬT. Đây chính là chuỗi sẽ gửi đi, lấy từ kịch bản LIVE.
//   · lượt gọi model → prompt THẬT (`buildSystem` + `buildContextMessages`, đúng hàm bot
//     dùng), số token ƯỚC bằng `context.js#estimateTokens` (3,3 ký tự/token, hệ số đo
//     trên chính tin thật của hệ). Nội dung câu trả lời thì KHÔNG có — muốn có phải gọi
//     model thật, và lúc này chưa nhà cung cấp nào còn credit.
//   · token RA     → ước theo độ dài câu mẫu của chính page (xem `--ra`), vì cửa gửi
//     chặn tin >6 dòng nên câu trả lời thật nằm cùng khoảng đó.
//
// Tiền tính bằng ĐÚNG công thức của hệ (`economics.js#usdOf` + `config.aiPrices`), không
// tự chế bảng giá thứ hai.
//
// CHỈ GET sang Pancake. Số điện thoại/email bị che trước khi in.
//
// Chạy:
//   DEVENV=<.env> node ops/bin/dien-tap-hoi-thoai.mjs --page <id> [--so 5] [--ra 60]
import fs from 'node:fs';
import pg from 'pg';
import { rapKb } from '../../src/chat/rap-prompt.js';
import { fastLane } from '../../src/fast-lane.js';
import { lopTuKhoa } from '../../src/chat/lop-tu-khoa.js';
import { buildSystem } from '../../src/prompts.js';
import { buildContextMessages, estimateTokens, emptyProfile, hydrateProfile } from '../../src/context.js';
import { extractMoney, allowedPrices } from '../../src/outbound-guard.js';
import { config } from '../../src/config.js';

const arg = (t, md) => {
  const i = process.argv.indexOf(t);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md;
};
const pageIdFb = arg('--page', '');
const soHoiThoai = Number(arg('--so', 5));
const tokenRa = Number(arg('--ra', 60));
// Hội thoại chỉ có 1 tin khách không dạy được gì về chất lượng tư vấn — phần lớn luồng
// của page này là Botcake bắn broadcast. Lọc lấy hội thoại khách CÓ NÓI.
const toiThieu = Number(arg('--min', 3));
const quetToiDa = Number(arg('--quet', 60));
if (!pageIdFb || !process.env.DEVENV) {
  console.error('Dùng: DEVENV=<.env> node ops/bin/dien-tap-hoi-thoai.mjs --page <id> [--so 5] [--ra 60]');
  process.exit(2);
}

const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, 'utf8').split('\n')
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
  }));
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || '')) {
  console.error('Chỉ chạy trên PostgreSQL local.'); process.exit(2);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3 });
const { rows: [trang] } = await pool.query('SELECT id, team_id, ten FROM page WHERE page_id = $1', [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const kb = await rapKb(pool, { teamId: String(trang.team_id), pageIdText: pageIdFb });

const { docTokenSong } = await import('../../src/token-pancake.js');
const [tok] = await docTokenSong(pool);
if (!tok) { console.error('Không có token Pancake nào đang bật.'); process.exit(1); }

// ─── che PII trước khi in ────────────────────────────────────────────────────
const che = (s) => String(s || '')
  .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '<EMAIL>')
  .replace(/[+(]?\d[\d\s().-]{6,}\d/g, '<SĐT>');
const gon = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const GET = async (u) => {
  const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
  return r.json().catch(() => ({}));
};

// ─── tiền: ĐÚNG công thức của hệ ─────────────────────────────────────────────
const P = config.aiPrices;
const usdOf = (b) => (b.tin * P.in + b.cread * P.cache + b.cwrite * (P.cacheWrite ?? P.in) + b.tout * P.out) / 1e6;
const vnd = (usd) => Math.round(usd * P.usdVnd);
const dong = (n) => n.toLocaleString('vi-VN') + 'đ';

// Khối system KHÔNG đổi giữa các lượt của cùng một page ⇒ nó là phần được cache.
const giaOk = allowedPrices(kb.products?.length ? kb : { products: (kb.products || []) });
const heThong = buildSystem(kb);
const tokenHeThong = estimateTokens(heThong.map((b) => b.text).join('\n'));

const dsTho = [];
for (let t = 1; dsTho.length < quetToiDa && t <= 4; t++) {
  const j = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&page_number=${t}`);
  dsTho.push(...(j.conversations || []));
}
const dsConv = dsTho.slice(0, quetToiDa);
console.log(`PAGE ${pageIdFb} — ${trang.ten}`);
console.log(`Khối system (CORE + kịch bản + KB): ${tokenHeThong} token · phần được CACHE`);
console.log(`Giá đang dùng (config.aiPrices · nhà "${config.aiProvider}"): vào $${P.in}/M · đọc cache $${P.cache}/M · ghi cache $${P.cacheWrite}/M · ra $${P.out}/M · ${P.usdVnd}đ/$`);
console.log(`Token RA giả định mỗi câu trả lời: ${tokenRa} (đổi bằng --ra)\n`);

const tong = { tin: 0, cread: 0, cwrite: 0, tout: 0, luot: 0, goiModel: 0, mien: 0 };
let soHt = 0;

for (const c of dsConv) {
  const cust = (c.customers || [])[0];
  if (!cust?.id) continue;
  const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${cust.id}`);
  const ds = (jm.messages || []).slice().reverse();   // Pancake trả mới→cũ
  const soTinKhach = ds.filter((m) => String(m?.from?.id) !== String(pageIdFb)
    && gon(m.original_message || m.message || '')).length;
  if (soTinKhach < toiThieu) continue;
  if (soHt >= soHoiThoai) break;
  soHt += 1;

  console.log('─'.repeat(92));
  console.log(`HỘI THOẠI ${soHt} · ${ds.length} tin`);
  console.log('─'.repeat(92));

  // Lịch sử phải là tin THÔ của Pancake: `cleanHistory` đọc `m.from.id`/`m.original_message`
  // và bóc template Botcake ra khỏi prompt (`isAutomationTemplate`). Truyền {role,text} vào
  // là nó lọc sạch — và số token vào sẽ y hệt nhau ở mọi lượt, dấu hiệu đang đo nhầm.
  const lichSu = [];
  const daDung = new Set();       // usedLanes: một mẫu chỉ bắn 1 lần cho một khách
  const prof = emptyProfile();
  let luotAi = 0;
  let tinAiCuoi = '';
  let daCache = false;            // lượt gọi model ĐẦU của hội thoại này ghi cache
  const soHT = { tin: 0, cread: 0, cwrite: 0, tout: 0, goiModel: 0, mien: 0 };

  for (const m of ds) {
    const laPage = String(m?.from?.id) === String(pageIdFb);
    const chu = gon(m.original_message || m.message || '');
    if (laPage) {
      if (!chu) continue;                       // ảnh/sticker rỗng — không phải một lượt nói
      lichSu.push(m); tinAiCuoi = chu; luotAi += 1;
      // Tin ĐÃ GỬI THẬT có nêu giá NGOÀI bảng giá? Đây là lệch giá giữa hai cái miệng
      // cùng nói với một khách — bắt được thì nói ra, đừng để lẫn vào hội thoại.
      const sai = [...new Set(extractMoney(chu))].filter((n) => giaOk.size && !giaOk.has(n));
      console.log(`  🧑‍💼 SALE/BOT (thật) │ ${che(chu).slice(0, 130)}`);
      if (sai.length) console.log(`     ⚠️  LỆCH GIÁ: tin này nêu ${sai.join(', ')} — bảng giá là ${[...giaOk].join(', ')}`);
      continue;
    }
    if (!chu) continue;
    console.log(`  👤 KHÁCH           │ ${che(chu)}`);
    // Vào lịch sử ngay: `buildContextMessages` tự bỏ các lượt `user` ở đuôi (đó chính là
    // cụm tin đang xử lý), nên tin này không lọt vào ngữ cảnh của chính nó.
    lichSu.push(m);
    tong.luot += 1;

    // Thứ tự PHẢI GIỐNG `handler-v3.js`: lớp từ-khoá ở dòng 430, Fast Lane ở dòng 478.
    // Đảo lại là đo một cỗ máy khác cái đang chạy.
    let xong = null;
    const k = lopTuKhoa({ text: chu, kb, profile: prof });   // ① lớp từ khoá (0 đồng)
    if (k?.handled) xong = { lane: 'tu-khoa:' + (k.rule || k.lane || '?'), reply: k.reply, ly: k.reason };
    else {
      const f = fastLane({ text: chu, kb, aiTurns: luotAi, lastAiText: tinAiCuoi, usedLanes: daDung, pageId: pageIdFb });
      if (f?.handled) xong = { lane: f.lane, reply: f.reply, ly: f.reason };
    }

    if (xong) {
      soHT.mien += 1; tong.mien += 1;
      if (xong.reply) {
        console.log(`     └─ 🤖 ĐỊNH GỬI (0 đồng · ${xong.lane}):`);
        for (const d of String(xong.reply).split('\n')) console.log(`        │ ${d}`);
      } else {
        console.log(`     └─ 🤖 IM LẶNG (0 đồng · ${xong.lane}) — ${xong.ly}`);
      }
      continue;
    }

    // ③ Gọi model — dựng prompt THẬT theo ĐÚNG trình tự của `handler-v3.js:289-609`:
    //    lịch sử TRƯỚC tin này → hydrate hồ sơ một lần → dựng khung → đẩy tin khách vào cuối.
    if (!prof.hydratedAt && lichSu.length) hydrateProfile(lichSu, pageIdFb, prof);
    const { messages, kept, dropped } = buildContextMessages({ prof, msgs: lichSu, pageId: pageIdFb });
    messages.push({ role: 'user', content: chu });
    const tokenTin = estimateTokens(JSON.stringify(messages));
    const b = { tin: tokenTin, cread: daCache ? tokenHeThong : 0, cwrite: daCache ? 0 : tokenHeThong, tout: tokenRa };
    daCache = true;
    for (const k of ['tin', 'cread', 'cwrite', 'tout']) { soHT[k] += b[k]; tong[k] += b[k]; }
    soHT.goiModel += 1; tong.goiModel += 1;
    console.log(`     └─ 🧠 GỌI MODEL — vào ${b.tin} (giữ ${kept} tin, bỏ ${dropped}) + ${b.cwrite ? `GHI cache ${b.cwrite}` : `đọc cache ${b.cread}`} + ra ~${b.tout} = ${dong(vnd(usdOf(b)))}`);
  }

  const u = usdOf(soHT);
  console.log(`  ╰─ HỘI THOẠI ${soHt}: ${soHT.mien + soHT.goiModel} lượt khách · ${soHT.mien} miễn phí · ${soHT.goiModel} gọi model · TỔNG ${dong(vnd(u))}`);
  if (soHT.mien + soHT.goiModel) console.log(`     ${dong(Math.round(vnd(u) / (soHT.mien + soHT.goiModel)))}/tin khách\n`);
}

console.log('═'.repeat(92));
const uTong = usdOf(tong);
console.log(`TỔNG ${soHt} HỘI THOẠI · ${tong.luot} lượt khách`);
console.log(`  miễn phí (lớp 0 đồng): ${tong.mien} lượt (${(tong.mien * 100 / Math.max(1, tong.luot)).toFixed(1)}%)`);
console.log(`  gọi model            : ${tong.goiModel} lượt`);
console.log(`  token: vào ${tong.tin} · ghi cache ${tong.cwrite} · đọc cache ${tong.cread} · ra ${tong.tout}`);
console.log(`  TIỀN : ${dong(vnd(uTong))}  ($${uTong.toFixed(4)})`);
console.log(`  ⇒ ${dong(Math.round(vnd(uTong) / Math.max(1, tong.luot)))}/tin khách · ${dong(Math.round(vnd(uTong) / Math.max(1, soHt)))}/hội thoại`);

// Trên đây mỗi hội thoại bị tính MỘT lần ghi cache — cận TRÊN. Thực tế khối system của một
// page giống hệt nhau ở mọi khách, nên cache dùng chung: chỉ lượt gọi đầu trong mỗi cửa sổ
// cache phải ghi, các lượt sau chỉ ĐỌC. Nói cả hai để không ai tưởng con số trên là cố định.
const chung = { ...tong, cwrite: tokenHeThong, cread: tong.cread + tong.cwrite - tokenHeThong };
const uChung = usdOf(chung);
console.log(`  Nếu cache DÙNG CHUNG giữa các hội thoại (ghi 1 lần): ${dong(vnd(uChung))} `
  + `⇒ ${dong(Math.round(vnd(uChung) / Math.max(1, tong.luot)))}/tin khách`);
console.log(`\n  Khoảng thật nằm giữa hai con số: ${dong(Math.round(vnd(uChung) / Math.max(1, tong.luot)))} – ${dong(Math.round(vnd(uTong) / Math.max(1, tong.luot)))}/tin khách.`);
await pool.end();
