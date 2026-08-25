// Nhật ký thao tác — bảy luật và tám tiêu chí nghiệm thu của spec L0-M4.
// Chạy trên cổng giả `v3/testkit/db-gia.js`; nối cổng thật của người A vào là chạy y hệt.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  taoBoiCanh, boiCanhMay, VAI, LoiThieuBoiCanh, LoiXuyenTeam,
} from '../../src/auth/boi-canh.js';
import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import * as audit from '../../src/audit/index.js';
import * as hanhDongMod from '../../src/audit/hanh-dong.js';
import * as lopMod from '../../src/audit/lop-express.js';
import {
  ghiNhatKy, docNhatKy, datTaoTruyVan, datPheuNhatKy, datDongHo,
  HANH_DONG, CHE_DAU, LoiNhatKy, BANG,
} from '../../src/audit/index.js';

// ---- tiện tay ---------------------------------------------------------------------

const bcA = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE], ip: '10.0.0.1' });
const bcB = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

/** Kho mới + nối cổng + xoá sạch phễu/đồng hồ của bài trước. */
function chuanBi(hat = {}) {
  const kho = new KhoGia(hat);
  datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));
  datPheuNhatKy(null);
  datDongHo(null);
  return kho;
}

/** Nuốt console.error/warn của những bài CỐ Ý làm hỏng, để kết quả test đọc được. */
async function imLang(fn) {
  const e = console.error; const w = console.warn;
  console.error = () => {}; console.warn = () => {};
  try { return await fn(); } finally { console.error = e; console.warn = w; }
}

const dongCua = (kho) => kho.docThang(BANG);

// ---- LUẬT 1 · tiêu chí 2 ----------------------------------------------------------

test('tiêu chí 2 · ghiNhatKy không có bối cảnh thì NÉM LoiThieuBoiCanh, không trả rỗng', async () => {
  chuanBi();
  await assert.rejects(() => ghiNhatKy(undefined, { hanhDong: HANH_DONG.DANG_NHAP }), LoiThieuBoiCanh);
  await assert.rejects(() => ghiNhatKy(null, { hanhDong: HANH_DONG.DANG_NHAP }), LoiThieuBoiCanh);
  await assert.rejects(() => ghiNhatKy({ vai: ['sale'] }, { hanhDong: HANH_DONG.DANG_NHAP }), LoiThieuBoiCanh);
  await assert.rejects(() => ghiNhatKy({ teamId: 't1' }, { hanhDong: HANH_DONG.DANG_NHAP }), LoiThieuBoiCanh);
  // và cả đường đọc — trả { dong: [] } thì trông y hệt "nhật ký trống"
  await assert.rejects(() => docNhatKy(undefined), LoiThieuBoiCanh);
});

// ---- LUẬT 7 · tiêu chí 3 ----------------------------------------------------------

test('tiêu chí 3 · docNhatKy chỉ ra dòng của team đang đăng nhập', async () => {
  const kho = chuanBi();
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC, doiTuongLoai: 'viec_can_xu_ly', doiTuongId: 1 });
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.DONG_VIEC, doiTuongLoai: 'viec_can_xu_ly', doiTuongId: 1 });
  await ghiNhatKy(bcB, { hanhDong: HANH_DONG.NHAN_VIEC, doiTuongLoai: 'viec_can_xu_ly', doiTuongId: 9 });

  assert.equal(dongCua(kho).length, 3, 'kho có cả ba dòng của hai team');

  const raA = await docNhatKy(bcA);
  assert.equal(raA.tong, 2);
  assert.equal(raA.dong.length, 2);
  assert.ok(raA.dong.every((d) => d.team_id === 't1'), 'không lọt dòng team khác');

  const raB = await docNhatKy(bcB);
  assert.equal(raB.tong, 1);
  assert.equal(raB.dong[0].doi_tuong_id, '9');
});

// ---- LUẬT 7 · tiêu chí 4 ----------------------------------------------------------

