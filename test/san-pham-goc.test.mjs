// KHO SẢN PHẨM GỐC (`src/products/san-pham-goc.js`) — danh mục do NGƯỜI định nghĩa.
//
// Bảng có từ 15/09, nhưng tới 17/09 vẫn KHÔNG đường nào tạo nó ngoài SQL tay: nơi duy nhất
// sinh dòng là một script chỉ in câu INSERT đề nghị. Ca ở đây canh bốn luật mà tầng này
// phải giữ, vì phá luật nào cũng làm hỏng thứ khác ở xa: mã gốc là khoá mà `san_pham`,
// `kich_ban` và `page` đang trỏ tới.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  taoSanPhamGoc, suaSanPhamGoc, boSanPhamGoc, soHieuChuaCoGoc, LoiSanPhamGoc,
} from '../src/products/san-pham-goc.js';

/** Pool giả: trả theo hình dạng câu, ghi lại mọi câu để bài test soi. */
function poolGia(dap = {}) {
  const cau = [];
  return {
    cau,
    async query(sql, tham = []) {
      cau.push({ sql: sql.replace(/\s+/g, ' ').trim(), tham });
      for (const [khuon, tra] of Object.entries(dap)) {
        if (new RegExp(khuon, 'i').test(sql)) return typeof tra === 'function' ? tra(tham) : tra;
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

const dongGoc = (o = {}) => ({
  id: 1, ma_goc: 'fitgum', ten: 'Fitgum', mo_ta: '', so_hieu: '125',
  tao_luc: new Date(), sua_luc: new Date(), ...o,
});

test('SG1 · mã gốc CẤM dấu hai chấm — đó là dấu của mã POS <shop>:<biến thể>', async () => {
  const pool = poolGia();
  await assert.rejects(
    () => taoSanPhamGoc(pool, 't1', { maGoc: '1328205226:abc', ten: 'X' }),
    (e) => e instanceof LoiSanPhamGoc && e.ma === 'ma_co_hai_cham',
  );
  assert.equal(pool.cau.length, 0, 'mã sai thì KHÔNG được chạm CSDL');
});

test('SG2 · số hiệu bỏ số 0 đứng đầu — `008` và `8` là CÙNG một sản phẩm', async () => {
  // Đo 15/09: POS có cả `008 - Necklace box` lẫn `8 - …` ở hai shop khác nhau. Giữ nguyên
  // chuỗi là đẻ hai sản phẩm gốc cho một thứ, rồi biến thể nối vào hai nơi.
  const pool = poolGia({ 'INSERT INTO san_pham_goc': (tham) => ({ rows: [dongGoc({ so_hieu: tham[4] })], rowCount: 1 }) });
  const kq = await taoSanPhamGoc(pool, 't1', { maGoc: 'necklace-box', ten: 'Necklace box', soHieu: '008' });
  assert.equal(kq.soHieu, '8');
  await assert.rejects(
    () => taoSanPhamGoc(pool, 't1', { maGoc: 'x', soHieu: '12a' }),
    (e) => e.ma === 'so_hieu_la',
  );
});

test('SG3 · sửa KHÔNG bao giờ đụng `ma_goc`', async () => {
  // `san_pham.ma_goc`, `kich_ban.san_pham_goc_ma`, `page.san_pham_goc_ma` đều trỏ bằng MÃ.
  // Một câu UPDATE đổi mã là bỏ rơi mọi chỗ trỏ, im lặng.
  const pool = poolGia({ 'UPDATE san_pham_goc': { rows: [dongGoc({ ten: 'Tên mới' })], rowCount: 1 } });
  await suaSanPhamGoc(pool, 't1', '1', { ten: 'Tên mới', maGoc: 'mã-khác-cố-tình' });
  const up = pool.cau.find((c) => /UPDATE san_pham_goc/.test(c.sql));
  assert.ok(!up.sql.includes('ma_goc ='), 'câu sửa KHÔNG được có vế `ma_goc =`');
  assert.ok(!up.tham.includes('mã-khác-cố-tình'), 'mã gốc nơi gọi truyền tay phải bị BỎ QUA');
});

test('SG4 · không bỏ được sản phẩm gốc còn chỗ trỏ tới, và phải GỌI TÊN chỗ đó', async () => {
  const pool = poolGia({
    'SELECT id, ma_goc, ten FROM san_pham_goc': { rows: [dongGoc()], rowCount: 1 },
    'FROM san_pham WHERE': { rows: [{ c: 12 }] },
    'FROM kich_ban WHERE': { rows: [{ c: 1 }] },
    'FROM page WHERE': { rows: [{ c: 0 }] },
  });
  await assert.rejects(
    () => boSanPhamGoc(pool, 't1', '1'),
    (e) => e.ma === 'dang_duoc_tro_toi'
      && /12 biến thể POS/.test(e.message) && /1 kịch bản/.test(e.message)
      && !/page/.test(e.message),   // 0 page thì KHÔNG kể tên — đếm 0 mà nói ra là gây nhiễu
  );
  assert.ok(!pool.cau.some((c) => /DELETE/.test(c.sql)), 'bị từ chối thì KHÔNG được xoá');
});

test('SG5 · số hiệu đang chờ: gom theo số, bỏ số đã có gốc, đếm biến thể không có số', async () => {
  const pool = poolGia({
    'SELECT ten, ma FROM san_pham': { rows: [
      { ten: '125 - Fitgum Acai Berry', ma: 's1:a' },
      { ten: '125 - Fitgum Acai Berry', ma: 's2:b' },   // cùng số, shop khác ⇒ một việc thôi
      { ten: '008 - Necklace box', ma: 's1:c' },
      { ten: '99 - Đã có gốc', ma: 's1:d' },
      { ten: 'Không số hiệu', ma: 's1:e' },
    ] },
    'SELECT so_hieu FROM san_pham_goc': { rows: [{ so_hieu: '99' }] },
  });
  const kq = await soHieuChuaCoGoc(pool, 't1');
  assert.deepEqual(kq.cho.map((c) => c.soHieu), ['8', '125'], 'sắp theo số, và `008` quy về `8`');
  assert.equal(kq.cho.find((c) => c.soHieu === '125').soBienThe, 2);
  assert.equal(kq.khongCoSoHieu, 1, 'biến thể không có số hiệu phải được ĐẾM, không nuốt im');
});
