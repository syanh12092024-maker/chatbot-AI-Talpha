// MÀN «RỦI RO HOÀN HÀNG» (G2-G7) — *«Bốn tầng chính sách thay vì một ngưỡng cứng»*.
//
// Ba chỗ dễ sai nhất, và bài test dồn vào đúng đó:
//   ① Nhãn tầng + ngưỡng chép tay từ luật — lệch một nhãn là lệch cả bảng phân bố. Thước
//      đọc THẲNG `src/orders/ti-le-hoan.js` rồi so (bài học ② của `07-KE-HOACH-GD2.md` §0:
//      chuỗi gõ tay hai chỗ là bẫy im lặng).
//   ② Màn KHÔNG được tự tính lại tỉ lệ hoàn (H10). Bản trước quét `don_hang` với mã hoàn
//      {4,5,6,7,8} của v1, mẫu số là mọi đơn, không có sàn — ra 40.064 «hoàn cao» trong khi
//      luật đã ký nói 5.990. Thước khoá: không đọc `don_hang`, và mã `'8'` không được xuất
//      hiện trong mã nguồn màn.
//   ③ Job chưa chấm ⇒ NÓI RA, không rơi về phép tính riêng.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const rr = await import('../../src/ui/rui-ro-hoan/kho-rui-ro.js');

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const NGUON_LUAT = path.join(GOC, 'src/orders/ti-le-hoan.js');
const MA_MAN = readFileSync(path.join(GOC, 'v3/src/ui/rui-ro-hoan/kho-rui-ro.js'), 'utf8');

/* ═══════════ ① NHÃN VÀ NGƯỠNG PHẢI KHỚP LUẬT ĐÃ CHỐT, TỪNG CÁI MỘT ═══════════ */

test('①a · `TANG` khớp đúng `TANG_HOAN` của `src/orders/ti-le-hoan.js`', () => {
  const src = readFileSync(NGUON_LUAT, 'utf8');
  const m = src.match(/export const TANG_HOAN = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.ok(m, '`ti-le-hoan.js` không còn `export const TANG_HOAN = Object.freeze([...])` — luật đổi hình');
  const cuaLuat = [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
  assert.deepEqual(rr.TANG.map((t) => t.ma), cuaLuat,
    `màn khai: ${rr.TANG.map((t) => t.ma)} · luật có: ${cuaLuat}. Lệch một nhãn là lệch cả bảng.`);
  // `chua_du_don` KHÔNG phải tầng — nó là nhãn vắng mặt.
  assert.equal(rr.TANG.find((t) => t.ma === 'chua_du_don').xepTang, false);
  assert.equal(rr.TANG.filter((t) => t.xepTang).length, 4, 'đúng BỐN tầng, không phải năm');
});

test('①b · `NGUONG` khớp đúng `CAU_HINH_TANG` của luật', () => {
  const src = readFileSync(NGUON_LUAT, 'utf8');
  const m = src.match(/export const CAU_HINH_TANG = Object\.freeze\(\{([\s\S]*?)\}\)/);
  assert.ok(m, '`ti-le-hoan.js` không còn `CAU_HINH_TANG` — luật đổi hình');
  const cuaLuat = Object.fromEntries(
    [...m[1].matchAll(/(\w+):\s*(\d+)/g)].map((x) => [x[1], Number(x[2])]),
  );
  assert.deepEqual({ ...rr.NGUONG }, cuaLuat,
    `màn khai: ${JSON.stringify(rr.NGUONG)} · luật: ${JSON.stringify(cuaLuat)}`);
  assert.equal(rr.NGUONG.toi_thieu_don_ket, 2, 'sàn 2 đơn đã kết — quyết định ③ của luật');
});

test('①c · phép bóc có bắt được thật không (thước tự soi mình)', () => {
  const gia = 'export const TANG_HOAN = Object.freeze([\n  "a", // x\n  "b",\n]);';
  const m = gia.match(/export const TANG_HOAN = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.deepEqual([...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]), ['a', 'b']);
});

/* ═══════════ ② MÀN KHÔNG ĐƯỢC TỰ TÍNH LẠI (H10) ═══════════ */

test('②a · mã nguồn màn KHÔNG chứa mã hoàn `8` của v1, và không đọc `don_hang`', () => {
  const dongCode = MA_MAN.split('\n').filter((d) => {
    const t = d.trim();
    return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  }).join('\n');
  assert.ok(!/'8'/.test(dongCode) && !/"8"/.test(dongCode),
    "màn không được khai mã '8' (8 = packing, một bước TIẾN — luật loại nó khỏi nhóm hoàn)");
  assert.ok(!/don_hang/.test(dongCode),
    'màn không được quét `don_hang` — nguồn là cột `khach.tang_hoan` đã chấm (H10)');
  assert.ok(!/BANG_DON|MA_HOAN|LAN_RANH/.test(dongCode),
    'không còn hằng của bản tự tính cũ');
});

/* ═══════════ dựng kho ═══════════ */

let idKhach = 0;
const khach = (tang, ket = 0, hoan = 0) => ({
  id: 'k' + (++idKhach), team_id: 't1', so_dien_thoai: '9715' + idKhach,
  tang_hoan: tang, so_don_ket: ket, so_don_hoan: hoan,
  ti_le_hoan: ket ? Math.round((hoan / ket) * 100) : null,
});

function dung(ds) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    khach: ds,
  });
  rr.datTaoTruyVan(taoTruyVan);
}

