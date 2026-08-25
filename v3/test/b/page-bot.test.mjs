// MÀN «PAGE & BOT» (G2-B2) — ba cột ba chủ sở hữu, và cây cầu sang tiến trình bot.
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

function dungKho(themPage = null) {
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
  kp.datTaoTruyVan(taoTruyVan);
  ct.datPheuNhatKy((bc, ban) => { nhatKy.push({ bc, ban }); return { id: 'nk' + nhatKy.length }; });
  return { kho, nhatKy };
}

const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});
const bcQuanLy = () => taoBoiCanh({
  nguoiDungId: 'u2', tenDangNhap: 'ql@talpha.vn', teamId: 't1', vai: [VAI.QUAN_LY],
});

/** Bật cửa ghi sang bot cho một đoạn test, rồi trả lại nguyên trạng. */
async function voiCuaMo(fn, { batBot = true } = {}) {
  const cu = {
    ghi: process.env.V3_BOT_GHI, ro: process.env.PANCAKE_READONLY,
    u: process.env.ADMIN_USER, p: process.env.ADMIN_PASS, goc: process.env.V3_BOT_V1_GOC,
  };
  const goi = [];
  const fetchCu = globalThis.fetch;
  globalThis.fetch = async (url, opt) => {
    goi.push({ url: String(url), opt });
    return new Response(JSON.stringify({ ok: true, aiEnabled: batBot }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  };
  process.env.V3_BOT_GHI = '1';
  delete process.env.PANCAKE_READONLY;
  process.env.ADMIN_USER = 'u'; process.env.ADMIN_PASS = 'p';
  process.env.V3_BOT_V1_GOC = 'http://bot.thu';
  try { return await fn(goi); } finally {
    globalThis.fetch = fetchCu;
    for (const [k, v] of [['V3_BOT_GHI', cu.ghi], ['PANCAKE_READONLY', cu.ro],
      ['ADMIN_USER', cu.u], ['ADMIN_PASS', cu.p], ['V3_BOT_V1_GOC', cu.goc]]) {
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

  // Hai khẳng định là LÝ DO của cả màn này:
  assert.ok(cotThat.has('marketer'), 'marketer VẪN bị di trú ghi đè → PHIEU-B-Y4 còn hiệu lực');
  assert.ok(!cotThat.has('trong_diem'), 'trong_diem KHÔNG được nằm trong câu ghi đè');
});

test('COT_SUA_DUOC · cột nào bền, cột nào không — khớp với thực tế trên', () => {
  assert.equal(kp.COT_SUA_DUOC.marketer.benVung, false);
  assert.equal(kp.COT_SUA_DUOC.trong_diem.benVung, true);
  assert.ok(kp.COT_SUA_DUOC.marketer.vi, 'cột không bền phải nói VÌ SAO không bền');
  // Và cảnh báo phải tới được người dùng, không nằm im trong mã nguồn.
  assert.match(ct.CANH_BAO_MARKETER, /di-tru|di trú/i);
  assert.match(ct.CANH_BAO_MARKETER, /PHIEU-B-Y4/);
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

/* ═══════════ công tắc BOT AI — đi qua cầu, KHÔNG ghi thẳng cột ═══════════ */

test('công tắc bot · cửa ghi ĐÓNG thì từ chối, và nói rõ thiếu gì', async () => {
  dungKho();
  const cu = process.env.V3_BOT_GHI;
  delete process.env.V3_BOT_GHI;
  try {
    await assert.rejects(() => ct.datCongTacBot(bcQt(), 'p1', false), (e) => {
      assert.equal(e.ma, 'cua_ghi_dong');
      assert.match(e.message, /V3_BOT_GHI/);
      return true;
    });
  } finally { if (cu === undefined) delete process.env.V3_BOT_GHI; else process.env.V3_BOT_GHI = cu; }
});

test('công tắc bot · gọi SANG TIẾN TRÌNH BOT bằng id Facebook, không phải id CSDL', async () => {
  const { kho, nhatKy } = dungKho();
  await voiCuaMo(async (goi) => {
    const kq = await ct.datCongTacBot(bcQt(), 'p2', true);
    assert.equal(goi.length, 1, 'phải gọi đúng một lần sang bot');
    // Đây là chỗ dễ sai nhất: `p2` là khoá chính CSDL, `222` là id Facebook mà bot hiểu.
    assert.match(goi[0].url, /\/admin\/api\/pages\/222\/ai$/);
    assert.equal(JSON.parse(goi[0].opt.body).on, true);
    assert.equal(kq.botAiBat, true);
  });

  // Cột trong CSDL được chép lại theo kết quả THẬT bot trả về — cột là bản sao, không phải nguồn.
  assert.equal(kho.docThang('page').find((p) => p.id === 'p2').bot_ai_bat, true);
  assert.equal(nhatKy.at(-1).ban.hanhDong, ct.HANH_DONG_BOT);
  assert.deepEqual(nhatKy.at(-1).ban.truoc, { bot_ai_bat: false });
  assert.deepEqual(nhatKy.at(-1).ban.sau, { bot_ai_bat: true });
});

test('công tắc bot · bot trả kết quả KHÁC yêu cầu thì tin BOT, không tin tham số', async () => {
  // Nếu bot vì cớ gì đó không bật được, cột phải nói đúng sự thật của bot. Ghi theo tham số
  // gửi đi là cách màn hình bắt đầu nói dối một cách có hệ thống.
  const { kho } = dungKho();
  await voiCuaMo(async () => {
    const kq = await ct.datCongTacBot(bcQt(), 'p2', true);
    assert.equal(kq.botAiBat, false, 'bot bảo vẫn tắt → kết quả phải là tắt');
  }, { batBot: false });
  assert.equal(kho.docThang('page').find((p) => p.id === 'p2').bot_ai_bat, false);
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

test('ganMarketer · ghi được, có nhật ký, và TRẢ KÈM cảnh báo di trú', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await ct.ganMarketer(bcQt(), 'p1', '  Ngọc  ');
  assert.equal(kq.marketer, 'Ngọc', 'phải cắt khoảng trắng hai đầu');
  assert.ok(kq.canhBao, 'gán xong phải kèm cảnh báo — người gán 514 page xứng đáng biết trước');
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

test('cầu bot · MẶC ĐỊNH ĐÓNG, và PANCAKE_READONLY=1 vẫn đóng dù đã bật cờ', async () => {
  const cu = { g: process.env.V3_BOT_GHI, r: process.env.PANCAKE_READONLY };
  try {
    delete process.env.V3_BOT_GHI; delete process.env.PANCAKE_READONLY;
    assert.equal(cau.trangThaiCau().mo, false, 'không đặt gì thì phải ĐÓNG');

    // Hai điều kiện, thiếu một là đóng — cùng quy ước với V3_PANCAKE_GUI của người A.
    process.env.V3_BOT_GHI = '1';
    process.env.ADMIN_USER = 'u'; process.env.ADMIN_PASS = 'p';
    process.env.PANCAKE_READONLY = '1';
    const t = cau.trangThaiCau();
    assert.equal(t.mo, false, 'PANCAKE_READONLY=1 phải thắng cờ V3_BOT_GHI');
    assert.ok(t.thieu.some((x) => /PANCAKE_READONLY/.test(x)));
  } finally {
    for (const [k, v] of [['V3_BOT_GHI', cu.g], ['PANCAKE_READONLY', cu.r]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    delete process.env.ADMIN_USER; delete process.env.ADMIN_PASS;
  }
});

test('cầu bot · vì sao đóng phải nói được bằng tiếng người, không phải một cờ trần', () => {
  delete process.env.V3_BOT_GHI;
  const t = cau.trangThaiCau();
  assert.ok(t.thieu.length > 0);
  for (const câu of t.thieu) {
    assert.ok(câu.length > 30, `lý do "${câu}" quá ngắn để ai đó biết phải làm gì tiếp`);
  }
});
