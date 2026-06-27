// Tự động đăng ký webhook cho TẤT CẢ page (thay vì bấm "Thêm đăng ký" 200 lần).
// Cần: META_SYSTEM_TOKEN trong .env + đã cấu hình Callback URL ở mục Webhooks của app.
// Chạy: npm run subscribe
import { config } from './config.js';
import { loadPageTokens, getStore, getPageToken } from './pages.js';

const FIELDS = 'messages,messaging_postbacks,messaging_optins';

const n = await loadPageTokens();
if (!n) {
  console.error('Chưa nạp được page nào. Kiểm tra System Token và quyền của System User.');
  process.exit(1);
}

const store = getStore();
let ok = 0, fail = 0;
for (const [pageId, { name }] of store) {
  const token = getPageToken(pageId);
  try {
    const url = `https://graph.facebook.com/${config.graphVersion}/${pageId}/subscribed_apps?subscribed_fields=${FIELDS}&access_token=${token}`;
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    if (data.success) { ok++; }
    else { fail++; console.log('  ✗', name || pageId, '—', data.error?.message || JSON.stringify(data)); }
  } catch (e) {
    fail++; console.log('  ✗', name || pageId, '—', e.message);
  }
}
console.log(`\nĐăng ký webhook: ${ok} OK · ${fail} lỗi / tổng ${store.size} page.`);
