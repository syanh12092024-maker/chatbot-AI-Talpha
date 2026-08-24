// MÀN «CẤU HÌNH TEAM» (G2-B1) — bốn lát, và hai luật của giai đoạn 2.
//
// Luật ① rỗng phải nói VÌ SAO rỗng · Luật ③ mã vai nhập hằng, test đọc thẳng lược đồ.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kt = await import('../../src/ui/team/kho-team.js');
const tv = await import('../../src/ui/team/thanh-vien.js');

const GOC_REPO = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const LUOC_DO = path.join(GOC_REPO, 'db/migrate/001_nen.up.sql');

/* ─────────────────────────────── hạt giống ─────────────────────────────── */

const VAI_HANG = [
  { id: 'v-qt', ma: 'quan-tri', ten: 'Quản trị' },
  { id: 'v-mkt', ma: 'marketer', ten: 'Marketer' },
  { id: 'v-sale', ma: 'sale', ten: 'Sale' },
  { id: 'v-ql', ma: 'quan-ly', ten: 'Quản lý' },
  { id: 'v-dkb', ma: 'duyet-kich-ban', ten: 'Người duyệt kịch bản' },
];

function dungKho(themHat = {}) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [
      { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
      { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    ],
    nguoi_dung: [
      { id: 'u1', email: 'an@talpha.vn', ten: 'An', hoat_dong: true },
      { id: 'u2', email: 'binh@talpha.vn', ten: 'Bình', hoat_dong: true },
      { id: 'u3', email: 'cuc@talpha.vn', ten: 'Cúc', hoat_dong: false },
    ],
    vai: VAI_HANG,
    thanh_vien_team: [
      { id: 'tv1', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-qt' },
      { id: 'tv2', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-mkt' },
      { id: 'tv3', team_id: 't2', nguoi_dung_id: 'u2', vai_id: 'v-qt' },
    ],
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: '', bot_ai_bat: true, trong_diem: false },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page B', marketer: 'An', bot_ai_bat: false, trong_diem: true },
      { id: 'p9', team_id: 't2', page_id: '999', ten: 'Page của team khác', marketer: '', bot_ai_bat: false, trong_diem: false },
    ],
    hoi_thoai: [
      { id: 'h1', team_id: 't1', page_id: 'p1', psid: 'k1' },
      { id: 'h2', team_id: 't1', page_id: 'p1', psid: 'k2' },
      { id: 'h9', team_id: 't2', page_id: 'p9', psid: 'k9' },
    ],
    ...themHat,
  });
  const nhatKy = [];
  kt.datTaoTruyVan(taoTruyVan);
  const cong = () => taoTruyVan(taoBoiCanh({
    nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI],
  }));
  kt.datCongDanhTinh(cong);
  tv.datCongDanhTinh(cong);
  tv.datPheuNhatKy((bc, ban) => { nhatKy.push({ bc, ban }); return { id: 'nk' + nhatKy.length }; });
  kt.datDocKetNoiPos(null);
  return { taoTruyVan, kho, nhatKy };
}

const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});
const bcSale = () => taoBoiCanh({
  nguoiDungId: 'u9', tenDangNhap: 'sale@talpha.vn', teamId: 't1', vai: [VAI.SALE],
});

/* ═══════════ luật ① · rỗng phải nói VÌ SAO rỗng ═══════════ */

test('khoiRong · KHÔNG dựng được một khối rỗng không lý do', () => {
  assert.throws(() => kt.khoiRong({ noi: 'trống' }), /vì sao rỗng/);
  assert.throws(() => kt.khoiRong({ vi: 'linh tinh', noi: 'trống' }), /vì sao rỗng/);
  assert.throws(() => kt.khoiRong({ vi: kt.VI_RONG.XONG }), /thiếu câu/);
});

