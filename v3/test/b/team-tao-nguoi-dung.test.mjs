// TẠO NGƯỜI DÙNG trên màn «Cấu hình team» (15/09/2026).
//
// Đây là lượt NỚI MỘT LỆNH CẤM đã ghi thành chữ: `cong-danh-tinh.js` viết «KHÔNG BAO GIỜ ghi
// được: team, nguoi_dung, vai». Người quyết chốt 15/09 nới đúng một bảng. Vì vậy bộ ca này
// có một nhiệm vụ khác thường: **canh cả phần KHÔNG được nới**. Một lượt nới mà không có ca
// giữ biên thì lượt sau người ta nới tiếp bằng cùng một lý lẽ.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kt = await import('../../src/ui/team/kho-team.js');
const tv = await import('../../src/ui/team/thanh-vien.js');
const mk = await import('../../src/auth/mat-khau.js');
const cdt = await import('../../src/noi-day/cong-danh-tinh.js');
const { HANH_DONG, hopLeHanhDong, laBatBuoc } = await import('../../src/audit/hanh-dong.js');

const VAI_HANG = [
  { id: 'v-qt', ma: 'quan-tri', ten: 'Quản trị' },
  { id: 'v-mkt', ma: 'marketer', ten: 'Marketer' },
  { id: 'v-sale', ma: 'sale', ten: 'Sale' },
];

function dungKho() {
  const { taoTruyVan, kho } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    nguoi_dung: [{ id: 'u1', email: 'an@talpha.vn', ten: 'An', hoat_dong: true }],
    vai: VAI_HANG,
    thanh_vien_team: [{ id: 'tv1', team_id: 't1', nguoi_dung_id: 'u1', vai_id: 'v-qt' }],
  });
  const nhatKy = [];
  kt.datTaoTruyVan(taoTruyVan);
  const cong = () => taoTruyVan(taoBoiCanh({
    nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI],
  }));
  kt.datCongDanhTinh(cong);
  tv.datCongDanhTinh(cong);
  tv.datPheuNhatKy((bc, ban) => { nhatKy.push(ban); return { id: 'nk' + nhatKy.length }; });
  kt.datDocKetNoiPos(null);
  return { kho, nhatKy };
}

const bcQt = () => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI],
});
const bcSale = () => taoBoiCanh({
  nguoiDungId: 'u9', tenDangNhap: 'sale@talpha.vn', teamId: 't1', vai: [VAI.SALE],
});
const nguoi = (kho, email) => kho.docThang('nguoi_dung').find((n) => n.email === email);

/* ═══════════ ① BIÊN CỦA LƯỢT NỚI — phần KHÔNG được nới ═══════════ */

test('BIÊN · cổng danh tính nới ĐÚNG `nguoi_dung`; `team` và `vai` vẫn cấm ghi', () => {
  assert.ok(cdt.BANG_GHI_DUOC.has('nguoi_dung'), 'lượt nới 15/09 chưa có hiệu lực');
  assert.ok(cdt.BANG_GHI_DUOC.has('thanh_vien_team'), 'lượt nới 25/08 không được mất');
  for (const bang of ['team', 'vai']) {
    assert.ok(!cdt.BANG_GHI_DUOC.has(bang),
      `\`${bang}\` bị nới theo — mã vai sửa được từ giao diện là đẻ nguồn sự thật thứ hai, `
      + 'và đổi danh mục team kéo theo team_id của 18 bảng nghiệp vụ');
  }
  assert.equal(cdt.BANG_GHI_DUOC.size, 2, 'cổng danh tính chỉ được ghi ĐÚNG hai bảng');
});

/* ═══════════ ② TẠO VÀ CẤP VAI LÀ MỘT LƯỢT ═══════════ */

test('TẠO · ghi cả `nguoi_dung` lẫn `thanh_vien_team` — tài khoản không vai là tài khoản câm', async () => {
  const { kho } = dungKho();
  const kq = await tv.taoNguoiDung(bcQt(), {
    email: '  Binh@Talpha.VN ', ten: 'Bình', matKhau: 'matkhau-du-dai', maVai: 'marketer',
  });
  assert.equal(kq.email, 'binh@talpha.vn', 'email phải chuẩn hoá — hoa/thường là hai lần đăng nhập hỏng');
  assert.equal(kq.maVai, 'marketer');

  const n = nguoi(kho, 'binh@talpha.vn');
  assert.ok(n, 'không có dòng nguoi_dung nào được tạo');
  assert.equal(n.ten, 'Bình');
  assert.equal(n.hoat_dong, true);

  const cap = kho.docThang('thanh_vien_team')
    .filter((t) => String(t.nguoi_dung_id) === String(n.id));
  assert.equal(cap.length, 1, 'tạo xong mà không cấp vai ⇒ người ấy đăng nhập được nhưng không thấy gì');
  assert.equal(cap[0].team_id, 't1');
  assert.equal(cap[0].vai_id, 'v-mkt');
});

test('TẠO · mật khẩu lưu dạng BĂM scrypt, và kiểm lại đúng bằng chính mật khẩu đã gõ', async () => {
  const { kho } = dungKho();
  await tv.taoNguoiDung(bcQt(), {
    email: 'binh@talpha.vn', ten: 'Bình', matKhau: 'matkhau-du-dai', maVai: 'sale',
  });
  const n = nguoi(kho, 'binh@talpha.vn');
  assert.match(n.mat_khau_hash, /^scrypt\$/, 'phải lưu băm scrypt, không phải nguyên văn');
  assert.ok(!String(n.mat_khau_hash).includes('matkhau-du-dai'), 'mật khẩu nguyên văn nằm trong cột băm');
  // Ca HÀNH VI: băm ghi ra phải mở được bằng chính bộ kiểm của đường đăng nhập. Một băm
  // đúng khuôn mà sai tham số thì vẫn khớp biểu thức trên, và người mới KHÔNG đăng nhập được.
  assert.equal(await mk.kiem('matkhau-du-dai', n.mat_khau_hash), true);
  assert.equal(await mk.kiem('mat khau khac', n.mat_khau_hash), false);
});