const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});
const tang = (d, ma) => d.theoTang.find((x) => x.ma === ma);

/* ═══════════ ③ ĐỌC CỘT ĐÃ CHẤM ═══════════ */

test('③a · gom đúng theo `tang_hoan`, kèm số đơn ĐÃ KẾT của từng tầng', async () => {
  dung([
    khach('rui_ro_cao', 4, 3), khach('rui_ro_cao', 2, 2),
    khach('canh_bao', 3, 1),
    khach('tot', 5, 0),
    khach('chua_du_don', 1, 1),
  ]);
  const d = await rr.manRuiRo(bc());
  assert.equal(tang(d, 'rui_ro_cao').soKhach, 2);
  assert.equal(tang(d, 'rui_ro_cao').soDonKet, 6);
  assert.equal(tang(d, 'rui_ro_cao').soDonHoan, 5);
  assert.equal(tang(d, 'canh_bao').soKhach, 1);
  assert.equal(tang(d, 'chua_du_don').soKhach, 1);
  assert.equal(d.dem.soDaCham, 5);
  assert.equal(d.dem.soChuaCham, 0);
});

test('③b · khách một-đơn-hoàn nằm ở `chua_du_don`, KHÔNG rơi vào «hoàn cao»', async () => {
  // Đây đúng ca đã làm màn cũ nói sai 6,7 lần: 34.187/40.064 khách «hoàn cao» chỉ có 1 đơn.
  dung([khach('chua_du_don', 1, 1), khach('chua_du_don', 1, 1), khach('rui_ro_cao', 3, 3)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(tang(d, 'rui_ro_cao').soKhach, 1, 'chỉ người có ≥2 đơn đã kết mới bị xếp tầng');
  assert.equal(tang(d, 'chua_du_don').soKhach, 2);
  assert.equal(d.canhBaoChuaDuDon.soDuoiSan, 2);
  assert.match(d.canhBaoChuaDuDon.viSao, /nhiễu thành bản án/);
});

test('③c · ma trận tầng × số đơn đã kết — chiều thứ hai của cùng một tầng', async () => {
  dung([khach('canh_bao', 2, 1), khach('canh_bao', 4, 2), khach('canh_bao', 9, 4)]);
  const d = await rr.manRuiRo(bc());
  const hang = d.theoSoDon.find((x) => x.ma === 'canh_bao');
  assert.equal(hang.o.find((o) => o.ma === 'd2').so, 1);
  assert.equal(hang.o.find((o) => o.ma === 'd35').so, 1);
  assert.equal(hang.o.find((o) => o.ma === 'd6').so, 1);
});

/* ═══════════ ④ MÙ THÌ NÓI RA ═══════════ */

test('④a · có khách nhưng job CHƯA chấm → nói rõ, KHÔNG tự tính bù', async () => {
  dung([khach(null, 0, 0), khach(null, 0, 0)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.dem.soChuaCham, 2);
  assert.equal(d.dem.soDaCham, 0);
  assert.ok(d.trong?.rong, 'phải báo trống');
  assert.match(d.trong.noi, /chưa chạy|chamTiLeHoan/);
  assert.match(d.trong.diTiep, /KHÔNG tự tính thay/);
});

test('④b · team không có khách nào → nói «chưa có khách», khác hẳn «job chưa chạy»', async () => {
  dung([]);
  const d = await rr.manRuiRo(bc());
  assert.ok(d.trong?.rong);
  assert.match(d.trong.noi, /chưa có khách nào/);
});

test('④c · chấm một phần → tầng chỉ đếm người ĐÃ chấm, người chưa chấm đếm riêng', async () => {
  dung([khach('tot', 3, 0), khach(null, 0, 0)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(tang(d, 'tot').soKhach, 1);
  assert.equal(d.dem.soChuaCham, 1);
  assert.equal(d.canhBaoChuaDuDon.chuaChamNoi, '1 khách CHƯA được job chấm — không nằm trong bảng phân bố.');
});

/* ═══════════ ⑤ KHÔNG CHỐT HỘ CHÍNH SÁCH, VÀ NÓI ĐÚNG NGUỒN ═══════════ */

test('⑤a · màn khai chính sách CHƯA chốt và không có nhánh chặn', async () => {
  dung([khach('rui_ro_cao', 5, 5)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.chinhSach.daChot, false);
  assert.match(d.chinhSach.noi, /CHỜ CHỐT/);
  assert.match(d.chinhSach.chan, /KHÔNG dòng mã nào|Không dòng mã nào/);
  // Và trong chính mã nguồn màn: không có nhánh chặn nào theo tầng.
  assert.ok(!/chan\s*\(|return\s+chan/.test(MA_MAN), 'màn không được có nhánh chặn');
});

test('⑤b · khai đúng NGUỒN số: cột + job, kèm bốn quyết định của luật', async () => {
  dung([khach('tot', 2, 0)]);
  const d = await rr.manRuiRo(bc());
  assert.match(d.nguon.cot, /tang_hoan/);
  assert.match(d.nguon.job, /ti-le-hoan\.js/);
  assert.match(d.nguon.luat.maHoan, /KHÔNG có 8/);
  assert.match(d.nguon.luat.mauSo, /ĐÃ KẾT/);
  assert.match(d.nguon.luat.san, /toi_thieu_don_ket = 2/);
});

test('⑤c · số tài liệu (144) hiện cạnh số đọc được, kèm vì sao khác', async () => {
  dung([khach('canh_bao', 3, 1), khach('canh_bao', 4, 2)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.soLieu.taiLieuNoi, 144);
  assert.equal(d.soLieu.doDuoc, 2);
  assert.match(d.soLieu.viSaoKhac, /4,2%/);
});

/* ═══════════ ⑥ LỚP TEAM ═══════════ */

test('⑥a · chỉ đọc khách của team mình', async () => {
  dung([khach('tot', 3, 0)]);
  const d = await rr.manRuiRo(bc('t2'));
  assert.equal(d.dem.soKhachDoc, 0, 'team khác không thấy khách của t1');
});

test('⑥b · thiếu bối cảnh team → ném, không trả rỗng', async () => {
  dung([khach('tot', 3, 0)]);
  await assert.rejects(() => rr.manRuiRo(null));
});

/* ═══ ⑦ CỬA GOM CỦA NGƯỜI A (phiếu B-Y8) — nối thì dùng, hỏng thì lùi có NÓI ═══ */

const phanBoGia = () => ({
  chuaCham: 3,
  nhomSoDon: ['0-1', '2', '3-5', '6+'],
  theoTang: [
    { tang: 'chua_du_don', soKhach: 12, donKet: 12, donHoan: 9,
      theoSoDon: [{ nhom: '0-1', soKhach: 12 }] },
    { tang: 'canh_bao', soKhach: 5, donKet: 20, donHoan: 8,
      theoSoDon: [{ nhom: '2', soKhach: 2 }, { nhom: '3-5', soKhach: 3 }] },
  ],
  luat: { maHoan: [4, 5, 6, 7], khongCo8: '8 = packing, một bước TIẾN', mauSo: 'đơn ĐÃ KẾT',
          toiThieuDonKet: 2 },
  nguon: 'khach GROUP BY tang_hoan × bậc(so_don_ket)',
});

test('⑦a · nối cửa của A → số lấy TỪ CỬA, không kéo bảng `khach` về màn', async () => {
  // Kho CỐ Ý rỗng: nếu màn vẫn đọc `khach` thì mọi con số sẽ là 0 và ca này đỏ.
  dung([]);
  rr.datDocPhanBo(async () => phanBoGia());
  const d = await rr.manRuiRo(bc());
  assert.equal(tang(d, 'canh_bao').soKhach, 5);
  assert.equal(tang(d, 'canh_bao').soDonKet, 20);
  assert.equal(tang(d, 'chua_du_don').soKhach, 12);
  assert.equal(d.dem.soChuaCham, 3);
  assert.match(d.nguon.noi, /GROUP BY/);
  assert.match(d.nguon.luat.maHoan, /KHÔNG có 8|4,5,6,7/);
  // Chiều thứ hai vẫn còn: cùng tầng, khác số đơn ⇒ khác ô.
  const hang = d.theoSoDon.find((x) => x.ma === 'canh_bao');
  assert.equal(hang.o.find((o) => o.ma === 'd3-5').so, 3);
  rr.datDocPhanBo(null);
});

test('⑦b · cửa của A NÉM → lùi về đọc cột, và NÓI vì sao lùi', async () => {
  dung([khach('tot', 3, 0)]);
  rr.datDocPhanBo(async () => { throw new Error('thiếu vai xem số liệu'); });
  const d = await rr.manRuiRo(bc());
  assert.equal(tang(d, 'tot').soKhach, 1, 'vẫn có số — đường lùi đọc cùng bốn cột');
  assert.match(d.nguon.luiVi, /thiếu vai xem số liệu/);
  rr.datDocPhanBo(null);
});

test('⑦c · CHƯA nối cửa → đường lùi, `luiVi` để null (không bịa lý do)', async () => {
  dung([khach('tot', 3, 0)]);
  const d = await rr.manRuiRo(bc());
  assert.equal(d.nguon.luiVi, null);
});
