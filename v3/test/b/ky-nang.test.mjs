// MÀN «THƯ VIỆN KỸ NĂNG» (G2-C2) — tầng giữa bộ luật và kịch bản.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kn = await import('../../src/ui/ky-nang/kho-ky-nang.js');

function dungKho(kyNang = null) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A' },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B' },
    ],
    san_pham: [
      { id: 's1', team_id: 't1', page_id: 'p1', ma: 'SP-1', ten: 'Không size' },
      { id: 's2', team_id: 't1', page_id: 'p2', ma: 'SP-2', ten: 'Có size' },
    ],
    ky_nang: kyNang || [
      { id: 'k1', team_id: 't1', ma: 'hoi_size', ten: 'Hỏi size', bat: false, bat_cho_nhom_sp: [], noi_dung: 'x'.repeat(300) },
      { id: 'k2', team_id: 't1', ma: 'doi_tra', ten: 'Đổi trả', bat: true, bat_cho_nhom_sp: [], noi_dung: 'y'.repeat(150) },
    ],
  });
  const nhatKy = [];
  kn.datTaoTruyVan(taoTruyVan);
  kn.datPheuNhatKy((bc, ban) => { nhatKy.push({ teamId: bc.teamId, ...ban }); });
  return { kho, nhatKy };
}

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI] });
const bcMkt = () => taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'm', teamId: 't1', vai: [VAI.MARKETER] });
const bcSale = () => taoBoiCanh({ nguoiDungId: 'u3', tenDangNhap: 's', teamId: 't1', vai: [VAI.SALE] });

test('ba phạm vi · TẮT ≠ bật-cả-team ≠ bật-theo-nhóm', () => {
  // Nhìn vào cột `bat_cho_nhom_sp` trống thì «tắt» và «bật cho cả team» trông y hệt nhau.
  assert.equal(kn.phamViCua({ bat: false, bat_cho_nhom_sp: [] }), kn.PHAM_VI.TAT);
  assert.equal(kn.phamViCua({ bat: true, bat_cho_nhom_sp: [] }), kn.PHAM_VI.CA_TEAM);
  assert.equal(kn.phamViCua({ bat: true, bat_cho_nhom_sp: ['SP-1'] }), kn.PHAM_VI.THEO_NHOM);
  // Và ba nhãn phải nói ra chỗ khác nhau, không chỉ khác mã.
  for (const m of Object.values(kn.PHAM_VI)) assert.ok(kn.CHU_PHAM_VI[m].length > 15);
});

test('soPageNhan · đếm ĐÚNG page nhận, không đếm page có sản phẩm khác', async () => {
  dungKho();
  const d = await kn.manKyNang(bcQt());
  const doiTra = d.kyNang.find((k) => k.ma === 'doi_tra');
  const hoiSize = d.kyNang.find((k) => k.ma === 'hoi_size');
  assert.equal(doiTra.soPageNhan, 2, 'bật + nhóm rỗng = cả team');
  assert.equal(hoiSize.soPageNhan, 0, 'đang tắt thì 0 page nhận');
});

test('soPageNhan · khoanh nhóm thì CHỈ page bán sản phẩm đó nhận', async () => {
  dungKho();
  const d0 = await kn.manKyNang(bcQt());
  const k = d0.kyNang.find((x) => x.ma === 'hoi_size');
  await kn.datNhomSanPham(bcQt(), k.id, ['SP-2']);
  await kn.batTatKyNang(bcQt(), k.id, true);
  const d = await kn.manKyNang(bcQt());
  assert.equal(d.kyNang.find((x) => x.ma === 'hoi_size').soPageNhan, 1, 'chỉ page bán SP-2');
});

test('cảnh báo · kỹ năng BẬT mà 0 page nhận là cảnh ĐỎ — trông như đang chạy', async () => {
  // Đây là kiểu hỏng chỉ lộ ra khi ai đó đi đọc tỉ lệ hoàn hàng ba tuần sau.
  dungKho([
    { id: 'k9', team_id: 't1', ma: 'khuyen_mai', ten: 'KM', bat: true,
      bat_cho_nhom_sp: ['SP-KHONG-CO'], noi_dung: 'z'.repeat(100) },
  ]);
  const d = await kn.manKyNang(bcQt());
  const c = d.canhBao.find((x) => x.ma === 'bat_ma_khong_ai_nhan');
  assert.ok(c, 'phải kêu');
  assert.equal(c.muc, 'do');
  assert.match(c.chu, /khuyen_mai/, 'phải nêu tên kỹ năng nào, không nói chung chung');
  assert.match(c.chu, /không vào prompt của ai/i);
});

