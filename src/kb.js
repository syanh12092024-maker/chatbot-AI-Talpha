import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';
import { config } from './config.js';
import { fetchTabRows, fetchTabMatrix } from './sheets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Đường dẫn cho phép ĐÈ BẰNG ENV để test chạy trên thư mục tạm, không đụng dữ liệu thật.
const OVERRIDES_FILE = process.env.KB_OVERRIDES_FILE || path.resolve(__dirname, '..', 'kb-overrides.json'); // sửa từ dashboard
const SCRIPT_DIR = process.env.SCRIPT_VERSIONS_DIR || path.resolve(__dirname, '..', 'script-versions'); // M02 · lịch sử kịch bản

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
// URL phải là link CÔNG KHAI (Facebook/Pancake tự tải về) → link tương đối "/uploads/..."
// (do dashboard lưu khi chưa đặt PUBLIC_URL) được ghép thêm host, nếu không ảnh sẽ không bao giờ gửi được.
function absUrl(u) {
  const s = String(u || '').trim();
  if (s.startsWith('/') && config.publicUrl) return config.publicUrl + s;
  return s;
}
export function productImages(p) {
  if (Array.isArray(p.images) && p.images.length) {
    return p.images.map((im) => ({ url: absUrl(im.url), label: String(im.label || '').trim() })).filter((im) => im.url);
  }
  if (p.image) return [{ url: absUrl(p.image), label: 'Ảnh sản phẩm' }];
  return [];
}

// Cấu hình AI theo page (lời chào / giọng điệu / hướng dẫn bán hàng riêng).
//
// SÁU TRƯỜNG, hai nhóm KHÁC HẲN NHAU về mức độ nguy hiểm — validator (M02) đối xử khác nhau:
//   · NỘI BỘ  (tone, salesPrompt)              — chỉ dẫn cho model đọc, viết tiếng Việt là ĐÚNG.
//   · GỬI KHÁCH (greeting, fastLane*)           — bắn NGUYÊN VĂN cho khách, lọt tiếng Việt là lỗi nặng.
// fastLane* đã được `fast-lane.js` đọc sẵn (kb.config.fastLanePrice/Ship/Howto) từ trước nhưng
// CHƯA CÓ ĐƯỜNG NÀO ĐIỀN — updatePageConfig cũ cắt mất 3 trường này. Nay giữ lại.
export const SCRIPT_FIELDS = ['tone', 'greeting', 'salesPrompt', 'fastLanePrice', 'fastLaneShip', 'fastLaneHowto'];
export const CUSTOMER_FACING_FIELDS = ['greeting', 'fastLanePrice', 'fastLaneShip', 'fastLaneHowto'];

function cleanConfig(config) {
  const out = {};
  for (const k of SCRIPT_FIELDS) out[k] = String(config?.[k] || '').trim();
  return out;
}

export function getPageConfig(pageId) {
  const c = pageMap.get(String(pageId))?.config || readOverrides()[String(pageId)]?.config || {};
  return cleanConfig(c);
}

// Ghi bản LIVE: kb-overrides.json (nguồn sự thật đang chạy) + pageMap trong RAM.
// Ghi RAM ngay tại đây là lý do "sửa kịch bản có hiệu lực ≤60s, không cần restart".
function writeLiveConfig(pageId, clean) {
  const ov = readOverrides();
  ov[String(pageId)] = { ...(ov[String(pageId)] || {}), config: clean };
  writeOverrides(ov);
  const cur = pageMap.get(String(pageId)) || { pageName: '', products: [] };
  cur.config = clean;
  pageMap.set(String(pageId), cur);
}

