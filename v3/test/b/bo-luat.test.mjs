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

  // CỬA GHI GIẢ — mô phỏng `src/db/noi-dung.js` của người A (G2-A4). Bản thật chạy trong
  // MỘT giao dịch với `pg_advisory_xact_lock` + `FOR UPDATE`, và tự ghi `nhat_ky`.
  //
  // Bản giả ở đây CỐ Ý không mô phỏng giao dịch: giao dịch là thứ chỉ chứng minh được trên
  // Postgres thật, và giả vờ có nó là làm bài test nói dối về đúng chỗ nó canh. Cái bản giả
  // này canh là: **màn có gọi đúng cửa, đúng tham số, đúng thứ tự** — phần logic bên trong
  // cửa là việc của bài test bên người A.
  const goiCua = [];
  const dungCua = (bo = {}) => bl.datCuaBoLuat({
    taoBan: async (bc, t) => {
      goiCua.push({ ham: 'taoBan', teamId: bc.teamId, ...t });
      if (bo.taoBanHong) throw new Error(bo.taoBanHong);
      const ds = kho.docThang(bl.BANG).filter((r) => String(r.team_id ?? '') === String(bc.teamId));
      const pb = Math.max(0, ...ds.map((r) => Number(r.phien_ban) || 0)) + 1;
      const id = 'moi' + (goiCua.length);
      kho.bang.get(bl.BANG).push({
        id, team_id: bc.teamId, phien_ban: pb, noi_dung: t.noiDung, dang_dung: false,
        nguon: t.nguon || 'nguoi', duyet_luc: null, ghi_chu: t.ghiChu || '', nguoi_sua: bc.tenDangNhap || '',
      });
      return { id, phienBan: pb };
    },
    ap: async (bc, t) => {
      goiCua.push({ ham: 'ap', teamId: bc.teamId, ...t });
      if (bo.apHong) throw new Error(bo.apHong);
      const ds = kho.bang.get(bl.BANG);
      const b = ds.find((r) => String(r.id) === String(t.id));
      if (!b) throw new Error(`không có bản id=${t.id}`);
      if (b.dang_dung) throw new Error(`bản v${b.phien_ban} đang áp rồi.`);
      // Luật §9 mà bản đầu của màn này THIẾU HẲN — cửa của A thi hành nó.
      if (b.nguon === 'ai' && !b.duyet_luc) {
        throw new Error(`bản v${b.phien_ban} là ĐỀ XUẤT CỦA AI và chưa ai duyệt.`);
      }
      const cu2 = ds.find((r) => r.dang_dung && String(r.team_id ?? '') === String(bc.teamId)) || null;
      if (cu2) cu2.dang_dung = false;
      b.dang_dung = true;
      const pages = kho.docThang('page').filter((p) => String(p.team_id) === String(bc.teamId));
      return {
        laLui: cu2 ? Number(b.phien_ban) < Number(cu2.phien_ban) : false,
        anhHuong: { soPage: pages.length, soPageDangBatBot: pages.filter((p) => p.bot_ai_bat).length },
      };
    },
    duyet: async (bc, t) => {
      goiCua.push({ ham: 'duyet', teamId: bc.teamId, ...t });
      const b = kho.bang.get(bl.BANG).find((r) => String(r.id) === String(t.id));
      if (!b) throw new Error(`không có bản id=${t.id}`);
      b.duyet_luc = new Date().toISOString();
      b.duyet_boi = bc.tenDangNhap || '';
      return { duyetLuc: b.duyet_luc };
    },
  }) && goiCua;
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
  dungCua();
  return { kho, nhatKy, taoTruyVan, goiCua, dungCua };
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

test('apPhienBan · trả về con số ảnh hưởng do CỬA tính, và lý do xuống tới cửa', async () => {
  const { goiCua } = dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  const ap = await bl.apPhienBan(bcQt(), kq.id, { lyDo: 'chốt sau họp' });
  assert.equal(ap.anhHuong.tongPage, 3);
  assert.equal(ap.anhHuong.dangBatBot, 2);
  const g = goiCua.find((x) => x.ham === 'ap');
  assert.equal(g.lyDo, 'chốt sau họp', 'lý do phải xuống cửa để vào nhật ký mà CỬA ghi');
  assert.equal(g.id, String(kq.id));
});

test('apPhienBan · màn KHÔNG tự ghi nhật ký — cửa của người A đã ghi trong giao dịch', async () => {
  // Ghi thêm là đẻ hai bản ghi cho một thao tác, rồi người đọc nhật ký đếm gấp đôi. Cùng
  // đúng cái bẫy đã tránh được ở lát «gán page ↔ team».
  const { nhatKy } = dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  await bl.apPhienBan(bcQt(), kq.id);
  assert.deepEqual(nhatKy, [], 'màn không được đẩy bản ghi nào qua phễu của mình');
});

test('apPhienBan · LÙI về bản cũ được, và CỬA khai đó là lùi', async () => {
  dungKho();
  const v2 = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. Mới.' });
  await bl.apPhienBan(bcQt(), v2.id);
  const { ban } = await bl.danhSachBan(bcQt());
  const v1 = ban.find((b) => b.phienBan === 1);
  const lui = await bl.apPhienBan(bcQt(), v1.id);
  assert.equal(lui.laLui, true, 'phải phân biệt được lùi với áp mới');
  assert.equal(lui.phienBan, 1);
});

