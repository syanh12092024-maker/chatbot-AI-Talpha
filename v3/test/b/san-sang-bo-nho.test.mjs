// BỘ NHỚ CỦA LƯỢT ĐỌC CỬA KIỂM (28/09).
//
// Đo trên máy chủ: `/admin/api/readiness` mất 10–17 giây và LÀM ĐỨNG tiến trình bot trong lúc
// chạy. Trước đây mỗi lần mở một màn, và dải trạng thái trên mỗi tab 45 giây một lần, đều gọi
// nó ⇒ trang một page đứng ở «Đang mở…» (người quyết chụp màn gửi), và bot đứng theo.
import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

const cau = await import('../../src/noi-day/cau-bot-v1.js');

// Cửa ghi mở CHỈ trong tệp này (fetch là giả, không có gì ra ngoài) — `.env` của máy này đặt
// `PANCAKE_READONLY=1`, để nguyên thì `datBotAi` ném trước khi tới chỗ cần kiểm.
const BIEN = ['ADMIN_USER', 'ADMIN_PASS', 'V3_BOT_V1_GOC', 'PANCAKE_READONLY', 'V3_BOT_GHI', 'V3_BOT_KHOA'];
const cu = Object.fromEntries(BIEN.map((k) => [k, process.env[k]]));
const fetchCu = globalThis.fetch;
for (const k of ['PANCAKE_READONLY', 'V3_BOT_GHI', 'V3_BOT_KHOA']) delete process.env[k];
process.env.ADMIN_USER = 'u'; process.env.ADMIN_PASS = 'p'; process.env.V3_BOT_V1_GOC = 'http://bot.thu';
after(() => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(cu)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

let goi = [];
let chan = null;   // lời hứa giữ lượt readiness lại — để thử nhiều lượt gọi CÙNG LÚC
beforeEach(() => {
  cau.boNhoSanSang();
  goi = []; chan = null;
  globalThis.fetch = async (url) => {
    const u = String(url);
    goi.push(u);
    if (u.endsWith('/readiness') && chan) await chan;
    const than = u.endsWith('/readiness') ? { pages: [{ pageId: '1', aiEnabled: goi.length > 1 }] } : { ok: true, aiEnabled: true };
    return new Response(JSON.stringify(than), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
});
const soLuotDoc = () => goi.filter((u) => u.endsWith('/readiness')).length;

test('① gọi liền hai lần ⇒ bot chỉ bị hỏi MỘT lần', async () => {
  await cau.sanSangToanHe();
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc(), 1, 'lượt hai phải lấy bản nhớ — mỗi lượt hỏi làm bot đứng 10 giây');
});

test('② mười tab mở CÙNG LÚC ⇒ chung một lượt bay sang bot', async () => {
  let tha; chan = new Promise((r) => { tha = r; });
  const ds = Array.from({ length: 10 }, () => cau.sanSangToanHe());
  tha();
  const kq = await Promise.all(ds);
  assert.equal(soLuotDoc(), 1);
  assert.ok(kq.every((x) => x === kq[0]));
});

test('③ bật/tắt bot xong ⇒ lượt đọc kế tiếp hỏi lại bot, KHÔNG trả bản nhớ cũ', async () => {
  await cau.sanSangToanHe();
  await cau.datBotAi('1', true);
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc(), 2, 'vừa gạt công tắc mà màn vẫn hiện trạng thái cũ là màn nói dối');
});

test('④ lượt GHI qua cửa chung (sửa kịch bản…) cũng xoá bản nhớ; lượt ĐỌC thì không', async () => {
  await cau.sanSangToanHe();
  await cau.goiAdminV1('/kb/1/config', { phuongThuc: 'GET' });
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc(), 1);
  await cau.goiAdminV1('/kb/1/config', { phuongThuc: 'POST', than: {}, ghi: true });
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc(), 2);
});

test('⑤ bot hỏng khi chưa có bản nhớ ⇒ NÉM như cũ (màn nói «chưa đọc được»), không trả rỗng', async () => {
  globalThis.fetch = async () => { throw new Error('ECONNREFUSED'); };
  await assert.rejects(() => cau.sanSangToanHe());
});

test('⑥ kết quả mang giờ đọc — màn nói được «đo lúc mấy giờ»', async () => {
  const kq = await cau.sanSangToanHe();
  assert.ok(!Number.isNaN(Date.parse(kq.docLuc)));
});
