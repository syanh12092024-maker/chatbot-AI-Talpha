// CẤU HÌNH MODEL THEO TEAM + BỘ ĐỆM NẠP NÓNG — L1-M4b
//
// Tiêu chí nghiệm thu file này canh:
//   ⑧  Khoá lưu vào kho là chuỗi mã hoá — bản ghi trong bảng KHÔNG chứa khoá gốc.
//   ⑩  Ghi dự phòng CÙNG NHÀ với model chính → bị từ chối.
//   ⑫  Truy vấn cấu hình không có bối cảnh → ném; truyền tay `team_id` team khác → bị
//       chặn, CÓ ghi nhật ký.
//   (phần "lượt kế tiếp đi đúng model mới" đo ở `model-goi.test.mjs` — ở đây chỉ đo bộ đệm)

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  docCauHinh, ghiCauHinh, tomTatCauHinh, xoaDem, coTrongDem, cauHinhMacDinh,
  datTaoTruyVan, datPheuNhatKy, datDongHoCauHinh, xoaSachCauHinh,
  HAN_DEM_MS, MAC_DINH, HANH_DONG, BANG, LoiCauHinh,
} from '../../src/model/cau-hinh.js';
import { TEN_BIEN_KHOA_CHU } from '../../src/model/kho-khoa.js';
import { LoiModelLa, LoiThamSo } from '../../src/model/loi.js';
import { LoiThieuBoiCanh, LoiXuyenTeam, taoBoiCanh } from '../../src/auth/boi-canh.js';
import { dungCongGia } from '../../testkit/db-gia.js';

process.env[TEN_BIEN_KHOA_CHU] = randomBytes(32).toString('base64');
// Test không được phụ thuộc vào khoá thật trong môi trường của người chạy.
for (const n of ['V3_KHOA_KIMI', 'V3_KHOA_CLAUDE', 'V3_KHOA_OPENAI', 'V3_KHOA_DEEPSEEK']) delete process.env[n];

const KHOA_KIMI = 'sk-moonshot-BI-MAT-0123456789-a3f9';
const bcCua = (teamId, them = {}) => taoBoiCanh({
  nguoiDungId: `u-${teamId}`, tenDangNhap: `nguoi-${teamId}`, teamId, vai: ['quan-tri'], ...them,
});

/** Nền sạch cho mỗi bài: kho giả, phễu nhật ký giả, bộ đếm lượt chạm cơ sở dữ liệu. */
function dungNen() {
  xoaSachCauHinh();
  const { kho, taoTruyVan } = dungCongGia();
  const dem = { doc: 0, them: 0, sua: 0 };
  datTaoTruyVan((bc) => {
    const c = taoTruyVan(bc);
    return {
      ...c,
      mot: async (...a) => { dem.doc++; return c.mot(...a); },
      chon: async (...a) => { dem.doc++; return c.chon(...a); },
      them: async (...a) => { dem.them++; return c.them(...a); },
      sua: async (...a) => { dem.sua++; return c.sua(...a); },
    };
  });
  const nhatKy = [];
  datPheuNhatKy((bc, ban) => { nhatKy.push({ teamId: bc.teamId, ...ban }); });
  return { kho, dem, nhatKy };
}

async function batLoi(fn) {
  try { await fn(); } catch (e) { return e; }
  return assert.fail('mong đợi một lỗi, nhưng không có lỗi nào');
}

// ---- MẶC ĐỊNH ----------------------------------------------------------------------

test('mặc định · team chưa có dòng cấu hình thì chạy kimi-k2.6 → claude-haiku-4.5 → deepseek', async () => {
  dungNen();
  const c = await docCauHinh(bcCua('t1'));
  assert.equal(c.macDinh, true);
  assert.equal(c.chinh.ma, MAC_DINH.chinh);
  assert.equal(c.chinh.nha, 'kimi');
  assert.equal(c.duPhong.ma, MAC_DINH.duPhong);
  assert.equal(c.nen.ma, MAC_DINH.nen);
  assert.equal(c.doNgauNhien, 0.3);
  assert.equal(c.doNgauNhienNen, 0.1);
});