test('tiêu chí 4 · truyền tay team_id của team khác → ném LoiXuyenTeam VÀ ghi chan_xuyen_team', async () => {
  const kho = chuanBi();
  await assert.rejects(() => docNhatKy(bcA, { team_id: 't2' }), LoiXuyenTeam);

  const chan = dongCua(kho).filter((d) => d.hanh_dong === HANH_DONG.CHAN_XUYEN_TEAM);
  assert.equal(chan.length, 1, 'đúng một dòng chan_xuyen_team');
  assert.equal(chan[0].team_id, 't1', 'dòng ghi vào team của VÉ, không phải team bị dò');
  assert.equal(chan[0].nguoi_dung_id, 'u1');
  assert.equal(chan[0].sau.team_xin, 't2');
  assert.equal(chan[0].sau.team_cua, 't1');

  // dạng viết khác của cùng một mưu: teamId thay vì team_id
  await assert.rejects(() => docNhatKy(bcA, { teamId: 't2' }), LoiXuyenTeam);
  assert.equal(dongCua(kho).filter((d) => d.hanh_dong === HANH_DONG.CHAN_XUYEN_TEAM).length, 2);

  // truyền đúng team của mình thì không sao — cổng vẫn đối chiếu lần nữa
  const ra = await docNhatKy(bcA, { team_id: 't1', hanhDong: HANH_DONG.CHAN_XUYEN_TEAM });
  assert.equal(ra.tong, 2);
});

// ---- LUẬT 3 · tiêu chí 5 ----------------------------------------------------------

test('tiêu chí 5 · module không có hàm sửa, không có hàm xoá', () => {
  const cam = /sua|xoa|update|delete/i;
  for (const [ten, mod] of [['index', audit], ['hanh-dong', hanhDongMod], ['lop-express', lopMod]]) {
    const dinh = Object.keys(mod).filter((k) => cam.test(k));
    assert.deepEqual(dinh, [], `${ten}.js lộ ra hàm sửa/xoá: ${dinh.join(', ')}`);
  }
  assert.equal(typeof audit.suaNhatKy, 'undefined');
  assert.equal(typeof audit.xoaNhatKy, 'undefined');
});

test('luật 3 · cổng truy vấn cũng chặn sửa/xoá bảng nhat_ky', async () => {
  const kho = chuanBi();
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC });
  const db = taoTruyVanGia(kho, bcA);
  await assert.rejects(() => db.sua(BANG, {}, { ghi_chu: 'sửa trộm' }), /chỉ được thêm/);
  await assert.rejects(() => db.xoa(BANG, {}), /không xoá dữ liệu/);
});

// ---- LUẬT 5 · tiêu chí 6 ----------------------------------------------------------

test('tiêu chí 6 · truoc/sau bị che chỗ nhạy cảm, đệ quy', async () => {
  const kho = chuanBi();
  const goc = {
    khoa_api: 'sk-abc',
    ten: 'Kimi',
    long: { access_token: 'xyz', mat_khau: '123', binh_thuong: 'giữ nguyên' },
    ds: [{ Authorization: 'Bearer zzz' }, { gia: 10 }],
  };
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.DOI_KHOA, sau: goc, truoc: { secret: 'cũ' } });

  const d = dongCua(kho)[0];
  assert.equal(d.sau.khoa_api, CHE_DAU);
  assert.equal(d.sau.ten, 'Kimi');
  assert.equal(d.sau.long.access_token, CHE_DAU);
  assert.equal(d.sau.long.mat_khau, CHE_DAU);
  assert.equal(d.sau.long.binh_thuong, 'giữ nguyên');
  assert.equal(d.sau.ds[0].Authorization, CHE_DAU);
  assert.equal(d.sau.ds[1].gia, 10);
  assert.equal(d.truoc.secret, CHE_DAU);
  // che ra BẢN SAO, không được đụng vào đối tượng của nơi gọi
  assert.equal(goc.khoa_api, 'sk-abc');
  assert.equal(goc.long.access_token, 'xyz');
});

test('luật 5 · vòng lặp và đối tượng quá sâu không làm treo hàm che', async () => {
  const kho = chuanBi();
  const a = { ten: 'a' }; a.chinhNo = a;
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC, sau: a });
  assert.equal(dongCua(kho)[0].sau.chinhNo, '«vòng lặp»');
});

// ---- LUẬT 2 · tiêu chí 7 ----------------------------------------------------------