test('NHẬT KÝ · có dòng, và dòng ấy KHÔNG mang mật khẩu lẫn băm', async () => {
  const { nhatKy } = dungKho();
  await tv.taoNguoiDung(bcQt(), {
    email: 'binh@talpha.vn', ten: 'Bình', matKhau: 'matkhau-du-dai', maVai: 'sale',
  });
  assert.equal(nhatKy.length, 1);
  assert.equal(nhatKy[0].hanhDong, HANH_DONG.TAO_NGUOI_DUNG);
  const chuoi = JSON.stringify(nhatKy[0]);
  assert.ok(!chuoi.includes('matkhau-du-dai'), 'mật khẩu rơi vào nhật ký — bảng chỉ-thêm, lọt là lọt vĩnh viễn');
  assert.ok(!chuoi.includes('scrypt$'), 'băm cũng không được vào: băm là thứ đem đi dò offline');
  assert.equal(nhatKy[0].sau.coMatKhau, true, 'nhưng phải nói ĐƯỢC là có đặt mật khẩu');
  assert.equal(nhatKy[0].sau.email, 'binh@talpha.vn');
});

test('MÃ · `tao_nguoi_dung` đã khai và là mã BẮT BUỘC ghi', () => {
  assert.ok(hopLeHanhDong(HANH_DONG.TAO_NGUOI_DUNG), 'chưa khai ⇒ mọi dòng nhật ký bị nuốt');
  assert.ok(laBatBuoc(HANH_DONG.TAO_NGUOI_DUNG),
    'mở một tài khoản đăng nhập được là cấp quyền ở mức gốc nhất — mất dấu là mất câu trả lời «ai mở»');
  assert.equal(tv.HANH_DONG_TAO_NGUOI, HANH_DONG.TAO_NGUOI_DUNG);
});

/* ═══════════ ③ TỪ CHỐI THÌ KHÔNG ĐƯỢC ĐỂ LẠI GÌ ═══════════ */

test('VAI LẠ · kiểm TRƯỚC khi tạo, không để lại một `nguoi_dung` mồ côi', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => tv.taoNguoiDung(bcQt(), { email: 'x@talpha.vn', ten: 'X', matKhau: 'matkhau-du-dai', maVai: 'vai-khong-co' }),
    (e) => e.ma === 'vai_la',
  );
  // Thứ tự kiểm là cả nội dung của ca này: tạo người trước rồi mới phát hiện vai lạ thì còn
  // lại một dòng không vai, không màn nào xoá được — và không ai biết nó ở đó.
  assert.equal(nguoi(kho, 'x@talpha.vn'), undefined, 'còn lại một nguoi_dung mồ côi');
});

test('TRÙNG EMAIL · 409 và KHÔNG tạo bản thứ hai của cùng một người', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => tv.taoNguoiDung(bcQt(), { email: 'AN@talpha.vn', ten: 'An hai', matKhau: 'matkhau-du-dai', maVai: 'sale' }),
    (e) => e.ma === 'trung_email' && e.status === 409,
  );
  assert.equal(kho.docThang('nguoi_dung').filter((n) => n.email === 'an@talpha.vn').length, 1);
});

test('MẬT KHẨU YẾU · chặn ở cửa, kèm lý do thật (v3 chưa có đường đặt lại)', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => tv.taoNguoiDung(bcQt(), { email: 'y@talpha.vn', ten: 'Y', matKhau: 'ngan', maVai: 'sale' }),
    (e) => e.ma === 'mat_khau_yeu' && /đặt lại/.test(e.message),
  );
  assert.equal(nguoi(kho, 'y@talpha.vn'), undefined);
});

test('THIẾU VAI · từ chối — cửa này không tạo tài khoản trần', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => tv.taoNguoiDung(bcQt(), { email: 'z@talpha.vn', ten: 'Z', matKhau: 'matkhau-du-dai' }),
    (e) => e.ma === 'thieu_tham_so',
  );
  assert.equal(nguoi(kho, 'z@talpha.vn'), undefined);
});

test('EMAIL SAI HÌNH DẠNG · chặn trước khi chạm CSDL', async () => {
  const { kho } = dungKho();
  for (const e of ['khong-co-cho', 'thieu@ten', '@talpha.vn', '']) {
    await assert.rejects(
      () => tv.taoNguoiDung(bcQt(), { email: e, ten: 'T', matKhau: 'matkhau-du-dai', maVai: 'sale' }),
      (er) => er.ma === 'email_la', `email "${e}" lọt qua`,
    );
  }
  assert.equal(kho.docThang('nguoi_dung').length, 1);
});

/* ═══════════ ④ VAI ═══════════ */

test('VAI · chỉ quan-tri tạo được người dùng', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => tv.taoNguoiDung(bcSale(), { email: 'w@talpha.vn', ten: 'W', matKhau: 'matkhau-du-dai', maVai: 'sale' }),
    /vai|quyền/i,
  );
  assert.equal(kho.docThang('nguoi_dung').length, 1, 'từ chối mà vẫn ghi được là chặn giả');
});