test('khoiRong · «chưa cài đặt xong» BẮT BUỘC chỉ đường đi tiếp', () => {
  // Đây là nửa quan trọng của bài học 24/08: nói "chưa xong" mà không chỉ chỗ sửa thì người
  // đọc vẫn kẹt y như cũ — chỉ khác là bây giờ họ biết mình đang kẹt.
  assert.throws(
    () => kt.khoiRong({ vi: kt.VI_RONG.CHUA_CAI_DAT, noi: 'chưa có gì' }),
    /diTiep/,
  );
  const ok = kt.khoiRong({
    vi: kt.VI_RONG.CHUA_CAI_DAT, noi: 'chưa có gì', diTiep: { chu: 'Thêm', duong: '#x' },
  });
  assert.equal(ok.rong, true);
  assert.equal(ok.vi, 'chua_cai_dat');

  // «xong hết rồi» thì KHÔNG cần đường đi tiếp — hai trạng thái này phải khác nhau thật,
  // không phải khác nhau trên nhãn.
  const xong = kt.khoiRong({ vi: kt.VI_RONG.XONG, noi: 'không còn việc nào' });
  assert.equal(xong.diTiep, null);
  assert.notEqual(xong.vi, ok.vi);
});

/* ═══════════ luật ③ · mã vai nhập hằng, đối chiếu THẲNG lược đồ ═══════════ */