test('mặc định · dự phòng KHÁC NHÀ với model chính — dự phòng cùng nhà là dự phòng giả', () => {
  const c = cauHinhMacDinh('t1');
  assert.notEqual(c.chinh.nha, c.duPhong.nha);
});

test('mặc định · chưa nối cổng truy vấn thì VẪN CHẠY bằng mặc định (hợp đồng mục 8)', async () => {
  xoaSachCauHinh();                       // không gọi datTaoTruyVan
  const c = await docCauHinh(bcCua('t1'));
  assert.equal(c.macDinh, true);
  assert.equal(c.chinh.ma, MAC_DINH.chinh);
});

test('chưa nối cổng truy vấn thì KHÔNG ghi được — ném LoiCauHinh chứ không im lặng', async () => {
  xoaSachCauHinh();
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5' }));
  assert.ok(e instanceof LoiCauHinh);
  assert.match(e.message, /cổng truy vấn/);
});

// ---- TIÊU CHÍ ⑫ · BỐI CẢNH VÀ ĐIỀU KIỆN TEAM ---------------------------------------

test('tiêu chí ⑫ · đọc cấu hình KHÔNG có bối cảnh thì NÉM, không trả rỗng', async () => {
  dungNen();
  assert.ok(await batLoi(() => docCauHinh()) instanceof LoiThieuBoiCanh);
  assert.ok(await batLoi(() => docCauHinh(null)) instanceof LoiThieuBoiCanh);
  assert.ok(await batLoi(() => docCauHinh({ teamId: 't1' })) instanceof LoiThieuBoiCanh);
  assert.ok(await batLoi(() => tomTatCauHinh()) instanceof LoiThieuBoiCanh);
  assert.ok(await batLoi(() => ghiCauHinh(undefined, {})) instanceof LoiThieuBoiCanh);
});

test('tiêu chí ⑫ · truyền tay team_id của team khác khi ĐỌC → chặn và GHI NHẬT KÝ', async () => {
  const { nhatKy } = dungNen();
  const e = await batLoi(() => docCauHinh(bcCua('t1'), { team_id: 't2' }));
  assert.ok(e instanceof LoiXuyenTeam);
  assert.equal(e.teamXin, 't2');
  assert.equal(e.teamCua, 't1');
  assert.equal(nhatKy.length, 1);
  assert.equal(nhatKy[0].hanhDong, HANH_DONG.CHAN_XUYEN_TEAM);
  assert.deepEqual(nhatKy[0].sau, { team_xin: 't2', team_cua: 't1' });
});

test('tiêu chí ⑫ · truyền tay team_id của team khác khi GHI → chặn và GHI NHẬT KÝ', async () => {
  const { nhatKy, kho } = dungNen();
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), { team_id: 't2', chinh: 'claude-haiku-4.5' }));
  assert.ok(e instanceof LoiXuyenTeam);
  assert.equal(nhatKy.filter((x) => x.hanhDong === HANH_DONG.CHAN_XUYEN_TEAM).length, 1);
  assert.equal(kho.docThang(BANG).length, 0, 'bị chặn mà vẫn ghi được là thủng');
});

test('truyền team_id ĐÚNG team của mình thì không sao', async () => {
  const { nhatKy } = dungNen();
  const c = await docCauHinh(bcCua('t1'), { team_id: 't1' });
  assert.equal(c.teamId, 't1');
  assert.equal(nhatKy.length, 0);
});

