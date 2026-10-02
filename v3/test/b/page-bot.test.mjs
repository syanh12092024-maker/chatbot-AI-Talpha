// MÀN «PAGE & BOT» (G2-B2) — ba cột ba chủ sở hữu, và MỘT công tắc bot (CR-02-10 · MB2).
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
const kp = await import('../../src/ui/page-bot/kho-page.js');
const ct = await import('../../src/ui/page-bot/cong-tac.js');
const cau = await import('../../src/noi-day/cau-bot-v1.js');

const GOC_REPO = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const NAP_JS = path.join(GOC_REPO, 'db/di-tru/nap.js');

let _kho = null;   // kho giả của lượt dựng gần nhất — cổng công tắc giả ghi cột vào đây
function dungKho(themPage = null, { sanSang } = {}) {
  const page = themPage || [
    { id: 'p1', team_id: 't1', page_id: '111', ten: 'Alpha KSA', thi_truong: 'Saudi',
      marketer: '', bot_ai_bat: true, trong_diem: false, mat_dau: false },
    { id: 'p2', team_id: 't1', page_id: '222', ten: 'Beta UAE', thi_truong: 'UAE',
      marketer: 'An', bot_ai_bat: false, trong_diem: true, mat_dau: false },
    { id: 'p3', team_id: 't1', page_id: '333', ten: 'Gamma Oman', thi_truong: 'Oman',
      marketer: '', bot_ai_bat: false, trong_diem: false, mat_dau: true },
    { id: 'p9', team_id: 't2', page_id: '999', ten: 'Của team khác', thi_truong: 'Qatar',
      marketer: '', bot_ai_bat: false, trong_diem: false, mat_dau: false },
  ];
  const { taoTruyVan, kho } = dungCongGia({
    team: [
      { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
      { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    ],
    page,
  });
  const nhatKy = [];
  _kho = kho;
  kp.datTaoTruyVan(taoTruyVan);
  // Cửa kiểm sẵn sàng: đặt LẠI mỗi lượt dựng — không đặt lại là ca sau thừa hưởng bộ đọc
  // của ca trước, và khi đó ca đỏ chỉ ra sai chỗ.
  kp.datDocSanSang(sanSang ?? null);
  ct.datPheuNhatKy((bc, ban) => { nhatKy.push({ bc, ban }); return { id: 'nk' + nhatKy.length }; });
  return { kho, nhatKy };
}

const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});
const bcQuanLy = () => taoBoiCanh({
  nguoiDungId: 'u2', tenDangNhap: 'ql@talpha.vn', teamId: 't1', vai: [VAI.QUAN_LY],
});

/** Nối cổng công tắc GIẢ (đóng vai `src/admin-v3/operations.js#setPage`: cổng sẵn sàng + ghi cột
 *  `bot_ai_bat`) cho một đoạn test, rồi trả lại nguyên trạng. CR-02-10 · MB2: công tắc không còn đi
 *  qua tiến trình bot v1. `tuChoi` = câu cổng sẵn sàng ném khi BẬT (page còn chặn, van gửi đóng…). */