test('TEN_VAI · phủ ĐỦ năm mã vai của lược đồ thật, không thiếu không thừa', () => {
  const sql = readFileSync(LUOC_DO, 'utf8');
  const khoi = sql.match(/INSERT\s+INTO\s+vai\s*\([^)]*\)\s*VALUES([\s\S]*?);/i);
  assert.ok(khoi, 'không tìm thấy lệnh chèn bảng `vai`');
  const maThat = new Set([...khoi[1].matchAll(/\(\s*'([^']+)'\s*,/g)].map((m) => m[1]));
  assert.equal(maThat.size, 5);

  const maNhan = new Set(Object.keys(kt.TEN_VAI));
  for (const m of maThat) {
    assert.ok(maNhan.has(m), `lược đồ có vai "${m}" mà TEN_VAI không có nhãn — màn hình sẽ `
      + 'hiện mã thô cho người dùng nhìn');
  }
  for (const m of maNhan) assert.ok(maThat.has(m), `TEN_VAI có mã lạ "${m}"`);
  // Bẫy gạch dưới/gạch ngang — bản sao thứ hai của bài học ② giai đoạn 1.
  assert.ok(maNhan.has('quan-tri') && !maNhan.has('quan_tri'));
});

/* ═══════════ lát 1 · tổng quan ═══════════ */

test('tongQuanTeam · thiếu bối cảnh team thì NÉM, không trả số 0', async () => {
  dungKho();
  // Số 0 trông y hệt "team này chưa có gì" trong khi sự thật là "gọi sai". Đây đúng chỗ
  // tầng truy vấn của người A cũng chọn ném thay vì trả rỗng.
  await assert.rejects(() => kt.tongQuanTeam(null), /bối cảnh|teamId/i);
  await assert.rejects(() => kt.tongQuanTeam({ teamId: 't1' }), /vai/i);
});

test('tongQuanTeam · đếm đúng, và KHÔNG đếm sang team khác', async () => {
  dungKho();
  const t = await kt.tongQuanTeam(bcQt('t1'));
  assert.equal(t.page.tong, 2, 'chỉ 2 page của t1, không tính page của t2');
  assert.equal(t.page.botBat, 1);
  assert.equal(t.page.coMarketer, 1);
  assert.equal(t.page.thieuMarketer, 1);
  assert.equal(t.page.trongDiem, 1);
  assert.equal(t.hoiThoai, 2, 'chỉ 2 hội thoại của t1');
  assert.equal(t.model.daCauHinh, false, 'chưa có dòng cau_hinh_model nào');
  assert.equal(t.thanhVien, 2, 'u1 mang hai vai = hai dòng cấp quyền');
});

test('canhBaoTuTongQuan · bốn cảnh báo, và cảnh nguy nhất phải là ĐỎ', () => {
  const khongAi = kt.canhBaoTuTongQuan({ soPage: 514, coMarketer: 0, botBat: 50, soDongModel: 0 });
  const ma = khongAi.map((c) => c.ma);
  // Đúng cảnh thật đo được trên CSDL 25/08: 514 page, 0 marketer, 50 page bật bot, 0 model.
  assert.ok(ma.includes('khong_ai_phu_trach'));
  assert.ok(ma.includes('chua_cau_hinh_model'));
  assert.ok(ma.includes('bot_bat_ma_khong_model'));
  assert.ok(khongAi.every((c) => c.muc === 'do'), 'cả ba đều là cảnh đỏ');

  const motPhan = kt.canhBaoTuTongQuan({ soPage: 10, coMarketer: 7, botBat: 0, soDongModel: 3 });
  assert.deepEqual(motPhan.map((c) => c.ma), ['thieu_marketer']);
  assert.equal(motPhan[0].muc, 'vang');

  // Xong hết thì IM — cảnh báo lúc nào cũng kêu là cảnh báo không ai đọc (bài học ⑰ L1-M4).
  assert.deepEqual(kt.canhBaoTuTongQuan({ soPage: 10, coMarketer: 10, botBat: 5, soDongModel: 3 }), []);
});

test('canhBaoTuTongQuan · team KHÔNG có page nào phải nói RÕ là chưa làm, không để số 0 tự nói', () => {
  // Nửa còn thiếu của luật ①, bắt được lúc mở màn bằng mắt trên team Auus: sáu ô số 0 và
  // không một câu nào nói vì sao. «0 page» đọc như một sự thật trung tính.
  const c = kt.canhBaoTuTongQuan({ soPage: 0, coMarketer: 0, botBat: 0, soDongModel: 0 });
  const chiaPage = c.find((x) => x.ma === 'chua_duoc_chia_page');
  assert.ok(chiaPage, 'team 0 page phải có cảnh báo riêng');
  assert.equal(chiaPage.muc, 'do');
  assert.match(chiaPage.chu, /chưa làm|CHƯA LÀM/i, 'phải phân biệt «chưa làm» với «đã xong»');

  // Và KHÔNG được kêu nhầm «thiếu marketer» khi chẳng có page nào để mà thiếu.
  assert.ok(!c.some((x) => x.ma === 'khong_ai_phu_trach' || x.ma === 'thieu_marketer'),
    '0 page thì không có chuyện thiếu marketer — cảnh báo thừa làm loãng cảnh báo thật');
});

/* ═══════════ lát 2 · thành viên và vai ═══════════ */

test('thanhVienCua · gộp theo NGƯỜI, một người nhiều vai vẫn một dòng', async () => {
  dungKho();
  const d = await kt.thanhVienCua(bcQt('t1'));
  assert.equal(d.trong, null);
  assert.equal(d.nguoi.length, 1, 'u1 mang hai vai nhưng chỉ hiện MỘT dòng');
  assert.equal(d.nguoi[0].email, 'an@talpha.vn');
  assert.deepEqual(d.nguoi[0].vai.map((v) => v.ma).sort(), ['marketer', 'quan-tri']);
});

test('thanhVienCua · team không có ai thì nói CHƯA CÀI ĐẶT, kèm đường đi tiếp', async () => {
  dungKho({ thanh_vien_team: [] });
  const d = await kt.thanhVienCua(bcQt('t1'));
  assert.equal(d.nguoi.length, 0);
  assert.ok(d.trong, 'phải có khối rỗng, không phải mảng rỗng trần');
  assert.equal(d.trong.vi, kt.VI_RONG.CHUA_CAI_DAT, 'KHÔNG được là «xong hết rồi»');
  assert.ok(d.trong.diTiep && d.trong.diTiep.chu, 'phải chỉ đường');
});

test('themThanhVien · CHỈ quan-tri, và mã vai lạ bị chặn', async () => {
  dungKho();
  await assert.rejects(() => tv.themThanhVien(bcSale(), { nguoiDungId: 'u2', maVai: 'sale' }),
    (e) => e.ma === 'thieu_vai');
  await assert.rejects(() => tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'quan_tri' }),
    (e) => e.ma === 'vai_la', 'gạch DƯỚI phải bị chặn, không âm thầm không tra ra');
  await assert.rejects(() => tv.themThanhVien(bcQt(), { nguoiDungId: 'u404', maVai: 'sale' }),
    (e) => e.ma === 'khong_co_nguoi');
});

