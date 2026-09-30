// PHIẾU LL11 · KIẾN THỨC SẢN PHẨM thay chỗ KỸ NĂNG — đường ghi đầu tiên của `san_pham_goc.kien_thuc` (021 có người
// đọc mà không đường ghi), khoá «hỏi size» vào bộ ráp prompt v3, vai + nhật ký ở tầng giao diện.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { dungSandbox } from '../db/sandbox.js';
import { taoSanPhamGoc, suaKienThucGoc, chiTietSanPhamGoc, KHOA_KIEN_THUC, LoiSanPhamGoc } from '../src/products/san-pham-goc.js';
import { xayVanBanSanPham } from '../src/chat/rap-prompt.js';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');

test('KT1 · ghi kiến thức trên Postgres thật: khoá lạ bị từ chối · ô rỗng không lưu · trả bản TRƯỚC · kẹp team', async () => {
  const sb = await dungSandbox('ll11_kien_thuc');
  try {
    const q = (s, a = []) => sb.pool.query(s, a);
    const tA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const tB = (await q("SELECT id FROM team WHERE slug='auus'")).rows[0].id;
    const g = await taoSanPhamGoc(sb.pool, tA, { maGoc: 'ao-golden', ten: 'Áo Golden' });
    await assert.rejects(() => suaKienThucGoc(sb.pool, tA, g.id, { size: 'x' }), (e) => e instanceof LoiSanPhamGoc && e.ma === 'khoa_la');
    const r1 = await suaKienThucGoc(sb.pool, tA, g.id, { cong_dung: ' Thoáng mát ', hoi_size: 'Hỏi chiều cao, cân nặng', them: '' });
    assert.deepEqual(r1.kienThuc, { cong_dung: 'Thoáng mát', hoi_size: 'Hỏi chiều cao, cân nặng' });
    assert.deepEqual(r1.truoc, {}, 'bản trước lúc chưa có gì');
    const r2 = await suaKienThucGoc(sb.pool, tA, g.id, { hoi_size: 'Hỏi size S/M/L' });
    assert.deepEqual(r2.truoc, { cong_dung: 'Thoáng mát', hoi_size: 'Hỏi chiều cao, cân nặng' }, 'nhật ký cần bản TRƯỚC đúng');
    assert.deepEqual((await chiTietSanPhamGoc(sb.pool, tA, g.id)).kienThuc, { hoi_size: 'Hỏi size S/M/L' }, 'thay TRỌN khối');
    await assert.rejects(() => suaKienThucGoc(sb.pool, tB, g.id, { them: 'x' }), (e) => e.status === 404, 'team khác');
    await assert.rejects(() => suaKienThucGoc(sb.pool, tA, g.id, { them: 'x'.repeat(2001) }), (e) => e.ma === 'kien_thuc_dai');
  } finally { await sb.don(); }
});

test('KT2 · bộ ráp prompt v3 đọc ô «hỏi size» thành một dòng có nhãn; mọi khoá ghi được đều có nhãn đọc', () => {
  const vb = xayVanBanSanPham([{ ma: 'x', ten: 'Áo', kienThuc: { hoi_size: 'Hỏi size S/M/L', cong_dung: 'Mát' } }]);
  assert.match(vb, /Hỏi size trước khi chốt: Hỏi size S\/M\/L/);
  for (const k of KHOA_KIEN_THUC) {
    const v = xayVanBanSanPham([{ ma: 'x', kienThuc: { [k]: 'CHU_' + k } }]);
    assert.match(v, new RegExp('CHU_' + k), `khoá ${k} ghi được mà bộ ráp prompt không đọc — marketer viết vào khoảng không`);
  }
});

test('KT3 · tầng giao diện: marketer SỬA được kiến thức, sale không; mỗi lượt một dòng nhật ký mã bắt buộc', async () => {
  const goc = await import('../v3/src/ui/san-pham/kho-goc.js');
  const { taoBoiCanh, VAI } = await import('../v3/src/auth/boi-canh.js');
  const { HANH_DONG, laBatBuoc } = await import('../v3/src/audit/hanh-dong.js');
  const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
  const ham = async () => ({});
  goc.datKhoGoc({ ds: ham, cho: ham, dem: ham, tao: ham, sua: ham, bo: ham, chiTiet: ham, monChuaGan: ham, gan: ham, go: ham, goiYGop: ham, gop: ham, luuGia: ham, ganPage: ham, goPage: ham,
    kienThuc: async (_b, id, kt) => ({ id, maGoc: 'ao', kienThuc: kt, truoc: {} }) });
  const nk = []; goc.datPheuNhatKyGoc(async (_b, g) => { nk.push(g); });
  await assert.rejects(() => goc.suaKienThucGoc(bc(VAI.SALE), 'g1', { hoi_size: 'x' }), (e) => e.name === 'LoiThieuVai');
  await goc.suaKienThucGoc(bc(VAI.MARKETER), 'g1', { hoi_size: 'x' });
  assert.deepEqual(nk.map((x) => x.hanhDong), [HANH_DONG.SUA_KIEN_THUC_SAN_PHAM]);
  assert.equal(laBatBuoc(HANH_DONG.SUA_KIEN_THUC_SAN_PHAM), true, 'đổi lời tư vấn của bot — nhật ký bắt buộc như BAT_TAT_KY_NANG');
});
