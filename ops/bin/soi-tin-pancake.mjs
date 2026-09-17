// SOI TIN PANCAKE — đo xem payload THẬT có trả định danh người gửi không.
//
// Spec chính thức (`https://developer.pancake.biz/openapi/openapi.yaml`, tải 17/09/2026) khai
// schema `Message.from` có SÁU trường định danh ngoài `id`: `name` · `email` · `uid`
// (UUID nhân viên Pancake) · `admin_id` · `admin_name` · `ai_generated` · `is_automated`.
// `src/pancake.js#pkGetMessages` chỉ đọc `from.id`, tức đang vứt hết phần còn lại.
//
// NHƯNG spec đó tả `https://pages.fm/api/public_api/v1` + `page_access_token`, còn code chạy
// trên `https://pages.fm/api/v1` + `access_token` (JWT tài khoản). Hai đường khác nhau, nên
// KHÔNG được suy ra đường đang dùng cũng trả đủ — phải đo. Lệnh này đo:
//   · mặc định : đường CODE ĐANG DÙNG (api/v1 + JWT)
//   · `--pat`  : thêm đường CÔNG KHAI (public_api/v1 + page_access_token) để đối chiếu
//
// Có định danh thật ⇒ thay được `looksHuman()` (src/conv-owner.js:63), chỗ đang đoán 82,6%
// tin phía page bằng độ dài + giọng quảng cáo + đếm emoji.
//
// ⛔ CHỈ GET. Không một lượt POST/DELETE nào — chạy được cả khi `PANCAKE_READONLY=1`.
// 🔒 Che trước khi in: tên khách, số điện thoại, email. Token không bao giờ được in ra.
//
//   node ops/bin/soi-tin-pancake.mjs                          # liệt kê page token thấy được
//   node ops/bin/soi-tin-pancake.mjs --page <id>              # tự chọn hội thoại có tin phía page
//   node ops/bin/soi-tin-pancake.mjs --page <id> --conv <id>  # soi đúng một hội thoại
//   ... --token <JWT>     lấy token thẳng từ dòng lệnh thay vì .env
//   ... --pat <token>     đối chiếu thêm đường public_api (Cài đặt → Công cụ sinh token này)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://pages.fm/api/v1';
const co = (ten) => { const i = process.argv.indexOf('--' + ten); return i > 0 ? process.argv[i + 1] : ''; };

/** Token: dòng lệnh → biến môi trường → .env của bản local dev → .env gốc. */
function layToken() {
  if (co('token')) return co('token').trim();
  if (process.env.PANCAKE_TOKEN) return process.env.PANCAKE_TOKEN.trim();
  const nguon = [];
  try { nguon.push(path.join(JSON.parse(fs.readFileSync(path.join(root, '.local-dev/current.json'), 'utf8')).dir, '.env')); } catch { /* chưa dựng bản dev */ }
  nguon.push(path.join(root, '.env'));
  for (const f of nguon) {
    try {
      const t = dotenv.parse(fs.readFileSync(f))?.PANCAKE_TOKEN?.trim();
      if (!t) continue;
      console.log(`# token đọc từ ${path.relative(root, f)}`);
      // `.env` gốc là cấu hình của BẢN CHẠY THẬT. Đọc thì không hại gì (lệnh này chỉ GET),
      // nhưng người chạy phải BIẾT mình đang cầm token nào, không để nó lặng lẽ rơi vào.
      if (f === path.join(root, '.env')) console.log('# ⚠️  đây là token của bản chạy thật, không phải bản local dev');
      return t;
    } catch { /* thiếu file thì thử nguồn kế */ }
  }
  throw Error('Không tìm thấy PANCAKE_TOKEN. Nạp bằng `npm run local:token <JWT>` hoặc truyền `--token <JWT>`.');
}

