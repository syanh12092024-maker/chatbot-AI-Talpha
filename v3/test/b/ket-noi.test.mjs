// MÀN «KẾT NỐI & TOKEN» (G2-B4) — kho token toàn hệ, và luật «không bao giờ lộ token».
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kn = await import('../../src/ui/ket-noi/kho-ket-noi.js');
const rt = await import('../../src/ui/ket-noi/router.js');

const NGAY = 86400000;
const BAY = 1756080000000; // mốc cố định — `Date.now()` trong test làm bài test tự đổi kết quả

const bcQt = () => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI],
});

/** Giả lập tiến trình bot v1 trả về danh sách token. */
async function voiBot(ds, fn, { hong = null } = {}) {
  const cu = { u: process.env.ADMIN_USER, p: process.env.ADMIN_PASS, g: process.env.V3_BOT_V1_GOC };
  const fetchCu = globalThis.fetch;
  process.env.ADMIN_USER = 'u'; process.env.ADMIN_PASS = 'p';
  process.env.V3_BOT_V1_GOC = 'http://bot.thu';
  globalThis.fetch = async () => {
    if (hong) throw new Error(hong);
    return new Response(JSON.stringify(ds), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try { return await fn(); } finally {
    globalThis.fetch = fetchCu;
    for (const [k, v] of [['ADMIN_USER', cu.u], ['ADMIN_PASS', cu.p], ['V3_BOT_V1_GOC', cu.g]]) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
  }
}

/**
 * Token ở hình dạng THÔ của v1 (`listPancakeTokens`) — dùng cho `voiBot`, vì `danhSachToken`
 * là chỗ ánh xạ sang tên tiếng Việt.
 */
const tok = (i, o = {}) => ({
  name: o.name || `TK ${i}`, exp: o.exp === undefined ? BAY + 90 * NGAY : o.exp,
  expired: !!o.expired, source: o.source || (i === 0 ? 'chính (.env)' : 'dashboard'),
  removable: o.removable !== undefined ? o.removable : i > 0,
  pagesRouted: o.pagesRouted || 0, tail: o.tail || `xxxx${i}`,
});

/**
 * Token ở hình dạng ĐÃ ÁNH XẠ — `sucKhoeToken`/`canhBaoKhoToken` ăn bản này, không ăn bản thô.
 *
 * Hai hình dạng cho cùng một thứ là chỗ dễ nhầm, và lần đầu viết bài test này tôi đã nhầm:
 * đưa bản thô vào `canhBaoKhoToken` thì `soPageDangDung` thành `undefined`, mà `undefined === 0`
 * là sai, nên cảnh báo «token chính không phủ page nào» im lặng không bắn. Giữ hai helper
 * tách bạch để lần sau không nhầm lại.
 */
const tokAx = (i, o = {}) => ({
  ten: o.name || `TK ${i}`, het: o.exp === undefined ? BAY + 90 * NGAY : o.exp,
  daHet: !!o.expired, nguon: o.source || (i === 0 ? 'chính (.env)' : 'dashboard'),
  boDuoc: o.removable !== undefined ? o.removable : i > 0,
  soPageDangDung: o.pagesRouted || 0, duoi: o.tail || `xxxx${i}`,
});

/* ═══════════ màn này là TOÀN HỆ — và phải nói ra ═══════════ */

test('LA_TOAN_HE · nói thẳng đây không phải dữ liệu của team đang mở', () => {
  // Mọi màn khác của v3 đều theo team, nên người dùng có nếp nghĩ «cái tôi thấy là của team
  // tôi». Ở màn này nếp đó SAI, và cái sai đó không có triệu chứng nào cho tới lúc một quản
  // trị của team khác bỏ mất token mà cả ba team đang dùng.
  assert.match(kn.LA_TOAN_HE, /MỌI team|mọi team/);
  assert.match(kn.LA_TOAN_HE, /không phải dữ liệu của/i);
  assert.ok(kn.LA_TOAN_HE.length > 100, 'câu cảnh báo phải đủ dài để nói được lý do');
});

test('vai vào được · CHỈ quan-tri — hẹp hơn hai màn quản trị kia', async () => {
  assert.deepEqual([...rt.VAI_VAO_DUOC], [VAI.QUAN_TRI]);
  const team = await import('../../src/ui/team/router.js');
  const pb = await import('../../src/ui/page-bot/router.js');
  // Hai màn kia cho `quan-ly` vào xem; màn này thì không, vì nó là hạ tầng dùng chung.
  assert.ok(team.VAI_VAO_DUOC.includes(VAI.QUAN_LY));
  assert.ok(pb.VAI_VAO_DUOC.includes(VAI.QUAN_LY));
  assert.ok(!rt.VAI_VAO_DUOC.includes(VAI.QUAN_LY));
});

/* ═══════════ sức khoẻ token ═══════════ */

test('sucKhoeToken · bốn mức, và ngưỡng nằm ở ĐÚNG MỘT chỗ', () => {
  assert.equal(kn.sucKhoeToken({ daHet: true, het: BAY - NGAY }, BAY).muc, 'do');
  assert.equal(kn.sucKhoeToken({ daHet: false, het: 0 }, BAY).muc, 'xam');
  assert.equal(kn.sucKhoeToken({ daHet: false, het: BAY + 3 * NGAY }, BAY).muc, 'vang');
  assert.equal(kn.sucKhoeToken({ daHet: false, het: BAY + 60 * NGAY }, BAY).muc, 'xanh');
  // Ngay tại ngưỡng vẫn phải là cảnh báo, không phải "còn xanh".
  assert.equal(kn.sucKhoeToken({ daHet: false, het: BAY + kn.NGUONG_SAP_HET_NGAY * NGAY }, BAY).muc, 'vang');
});

test('canhBaoKhoToken · kho rỗng và kho chết hết là HAI câu khác nhau', () => {
  const rong = kn.canhBaoKhoToken([], BAY);
  assert.equal(rong[0].ma, 'khong_co_token');

  const chet = kn.canhBaoKhoToken([{ ...tokAx(0), daHet: true }, { ...tokAx(1), daHet: true }], BAY);
  assert.equal(chet[0].ma, 'chet_het');
  assert.match(chet[0].chu, /2 token/, 'phải nói rõ bao nhiêu token, không nói chung chung');
  // «Không có token nào» và «có token nhưng chết hết» dẫn tới hai việc phải làm khác nhau.
  assert.notEqual(rong[0].ma, chet[0].ma);
});

test('canhBaoKhoToken · một token sống = KHÔNG có dự phòng, phải kêu', () => {
  const c = kn.canhBaoKhoToken([tokAx(0, { pagesRouted: 5 })], BAY);
  assert.ok(c.some((x) => x.ma === 'khong_du_phong'));
  // Hai token sống thì thôi kêu — cảnh báo lúc nào cũng kêu là cảnh báo không ai đọc.
  const hai = kn.canhBaoKhoToken([tokAx(0, { pagesRouted: 5 }), tokAx(1, { pagesRouted: 2 })], BAY);
  assert.ok(!hai.some((x) => x.ma === 'khong_du_phong'));
});

test('canhBaoKhoToken · token CHÍNH không phủ page nào = thứ tự dự phòng đặt sai', () => {
  // Sổ kho token: «token chính phải phủ nhiều page bật AI nhất». Token chính phủ 0 page mà
  // token phụ phủ 40 thì thứ tự đang ngược, và không có gì trên bảng tự nói ra điều đó.
  const c = kn.canhBaoKhoToken([
    tokAx(0, { pagesRouted: 0 }),
    tokAx(1, { pagesRouted: 40 }),
  ], BAY);
  const x = c.find((y) => y.ma === 'chinh_khong_phu');
  assert.ok(x);
  assert.equal(x.muc, 'do', 'phủ ĐÚNG 0 là nặng nhất — token chính coi như vô dụng');
});

test('canhBaoKhoToken · SỐ THẬT 25/08: chính phủ 16, phụ phủ 109 → vẫn phải kêu', () => {
  // Đây là ca đo được TRÊN MÁY CHỦ THẬT, và là lý do luật này phải nới.
  // Bản đầu chỉ bắn khi token chính phủ ĐÚNG 0 page, nên với 16 nó im — trong khi thứ tự
  // đang ngược hẳn. Bài test đơn vị không bắt được; chỉ có số thật mới lộ ra.
  const c = kn.canhBaoKhoToken([
    tokAx(0, { name: 'Hồ Sỹ Aanh', pagesRouted: 16 }),
    tokAx(1, { name: 'CHÍNH 1', pagesRouted: 109 }),
    tokAx(2, { name: 'Chu Thuý', pagesRouted: 46 }),
    tokAx(3, { name: 'N. Thế', pagesRouted: 32 }),
    tokAx(4, { name: 'Thơ Nyây', pagesRouted: 0 }),
    tokAx(5, { name: 'Sỹ Anh Leader', pagesRouted: 0 }),
  ], BAY);
  const x = c.find((y) => y.ma === 'chinh_khong_phu');
  assert.ok(x, 'chính phủ 16 mà phụ phủ 109 thì PHẢI kêu');
  assert.equal(x.muc, 'vang', 'có phủ chút ít thì là cảnh vàng, không phải đỏ');
  // Câu cảnh báo phải nói được số, không nói chung chung — người đọc cần biết đổi có đáng không.
  assert.match(x.chu, /16 page/);
  assert.match(x.chu, /109 page/);
  assert.match(x.chu, /93 page/, 'phải tính ra phần chênh để người đọc thấy giá phải trả');
});

test('canhBaoKhoToken · token chính ĐÃ phủ nhiều nhất thì IM, kể cả khi có token phủ 0', () => {
  const c = kn.canhBaoKhoToken([
    tokAx(0, { pagesRouted: 109 }),
    tokAx(1, { pagesRouted: 16 }),
    tokAx(2, { pagesRouted: 0 }),
  ], BAY);
  assert.ok(!c.some((y) => y.ma === 'chinh_khong_phu'), 'thứ tự đúng thì không được kêu');
});

test('canhBaoKhoToken · kho khoẻ thì IM', () => {
  const c = kn.canhBaoKhoToken([
    tokAx(0, { pagesRouted: 40 }),
    tokAx(1, { pagesRouted: 12 }),
  ], BAY);
  assert.deepEqual(c, []);
});

/* ═══════════ kho token CSDL (migration 019) ═══════════
 *
 * Từ 17/09 nguồn CHÍNH của màn là bảng `token_pancake`, không phải tiến trình bot. Hai
 * bài cũ «thiếu ADMIN_USER» và «bot không chạy» vì thế đổi nghĩa: chúng KHÔNG còn là lý do
 * màn trống, mà chỉ là lý do thiếu phần «token này phủ mấy page».
 */

/** JWT giả — chỉ phần payload là thật, đủ để `docJwt` đọc tên/hạn. */
function jwtGia({ name = 'TK env', exp = Math.floor((BAY + 90 * NGAY) / 1000), uid = 'u9' } = {}) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256' })}.${b64({ name, exp, uid })}.chuky`;
}

/** Khoá cứng hai biến token trong `.env` — nếu không, bài test đọc token THẬT của máy. */
async function voiEnvToken({ chinh = '', phu = '' }, fn) {
  const cu = { c: process.env.PANCAKE_TOKEN, p: process.env.PANCAKE_TOKENS_EXTRA };
  if (chinh) process.env.PANCAKE_TOKEN = chinh; else delete process.env.PANCAKE_TOKEN;
  if (phu) process.env.PANCAKE_TOKENS_EXTRA = phu; else delete process.env.PANCAKE_TOKENS_EXTRA;
  try { return await fn(); } finally {
    if (cu.c === undefined) delete process.env.PANCAKE_TOKEN; else process.env.PANCAKE_TOKEN = cu.c;
    if (cu.p === undefined) delete process.env.PANCAKE_TOKENS_EXTRA; else process.env.PANCAKE_TOKENS_EXTRA = cu.p;
  }
}

/** Kho token CSDL giả. Trả luôn cái mảng để bài test soi cái gì đã được ghi. */
function khoGia(banDau = []) {
  const kho = [...banDau];
  kn.datKhoTokenV3({
    ds: async () => kho.map((t, i) => ({
      id: String(i + 1), ten: t.ten, uid: '', duoi: t.duoi || `dddd${i}`,
      hetHan: t.hetHan === undefined ? BAY + 90 * NGAY : t.hetHan,
      hetHanRoi: !!t.hetHanRoi, bat: t.bat !== false, themBoi: null, taoLuc: BAY, nguon: 'CSDL (v3)',
    })),
    them: async ({ token, nguoiDungId }) => {
      kho.push({ ten: 'TK mới', duoi: String(token).slice(-8), nguoiDungId });
      return { id: String(kho.length), ten: 'TK mới', duoi: String(token).slice(-8), hetHan: BAY + 90 * NGAY };
    },
    bo: async (id) => {
      const t = kho.splice(Number(id) - 1, 1)[0];
      return { id: String(id), ten: t?.ten || '?', duoi: t?.duoi || '', hetHan: 0 };
    },
  });
  return kho;
}

test('khoToken · thứ tự dự phòng: `.env` trước, CSDL sau', async () => {
  // Thứ tự là NỘI DUNG, không phải cách sắp cho đẹp: `src/pancake.js#allToks` ghép đúng
  // dãy này, nên màn sắp khác đi là nói dối về việc token nào được dùng trước.
  khoGia([{ ten: 'Trong CSDL' }]);
  await voiEnvToken({ chinh: jwtGia({ name: 'Chính env' }) }, async () => {
    await voiBot([], async () => {
      const d = await kn.khoToken();
      assert.deepEqual(d.token.map((t) => t.ten), ['Chính env', 'Trong CSDL']);
      // GD4 · 24/09: nhãn nguồn nay dịch sang lời người vận hành ở tầng màn (`tenNguon`),
      // nhãn gốc của người A giữ nguyên bên `src/`. Ca này vẫn canh THỨ TỰ — thứ tự là nội dung.
      assert.deepEqual(d.token.map((t) => t.nguon), ['cấu hình máy chủ · chính', 'thêm từ màn này']);
      assert.deepEqual(d.token.map((t) => t.boDuoc), [false, true], 'token .env chỉ xem, token CSDL bỏ được');
    });
  });
  kn.datKhoTokenV3(null);
});

test('khoToken · bot KHÔNG chạy: màn VẪN đủ dùng, chỉ khai rõ thiếu phần phủ page', async () => {
  // Trước 17/09 đây là màn trống. Cả kho token nằm trong tiến trình bot nên bot chết là
  // mất màn — đúng lúc người ta cần nó nhất.
  khoGia([{ ten: 'Trong CSDL' }]);
  await voiEnvToken({}, async () => {
    await voiBot([], async () => {
      const d = await kn.khoToken();
      assert.equal(d.token.length, 1);
      assert.equal(d.trong, null, 'có token thì KHÔNG hiện màn rỗng');
      assert.match(String(d.botIm), /ECONNREFUSED|bot/i);
    }, { hong: 'ECONNREFUSED' });
  });
  kn.datKhoTokenV3(null);
});

test('khoToken · thiếu ADMIN_USER/PASS không còn là lý do trống màn', async () => {
  khoGia([{ ten: 'Trong CSDL' }]);
  const cu = { u: process.env.ADMIN_USER, p: process.env.ADMIN_PASS };
  delete process.env.ADMIN_USER; delete process.env.ADMIN_PASS;
  try {
    await voiEnvToken({}, async () => {
      const d = await kn.khoToken();
      assert.equal(d.token.length, 1);
      // GD4 · 24/09: mặt màn nói bằng lời người vận hành, nguyên nhân bằng tên biến dời sang
      // trường riêng (màn đưa xuống ô «Nguồn số»). Vẫn phải NÓI RA, chỉ đổi chỗ đứng.
      assert.match(String(d.botIm), /tài khoản quản trị/i, 'câu trên màn phải đọc hiểu được');
      assert.match(String(d.botImKyThuat), /ADMIN_USER/, 'người sửa máy chủ vẫn cần tên biến');
    });
  } finally {
    if (cu.u === undefined) delete process.env.ADMIN_USER; else process.env.ADMIN_USER = cu.u;
    if (cu.p === undefined) delete process.env.ADMIN_PASS; else process.env.ADMIN_PASS = cu.p;
    kn.datKhoTokenV3(null);
  }
});

test('khoToken · CHƯA NỐI kho CSDL thì nói là lỗi dựng ứng dụng, không nói «chưa có token»', async () => {
  kn.datKhoTokenV3(null);
  const d = await kn.khoToken();
  assert.equal(d.quanLyDuoc, false);
  assert.match(d.trong.noi, /chưa nối kho token/i);
  assert.match(d.trong.noi, /KHÔNG phải/);
});

test('khoToken · kho rỗng thật thì chỉ đường thêm token', async () => {
  khoGia([]);
  await voiEnvToken({}, async () => {
    await voiBot([], async () => {
      const d = await kn.khoToken();
      assert.equal(d.trong.vi, 'chua_cai_dat');
      assert.ok(d.trong.diTiep);
      assert.match(d.trong.noi, /không đọc và không gửi được/i);
    });
  });
  kn.datKhoTokenV3(null);
});

test('khoToken · KHÔNG có trường nào mang token đầy đủ, kể cả token `.env`', async () => {
  khoGia([{ ten: 'Trong CSDL' }]);
  const jwt = jwtGia({ name: 'Chính env' });
  await voiEnvToken({ chinh: jwt }, async () => {
    await voiBot([], async () => {
      const d = await kn.khoToken();
      const chu = JSON.stringify(d);
      assert.ok(!chu.includes(jwt), 'token .env KHÔNG được ra màn');
      for (const cam of ['access_token', 'token_ma']) assert.ok(!chu.includes(cam));
      assert.ok(d.token.every((t) => String(t.duoi).length <= 8));
    });
  });
  kn.datKhoTokenV3(null);
});

/* ═══════════ đọc kho ═══════════ */






/* ═══════════ kết nối POS — phần DUY NHẤT có lớp team ═══════════ */

test('ketNoiPosCua · chưa nối bộ đọc thì báo lỗi cấu hình, không báo «không có kết nối»', async () => {
  kn.datDocKetNoiPos(null);
  const d = await kn.ketNoiPosCua(bcQt());
  assert.equal(d.trong.vi, 'chua_cai_dat');
  assert.match(d.trong.noi, /chưa nối bộ đọc/i);
});

test('ketNoiPosCua · đọc theo team, và không mang khoá', async () => {
  let bcNhan = null;
  kn.datDocKetNoiPos(async (bc) => {
    bcNhan = bc;
    return [{ id: '1', market: 'Saudi', shopId: '77', bat: true }];
  });
  const d = await kn.ketNoiPosCua(bcQt());
  assert.equal(bcNhan.teamId, 't1', 'bộ đọc phải nhận đúng bối cảnh team');
  assert.equal(d.pos.length, 1);
  const chu = JSON.stringify(d.pos).toLowerCase();
  for (const cam of ['api_key', 'apikey', 'khoa', 'secret']) {
    assert.ok(!chu.includes(cam), `kết nối POS KHÔNG được mang "${cam}"`);
  }
});

test('ketNoiPosCua · thiếu bối cảnh thì NÉM', async () => {
  kn.datDocKetNoiPos(async () => []);
  await assert.rejects(() => kn.ketNoiPosCua(null), /bối cảnh|teamId/i);
});
