// LL15d · MARKETER PHỤ TRÁCH NỐI HỒ SƠ HRM — tầng A trên Postgres THẬT (hộp cát, migration 031) + gợi ý từ đơn POS (hàm thuần +
// bộ đọc đệm, BigQuery giả).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import * as spGoc from '../src/products/san-pham-goc.js';
import { goiYChoSanPham, taoDocGoiYMarketer, SQL_DON_MARKETER, SO_NGAY } from '../src/hrm/goi-y-marketer.js';

async function dung(t) {
  const sb = await dungSandbox(`ll15d_${Math.random().toString(36).slice(2, 8)}`);
  t.after(() => sb.don());
  const pool = sb.pool;
  const teamId = String((await pool.query("SELECT id FROM team WHERE slug = 'tieu-alpha'")).rows[0].id);
  const ins = async (q, a) => (await pool.query(q, a)).rows[0];
  const a = await ins("INSERT INTO san_pham_goc (team_id, ma_goc, ten) VALUES ($1, 'sp-a', 'SP A') RETURNING id", [teamId]);
  await pool.query("INSERT INTO page (team_id, page_id, ten, san_pham_goc_ma, marketer) VALUES ($1, 'fb1', 'P1', 'sp-a', 'cũ'), ($1, 'fb2', 'P2', NULL, '')", [teamId]);
  await pool.query("INSERT INTO san_pham (team_id, ma, ten, nguon) VALUES ($1, 'shop1:v1', 'Món 1', 'pos'), ($1, 'shop1:v2', 'Món 2', 'pos')", [teamId]);
  return { pool, teamId, idA: String(a.id) };
}

test('D1 · gán marketer theo MÃ NV: hai cột cùng đổi · page kế thừa TÊN · danh sách + chi tiết trả mã · gõ tay tên ⇒ xoá mã (không lệch)', async (t) => {
  const { pool, teamId, idA } = await dung(t);
  const kq = await spGoc.suaSanPhamGoc(pool, teamId, idA, { marketer: 'An', marketerMaNv: 'NV1' });
  assert.deepEqual([kq.marketer, kq.marketerMaNv, kq.soPageTheoMarketer], ['An', 'NV1', 1]);
  assert.equal((await pool.query("SELECT marketer FROM page WHERE page_id = 'fb1'")).rows[0].marketer, 'An');
  assert.equal((await spGoc.dsSanPhamGoc(pool, teamId))[0].marketerMaNv, 'NV1');
  assert.equal((await spGoc.chiTietSanPhamGoc(pool, teamId, idA)).marketerMaNv, 'NV1');
  const tay = await spGoc.suaSanPhamGoc(pool, teamId, idA, { marketer: 'Gõ tay' });
  assert.deepEqual([tay.marketer, tay.marketerMaNv], ['Gõ tay', null], 'tên gõ tay không được giữ mã của người cũ');
  const bo = await spGoc.suaSanPhamGoc(pool, teamId, idA, { marketer: '', marketerMaNv: null });
  assert.deepEqual([bo.marketer, bo.marketerMaNv], ['', null]);
  const ten = await spGoc.suaSanPhamGoc(pool, teamId, idA, { ten: 'SP A2' });
  assert.equal(ten.marketerMaNv, null, 'sửa tên không đụng marketer');
});

test('D2 · gộp món POS thành sản phẩm mang marketer theo mã NV', async (t) => {
  const { pool, teamId } = await dung(t);
  const g = await spGoc.gopMonThanhGoc(pool, teamId, { maGoc: 'sp-moi', ten: 'Mới', marketer: 'Bình', marketerMaNv: 'NV2', posMa: ['shop1:v1', 'shop1:v2'] });
  assert.deepEqual([g.marketer, g.marketerMaNv, g.soBienThe], ['Bình', 'NV2', 2]);
  assert.equal((await pool.query("SELECT marketer_ma_nv FROM san_pham_goc WHERE ma_goc = 'sp-moi'")).rows[0].marketer_ma_nv, 'NV2');
});

test('D3 · gợi ý (hàm thuần): cộng đơn theo mã NV trên các món CỦA sản phẩm · đứng đầu phải chọn được · không đơn ⇒ null', () => {
  const du = { dong: [
    { ma: 's:1', maNv: 'NV1', soDon: 30 }, { ma: 's:2', maNv: 'NV1', soDon: 11 }, { ma: 's:1', maNv: 'NV2', soDon: 9 },
    { ma: 's:9', maNv: 'NV2', soDon: 500 },   // món của sản phẩm KHÁC — không được tính
    { ma: 's:2', maNv: null, soDon: 0 },
  ] };
  const chon = [{ maNv: 'NV1', ten: 'An' }, { maNv: 'NV2', ten: 'Bình' }];
  assert.deepEqual(goiYChoSanPham(du, ['s:1', 's:2'], chon), { maNv: 'NV1', ten: 'An', soDon: 41, tong: 50, tiLe: 0.82, chonDuoc: true });
  assert.deepEqual(goiYChoSanPham(du, ['s:1', 's:2'], [{ maNv: 'NV2', ten: 'Bình' }]),
    { maNv: 'NV1', ten: null, soDon: 41, tong: 50, tiLe: 0.82, chonDuoc: false }, 'đứng đầu không chọn được ⇒ nói ra, KHÔNG gợi ý người thứ hai');
  assert.equal(goiYChoSanPham(du, ['s:7'], chon), null);
  assert.equal(goiYChoSanPham({ dong: [{ ma: 's:1', maNv: null, soDon: 5 }] }, ['s:1'], chon).maNv, null, 'đơn của marketer chưa ghép HRM');
});

test('D4 · bộ đọc: một câu SELECT đúng luật (marketer JSON · bỏ đơn huỷ · 60 ngày) · đệm · «làm mới» · hai lời gọi cùng lúc = một lượt · lỗi không đệm', async () => {
  assert.match(SQL_DON_MARKETER, /JSON_VALUE\(o\.marketer, '\$\.id'\)/);
  assert.match(SQL_DON_MARKETER, /status_group, ''\) <> 'cancelled'/);
  assert.match(SQL_DON_MARKETER, new RegExp(`INTERVAL ${SO_NGAY} DAY`));
  assert.equal(SO_NGAY, 60);
  assert.doesNotMatch(SQL_DON_MARKETER, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP)\b/i);
  let goi = 0; let hong = true; let gio = 1000;
  const doc = taoDocGoiYMarketer({ dongHo: () => gio, hanMs: 100, taoKhach: () => ({ truyVan: async () => {
    goi++; await new Promise((r) => setTimeout(r, 5));
    if (hong) throw new Error('mạng');
    return [{ shop_id: 's', variation_id: '1', emp_code: 'NV1', so_don: '7' }, { shop_id: 's', variation_id: '2', emp_code: null, so_don: 2 }];
  } }) });
  await assert.rejects(doc(), /mạng/);
  hong = false;
  const [a, b] = await Promise.all([doc(), doc()]);
  assert.equal(goi, 2, 'lỗi không được đệm; hai lời gọi cùng lúc chỉ một lượt đọc');
  assert.equal(a, b);
  assert.deepEqual(a.dong, [{ ma: 's:1', maNv: 'NV1', soDon: 7 }, { ma: 's:2', maNv: null, soDon: 2 }]);
  await doc(); assert.equal(goi, 2, 'trong hạn đệm');
  await doc({ lamMoi: true }); assert.equal(goi, 3);
  gio += 101; await doc(); assert.equal(goi, 4, 'quá hạn đệm thì đọc lại');
});
