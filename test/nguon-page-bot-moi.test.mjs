// «BOT CÓ TRẢ LỜI PAGE NÀY KHÔNG» — MỘT BẢN, MỘT CÔNG TẮC (CR-02-10 · MB2, 02/10).
//
// Trước 02/10 bộ ca này canh việc phân xử «page thuộc bot cũ hay bot mới» giữa biến môi trường
// `V3_PAGE_XU_LY`, cầu dao `V3_GIAO_PAGE_TREN_MAN` và cột `giao_bot_moi`. v1 nghỉ hưu nên khái niệm
// «giao» không còn: worker nạp đúng những page có `page.bot_ai_bat = true`. Ca canh: một nguồn
// (cột), biến cũ KHÔNG còn tác dụng, và mọi lời gọi danh sách đều `await` kèm `pool`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dsPageBotTraLoi, botDangTraLoi, lyDoRong, pageThuocV3 } from '../src/queue/page-routing.js';

/** Pool giả: ghi lại câu hỏi để ca soi đúng cột. */
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

test('① nguồn DUY NHẤT là cột `bot_ai_bat` — một câu hỏi CSDL', async () => {
  const pool = poolGia(['333', '444']);
  assert.deepEqual(await dsPageBotTraLoi(pool), ['333', '444']);
  assert.equal(pool.goi.length, 1);
  assert.match(pool.goi[0], /bot_ai_bat\s*=\s*true/, 'phải lọc đúng cột công tắc');
  assert.doesNotMatch(pool.goi[0], /giao_bot_moi|v3_ai_bat/, 'cột của thời hai bot không còn là nguồn');
});

test('② biến cũ KHÔNG còn tác dụng: đặt `V3_PAGE_XU_LY` / cầu dao cũng không thêm page nào', async () => {
  const cu = { a: process.env.V3_PAGE_XU_LY, b: process.env.V3_GIAO_PAGE_TREN_MAN };
  process.env.V3_PAGE_XU_LY = '111,222'; process.env.V3_GIAO_PAGE_TREN_MAN = '1';
  try {
    assert.deepEqual(await dsPageBotTraLoi(poolGia([])), [], 'không page nào bật thì worker không nạp gì, dù biến cũ còn đặt');
  } finally {
    for (const [k, v] of [['V3_PAGE_XU_LY', cu.a], ['V3_GIAO_PAGE_TREN_MAN', cu.b]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('③ `botDangTraLoi` đọc cùng một luật — chỉ `true` thật mới là bật; thiếu cột là ĐÓNG', () => {
  assert.equal(botDangTraLoi({ page_id: '1', bot_ai_bat: true }), true);
  assert.equal(botDangTraLoi({ page_id: '1', bot_ai_bat: false }), false);
  assert.equal(botDangTraLoi({ page_id: '1' }), false, 'dòng đọc thiếu cột ⇒ sai về phía ĐÓNG');
  assert.equal(botDangTraLoi({ page_id: '1', giao_bot_moi: true, v3_ai_bat: true }), false, 'cột cũ không bật được bot');
  assert.equal(botDangTraLoi(null), false);
});

test('④ câu «vì sao rỗng» chỉ đúng chỗ bật — cột và màn Công tắc', () => {
  assert.match(lyDoRong(), /bot_ai_bat/);
  assert.match(lyDoRong(), /Công tắc từng page/);
  assert.doesNotMatch(lyDoRong(), /V3_PAGE_XU_LY/);
});

test('⑤ hàm còn lại cho tệp v1 (lùi MB3) KHÔNG nhận page nào — không đọc biến môi trường', () => {
  const cu = process.env.V3_PAGE_XU_LY;
  process.env.V3_PAGE_XU_LY = '111';
  try { assert.equal(pageThuocV3('111'), false); }
  finally { if (cu === undefined) delete process.env.V3_PAGE_XU_LY; else process.env.V3_PAGE_XU_LY = cu; }
});

test('⑨ mọi lời gọi hàm danh sách page đều `await` VÀ có truyền `pool`', async () => {
  // Đo được 25/09 khi kéo hội thoại Minty trên bản dev: dòng khởi động của worker vẫn gọi
  // kiểu cũ `dsPageChoPhep()` — nhận Promise, log nói «KHÔNG CÓ page nào» trong khi vòng
  // lặp vẫn chạy page. Và nếu cầu dao mở thì `pool.query` trên `undefined` ném lỗi không ai
  // bắt ⇒ tiến trình SẬP lúc khởi động. Thước này đọc THẲNG mã nguồn để nó không mọc lại.
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  // `fileURLToPath`, KHÔNG `new URL(...).pathname`: thư mục dự án có dấu cách («AI Chatbot»),
  // và `pathname` giữ nguyên `%20` ⇒ readdir không tìm thấy thư mục.
  const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sai = [];
  const duyet = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') duyet(f); continue; }
      if (!/\.(m?js)$/.test(e.name)) continue;
      const dong = fs.readFileSync(f, 'utf8').split('\n');
      dong.forEach((l, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;   // dòng chú thích — trích lời gọi cũ để giải thích
        const m = l.match(/\b(dsPageChoPhep|dsPageBotTraLoi)\(([^)]*)\)/);
        if (!m || /function\s|export const|=>\s*dsPageBotTraLoi/.test(l)) return;
        if (!/await\s*\(?[^;]*\b(dsPageChoPhep|dsPageBotTraLoi)\(/.test(l) || !m[2].trim()) {
          sai.push(`${path.relative(goc, f)}:${i + 1}  ${l.trim()}`);
        }
      });
    }
  };
  duyet(path.join(goc, 'src'));
  assert.deepEqual(sai, [], 'gọi hàm bất đồng bộ mà không await, hoặc thiếu pool');
});
