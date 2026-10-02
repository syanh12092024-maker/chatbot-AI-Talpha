// `V3_GHI_KHO_BOT=1` — cửa ghi KHO KIẾN THỨC của bot mở riêng khi `PANCAKE_READONLY=1` (CR-28-09b · MN5).
//
// Prod chạy CẢ HAI tiến trình với `PANCAKE_READONLY=1` (luật số 1 — van gửi tin). Không có cờ
// hẹp này thì mọi lượt «lưu là chạy» trên prod bị từ chối. Canh: cờ mở ĐÚNG đường ghi kho, không
// mở bật/tắt bot; khoá tay (`V3_BOT_KHOA=1`) vẫn thắng; vắng cờ = như cũ.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
// CR-02-10 · MB1: lõi bot chạy TRONG tiến trình — tiêm lõi giả ghi lại mọi lượt ghi.
let nhan = []; let kho = {};
const cau = await import('../v3/src/noi-day/cau-bot-v1.js');
before(() => cau.datLoiBot({
  updatePageProducts: (id, products) => { nhan.push(`kho:${id}`); kho[id] = products; return { ok: true }; },
  getPageProductsRaw: (id) => kho[id] || [],
  canEnableAI: () => ({ ok: true }),
  setAiEnabled: (id) => { nhan.push(`ai:${id}`); },
  isAiEnabled: () => true,
}));
after(() => cau.datLoiBot(null));
beforeEach(() => {
  nhan = []; kho = {};
  process.env.PANCAKE_READONLY = '1';
  delete process.env.V3_GHI_KHO_BOT; delete process.env.V3_BOT_KHOA; delete process.env.V3_BOT_GHI;
});

const SP = [{ id: 'SP01', name: 'A', desc: '', variant: '', currency: 'AED', tiers: [{ label: 'Buy 1', price: 99 }], images: [] }];

test('GK1 · VẮNG cờ + PANCAKE_READONLY=1 ⇒ đường ghi kho ĐÓNG như cũ, không ghi lõi', async () => {
  assert.equal(cau.trangThaiCau({ kho: true }).mo, false);
  await assert.rejects(() => cau.daySanPhamLenBot('111', SP), (e) => e.ma === 'cua_ghi_dong');
  assert.deepEqual(nhan, []);
});

test('GK2 · BẬT cờ ⇒ ghi kho được và ĐỌC LẠI khớp; cửa ghi chung (token) VẪN đóng', async () => {
  process.env.V3_GHI_KHO_BOT = '1';
  assert.equal(cau.trangThaiCau({ kho: true }).mo, true);
  assert.equal(cau.trangThaiCau().mo, false, 'cửa ghi chung (bật/tắt bot, token) không đổi');
  const kq = await cau.daySanPhamLenBot('111', SP);
  assert.equal(kq.soSanPham, 1);
  // CR-02-10 · MB2: công tắc bot không còn đi qua cầu (`datBotAi` đã gỡ) — cửa chung vẫn đóng là đủ.
  assert.deepEqual(nhan, ['kho:111'], 'đúng MỘT lượt ghi, và đó là lượt ghi kho');
});

test('GK3 · khoá tay THẮNG cờ: V3_BOT_KHOA=1 hoặc V3_BOT_GHI=0 ⇒ đường ghi kho vẫn đóng', async () => {
  process.env.V3_GHI_KHO_BOT = '1';
  process.env.V3_BOT_KHOA = '1';
  await assert.rejects(() => cau.daySanPhamLenBot('111', SP), (e) => e.ma === 'cua_ghi_dong');
  delete process.env.V3_BOT_KHOA; process.env.V3_BOT_GHI = '0';
  assert.equal(cau.trangThaiCau({ kho: true }).mo, false);
  assert.deepEqual(nhan, []);
});
