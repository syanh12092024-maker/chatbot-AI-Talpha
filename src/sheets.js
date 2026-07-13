import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

// Đọc Google Sheet công khai qua endpoint CSV (gviz). Lưu Sheet ID ở sheet.json.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHEET_FILE = path.resolve(__dirname, '..', 'sheet.json');

let sheetId = config.googleSheetId || '';
let sheetUrl = ''; // link gốc người dùng dán (giữ nguyên gid để nút mở đúng tab)
try {
  if (fs.existsSync(SHEET_FILE)) {
    const j = JSON.parse(fs.readFileSync(SHEET_FILE, 'utf8'));
    sheetId = j.id || sheetId;
    sheetUrl = j.url || '';
  }
} catch {}

export function getSheetId() { return sheetId; }
// Ưu tiên link gốc (đủ gid). Nếu chỉ có id thì dựng link /edit.
export function getSheetUrl() {
  if (sheetUrl) return sheetUrl;
  return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : '';
}
export function setSheetId(idOrUrl) {
  sheetId = extractSheetId(idOrUrl);
  sheetUrl = /^https?:\/\//i.test(String(idOrUrl || '')) ? String(idOrUrl).trim() : '';
  try { fs.writeFileSync(SHEET_FILE, JSON.stringify({ id: sheetId, url: sheetUrl }, null, 2)); } catch (e) { console.error('[sheet] lưu lỗi', e.message); }
  return sheetId;
}
export function extractSheetId(s) {
  const m = String(s || '').match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : String(s || '').trim();
}

// Lấy toàn bộ 1 tab (GỒM dòng tiêu đề) dạng mảng-các-mảng.
// LƯU Ý: gviz khi tab KHÔNG tồn tại vẫn trả 200 + nội dung tab ĐẦU TIÊN.
// → Người gọi phải tự kiểm tra header để biết tab có thật hay không.
export async function fetchTabMatrix(id, tabName) {
  // headers=1: ép gviz coi ĐÚNG 1 dòng đầu là tiêu đề. Nếu không, khi tab có cột lạ
  // (vd thêm "Công dụng"), gviz tự đoán sai số dòng header → dữ liệu dồn cục.
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.trim().startsWith('<')) {
    throw new Error(`Không đọc được tab "${tabName}". Hãy chia sẻ Sheet ở chế độ "Bất kỳ ai có đường liên kết → Người xem".`);
  }
  return parseCsv(text);
}

// Lấy 1 tab đã bỏ dòng tiêu đề (dùng cho các tab dùng chung: Chính sách/FAQ/...).
export async function fetchTabRows(id, tabName) {
  return (await fetchTabMatrix(id, tabName)).slice(1);
}

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