const tok = layToken();
async function get(duong) {
  const res = await fetch(`${API}${duong}${duong.includes('?') ? '&' : '?'}access_token=${tok}`);
  const j = await res.json().catch(() => ({}));
  if (res.status >= 400) throw Error(`GET ${duong.split('?')[0]} → HTTP ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

/* ─── CHE ─────────────────────────────────────────────────────────────────────────────
 * Payload thô có tên thật, số thật của khách thật. Bản in này để đọc và dán vào phiếu,
 * nên che TRƯỚC khi in, không phải "nhớ xoá sau". */
let TEN_KHACH = [];
const che = (v) => {
  let t = String(v ?? '');
  for (const n of TEN_KHACH) if (n.length > 2) t = t.split(n).join('<TÊN>');
  return t.replace(/[\w.+-]+@[\w.-]+\.\w+/g, '<EMAIL>').replace(/[+(]?\d[\d\s().-]{6,}\d/g, '<SĐT>');
};
const cheSau = (o) => JSON.parse(che(JSON.stringify(o)));

/* ─── ĐỊNH DANH NGƯỜI GỬI ─────────────────────────────────────────────────────────────
 * KHAI: bảy trường spec hứa trong `Message.from`. Đo từng cái một, không gộp «có/không».
 * DÒ  : lưới rộng bắt trường spec không khai mà payload vẫn trả — bỏ sót ở đây là kết
 *       luận sai «Pancake không trả», rồi để nguyên đống heuristic đang đoán. */
const KHAI = [
  ['from.name', 'tên người gửi'],
  ['from.email', 'email người gửi'],
  ['from.uid', 'UUID nhân viên Pancake'],
  ['from.admin_id', 'id tài khoản nhân viên đã gửi'],
  ['from.admin_name', 'TÊN nhân viên đã gửi ← nhãn hiện trong inbox'],
  ['from.ai_generated', 'tin do AI sinh'],
  ['from.is_automated', 'tin gửi tự động (POS / luật tự động)'],
];
const NGHI = /(from|admin|staff|sender|sent_by|user|by_|_by|app|bot|account|employee|creator|agent|owner|assign|name)/i;
function khoaPhang(o, tien = '') {
  const ra = [];
  for (const [k, v] of Object.entries(o || {})) {
    const duong = tien ? `${tien}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) ra.push(...khoaPhang(v, duong));
    else ra.push([duong, v]);
  }
  return ra;
}

const pageId = co('page');
const dsPage = await get('/pages');
// Token sai/hết hạn: Pancake trả 200 kèm thân không có `categorized`. Không bắt ở đây thì
// lệnh in "0 page" — nghe như token đúng mà tài khoản trống, sai hẳn hướng debug.
if (!dsPage.categorized) throw Error(`Pancake từ chối token: ${JSON.stringify(dsPage).slice(0, 200)}`);
const pages = dsPage.categorized.activated || [];
if (!pageId) {
  console.log(`\n${pages.length} page token này thấy được — chọn một rồi chạy lại với --page <id>:\n`);
  for (const p of pages) console.log(`  ${p.id}  ${p.name || ''}`);
  process.exit(0);
}

const hoiThoai = (await get(`/pages/${pageId}/conversations?page_number=1`)).conversations || [];
if (!hoiThoai.length) throw Error(`Page ${pageId} không trả hội thoại nào (token có quyền trên page này không?).`);
console.log(`\n# page ${pageId} · ${hoiThoai.length} hội thoại ở trang đầu`);

/** Hội thoại đáng soi = có tin CẢ HAI phía, ưu tiên nhiều tin phía page (nhiều nguồn gửi). */
async function chonHoiThoai() {
  const chiDinh = co('conv');
  const ds = chiDinh ? hoiThoai.filter((c) => String(c.id) === chiDinh) : hoiThoai.slice(0, 8);
  if (chiDinh && !ds.length) throw Error(`Không thấy hội thoại ${chiDinh} ở trang đầu — thử bỏ --conv để tự chọn.`);
  let tot = null;
  for (const c of ds) {
    const cust = (c.customers || [])[0]?.id;
    if (!cust) continue;
    const tin = (await get(`/pages/${pageId}/conversations/${c.id}/messages?customer_id=${cust}`)).messages || [];
    const cuaPage = tin.filter((m) => String(m?.from?.id) === String(pageId)).length;
    if (chiDinh) return { c, tin };
    if (cuaPage >= 2 && tin.length > cuaPage && (!tot || cuaPage > tot.cuaPage)) tot = { c, tin, cuaPage };
    if (tot && tot.cuaPage >= 4) break;
  }
  if (!tot) throw Error('Không hội thoại nào ở trang đầu có đủ tin hai phía — chỉ định bằng --conv <id>.');
  return tot;
}

const { c, tin } = await chonHoiThoai();
TEN_KHACH = [c.from?.name, ...(c.customers || []).map((k) => k.name)].filter(Boolean).map(String);
console.log(`# hội thoại ${c.id} · ${tin.length} tin\n`);

console.log('── KHOÁ CỦA OBJECT HỘI THOẠI ' + '─'.repeat(50));
console.log('  ' + Object.keys(c).sort().join(', ') + '\n');