test('themThanhVien · cấp vai xong thì có dòng cấp quyền VÀ có dòng nhật ký', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'sale' });
  assert.equal(kq.daCo, false);
  assert.equal(kq.maVai, 'sale');

  const dong = kho.docThang('thanh_vien_team')
    .filter((d) => d.team_id === 't1' && d.nguoi_dung_id === 'u2');
  assert.equal(dong.length, 1);

  // Cấp quyền mà không truy ngược được là thao tác không nên xảy ra.
  assert.equal(nhatKy.length, 1);
  assert.equal(nhatKy[0].ban.hanhDong, tv.HANH_DONG_THEM);
  assert.equal(nhatKy[0].ban.sau.vai, 'sale');
  assert.equal(nhatKy[0].ban.sau.email, 'binh@talpha.vn');
});

test('themThanhVien · bấm hai lần KHÔNG đẻ dòng thứ hai', async () => {
  const { kho, nhatKy } = dungKho();
  await tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'sale' });
  const lai = await tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'sale' });
  assert.equal(lai.daCo, true);
  assert.equal(kho.docThang('thanh_vien_team').filter((d) => d.nguoi_dung_id === 'u2' && d.team_id === 't1').length, 1);
  assert.equal(nhatKy.length, 1, 'lần bấm thứ hai không đổi gì thì không ghi nhật ký');
});

test('themThanhVien · chưa nối phễu nhật ký thì TỪ CHỐI ghi, không cấp quyền lặng lẽ', async () => {
  dungKho();
  tv.datPheuNhatKy(null);
  await assert.rejects(() => tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'sale' }),
    (e) => e.ma === 'chua_noi');
});

test('botThanhVien · KHÔNG rút được vai quản trị CUỐI CÙNG của team', async () => {
  const { kho } = dungKho();
  // u1 là quản trị duy nhất của t1. Rút xong thì không còn ai cấu hình được team này, và
  // không có màn nào để sửa — phải quay lại psql tay, đúng thứ màn này sinh ra để xoá.
  await assert.rejects(() => tv.botThanhVien(bcQt(), { nguoiDungId: 'u1', maVai: 'quan-tri' }),
    (e) => e.ma === 'quan_tri_cuoi');
  assert.equal(kho.docThang('thanh_vien_team').filter((d) => d.vai_id === 'v-qt' && d.team_id === 't1').length, 1);

  // Có người thứ hai làm quản trị rồi thì rút được.
  await tv.themThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'quan-tri' });
  const kq = await tv.botThanhVien(bcQt(), { nguoiDungId: 'u1', maVai: 'quan-tri' });
  assert.equal(kq.soXoa, 1);
});

test('botThanhVien · rút vai KHÔNG phải quản trị thì không vướng rào đó', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await tv.botThanhVien(bcQt(), { nguoiDungId: 'u1', maVai: 'marketer' });
  assert.equal(kq.soXoa, 1);
  assert.equal(kho.docThang('thanh_vien_team').filter((d) => d.team_id === 't1').length, 1);
  assert.equal(nhatKy.at(-1).ban.hanhDong, tv.HANH_DONG_BOT);
  assert.equal(nhatKy.at(-1).ban.truoc.vai, 'marketer');
});

test('botThanhVien · rút thứ không có thì trả 0, KHÔNG ném và KHÔNG ghi nhật ký', async () => {
  const { nhatKy } = dungKho();
  const kq = await tv.botThanhVien(bcQt(), { nguoiDungId: 'u2', maVai: 'sale' });
  assert.equal(kq.soXoa, 0);
  assert.equal(nhatKy.length, 0, 'không có gì xảy ra thì không có gì để ghi');
});

