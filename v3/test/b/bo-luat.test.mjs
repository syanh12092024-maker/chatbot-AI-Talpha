// MÀN «BỘ LUẬT CHUNG» (G2-C1) — màn NGUY HIỂM NHẤT giai đoạn 2.
//
// Ba thứ bắt buộc phải có trước khi cho bấm áp: khác chỗ nào · bao nhiêu page · nút lùi.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bl = await import('../../src/ui/bo-luat/kho-bo-luat.js');

const LUAT_GOC = ['# BỘ LUẬT', '', '1. Chào bằng tiếng Ả Rập.', '2. Không hứa ngày giao.',
  '3. Không tự giảm giá.'].join('\n') + '\n' + 'x'.repeat(300);

function dungKho(luat = null) {
  const { taoTruyVan, kho } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', bot_ai_bat: true },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', bot_ai_bat: true },
      { id: 'p3', team_id: 't1', page_id: '333', ten: 'C', bot_ai_bat: false },
    ],
    bo_luat_chung: luat === null
      ? [{ id: 'b1', team_id: 't1', phien_ban: 1, dang_dung: true, noi_dung: LUAT_GOC, nguoi_sua: 'seed' }]
      : luat,
  });
  const nhatKy = [];
  bl.datTaoTruyVan(taoTruyVan);
  // Phễu giả GHI THẬT xuống bảng `nhat_ky` — vì `idDaTungAp()` đọc lại chính bảng đó để
  // phân biệt «bản cũ» với «chờ duyệt». Một phễu chỉ đẩy vào mảng thì bài test xanh mà
  // đường thật hỏng.
  bl.datPheuNhatKy(async (bc, ban) => {
    nhatKy.push({ teamId: bc.teamId, ...ban });
    const d = taoTruyVan(bc);
    return d.them('nhat_ky', {
      hanh_dong: ban.hanhDong,
      doi_tuong_loai: ban.doiTuongLoai ?? null,
      doi_tuong_id: ban.doiTuongId == null ? null : String(ban.doiTuongId),
      ghi_chu: ban.ghiChu ?? null,
    });
  });
  return { kho, nhatKy, taoTruyVan };
}

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI] });
const bcDuyet = () => taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'd@talpha.vn', teamId: 't1', vai: [VAI.DUYET_KICH_BAN] });

/* ═══════════ ① khác bản cũ chỗ nào ═══════════ */

test('soSanh · nhận ra dòng thêm, dòng bỏ, dòng giữ', () => {
  const d = bl.soSanh('a\nb\nc', 'a\nB\nc\nd');
  assert.deepEqual(d.map((x) => x.loai), ['giu', 'bo', 'them', 'giu', 'them']);
  assert.deepEqual(d.filter((x) => x.loai === 'them').map((x) => x.chu), ['B', 'd']);
  assert.deepEqual(d.filter((x) => x.loai === 'bo').map((x) => x.chu), ['b']);
});

test('soSanh · hai bản y hệt thì KHÔNG có dòng thêm/bỏ nào', () => {
  const t = bl.tomTatSoSanh(LUAT_GOC, LUAT_GOC);
  assert.equal(t.them, 0);
  assert.equal(t.bo, 0);
  assert.equal(t.coDoi, false, 'không đổi gì thì phải nói là không đổi');
  assert.equal(t.tokenChenh, 0);
});

test('soSanh · chèn một dòng vào GIỮA không làm mọi dòng sau đó thành "đổi"', () => {
  // Đây là chỗ một phép so ngây thơ (so từng dòng theo chỉ số) sai to: chèn một dòng ở đầu
  // là mọi dòng phía dưới lệch chỉ số và bị báo là đã đổi. Người đọc thấy «đổi 40 dòng» rồi
  // không dám bấm, hoặc tệ hơn: quen với việc phép so nói dối nên thôi không đọc nữa.
  const cu = 'd1\nd2\nd3\nd4\nd5';
  const moi = 'd1\nMOI\nd2\nd3\nd4\nd5';
  const t = bl.tomTatSoSanh(cu, moi);
  assert.equal(t.them, 1, 'đúng MỘT dòng thêm');
  assert.equal(t.bo, 0, 'không dòng nào bị bỏ');
  assert.equal(t.giu, 5);
});