test('hai team · cấu hình của team này không lọt sang team kia', async () => {
  dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-sonnet-5', duPhong: 'kimi-k2.6' });
  const a = await docCauHinh(bcCua('t1'));
  const b = await docCauHinh(bcCua('t2'));
  assert.equal(a.chinh.ma, 'claude-sonnet-5');
  assert.equal(b.chinh.ma, MAC_DINH.chinh, 'team t2 phải vẫn là mặc định');
  assert.equal(b.macDinh, true);
});

// ---- TIÊU CHÍ ⑩ · DỰ PHÒNG PHẢI KHÁC NHÀ -------------------------------------------

test('tiêu chí ⑩ · ghi dự phòng CÙNG NHÀ với model chính thì bị TỪ CHỐI', async () => {
  const { kho } = dungNen();
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), {
    chinh: 'claude-haiku-4.5', duPhong: 'claude-sonnet-5',
  }));
  assert.ok(e instanceof LoiCauHinh);
  assert.match(e.message, /cùng nhà/);
  assert.match(e.message, /nhà khác/);
  assert.equal(kho.docThang(BANG).length, 0, 'bị từ chối mà vẫn ghi được là thủng');
});

test('tiêu chí ⑩ · đổi MỘT ô cũng bị kiểm — đổi chính thành cùng nhà với dự phòng đang có', async () => {
  dungNen();
  // Mặc định: chính kimi, dự phòng claude. Đổi chính sang claude là cùng nhà với dự phòng.
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), { chinh: 'claude-sonnet-5' }));
  assert.ok(e instanceof LoiCauHinh);
  assert.match(e.message, /cùng nhà/);
});

test('ghi · mã model lạ thì ném LoiModelLa, không ghi gì', async () => {
  const { kho } = dungNen();
  assert.ok(await batLoi(() => ghiCauHinh(bcCua('t1'), { chinh: 'gpt-9-khong-co-that' })) instanceof LoiModelLa);
  assert.equal(kho.docThang(BANG).length, 0);
});

test('ghi · độ ngẫu nhiên ngoài [0,1] thì ném LoiThamSo', async () => {
  dungNen();
  assert.ok(await batLoi(() => ghiCauHinh(bcCua('t1'), { doNgauNhien: 1.5 })) instanceof LoiThamSo);
  assert.ok(await batLoi(() => ghiCauHinh(bcCua('t1'), { doNgauNhien: -0.1 })) instanceof LoiThamSo);
  assert.ok(await batLoi(() => ghiCauHinh(bcCua('t1'), { doNgauNhienNen: 'nong' })) instanceof LoiThamSo);
});

// ---- GHI · NHÀ SUY RA TỪ MÃ MODEL, KHÔNG NHẬN TỪ NƠI GỌI ---------------------------

test('ghi · cột `nha` suy từ bảng model, nơi gọi không đặt được', async () => {
  const { kho } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6', nen: 'deepseek-v4-flash' });
  const r = kho.docThang(BANG)[0];
  assert.equal(r.chinh_ma_model, 'claude-haiku-4.5');
  assert.equal(r.chinh_nha, 'claude');
  assert.equal(r.du_phong_ma_model, 'kimi-k2.6');
  assert.equal(r.du_phong_nha, 'kimi');
  assert.equal(r.nen_nha, 'deepseek');
  assert.equal(r.team_id, 't1', 'team_id phải do cổng truy vấn chèn');
  assert.ok(r.sua_luc, 'thiếu sua_luc thì tiến trình khác không biết cấu hình vừa đổi');
});

test('ghi · mỗi team ĐÚNG MỘT DÒNG — ghi lần hai là sửa, không phải thêm dòng mới', async () => {
  const { kho, dem } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  await ghiCauHinh(bcCua('t1'), { doNgauNhien: 0.7 });
  assert.equal(kho.docThang(BANG).length, 1);
  assert.equal(dem.them, 1);
  assert.equal(dem.sua, 1);
  const c = await docCauHinh(bcCua('t1'));
  assert.equal(c.doNgauNhien, 0.7);
  assert.equal(c.chinh.ma, 'claude-haiku-4.5', 'ghi một ô không được xoá ô khác');
});