console.log('── TỪNG TIN ' + '─'.repeat(66));
for (const m of tin) {
  const laPage = String(m?.from?.id) === String(pageId);
  const chu = che(m.original_message || m.message || '').replace(/\s+/g, ' ').slice(0, 58);
  console.log(`  ${String(m.inserted_at || '').slice(0, 19)}  ${laPage ? 'PAGE ' : 'khách'}  ${chu || '(ảnh/đính kèm)'}`);
}

const moiKhoa = new Map();
for (const m of tin) for (const [k, v] of khoaPhang(m)) if (!moiKhoa.has(k) || moiKhoa.get(k) == null) moiKhoa.set(k, v);
console.log('\n── MỌI KHOÁ XUẤT HIỆN TRONG messages[] ' + '─'.repeat(39));
console.log('  ' + [...moiKhoa.keys()].sort().join(', '));

console.log('\n── BẢY TRƯỜNG SPEC HỨA, ĐƯỜNG api/v1 CÓ TRẢ KHÔNG ' + '─'.repeat(27));
let duDinhDanh = 0;
for (const [k, ynghia] of KHAI) {
  const co = moiKhoa.has(k);
  if (co) duDinhDanh++;
  const giaTri = co ? che(JSON.stringify(moiKhoa.get(k))).slice(0, 40) : '';
  console.log(`  ${co ? '✓' : '·'} ${k.padEnd(20)} ${co ? giaTri.padEnd(42) : '(không có)'.padEnd(42)} ${ynghia}`);
}

console.log('\n── KHOÁ KHẢ NGHI KHÁC (spec không khai mà payload vẫn trả) ' + '─'.repeat(19));
const themVao = [...moiKhoa].filter(([k]) => NGHI.test(k) && !KHAI.some(([t]) => t === k));
if (!themVao.length) console.log('  (không có)');
for (const [k, v] of themVao.sort()) console.log(`  ${k.padEnd(28)} = ${che(JSON.stringify(v)).slice(0, 90)}`);

const mauPage = tin.filter((m) => String(m?.from?.id) === String(pageId)).slice(-3);
console.log('\n── PAYLOAD THÔ, 3 TIN PHÍA PAGE GẦN NHẤT (đã che) ' + '─'.repeat(28));
console.log(JSON.stringify(cheSau(mauPage), null, 2));
/* ─── ĐỐI CHIẾU ĐƯỜNG CÔNG KHAI ───────────────────────────────────────────────────────
 * Đường api/v1 trả thiếu KHÔNG có nghĩa Pancake không có dữ liệu — chỉ nghĩa là đường ấy
 * không trả. Có `--pat` thì hỏi luôn đường spec tả, để biết nên đổi đường hay chịu thua. */
const pat = co('pat');
if (pat) {
  const res = await fetch(`https://pages.fm/api/public_api/v1/pages/${pageId}/conversations/${c.id}/messages?page_access_token=${pat}`);
  const j = await res.json().catch(() => ({}));
  const tinCK = j.messages || [];
  console.log(`\n── ĐƯỜNG public_api/v1 (${tinCK.length} tin, HTTP ${res.status}) ` + '─'.repeat(30));
  if (!tinCK.length) console.log('  ' + che(JSON.stringify(j)).slice(0, 240));
  else {
    const khoaCK = new Map();
    for (const m of tinCK) for (const [k, v] of khoaPhang(m)) if (!khoaCK.has(k) || khoaCK.get(k) == null) khoaCK.set(k, v);
    for (const [k, ynghia] of KHAI) {
      const coK = khoaCK.has(k);
      console.log(`  ${coK ? '✓' : '·'} ${k.padEnd(20)} ${(coK ? che(JSON.stringify(khoaCK.get(k))).slice(0, 40) : '(không có)').padEnd(42)} ${ynghia}`);
    }
  }
}

console.log(`
KẾT: đường api/v1 (code đang dùng) trả ${duDinhDanh}/${KHAI.length} trường định danh.
  · có \`from.admin_name\` → đọc thẳng nhãn nhân viên, bỏ được phần đoán của looksHuman();
  · thiếu, mà \`--pat\` cho thấy public_api CÓ → việc cần làm là ĐỔI ĐƯỜNG, không phải đoán giỏi hơn;
  · cả hai đều thiếu → nhãn chỉ sống trong UI Pancake; ở lại với thẻ + Sổ AI.
Gửi tin thì ngược lại, spec đã khai sẵn: thân \`reply_inbox\` nhận \`sender_id\` (UUID nhân viên,
lấy từ GET /pages/{page_id}/users) — đặt tên người gửi KHÔNG cần token riêng của người đó.`);
