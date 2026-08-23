// BỘ DÒ ĐIỂM KIỂM CHẶN 1 VÀ 2 — CHỈ ĐỌC, KHÔNG GỬI GÌ CHO AI.
//
// Chạy trên VPS 169.58.33.8 (token Pancake bị chặn IP ở máy cá nhân — lỗi 121 trên mọi page):
//   scp v3/docs/kiem-chan/do-pancake.mjs root@169.58.33.8:/tmp/
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-pancake.mjs'
//
// Chỉ dùng GET. Không POST, không PUT, không gửi tin. Không in token ra màn hình.
//
// Trả lời hai câu:
//   ① Tài khoản Pancake này có kênh WhatsApp nào không, và API phơi ra đường nào để gửi
//   ② Pancake có đẩy tin về (webhook) không, hay phải hỏi vòng

import fs from 'node:fs';

const PK = 'https://pages.fm/api/v1';
const PK_PUB = 'https://pages.fm/api/public_api/v1';

// ---- đọc token từ .env của bản đang chạy, KHÔNG in ra ----
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter((d) => d.includes('=') && !d.trim().startsWith('#'))
    .map((d) => { const i = d.indexOf('='); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }),
);
const toks = [env.PANCAKE_TOKEN, ...String(env.PANCAKE_TOKENS_EXTRA || '').split(',')]
  .map((t) => (t || '').trim()).filter(Boolean);
if (!toks.length) { console.error('Không tìm thấy PANCAKE_TOKEN trong .env'); process.exit(1); }
const che = (s) => String(s).replace(/eyJ[\w.-]{20,}/g, '«token»');

async function get(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    const chu = await r.text();
    let j = null; try { j = JSON.parse(chu); } catch { /* không phải JSON */ }
    return { ok: r.ok, status: r.status, j, chu: chu.slice(0, 400), ms: Date.now() - t0 };
  } catch (e) { return { ok: false, status: 0, loi: che(e.message), ms: Date.now() - t0 }; }
}

const ra = { luc: new Date().toISOString(), soToken: toks.length };

// ═══ ① KÊNH: page nào thuộc nền tảng nào ═══
console.log('① Đếm page theo nền tảng…');
const dsPage = [];
for (const t of toks) {
  const r = await get(`${PK}/pages?access_token=${t}`);
  if (!r.j?.categorized) { console.log(`   token …${t.slice(-6)} → ${r.status} ${che(r.chu || r.loi || '')}`); continue; }
  for (const p of r.j.categorized.activated || []) dsPage.push({ ...p, _tok: t });
}
const theoNenTang = {};
for (const p of dsPage) {
  const nt = p.platform || p.page_type || p.type || '(không ghi)';
  theoNenTang[nt] = (theoNenTang[nt] || 0) + 1;
}
ra.tongPage = dsPage.length;
ra.theoNenTang = theoNenTang;
console.log('   ', JSON.stringify(theoNenTang));

// Page nào KHÔNG phải facebook → nhiều khả năng là kênh khác (whatsapp, instagram, zalo…)
const khacFb = dsPage.filter((p) => {
  const nt = String(p.platform || p.page_type || p.type || '').toLowerCase();
  return nt && !nt.includes('facebook');
});
ra.pageKhongPhaiFacebook = khacFb.slice(0, 20).map((p) => ({
  id: p.id, ten: p.name, nenTang: p.platform || p.page_type || p.type,
}));
console.log(`   page không phải Facebook: ${khacFb.length}`);

// Trường nào trong bản trả về nhắc tới whatsapp
const nhacWa = dsPage.filter((p) => JSON.stringify(p).toLowerCase().includes('whatsapp'));
ra.pageNhacWhatsapp = nhacWa.slice(0, 10).map((p) => ({ id: p.id, ten: p.name }));
console.log(`   page có chữ "whatsapp" trong dữ liệu: ${nhacWa.length}`);

// ═══ ② SETTINGS + WEBHOOK: lấy một page bất kỳ làm mẫu ═══
const mau = khacFb[0] || dsPage[0];
if (mau) {
  console.log(`② Dò cấu hình trên page mẫu ${mau.id} (${mau.name})…`);
  const t = mau._tok;

  const setting = await get(`${PK}/pages/${mau.id}/settings?access_token=${t}`);
  ra.settings = { status: setting.status, khoa: setting.j ? Object.keys(setting.j).slice(0, 40) : null };
  const chuSetting = JSON.stringify(setting.j || {}).toLowerCase();
  ra.settingsNhacWebhook = ['webhook', 'callback', 'subscribe', 'notify_url'].filter((k) => chuSetting.includes(k));
  console.log('   settings →', setting.status, 'nhắc:', ra.settingsNhacWebhook.join(',') || '(không)');

  // Các đường webhook có thể có — CHỈ GET, chỉ để xem đường tồn tại hay không.
  // 404 = không có đường này · 401/403 = có đường nhưng thiếu quyền · 200 = có và đọc được
  const duong = [
    `${PK}/pages/${mau.id}/webhooks?access_token=${t}`,
    `${PK}/pages/${mau.id}/webhook?access_token=${t}`,
    `${PK}/pages/${mau.id}/subscriptions?access_token=${t}`,
    `${PK_PUB}/pages/${mau.id}/webhooks?page_access_token=${t}`,
    `${PK}/webhooks?access_token=${t}`,
    `${PK}/shops?access_token=${t}`,
  ];
  ra.doDuongWebhook = [];
  for (const u of duong) {
    const r = await get(u);
    const nhan = u.replace(/access_token=[^&]+/, 'access_token=«che»');
    ra.doDuongWebhook.push({ duong: nhan, status: r.status, dau: che((r.chu || '').slice(0, 160)) });
    console.log(`   ${r.status}  ${nhan.split('?')[0]}`);
  }

  // Đường gửi tin đang dùng thật (chỉ GET để xem hình dạng, KHÔNG POST)
  const conv = await get(`${PK}/pages/${mau.id}/conversations?access_token=${t}&page_number=1`);
  ra.docHoiThoai = { status: conv.status, so: conv.j?.conversations?.length ?? null, ms: conv.ms };
  console.log('   đọc hội thoại →', conv.status, `${ra.docHoiThoai.so} hội thoại, ${conv.ms}ms`);
}

// ═══ ③ ĐỘ TRỄ VÒNG HỎI — đo thật để biết bỏ vòng hỏi lợi bao nhiêu ═══
if (mau) {
  const lan = [];
  for (let i = 0; i < 3; i++) {
    const r = await get(`${PK}/pages/${mau.id}/conversations?access_token=${mau._tok}&page_number=1`);
    lan.push(r.ms);
  }
  ra.msVongHoi = lan;
  console.log('③ ba lần hỏi vòng (ms):', lan.join(' · '));
}

console.log('\n===KETQUA_JSON===');
console.log(JSON.stringify(ra, null, 2));