// ---- TIÊU CHÍ ⑧ · KHOÁ LƯU LÀ CHUỖI MÃ HOÁ -----------------------------------------

test('tiêu chí ⑧ · khoá lưu xuống bảng đã mã hoá — cả bản ghi KHÔNG chứa khoá gốc', async () => {
  const { kho } = dungNen();
  await ghiCauHinh(bcCua('t1'), { khoa: { kimi: KHOA_KIMI } });
  const chuoi = JSON.stringify(kho.docThang(BANG));
  assert.ok(!chuoi.includes(KHOA_KIMI), 'khoá gốc nằm nguyên văn trong bảng');
  assert.ok(!chuoi.includes('sk-moonshot'));
  const goi = kho.docThang(BANG)[0].khoa_ma_hoa.kimi;
  assert.deepEqual(Object.keys(goi).sort(), ['iv', 'mat', 'the', 'v']);
});

test('khoá · đọc lại thì đã giải mã sẵn để gọi mạng, còn tóm tắt chỉ có { daCo, duoi }', async () => {
  dungNen();
  await ghiCauHinh(bcCua('t1'), { khoa: { kimi: KHOA_KIMI } });
  const c = await docCauHinh(bcCua('t1'));
  assert.equal(c.khoa.kimi, KHOA_KIMI);

  const tt = await tomTatCauHinh(bcCua('t1'));
  assert.deepEqual(tt.khoa.kimi, { daCo: true, duoi: 'a3f9' });
  assert.deepEqual(tt.khoa.openai, { daCo: false, duoi: null });
  assert.ok(!JSON.stringify(tt).includes(KHOA_KIMI), 'tóm tắt cho màn hình lộ khoá thật');
});

test('khoá · ghi khoá nhà này không xoá khoá nhà kia; ghi rỗng là XOÁ', async () => {
  dungNen();
  await ghiCauHinh(bcCua('t1'), { khoa: { kimi: KHOA_KIMI } });
  await ghiCauHinh(bcCua('t1'), { khoa: { claude: 'sk-ant-0123456789abcd' } });
  let c = await docCauHinh(bcCua('t1'));
  assert.equal(c.khoa.kimi, KHOA_KIMI);
  assert.equal(c.khoa.claude, 'sk-ant-0123456789abcd');

  await ghiCauHinh(bcCua('t1'), { khoa: { kimi: '' } });
  c = await docCauHinh(bcCua('t1'));
  assert.equal(c.khoa.kimi, undefined);
  assert.equal(c.khoa.claude, 'sk-ant-0123456789abcd');
});

test('khoá · khoá riêng của team THẮNG khoá lấy từ biến môi trường', async () => {
  dungNen();
  process.env.V3_KHOA_KIMI = 'sk-env-000000000000';
  try {
    let c = await docCauHinh(bcCua('t1'));
    assert.equal(c.khoa.kimi, 'sk-env-000000000000', 'chưa dán khoá riêng thì dùng khoá env');
    await ghiCauHinh(bcCua('t1'), { khoa: { kimi: KHOA_KIMI } });
    c = await docCauHinh(bcCua('t1'));
    assert.equal(c.khoa.kimi, KHOA_KIMI);
  } finally { delete process.env.V3_KHOA_KIMI; }
});

// ---- NHẬT KÝ -----------------------------------------------------------------------

test('nhật ký · đổi model ghi `doi_model`, truoc/sau đầy đủ, KHÔNG kèm khoá', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  const d = nhatKy.filter((x) => x.hanhDong === HANH_DONG.DOI_MODEL);
  assert.equal(d.length, 1);
  assert.equal(d[0].truoc.chinh, MAC_DINH.chinh);
  assert.equal(d[0].sau.chinh, 'claude-haiku-4.5');
  assert.equal(d[0].sau.du_phong, 'kimi-k2.6');
  assert.equal(d[0].doiTuongLoai, BANG);
  assert.ok(!('khoa' in d[0].sau));
});

