// BỘ NHỚ CỦA LƯỢT ĐỌC CỬA KIỂM (28/09).
//
// Đo trên máy chủ 28/09: lượt đọc cửa kiểm mất 10–17 giây và LÀM ĐỨNG tiến trình bot v1 trong lúc
// chạy. Chỗ chậm đã vá trong `kb.js` (đo lại 02/10: ~33 ms), nhưng bản nhớ vẫn là luật: mười tab
// mở cùng lúc chung một lượt, và mọi lượt GHI làm đổi tình trạng page phải xoá bản nhớ.
// CR-02-10 · MB1: lõi chạy TRONG tiến trình — bộ ca tiêm lõi giả đếm số lượt `allReadiness()`.
import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

const cau = await import('../../src/noi-day/cau-bot-v1.js');

// Cửa ghi mở CHỈ trong tệp này (lõi là giả, không có gì ra ngoài) — `.env` của máy này đặt
// `PANCAKE_READONLY=1`, để nguyên thì `datBotAi` ném trước khi tới chỗ cần kiểm.
const BIEN = ['PANCAKE_READONLY', 'V3_BOT_GHI', 'V3_BOT_KHOA'];
const cu = Object.fromEntries(BIEN.map((k) => [k, process.env[k]]));
for (const k of BIEN) delete process.env[k];
after(() => {
  cau.datLoiBot(null);
  for (const [k, v] of Object.entries(cu)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});

let soLuotDoc = 0;
let hong = false;
beforeEach(() => {
  soLuotDoc = 0; hong = false;
  cau.datLoiBot({
    allReadiness: () => {
      soLuotDoc += 1;
      if (hong) throw new Error('lõi hỏng');
      return [{ pageId: '1', aiAllowed: true, warnings: [], readiness: 'READY', aiEnabled: soLuotDoc > 1 }];
    },
    canEnableAI: () => ({ ok: true }),
    setAiEnabled: () => {},
    isAiEnabled: () => true,
    updatePageConfig: () => ({ ok: true }),
  });
});

test('① gọi liền hai lần ⇒ lõi chỉ bị hỏi MỘT lần', async () => {
  await cau.sanSangToanHe();
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc, 1, 'lượt hai phải lấy bản nhớ');
});

test('② mười tab mở CÙNG LÚC ⇒ chung một lượt đọc', async () => {
  const kq = await Promise.all(Array.from({ length: 10 }, () => cau.sanSangToanHe()));
  assert.equal(soLuotDoc, 1);
  assert.ok(kq.every((x) => x === kq[0]));
});

test('③ bật/tắt bot xong ⇒ lượt đọc kế tiếp hỏi lại lõi, KHÔNG trả bản nhớ cũ', async () => {
  await cau.sanSangToanHe();
  await cau.datBotAi('1', true);
  await cau.sanSangToanHe();
  assert.equal(soLuotDoc, 2, 'vừa gạt công tắc mà màn vẫn hiện trạng thái cũ là màn nói dối');
});

test('④ lượt GHI (đưa kịch bản lên) cũng xoá bản nhớ; lượt ĐỌC thì không', async () => {
  process.env.V3_GHI_KHO_BOT = '1';
  try {
    await cau.sanSangToanHe();
    await cau.sanSangToanHe();
    assert.equal(soLuotDoc, 1);
    await cau.dayKichBanLenBot('1', { greeting: 'hi' });
    await cau.sanSangToanHe();
    assert.equal(soLuotDoc, 2);
  } finally { delete process.env.V3_GHI_KHO_BOT; }
});

test('⑤ lõi hỏng khi chưa có bản nhớ ⇒ NÉM (màn nói «chưa đọc được»), không trả rỗng', async () => {
  hong = true;
  await assert.rejects(() => cau.sanSangToanHe(), (e) => e.ma === 'cau_bot_hong');
});

test('⑥ kết quả mang giờ đọc — màn nói được «đo lúc mấy giờ»', async () => {
  const kq = await cau.sanSangToanHe();
  assert.ok(!Number.isNaN(Date.parse(kq.docLuc)));
  assert.deepEqual(kq.toanHe, { chan: 0, nhac: 0, san: 1, tong: 1 }, 'ba con số toàn hệ đếm cùng phép đếm `/readiness` cũ');
});