test('tiêu chí 7 · bối cảnh máy → tac_nhan "may", nguoi_dung_id null', async () => {
  const kho = chuanBi();
  const bcMay = boiCanhMay('t1', 'hàng đợi nhắc đơn');
  const luu = await ghiNhatKy(bcMay, { hanhDong: HANH_DONG.VIEC_TU_DONG });
  assert.equal(luu.tac_nhan, 'may');
  assert.equal(luu.nguoi_dung_id, null);
  assert.equal(luu.team_id, 't1');
  assert.match(luu.ghi_chu, /hàng đợi nhắc đơn/, 'lý do của vé máy đi vào ghi chú để tra ngược');

  const nguoi = await ghiNhatKy(bcA, { hanhDong: HANH_DONG.DANG_NHAP });
  assert.equal(nguoi.tac_nhan, 'nguoi');
  assert.equal(nguoi.nguoi_dung_id, 'u1');
});

test('luật 2 · nơi gọi tự đặt tac_nhan thì bị bỏ qua — máy không đội lốt người', async () => {
  const kho = chuanBi();
  const bcMay = boiCanhMay('t1', 'chạy đêm');
  await imLang(() => ghiNhatKy(bcMay, {
    hanhDong: HANH_DONG.VIEC_TU_DONG, tac_nhan: 'nguoi', nguoi_dung_id: 'u1',
  }));
  const d = dongCua(kho)[0];
  assert.equal(d.tac_nhan, 'may');
  assert.equal(d.nguoi_dung_id, null);
});

// ---- LUẬT 4 · tiêu chí 8 ----------------------------------------------------------

test('tiêu chí 8 · cổng hỏng: mã thường trả null, mã bắt buộc thì NÉM', async () => {
  datPheuNhatKy(null); datDongHo(null);
  datTaoTruyVan(() => ({ them: async () => { throw new Error('cổng truy vấn hỏng'); } }));

  await imLang(async () => {
    assert.equal(await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC }), null);
    assert.equal(await ghiNhatKy(bcA, { hanhDong: HANH_DONG.VIEC_TU_DONG }), null);

    for (const ma of ['chan_xuyen_team', 'dang_nhap_that_bai', 'doi_model', 'doi_khoa']) {
      await assert.rejects(() => ghiNhatKy(bcA, { hanhDong: ma }), /cổng truy vấn hỏng/, `mã bắt buộc ${ma} phải ném`);
    }
  });
});

test('luật 4 · chưa nối cổng truy vấn thì kêu lên chứ không im lặng chạy sai', async () => {
  datTaoTruyVan(null); datPheuNhatKy(null); datDongHo(null);
  await imLang(async () => {
    assert.equal(await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC }), null);
    await assert.rejects(() => ghiNhatKy(bcA, { hanhDong: HANH_DONG.DOI_KHOA }), LoiNhatKy);
    await assert.rejects(() => docNhatKy(bcA), LoiNhatKy);   // đọc hỏng thì luôn ném
  });
});

test('luật 4 · mã hành động lạ hoặc thiếu thì không lưu, nhưng không làm hỏng việc chính', async () => {
  const kho = chuanBi();
  await imLang(async () => {
    assert.equal(await ghiNhatKy(bcA, {}), null);
    assert.equal(await ghiNhatKy(bcA, { hanhDong: 'nhanViec' }), null);
  });
  assert.equal(dongCua(kho).length, 0);
});

// ---- LUẬT 6 ------------------------------------------------------------------------

test('luật 6 · thoi_gian do module đặt, không tin thời gian của nơi gọi', async () => {
  const kho = chuanBi();
  datDongHo(() => 1_700_000_000_000);
  const luu = await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC, thoi_gian: 1, thoiGian: 2 });
  assert.equal(luu.thoi_gian, 1_700_000_000_000);
  assert.equal(dongCua(kho)[0].thoi_gian, 1_700_000_000_000);

  datDongHo(null);
  const nay = await ghiNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC });
  assert.ok(Math.abs(nay.thoi_gian - Date.now()) < 5_000);
});

// ---- PHỄU --------------------------------------------------------------------------

test('phễu nhận đủ bản ghi, và phễu hỏng KHÔNG làm hỏng việc ghi', async () => {
  const kho = chuanBi();
  const thay = [];
  datPheuNhatKy((ban) => { thay.push(ban); });
  await ghiNhatKy(bcA, { hanhDong: HANH_DONG.DOI_MODEL, ghiChu: 'kimi → claude' });
  assert.equal(thay.length, 1);
  assert.equal(thay[0].hanh_dong, HANH_DONG.DOI_MODEL);
  assert.equal(thay[0].team_id, 't1');

  datPheuNhatKy(() => { throw new Error('Telegram sập'); });
  const luu = await imLang(() => ghiNhatKy(bcA, { hanhDong: HANH_DONG.DOI_MODEL }));
  assert.ok(luu && luu.id, 'ghi vẫn thành công dù phễu ném lỗi');
  assert.equal(dongCua(kho).length, 2);
});