test('nhật ký · đổi khoá ghi `doi_khoa`, truoc/sau chỉ có đuôi bốn ký tự', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { khoa: { kimi: KHOA_KIMI } });
  const d = nhatKy.filter((x) => x.hanhDong === HANH_DONG.DOI_KHOA);
  assert.equal(d.length, 1);
  assert.deepEqual(d[0].truoc.khoa.kimi, { daCo: false, duoi: null });
  assert.deepEqual(d[0].sau.khoa.kimi, { daCo: true, duoi: 'a3f9' });
  // `nhat_ky` là bảng KHÔNG SỬA ĐƯỢC: lỡ ghi khoá thật vào là nằm đó vĩnh viễn.
  assert.ok(!JSON.stringify(d[0]).includes(KHOA_KIMI));
});

test('nhật ký · không đổi gì thì KHÔNG ghi dòng nào (đừng làm ngập nhật ký)', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  nhatKy.length = 0;
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5' });
  assert.equal(nhatKy.length, 0);
});

test('nhật ký · đổi cả model lẫn khoá thì ghi HAI dòng — hai sự việc khác nhau', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6', khoa: { kimi: KHOA_KIMI } });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong).sort(), [HANH_DONG.DOI_KHOA, HANH_DONG.DOI_MODEL]);
});

// ---- `doi_model` · NĂM CA · ĐỔI MODEL LÀ ĐỔI TIỀN ---------------------------------
// Từ `kimi-k2.6` sang `claude-opus-5` là 4,81 lần chi phí mỗi đơn (01-QUYET-DINH mục 7).
// Không có dấu vết thì tháng sau hoá đơn nhảy vọt mà không ai trả lời được ai đổi, lúc nào,
// từ gì sang gì. `doi_model` lại nằm trong NHÓM BẮT BUỘC của L0-M4 — không đẻ ra được dòng
// nào thì cả cơ chế "ghi hỏng thì ném" bên đó thành vô nghĩa.

test('doi_model ca 1 · TẠO MỚI dòng cấu hình có model → ghi `doi_model`, truoc là mặc định', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), {
    chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6', khoa: { kimi: KHOA_KIMI },
  });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong).sort(), [HANH_DONG.DOI_KHOA, HANH_DONG.DOI_MODEL]);
  const d = nhatKy.find((x) => x.hanhDong === HANH_DONG.DOI_MODEL);
  assert.equal(d.truoc.chinh, MAC_DINH.chinh);
  assert.equal(d.sau.chinh, 'claude-haiku-4.5');
  assert.equal(d.sau.du_phong, 'kimi-k2.6');
});

test('doi_model ca 1b · tạo mới mà đặt ĐÚNG BẰNG mặc định vẫn là một lần đặt cấu hình', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: MAC_DINH.chinh, du_phong_ma_model: MAC_DINH.duPhong });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.DOI_MODEL]);
});

test('doi_model ca 2 · đổi RIÊNG một ô model → đúng một dòng `doi_model`', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });

  for (const [o, gia, cot] of [
    ['chinh_ma_model', 'claude-opus-5', 'chinh'],
    ['du_phong_ma_model', 'deepseek-v4-flash', 'du_phong'],
    ['nen_ma_model', 'gpt-5.6-luna', 'nen'],
  ]) {
    nhatKy.length = 0;
    await ghiCauHinh(bcCua('t1'), { [o]: gia });
    assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.DOI_MODEL], `đổi ${o} mà không ghi nhật ký`);
    assert.equal(nhatKy[0].sau[cot], gia);
    assert.notEqual(nhatKy[0].truoc[cot], gia, 'truoc phải là giá trị CŨ');
  }
});