test('uocToken · hiệu chỉnh theo chính bộ luật đang chạy (6.734 ký tự ↔ 2.256 token)', () => {
  assert.equal(bl.uocToken('x'.repeat(6734)), 2256);
});

/* ═══════════ ② bao nhiêu page bị ảnh hưởng ═══════════ */

test('demAnhHuong · HAI con số, và chúng trả lời hai câu khác nhau', () => {
  dungKho();
  return bl.demAnhHuong(bcQt()).then((a) => {
    assert.equal(a.tongPage, 3, 'bộ luật nằm trong prompt của bao nhiêu page');
    assert.equal(a.dangBatBot, 2, 'bao nhiêu page ĐANG nói chuyện với khách thật');
    assert.ok(a.dangBatBot < a.tongPage, 'hai số phải phân biệt được, không gộp làm một');
    assert.ok(a.tenVaiPage.length, 'kèm vài tên để con số không trừu tượng');
  });
});

/* ═══════════ SỬA KHÔNG ÁP NGAY ═══════════ */

test('luuBanNhap · tạo bản MỚI và KHÔNG đụng bản đang chạy', async () => {
  const { kho } = dungKho();
  const truoc = kho.docThang(bl.BANG).find((r) => r.dang_dung === true);
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Luật mới.' });

  assert.equal(kq.daAp, false, 'lưu KHÔNG được áp');
  assert.equal(kq.phienBan, 2);
  const sau = kho.docThang(bl.BANG);
  assert.equal(sau.length, 2, 'tạo dòng mới, KHÔNG sửa đè — sửa đè là xoá mất bản 51 page đang chạy');
  assert.equal(sau.find((r) => r.id === truoc.id).dang_dung, true, 'bản cũ vẫn đang áp');
  assert.equal(sau.find((r) => r.phien_ban === 2).dang_dung, false);
});

test('luuBanNhap · bản mới nằm ở CHỜ DUYỆT cho tới khi có người bấm áp', async () => {
  dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Luật mới.' });
  const { ban } = await bl.danhSachBan(bcQt());
  const moi = ban.find((b) => b.id === kq.id);
  assert.equal(moi.trangThai, bl.TRANG_THAI.CHO_DUYET);
  assert.equal(moi.dangDung, false);
});

test('luuBanNhap · bản QUÁ NGẮN bị chặn — dán nhầm là 51 page mất sạch quy tắc', async () => {
  const { kho } = dungKho();
  await assert.rejects(() => bl.luuBanNhap(bcQt(), { noiDung: 'xin chào' }), (e) => e.ma === 'qua_ngan');
  assert.equal(kho.docThang(bl.BANG).length, 1, 'chặn rồi thì không ghi dòng nào');
});

test('luuBanNhap · nội dung y hệt bản đang áp thì không đẻ bản trùng', async () => {
  const { kho } = dungKho();
  await assert.rejects(() => bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC }), (e) => e.ma === 'khong_doi');
  assert.equal(kho.docThang(bl.BANG).length, 1);
});

/* ═══════════ ③ áp và lùi — CÙNG một hàm ═══════════ */

test('apPhienBan · áp xong thì bản cũ tự hạ, đúng MỘT bản đang áp', async () => {
  const { kho } = dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  const ap = await bl.apPhienBan(bcQt(), kq.id);
  assert.equal(ap.laLui, false);
  const dangAp = kho.docThang(bl.BANG).filter((r) => r.dang_dung === true);
  assert.equal(dangAp.length, 1, 'hai bản cùng dang_dung là hai bản cùng tranh nhau vào prompt');
  assert.equal(String(dangAp[0].id), String(kq.id));
});

