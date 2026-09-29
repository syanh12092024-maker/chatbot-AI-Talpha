// UI-HT4 · THƯỚC §10 (CR-28-09): bàn hội thoại CHỈ ĐỌC — không ô soạn tin, không đường gửi.
//
// `01-QUYET-DINH.md` §10 mới: «trả lời VẪN ở Pancake; trên hệ chỉ nhận việc · trả lại bot · đóng
// việc». CR mục 3 khai rủi ro: sale bắt đầu «muốn trả lời luôn ở đây» — vế cấm phải giữ bằng THƯỚC.
//
// Trước phiếu này thước chỉ soi MỘT tệp HTML tìm `<textarea>` (ban-hoi-thoai-ds · ui-ht2.sh ③). Một
// đường gửi có thể mọc ở chỗ khác mà thước đó vẫn xanh: một cửa tiêm `datGuiTin` · một `r.post` ·
// một import sang `src/pancake.js` · một `<div contenteditable>` · một `fetch(…, {method:'POST'})`.
// Tệp này đóng từng cửa đó, và nằm trong BỘ CA (không chỉ trong cổng — án lệ 34: cổng không ai
// chạy lại giữa hai lần gate).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MODULE = path.join(GOC, 'v3/src/ui/ban-hoi-thoai');
const TRANG = path.join(MODULE, 'trang/ban-hoi-thoai.html');
const rel = (f) => path.relative(GOC, f);

/** Đồ thị import TĨNH của module (mọi `import … from` / `export … from` tương đối, bắc cầu). */
function doThiImport() {
  const tep = new Set();
  const ngoai = new Set();
  const di = (f) => {
    if (tep.has(f)) return;
    tep.add(f);
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g)) {
      if (m[1].startsWith('.')) di(path.resolve(path.dirname(f), m[1]));
      else ngoai.add(m[1]);
    }
    // `import('…')` động cũng là một cạnh — bỏ sót là lỗ.
    for (const m of s.matchAll(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) ngoai.add(`động:${m[1]}`);
  };
  for (const f of fs.readdirSync(MODULE).filter((x) => x.endsWith('.js'))) di(path.join(MODULE, f));
  return { tep: [...tep].map(rel).sort(), ngoai: [...ngoai].sort() };
}

/* ═══ T1 · đồ thị import — không đường nào tới chỗ gửi tin ═══ */
test('T1 · đồ thị import của bàn hội thoại chỉ nằm trong vùng giao diện + bối cảnh; thư viện ngoài chỉ express/node', () => {
  const { tep, ngoai } = doThiImport();
  // Vùng cho phép — DENY-BY-DEFAULT (án lệ 22). Đường gửi của hệ nằm ở `src/pancake.js`,
  // `src/queue/lan-gui.js`, `v3/src/channels/*`: không tệp nào trong số đó được lọt vào đây.
  // Pancake được ĐỌC qua cửa tiêm (`datDocTinPancake`), không qua import.
  const VUNG = [/^v3\/src\/ui\/ban-hoi-thoai\//, /^v3\/src\/ui\/dispatch\//, /^v3\/src\/ui\/chung\/http\.js$/,
    /^v3\/src\/auth\/boi-canh\.js$/];
  const ngoaiVung = tep.filter((f) => !VUNG.some((re) => re.test(f)));
  assert.deepEqual(ngoaiVung, [], 'module bàn hội thoại import ra ngoài vùng giao diện — soát xem có chạm đường gửi không');
  assert.ok(tep.length >= 10, `đồ thị chỉ có ${tep.length} tệp — thước đang đo nhầm chỗ`);
  assert.deepEqual(ngoai, ['express', 'node:path', 'node:url'], 'thư viện/nạp động mới trong đồ thị bàn hội thoại');
});

