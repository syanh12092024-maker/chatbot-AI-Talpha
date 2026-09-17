// KÉO DANH MỤC POS CHO CẢ TEAM (`src/pos/keo-danh-muc.js`).
//
// Vòng ngoài này tồn tại vì một lý do đo được: `docDanhMuc()` đã đúng từ L1-M1 nhưng
// KHÔNG nút nào gọi, nên `san_pham` của v3 rỗng còn bot v1 vẫn bán 71 sản phẩm từ Sheet.
// Ba ca dưới canh đúng ba chỗ vòng ngoài dễ làm hỏng việc của vòng trong.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keoDanhMucTeam } from '../src/pos/keo-danh-muc.js';

const ketNoi = (ds) => async () => ds;
const docGia = (theoShop) => async (_pool, _ctx, { shop }) => {
  if (theoShop[shop] instanceof Error) throw theoShop[shop];
  return { docDuoc: 10, them: 2, capNhat: 8, giaGhiDuoc: 3, khongCoTen: ['1'], chuaCoSanPhamGoc: ['77'], ...theoShop[shop] };
};

test('KD1 · chỉ kéo kết nối ĐANG BẬT, cộng dồn theo thị trường', async () => {
  const kq = await keoDanhMucTeam({}, {}, {
    lietKe: ketNoi([
      { market: 'KSA', shopId: '1', bat: true },
      { market: 'UAE', shopId: '2', bat: true },
      { market: 'Kuwait', shopId: '3', bat: false },   // TẮT = người vận hành đã ngừng dùng
    ]),
    doc: docGia({ KSA: {}, UAE: {} }),
  });
  assert.equal(kq.thiTruong, 2, 'kết nối TẮT không được kéo — tắt là cách đúng để ngừng dùng một shop');
  assert.equal(kq.docDuoc, 20);
  assert.equal(kq.them, 4);
  assert.deepEqual(kq.theo.map((t) => t.market), ['KSA', 'UAE']);
});

test('KD2 · một thị trường hỏng KHÔNG làm chết cả lượt, và được gọi tên', async () => {
  // Khoá POS sai chỉ lộ ở lượt gọi thật (`themKetNoi` cố ý không gọi thử). Nếu một thị
  // trường ném mà cả lượt chết thì các thị trường còn lại mất lượt kéo, và người bấm
  // không biết cái nào hỏng — đúng kiểu hỏng câm mà cả dự án này đang đi xoá.
  const kq = await keoDanhMucTeam({}, {}, {
    lietKe: ketNoi([
      { market: 'KSA', shopId: '1', bat: true },
      { market: 'UAE', shopId: '2', bat: true },
      { market: 'Taiwan', shopId: '3', bat: true },
    ]),
    doc: docGia({ KSA: {}, UAE: new Error('POS từ chối khoá API'), Taiwan: {} }),
  });
  assert.equal(kq.hong.length, 1);
  assert.equal(kq.hong[0].market, 'UAE');
  assert.match(kq.hong[0].loi, /từ chối khoá API/);
  assert.equal(kq.theo.length, 2, 'hai thị trường còn lại VẪN được kéo');
  assert.equal(kq.docDuoc, 20);
});

test('KD3 · team chưa có kết nối POS nào bật → rỗng, không gọi POS lần nào', async () => {
  let goi = 0;
  const kq = await keoDanhMucTeam({}, {}, {
    lietKe: ketNoi([{ market: 'KSA', shopId: '1', bat: false }]),
    doc: async () => { goi += 1; return {}; },
  });
  assert.equal(kq.rong, true);
  assert.equal(goi, 0, 'không có kết nối bật ⇒ KHÔNG gọi POS, không tiêu một lượt API nào');
});

test('KD4 · gom số hiệu CHƯA có sản phẩm gốc, không trùng lặp', async () => {
  // Đây là danh sách việc cho người (CR3): số hiệu đọc được từ POS mà chưa ai đặt tên.
  const kq = await keoDanhMucTeam({}, {}, {
    lietKe: ketNoi([{ market: 'KSA', shopId: '1', bat: true }, { market: 'UAE', shopId: '2', bat: true }]),
    doc: docGia({ KSA: { chuaCoSanPhamGoc: ['77', '88'] }, UAE: { chuaCoSanPhamGoc: ['88', '99'] } }),
  });
  assert.deepEqual(kq.chuaCoSanPhamGoc, ['77', '88', '99']);
});