test('botThanhVien · CHỈ quan-tri', async () => {
  dungKho();
  await assert.rejects(() => tv.botThanhVien(bcSale(), { nguoiDungId: 'u1', maVai: 'marketer' }),
    (e) => e.ma === 'thieu_vai');
});

/* ═══════════ lớp team · không nhìn sang team khác ═══════════ */

test('lớp team · quản trị của t1 KHÔNG thấy và KHÔNG rút được thành viên của t2', async () => {
  const { kho } = dungKho();
  const d = await kt.thanhVienCua(bcQt('t1'));
  assert.ok(!d.nguoi.some((n) => n.email === 'binh@talpha.vn'), 'u2 chỉ ở t2, không được hiện ở t1');

  // Rút vai của u2 khi đang đứng ở t1: điều kiện kẹp `team_id = t1` nên không khớp dòng nào.
  const kq = await tv.botThanhVien(bcQt('t1'), { nguoiDungId: 'u2', maVai: 'quan-tri' });
  assert.equal(kq.soXoa, 0, 'không được xoá dòng cấp quyền của team khác');
  assert.equal(kho.docThang('thanh_vien_team').filter((r) => r.team_id === 't2').length, 1, 'dòng của t2 còn nguyên');
});

/* ═══════════ lát 3 · kết nối ═══════════ */

test('ketNoiCua · chưa nối bộ đọc thì nói ĐÚNG NHƯ VẬY, không nói «không có kết nối»', async () => {
  dungKho();
  const d = await kt.ketNoiCua(bcQt());
  assert.equal(d.pos.length, 0);
  assert.equal(d.trong.vi, kt.VI_RONG.CHUA_CAI_DAT);
  // Hai câu này dẫn người đọc đi hai hướng khác hẳn: một bên đi sửa cấu hình máy chủ, một
  // bên đi tìm kết nối bị mất. Nói nhầm là bắt họ đi nhầm đường.
  assert.match(d.trong.noi, /chưa nối bộ đọc/i);
});

test('ketNoiCua · có bộ đọc mà team chưa có kết nối thì chỉ đường nạp', async () => {
  dungKho();
  kt.datDocKetNoiPos(async () => []);
  const d = await kt.ketNoiCua(bcQt());
  assert.equal(d.trong.vi, kt.VI_RONG.CHUA_CAI_DAT);
  assert.match(d.trong.noi, /chưa có kết nối POS/i);
  assert.ok(d.trong.diTiep);
});

test('ketNoiCua · có kết nối thì trả về, và KHÔNG có trường nào mang khoá', async () => {
  dungKho();
  kt.datDocKetNoiPos(async () => [{ id: '1', market: 'Saudi', shopId: '77', bat: true }]);
  const d = await kt.ketNoiCua(bcQt());
  assert.equal(d.trong, null);
  assert.equal(d.pos.length, 1);
  const chu = JSON.stringify(d.pos).toLowerCase();
  for (const cam of ['api_key', 'apikey', 'khoa', 'secret', 'token']) {
    assert.ok(!chu.includes(cam), `màn kết nối KHÔNG được mang "${cam}"`);
  }
});

/* ═══════════ lát 4 · gán page ↔ team — chặn nhưng HIỆN RA ═══════════ */

test('trangThaiGanPage · khai thẳng là chưa mở được, kèm số phiếu và lý do', async () => {
  dungKho();
  const g = await kt.trangThaiGanPage(bcQt('t1'));
  assert.equal(g.moDuoc, false);
  assert.equal(g.phieu, 'PHIEU-B-Y3');
  assert.ok(g.lyDo.length > 40, 'lý do phải nói được bằng câu, không phải một mã lỗi');
  assert.equal(g.soPageTeamNay, 2);
  // Con số chỉ tính team đang mở — màn phải nói rõ giới hạn đó thay vì để người đọc tưởng
  // đây là số của cả hệ thống.
  assert.match(g.ghiChu, /team đang mở/i);
});
