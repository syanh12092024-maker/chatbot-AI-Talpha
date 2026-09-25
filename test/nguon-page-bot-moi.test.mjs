// «PAGE NÀY THUỘC CON BOT NÀO» — NGUỒN NÀO ĐANG CÓ HIỆU LỰC (024 · 25/09).
//
// Một page lọt vào cả hai chiều (bot mới nhặt, bot cũ chưa buông) là khách nhận HAI câu trả
// lời cho một câu hỏi. Nguồn của danh sách ấy vừa đổi từ biến môi trường sang CSDL, nên bộ
// ca này canh đúng ba điều: vắng cầu dao thì KHÔNG đổi gì, mở cầu dao thì đọc CSDL, và
// phanh tay chỉ THU HẸP chứ không bao giờ nới ra.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dsPageBotMoi, dsPageV3, pageThuocV3, pageThuocBotMoi, giaoTrenManDangMo, lyDoRong,
  BIEN_GIAO_TREN_MAN,
} from '../src/queue/page-routing.js';

/** Pool giả: chỉ có đúng một câu hỏi được phép hỏi, và ca đếm xem có hỏi không. */
function poolGia(pageIds) {
  const goi = [];
  return {
    goi,
    query: async (sql) => {
      goi.push(sql);
      return { rows: pageIds.map((p) => ({ page_id: p })) };
    },
  };
}

test('① VẮNG cầu dao = KHÔNG ĐỔI GÌ — đọc biến môi trường, và không đụng CSDL', async () => {
  // Luật 1 của bảng biến: vắng = đóng. Bản mã mới không được tự đổi hành vi của máy đang chạy.
  const pool = poolGia(['999']);
  const ds = await dsPageBotMoi(pool, { V3_PAGE_XU_LY: '111, 222' });
  assert.deepEqual(ds, ['111', '222']);
  assert.equal(pool.goi.length, 0, 'cầu dao đóng mà vẫn hỏi CSDL là tốn một lời gọi mỗi vòng worker');
});

test('② MỞ cầu dao ⇒ nguồn là CSDL', async () => {
  const pool = poolGia(['333', '444']);
  const ds = await dsPageBotMoi(pool, { [BIEN_GIAO_TREN_MAN]: '1' });
  assert.deepEqual(ds, ['333', '444']);
  assert.equal(pool.goi.length, 1);
  assert.match(pool.goi[0], /giao_bot_moi\s*=\s*true/, 'phải lọc đúng cột cờ');
});

test('③ BẬT CẦU DAO KHÔNG ĐƯỢC LÀM RƠI PAGE ĐANG CHẠY — hợp, không phải giao', async () => {
  // Ca này sinh ra từ một lỗi thật của chính lượt làm (25/09): bản đầu lấy GIAO hai tập, và
  // mở màn trên bản dev thì 4 page đang chạy bot mới bỗng hiện «bot cũ».
  //
  // Page có tên trong `V3_PAGE_XU_LY` thì BOT CŨ ĐÃ TRÁNH RA (`pancake-poll.js:263`). Bỏ nó
  // khỏi tay bot mới là để một page KHÔNG CON NÀO trả lời — im lặng, và không màn nào kêu.
  const pool = poolGia(['333']);
  const ds = await dsPageBotMoi(pool, { [BIEN_GIAO_TREN_MAN]: '1', V3_PAGE_XU_LY: '111' });
  assert.deepEqual(ds, ['111', '333'], 'page trong cấu hình máy chủ phải Ở LẠI với bot mới');
});

test('④ không có cờ trong CSDL cũng không đánh rơi danh sách cấu hình', async () => {
  const pool = poolGia([]);
  assert.deepEqual(
    await dsPageBotMoi(pool, { [BIEN_GIAO_TREN_MAN]: '1', V3_PAGE_XU_LY: '111, 222' }),
    ['111', '222'],
  );
  // Và ngược lại: không đặt biến nào thì chỉ còn CSDL, không tự bó về rỗng.
  const pool2 = poolGia(['999']);
  assert.deepEqual(await dsPageBotMoi(pool2, { [BIEN_GIAO_TREN_MAN]: '1' }), ['999']);
});

