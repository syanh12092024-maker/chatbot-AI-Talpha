// MÀN «NHẬT KÝ THAO TÁC» (G2-E5) — tách việc người khỏi việc máy.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const nk = await import('../../src/ui/nhat-ky/kho-nhat-ky.js');

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });

/** Dòng theo hình dạng THẬT của người A: `tac_nhan` = `nguoi:<email>` | `may:<job>`. */
const dong = (i, tacNhan, hanhDong = 'gan_marketer') => ({
  id: 'n' + i, thoi_gian: 1756000000000 + i, tac_nhan: tacNhan, hanh_dong: hanhDong,
  doi_tuong_loai: 'page', doi_tuong_id: String(i), ghi_chu: 'ghi chú ' + i,
});

function noi(ds) {
  nk.datDocNhatKy(async (_bc, bo) => {
    const loc = bo.hanhDong ? ds.filter((d) => d.hanh_dong === bo.hanhDong) : ds;
    return { dong: loc.slice(0, bo.gioiHan ?? loc.length), tong: loc.length };
  });
  nk.datDanhMuc({ moTa: (m) => (m === 'gan_marketer' ? 'Gán marketer cho page' : m), nhom: { a: ['gan_marketer'] } });
}

test('lanCua · phân làn bằng tiền tố `tac_nhan`, không đoán', () => {
  assert.equal(nk.lanCua({ tac_nhan: 'nguoi:an@talpha.vn' }), nk.LAN.NGUOI);
  assert.equal(nk.lanCua({ tac_nhan: 'may:tang-truy-van' }), nk.LAN.MAY);
  // Thiếu tiền tố → coi là NGƯỜI. Sai theo hướng an toàn: một dòng máy lọt vào làn người thì
  // người ta thấy thừa; một dòng người lọt vào làn máy thì nó biến mất khỏi chỗ ai cũng nhìn.
  assert.equal(nk.lanCua({ tac_nhan: '' }), nk.LAN.NGUOI);
});

test('mặc định mở ở làn NGƯỜI — 1.043/1.043 dòng thật là `doc` của máy', async () => {
  // Trộn chung thì mỗi dòng «ai bật bot cho page nào» bị chôn dưới hàng trăm dòng vô nghĩa.
  noi([
    dong(1, 'nguoi:an@talpha.vn'),
    ...Array.from({ length: 50 }, (_, i) => dong(100 + i, 'may:tang-truy-van', 'doc')),
  ]);
  const d = await nk.manNhatKy(bcQt());
  assert.equal(d.lan, nk.LAN.NGUOI, 'mặc định phải là làn người');
  assert.equal(d.dong.length, 1);
  assert.equal(d.dem.nguoi, 1);
  assert.equal(d.dem.may, 50);
});

test('làn MÁY vẫn xem được — không giấu, chỉ là không nằm chắn đường', async () => {
  noi([dong(1, 'nguoi:an'), dong(2, 'may:tang-truy-van', 'doc')]);
  const d = await nk.manNhatKy(bcQt(), { lan: nk.LAN.MAY });
  assert.equal(d.dong.length, 1);
  assert.equal(d.dong[0].lan, nk.LAN.MAY);
  const t = await nk.manNhatKy(bcQt(), { lan: nk.LAN.TAT_CA });
  assert.equal(t.dong.length, 2);
});

test('làn lạ bị chặn, không lặng lẽ trả tất cả', async () => {
  noi([dong(1, 'nguoi:an')]);
  await assert.rejects(() => nk.manNhatKy(bcQt(), { lan: 'linh-tinh' }), (e) => e.ma === 'lan_la');
});

test('cảnh báo · ≥90% là việc máy thì kêu, và dẫn thẳng PHIEU-B-Y5', async () => {
  // Một cuốn sổ mà 99% số dòng là «có người mở ra xem» thì không ai đọc nó nữa — đó là hỏng
  // công cụ điều tra, không phải hỏng hiệu năng.
  const c = nk.canhBaoNhatKy({ dem: { nguoi: 1, may: 99 }, tong: 100 });
  const x = c.find((y) => y.ma === 'ngap_dong_may');
  assert.ok(x);
  assert.match(x.chu, /99%/);
  assert.match(x.chu, /PHIEU-B-Y5/, 'phải chỉ ra thuốc thật, không chỉ than');
  assert.match(x.chu, /cấm xoá/, 'và nói rõ vì sao không dọn lại được');
});

test('cảnh báo · làn người rỗng là «chưa ai làm gì», KHÔNG phải «nhật ký hỏng»', async () => {
  const c = nk.canhBaoNhatKy({ dem: { nguoi: 0, may: 5 }, tong: 5 });
  const x = c.find((y) => y.ma === 'khong_co_viec_nguoi');
  assert.ok(x);
  assert.equal(x.muc, 'tin', 'đây không phải cảnh báo, chỉ là một câu giải thích');
  assert.match(x.chu, /KHÔNG phải/);
});

test('cảnh báo · sổ cân đối thì IM', () => {
  assert.deepEqual(nk.canhBaoNhatKy({ dem: { nguoi: 6, may: 4 }, tong: 10 }), []);
});

test('gộp dòng · bỏ tiền tố `nguoi:`/`may:` và gắn nhãn tiếng Việt', async () => {
  noi([dong(1, 'nguoi:an@talpha.vn')]);
  const d = await nk.manNhatKy(bcQt());
  assert.equal(d.dong[0].ai, 'an@talpha.vn', 'hiện nguyên `nguoi:an@…` thì người đọc phải tự dịch mỗi dòng');
  assert.equal(d.dong[0].chuHanhDong, 'Gán marketer cho page');
});

test('khai rõ khi phép cắt CÓ THỂ đã bỏ sót, không hiện một trang trông như đủ', async () => {
  noi(Array.from({ length: nk.MOI_TRANG * 6 }, (_, i) => dong(i, 'nguoi:an')));
  const d = await nk.manNhatKy(bcQt());
  assert.equal(d.catBot, true, 'tổng lớn hơn số kéo về thì phải nói ra');
  assert.equal(d.dong.length, nk.MOI_TRANG);
  assert.ok(d.soTrang > 1);
});

test('chưa nối bộ đọc thì NÉM — không trả danh sách rỗng trông như «sổ trống»', async () => {
  nk.datDocNhatKy(null);
  await assert.rejects(() => nk.manNhatKy(bcQt()), (e) => e.ma === 'chua_noi');
});

test('thiếu bối cảnh thì NÉM', async () => {
  noi([]);
  await assert.rejects(() => nk.manNhatKy(null), /bối cảnh|teamId/i);
});