// Đường vào CŨ (form kịch bản trên admin.html, POST /admin/api/kb/:pageId/config).
// Vẫn ghi thẳng LIVE như trước để không phá luồng đang chạy, NHƯNG nay đóng thêm một
// phiên bản vào lịch sử — nếu không thì sửa qua form cũ là mất dấu bản trước, đúng cái
// M02 sinh ra để chữa.
export function updatePageConfig(pageId, config, updatedBy = 'dashboard') {
  const clean = cleanConfig(config);
  writeLiveConfig(pageId, clean);
  recordVersion(pageId, clean, { updatedBy, status: 'LIVE', note: 'sửa trực tiếp (form cũ)' });
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
      // Nhãn dự phòng phải KHỚP productTiers ('Buy N'). Đây là đường GHI: nhãn
      // tiếng Việt lọt vào đây là nằm vĩnh viễn trong kb-overrides.json, rồi
      // Fast Lane in thẳng cho khách Trung Đông.
      .map((t) => ({ label: String(t.label != null ? t.label : (t.qty ? `Buy ${t.qty}` : '')).trim(), price: numOrNull(t.price) }))
      .filter((t) => t.price != null && t.price > 0);
    return {
      id: String(p.id || '').trim() || 'SP01', name: String(p.name || '').trim(), desc: String(p.desc || '').trim(),
      variant: String(p.variant || '').trim(),
      tiers, // bảng gói giá (mô tả tự do + giá)
      price1: tiers[0]?.price ?? null, // giữ 1 giá đại diện cho code cũ (nếu còn đọc)
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

// Chuẩn hoá BẢNG GÓI GIÁ: [{label, price}]. label là MÔ TẢ TỰ DO ưu đãi
// (vd "Buy 1 Get 2 FREE (3 pcs)", "BUY 1 TAKE 1"...). Giữ thứ tự người dùng nhập.
// Ưu tiên p.tiers (mới); fallback price1/combo2/combo3 hoặc tiers kiểu {qty} cũ để tương thích.
//
// NHÃN PHẢI LÀ TIẾNG ANH — Fast Lane in thẳng nhãn này cho khách (fast-lane.js
// priceLines), và AI cũng nhại lại khi liệt kê gói. Nhãn tiếng Việt cứng ở đây
// từng gửi "Mua 1 cái — 99 AED" cho khách Trung Đông (sửa 11/08/2026).
export function productTiers(p) {
  if (Array.isArray(p.tiers) && p.tiers.length) {
    return p.tiers.map((t) => ({
      label: String(t.label != null ? t.label : (t.qty ? `Buy ${t.qty}` : '')).trim(),
      price: numOrNull(t.price),
    })).filter((t) => t.price != null && t.price > 0);
  }
  const out = [];
  if (p.price1 != null && p.price1 > 0) out.push({ label: 'Buy 1', price: p.price1 });
  if (p.combo2 != null && p.combo2 > 0) out.push({ label: 'Combo 2', price: p.combo2 });
  if (p.combo3 != null && p.combo3 > 0) out.push({ label: 'Combo 3', price: p.combo3 });
  return out;
}

function buildProductText(products) {
  const out = ['# SẢN PHẨM & GIÁ (nguồn sự thật duy nhất — không bịa)'];
  if (!products.length) out.push('(chưa điền)');
  for (const p of products) {
    const head = [`- [${p.id}]${p.name ? ' ' + p.name : ''}`]; if (p.variant) head.push(`(phân loại: ${p.variant})`); if (p.desc) head.push(`— ${p.desc}`);
    out.push(head.join(' '));
    const pr = productTiers(p).map((t) => `${t.label ? t.label + ': ' : ''}${t.price} ${p.currency}`);
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

// ═════════════════════════════════════════════════════════════════════════════
// M02 · KHO PHIÊN BẢN KỊCH BẢN — script-versions/<pageId>.json
// Spec: docs/v2/01-TANG-NHAP-LIEU.md § M02 · schema 00-TONG-QUAN.md §6.2
//
// KIẾN TRÚC CÓ CHỦ Ý: `kb-overrides.json` VẪN là nguồn LIVE duy nhất mà
// `getKBForPage()` → `buildSystem()` đọc. Kho phiên bản chỉ ĐỨNG BÊN CẠNH để giữ
// lịch sử. Làm ngược lại (bắt luồng chat đọc script-versions/) là thay tim khi
// bệnh nhân đang chạy — 39 page production đang sống bằng đường cũ.
//
// LUẬT KHÔNG ĐƯỢC PHÁ: không bao giờ XOÁ hay GHI ĐÈ một phiên bản đã lưu.
// Mọi thay đổi đều đẻ ra version mới. "Khôi phục v6" = clone v6 thành v8, không
// phải xoá v7. Kịch bản là công marketer viết tay, mất là mất thật.
// ═════════════════════════════════════════════════════════════════════════════

export const SCRIPT_STATUSES = ['DRAFT', 'REVIEW', 'LIVE', 'ARCHIVED'];

// Ước lượng token. Cùng hệ số 3.2 ký tự/token với `outbound-guard.js` để hai nơi
// không nói hai con số khác nhau về cùng một đoạn chữ. Đây là ƯỚC LƯỢNG, không
// phải tokenizer thật — đủ để canh ngưỡng phình prompt, đừng dùng để tính tiền.
export const approxTokens = (s) => Math.ceil(String(s || '').length / 3.2);

// Tổng độ dài kịch bản = 3 trường nạp vào prompt (xem prompts.js/buildSystem).
// fastLane* KHÔNG tính: chúng là câu mẫu bắn thẳng cho khách, không vào prompt.
export function scriptTokens(cfg) {
  return approxTokens([cfg?.tone, cfg?.greeting, cfg?.salesPrompt].filter(Boolean).join('\n'));
}

export function hasScript(cfg) { return !!(cfg?.greeting && cfg?.salesPrompt); }

const scriptFile = (pageId) => path.join(SCRIPT_DIR, `${String(pageId).replace(/[^0-9A-Za-z_-]/g, '')}.json`);
const sameConfig = (a, b) => SCRIPT_FIELDS.every((k) => String(a?.[k] || '') === String(b?.[k] || ''));

function emptyDoc(pageId) { return { pageId: String(pageId), live: null, versions: [] }; }

function writeScriptDoc(doc) {
  try {
    fs.mkdirSync(SCRIPT_DIR, { recursive: true });
    fs.writeFileSync(scriptFile(doc.pageId), JSON.stringify(doc, null, 2));
  } catch (e) { console.error(`[script] lưu lịch sử page ${doc.pageId} lỗi:`, e.message); }
}

// Thời điểm coi là "lần sửa cuối" của kịch bản có SẴN TỪ TRƯỚC M02: lấy mtime của
// kb-overrides.json. Không chính xác từng page (cả file chung 1 mtime) nhưng là mốc
// THẬT duy nhất còn lại — chế ra Date.now() sẽ làm SCRIPT_STALE báo sai mọi page.
function overridesMtime() {
  try { return fs.statSync(OVERRIDES_FILE).mtime.toISOString(); } catch { return null; }
}

function readScriptDoc(pageId) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(scriptFile(pageId), 'utf8')); }
  catch { doc = null; }
  if (!doc || !Array.isArray(doc.versions)) doc = emptyDoc(pageId);
  doc.pageId = String(pageId);

  // BACKFILL một lần: 37/38 page đã có kịch bản trong kb-overrides.json từ trước khi
  // có kho phiên bản. Nhận bản đang chạy làm v1 LIVE thay vì coi như page trống —
  // nếu không, lần "Lưu nháp" đầu tiên sẽ trông như thể bản của marketer chưa từng tồn tại.
  if (!doc.versions.length) {
    const cur = getPageConfig(pageId);
    if (SCRIPT_FIELDS.some((k) => cur[k])) {
      doc.versions.push({
        version: 1, status: 'LIVE',
        updatedBy: 'kb-overrides (bản đang chạy trước M02)',
        updatedAt: overridesMtime() || new Date().toISOString(),
        note: 'tự nhận diện từ kb-overrides.json', config: cur,
      });
      doc.live = 1;
      writeScriptDoc(doc);
    }
  }
  return doc;
}

// Đẻ một phiên bản mới. Trả về bản ghi vừa tạo, hoặc bản LIVE hiện tại nếu nội dung
// y hệt (bấm Lưu mà không sửa gì thì đừng làm phình lịch sử).
function recordVersion(pageId, clean, { updatedBy = 'dashboard', status = 'DRAFT', note = '' } = {}) {
  const doc = readScriptDoc(pageId);
  const head = doc.versions[doc.versions.length - 1];
  if (head && head.status === status && sameConfig(head.config, clean)) return head;

  const entry = {
    version: (head?.version || 0) + 1,
    status, updatedBy: String(updatedBy || 'dashboard'),
    updatedAt: new Date().toISOString(), note: String(note || ''), config: clean,
  };
  if (status === 'LIVE') {
    for (const v of doc.versions) if (v.status === 'LIVE') v.status = 'ARCHIVED';
    doc.live = entry.version;
  }
  doc.versions.push(entry);
  writeScriptDoc(doc);
  return entry;
}

// ---- API cho router M02 ----

export function getScriptDoc(pageId) {
  const doc = readScriptDoc(pageId);
  const liveEntry = doc.versions.find((v) => v.version === doc.live) || null;
  // Bản đang soạn = DRAFT/REVIEW mới nhất; chưa có thì lấy LIVE làm điểm xuất phát.
  const pending = [...doc.versions].reverse().find((v) => v.status === 'DRAFT' || v.status === 'REVIEW') || null;
  return {
    pageId: String(pageId),
    live: liveEntry,
    draft: pending,
    liveConfig: getPageConfig(pageId),
    versions: doc.versions.map(({ config, ...meta }) => ({ ...meta, tokens: scriptTokens(config) })).reverse(),
  };
}

export function getScriptVersion(pageId, version) {
  return readScriptDoc(pageId).versions.find((v) => v.version === Number(version)) || null;
}

export function saveDraft(pageId, config, { updatedBy = 'dashboard', note = '' } = {}) {
  return recordVersion(pageId, cleanConfig(config), { updatedBy, status: 'DRAFT', note });
}

export function sendForReview(pageId, version, { updatedBy = 'dashboard' } = {}) {
  const doc = readScriptDoc(pageId);
  const v = doc.versions.find((x) => x.version === Number(version));
  if (!v) return { ok: false, error: `không có phiên bản v${version}` };
  if (v.status === 'LIVE' || v.status === 'ARCHIVED') return { ok: false, error: `v${version} đã ${v.status}, không gửi duyệt lại được — hãy Lưu nháp trước` };
  v.status = 'REVIEW'; v.reviewRequestedBy = String(updatedBy); v.reviewRequestedAt = new Date().toISOString();
  writeScriptDoc(doc);
  return { ok: true, version: v };
}

// XUẤT BẢN — chỗ DUY NHẤT đổi bản LIVE. Validator chạy ở tầng gọi (admin-scripts.js);
// hàm này chỉ nhận `validated` đã pass để không có đường vòng nào ghi LIVE mà bỏ qua kiểm.
export function publishVersion(pageId, version, { updatedBy = 'dashboard', validated = false } = {}) {
  if (!validated) return { ok: false, error: 'nội bộ: publishVersion cần validator chạy trước' };
  const doc = readScriptDoc(pageId);
  const v = doc.versions.find((x) => x.version === Number(version));
  if (!v) return { ok: false, error: `không có phiên bản v${version}` };
  for (const x of doc.versions) if (x.status === 'LIVE') x.status = 'ARCHIVED';
  v.status = 'LIVE'; v.publishedBy = String(updatedBy); v.publishedAt = new Date().toISOString();
  doc.live = v.version;
  writeScriptDoc(doc);
  writeLiveConfig(pageId, v.config); // ← có hiệu lực ngay, không cần restart
  return { ok: true, version: v };
}

// KHÔI PHỤC — clone bản cũ thành version MỚI rồi xuất bản. Bản cũ giữ nguyên tại chỗ.
// Sổ AI vì thế ghi số version mới (spec §M02: khôi phục v6 → scriptVersion 8).
export function restoreVersion(pageId, version, { updatedBy = 'dashboard', validated = false } = {}) {
  const src = getScriptVersion(pageId, version);
  if (!src) return { ok: false, error: `không có phiên bản v${version}` };
  const entry = recordVersion(pageId, cleanConfig(src.config), {
    updatedBy, status: 'DRAFT', note: `khôi phục từ v${src.version}`,
  });
  return publishVersion(pageId, entry.version, { updatedBy, validated });
}

export function listScriptPages() {
  const ids = new Set(Object.keys(readOverrides()));
  for (const id of pageMap.keys()) ids.add(String(id));
  try { for (const f of fs.readdirSync(SCRIPT_DIR)) if (f.endsWith('.json')) ids.add(f.slice(0, -5)); }
  catch { /* chưa có thư mục lịch sử */ }
  return [...ids];
}

// ═════════════════════════════════════════════════════════════════════════════
// L8 · BẢNG KỊCH BẢN 2 CỘT — tab `Kịch bản tự động` trên Google Sheet
// Spec: docs/v2/07-KICH-BAN-TU-DONG.md §1 (bước 1)
//
// ⚠️ PHẦN NÀY CHỈ THÊM. Không hàm nào ở trên bị sửa (luật §3 của 08-SONG-SONG.md:
// `kb.js` là điểm nóng — L3 vòng 1 đã đụng, L8 chỉ được THÊM).
//
// Ánh xạ cột theo TÊN header (giống CANON_COLS ở trên) chứ không theo vị trí, để
// marketer chèn/đổi cột mà bảng không vỡ. Ba cột đo (`Lượt dùng`/`Hỏi lại ngay`/
// `Chốt sau đó`) KHÔNG đọc ở đây: chúng do hệ thống ghi ra, đọc ngược vào sẽ tạo
// vòng dữ liệu (số đo cũ ghi đè số đo mới).
// ═════════════════════════════════════════════════════════════════════════════

export const RULES_TAB = process.env.SCRIPT_RULES_TAB || 'Kịch bản tự động';

const RULE_COLS = {
  pageId: 'Page ID', situation: 'Tình huống', keywords: 'Từ khoá bắt',
  reply: 'Câu trả lời tự động', aiHint: 'Gợi ý cho AI',
  condition: 'Điều kiện', priority: 'Ưu tiên', status: 'Trạng thái', source: 'Nguồn',
};

// gviz trả tab ĐẦU TIÊN khi tab không tồn tại (xem sheets.js) → phải tự soi header.
// Hai cột bắt buộc để nhận diện: "Tình huống" và "Từ khoá bắt". Không dùng "Page ID"
// làm dấu nhận vì tab sản phẩm cũng có cột đó — nhận nhầm là nạp cả bảng sản phẩm
// vào làm luật kịch bản.
function isRulesMatrix(m) {
  if (!Array.isArray(m) || !m.length) return false;
  const h = m[0].map((x) => String(x).trim().toLowerCase());
  return h.includes(RULE_COLS.situation.toLowerCase()) && h.includes(RULE_COLS.keywords.toLowerCase());
}

/**
 * Đọc tab `Kịch bản tự động` → mảng bản ghi THÔ (chưa validate, chưa chuẩn hoá luật).
 * Chuẩn hoá + validator nằm ở `rule-store.js` để `kb.js` không phình thêm trách nhiệm.
 *
 * @param {string} id       Sheet ID (người gọi truyền vào — `kb.js` không giữ sheet id)
 * @param {string} tabName  Tên tab (mặc định RULES_TAB)
 * @returns {Promise<{ok:boolean, rows:Array, reason?:string}>} — KHÔNG ném khi thiếu tab.
 */
export async function fetchScriptRuleRows(id, tabName = RULES_TAB) {
  if (!id) return { ok: false, rows: [], reason: 'chưa kết nối Google Sheet' };
  let m;
  try { m = await fetchTabMatrix(id, tabName); }
  catch (e) { return { ok: false, rows: [], reason: e.message }; }
  if (!isRulesMatrix(m)) {
    return { ok: false, rows: [], reason: `Sheet chưa có tab "${tabName}" (hoặc thiếu cột "${RULE_COLS.situation}" / "${RULE_COLS.keywords}")` };
  }
  const header = m[0].map((x) => String(x).trim().toLowerCase());
  const at = Object.fromEntries(Object.entries(RULE_COLS).map(([k, name]) => [k, header.indexOf(name.toLowerCase())]));
  const cell = (row, k) => (at[k] >= 0 ? String(row[at[k]] ?? '').trim() : '');
  const rows = m.slice(1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((r, i) => ({
      row: i + 2, // số dòng thật trên Sheet (1 = header) — để báo lỗi chỉ đúng chỗ
      pageId: cell(r, 'pageId'), situation: cell(r, 'situation'), keywords: cell(r, 'keywords'),
      reply: cell(r, 'reply'), aiHint: cell(r, 'aiHint'), condition: cell(r, 'condition'),
      priority: cell(r, 'priority'), status: cell(r, 'status'), source: cell(r, 'source'),
    }));
  return { ok: true, rows, tab: tabName };
}