test('doi_model ca 3 · đổi độ ngẫu nhiên → `doi_model`, truoc/sau có CẢ HAI trường', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });

  nhatKy.length = 0;
  await ghiCauHinh(bcCua('t1'), { do_ngau_nhien: 0.7 });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.DOI_MODEL]);
  assert.equal(nhatKy[0].truoc.do_ngau_nhien, 0.3);
  assert.equal(nhatKy[0].sau.do_ngau_nhien, 0.7);
  assert.equal(nhatKy[0].sau.do_ngau_nhien_nen, 0.1);

  nhatKy.length = 0;
  await ghiCauHinh(bcCua('t1'), { do_ngau_nhien_nen: 0.05 });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.DOI_MODEL]);
  assert.equal(nhatKy[0].sau.do_ngau_nhien_nen, 0.05);
  assert.equal(nhatKy[0].sau.do_ngau_nhien, 0.7, 'sau phải là toàn bộ cấu hình chạy model');
});

test('doi_model ca 4 · ghi lại Y NGUYÊN thì KHÔNG đẻ dòng nào', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });
  nhatKy.length = 0;
  await ghiCauHinh(bcCua('t1'), {
    chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6',
    nen_ma_model: MAC_DINH.nen, do_ngau_nhien: 0.3, do_ngau_nhien_nen: 0.1,
  });
  assert.equal(nhatKy.length, 0, 'nhật ký rác làm màn "Nhật ký thao tác" hết dùng được');
});

test('doi_model ca 5 · đổi cả model lẫn khoá thì HAI dòng, khoá không lọt vào dòng model', async () => {
  const { nhatKy } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });
  nhatKy.length = 0;
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-opus-5', khoa: { kimi: KHOA_KIMI } });
  assert.deepEqual(nhatKy.map((x) => x.hanhDong).sort(), [HANH_DONG.DOI_KHOA, HANH_DONG.DOI_MODEL]);
  assert.ok(!JSON.stringify(nhatKy).includes(KHOA_KIMI));
});

// ---- GỐC CỦA CÁI SAI: TÊN TRƯỜNG ---------------------------------------------------

test('tên trường · nhận tên CỘT của hợp đồng mục 4, và giá trị vào bảng thật', async () => {
  const { kho } = dungNen();
  await ghiCauHinh(bcCua('t1'), {
    chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6',
    nen_ma_model: 'gpt-5.6-luna', do_ngau_nhien: 0.55, do_ngau_nhien_nen: 0.05,
  });
  const r = kho.docThang(BANG)[0];
  // Nhận tên rồi bỏ qua thì bản ghi vẫn là mặc định — đúng cái hỏng đã đo được.
  assert.equal(r.chinh_ma_model, 'claude-haiku-4.5');
  assert.equal(r.du_phong_ma_model, 'kimi-k2.6');
  assert.equal(r.nen_ma_model, 'gpt-5.6-luna');
  assert.equal(r.do_ngau_nhien, 0.55);
  assert.equal(r.do_ngau_nhien_nen, 0.05);
});

test('tên trường · hai lối gọi tên cho ra CÙNG một kết quả', async () => {
  dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });
  await ghiCauHinh(bcCua('t2'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  const a = await docCauHinh(bcCua('t1'));
  const b = await docCauHinh(bcCua('t2'));
  assert.deepEqual([a.chinh, a.duPhong, a.nen], [b.chinh, b.duPhong, b.nen]);
});

test('tên trường · trường LẠ thì NÉM và không ghi gì — im lặng bỏ qua là kiểu hỏng tệ nhất', async () => {
  const { kho, nhatKy } = dungNen();
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), { chinh_model: 'claude-haiku-4.5' }));
  assert.ok(e instanceof LoiCauHinh);
  assert.match(e.message, /trường lạ/);
  assert.match(e.message, /chinh_ma_model/, 'thông điệp phải chỉ ra tên đúng');
  assert.equal(kho.docThang(BANG).length, 0);
  assert.equal(nhatKy.length, 0);
});