async function voiCuaMo(fn, { tuChoi = null } = {}) {
  const cu = { ghi: process.env.V3_BOT_GHI, ro: process.env.PANCAKE_READONLY };
  const goi = [];
  ct.datCongTacV3(async (bc, id, bat) => {
    const dong = _kho.bang.get('page').find((x) => x.id === String(id) && x.team_id === bc.teamId);
    if (!dong) return null;
    goi.push({ id: String(id), on: !!bat });
    if (bat && tuChoi) throw Object.assign(new Error(tuChoi), { status: 409, ma: 'v3_cau_hinh' });
    const truoc = dong.bot_ai_bat === true;
    dong.bot_ai_bat = !!bat;
    return { id: String(id), pageId: dong.page_id, botAiBat: !!bat, doi: truoc !== !!bat };
  });
  // KHÔNG đặt `V3_BOT_GHI`: cửa MỞ mặc định — đặt nó ở đây sẽ che mất chuyện mặc định có mở thật không.
  delete process.env.V3_BOT_GHI;
  delete process.env.V3_BOT_KHOA;
  delete process.env.PANCAKE_READONLY;
  try { return await fn(goi); } finally {
    ct.datCongTacV3(null);
    for (const [k, v] of [['V3_BOT_GHI', cu.ghi], ['PANCAKE_READONLY', cu.ro]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

/* ═══════════ ba cột ba chủ sở hữu — khoá lại bằng chính file di trú ═══════════ */

test('COT_BI_DI_TRU_GHI_DE · đối chiếu THẲNG câu ON CONFLICT của `db/di-tru/nap.js`', () => {
  // ĐỌC FILE THẬT. Gõ tay danh sách này vào đây là đẻ bản sao thứ hai của một sự thật nằm
  // ở đất người khác — mà chính chỗ đó mới là chỗ đổi.
  const src = readFileSync(NAP_JS, 'utf8');
  const khoi = src.match(/ON CONFLICT \(page_id\) DO UPDATE SET([\s\S]*?)`,/);
  assert.ok(khoi, 'không tìm thấy câu ON CONFLICT của napPage');
  const cotThat = new Set([...khoi[1].matchAll(/(\w+)\s*=\s*EXCLUDED\./g)].map((m) => m[1]));

  for (const c of kp.COT_BI_DI_TRU_GHI_DE) {
    assert.ok(cotThat.has(c), `hằng khai "${c}" bị di trú ghi đè, nhưng file không ghi đè nó nữa`);
  }
  for (const c of cotThat) {
    assert.ok(kp.COT_BI_DI_TRU_GHI_DE.includes(c),
      `di trú ghi đè cột "${c}" mà hằng COT_BI_DI_TRU_GHI_DE chưa khai — nếu màn hình cho sửa `
      + 'cột đó thì công sức người dùng sẽ bị xoá âm thầm');
  }

  // `PHIEU-B-Y4` XONG 25/08: di trú nay dùng `CASE WHEN page.marketer <> '' ...` nên
  // `marketer` KHÔNG còn ở dạng `= EXCLUDED.marketer` trần. Bài test này bắt được đúng lúc
  // A vá xong — nó đỏ vì hằng còn khai marketer, và đó là cách nó phải hoạt động.
  assert.ok(!cotThat.has('marketer'),
    'marketer không được ghi đè trần nữa — nếu nó quay lại thì PHIEU-B-Y4 đã bị lùi');
  assert.match(khoi[1], /CASE WHEN page\.marketer/,
    'phải giữ nhánh CASE: nguồn điền vào chỗ trống nhưng không xoá chỗ đã có');
  assert.ok(!cotThat.has('trong_diem'), 'trong_diem KHÔNG được nằm trong câu ghi đè');
});

test('COT_SUA_DUOC · cả hai cột nay đều BỀN sau khi PHIEU-B-Y4 xong', () => {
  assert.equal(kp.COT_SUA_DUOC.marketer.benVung, true, 'Y4 đã vá — di trú không xoá marketer nữa');
  assert.equal(kp.COT_SUA_DUOC.trong_diem.benVung, true);
  // Cảnh báo phải TẮT theo. Để nó kêu tiếp là dạy người dùng bỏ qua cảnh báo — mà cảnh báo
  // bị bỏ qua thì lần sau có cảnh thật cũng không ai đọc.
  assert.equal(ct.CANH_BAO_MARKETER, null, 'vá xong thì cảnh báo phải TẮT');
});

/* ═══════════ đọc và lọc ═══════════ */

test('danhSachPage · thiếu bối cảnh thì NÉM, không trả danh sách rỗng', async () => {
  dungKho();
  await assert.rejects(() => kp.danhSachPage(null), /bối cảnh|teamId/i);
});

test('danhSachPage · chỉ page của team đang mở', async () => {
  dungKho();
  const d = await kp.danhSachPage(bcQt('t1'));
  assert.equal(d.soTong, 3, 'page của t2 không được lọt vào');
  assert.ok(!d.page.some((p) => p.pageId === '999'));
});

test('danhSachPage · bộ lọc và số đếm khớp nhau', async () => {
  dungKho();
  const d = await kp.danhSachPage(bcQt());
  assert.equal(d.dem.bot_bat, 1);
  assert.equal(d.dem.bot_tat, 2);
  assert.equal(d.dem.thieu_marketer, 2);
  assert.equal(d.dem.co_marketer, 1);
  assert.equal(d.dem.trong_diem, 1);
  assert.equal(d.dem.mat_dau, 1);

  const chiThieu = await kp.danhSachPage(bcQt(), { loc: kp.LOC.THIEU_MARKETER });
  assert.equal(chiThieu.page.length, 2);
  assert.ok(chiThieu.page.every((p) => !p.marketer));
});

test('danhSachPage · bộ lọc lạ bị chặn, không lặng lẽ trả tất cả', async () => {
  dungKho();
  await assert.rejects(() => kp.danhSachPage(bcQt(), { loc: 'linh-tinh' }), (e) => e.ma === 'loc_la');
});

test('danhSachPage · tìm theo tên, id Facebook, thị trường và marketer', async () => {
  dungKho();
  for (const [tim, mong, vi] of [
    ['Beta', 1, 'theo tên page'],
    ['333', 1, 'theo id Facebook'],
    ['Saudi', 1, 'theo thị trường'],
    ['zzz', 0, 'không khớp gì'],
    // "An" khớp HAI dòng: marketer "An" của Beta, và "Om**an**" của Gamma. Tìm theo chuỗi con
    // là như vậy, và đó là hành vi đúng cho một ô tìm kiếm — ghi rõ ở đây để người sau không
    // "sửa" nó thành khớp-nguyên-từ rồi làm mất khả năng gõ một phần tên.
    ['An', 2, 'chuỗi con, khớp cả marketer lẫn thị trường'],
  ]) {
    const d = await kp.danhSachPage(bcQt(), { tim });
    assert.equal(d.soKhop, mong, `tìm "${tim}" (${vi})`);
  }
  // Và khẳng định riêng rằng ô tìm CÓ soi cột marketer, không phải chỉ tình cờ khớp tên.
  const theoMkt = await kp.danhSachPage(bcQt(), { tim: 'an' });
  assert.ok(theoMkt.page.some((p) => p.marketer === 'An'), 'phải tìm được theo marketer');
});

test('viSaoRong · BA nghĩa khác nhau, và chỉ MỘT là tin mừng', async () => {
  // Team chưa có page nào → chưa cài đặt, phải chỉ đường.
  const a = kp.viSaoRong({ soTong: 0, loc: kp.LOC.TAT_CA, tim: '' });
  assert.equal(a.vi, 'chua_cai_dat');
  assert.ok(a.diTiep && a.diTiep.duong === '/cau-hinh-team');

  // Lọc "chưa có marketer" mà rỗng → ĐÂY mới là tin mừng.
  const b = kp.viSaoRong({ soTong: 10, loc: kp.LOC.THIEU_MARKETER, tim: '' });
  assert.equal(b.vi, 'xong');

  // Tìm không ra → không phải tin mừng, cũng không phải chưa cài đặt.
  const c = kp.viSaoRong({ soTong: 10, loc: kp.LOC.TAT_CA, tim: 'zzz' });
  assert.equal(c.vi, 'khong_khop');
  assert.notEqual(c.vi, b.vi);
});

test('danhSachPage · cắt trang, và trang vượt biên bị kẹp về trang cuối', async () => {
  const nhieu = Array.from({ length: 120 }, (_, i) => ({
    id: `p${i}`, team_id: 't1', page_id: String(1000 + i), ten: `Page ${String(i).padStart(3, '0')}`,
    marketer: '', bot_ai_bat: false, trong_diem: false, mat_dau: false,
  }));
  dungKho(nhieu);
  const t0 = await kp.danhSachPage(bcQt(), { trang: 0 });
  assert.equal(t0.page.length, kp.MOI_TRANG);
  assert.equal(t0.soTrang, 3);
  const t9 = await kp.danhSachPage(bcQt(), { trang: 99 });
  assert.equal(t9.trang, 2, 'trang vượt biên phải kẹp về trang cuối, không trả rỗng');
  assert.equal(t9.page.length, 20);
});

/* ═══════════ công tắc BOT AI — MỘT đường: cổng sẵn sàng của bot → cột `bot_ai_bat` ═══════════ */

// ═══ CỬA GHI: MỞ MẶC ĐỊNH, KHOÁ ĐƯỢC ═══════════════════════════════════════════════
//
// Bản trước ĐÓNG mặc định, phải đặt `V3_BOT_GHI=1`. Đổi vì nó là chốt thứ TÁM trên một
// đường đã có bảy chốt, và là chốt duy nhất đòi SSH — nên người ta bỏ v3 quay về dashboard
// cũ, nơi bật AI chỉ có một mật khẩu dùng chung và KHÔNG ghi nhật ký ai bấm.

test('cửa ghi MỞ mặc định khi không khai cờ nào', async () => {
  dungKho();
  await voiCuaMo(async () => {
    const kq = await ct.datCongTacBot(bcQt(), 'p1', false);
    assert.equal(kq.id, 'p1', 'không cờ nào mà vẫn từ chối là quay lại chốt thứ tám');
  });
});

test('`V3_BOT_KHOA=1` khoá lại được', async () => {
  dungKho();
  await voiCuaMo(async () => {
    process.env.V3_BOT_KHOA = '1';
    try {
      await assert.rejects(() => ct.datCongTacBot(bcQt(), 'p1', false), (e) => {
        assert.equal(e.ma, 'cua_ghi_dong');
        assert.match(e.message, /V3_BOT_KHOA/);
        return true;
      });
    } finally { delete process.env.V3_BOT_KHOA; }
  });
});

test('cờ cũ `V3_BOT_GHI=0` vẫn được tôn trọng', async () => {
  // Ai đã cố ý tắt bằng cờ cũ thì đổi mặc định KHÔNG được âm thầm bật lại giúp họ.
  dungKho();
  await voiCuaMo(async () => {
    process.env.V3_BOT_GHI = '0';
    try {
      await assert.rejects(() => ct.datCongTacBot(bcQt(), 'p1', false), (e) => {
        assert.equal(e.ma, 'cua_ghi_dong');
        return true;
      });
    } finally { delete process.env.V3_BOT_GHI; }
  });
});

test('`PANCAKE_READONLY=1` KHÔNG khoá việc TẮT — van gửi do cổng sẵn sàng của bot giữ khi BẬT', async () => {
  // CR-02-10 · MB2: tầng này chỉ còn khoá TAY. Máy dev/máy chủ chỉ-đọc vẫn tắt được bot (lúc sự cố
  // cần nhất); BẬT thì `pageStatus` chặn «Máy chủ chưa mở gửi tin» — ca riêng ở dưới.
  dungKho();
  await voiCuaMo(async () => {
    process.env.PANCAKE_READONLY = '1';
    try {
      const kq = await ct.datCongTacBot(bcQt(), 'p1', false);
      assert.equal(kq.botAiBat, false);
    } finally { delete process.env.PANCAKE_READONLY; }
  });
});

/* ═══════════ TRẦN BẬT HÀNG LOẠT ═══════════ */

test('trần · bật quá số cho phép trong một đợt thì DỪNG', async () => {
  const { kho } = dungKho();
  ct.xoaDemBat();
  // Gieo đủ page để bật.
  for (let i = 0; i < ct.TRAN_BAT_MOT_DOT + 2; i += 1) {
    kho.bang.get('page').push({ id: 'g' + i, team_id: 't1', page_id: '90' + i, ten: 'G' + i, bot_ai_bat: false });
  }
  await voiCuaMo(async () => {
    for (let i = 0; i < ct.TRAN_BAT_MOT_DOT; i += 1) await ct.datCongTacBot(bcQt(), 'g' + i, true);
    assert.equal(ct.conBatDuoc(), 0);
    await assert.rejects(() => ct.datCongTacBot(bcQt(), 'g' + ct.TRAN_BAT_MOT_DOT, true), (e) => {
      assert.equal(e.ma, 'qua_tran_bat');
      assert.equal(e.status, 429);
      assert.match(e.message, /một cú bấm nhầm/i, 'phải nói VÌ SAO có trần, không chỉ chặn');
      return true;
    });
  });
});

test('trần · TẮT bot KHÔNG BAO GIỜ bị chặn, kể cả khi đã chạm trần', async () => {
  // Lúc cần tắt gấp là lúc đang có sự cố. Một cái trần chặn người ta tắt bot là cái trần
  // GÂY RA thiệt hại chứ không ngăn.
  const { kho } = dungKho();
  ct.xoaDemBat();
  for (let i = 0; i < ct.TRAN_BAT_MOT_DOT + 1; i += 1) {
    kho.bang.get('page').push({ id: 'h' + i, team_id: 't1', page_id: '80' + i, ten: 'H' + i, bot_ai_bat: false });
  }
  await voiCuaMo(async () => {
    for (let i = 0; i < ct.TRAN_BAT_MOT_DOT; i += 1) await ct.datCongTacBot(bcQt(), 'h' + i, true);
    assert.equal(ct.conBatDuoc(), 0, 'đã chạm trần');
  });
  await voiCuaMo(async () => {
    const kq = await ct.datCongTacBot(bcQt(), 'h0', false);
    assert.equal(kq.botAiBat, false, 'tắt phải luôn đi được');
  });
});

test('trần · gạt lại page ĐANG BẬT không tốn lượt', async () => {
  const { kho } = dungKho();
  ct.xoaDemBat();
  kho.bang.get('page').push({ id: 'x1', team_id: 't1', page_id: '7001', ten: 'X', bot_ai_bat: true });
  await voiCuaMo(async () => {
    const con = ct.conBatDuoc();
    await ct.datCongTacBot(bcQt(), 'x1', true);
    assert.equal(ct.conBatDuoc(), con, 'nó vốn đã bật — không có page nào vừa lên');
  });
});

test('công tắc bot · đi qua cổng của bot rồi GHI CỘT `bot_ai_bat` — cột là sự thật, có nhật ký', async () => {
  const { kho, nhatKy } = dungKho();
  await voiCuaMo(async (goi) => {
    const kq = await ct.datCongTacBot(bcQt(), 'p2', true);
    assert.deepEqual(goi, [{ id: 'p2', on: true }], 'đúng một lượt qua cổng, bằng id CSDL');
    assert.equal(kq.botAiBat, true);
    assert.equal(kq.pageId, '222');
  });
  assert.equal(kho.docThang('page').find((p) => p.id === 'p2').bot_ai_bat, true, 'worker đọc đúng cột này');
  assert.equal(nhatKy.at(-1).ban.hanhDong, ct.HANH_DONG_BOT);
  assert.deepEqual(nhatKy.at(-1).ban.truoc, { bot_ai_bat: false });
  assert.deepEqual(nhatKy.at(-1).ban.sau, { bot_ai_bat: true });
});

test('công tắc bot · cổng sẵn sàng TỪ CHỐI bật ⇒ ném nguyên lý do, cột giữ nguyên, không tốn trần', async () => {
  const { kho, nhatKy } = dungKho();
  ct.xoaDemBat();
  const con = ct.conBatDuoc();
  const soNk = nhatKy.length;
  await voiCuaMo(async () => {
    await assert.rejects(() => ct.datCongTacBot(bcQt(), 'p2', true), (e) => {
      assert.match(e.message, /Máy chủ chưa mở gửi tin/);
      return true;
    });
  }, { tuChoi: 'Máy chủ chưa mở gửi tin' });
  assert.equal(kho.docThang('page').find((p) => p.id === 'p2').bot_ai_bat, false);
  assert.equal(ct.conBatDuoc(), con, 'bật hỏng không tốn lượt trần');
  assert.equal(nhatKy.length, soNk, 'không có gì đổi thì không ghi nhật ký «đã bật»');
});

test('công tắc bot · MỘT đường: không còn «giao page» (CR-02-10)', async () => {
  assert.equal(typeof ct.giaoPage, 'undefined', 'cửa «giao page sang bot mới» phải gỡ');
  assert.equal(typeof ct.trangThaiCauDaoGiao, 'undefined');
  const router = readFileSync(path.join(GOC_REPO, 'v3/src/ui/page-bot/router.js'), 'utf8');
  assert.doesNotMatch(router, /r\.post\('\/api\/page-bot\/:id\/giao'/, 'đường POST /giao phải gỡ');
});

test('công tắc bot · page của team khác → 404, KHÔNG phải 403', async () => {
  const { kho } = dungKho();
  await voiCuaMo(async (goi) => {
    await assert.rejects(() => ct.datCongTacBot(bcQt('t1'), 'p9', true), (e) => {
      assert.equal(e.status, 404, '403 là xác nhận dòng đó có thật ở team khác');
      assert.equal(e.ma, 'khong_thay');
      return true;
    });
    assert.equal(goi.length, 0, 'chặn TRƯỚC khi gọi sang bot — v1 không biết team là gì');
  });
  assert.equal(kho.docThang('page').find((p) => p.id === 'p9').bot_ai_bat, false);
});

test('công tắc bot · chỉ quan-tri; quan-ly xem được nhưng không gạt được', async () => {
  dungKho();
  await voiCuaMo(async (goi) => {
    await assert.rejects(() => ct.datCongTacBot(bcQuanLy(), 'p1', false), (e) => e.ma === 'thieu_vai');
    assert.equal(goi.length, 0);
  });
});

test('công tắc bot · chưa nối phễu nhật ký thì TỪ CHỐI, không gạt lặng lẽ', async () => {
  dungKho();
  ct.datPheuNhatKy(null);
  await voiCuaMo(async () => {
    await assert.rejects(() => ct.datCongTacBot(bcQt(), 'p1', false), (e) => e.ma === 'chua_noi');
  });
});

/* ═══════════ marketer và trọng điểm ═══════════ */

test('ganMarketer · ghi được và có nhật ký; cảnh báo di trú đã TẮT sau Y4', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await ct.ganMarketer(bcQt(), 'p1', '  Ngọc  ');
  assert.equal(kq.marketer, 'Ngọc', 'phải cắt khoảng trắng hai đầu');
  assert.equal(kq.canhBao, null, 'Y4 vá rồi thì không còn cảnh báo nào để kèm');
  assert.equal(kho.docThang('page').find((p) => p.id === 'p1').marketer, 'Ngọc');
  assert.equal(nhatKy.at(-1).ban.hanhDong, ct.HANH_DONG_MARKETER);
});

test('ganMarketer · không đổi thì không ghi nhật ký; quá dài thì chặn', async () => {
  const { nhatKy } = dungKho();
  const kq = await ct.ganMarketer(bcQt(), 'p2', 'An');
  assert.equal(kq.doi, false);
  assert.equal(nhatKy.length, 0);
  await assert.rejects(() => ct.ganMarketer(bcQt(), 'p1', 'x'.repeat(ct.DAI_MARKETER + 1)),
    (e) => e.ma === 'qua_dai');
});

test('ganMarketer · page team khác → 404', async () => {
  dungKho();
  await assert.rejects(() => ct.ganMarketer(bcQt('t1'), 'p9', 'X'), (e) => e.status === 404);
});

test('datTrongDiem · ghi thẳng CSDL, không cần cửa ghi sang bot', async () => {
  // Cột này CSDL v3 sở hữu trọn nên không phụ thuộc tiến trình bot — kiểm luôn để người sau
  // không "sửa cho đồng bộ" bằng cách bắt nó đi qua cầu.
  const { kho, nhatKy } = dungKho();
  delete process.env.V3_BOT_GHI;
  const kq = await ct.datTrongDiem(bcQt(), 'p1', true);
  assert.equal(kq.trongDiem, true);
  assert.equal(kho.docThang('page').find((p) => p.id === 'p1').trong_diem, true);
  assert.equal(nhatKy.at(-1).ban.hanhDong, ct.HANH_DONG_TRONG_DIEM);
});

/* ═══════════ cây cầu ═══════════ */

test('cầu bot · MẶC ĐỊNH MỞ, nhưng ba thứ vẫn khoá được', async () => {
  // ⚠️ Bài này trước canh «mặc định ĐÓNG». Khi đổi hợp đồng, nó XANH NHẦM ở máy dev vì máy
  //    đó luôn có `PANCAKE_READONLY=1` (luật của chủ dự án) nên cửa đóng dù sao — chỉ máy
  //    chủ mới lộ ra. Bài học: một bài test phụ thuộc biến môi trường của máy chạy nó thì
  //    xanh ở đây không có nghĩa là đúng ở kia. Nay dọn sạch env trước mỗi phép khẳng định.
  const cu = {
    g: process.env.V3_BOT_GHI, k: process.env.V3_BOT_KHOA, r: process.env.PANCAKE_READONLY,
    u: process.env.ADMIN_USER, p: process.env.ADMIN_PASS,
  };
  const don = () => {
    delete process.env.V3_BOT_GHI; delete process.env.V3_BOT_KHOA;
    delete process.env.PANCAKE_READONLY;
    process.env.ADMIN_USER = 'u'; process.env.ADMIN_PASS = 'p';
  };
  try {
    don();
    assert.equal(cau.trangThaiCau().mo, true,
      'không khai cờ nào thì phải MỞ — bắt SSH mới ghi được là đẩy người ta sang dashboard cũ');

    don(); process.env.V3_BOT_KHOA = '1';
    let t = cau.trangThaiCau();
    assert.equal(t.mo, false, '`V3_BOT_KHOA=1` phải khoá');
    // GD4 · 25/09: `thieu` là câu người vận hành đọc; tên biến sang `thieuKyThuat`.
    assert.ok(t.thieuKyThuat.some((x) => /V3_BOT_KHOA/.test(x)));

    don(); process.env.V3_BOT_GHI = '0';
    assert.equal(cau.trangThaiCau().mo, false, 'cờ cũ đặt `0` vẫn phải được tôn trọng');

    don(); process.env.PANCAKE_READONLY = '1';
    t = cau.trangThaiCau();
    assert.equal(t.mo, false, 'PANCAKE_READONLY=1 phải thắng mọi thứ — máy dev không chạm bot thật');
    assert.ok(t.thieuKyThuat.some((x) => /PANCAKE_READONLY/.test(x)));
    assert.ok(t.thieu.some((x) => /CHỈ ĐỌC/.test(x)), 'và câu trên màn phải nói được bằng lời thường');

    // CR-02-10 · MB1: lõi nằm TRONG tiến trình — không còn tài khoản nào phải có để «gọi sang».
    don(); delete process.env.ADMIN_USER; delete process.env.ADMIN_PASS;
    assert.equal(cau.trangThaiCau().mo, true, 'thiếu ADMIN_USER/PASS không còn là lý do đóng cửa ghi');
  } finally {
    for (const [k, v] of [['V3_BOT_GHI', cu.g], ['V3_BOT_KHOA', cu.k],
      ['PANCAKE_READONLY', cu.r], ['ADMIN_USER', cu.u], ['ADMIN_PASS', cu.p]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

test('cầu bot · vì sao đóng phải nói được bằng tiếng người, không phải một cờ trần', () => {
  // Phải TỰ KHOÁ rồi mới hỏi lý do. Bản trước chỉ `delete V3_BOT_GHI` và tin là cửa sẽ
  // đóng — đúng ở máy dev (có PANCAKE_READONLY=1), sai ở máy chủ. Cùng chỗ che đã gặp ở
  // bài ngay trên.
  const cu = { k: process.env.V3_BOT_KHOA, r: process.env.PANCAKE_READONLY };
  try {
    process.env.V3_BOT_KHOA = '1';
    process.env.PANCAKE_READONLY = '1';
    const t = cau.trangThaiCau();
    assert.equal(t.mo, false, 'đã khoá hai đường mà vẫn mở thì phép khoá hỏng');
    assert.ok(t.thieu.length > 0);
    for (const câu of t.thieu) {
      assert.ok(câu.length > 30, `lý do "${câu}" quá ngắn để ai đó biết phải làm gì tiếp`);
    }
  } finally {
    for (const [k, v] of [['V3_BOT_KHOA', cu.k], ['PANCAKE_READONLY', cu.r]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
});

/* Mục «GIAO PAGE SANG BOT MỚI» (024 · 25/09) đã gỡ 02/10 — CR-02-10 · MB2: một bản, một công tắc. */
