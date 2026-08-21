// Nghiệm thu bản vá 21/08/2026 — ẢNH KHÔNG ĐƯỢC BAY ĐI TRƯỚC CỬA NHƯỜNG BOTCAKE.
//
// Lỗi được vá: tool `send_product_image` gửi ảnh NGAY giữa lượt, trong lúc model còn
// đang viết. Cửa nhường Botcake ở pancake-poll chạy sau đó chỉ vứt được TIN CHỮ —
// ảnh thì đã ở trên Messenger của khách rồi. Đo trên Sổ AI ngày 21/08/2026:
// 137/242 lượt nhường để lại khách với "ảnh trơ" (khách hỏi giá, nhận về mấy tấm ảnh
// và một câu caption, không có câu trả lời).
//
// Bản vá: tool chỉ XẾP HÀNG vào state.pendingImages; `flushPendingImages` gửi thật,
// và pancake-poll chỉ gọi nó SAU cửa nhường. Nhường thì bỏ cả cụm, gửi thì ảnh + chữ đi liền.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeTool, flushPendingImages } from '../src/tools.js';

const KB = {
  products: [{
    id: 'SP01', name: 'Kem X', currency: 'SAR',
    images: [
      { url: 'https://x/sp1.jpg', label: 'Ảnh sản phẩm' },
      { url: 'https://x/sp2.jpg', label: 'Ảnh sản phẩm' },
      { url: 'https://x/fb1.jpg', label: 'Feedback' },
    ],
  }],
};
// Không có pkConvId/pkCustId → kênh Messenger; ta chặn luôn ở tầng gửi bằng cách
// kiểm tra hàng đợi TRƯỚC khi flush, nên không tin nào ra ngoài trong test này.
const newState = () => ({ pageId: 'P1', psid: 'u1', pendingImages: [], pendingCaption: '', sentImages: new Set() });

test('tool gửi ảnh chỉ XẾP HÀNG, không gửi ngay', async () => {
  const state = newState();
  const r = await executeTool('send_product_image', { caption: 'Here po ang actual photo 😊' }, { kb: KB, state });

  assert.equal(r.isError, undefined, 'xếp hàng thành công thì không phải lỗi');
  assert.ok(state.pendingImages.length > 0, 'ảnh phải nằm trong hàng đợi');
  assert.equal(state.pendingCaption, 'Here po ang actual photo 😊', 'caption giữ lại chờ gửi kèm');
  assert.equal(state.selfSent || 0, 0, 'CHƯA gửi tấm nào → không đếm tin của chính mình');
  assert.equal(state.sentImages.size, 0, 'chưa gửi thì chưa đánh dấu đã gửi — lượt sau còn dùng lại được');
  assert.ok(state.sentImageTurn, 'closer vẫn phải biết lượt này có ảnh để BẮT BUỘC viết chữ');
  assert.match(r.content, /VIẾT TIN CHỮ/, 'kết quả tool vẫn ép model viết chữ');
  assert.match(r.content, /KHÔNG viết chữ thì ảnh cũng KHÔNG được gửi/, 'nói rõ ảnh phụ thuộc tin chữ');
});

test('nhường Botcake sau khi model đã gọi tool → khách KHÔNG nhận ảnh trơ', async () => {
  const state = newState();
  await executeTool('send_product_image', { caption: 'ảnh nè' }, { kb: KB, state });
  assert.ok(state.pendingImages.length, 'có ảnh chờ gửi');

  // pancake-poll nhường: bỏ cả cụm, KHÔNG gọi flush.
  state.pendingImages = []; state.pendingCaption = '';

  const out = await flushPendingImages(state);
  assert.deepEqual(out, { sent: 0, total: 0 }, 'không còn gì để gửi → khách không nhận tấm nào');
});

test('trần ảnh tính cho CẢ LƯỢT, model gọi tool 2 lần cũng không vượt', async () => {
  const state = newState();
  await executeTool('send_product_image', { caption: 'lần 1' }, { kb: KB, state });
  const n1 = state.pendingImages.length;
  const r2 = await executeTool('send_product_image', { category: 'feedback', caption: 'lần 2' }, { kb: KB, state });

  assert.ok(state.pendingImages.length >= n1, 'hàng đợi chỉ có thể dài thêm');
  assert.ok(state.pendingImages.length <= 4, 'tổng cả lượt không vượt trần ảnh của page');
  const urls = state.pendingImages.map((im) => im.url);
  assert.equal(new Set(urls).size, urls.length, 'không xếp trùng một ảnh hai lần');
  if (r2.isError) assert.match(r2.content, /VIẾT TIN CHỮ/, 'hết chỗ thì đuổi model đi viết chữ');
  assert.equal(state.pendingCaption, 'lần 1', 'caption của lần gọi đầu được giữ — không nhắc lại dưới mỗi tấm');
});

test('page không có ảnh → báo lỗi mềm, không xếp hàng gì', async () => {
  const state = newState();
  const r = await executeTool('send_product_image', { caption: 'x' }, { kb: { products: [{ id: 'SP', images: [] }] }, state });
  assert.equal(r.isError, true);
  assert.equal(state.pendingImages.length, 0);
});