/* ═══ T2 · cửa tiêm — mọi cửa đã khai là cửa ĐỌC ═══ */
test('T2 · cửa tiêm (`dat*`) trong đồ thị = danh sách đã khai; cửa mới phải được khai CÓ LÝ DO', () => {
  const CUA_DA_KHAI = {
    'ban-hoi-thoai/boi-canh-hoi-thoai.js': ['datGiaiKichBan'],                 // đọc kịch bản
    'ban-hoi-thoai/doc-hoi-thoai.js': ['datChiMucSoAi', 'datDocDauVetV3', 'datDocTinPancake', // đọc
      'datDongHoHoiThoai', 'datLaTinTuDong', 'datTraMaKhachSoAi'],
    'ban-hoi-thoai/kho-ban-hoi-thoai.js': ['datDocHoiThoaiSql'],               // đọc danh sách
    'ban-hoi-thoai/router.js': ['datChanDangNhap', 'datChanVai'],              // cái chắn
    'dispatch/kho-viec.js': ['datTaoTruyVan'],                                 // cổng team
    'dispatch/router.js': ['datChanDangNhap', 'datChanVai', 'datPheuNhatKy'],  // cái chắn · nhật ký
  };
  const thay = {};
  for (const f of doThiImport().tep) {
    const s = fs.readFileSync(path.join(GOC, f), 'utf8');
    const ten = [...s.matchAll(/export\s+(?:async\s+)?(?:function|const|let)\s+(dat[A-Z]\w*)/g)].map((m) => m[1]).sort();
    if (ten.length) thay[f.replace(/^v3\/src\/ui\//, '')] = ten;
  }
  assert.deepEqual(thay, CUA_DA_KHAI,
    'cửa tiêm trong bàn hội thoại đổi — §10: trên hệ chỉ ĐỌC + nhận/trả bot/đóng việc. Cửa đọc mới thì khai vào đây kèm lý do.');
});

/* ═══ T3 · đường HTTP — chỉ GET ═══ */
test('T3 · mọi đường /ban-hoi-thoai · /api/ban-hoi-thoai* chỉ nhận GET; POST/PUT/PATCH/DELETE → 404', async () => {
  const bht = await import('../../src/ui/ban-hoi-thoai/index.js');
  const dp = await import('../../src/ui/dispatch/index.js');
  const cuaMo = () => (_req, _res, next) => next();
  bht.datChanDangNhap(cuaMo); bht.datChanVai(cuaMo);
  dp.datChanDangNhap(cuaMo); dp.datChanVai(cuaMo);

  const rBht = bht.taoRouterBanHoiThoai();
  const rDp = dp.taoRouterDieuPhoi();
  const duong = [...rBht.stack, ...rDp.stack].filter((l) => l.route)
    .map((l) => ({ p: l.route.path, m: Object.keys(l.route.methods).filter((k) => l.route.methods[k]) }))
    .filter((x) => /^\/(api\/)?ban-hoi-thoai/.test(String(x.p)));
  assert.ok(duong.length >= 4, `chỉ thấy ${duong.length} đường bàn hội thoại — thước đang đo nhầm chỗ`);
  const khongGet = duong.filter((x) => x.m.some((k) => k !== 'get'));
  assert.deepEqual(khongGet, [], 'đường bàn hội thoại nhận phương thức GHI');

  const app = express();
  app.use((req, _res, next) => {
    req.boiCanh = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
    next();
  });
  app.use(rBht); app.use(rDp);
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  try {
    const sai = [];
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const p of ['/ban-hoi-thoai', '/api/ban-hoi-thoai', '/api/ban-hoi-thoai/1', '/api/ban-hoi-thoai/1/boi-canh',
        '/api/ban-hoi-thoai/1/gui', '/api/ban-hoi-thoai/1/tin']) {
        const r = await fetch(goc + p, { method, headers: { 'content-type': 'application/json' }, body: method === 'DELETE' ? undefined : '{"text":"x"}' });
        if (r.status !== 404) sai.push(`${method} ${p} → ${r.status}`);
      }
    }
    assert.deepEqual(sai, [], 'có đường ghi/gửi trên bàn hội thoại');
  } finally { await new Promise((r) => sv.close(r)); }
});

