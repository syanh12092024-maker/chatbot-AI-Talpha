import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

// Quản lý NHIỀU System Token (nhiều app Meta) + failover.
// - Một page có thể được nhiều token "nhìn thấy" (nếu page kết nối nhiều app).
// - getPageToken ưu tiên source thuộc token còn KHỎE → app bị FB khóa thì page vẫn chạy bằng app khác.
// - Token lưu ở tokens.json (dashboard quản lý), seed từ META_SYSTEM_TOKEN nếu trống.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_FILE = path.resolve(__dirname, '..', 'tokens.json');

let tokens = [];          // [{ id, label, token, healthy }]
let pageMap = new Map();  // pageId -> { name, sources: [{ tokenId, token }] }
let lastLoaded = 0;

function nowSafe() { try { return Date.now(); } catch { return 0; } }
function graph(p) { return `https://graph.facebook.com/${config.graphVersion}/${p}`; }

function loadTokensFile() {
  try { if (fs.existsSync(TOKENS_FILE)) tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); }
  catch { tokens = []; }
  if (!Array.isArray(tokens)) tokens = [];
  if (!tokens.length && config.metaSystemToken) {
    tokens = [{ id: 'env', label: 'Token .env', token: config.metaSystemToken, healthy: true }];
    saveTokensFile();
  }
}
function saveTokensFile() {
  try { fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2)); } catch (e) { console.error('[tokens] lưu lỗi', e.message); }
}

export function listTokens() {
  return tokens.map((t) => ({ id: t.id, label: t.label, healthy: t.healthy !== false, tail: '…' + String(t.token).slice(-4) }));
}
export function addToken({ label, token }) {
  const id = 't' + (tokens.length + 1) + '_' + String(token).slice(-4);
  tokens.push({ id, label: label || id, token, healthy: true });
  saveTokensFile();
  return id;
}
export function removeToken(id) { tokens = tokens.filter((t) => t.id !== id); saveTokensFile(); }
export function setTokenHealthy(id, ok) { const t = tokens.find((x) => x.id === id); if (t) { t.healthy = ok; saveTokensFile(); } }
function isHealthy(id) { const t = tokens.find((x) => x.id === id); return !!t && t.healthy !== false; }

// Gom page từ 1 edge (me/accounts, owned_pages, client_pages) — theo phân trang.
async function collectPagesFrom(url, next, tk) {
  let count = 0, guard = 0;
  while (url && guard++ < 200) {
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw Object.assign(new Error(data.error.message), { fb: data.error });
    for (const p of data.data || []) {
      if (!p.id || !p.access_token) continue;
      const e = next.get(String(p.id)) || { name: p.name || '', sources: [] };
      if (!e.sources.some((s) => s.tokenId === tk.id)) e.sources.push({ tokenId: tk.id, token: p.access_token });
      if (p.name) e.name = p.name;
      next.set(String(p.id), e);
      count++;
    }
    url = data.paging?.next || null;
  }
  return count;
}

export async function loadPageTokens() {
  loadTokensFile();
  if (!tokens.length) { console.warn('[pages] Chưa có System Token nào.'); return 0; }
  const next = new Map();
  for (const tk of tokens) {
    let healthy = true;
    try {
      // Cách tin cậy: liệt kê qua Business (owned_pages + client_pages) — cần scope business_management.
      // me/accounts thường BÁO THIẾU với System User nên chỉ dùng làm fallback.
      let usedBusiness = false;
      // Business-id: ưu tiên khai báo sẵn trong tokens.json (tk.businesses), vì me/businesses
      // thường trả rỗng với System User. Nếu trống thì thử me/businesses.
      let bizIds = Array.isArray(tk.businesses) ? tk.businesses.map(String).filter(Boolean) : [];
      if (!bizIds.length) {
        const bizRes = await fetch(graph(`me/businesses?fields=id&limit=100&access_token=${tk.token}`));
        const bizData = await bizRes.json();
        if (!bizData.error && Array.isArray(bizData.data)) bizIds = bizData.data.map((b) => String(b.id));
        else if (bizData.error) console.warn(`[pages] token "${tk.label}" me/businesses lỗi: ${bizData.error.message}`);
      }
      for (const bid of bizIds) {
        for (const edge of ['owned_pages', 'client_pages']) {
          try {
            await collectPagesFrom(graph(`${bid}/${edge}?fields=id,name,access_token&limit=100&access_token=${tk.token}`), next, tk);
            usedBusiness = true;
          } catch (e) { console.warn(`[pages] business ${bid}/${edge}: ${e.message}`); }
        }
      }
      // Fallback (hoặc bổ sung) qua me/accounts.
      await collectPagesFrom(graph(`me/accounts?fields=id,name,access_token&limit=100&access_token=${tk.token}`), next, tk);
      if (!usedBusiness) console.warn('[pages] Nên thêm quyền business_management vào token để lấy ĐỦ page.');
    } catch (e) { healthy = false; console.warn(`[pages] token "${tk.label}" lỗi: ${e.message}`); }
    tk.healthy = healthy;
  }
  saveTokensFile();
  pageMap = next;
  lastLoaded = nowSafe();
  const ok = tokens.filter((t) => t.healthy !== false).length;
  console.log(`[pages] ${pageMap.size} page từ ${ok}/${tokens.length} token khỏe.`);
  return pageMap.size;
}

// Token để gửi cho page — ưu tiên source khỏe (failover khi 1 app bị khóa).
export function getPageToken(pageId) {
  const e = pageMap.get(String(pageId));
  if (e) {
    const live = e.sources.find((s) => isHealthy(s.tokenId)) || e.sources[0];
    if (live) return live.token;
  }
  return config.pageAccessToken || null;
}
// Gửi lỗi do token hỏng → đánh dấu token để lần sau né.
export function reportSendFailure(pageId, badToken) {
  const e = pageMap.get(String(pageId));
  const s = e?.sources.find((x) => x.token === badToken);
  if (s) setTokenHealthy(s.tokenId, false);
}

export function getStore() { return pageMap; }
export function pageCount() { return pageMap.size; }
export function lastLoadedAt() { return lastLoaded; }
export function getPageMeta(pageId) {
  const e = pageMap.get(String(pageId));
  return e ? { name: e.name, tokenIds: e.sources.map((s) => s.tokenId), redundancy: e.sources.length } : null;
}
