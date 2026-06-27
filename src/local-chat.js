// Test closer trong terminal — chọn page qua biến PAGE_ID (mặc định page đầu tiên).
// Chạy: npm run chat     hoặc:  PAGE_ID=<id> npm run chat
import readline from 'node:readline';
import { assertConfig } from './config.js';
import { loadKB, getPageList } from './kb.js';
import { handleIncoming } from './handler.js';
import { resetState } from './store.js';

assertConfig();
loadKB();
const pages = getPageList();
const pageId = process.env.PAGE_ID || pages[0]?.id || '';
const cur = pages.find((p) => String(p.id) === String(pageId)) || pages[0];
const psid = `local:${pageId}`;
resetState(psid);

console.log('--- AI Closer (local) ---');
console.log(`Page test: ${cur?.name || pageId} (${pageId})  ·  ${cur?.products ?? '?'} sản phẩm`);
console.log('Gõ tin như khách (Tagalog/English). "reset" để làm lại, "exit" để thoát.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = () => rl.question('Khách > ', async (line) => {
  const text = line.trim();
  if (text === 'exit') return rl.close();
  if (text === 'reset') { resetState(psid); console.log('(đã reset)\n'); return ask(); }
  if (!text) return ask();
  try {
    const { reply, handoff, archived } = await handleIncoming({ psid, text, pageId });
    if (archived) console.log('AI    > [spam — bỏ qua]');
    else console.log(`AI    > ${reply}${handoff ? '  [→ chuyển người]' : ''}`);
  } catch (e) { console.error('Lỗi:', e.message); }
  console.log('');
  ask();
});
ask();
