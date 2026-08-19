// Gộp BẢN GHI SẢN PHẨM TRÙNG do hai bộ nhập cùng ghi một món.
//
// Vì sao cần: bộ nhập cũ và bộ nhập mới (bản vá 11/08/2026) cùng ghi SP01 thành
// HAI bản trong kb-overrides.json. Bản cũ giữ nhãn tiếng Việt ("Mua 1 cái"),
// bản mới giữ nhãn tiếng Anh đúng số lượng. `buildProductText` duyệt HẾT
// products nên prompt hiện ra hai bảng giá cho cùng một món:
//     Giá — Buy 1 get 1 Free (Total 2 Items): 109 SAR | ...
//     Giá — Mua 1 cái: 109 SAR | ...
// Hai hậu quả: lọt tiếng Việt tới khách Trung Đông (nguyên tắc #1), và tạo đúng
// kiểu mơ hồ hai-bảng-giá đã làm hỏng đơn khách Priscela Amon (07/08/2026).
//
// KHÔNG xoá thẳng bản trùng. Đo thật lúc chạy: trên page 1209280405604866 bản CŨ
// mang 8 ảnh (5 feedback + 1 chứng nhận) còn bản MỚI chỉ có 2 — xoá là mất ảnh
// bán hàng. Nên: giữ tiers của bản KHÔNG có nhãn tiếng Việt, hợp nhất ảnh cả hai.
//
//   npm run fix-dup              → chạy khô, chỉ in đối chiếu, KHÔNG ghi
//   npm run fix-dup -- --apply   → ghi qua đúng đường lưu của dashboard
//   npm run fix-dup -- --apply <pageId>...   → chỉ ghi các page chỉ định
//
// AN TOÀN: chỉ gộp khi bộ giá của các bản trùng KHỚP NHAU. Lệch giá nghĩa là hai
// sản phẩm khác nhau chứ không phải bản trùng — để nguyên cho người xem.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KB_FILE = process.env.KB_OVERRIDES_FILE || path.join(ROOT, 'kb-overrides.json');
const PORT = process.env.PORT || 3100;

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const ONLY = argv.filter((a) => /^\d{6,}$/.test(a));
const auth = 'Basic ' + Buffer.from(`${process.env.ADMIN_USER || ''}:${process.env.ADMIN_PASS || ''}`).toString('base64');

const VN = /\b(Mua|cái|tặng|hộp|tuýp|lọ|gói)\b|Combo \d+ cái/i;

const kb = JSON.parse(fs.readFileSync(KB_FILE, 'utf8'));
let dinh = 0, ghi = 0, canNguoi = 0;

for (const [id, page] of Object.entries(kb)) {
  const prods = page.products || [];
  if (prods.length < 2) continue;

  // Gom theo mã sản phẩm. Bản GIỮ là bản KHÔNG có nhãn tiếng Việt.
  const nhom = new Map();
  for (const p of prods) {
    const k = String(p.id || 'SP01');
    if (!nhom.has(k)) nhom.set(k, []);
    nhom.get(k).push(p);
  }
  if ([...nhom.values()].every((ds) => ds.length === 1)) continue;
  dinh++;
  console.log(`\n${id} — ${prods.length} bản ghi / ${nhom.size} mã sản phẩm`);

  const ketQua = [];
  let doiChiTiet = false;
  for (const [k, ds] of nhom) {
    if (ds.length === 1) { ketQua.push(ds[0]); continue; }

    const giu = ds.find((p) => !(p.tiers || []).some((t) => VN.test(t.label || '')));
    if (!giu) {
      console.log(`   ⛔ ${k}: MỌI bản đều có nhãn tiếng Việt → sửa tay trên dashboard`);
      ketQua.push(...ds); canNguoi++; continue;
    }
    const bo = ds.filter((p) => p !== giu);

    const bo3 = (p) => (p.tiers || []).map((t) => Number(t.price)).sort((a, b) => a - b).join(',');
    const lech = bo.filter((p) => bo3(p) !== bo3(giu));
    if (lech.length) {
      console.log(`   ⛔ ${k}: bản trùng có BỘ GIÁ KHÁC (${lech.map(bo3).join(' & ')} ≠ ${bo3(giu)}) → không phải bản trùng, để người xem`);
      ketQua.push(...ds); canNguoi++; continue;
    }

    // Hợp nhất ảnh: thứ tự bản giữ trước, rồi ảnh lạ của bản bỏ. Dedup theo url.
    const anh = []; const thay = new Set();
    for (const p of [giu, ...bo]) {
      for (const im of p.images || []) {
        if (!im?.url || thay.has(im.url)) continue;
        thay.add(im.url); anh.push({ url: im.url, label: im.label || 'Ảnh sản phẩm' });
      }
    }
    console.log(`   ✎ ${k}: gộp ${ds.length} bản → 1`);
    console.log(`      giữ : ${(giu.tiers || []).map((t) => `${t.label} = ${t.price}`).join(' | ')}`);
    console.log(`      bỏ  : ${bo.map((p) => (p.tiers || []).map((t) => `${t.label} = ${t.price}`).join(' | ')).join(' ;; ')}`);
    console.log(`      ảnh : ${(giu.images || []).length} + ${bo.reduce((n, p) => n + (p.images || []).length, 0)} → ${anh.length} (dedup, không mất tấm nào)`);
    ketQua.push({ ...giu, images: anh, image: anh[0]?.url || giu.image || '' });
    doiChiTiet = true;
  }

  if (!APPLY || !doiChiTiet) continue;
  if (ONLY.length && !ONLY.includes(id)) continue;
  const r = await fetch(`http://localhost:${PORT}/admin/api/kb/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: auth },
    body: JSON.stringify({ products: ketQua }),
  });
  if (r.ok) ghi++;
  console.log(`   → lưu: ${r.status} ${(await r.text()).slice(0, 120)}`);
}

console.log(`\n══ ${dinh} page có bản ghi trùng · ${ghi} đã gộp · ${canNguoi} phải xem tay ══`);
if (!APPLY) console.log('(chạy khô — chưa ghi gì. Thêm --apply để ghi.)');
