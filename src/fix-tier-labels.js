// Dựng lại BẢNG GÓI GIÁ cho các page đã nhập kịch bản TRƯỚC bản vá 11/08/2026.
//
// Vì sao cần: bộ nhập cũ chỉ quét regex lấy hai con số đầu rồi nhét vào
// price1/combo2 và vứt mô tả gói; kb.js dán nhãn tiếng Việt cứng ("Mua 1 cái").
// Fast Lane in thẳng nhãn đó cho khách Trung Đông — vừa sai ngôn ngữ (nguyên
// tắc #1) vừa SAI SỐ LƯỢNG ("Mua 1 cái" trong khi gói 99 AED thực nhận 3 pcs).
// Bản vá chữa bộ nhập, nhưng dữ liệu đã lưu thì phải dựng lại — đó là việc của
// file này: đọc lại nhãn từ chính `salesPrompt` (kịch bản gốc Pancake còn nguyên).
//
//   npm run fix-labels              → chạy khô, chỉ in đối chiếu, KHÔNG ghi
//   npm run fix-labels -- --apply   → ghi qua đúng đường lưu của dashboard
//   npm run fix-labels -- --apply <pageId>...   → chỉ ghi các page chỉ định
//
// AN TOÀN: chỉ động vào page có nhãn tiếng Việt; bỏ qua page đọc lại được ít gói
// hơn hiện có; và TỪ CHỐI ghi nếu bộ giá thay đổi ngoài dự kiến — trừ khi thêm
// --allow-price-fix, vì đổi giá là việc phải có người nhìn tận mắt.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { parseOffers } from './import-script.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KB_FILE = path.join(ROOT, 'kb-overrides.json');
const PORT = process.env.PORT || 3100;

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ALLOW_PRICE = argv.includes('--allow-price-fix');
const ONLY = argv.filter((a) => /^\d{6,}$/.test(a));

// Nhãn do bộ nhập cũ sinh ra, hoặc người gõ tay bằng tiếng Việt.
const VN = /\b(Mua|cái|tặng|hộp|tuýp|lọ|gói)\b|Combo \d+ cái/i;

const kb = JSON.parse(fs.readFileSync(KB_FILE, 'utf8'));
const auth = 'Basic ' + Buffer.from(`${process.env.ADMIN_USER || ''}:${process.env.ADMIN_PASS || ''}`).toString('base64');

let dinh = 0, ghi = 0, boQua = 0, canNguoi = 0;
for (const [id, p] of Object.entries(kb)) {
  const prods = p.products || [];
  const cur = prods[0]?.tiers || [];
  if (!cur.some((t) => VN.test(t.label || ''))) continue;
  dinh++;

  const moi = parseOffers(p.config?.salesPrompt || '');
  if (!moi.length || moi.length < cur.length || moi.some((t) => VN.test(t.label))) {
    boQua++;
    console.log(`\n⛔ ${id} — BỎ QUA (đọc lại được ${moi.length}/${cur.length} gói) → sửa tay trên dashboard`);
    continue;
  }

  // Giá phải giữ nguyên. Lệch giá nghĩa là bộ nhập cũ đã lưu sai (vd "8,9 KWD"
  // thành 89) — sửa được, nhưng phải có người duyệt bằng --allow-price-fix.
  const giaCu = cur.map((t) => Number(t.price)).filter(Boolean);
  const giaMoi = moi.map((t) => Number(t.price));
  const lechGia = giaCu.filter((v) => !giaMoi.some((x) => Math.abs(x - v) < 0.001));

  console.log(`\n${id}`);
  console.log('   CŨ : ' + cur.map((t) => `${t.label} = ${t.price}`).join(' | '));
  console.log('   MỚI: ' + moi.map((t) => `${t.label} = ${t.price}`).join(' | '));
  if (lechGia.length) console.log(`   ⚠️  GIÁ ĐỔI: ${lechGia.join(', ')} không còn trong bảng mới`);

  if (!APPLY) continue;
  if (ONLY.length && !ONLY.includes(id)) continue;
  if (lechGia.length && !ALLOW_PRICE) { canNguoi++; console.log('   → BỎ QUA: giá đổi, cần --allow-price-fix'); continue; }

  const products = prods.map((pr, i) => (i === 0 ? { ...pr, tiers: moi } : pr));
  const r = await fetch(`http://localhost:${PORT}/admin/api/kb/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ products }),
  });
  const body = (await r.text()).slice(0, 120);
  if (r.ok) ghi++;
  console.log(`   → lưu: ${r.status} ${body}`);
}

console.log(`\n══ ${dinh} page dính nhãn tiếng Việt · ${ghi} đã dựng lại · ${boQua} phải sửa tay · ${canNguoi} chờ duyệt đổi giá ══`);
if (!APPLY) console.log('(chạy khô — chưa ghi gì. Thêm --apply để ghi.)');
