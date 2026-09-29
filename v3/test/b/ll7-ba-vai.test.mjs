// PHIẾU LL7 · BA VAI (CR-28-09c, 01 §9 mới): Quản trị · Marketer · Sale. «Quản lý» và «Người duyệt kịch bản» THÔI
// CẤP (hợp đồng lược đồ: dòng `vai` giữ). Hai cửa cấp vai (thêm thành viên · tạo người dùng) từ chối mã cũ bằng
// lỗi có TÊN riêng; ô chọn chỉ đưa ba vai. Dọn danh sách quyền còn nhắc mã cũ: LL9.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI, VAI_GAN_DUOC } = await import('../../src/auth/boi-canh.js');
const kt = await import('../../src/ui/team/kho-team.js');
const tv = await import('../../src/ui/team/thanh-vien.js');

function dung() {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Pialpha GCC', la_ky_thuat: false }],
    nguoi_dung: [{ id: 'u1', email: 'an@talpha.vn', ten: 'An', hoat_dong: true },
      { id: 'u2', email: 'binh@talpha.vn', ten: 'Bình', hoat_dong: true }],
    vai: [{ id: 'v-qt', ma: 'quan-tri' }, { id: 'v-mkt', ma: 'marketer' }, { id: 'v-sale', ma: 'sale' },
      { id: 'v-ql', ma: 'quan-ly' }, { id: 'v-dkb', ma: 'duyet-kich-ban' }],
    thanh_vien_team: [{ id: 'tv1', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-qt' },
      { id: 'tv9', team_id: 't1', nguoi_dung_id: 'u2', vai_id: 'v-ql' }],
  });
  const cong = () => taoTruyVan(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  kt.datTaoTruyVan(taoTruyVan); kt.datCongDanhTinh(cong); tv.datCongDanhTinh(cong);
  tv.datPheuNhatKy(() => ({ id: 'nk' })); kt.datDocKetNoiPos(null);
}
const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });

test('R1 · ba vai còn cấp, đúng thứ tự: Quản trị · Marketer · Sale', () => {
  assert.deepEqual(VAI_GAN_DUOC, ['quan-tri', 'marketer', 'sale']);
});

test('R2 · cấp vai cũ ⇒ `vai_da_bo` (khác `vai_la` của mã gõ nhầm); vai còn cấp thì được', async () => {
  dung();
  for (const ma of ['quan-ly', 'duyet-kich-ban']) {
    await assert.rejects(() => tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: ma }), (e) => e.ma === 'vai_da_bo', ma);
    await assert.rejects(() => tv.taoNguoiDung(bcQt(), { email: `x-${ma}@talpha.vn`, ten: 'X', matKhau: 'Matkhau-dai-123', maVai: ma }),
      (e) => e.ma === 'vai_da_bo', `tạo người dùng với ${ma}`);
  }
  await assert.rejects(() => tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'quan_ly' }), (e) => e.ma === 'vai_la');
  const kq = await tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'marketer' });
  assert.equal(kq.maVai, 'marketer');
});

test('R3 · ô chọn vai chỉ ba vai; dòng cấp vai CŨ vẫn đọc ra đúng tên (không mất dấu người đang mang)', async () => {
  dung();
  assert.deepEqual((await kt.danhSachVai()).map((v) => v.ma).sort(), ['marketer', 'quan-tri', 'sale'], 'so TẬP — thứ tự theo id bảng');
  const { nguoi } = await kt.thanhVienCua(bcQt());
  const binh = nguoi.find((x) => String(x.nguoiDungId) === 'u2');
  assert.deepEqual(binh.vai.map((v) => v.ten), ['Quản lý'], 'người đang mang vai cũ vẫn hiện, không biến mất');
});
