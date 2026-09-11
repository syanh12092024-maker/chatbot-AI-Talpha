// DẢI TRẠNG THÁI — bài canh đúng một câu: «0 page đang bật» khác «chưa biết».
//
// Án lệ 11/09: người tiếp quản mở dashboard, đọc huy hiệu «501 page» thành «hệ đang chạy
// 501 page». Thật ra 0 page bật AI và Sổ AI đứng 13,7 ngày. Dải này sinh ra để câu đó
// không xảy ra lần nữa — nên nó KHÔNG được phép nói sai theo chiều ngược lại: trả 0 khi
// thật ra chưa đọc được là dựng một báo động giả, và báo động giả thì người ta tắt.

import test from 'node:test';
import assert from 'node:assert/strict';
import * as tt from '../../src/ui/chung/trang-thai.js';

test('① chưa nối bộ đọc → nói CHƯA ĐỌC ĐƯỢC, không nói 0', async () => {
  tt.datDocSanSang(null);
  const r = await tt.docTrangThai();
  assert.equal(r.docDuoc, false);
  assert.equal(r.aiBat, null, 'aiBat phải là null, KHÔNG phải 0 — 0 là một lời khai sai');
  assert.equal(r.tong, null);
  assert.match(r.viSao, /cầu|bot/i, 'phải nói vì sao, và chỉ đường đi tiếp');
});

test('② nối rồi → đếm đúng số page aiEnabled', async () => {
  tt.datDocSanSang(async () => ({ pages: [
    { pageId: '1', aiEnabled: true }, { pageId: '2', aiEnabled: false },
    { pageId: '3', aiEnabled: true }, { pageId: '4' },
  ] }));
  tt.xoaNho();
  const r = await tt.docTrangThai();
  assert.deepEqual([r.docDuoc, r.aiBat, r.tong], [true, 2, 4]);
});

test('③ KHÔNG page nào bật → 0/N, và vẫn là ĐỌC ĐƯỢC', async () => {
  tt.datDocSanSang(async () => ({ pages: [{ pageId: '1', aiEnabled: false }] }));
  tt.xoaNho();
  const r = await tt.docTrangThai();
  assert.equal(r.docDuoc, true, 'đọc được thật thì phải nói đọc được');
  assert.equal(r.aiBat, 0, 'và LÚC NÀY số 0 mới đúng — đây là cảnh 11/09');
});

test('④ bộ đọc NÉM → chưa đọc được, tuyệt đối không trả 0', async () => {
  tt.datDocSanSang(async () => { throw new Error('hết giờ'); });
  tt.xoaNho();
  const r = await tt.docTrangThai();
  assert.equal(r.docDuoc, false);
  assert.equal(r.aiBat, null, 'cầu hỏng mà báo 0 page bật là gọi người dậy giữa đêm vì một lỗi mạng');
  assert.match(r.viSao, /hết giờ/);
});

test('⑤ nhớ tạm 60 giây — menu nhúng ở mọi trang, không được gọi sang bot mỗi lượt mở', async () => {
  let lan = 0;
  tt.datDocSanSang(async () => { lan += 1; return { pages: [{ pageId: '1', aiEnabled: true }] }; });
  tt.xoaNho();
  const t0 = 1_000_000;
  await tt.docTrangThai({ bayGio: t0 });
  await tt.docTrangThai({ bayGio: t0 + 59_000 });
  assert.equal(lan, 1, 'trong 60 giây chỉ được gọi sang bot MỘT lần');
  await tt.docTrangThai({ bayGio: t0 + 61_000 });
  assert.equal(lan, 2, 'quá 60 giây thì phải đọc lại — số cũ quá thì vô dụng');
});

test('⑥ lỗi KHÔNG được nhớ tạm — cầu sống lại là dải phải đúng ngay', async () => {
  let lan = 0;
  tt.datDocSanSang(async () => { lan += 1; throw new Error('sập'); });
  tt.xoaNho();
  await tt.docTrangThai();
  await tt.docTrangThai();
  assert.equal(lan, 2, 'nhớ tạm một lỗi là giữ màn hình sai suốt một phút sau khi đã sửa xong');
});