test('tên trường · cột `nha` gửi kèm mà lệch với bảng model thì chặn', async () => {
  const { kho } = dungNen();
  const e = await batLoi(() => ghiCauHinh(bcCua('t1'), {
    chinh_ma_model: 'kimi-k2.6', chinh_nha: 'claude', du_phong_ma_model: 'claude-haiku-4.5',
  }));
  assert.ok(e instanceof LoiCauHinh);
  assert.match(e.message, /không phải "claude"/);
  assert.equal(kho.docThang(BANG).length, 0);
});

test('tên trường · gửi nguyên bản ghi đọc lên (có id, team_id, sua_luc) vẫn ghi được', async () => {
  const { kho } = dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh_ma_model: 'claude-haiku-4.5', du_phong_ma_model: 'kimi-k2.6' });
  const r = { ...kho.docThang(BANG)[0] };
  delete r.khoa_ma_hoa;
  r.do_ngau_nhien = 0.42;
  await ghiCauHinh(bcCua('t1'), r);          // màn hình gửi lại nguyên bản ghi vừa đọc
  assert.equal((await docCauHinh(bcCua('t1'))).doNgauNhien, 0.42);
});

test('nhật ký · phễu ném lỗi thì việc ghi cấu hình VẪN xong (nhật ký hỏng ≠ hỏng việc chính)', async () => {
  dungNen();
  datPheuNhatKy(() => { throw new Error('nhật ký sập'); });
  const c = await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  assert.equal(c.chinh.ma, 'claude-haiku-4.5');
});

// ---- BỘ ĐỆM NẠP NÓNG ---------------------------------------------------------------

test('bộ đệm · đọc hai lần liên tiếp chỉ chạm cơ sở dữ liệu MỘT lần', async () => {
  const { dem } = dungNen();
  await docCauHinh(bcCua('t1'));
  const sauLan1 = dem.doc;
  await docCauHinh(bcCua('t1'));
  await docCauHinh(bcCua('t1'));
  assert.equal(dem.doc, sauLan1, 'mỗi lượt chat tốn một vòng đọc là hỏng mục đích bộ đệm');
  assert.equal(coTrongDem('t1'), true);
});

test('bộ đệm · ghi cấu hình XOÁ ĐỆM của đúng team đó ngay — đây là cả bí quyết nạp nóng', async () => {
  const { dem } = dungNen();
  const a0 = await docCauHinh(bcCua('t1'));
  await docCauHinh(bcCua('t2'));
  assert.equal(a0.chinh.ma, MAC_DINH.chinh);

  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });

  // Không khởi động lại gì, không chờ hết hạn 5 giây: lượt ngay sau đã là model mới.
  const a = await docCauHinh(bcCua('t1'));
  assert.equal(a.chinh.ma, 'claude-haiku-4.5', 'lượt kế tiếp phải thấy model mới');

  // Đệm của t2 KHÔNG bị xoá lây — vẫn còn nguyên, và vẫn là giá trị cũ của t2.
  const giua = dem.doc;
  const b = await docCauHinh(bcCua('t2'));
  assert.equal(dem.doc, giua, 'đệm của t2 KHÔNG được xoá lây');
  assert.equal(b.chinh.ma, MAC_DINH.chinh);
});

test('bộ đệm · ghi xong mà đệm còn giữ bản CŨ thì lộ ra ngay ở đây', async () => {
  dungNen();
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  await docCauHinh(bcCua('t1'));                      // nạp đệm bằng bản vừa ghi
  await ghiCauHinh(bcCua('t1'), { chinh: 'claude-opus-5' });
  const c = await docCauHinh(bcCua('t1'));
  assert.equal(c.chinh.ma, 'claude-opus-5', 'đệm giữ bản cũ = phải khởi động lại mới đổi được model');
});

