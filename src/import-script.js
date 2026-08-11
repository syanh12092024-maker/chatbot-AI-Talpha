// Phân tích file quick_replies (.xlsx export từ Pancake) → sinh nháp cấu hình AI + sản phẩm.
// Không cần API — chỉ trích xuất theo luật (ảnh theo topic, giá theo regex, kịch bản gộp lại).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

// topic Pancake → nhãn ảnh của mình
const LABELS = [
  [/feedback|review|đánh giá/i, 'Feedback'],
  [/thành ph|thanh ph|ingredient|nguyên liệu/i, 'Thành phần'],
  [/hdsd|cách dùng|how to use|hướng dẫn sử/i, 'Cách dùng'],
  [/chứng nhận|fda|certif/i, 'Chứng nhận'],
];
function labelFor(topic) { for (const [re, l] of LABELS) if (re.test(topic)) return l; return 'Ảnh sản phẩm'; }
const clean = (s) => String(s || '').replace(/#\{FULL_NAME\}/g, '').replace(/\[tên khách\]/g, '').replace(/[ \t]+/g, ' ').trim();

// ─────────────────────────────────────────────────────────────────────────────
// BẢNG GÓI GIÁ — đọc nhãn ưu đãi THẲNG TỪ KỊCH BẢN, giữ nguyên tiếng Anh.
//
// Trước 11/08/2026 chỗ này chỉ quét regex lấy hai con số đầu rồi nhét vào
// price1/combo2, vứt sạch phần mô tả; kb.js sau đó dán nhãn tiếng Việt cứng
// ("Mua 1 cái" / "Combo 2 cái"). Hai hậu quả, cái sau nặng hơn cái trước:
//   1. Tiếng Việt gửi thẳng cho khách Trung Đông — vi phạm nguyên tắc #1.
//   2. Nhãn SAI SỐ LƯỢNG: "Buy 1 Get 2 FREE - 99 AED / Total: 3 PCS" thành
//      "Mua 1 cái — 99 AED", tức nói khách mua 1 trong khi thực nhận 3.
//      Đây đúng kiểu mơ hồ đã làm hỏng đơn khách Priscela Amon (xem su-co.md).
// Đo trên 29 page thật có nhãn hỏng: bản này đọc lại sạch 29/29.
// ─────────────────────────────────────────────────────────────────────────────
const CUR = 'SAR|AED|KWD|QAR|OMR|BHD';

// Chữ hoa mỹ (Mathematical Alphanumeric Symbols / fullwidth) → ASCII. Kịch bản
// Pancake hay dùng 𝗕𝗨𝗬 𝟭 để né lọc trùng của Meta; để nguyên thì nhãn không đọc được.
function deFancy(s) {
  return String(s).replace(/[\u{1D400}-\u{1D7FF}\u{FF01}-\u{FF5E}]/gu, (ch) => {
    const c = ch.codePointAt(0);
    if (c >= 0xff01 && c <= 0xff5e) return String.fromCharCode(c - 0xfee0);
    const BASES = [0x1d400, 0x1d41a, 0x1d434, 0x1d44e, 0x1d468, 0x1d482, 0x1d49c, 0x1d4b6,
      0x1d5a0, 0x1d5ba, 0x1d5d4, 0x1d5ee, 0x1d608, 0x1d622, 0x1d63c, 0x1d656, 0x1d670, 0x1d68a];
    for (let i = 0; i < BASES.length; i++) {
      const b = BASES[i];
      if (c >= b && c < b + 26) return String.fromCharCode((i % 2 ? 97 : 65) + (c - b));
    }
    if (c >= 0x1d7ce && c <= 0x1d7ff) return String((c - 0x1d7ce) % 10);
    return ch;
  });
}

// Đuôi giao hàng/COD không phải tên gói — cắt bỏ, KHÔNG loại cả dòng
// (dạng "🌈149 AED 1 set - free delivery" chiếm 10/29 page).
const TAIL = /\s*[-–—,·|]*\s*(free\s*(delivery|shipping)|cash\s*on\s*delivery|\bcod\b|libreng\s*\w+).*$/i;

export function parseOffers(text) {
  const lines = deFancy(text).split('\n');
  const byPrice = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(new RegExp(`(\\d[\\d.,]*)\\s*(${CUR})\\b|\\b(${CUR})\\s*(\\d[\\d.,]*)`, 'i'));
    if (!m) continue;
    const price = Number(String(m[1] || m[4]).replace(/[.,]/g, ''));
    if (!Number.isFinite(price) || price <= 0) continue;

    let label = lines[i]
      .replace(m[0], ' ')
      .replace(/\b(only|just|for|sale|price)\b/gi, ' ')
      .replace(/[\p{Extended_Pictographic}☀-➿️]/gu, ' ')
      .replace(TAIL, '')
      .replace(/[*_>#~`]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[\s:=+\-–—•·|]+|[\s:=+\-–—•·|]+$/g, '')
      .trim();

    // "Total: 3 PCS" ở dòng kế — cho khách biết thực nhận bao nhiêu món.
    const next = (lines[i + 1] || '').match(/total\s*:?\s*(\d+)\s*(pcs?|pieces?|boxes?|sets?|pairs?)/i);
    if (next) {
      const tot = `${next[1]} ${next[2].toLowerCase()}`;
      label = label && !new RegExp(`\\b${next[1]}\\b`).test(label) ? `${label} (${tot})` : (label || tot);
    }

    if (!/[a-z0-9]/i.test(label) || label.length > 70) continue;
    const cu = byPrice.get(price);
    if (!cu || label.length > cu.length) byPrice.set(price, label); // giữ nhãn giàu thông tin nhất
  }
  return [...byPrice.entries()].map(([price, label]) => ({ label, price })).sort((a, b) => a.price - b.price);
}

export function parsePancakeScript(base64) {
  const wb = xlsx.read(Buffer.from(base64, 'base64'), { type: 'buffer' });
  const sheet = wb.Sheets['quick_replies'] || wb.Sheets[wb.SheetNames[wb.SheetNames.length - 1]];
  if (!sheet) throw new Error('Không thấy sheet quick_replies trong file.');
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows.length) throw new Error('File rỗng.');

  // Ảnh: gom theo topic, khử trùng lặp.
  const seen = new Set(); const images = [];
  for (const r of rows) {
    const ph = String(r.photos || '').trim(); if (!ph) continue;
    const label = labelFor(r.topic || r.shortcut || '');
    for (const u of ph.split(/\s+/)) { if (u && /^https?:/.test(u) && !seen.has(u)) { seen.add(u); images.push({ url: u, label }); } }
  }

  // Giá + tiền tệ: đọc cả NHÃN GÓI, không chỉ con số (xem parseOffers ở trên).
  const allMsg = rows.map((r) => clean(r.message)).join('\n');
  const priceHits = [...allMsg.matchAll(new RegExp(`(\\d[\\d.,]*)\\s*(${CUR})\\b|\\b(${CUR})\\s*(\\d[\\d.,]*)`, 'gi'))]
    .map((m) => ({ v: String(m[1] || m[4]).replace(/[.,]/g, ''), cur: String(m[2] || m[3]).toUpperCase() }));
  const currency = priceHits[0]?.cur || 'AED';
  const tiers = parseOffers(allMsg);
  const nums = tiers.length ? tiers.map((t) => String(t.price)) : [...new Set(priceHits.map((p) => p.v))];

  // Câu chào: 2-3 dòng đầu của topic "chào".
  const chao = rows.find((r) => /chào|chao|greet|hello/i.test((r.topic || '') + (r.shortcut || '')));
  const greeting = chao ? clean(chao.message).split('\n').filter(Boolean).slice(0, 2).join(' ').slice(0, 200) : '';

  // Kịch bản: gộp các câu theo topic → AI vận dụng linh hoạt theo ngữ cảnh.
  const byTopic = new Map();
  for (const r of rows) {
    const t = (r.topic || r.shortcut || 'khác').trim();
    const m = clean(r.message); if (!m) continue;
    if (!byTopic.has(t)) byTopic.set(t, new Set());
    byTopic.get(t).add(m);
  }
  const parts = ['KỊCH BẢN GỐC (nhập từ Pancake) — AI đọc hiểu và trả lời tự nhiên theo ngữ cảnh, KHÔNG lặp máy móc:'];
  for (const [t, set] of byTopic) parts.push(`\n### ${t}\n${[...set].join('\n')}`);

  return {
    greeting, tone: '',
    salesPrompt: parts.join('\n'),
    // `tiers` là nguồn chính (nhãn tiếng Anh đúng số lượng); price1/combo2 giữ lại
    // cho dữ liệu cũ và cho dashboard bản cũ đọc được.
    product: { id: 'SP01', name: '', desc: '', currency, tiers, price1: nums[0] || '', combo2: nums[1] || '', combo3: nums[2] || '', stock: '', images },
    stats: { topics: byTopic.size, images: images.length, prices: nums.slice(0, 3), tiers: tiers.length },
  };
}