test('cảnh báo · cả thư viện đều TẮT thì nhắc số hoàn hàng thật của §6', async () => {
  dungKho([{ id: 'k1', team_id: 't1', ma: 'hoi_size', ten: 'H', bat: false, bat_cho_nhom_sp: [], noi_dung: 'x' }]);
  const d = await kn.manKyNang(bcQt());
  const c = d.canhBao.find((x) => x.ma === 'khong_bat_cai_nao');
  assert.ok(c);
  assert.match(c.chu, /26,8%/, 'dẫn số thật thì người đọc hiểu đây không phải cảnh báo lý thuyết');
});

test('cảnh báo · thư viện khoẻ thì IM', async () => {
  dungKho([{ id: 'k1', team_id: 't1', ma: 'a', ten: 'A', bat: true, bat_cho_nhom_sp: [], noi_dung: 'x' }]);
  const d = await kn.manKyNang(bcQt());
  assert.deepEqual(d.canhBao, []);
});

test('datNhomSanPham · mã sản phẩm KHÔNG CÓ THẬT thì chặn, không ghi', async () => {
  const { kho } = dungKho();
  const d = await kn.manKyNang(bcQt());
  const k = d.kyNang[0];
  await assert.rejects(() => kn.datNhomSanPham(bcQt(), k.id, ['SP-BIA']), (e) => e.ma === 'ma_san_pham_la');
  const sau = kho.docThang(kn.BANG).find((r) => r.id === k.id);
  assert.deepEqual(sau.bat_cho_nhom_sp, [], 'chặn rồi thì không đụng dữ liệu');
});

test('datNhomSanPham · mảng RỖNG = bật cả team, KHÔNG phải tắt', async () => {
  const { nhatKy } = dungKho();
  const d = await kn.manKyNang(bcQt());
  const k = d.kyNang.find((x) => x.ma === 'hoi_size');
  await kn.batTatKyNang(bcQt(), k.id, true);
  await kn.datNhomSanPham(bcQt(), k.id, ['SP-1']);
  await kn.datNhomSanPham(bcQt(), k.id, []);
  const sau = await kn.manKyNang(bcQt());
  const x = sau.kyNang.find((y) => y.ma === 'hoi_size');
  assert.equal(x.bat, true, 'bỏ khoanh nhóm KHÔNG được tắt kỹ năng');
  assert.equal(x.phamVi, kn.PHAM_VI.CA_TEAM);
  assert.match(nhatKy.at(-1).ghiChu, /CẢ TEAM/);
});

test('phân quyền · marketer sửa được (kỹ năng là tầng của họ); sale thì không', async () => {
  dungKho();
  const d = await kn.manKyNang(bcQt());
  const k = d.kyNang[0];
  await kn.batTatKyNang(bcMkt(), k.id, true);          // không ném
  await assert.rejects(() => kn.batTatKyNang(bcSale(), k.id, false), (e) => e.ma === 'thieu_vai');
});

test('nhật ký · bật/tắt và đổi nhóm đều ghi, kèm phạm vi TRƯỚC và SAU', async () => {
  const { nhatKy } = dungKho();
  const d = await kn.manKyNang(bcQt());
  const k = d.kyNang.find((x) => x.ma === 'hoi_size');
  await kn.batTatKyNang(bcQt(), k.id, true);
  const g = nhatKy.find((x) => x.hanhDong === kn.HANH_DONG_BAT_TAT);
  assert.equal(g.truoc.pham_vi, kn.PHAM_VI.TAT);
  assert.equal(g.sau.pham_vi, kn.PHAM_VI.CA_TEAM);
});

test('không đổi gì thì KHÔNG ghi nhật ký rác', async () => {
  const { nhatKy } = dungKho();
  const d = await kn.manKyNang(bcQt());
  const k = d.kyNang.find((x) => x.ma === 'doi_tra');   // vốn đã bật
  const kq = await kn.batTatKyNang(bcQt(), k.id, true);
  assert.equal(kq.doi, false);
  assert.equal(nhatKy.length, 0);
});

test('rỗng · thư viện trống thì nói tầng giữa đang trống, không nói suông', async () => {
  dungKho([]);
  const d = await kn.manKyNang(bcQt());
  assert.ok(d.trong);
  assert.equal(d.trong.vi, 'chua_cai_dat');
  assert.match(d.trong.noi, /tầng giữa/i);
});

test('thiếu bối cảnh thì NÉM', async () => {
  dungKho();
  await assert.rejects(() => kn.manKyNang(null), /bối cảnh|teamId/i);
});
