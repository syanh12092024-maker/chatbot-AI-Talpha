// HAI MÀN CUỐI: «HIỆU QUẢ KỊCH BẢN» (G2-G3) và «LỚP TRẢ LỜI 0 ĐỒNG» (G2-D4).
//
// Cả hai chạy trên bảng ĐANG RỖNG. Nên bài test dồn vào đúng một chuyện: **rỗng vì lý do
// nào**, và màn có nói đúng cái đó không. Gộp mọi lý do thành «chưa có dữ liệu» là giấu mất
// việc phải làm — chúng cần những người khác nhau sửa.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const hq = await import('../../src/ui/hieu-qua/kho-hieu-qua.js');
const l0 = await import('../../src/ui/lop-0-dong/kho-lop-0.js');

const TEAM = [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
               { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }];
const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});

/* ═════════════════ HIỆU QUẢ KỊCH BẢN ═════════════════ */

function dungHQ({ soAi = [], kichBan = [], ket } = {}) {
  const { taoTruyVan } = dungCongGia({ team: TEAM, so_ai: soAi, kich_ban: kichBan });
  hq.datTaoTruyVan(taoTruyVan);
  hq.datDocHieuQua(ket === undefined ? async () => ({ nguong: 30, dsBan: [], soSanhDuoc: false, ketLuanChung: 'chưa có hai bản để so (mới 0 bản có dữ liệu)' }) : ket);
}
const dk = (d, ma) => d.dieuKien.find((x) => x.ma === ma);

test('HQ ①a · hai điều kiện đo RIÊNG — thiếu số liệu khác thiếu hai bản', async () => {
  dungHQ({ soAi: [], kichBan: [{ id: 'k', team_id: 't1', trang_thai: 'LIVE' }] });
  const d = await hq.manHieuQua(bc());
  assert.equal(d.dieuKien.length, 2);
  assert.equal(dk(d, 'so_lieu').du, false);
  assert.equal(dk(d, 'hai_ban').du, false);
  // Hai câu chỉ việc phải KHÁC nhau — chúng cần hai người khác nhau sửa.
  assert.notEqual(dk(d, 'so_lieu').diTiep, dk(d, 'hai_ban').diTiep);
  assert.match(dk(d, 'so_lieu').diTiep, /datPheuSoAi/);
  assert.match(dk(d, 'hai_ban').diTiep, /hai bản|cùng chạy/i);
});

test('HQ ①b · `so_ai` rỗng → nói RÕ 0 không có nghĩa «bản nào cũng dở»', async () => {
  dungHQ({ soAi: [] });
  const d = await hq.manHieuQua(bc());
  assert.match(dk(d, 'so_lieu').diTiep, /KHÔNG có nghĩa/i);
});

test('HQ ①c · có số liệu thì điều kiện một PHẢI xanh', async () => {
  dungHQ({ soAi: [{ id: 's1', team_id: 't1', page_id: '1', loai: 'reply' }] });
  const d = await hq.manHieuQua(bc());
  assert.equal(dk(d, 'so_lieu').du, true);
  assert.equal(dk(d, 'so_lieu').so, 1);
});

test('HQ ②a · KHÔNG tự tính — chưa nối hàm của A thì khai chưa đọc được', async () => {
  dungHQ({ ket: null });
  const d = await hq.manHieuQua(bc());
  assert.equal(d.ketQua.docDuoc, false);
  assert.match(d.ketQua.noi, /hieuQuaKichBan/);
});

test('HQ ②b · giữ nguyên `tiLeChot: null` của A khi chưa đủ mẫu — không tự bịa số', async () => {
  dungHQ({
    soAi: [{ id: 's1', team_id: 't1', page_id: '1', loai: 'reply' }],
    ket: async () => ({ nguong: 30, soSanhDuoc: false, ketLuanChung: null, dsBan: [
      { ban: 'A', soLuot: 10, soKhach: 5, soChot: 1, tiLeChot: null, duMau: false, conThieu: 25 },
    ] }),
  });
  const d = await hq.manHieuQua(bc());
  assert.equal(d.ketQua.dsBan[0].tiLeChot, null,
    'trả tỉ lệ rồi dặn màn hình nhớ ẩn đi là mời người ta quên — giữ null của A');
  assert.equal(d.ketQua.dsBan[0].conThieu, 25);
});

