// MB1 · CR-02-10 — LÕI BOT CHẠY TRONG TIẾN TRÌNH v3, KHÔNG CÒN TIẾN TRÌNH BOT v1.
//
// Hai lời hứa của phiếu, đo bằng lõi THẬT (không tiêm), mạng bị chặn:
//   ① worker sau `khoiDongLoi()` thấy sản phẩm của page trong `kb-overrides.json` — trước 02/10
//      worker không nạp KB nên MỌI page `noData` (đảo-vá: bỏ `loadKB()` khỏi khởi động ⇒ ca ① đỏ);
//   ② mọi hàm của cầu chạy được khi KHÔNG có tiến trình v1: không `ADMIN_USER`, không một lượt
//      `fetch` nào sang `/admin/api`.
// `test/_an-toan.mjs` đã trỏ `KB_OVERRIDES_FILE` vào thư mục tạm — ghi ở đây không chạm dữ liệu thật.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Chạy lẻ (cổng nghiệm thu gọi `node --test <tệp>` không qua `_an-toan.mjs`) thì tự trỏ ngòi bút ra
// thư mục tạm TRƯỚC khi nạp `kb.js` — không bao giờ ghi vào `kb-overrides.json` của repo.
if (!process.env.KB_OVERRIDES_FILE) {
  process.env.KB_OVERRIDES_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mb1-')), 'kb-overrides.json');
}
const TEP = process.env.KB_OVERRIDES_FILE;
const PID = '990000000000001';
const sp = (gia) => [{ id: 'SP1', name: 'Vòng thử', desc: '', variant: '', currency: 'KWD', tiers: [{ label: 'Buy 1', price: gia }], images: [] }];
const viet = (gia) => fs.writeFileSync(TEP, JSON.stringify({ [PID]: { products: sp(gia), config: { greeting: 'Hi', salesPrompt: 'Bán', tone: '' } } }));

const goiMang = [];
const fetchCu = globalThis.fetch;
const bienCu = { u: process.env.ADMIN_USER, p: process.env.ADMIN_PASS };
before(() => {
  assert.ok(TEP && !TEP.startsWith(GOC), 'KB_OVERRIDES_FILE phải nằm NGOÀI repo (lớp _an-toan)');
  viet(12.9);
  globalThis.fetch = async (url) => { goiMang.push(String(url)); throw new Error('mạng bị chặn trong bộ ca'); };
  delete process.env.ADMIN_USER; delete process.env.ADMIN_PASS;
});
after(() => {
  globalThis.fetch = fetchCu;
  if (bienCu.u !== undefined) process.env.ADMIN_USER = bienCu.u;
  if (bienCu.p !== undefined) process.env.ADMIN_PASS = bienCu.p;
});

const { khoiDongLoi } = await import('../src/core/khoi-dong-loi.js');
const kb = await import('../src/kb.js');
const cau = await import('../v3/src/noi-day/cau-bot-v1.js');

test('① worker sau khoiDongLoi() thấy sản phẩm của page — không còn noData vì chưa nạp KB', async () => {
  await khoiDongLoi({ nhan: 'bộ ca', dongBoSheet: false, log: () => {} });
  const k = kb.getKBForPage(PID);
  assert.notEqual(k.noData, true, 'page có sản phẩm trong bản chép mà bot vẫn báo «chưa có sản phẩm»');
  assert.equal(k.products.length, 1);
  assert.equal(k.config.greeting, 'Hi');
});

test('② tiến trình KHÁC ghi tệp ⇒ tiến trình này thấy bản mới sau một lượt nạp lại', () => {
  viet(15.5);
  // mtime có thể trùng trong cùng mili-giây trên vài hệ tệp — đổi cỡ tệp là đủ để khoá khác đi.
  assert.equal(kb.napLaiBanChepNeuDoi(), true);
  assert.equal(kb.getKBForPage(PID).products[0].tiers[0].price, 15.5);
  assert.equal(kb.napLaiBanChepNeuDoi(), false, 'tệp không đổi thì không áp lại');
});

test('③ cầu chạy bằng lõi trong tiến trình: không tài khoản, không một lượt HTTP sang /admin/api', async () => {
  const truoc = goiMang.length;
  assert.equal(cau.trangThaiCau({ kho: true }).goc, 'trong tiến trình v3');
  const mot = await cau.sanPhamCuaPage(PID);
  assert.equal(mot.sanPham.length, 1);
  assert.equal(mot.cauHinh.chao, 'Hi');
  const ds = await cau.danhSachPageKemSanPham();
  assert.ok(ds.some((p) => p.pageId === PID && p.soSanPham === 1));
  const ss = await cau.sanSangToanHe();
  assert.ok(Array.isArray(ss.pages));
  const tk = await cau.danhSachToken();
  assert.ok(Array.isArray(tk));
  const pheu = await cau.pheuHoiThoai();
  assert.equal(typeof pheu.tong, 'number');
  const cp = await cau.chiPhiToanHe();
  assert.ok(Array.isArray(cp.page));
  const sangV1 = goiMang.slice(truoc).filter((u) => /\/admin\/api/.test(u));
  assert.deepEqual(sangV1, [], 'cầu vẫn gọi HTTP sang tiến trình bot v1');
});

test('④ đường ghi kho chạy trong tiến trình: lưu xong, đọc lại đúng bản đó từ tệp', async () => {
  const cu = { ro: process.env.PANCAKE_READONLY, kho: process.env.V3_GHI_KHO_BOT };
  process.env.PANCAKE_READONLY = '1'; process.env.V3_GHI_KHO_BOT = '1';
  try {
    const kq = await cau.daySanPhamLenBot(PID, sp(20));
    assert.equal(kq.soSanPham, 1);
    const tep = JSON.parse(fs.readFileSync(TEP, 'utf8'));
    assert.equal(tep[PID].products[0].tiers[0].price, 20, 'bản chép trên đĩa phải là bản vừa lưu — worker đọc tệp này');
    await cau.dayKichBanLenBot(PID, { greeting: 'Xin chào', salesPrompt: 'Bán', tone: '' });
    assert.equal(kb.getPageConfig(PID).greeting, 'Xin chào');
  } finally {
    for (const [k, v] of [['PANCAKE_READONLY', cu.ro], ['V3_GHI_KHO_BOT', cu.kho]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('⑤ mã nguồn: cầu không còn HTTP, khởi động hai tiến trình v3 đều gọi khoiDongLoi', () => {
  const c = fs.readFileSync(path.join(GOC, 'v3/src/noi-day/cau-bot-v1.js'), 'utf8');
  assert.doesNotMatch(c, /fetch\(/, 'cầu còn gọi fetch');
  assert.doesNotMatch(c, /\bgoi\(\s*['`]\//, 'cầu còn gọi một đường HTTP kiểu goi(\'/…\')');
  for (const tep of ['v3/chay-that.js', 'src/queue/chay-worker.js']) {
    assert.match(fs.readFileSync(path.join(GOC, tep), 'utf8'), /khoiDongLoi\(/, `${tep} không khởi động lõi`);
  }
  assert.match(fs.readFileSync(path.join(GOC, 'v3/chay-that.js'), 'utf8'), /app\.post\('\/webhook'/, '/webhook chưa dời sang v3');
});