test('bộ đệm · xoaDem() ép nạp lại; xoaDem() không tham số thì xoá hết', async () => {
  dungNen();
  await docCauHinh(bcCua('t1'));
  assert.equal(coTrongDem('t1'), true);
  xoaDem('t1');
  assert.equal(coTrongDem('t1'), false);

  await docCauHinh(bcCua('t1'));
  await docCauHinh(bcCua('t2'));
  xoaDem();
  assert.equal(coTrongDem('t1'), false);
  assert.equal(coTrongDem('t2'), false);
});

test('bộ đệm · quá 5 giây thì tự hết hạn — tiến trình khác chậm nhất 5 giây, không khởi động lại', async () => {
  const { dem, kho } = dungNen();
  let gio = 1_000_000;
  datDongHoCauHinh(() => gio);

  await docCauHinh(bcCua('t1'));
  const sauLan1 = dem.doc;

  // Một tiến trình KHÁC đổi model — tiến trình này không hề biết, đệm vẫn còn.
  kho.gieo(BANG, [{
    team_id: 't1', chinh_ma_model: 'claude-haiku-4.5', chinh_nha: 'claude',
    du_phong_ma_model: 'kimi-k2.6', du_phong_nha: 'kimi',
    nen_ma_model: 'deepseek-v4-flash', nen_nha: 'deepseek',
    do_ngau_nhien: 0.3, do_ngau_nhien_nen: 0.1, khoa_ma_hoa: {}, sua_luc: 'x',
  }]);

  gio += HAN_DEM_MS - 1;
  let c = await docCauHinh(bcCua('t1'));
  assert.equal(dem.doc, sauLan1, 'chưa tới hạn thì vẫn dùng đệm');
  assert.equal(c.chinh.ma, MAC_DINH.chinh);

  gio += 2;                                   // vượt hạn 5 giây
  c = await docCauHinh(bcCua('t1'));
  assert.ok(dem.doc > sauLan1);
  assert.equal(c.chinh.ma, 'claude-haiku-4.5', 'quá 5 giây phải thấy thay đổi của tiến trình kia');
});

test('bộ đệm · boQuaDem đọc thẳng bảng, không lấy bản đệm cũ', async () => {
  const { dem } = dungNen();
  await docCauHinh(bcCua('t1'));
  const truoc = dem.doc;
  await docCauHinh(bcCua('t1'), { boQuaDem: true });
  assert.ok(dem.doc > truoc);
});

// ---- TÓM TẮT CHO MÀN HÌNH ----------------------------------------------------------

test('tóm tắt · đủ ba ô model, hai độ ngẫu nhiên, danh sách mã model cho ô chọn', async () => {
  dungNen();
  const tt = await tomTatCauHinh(bcCua('t1'));
  assert.equal(tt.teamId, 't1');
  assert.equal(tt.chinh.ma, MAC_DINH.chinh);
  assert.equal(tt.duPhong.nha, 'claude');
  assert.equal(tt.nen.ma, MAC_DINH.nen);
  assert.equal(tt.doNgauNhien, 0.3);
  assert.ok(Array.isArray(tt.danhSachModel) && tt.danhSachModel.includes('kimi-k2.6'));
  assert.equal(tt.khoaGoc, undefined, 'tóm tắt không được mang gói mã hoá ra ngoài');
});

test('tóm tắt · khoá lấy từ biến môi trường vẫn hiện là ĐÃ CÓ, kèm cờ tuEnv', async () => {
  dungNen();
  process.env.V3_KHOA_DEEPSEEK = 'sk-deepseek-0000000000wxyz';
  try {
    const tt = await tomTatCauHinh(bcCua('t1'));
    assert.deepEqual(tt.khoa.deepseek, { daCo: true, duoi: 'wxyz', tuEnv: true });
  } finally { delete process.env.V3_KHOA_DEEPSEEK; }
});
