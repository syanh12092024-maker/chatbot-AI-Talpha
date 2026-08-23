// BỘ DÒ ĐIỂM KIỂM CHẶN 1, 2, 3 — LẦN HAI. CHỈ ĐỌC.
//
// Lần một dùng sai loại token: các đường theo page đòi `page_access_token` riêng từng page
// (xem src/pancake.js dòng 106–112), không phải JWT người dùng. Lần này dùng token page
// ĐÃ CÓ SẴN trong pancake-page-tokens.json — CỐ Ý KHÔNG sinh token mới, vì sinh mới làm
// token cũ của page đó hết hiệu lực và bản đang chạy đang dùng chúng.
//
//   scp v3/docs/kiem-chan/do-pancake-2.mjs root@169.58.33.8:/tmp/
//   ssh root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-pancake-2.mjs'

import fs from 'node:fs';

const PK = 'https://pages.fm/api/v1';
const PUB = 'https://pages.fm/api/public_api/v1';
const doc = (f, m = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return m; } };

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n')
    .filter((d) => d.includes('=') && !d.trim().startsWith('#'))
    .map((d) => { const i = d.indexOf('='); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }),
);
const jwt = (env.PANCAKE_TOKEN || '').trim();
const che = (s) => String(s).replace(/eyJ[\w.-]{20,}/g, '«token»');

async function get(url, init) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, ...init });
    const chu = await r.text();
    let j = null; try { j = JSON.parse(chu); } catch { /**/ }
    return { status: r.status, j, chu: chu.slice(0, 300), ms: Date.now() - t0 };
  } catch (e) { return { status: 0, loi: che(e.message), ms: Date.now() - t0 }; }
}

const ra = { luc: new Date().toISOString() };

// ═══ ① /pages trả về những nhóm nào ═══
const rp = await get(`${PK}/pages?access_token=${jwt}`);
ra.pagesKhoaGoc = rp.j ? Object.keys(rp.j) : null;
ra.pagesNhomCon = rp.j?.categorized ? Object.fromEntries(
  Object.entries(rp.j.categorized).map(([k, v]) => [k, Array.isArray(v) ? v.length : typeof v]),
) : null;
// nền tảng theo TỪNG nhóm, không chỉ nhóm activated
const nenTang = {};
for (const [nhom, ds] of Object.entries(rp.j?.categorized || {})) {
  if (!Array.isArray(ds)) continue;
  for (const p of ds) {
    const k = `${nhom}/${p.platform || p.page_type || p.type || '(trống)'}`;
    nenTang[k] = (nenTang[k] || 0) + 1;
  }
}
ra.nenTangTheoNhom = nenTang;
console.log('① khoá gốc:', ra.pagesKhoaGoc, '\n   nhóm:', JSON.stringify(ra.pagesNhomCon), '\n   nền tảng:', JSON.stringify(nenTang));
// Một page mẫu có những trường gì — để biết Pancake mô tả kênh bằng trường nào
const mot = (rp.j?.categorized?.activated || [])[0];
ra.truongCuaMotPage = mot ? Object.keys(mot) : null;
console.log('   trường của một page:', (ra.truongCuaMotPage || []).join(' '));

// ═══ ② Dùng page_access_token CÓ SẴN ═══
const pageToks = doc('pancake-page-tokens.json', {}) || {};
const dsIdCoTok = Object.keys(pageToks);
ra.soPageCoToken = dsIdCoTok.length;
console.log(`② page đã có page_access_token sẵn: ${dsIdCoTok.length}`);

if (dsIdCoTok.length) {
  const pid = dsIdCoTok[0];
  const ptok = pageToks[pid];
  ra.pageMau = pid;

  const duong = [
    ['settings',       `${PUB}/pages/${pid}/settings?page_access_token=${ptok}`],
    ['webhooks',       `${PUB}/pages/${pid}/webhooks?page_access_token=${ptok}`],
    ['webhook',        `${PUB}/pages/${pid}/webhook?page_access_token=${ptok}`],
    ['subscriptions',  `${PUB}/pages/${pid}/subscriptions?page_access_token=${ptok}`],
    ['conversations',  `${PUB}/pages/${pid}/conversations?page_access_token=${ptok}`],
    ['tags',           `${PUB}/pages/${pid}/tags?page_access_token=${ptok}`],
    ['pages(list)',    `${PUB}/pages?page_access_token=${ptok}`],
  ];
  ra.doDuong = [];
  for (const [ten, u] of duong) {
    const r = await get(u);
    const dong = { ten, status: r.status, khoa: r.j ? Object.keys(r.j).slice(0, 12) : null, dau: che((r.chu || r.loi || '').slice(0, 200)) };
    ra.doDuong.push(dong);
    console.log(`   ${String(r.status).padStart(3)}  ${ten.padEnd(15)} ${dong.khoa ? dong.khoa.join(',') : dong.dau}`);
  }
}

// ═══ ③ BOTCAKE — có khoá không, và đọc được gì ═══
ra.botcake = {
  coKhoaTrongEnv: Object.keys(env).filter((k) => /BOTCAKE/i.test(k)),
  soTemplateDaLuu: (() => { const t = doc('botcake-templates.json', null); return t ? Object.keys(t).length : null; })(),
};
console.log('③ botcake env:', ra.botcake.coKhoaTrongEnv.join(',') || '(không có khoá nào)',
  '· template đã lưu:', ra.botcake.soTemplateDaLuu);

// ═══ ④ Bao nhiêu page đang bật AI, và sổ AI to bao nhiêu ═══
ra.pageBatAi = (doc('ai-enabled.json', []) || []).length;
try { ra.soAiDong = fs.readFileSync('ai-messages.jsonl', 'utf8').split('\n').filter(Boolean).length; } catch { ra.soAiDong = null; }
console.log('④ page bật AI:', ra.pageBatAi, '· dòng Sổ AI:', ra.soAiDong);

console.log('\n===KETQUA_JSON===');
console.log(JSON.stringify(ra, null, 2));
