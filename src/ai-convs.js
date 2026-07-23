// Lưu HỘI THOẠI mà AI đã trả lời (conversation_id) theo page → để khớp với đơn hàng.
// Đơn Pancake có conversation_id (= c.id hội thoại). Nhờ đó biết đơn nào đến từ khách AI tư vấn.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'ai-convs.json');
let data = {}; // pageId -> [convId]
try { data = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { data = {}; }
const sets = {};
for (const [p, arr] of Object.entries(data)) sets[p] = new Set(arr);

let saveT = null;
function save() { if (saveT) return; saveT = setTimeout(() => { try { fs.writeFileSync(FILE, JSON.stringify(data)); } catch { /* bỏ qua */ } saveT = null; }, 1500); }

export function addAiConv(pageId, convId) {
  if (!convId) return;
  const p = String(pageId);
  if (!sets[p]) { sets[p] = new Set(); data[p] = []; }
  if (!sets[p].has(convId)) { sets[p].add(convId); data[p].push(convId); save(); }
}
export function getAiConvSet(pageId) { return sets[String(pageId)] || new Set(); }
export function bulkAddAiConvs(pageId, ids) {
  const p = String(pageId);
  if (!sets[p]) { sets[p] = new Set(); data[p] = []; }
  let added = 0;
  for (const id of ids) if (id && !sets[p].has(id)) { sets[p].add(id); data[p].push(id); added++; }
  if (added) try { fs.writeFileSync(FILE, JSON.stringify(data)); } catch { /* bỏ qua */ }
  return added;
}