test('luật §9 · bản `nguon=ai` CHƯA duyệt thì cửa TỪ CHỐI áp — bản đầu của màn THIẾU HẲN luật này', async () => {
  // Đây là chỗ đắt nhất của lượt cắt sang cửa người A: bản tôi tự viết không có luật này,
  // nên một đề xuất của AI áp thẳng được mà không ai duyệt. 01-QUYET-DINH §9 cấm đúng thế.
  const { kho } = dungKho();
  const kq = await bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\n4. AI đề xuất.', nguon: 'ai' });
  const { ban } = await bl.danhSachBan(bcQt());
  const b = ban.find((x) => x.id === String(kq.id));
  assert.equal(b.trangThai, bl.TRANG_THAI.AI_CHUA_DUYET, 'trạng thái RIÊNG, không gộp vào «bản nháp»');

  await assert.rejects(() => bl.apPhienBan(bcQt(), kq.id), /chưa ai duyệt/i);
  assert.equal(kho.docThang(bl.BANG).find((r) => String(r.id) === String(kq.id)).dang_dung, false);

  await bl.duyetBan(bcQt(), kq.id);
  const ap = await bl.apPhienBan(bcQt(), kq.id);
  assert.equal(ap.phienBan, 2);
});

test('chưa nối cửa của người A thì TỪ CHỐI ghi, không lùi về hai lời gọi rời', async () => {
  dungKho();
  bl.datCuaBoLuat(null);
  await assert.rejects(() => bl.luuBanNhap(bcQt(), { noiDung: LUAT_GOC + '\nx' }), (e) => {
    assert.equal(e.ma, 'chua_noi');
    assert.match(e.message, /giao dịch/);
    return true;
  });
});

test('apPhienBan · áp lại bản đang áp thì chặn', async () => {
  dungKho();
  const { dangAp } = await bl.danhSachBan(bcQt());
  await assert.rejects(() => bl.apPhienBan(bcQt(), dangAp.id), /đang áp rồi/i);
});

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

test('trạng thái · đọc THẲNG cột `duyet_luc`/`nguon`, không còn tra nhật ký', async () => {
  // Bản đầu suy «chờ duyệt hay bản cũ» bằng cách hỏi `nhat_ky`. Migration 009 cho cột thật,
  // nên trạng thái thôi phụ thuộc việc ghi nhật ký có thành công hay không.
  dungKho([
    { id: 'a1', team_id: 't1', phien_ban: 1, dang_dung: true, noi_dung: LUAT_GOC, nguon: 'nguoi' },
    { id: 'a2', team_id: 't1', phien_ban: 2, dang_dung: false, noi_dung: LUAT_GOC + 'x', nguon: 'nguoi' },
    { id: 'a3', team_id: 't1', phien_ban: 3, dang_dung: false, noi_dung: LUAT_GOC + 'y',
      nguon: 'ai', duyet_luc: null },
    { id: 'a4', team_id: 't1', phien_ban: 4, dang_dung: false, noi_dung: LUAT_GOC + 'z',
      nguon: 'ai', duyet_luc: '2026-08-25T00:00:00Z' },
  ]);
  const { ban } = await bl.danhSachBan(bcQt());
  const t = Object.fromEntries(ban.map((b) => [b.id, b.trangThai]));
  assert.equal(t.a1, bl.TRANG_THAI.DANG_AP);
  assert.equal(t.a2, bl.TRANG_THAI.CHO_DUYET);
  assert.equal(t.a3, bl.TRANG_THAI.AI_CHUA_DUYET, 'AI chưa duyệt là trạng thái RIÊNG');
  assert.equal(t.a4, bl.TRANG_THAI.DA_DUYET);
});

test('router · `nguon` KHÔNG nhận từ trình duyệt — đóng lỗ lách luật §9', async () => {
  // Đo thật trên xem thử 25/08: router bản đầu KHÔNG truyền `nguon` xuống, nên một bản gửi
  // kèm `nguon:'ai'` vẫn thành bản 'nguoi' và ÁP THẲNG không cần duyệt. Lỗ đúng chiều nguy:
  // đề xuất của AI lách được cửa duyệt mà §9 dựng ra.
  //
  // Cách bịt: màn này là NGƯỜI gõ, nên luôn ghi 'nguoi'. Đường ghi bản AI là cửa RIÊNG của
  // màn «AI đề xuất» (sóng 4). Bài test đọc thẳng mã nguồn router — hành vi này không quan
  // sát được từ tầng dưới vì tầng dưới vốn nhận `nguon` như một tham số hợp lệ.
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const p = path.resolve(fileURLToPath(new URL('.', import.meta.url)),
    '../../src/ui/bo-luat/router.js');
  const src = readFileSync(p, 'utf8');
  const khoi = src.slice(src.indexOf("'/api/bo-luat/nhap'"), src.indexOf("'/api/bo-luat/:id/duyet'"));
  assert.match(khoi, /nguon:\s*'nguoi'/, 'đường /nhap phải ghi cứng nguon nguoi');
  assert.ok(!/nguon:\s*req\.body/.test(khoi), 'KHÔNG được lấy `nguon` từ thân yêu cầu');
});
