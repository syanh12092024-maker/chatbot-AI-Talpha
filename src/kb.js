import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import { config } from './config.js';
import { fetchTabRows, fetchTabMatrix } from './sheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERRIDES_FILE = path.resolve(__dirname, '..', 'kb-overrides.json'); // sửa từ dashboard

function readOverrides() {
  try { return fs.existsSync(OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(OVERRIDES_FILE, 'utf8')) : {}; }
  catch { return {}; }
}
function writeOverrides(o) { try { fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(o, null, 2)); } catch (e) { console.error('[kb] lưu override lỗi', e.message); } }

// Hỗ trợ 2 chế độ:
//  - ĐA-PAGE: sheet "Sản phẩm theo Page" (cột Page ID) → mỗi page 1 KB riêng.
//  - 1 KB CHUNG: sheet "Sản phẩm & Giá" (file cũ) → mọi page dùng chung.
// Chính sách / FAQ / Xử lý phản đối dùng chung cho mọi page.

let pageMap = new Map();   // pageId -> { products, text, pageName }
let singleKB = null;       // dùng khi file kiểu cũ
let sharedText = '';

function rows(wb, name) {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  const r = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return r.slice(1).filter((x) => x.some((c) => String(c).trim() !== ''));
}
function num(v) {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Parsers dùng chung cho cả Excel lẫn Google Sheet (cùng layout cột).
function parsePolicies(r) { return r.map((x) => ({ topic: String(x[0]).trim(), content: String(x[1]).trim() })).filter((p) => p.topic); }
function parseFaqs(r) { return r.map((x) => ({ q: String(x[0]).trim(), a: String(x[2]).trim() })).filter((f) => f.q); }
function parseObjections(r) { return r.map((x) => ({ type: String(x[0]).trim(), says: String(x[1]).trim(), reply: String(x[2]).trim() })).filter((o) => o.type); }
function groupsFromRows(rws) {
  const groups = new Map();
  for (const r of rws) {
    const pageId = String(r[0]).trim();
    if (!pageId) continue;
    const prod = {
      id: String(r[5]).trim(), name: String(r[6]).trim(), desc: String(r[7]).trim(), variant: String(r[8]).trim(),
      price1: num(r[9]), combo2: num(r[10]), combo3: num(r[11]), currency: String(r[12]).trim() || 'AED',
      stock: num(r[13]), image: String(r[14]).trim(), landing: String(r[15]).trim(), note: String(r[16]).trim(),
    };
    if (!groups.has(pageId)) groups.set(pageId, { name: String(r[1]).trim(), market: String(r[2]).trim(), category: String(r[3]).trim(), marketer: String(r[4]).trim(), products: [] });
    if (prod.id || prod.name) groups.get(pageId).products.push(prod);
  }
  return groups;
}
function ingest({ groups, policies, faqs, objections }) {
  sharedText = buildShared(policies, faqs, objections);
  pageMap = new Map();
  for (const [pageId, g] of groups) {
    pageMap.set(pageId, { products: g.products, pageName: g.name, market: g.market, category: g.category, marketer: g.marketer, text: pageText(g.market, g.category, g.products) });
  }
  applyOverrides();
}
function pageText(market, category, products) {
  const ctx = `# BỐI CẢNH PAGE\nThị trường: ${market || '?'} · Ngành hàng: ${category || '?'}\n\n`;
  return ctx + buildProductText(products) + '\n' + sharedText;
}

// Nạp kịch bản từ Google Sheet (tab sản phẩm bắt buộc; các tab khác tùy chọn).
// Tab sản phẩm hợp lệ khi ô đầu header = "Page ID". (gviz trả tab mặc định cho
// tab không tồn tại → phải lọc bằng header, nếu không sẽ gộp nhầm dữ liệu.)
function isProductMatrix(m) {
  return Array.isArray(m) && m.length > 0 && String(m[0][0]).trim().toLowerCase() === 'page id';
}

// Thứ tự cột chuẩn (khớp groupsFromRows). Ánh xạ theo TÊN header nên tab có thể
// thêm/đổi/chèn cột (vd "Công dụng", "Thành phần") mà không vỡ dữ liệu.
const CANON_COLS = ['Page ID', 'Tên Page', 'Thị trường', 'Ngành hàng', 'Tên MKT', 'Mã SP', 'Tên SP', 'Mô tả ngắn', 'Variant', 'Giá lẻ', 'Combo 2', 'Combo 3', 'Tiền tệ', 'Tồn kho', 'Link ảnh SP', 'Link landing', 'Ghi chú'];
function normalizeMatrix(m) {
  const header = m[0].map((h) => String(h).trim().toLowerCase());
  const idx = CANON_COLS.map((name) => header.indexOf(name.toLowerCase()));
  return m.slice(1).map((row) => idx.map((i) => (i >= 0 ? (row[i] ?? '') : '')));
}

// Đọc sản phẩm: ưu tiên các tab theo thị trường (productTabs), gộp lại.
// Nếu không tab thị trường nào tồn tại → fallback tab gộp cũ (t.products).
async function fetchProductRows(id, t) {
  const tabs = Array.isArray(t.productTabs) && t.productTabs.length ? t.productTabs : [];
  let all = [];
  const okTabs = [];
  for (const name of tabs) {
    try {
      const m = await fetchTabMatrix(id, name);
      if (!isProductMatrix(m)) continue; // tab không có thật (gviz trả tab mặc định) → bỏ
      all = all.concat(normalizeMatrix(m));
      okTabs.push(name);
    } catch { /* bỏ qua */ }
  }
  if (!okTabs.length) {
    const m = await fetchTabMatrix(id, t.products); // fallback tab gộp cũ
    return isProductMatrix(m) ? normalizeMatrix(m) : [];
  }
  console.log(`[kb] Đọc sản phẩm từ tab thị trường: ${okTabs.join(', ')}`);
  return all;
}

export async function syncFromSheet(id) {
  const t = config.sheetTabs;
  const pp = await fetchProductRows(id, t);
  const [pol, fq, ob] = await Promise.all([
    fetchTabRows(id, t.policies).catch(() => []),
    fetchTabRows(id, t.faq).catch(() => []),
    fetchTabRows(id, t.obj).catch(() => []),
  ]);
  singleKB = null;
  ingest({ groups: groupsFromRows(pp), policies: parsePolicies(pol), faqs: parseFaqs(fq), objections: parseObjections(ob) });
  console.log(`[kb] Đa-page (Sheet): ${pageMap.size} page.`);
  return { mode: 'multi', pages: pageMap.size };
}

export function loadKB(kbPath = config.kbPath) {
  // File Excel nền là TÙY CHỌN. Khi deploy (VPS) chỉ dùng Google Sheet + kb-overrides.json,
  // không có file này → không sập, vẫn nạp cấu hình page từ overrides.
  if (!fs.existsSync(kbPath)) {
    console.warn(`[kb] Không có file Excel nền (${kbPath}) — dùng Google Sheet + overrides.`);
    singleKB = null; pageMap = new Map(); sharedText = '';
    applyOverrides();
    return { mode: 'no-base', pages: pageMap.size };
  }
  const wb = xlsx.readFile(kbPath);

  const policies = parsePolicies(rows(wb, 'Chính sách'));
  const faqs = parseFaqs(rows(wb, 'FAQ'));
  const objections = parseObjections(rows(wb, 'Xử lý phản đối'));
  sharedText = buildShared(policies, faqs, objections);

  const perPage = rows(wb, 'Sản phẩm theo Page');
  if (perPage.length) {
    singleKB = null;
    ingest({ groups: groupsFromRows(perPage), policies, faqs, objections });
    console.log(`[kb] Đa-page (Excel): ${pageMap.size} page.`);
    return { mode: 'multi', pages: pageMap.size };
  }

  // Fallback file cũ (1 KB chung)
  const products = rows(wb, 'Sản phẩm & Giá').map((r) => ({
    id: String(r[0]).trim(), name: String(r[1]).trim(), desc: String(r[2]).trim(), variant: String(r[3]).trim(),
    price1: num(r[4]), combo2: num(r[5]), combo3: num(r[6]), currency: String(r[7]).trim() || 'AED', stock: num(r[8]), image: String(r[9]).trim(),
  })).filter((p) => p.id);
  singleKB = { products, pageName: '', text: buildProductText(products) + '\n' + sharedText };
  pageMap = new Map();
  console.log(`[kb] 1 KB chung: ${products.length} sản phẩm.`);
  return { mode: 'single', products: products.length };
}

// Lấy KB cho page nhận tin. Có dữ liệu page → dùng; chưa có → đánh dấu noData.
// Luôn kèm `config` (lời chào/giọng điệu/hướng dẫn bán hàng riêng) để prompt dùng.
export function getKBForPage(pageId) {
  if (singleKB) return singleKB;
  const e = pageMap.get(String(pageId));
  const config = e?.config || {};
  if (e && e.products.length) return { ...e, config };
  return { products: [], pageName: e?.pageName || '', config, text: `# CHƯA CÓ SẢN PHẨM CHO PAGE NÀY\nHãy xin lỗi và chuyển nhân viên (gọi tool handoff_human).\n${sharedText}`, noData: true };
}

export function getPageList() {
  if (singleKB) return [{ id: 'default', name: '(KB chung)' }];
  return [...pageMap].map(([id, v]) => ({ id, name: v.pageName, market: v.market || '', category: v.category || '', marketer: v.marketer || '', products: v.products.length }));
}

// ----- Sửa KB từ dashboard (lưu overlay kb-overrides.json) -----
function applyOverrides() {
  const ov = readOverrides();
  for (const [pageId, data] of Object.entries(ov)) {
    if (!data?.products && !data?.config) continue;
    const cur = pageMap.get(String(pageId)) || { pageName: '', products: [] };
    if (data.products) { cur.products = data.products; cur.text = pageText(cur.market, cur.category, data.products); }
    if (data.config) cur.config = data.config;
    pageMap.set(String(pageId), cur);
  }
}

// Ảnh sản phẩm: chuẩn hoá về mảng [{url,label}]. Tương thích cả field `image` cũ (1 ảnh).
export function productImages(p) {
  if (Array.isArray(p.images) && p.images.length) {
    return p.images.map((im) => ({ url: String(im.url || '').trim(), label: String(im.label || '').trim() })).filter((im) => im.url);
  }
  if (p.image) return [{ url: String(p.image).trim(), label: 'Ảnh sản phẩm' }];
  return [];
}

// Cấu hình AI theo page (lời chào / giọng điệu / hướng dẫn bán hàng riêng).
export function getPageConfig(pageId) {
  const c = pageMap.get(String(pageId))?.config || readOverrides()[String(pageId)]?.config || {};
  return { greeting: c.greeting || '', tone: c.tone || '', salesPrompt: c.salesPrompt || '' };
}
export function updatePageConfig(pageId, config) {
  const clean = {
    greeting: String(config?.greeting || '').trim(),
    tone: String(config?.tone || '').trim(),
    salesPrompt: String(config?.salesPrompt || '').trim(),
  };
  const ov = readOverrides();
  ov[String(pageId)] = { ...(ov[String(pageId)] || {}), config: clean };
  writeOverrides(ov);
  const cur = pageMap.get(String(pageId)) || { pageName: '', products: [] };
  cur.config = clean;
  pageMap.set(String(pageId), cur);
  return { ok: true };
}

export function getPageProductsRaw(pageId) {
  // Kèm tiers đã chuẩn hoá để form hiển thị bảng gói giá (kể cả dữ liệu cũ price1/combo2/combo3).
  return (pageMap.get(String(pageId))?.products || []).map((p) => ({ ...p, images: productImages(p), tiers: productTiers(p) }));
}

export function updatePageProducts(pageId, products) {
  const clean = (products || []).map((p) => {
    const images = productImages(p);
    const tiers = (Array.isArray(p.tiers) ? p.tiers : [])
      .map((t) => ({ qty: Number(t.qty) || 1, price: numOrNull(t.price) }))
      .filter((t) => t.price != null && t.price > 0).sort((a, b) => a.qty - b.qty);
    const byQty = (q) => (tiers.find((t) => t.qty === q) || {}).price ?? null;
    return {
      id: String(p.id || '').trim() || 'SP01', name: String(p.name || '').trim(), desc: String(p.desc || '').trim(),
      variant: String(p.variant || '').trim(),
      tiers, // bảng gói giá mới
      // Tương thích ngược: suy price1/combo2/combo3 từ tiers theo số lượng.
      price1: byQty(1) ?? (tiers[0]?.price ?? null), combo2: byQty(2), combo3: byQty(3),
      currency: String(p.currency || 'AED').trim(),
      images, image: images[0]?.url || '', // image: giữ 1 ảnh chính cho tương thích ngược
    };
  }).filter((p) => p.name || p.desc || (p.tiers && p.tiers.length) || (p.images && p.images.length));
  const ov = readOverrides();
  ov[String(pageId)] = { ...(ov[String(pageId)] || {}), products: clean }; // GIỮ config đã lưu
  writeOverrides(ov);
  const cur = pageMap.get(String(pageId)) || { pageName: '', products: [] };
  cur.products = clean;
  cur.text = pageText(cur.market, cur.category, clean);
  pageMap.set(String(pageId), cur);
  return { ok: true, products: clean.length };
}
function numOrNull(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

// Chuẩn hoá BẢNG GÓI GIÁ: [{qty, price}] (mua bao nhiêu cái = giá bao nhiêu).
// Ưu tiên p.tiers (thiết kế mới); fallback price1/combo2/combo3 (dữ liệu cũ) để tương thích.
export function productTiers(p) {
  if (Array.isArray(p.tiers) && p.tiers.length) {
    return p.tiers.map((t) => ({ qty: Number(t.qty) || 1, price: numOrNull(t.price) }))
      .filter((t) => t.price != null && t.price > 0).sort((a, b) => a.qty - b.qty);
  }
  const out = [];
  if (p.price1 != null && p.price1 > 0) out.push({ qty: 1, price: p.price1 });
  if (p.combo2 != null && p.combo2 > 0) out.push({ qty: 2, price: p.combo2 });
  if (p.combo3 != null && p.combo3 > 0) out.push({ qty: 3, price: p.combo3 });
  return out;
}

function buildProductText(products) {
  const out = ['# SẢN PHẨM & GIÁ (nguồn sự thật duy nhất — không bịa)'];
  if (!products.length) out.push('(chưa điền)');
  for (const p of products) {
    const head = [`- [${p.id}]${p.name ? ' ' + p.name : ''}`]; if (p.variant) head.push(`(phân loại: ${p.variant})`); if (p.desc) head.push(`— ${p.desc}`);
    out.push(head.join(' '));
    const pr = productTiers(p).map((t) => `${t.qty} cái: ${t.price} ${p.currency}`);
    if (pr.length) out.push(`    Giá — ${pr.join(' | ')}`);
    const imgs = productImages(p);
    if (imgs.length) {
      const byLabel = imgs.map((im) => im.label || 'Ảnh SP');
      out.push(`    Ảnh có sẵn (dùng tool send_product_image để gửi): ${[...new Set(byLabel)].join(', ')}`);
    }
  }
  return out.join('\n');
}

function buildShared(policies, faqs, objections) {
  const out = [];
  out.push('# CHÍNH SÁCH');
  for (const p of policies) out.push(`- ${p.topic}: ${p.content}`);
  out.push('\n# FAQ');
  for (const f of faqs) out.push(`- Hỏi: ${f.q}\n  Đáp: ${f.a}`);
  out.push('\n# XỬ LÝ PHẢN ĐỐI');
  for (const o of objections) out.push(`- ${o.type} (khách: "${o.says}") → ${o.reply}`);
  return out.join('\n');
}