/* ═══ T4 · trang — không chỗ soạn, không lời gọi ghi ═══ */
test('T4 · trang bàn hội thoại: không textarea/contenteditable · ô nhập chỉ là ô TÌM · script trang chỉ GET vào đường đọc', () => {
  const html = fs.readFileSync(TRANG, 'utf8');
  const than = html.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!/<textarea/i.test(than), 'ô soạn tin (<textarea>)');
  assert.ok(!/contenteditable/i.test(than), 'ô soạn tin (contenteditable)');
  const oNhap = than.match(/<input\b[^>]*>/gi) || [];
  assert.equal(oNhap.length, 1, `trang có ${oNhap.length} ô nhập — chỉ được có ô tìm`);
  assert.match(oNhap[0], /type="search"/);
  const form = than.match(/<form\b[^>]*>/gi) || [];
  assert.deepEqual(form.map((f) => /role="search"/.test(f)), [true], 'form duy nhất phải là form TÌM');
  const script = [...than.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]).sort();
  // LL2 · 29/09 (§10 bổ sung, CR-28-09c): thêm `/hop-thu/hop-thu-ui.js` — khối GHI của Hộp thư (nhận thay
  // bot · sửa/duyệt/loại đơn · tìm khách). Thước riêng của nó: `hop-thu.test.mjs` H1–H4 (không ô soạn,
  // không đường gửi tin, POST đúng bốn việc). Trang này vẫn không tự gọi phương thức ghi nào.
  assert.deepEqual(script, ['/chung/dieu-huong.js', '/chung/ui.js', '/dieu-phoi/dong-viec-ui.js', '/hop-thu/hop-thu-ui.js'],
    'script ngoài mới trên bàn hội thoại — soát xem có đường gửi không');
  assert.ok(!/\bmethod\s*:/.test(than), 'script trang tự gọi phương thức khác GET');
  const api = [...than.matchAll(/['"`](\/api\/[^'"`?$]*)/g)].map((m) => m[1]);
  assert.ok(api.length >= 2, 'không thấy lời gọi API nào — thước đang đo nhầm chỗ');
  const la = api.filter((u) => !/^\/api\/ban-hoi-thoai(\/|$)/.test(u) && !/^\/api\/dieu-phoi\/viec\/$/.test(u));
  assert.deepEqual(la, [], 'trang gọi API ngoài đường đọc của bàn hội thoại');
});

test('T5 · khối đóng việc dùng chung (dong-viec-ui.js): MỘT lời fetch, mọi đường dưới /api/dieu-phoi/ — ghi chú đóng việc là nội bộ, không tới khách', () => {
  const s = fs.readFileSync(path.join(GOC, 'v3/src/ui/dispatch/trang/dong-viec-ui.js'), 'utf8');
  assert.equal((s.match(/\bfetch\(/g) || []).length, 1, 'khối đóng việc có thêm đường mạng');
  const duong = [...s.matchAll(/goiApi\(\s*['"`]([^'"`]+)/g)].map((m) => m[1]);
  assert.ok(duong.length >= 2);
  assert.deepEqual(duong.filter((d) => !d.startsWith('/api/dieu-phoi/')), [], 'khối đóng việc gọi ra ngoài điều phối');
  assert.ok(!/<textarea/i.test(s), 'khối đóng việc mọc ô soạn nhiều dòng');
});

/* ═══ T6 · nguồn chat — đọc Pancake chỉ bằng GET (đo HÀNH VI, bẫy ở tầng fetch) ═══ */
test('T6 · pkDocTin (đường đọc chat của bàn) chỉ gọi GET — bẫy globalThis.fetch, không gọi mạng thật', async () => {
  const pk = await import('../../../src/pancake.js');
  const goc = globalThis.fetch;
  const goi = [];
  globalThis.fetch = async (_url, init) => {
    goi.push(String(init?.method || 'GET').toUpperCase());
    return { json: async () => ({ messages: [] }) };
  };
  try {
    // Token giả qua cửa kho CSDL — không phụ thuộc máy có token Pancake hay không.
    pk.datKhoTokenDb(async () => ['token-gia-cho-ca']);
    await pk.lamMoiTokenDb();
    const kq = await pk.pkDocTin('102938', '102938_7733', 'c1');
    assert.equal(kq.ok, true);
    assert.ok(goi.length >= 1, 'không có lời gọi nào — thước không đo được gì');
    assert.deepEqual([...new Set(goi)], ['GET'], 'đường đọc chat gọi Pancake bằng phương thức ghi');
  } finally {
    globalThis.fetch = goc;
    pk.datKhoTokenDb(null);
  }
});
