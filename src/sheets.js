import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

// Đọc Google Sheet công khai qua endpoint CSV (gviz). Lưu Sheet ID ở sheet.json.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHEET_FILE = path.resolve(__dirname, '..', 'sheet.json');

let sheetId = config.googleSheetId || '';
try { if (fs.existsSync(SHEET_FILE)) sheetId = JSON.parse(fs.readFileSync(SHEET_FILE, 'utf8')).id || sheetId; } catch {}

export function getSheetId() { return sheetId; }
export function getSheetUrl() { return sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : ''; }
export function setSheetId(idOrUrl) {
  sheetId = extractSheetId(idOrUrl);
  try { fs.writeFileSync(SHEET_FILE, JSON.stringify({ id: sheetId }, null, 2)); } catch (e) { console.error('[sheet] lưu lỗi', e.message); }
  return sheetId;
}
export function extractSheetId(s) {
  const m = String(s || '').match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : String(s || '').trim();
}

// Lấy 1 tab dưới dạng mảng-các-mảng (đã bỏ dòng tiêu đề), khớp với loader Excel.
export async function fetchTabRows(id, tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.trim().startsWith('<')) {
    throw new Error(`Không đọc được tab "${tabName}". Hãy chia sẻ Sheet ở chế độ "Bất kỳ ai có đường liên kết → Người xem".`);
  }
  return parseCsv(text).slice(1);
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