test('apPhienBan · áp KÈM con số ảnh hưởng vào nhật ký — không ghi một dòng trống nghĩa', async () => {
  const { nhatKy } = dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  await bl.apPhienBan(bcQt(), kq.id, { lyDo: 'chốt sau họp' });
  const d = nhatKy.find((x) => x.hanhDong === bl.HANH_DONG_AP);
  assert.ok(d, 'phải có dòng ap_bo_luat');
  assert.equal(d.sau.so_page_anh_huong, 3);
  assert.equal(d.sau.so_page_bat_bot, 2);
  assert.equal(d.truoc.phien_ban, 1, 'phải ghi cả bản TRƯỚC để truy ngược được');
  assert.match(d.ghiChu, /chốt sau họp/);
});

test('apPhienBan · LÙI về bản cũ được, và nhật ký khai rõ đó là lùi', async () => {
  const { nhatKy } = dungKho();
  const v2 = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  await bl.apPhienBan(bcQt(), v2.id);
  const { ban } = await bl.danhSachBan(bcQt());
  const v1 = ban.find((b) => b.phienBan === 1);

  const lui = await bl.apPhienBan(bcQt(), v1.id);
  assert.equal(lui.laLui, true, 'phải phân biệt được lùi với áp mới');
  assert.equal(lui.phienBan, 1);
  const d = nhatKy.filter((x) => x.hanhDong === bl.HANH_DONG_AP).at(-1);
  assert.equal(d.sau.la_lui, true);
  assert.match(d.ghiChu, /LÙI/);
});

test('apPhienBan · sau khi LÙI, bản bị gạt phải là "BẢN CŨ", KHÔNG phải "chờ duyệt"', async () => {
  // ĐÂY LÀ BÀI TEST QUAN TRỌNG NHẤT CỦA FILE. `bo_luat_chung` không có cột `trang_thai`,
  // nên suy trạng thái bằng SỐ PHIÊN BẢN sẽ sai đúng ở chỗ này: sau lượt lùi, bản v2 (số
  // lớn hơn) lại trông như «chờ duyệt» trong khi nó ĐÃ TỪNG CHẠY và bị gạt — và người sau
  // sẽ bấm áp lại nó tưởng là bản mới chưa ai duyệt.
  // Cách đúng: hỏi `nhat_ky` (bảng chỉ-thêm) xem bản này đã từng áp chưa.
  dungKho();
  const v2 = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  const { ban: b0 } = await bl.danhSachBan(bcQt());
  assert.equal(b0.find((b) => b.id === v2.id).trangThai, bl.TRANG_THAI.CHO_DUYET);

  await bl.apPhienBan(bcQt(), v2.id);
  const v1 = (await bl.danhSachBan(bcQt())).ban.find((b) => b.phienBan === 1);
  await bl.apPhienBan(bcQt(), v1.id);            // lùi

  const { ban, dangAp } = await bl.danhSachBan(bcQt());
  assert.equal(dangAp.phienBan, 1);
  assert.equal(ban.find((b) => b.id === v2.id).trangThai, bl.TRANG_THAI.DA_TUNG_AP,
    'bản đã từng chạy KHÔNG được quay lại trạng thái "chờ duyệt"');
});

test('apPhienBan · áp lại bản đang áp thì chặn, đừng đẻ nhật ký rác', async () => {
  const { nhatKy } = dungKho();
  const { dangAp } = await bl.danhSachBan(bcQt());
  await assert.rejects(() => bl.apPhienBan(bcQt(), dangAp.id), (e) => e.ma === 'dang_ap');
  assert.equal(nhatKy.length, 0);
});

/* ═══════════ bản TOÀN HỆ — kế thừa, chỉ đọc ═══════════ */