test('④b PHANH TAY lúc sự cố = TẮT CẦU DAO, và nó trả chủ sở hữu về đúng cấu hình máy chủ', async () => {
  // Không có phanh thứ hai, và cố ý: hai cái phanh cho một thứ là hai luật.
  const pool = poolGia(['333']);
  assert.deepEqual(await dsPageBotMoi(pool, { V3_PAGE_XU_LY: '111' }), ['111']);
  assert.equal(pool.goi.length, 0, 'tắt cầu dao rồi thì CSDL không còn tiếng nói');
});

test('⑤ cầu dao chỉ nhận đúng chuỗi "1"', async () => {
  for (const v of [undefined, '', '0', 'true', 'yes', ' 1']) {
    assert.equal(giaoTrenManDangMo({ [BIEN_GIAO_TREN_MAN]: v }), false, `"${v}" không được coi là mở`);
  }
  assert.equal(giaoTrenManDangMo({ [BIEN_GIAO_TREN_MAN]: '1' }), true);
});

test('⑥ câu «vì sao rỗng» phải nói ĐÚNG nguồn đang dùng', async () => {
  // Một câu log chỉ đường sai còn tệ hơn không có: người ta đi sửa biến môi trường trong khi
  // nguồn thật đang là CSDL.
  assert.match(lyDoRong({}), /V3_PAGE_XU_LY/);
  assert.match(lyDoRong({ [BIEN_GIAO_TREN_MAN]: '1' }), /giao_bot_moi|CSDL/);
});

test('⑦ hai hàm CŨ giữ nguyên hành vi — bot cũ vẫn đọc bằng chúng', async () => {
  // `pancake-poll.js` và `scheduler-followup.js` là tệp đóng băng, chúng gọi hai hàm này
  // đồng bộ. Đổi chữ ký ở đây là làm hỏng bot đang phục vụ 51 page thật.
  assert.deepEqual(dsPageV3({ V3_PAGE_XU_LY: 'a,b' }), ['a', 'b']);
  assert.equal(pageThuocV3('a', { V3_PAGE_XU_LY: 'a,b' }), true);
  assert.equal(pageThuocV3('c', { V3_PAGE_XU_LY: 'a,b' }), false);
});


test('⑧ `pageThuocBotMoi` đọc cùng một luật với `dsPageBotMoi`', async () => {
  const trongEnv = { page_id: '111', giao_bot_moi: false };
  const daGiao = { page_id: '222', giao_bot_moi: true };
  const chuaGi = { page_id: '333', giao_bot_moi: false };

  // cầu dao ĐÓNG: chỉ cấu hình máy chủ nói
  assert.equal(pageThuocBotMoi(trongEnv, { V3_PAGE_XU_LY: '111' }), true);
  assert.equal(pageThuocBotMoi(daGiao, { V3_PAGE_XU_LY: '111' }), false, 'cột nằm im khi cầu dao đóng');

  // cầu dao MỞ: hợp của hai nguồn
  const mo = { [BIEN_GIAO_TREN_MAN]: '1', V3_PAGE_XU_LY: '111' };
  assert.equal(pageThuocBotMoi(trongEnv, mo), true, 'page trong cấu hình máy chủ KHÔNG được rơi');
  assert.equal(pageThuocBotMoi(daGiao, mo), true);
  assert.equal(pageThuocBotMoi(chuaGi, mo), false);

  // Dòng thiếu cột (mã cũ, hoặc `SELECT` không lấy cột) ⇒ sai về phía ĐÓNG.
  assert.equal(pageThuocBotMoi({ page_id: '444' }, mo), false);
  assert.equal(pageThuocBotMoi(null, mo), false);
});
