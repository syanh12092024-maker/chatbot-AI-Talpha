// QUÉT PANCAKE → BẢNG `page` (`src/quet-page.js`).
//
// Ca ở đây canh đúng một câu hỏi: **một lượt quét có được phép làm mất công người không?**
// Án lệ 15/09 đã trả giá cho câu này ở đường di trú — lượt «Kéo dữ liệu về» ghi đè thẳng
// `thi_truong`, xoá sạch thứ người vừa nhập trên màn, và không ai được báo. Bộ quét này
// chạy THƯỜNG XUYÊN hơn di trú nhiều, nên cùng lỗi ở đây sẽ đau hơn.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quetVaGhiPage, TEAM_CHUA_PHAN } from '../src/quet-page.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = fs.readFileSync(path.join(GOC, 'src/quet-page.js'), 'utf8');

/** Pool giả: ghi lại mọi câu SQL, trả kết quả theo khuôn của câu đó. */
function poolGia({ team = [{ id: 't9' }], daCo = [] } = {}) {
  const cau = [];
  return {
    cau,
    async query(sql, tham = []) {
      cau.push({ sql, tham });
      if (/FROM team WHERE slug/.test(sql)) return { rowCount: team.length, rows: team };
      if (/INSERT INTO page/.test(sql)) {
        return { rows: [{ la_moi: !daCo.includes(String(tham[1])) }] };
      }
      if (/SELECT page_id FROM page/.test(sql)) return { rows: daCo.map((id) => ({ page_id: id })) };
      return { rows: [], rowCount: 0 };
    },
  };
}

const quetGia = (ds) => ({
  quet: async () => ds.length,
  doc: () => new Map(ds.map((p) => [String(p.id), p])),
});

test('QP1 · page mới vào team chưa-phân, page cũ chỉ được cập nhật', async () => {
  const pool = poolGia({ daCo: ['100'] });
  const kq = await quetVaGhiPage(pool, quetGia([{ id: '100', name: 'Page cũ' }, { id: '200', name: 'Page mới' }]));
  assert.equal(kq.nguon, 2);
  assert.equal(kq.them, 1);
  assert.equal(kq.capNhat, 1);
  assert.equal(kq.teamMoi, TEAM_CHUA_PHAN);
  const insert = pool.cau.filter((c) => /INSERT INTO page/.test(c.sql));
  assert.equal(insert.length, 2);
  assert.deepEqual(insert.map((c) => c.tham[1]), ['100', '200']);
});

test('QP2 · câu upsert KHÔNG đụng cột nào của người đặt', async () => {
  // Đọc THẲNG chuỗi SQL, không đọc kết quả: cột chỉ cần xuất hiện ở vế UPDATE là đủ hỏng,
  // và một pool giả sẽ không bao giờ nhìn thấy điều đó.
  // Neo vào chính CÂU, không vào chuỗi 'INSERT INTO page' đầu tiên của tệp — chuỗi ấy còn
  // nằm trong khối chú thích đầu file, và cắt từ đó thì bài test đọc cả lời giải thích.
  const cau = NGUON.slice(NGUON.indexOf('INSERT INTO page (team_id'), NGUON.indexOf('RETURNING (xmax'));
  for (const cot of [
    'marketer', 'thi_truong', 'nganh_hang', 'trong_diem', 'botcake_tat',
    'bot_ai_bat', 'v3_ai_bat', 'pos_shop_id', 'san_pham_goc_ma', 'nguon_tin',
  ]) {
    assert.ok(!cau.includes(cot), `câu quét KHÔNG được nhắc cột "${cot}" — đó là công của người hoặc công tắc chạm khách`);
  }
  // `team_id` chỉ được ở vế INSERT: page cũ không bị một lượt quét kéo về team chưa-phân.
  const veUpdate = cau.slice(cau.indexOf('DO UPDATE'));
  assert.ok(!veUpdate.includes('team_id'), 'page cũ phải GIỮ team của nó');
});

test('QP3 · quét ra RỖNG thì không ghi một câu nào và nói rõ là rỗng', async () => {
  // Token hỏng/hết hạn là lúc dễ mất dữ liệu nhất: nếu coi «không thấy page» là «page đã
  // biến mất» thì một lượt quét hỏng sẽ xoá sổ cả danh mục.
  const pool = poolGia({ daCo: ['100'] });
  const kq = await quetVaGhiPage(pool, quetGia([]));
  assert.equal(kq.rong, true);
  assert.equal(kq.them + kq.capNhat, 0);
  assert.equal(pool.cau.length, 0, 'không token/không page ⇒ KHÔNG chạm CSDL, kể cả câu đọc team');
});

test('QP4 · page trong CSDL mà lượt quét không thấy: ĐẾM ra, KHÔNG đánh dấu mất', async () => {
  const pool = poolGia({ daCo: ['100', '300'] });
  const kq = await quetVaGhiPage(pool, quetGia([{ id: '100', name: 'Còn thấy' }]));
  assert.equal(kq.khongThay, 1, 'page 300 không thấy ở lượt này');
  const doi = pool.cau.filter((c) => /UPDATE page SET|mat_dau/.test(c.sql));
  assert.deepEqual(doi, [], 'một lượt quét thiếu page KHÔNG chứng minh page biến mất — cấm tự đánh dấu');
});