test('bản toàn hệ · hiện ra kèm nhãn KẾ THỪA, không phải "chờ duyệt"', async () => {
  dungKho([
    { id: 'g1', team_id: null, phien_ban: 1, dang_dung: false, noi_dung: LUAT_GOC, nguoi_sua: 'seed' },
    { id: 'b1', team_id: 't1', phien_ban: 2, dang_dung: true, noi_dung: LUAT_GOC + '\nriêng', nguoi_sua: 'an' },
  ]);
  const { ban } = await bl.danhSachBan(bcQt());
  const toanHe = ban.find((b) => b.toanHe);
  assert.ok(toanHe, 'bản toàn hệ phải hiện — hợp đồng đọc là (team_id = ctx OR team_id IS NULL)');
  // Gọi nó là «chờ duyệt» là mời người ta đi bấm một nút chắc chắn báo lỗi.
  assert.equal(toanHe.trangThai, bl.TRANG_THAI.KE_THUA);
});

test('bản toàn hệ · KHÔNG áp được từ màn này, và lỗi nói rõ vì sao', async () => {
  dungKho([
    { id: 'g1', team_id: null, phien_ban: 1, dang_dung: false, noi_dung: LUAT_GOC, nguoi_sua: 'seed' },
    { id: 'b1', team_id: 't1', phien_ban: 2, dang_dung: true, noi_dung: LUAT_GOC + '\nriêng', nguoi_sua: 'an' },
  ]);
  await assert.rejects(() => bl.apPhienBan(bcQt(), 'g1'), (e) => {
    assert.equal(e.ma, 'ban_toan_he');
    assert.match(e.message, /soạn một bản riêng/i, 'phải chỉ đường đi tiếp, không chỉ từ chối');
    return true;
  });
});

test('kế thừa · team CHƯA có bản riêng thì nói rõ đang kế thừa, không nói "chưa có gì"', async () => {
  dungKho([{ id: 'g1', team_id: null, phien_ban: 1, dang_dung: true, noi_dung: LUAT_GOC, nguoi_sua: 'seed' }]);
  const d = await bl.danhSachBan(bcQt());
  assert.equal(d.keThua, true);
  assert.equal(d.soBanCuaTeam, 0);
  assert.equal(d.soBanToanHe, 1);
  assert.equal(d.trong, null, 'CÓ bản để dùng thì không phải trạng thái rỗng');
});

test('rỗng thật · không bản nào thì nói bot đang chạy KHÔNG có quy tắc cứng nào', async () => {
  dungKho([]);
  const d = await bl.danhSachBan(bcQt());
  assert.ok(d.trong);
  assert.equal(d.trong.vi, 'chua_cai_dat');
  assert.match(d.trong.noi, /không có khối quy tắc cứng/i);
  assert.ok(d.trong.diTiep);
});

/* ═══════════ phân quyền ═══════════ */

test('vai · người duyệt kịch bản XEM được nhưng KHÔNG sửa và KHÔNG áp', async () => {
  // `01-QUYET-DINH.md` §9 tách hai việc: duyệt kịch bản ≠ sửa luật chung.
  dungKho();
  const d = await bl.danhSachBan(bcDuyet());
  assert.ok(d.ban.length, 'xem được');
  await assert.rejects(() => bl.luuBanNhap(bcDuyet(), { noiDung: LUAT_GOC + '\nx' }), (e) => e.ma === 'thieu_vai');
  await assert.rejects(() => bl.apPhienBan(bcDuyet(), d.dangAp.id), (e) => e.ma === 'thieu_vai');
});

test('vai · thiếu bối cảnh thì NÉM, không trả danh sách rỗng', async () => {
  dungKho();
  await assert.rejects(() => bl.danhSachBan(null), /bối cảnh|teamId/i);
  await assert.rejects(() => bl.demAnhHuong(null), /bối cảnh|teamId/i);
});

test('nhật ký · chưa nối phễu thì TỪ CHỐI ghi — dòng ap_bo_luat vừa là dấu vết vừa là DỮ LIỆU', async () => {
  dungKho();
  bl.datPheuNhatKy(null);
  await assert.rejects(() => bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\nx' }), (e) => e.ma === 'chua_noi');
});