/* ═════════════════ LỚP TRẢ LỜI 0 ĐỒNG ═════════════════ */

function dungL0(mau = []) {
  const { taoTruyVan } = dungCongGia({ team: TEAM, mau_0_dong: mau });
  l0.datTaoTruyVan(taoTruyVan);
}

test('L0 ①a · bảng CÓ mà rỗng → «chưa ai nhập», KHÁC «không có bảng»', async () => {
  dungL0([]);
  const d = await l0.manLop0(bc());
  assert.equal(d.dem.tongMau, 0);
  assert.match(d.trong.noi, /CÓ nhưng chưa có mẫu/i);
  // Và khác hẳn «lớp này chặn không hiệu quả».
  assert.match(d.trong.diTiep, /chưa chặn gì cả/i);
  assert.match(d.trong.diTiep, /KHÔNG phải/i);
});

test('L0 ①b · con số chính là SỐ LẦN CHẶN, quy ra tiền', async () => {
  dungL0([
    { id: '1', team_id: 't1', ma: 'M1', ten: 'Hỏi giá', bat: true, tu_khoa: 'giá,price', so_lan_chan: 100 },
    { id: '2', team_id: 't1', ma: 'M2', ten: 'Cách đặt', bat: true, tu_khoa: 'how to order', so_lan_chan: 40 },
  ]);
  const d = await l0.manLop0(bc());
  assert.equal(d.dem.tongChan, 140);
  assert.equal(d.dem.tienTietKiem, 140 * l0.VND_MOI_TIN,
    'mỗi câu bắt được là một lượt gọi model không xảy ra');
  assert.equal(d.dem.vndMoiTin, 127, 'đơn giá lấy từ màn Chi phí AI, không bịa');
});

test('L0 ①c · mẫu đang bật mà chưa chặn lần nào được đếm riêng', async () => {
  dungL0([
    { id: '1', team_id: 't1', ma: 'M1', bat: true, so_lan_chan: 0 },
    { id: '2', team_id: 't1', ma: 'M2', bat: true, so_lan_chan: 5 },
    { id: '3', team_id: 't1', ma: 'M3', bat: false, so_lan_chan: 0 },
  ]);
  const d = await l0.manLop0(bc());
  assert.equal(d.dem.soMauChuaChanLanNao, 1, 'mẫu TẮT không tính — nó không được cho cơ hội nào');
  assert.equal(d.dem.dangBat, 2);
});

test('L0 ②a · vế «đối chiếu Botcake» khai CHƯA LÀM ĐƯỢC, kèm vì sao cần', async () => {
  dungL0([]);
  const d = await l0.manLop0(bc());
  assert.equal(d.botcake.doiChieuDuoc, false);
  assert.ok(d.botcake.viSaoCan.length > 80, 'phải nói phép so đó để làm gì, không chỉ báo thiếu');
  assert.match(d.botcake.viSaoCan, /cùng bắt|không bên nào/i);
});

test('L0 ②b · từ khoá tách được từ chuỗi lẫn mảng', async () => {
  dungL0([{ id: '1', team_id: 't1', ma: 'M1', bat: true, tu_khoa: 'giá, price\nbao nhiêu' }]);
  const d = await l0.manLop0(bc());
  assert.deepEqual(d.mau[0].tuKhoa, ['giá', 'price', 'bao nhiêu']);
});

test('L0 ③ · chỉ mẫu của TEAM MÌNH', async () => {
  dungL0([
    { id: '1', team_id: 't1', ma: 'M1', bat: true, so_lan_chan: 1 },
    { id: 'x', team_id: 't2', ma: 'CUA-TEAM-KHAC', bat: true, so_lan_chan: 999 },
  ]);
  const d = await l0.manLop0(bc());
  assert.equal(d.dem.tongMau, 1);
  assert.equal(d.dem.tongChan, 1, 'cộng nhầm số chặn của team khác');
});