// ---- BỘ LỌC CỦA MÀN NHẬT KÝ --------------------------------------------------------

test('docNhatKy · lọc theo hành động, người dùng, đối tượng, khoảng thời gian; mới nhất trước', async () => {
  const kho = chuanBi();
  let t = Date.parse('2026-08-01T00:00:00Z');
  datDongHo(() => t);

  for (const [ngay, ma, id] of [
    ['2026-08-01', HANH_DONG.NHAN_VIEC, '1'],
    ['2026-08-05', HANH_DONG.DONG_VIEC, '1'],
    ['2026-08-10', HANH_DONG.NHAN_VIEC, '2'],
    ['2026-08-20', HANH_DONG.DOI_MODEL, null],
  ]) {
    t = Date.parse(`${ngay}T00:00:00Z`);
    await ghiNhatKy(bcA, { hanhDong: ma, doiTuongLoai: id ? 'viec_can_xu_ly' : 'cau_hinh_model', doiTuongId: id });
  }

  const tatCa = await docNhatKy(bcA);
  assert.equal(tatCa.tong, 4);
  assert.deepEqual(tatCa.dong.map((d) => d.hanh_dong),
    [HANH_DONG.DOI_MODEL, HANH_DONG.NHAN_VIEC, HANH_DONG.DONG_VIEC, HANH_DONG.NHAN_VIEC],
    'mới nhất đứng trước');

  assert.equal((await docNhatKy(bcA, { hanhDong: HANH_DONG.NHAN_VIEC })).tong, 2);
  assert.equal((await docNhatKy(bcA, { hanhDong: [HANH_DONG.NHAN_VIEC, HANH_DONG.DOI_MODEL] })).tong, 3);
  assert.equal((await docNhatKy(bcA, { doiTuongLoai: 'viec_can_xu_ly', doiTuongId: 1 })).tong, 2);
  assert.equal((await docNhatKy(bcA, { nguoiDungId: 'u1' })).tong, 4);
  assert.equal((await docNhatKy(bcA, { nguoiDungId: 'u-khong-co' })).tong, 0);
  assert.equal((await docNhatKy(bcA, { tuNgay: '2026-08-05', denNgay: '2026-08-10' })).tong, 2);

  // phân trang: tong là TỔNG số dòng khớp, không phải số dòng trả về
  const trang = await docNhatKy(bcA, { gioiHan: 2, buoc: 1 });
  assert.equal(trang.tong, 4);
  assert.equal(trang.dong.length, 2);
  assert.equal(trang.dong[0].hanh_dong, HANH_DONG.NHAN_VIEC);
});

// ---- DANH MỤC MÃ HÀNH ĐỘNG ----------------------------------------------------------

test('hanh-dong.js · mã nào cũng duy nhất, có nhóm, và có mô tả tiếng Việt', () => {
  // KHÔNG chốt cứng con số nữa. Bản trước ghi `equal(ds.length, 14)`, và mỗi lần thêm màn
  // là bài test đỏ vì một lý do KHÔNG PHẢI LỖI — người sửa chỉ việc nâng số lên rồi đi tiếp.
  // Một bài test mà cách sửa luôn là «đổi con số kỳ vọng» thì nó không canh gì cả.
  // Thứ đáng canh là các TÍNH CHẤT: không trùng, ai cũng có nhóm, ai cũng có mô tả.
  const ds = Object.values(HANH_DONG);
  assert.ok(ds.length >= 14, 'không được BỚT mã — bớt là mọi dòng nhật ký cũ mang mã đó thành mã lạ');
  assert.equal(new Set(ds).size, ds.length, 'không mã nào trùng');
  for (const ma of ds) {
    assert.ok(hanhDongMod.hopLeHanhDong(ma));
    assert.notEqual(hanhDongMod.moTa(ma), ma, `mã ${ma} chưa có mô tả`);
  }
  assert.equal(hanhDongMod.danhSachHanhDong().length, ds.length, 'mọi mã đều được xếp vào một nhóm');
  assert.equal(hanhDongMod.laBatBuoc('nhan_viec'), false);
  assert.equal(hanhDongMod.laBatBuoc('doi_khoa'), true);
});

