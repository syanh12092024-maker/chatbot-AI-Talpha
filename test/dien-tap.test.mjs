// CHẾ ĐỘ DIỄN TẬP — chạy bot trên hội thoại thật, KHÔNG gửi, và ghi lại tin ĐỊNH gửi.
//
// Ba thứ phép đo phải trả lời được: bot hiểu hội thoại không · tư vấn có được không · trả
// lời nhanh không. Muốn đo cả ba thì lượt xử lý phải chạy THẬT tới tận cửa gửi rồi mới
// dừng — dừng sớm hơn (ở van, như trước lượt này) thì không có gì để chấm.
//
// Ca ở đây canh cái quan trọng nhất: **diễn tập tuyệt đối không gọi mạng**.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bocCuaGuiBen, dangDienTap } from '../src/queue/lan-gui.js';

const tin = { id: 7, team_id: 't1' };

function poolGia() {
  const cau = [];
  return {
    cau,
    async query(sql, tham = []) {
      cau.push({ sql: sql.replace(/\s+/g, ' ').trim(), tham });
      if (/INSERT INTO lan_gui/.test(sql)) return { rowCount: 1, rows: [{ id: 99 }] };
      return { rowCount: 0, rows: [] };
    },
  };
}

/** Cửa gửi giả — mỗi lần bị gọi là một lượt sẽ bay ra khách thật. */
function cuaDem() {
  const goi = [];
  const f = (loai) => async (...args) => { goi.push([loai, args[2]]); return { ok: true, id: 'x1' }; };
  return { goi, guiTin: f('guiTin'), guiAnh: f('guiAnh'), ghiNote: f('ghiNote'), gatThe: f('gatThe') };
}

test('DT1 · diễn tập: ghi nội dung định gửi vào sổ, và KHÔNG gọi cửa lần nào', async () => {
  const pool = poolGia();
  const cua = cuaDem();
  const boc = bocCuaGuiBen(pool, tin, cua, { env: { V3_DIEN_TAP: '1' } });
  const r = await boc.guiTin('page', 'conv', 'Chào chị, combo 2 hộp 149 SAR ạ');

  assert.equal(r.ok, true, 'phải trả thành công giả để vòng xử lý đi tiếp như một lượt thật');
  assert.equal(r.dienTap, true);
  assert.deepEqual(cua.goi, [], 'KHÔNG một lượt gọi mạng nào — đây là cả lý do chế độ này tồn tại');

  const ins = pool.cau.find((c) => /INSERT INTO lan_gui/.test(c.sql));
  assert.equal(ins.tham[5], 'dien_tap', 'trạng thái phải là dien_tap, không phải dang_gui');
  assert.match(ins.tham[4], /149 SAR/, 'nội dung định gửi phải nằm trong sổ — đó là thứ đem ra chấm');
});

test('DT2 · KHÔNG diễn tập: vẫn gọi cửa như cũ và đánh dấu da_gui', async () => {
  const pool = poolGia();
  const cua = cuaDem();
  const boc = bocCuaGuiBen(pool, tin, cua, { env: {} });
  await boc.guiTin('page', 'conv', 'tin thật');
  assert.equal(cua.goi.length, 1, 'không diễn tập thì cửa PHẢI được gọi');
  const ins = pool.cau.find((c) => /INSERT INTO lan_gui/.test(c.sql));
  assert.equal(ins.tham[5], 'dang_gui');
  assert.ok(pool.cau.some((c) => /da_gui/.test(c.sql)), 'gửi xong phải đánh dấu da_gui');
});

test('DT3 · diễn tập chặn CẢ BỐN thao tác, không chỉ gửi tin', async () => {
  // Ghi chú và thẻ cũng hiện ra trước mắt sale trong inbox Pancake — «không gửi tin» mà
  // vẫn gắn thẻ thì phép đo vẫn để lại vết trên dữ liệu của khách.
  const pool = poolGia();
  const cua = cuaDem();
  const boc = bocCuaGuiBen(pool, tin, cua, { env: { V3_DIEN_TAP: '1' } });
  await boc.guiTin('p', 'c', 'x');
  await boc.guiAnh('p', 'c', { url: 'http://anh' });
  await boc.ghiNote('p', 'c', 'ghi chú');
  await boc.gatThe('p', 'c', 'AI Chăm');
  assert.deepEqual(cua.goi, [], 'cả bốn cửa đều phải im');
  assert.equal(pool.cau.filter((c) => /INSERT INTO lan_gui/.test(c.sql)).length, 4, 'và cả bốn đều được ghi sổ');
});

test('DT4 · cờ đọc từ env truyền vào, không phải biến toàn cục', async () => {
  assert.equal(dangDienTap({ V3_DIEN_TAP: '1' }), true);
  assert.equal(dangDienTap({ V3_DIEN_TAP: '0' }), false);
  assert.equal(dangDienTap({}), false, 'vắng biến = KHÔNG diễn tập (và cửa gửi vẫn do van canh)');
});
