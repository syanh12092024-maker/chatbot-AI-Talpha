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

  // Giá + tiền tệ: regex "109 SAR" ...
  const allMsg = rows.map((r) => clean(r.message)).join('\n');
  const priceHits = [...allMsg.matchAll(/(\d[\d.,]*)\s*(SAR|AED|KWD|QAR|OMR|BHD)\b/gi)].map((m) => ({ v: m[1].replace(/[.,]/g, ''), cur: m[2].toUpperCase() }));
  const currency = priceHits[0]?.cur || 'AED';
  const nums = [...new Set(priceHits.map((p) => p.v))];

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
    product: { id: 'SP01', name: '', desc: '', currency, price1: nums[0] || '', combo2: nums[1] || '', combo3: '', stock: '', images },
    stats: { topics: byTopic.size, images: images.length, prices: nums.slice(0, 3) },
  };
}