test('hanh-dong.js · nhóm BẮT BUỘC phủ đủ hai loại việc không được mất dấu', () => {
  const bb = hanhDongMod.nhomBatBuoc;
  // ① sự cố an ninh và đổi cấu hình tốn tiền — bốn mã gốc của giai đoạn 1
  for (const ma of ['chan_xuyen_team', 'dang_nhap_that_bai', 'doi_model', 'doi_khoa']) {
    assert.ok(bb.has(ma), `${ma} phải bắt buộc`);
  }
  // ② giai đoạn 2: cấp quyền, đổi chủ dữ liệu, và gạt công tắc chạm khách thật
  for (const ma of ['them_thanh_vien', 'bot_thanh_vien', 'chuyen_page_team', 'bat_tat_bot_ai']) {
    assert.ok(bb.has(ma), `${ma} phải bắt buộc — mất dấu là mất khả năng trả lời "ai làm việc đó"`);
  }
  // ③ `ap_bo_luat` bắt buộc vì một lý do KHÁC: nó vừa là dấu vết vừa là DỮ LIỆU — màn bộ
  //    luật suy "bản cũ" hay "chờ duyệt" bằng chính sự tồn tại của dòng nhật ký này.
  assert.ok(bb.has('ap_bo_luat'), 'ap_bo_luat vừa là dấu vết vừa là dữ liệu');
  // Nhưng KHÔNG phải cái gì cũng bắt buộc — nhật ký hỏng không được làm chết mọi thao tác.
  assert.equal(bb.has('gan_marketer'), false, 'việc nhẹ thì nuốt lỗi, để việc chính đi tiếp');
  assert.equal(bb.has('dat_trong_diem'), false);
});

/* ═══════════ DANH MỤC MÃ PHẢI PHỦ MỌI MÃ CODE THẬT SỰ GHI ═══════════ */

test('danh mục · MỌI mã hành động dùng trong v3/src đều phải khai ở hanh-dong.js', async () => {
  // BÀI TEST NÀY SINH RA TỪ MỘT LỖI THẬT (25/08). Năm màn của giai đoạn 2 dùng chín mã chưa
  // khai; `ghiNhatKy` từ chối, `console.error` rồi trả `null` — mọi lượt ghi nhật ký của cả
  // năm màn rơi vào hư không trong khi màn hình vẫn báo thành công.
  //
  // Quét MÃ NGUỒN thay vì gõ tay danh sách: gõ tay là đẻ bản sao thứ ba của cùng một sự thật
  // (HANH_DONG, MO_TA, và test), rồi màn thứ sáu lại quên đúng như màn thứ nhất.
  const { readdirSync, readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { DS_HOP_LE_DE_TEST, moTa } = await import('../../src/audit/hanh-dong.js');

  const GOC = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../src');
  const tep = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? tep(path.join(d, e.name))
    : (e.name.endsWith('.js') ? [path.join(d, e.name)] : [])));

  // Bắt hằng dạng `export const HANH_DONG_X = 'ma_gi_do';` — khuôn mà mọi module màn dùng.
  const dung = new Map();
  for (const f of tep(GOC)) {
    if (f.includes(`${path.sep}audit${path.sep}`)) continue;   // chính danh mục thì bỏ qua
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/export const HANH_DONG\w*\s*=\s*'([a-z_]+)'/g)) {
      dung.set(m[1], path.relative(GOC, f));
    }
  }
  assert.ok(dung.size >= 8, `chỉ tách được ${dung.size} mã — regex hỏng thì bài test thành vỏ rỗng`);

  const thieu = [...dung].filter(([ma]) => !DS_HOP_LE_DE_TEST.has(ma));
  assert.deepEqual(thieu, [],
    'mã dùng trong code mà CHƯA khai ở hanh-dong.js — ghiNhatKy sẽ từ chối và nuốt lỗi:\n'
    + thieu.map(([ma, f]) => `  · "${ma}" (${f})`).join('\n'));

  // Và mã nào cũng phải có chữ tiếng Việt, nếu không màn Nhật ký hiện mã trần.
  for (const [ma] of dung) {
    assert.notEqual(moTa(ma), ma, `mã "${ma}" chưa có mô tả trong MO_TA`);
  }
});
