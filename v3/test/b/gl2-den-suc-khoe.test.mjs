// PHIẾU GL2 ④5 (+ ④4 phía màn) — ĐÈN Sức khoẻ và CỬA BẬT khi trần page bật bot TOÀN HỆ bị vượt.
//
// Người quyết 05/10: «vượt trần = worker DỪNG hẳn + ĐÈN ĐỎ». Review (a) C2: trần là TOÀN HỆ còn cổng truy vấn của màn KẸP
// TEAM ⇒ đèn phải đếm toàn hệ (hai page ở hai team ⇒ đèn đỏ ở CẢ HAI team), và đèn «Máy chạy bot» không được dẫn người đi
// khởi động lại máy vì một lý do cấu hình. C1: nguồn page của màn (`dsPageBotTraLoi`) KHÔNG bị chặn — màn vẫn thấy page bật.
// CHUỖI THẬT trên hộp cát Postgres: cổng `taoTruyVanThat` (kẹp team) + bộ đọc cửa kiểm `noiVanHanhV3` (đúng thứ
// `v3/chay-that.js:170,299` tiêm) + nhịp `src/queue/kho.js#nhipMayBot`. Không gọi mạng; env truyền vào, không sửa `.env`.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungSandbox } = await import('../../../db/sandbox.js');
const { nhipMayBot, xepTin } = await import('../../../src/queue/kho.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const { noiVanHanhV3 } = await import('../../src/noi-day/van-hanh-v3.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const sk = await import('../../src/ui/suc-khoe/kho-suc-khoe.js');
const nhip = await import('../../src/ui/chung/nhip-may-bot.js');
const kp = await import('../../src/ui/page-bot/kho-page.js');
const ct = await import('../../src/ui/page-bot/cong-tac.js');

const ENV_MO = { V3_PANCAKE_GUI: '1', PANCAKE_READONLY: '0', V3_RAP_PROMPT_BAT: '1', ANTHROPIC_API_KEY: 'fake-only' };
const envTran = (tran) => (tran === undefined ? { ...ENV_MO } : { ...ENV_MO, V3_TRAN_PAGE_BAT: tran });

let sb; let pool; let X; let Y; let ND; const ID = {};
const PID = { A: '974000000001', B: '974000000002' };

before(async () => {
  sb = await dungSandbox('gl2_den');
  pool = sb.pool;
  X = String((await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id);
  Y = String((await pool.query("INSERT INTO team (slug, ten) VALUES ('gl2-den-y','GL2 Y') RETURNING id")).rows[0].id);
  ND = String((await pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl2den@thu.vn','GL2') RETURNING id")).rows[0].id);
  for (const [k, team] of [['A', X], ['B', Y]]) {
    ID[k] = String((await pool.query('INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id', [team, PID[k], `GL2 page ${k}`])).rows[0].id);
    const sp = (await pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [team, ID[k], `gl2den-${k}`])).rows[0].id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  }
  // Tin của khách page A đã chờ 3 phút, chưa tin nào xử xong ⇒ luật nhịp (`nhip-may-bot.js`) nói «máy đang đứng».
  const t = await xepTin(pool, { teamId: X, pageId: PID.A, psid: 'gl2-den', convId: 'gl2-den-c', msgId: 'gl2-den-m1', noiDung: 'hi' });
  await pool.query("UPDATE tin_cho_xu_ly SET thoi_diem = now() - interval '3 minutes' WHERE id=$1", [t.id]);
});
after(async () => { if (sb) await sb.don(); });

const bcQt = (team) => taoBoiCanh({ nguoiDungId: ND, tenDangNhap: 'qt@gl2.vn', teamId: team, vai: [VAI.QUAN_TRI] });
const datCot = async (...dsBat) => pool.query('UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))', [dsBat.map((k) => PID[k])]);
const cot = async (k) => (await pool.query('SELECT bot_ai_bat FROM page WHERE id=$1', [ID[k]])).rows[0].bot_ai_bat;

/** Nối màn Sức khoẻ bằng ĐÚNG các bộ đọc tiến trình giao diện thật dùng. */
function noiMan(env) {
  // Bảng sẵn sàng cũ (`readiness.js`) trả MỌI page với `aiEnabled:false` — dựng đúng hình đó để phép đếm toàn hệ không
  // được đếm nhầm dòng cũ (đột biến «đếm mọi dòng» phải đỏ).
  const docSanSang = noiVanHanhV3(pool, env, {
    docLegacy: async () => ({ pages: [PID.A, PID.B, '974000000099'].map((pageId) => ({ pageId, aiEnabled: false })) }),
  });
  sk.datTaoTruyVan((bc) => taoTruyVanThat(pool, bc));
  sk.datDocKhoToken(null);
  sk.datTrangThaiCauBot(null);
  sk.datDocSanSang(docSanSang);
  nhip.datDocNhip((bc) => nhipMayBot(pool, { teamId: bc?.teamId ?? null }));
  nhip.xoaNhoNhip();
  return docSanSang;
}
const lay = (b, ma) => b.den.find((d) => d.ma === ma);

test('GL2 D5a · vượt trần (A team X + B team Y, trần 1) ⇒ đèn «Page đang bật bot» ĐỎ ở CẢ HAI team, nói «DỪNG vì vượt trần» có số đo', async () => {
  await datCot('A', 'B');
  const env = envTran('1');
  noiMan(env);
  for (const [team, cuaMinh] of [[X, 'GL2 page A'], [Y, 'GL2 page B']]) {
    const b = await sk.bangDen(bcQt(team), { env });
    const d = lay(b, 'bot_bat');
    assert.equal(d.muc, sk.MUC.DO, `team ${team}: đèn phải ĐỎ khi toàn hệ vượt trần — đo: ${d.muc} · ${d.vi}`);
    assert.match(d.vi, /DỪNG vì vượt trần/);
    assert.match(d.vi, /đang bật 2\/1 page/);
    assert.match(d.vi, /V3_TRAN_PAGE_BAT=1/);
    assert.ok(d.vi.includes(cuaMinh), `phải nói page CỦA TEAM NÀY đang bật để biết tắt ở đâu: ${d.vi}`);
    assert.match(d.vi, /1 page bật ở team khác/);
    assert.equal(d.diTiep?.duong, '/page-bot');
    assert.equal(b.tongThe, sk.MUC.DO);
  }
});

test('GL2 D5b · khi vượt, đèn «Máy chạy bot» KHÔNG nói «máy đứng» (hàng đợi đang có tin chờ 3′) — nói «dừng vì vượt trần», không đỏ', async () => {
  await datCot('A', 'B');
  const env = envTran('1');
  noiMan(env);
  const goc = await nhip.docNhipMayBot({ boiCanh: bcQt(X) });
  assert.equal(goc.muc, nhip.MUC.DO, `tiền đề: luật nhịp tự nó nói «đứng» — đo: ${goc.cau}`);
  nhip.xoaNhoNhip();
  const d = lay(await sk.bangDen(bcQt(X), { env }), 'may_chay_bot');
  assert.doesNotMatch(d.vi, /đang đứng|khởi động lại máy|tắt giữa chừng/i, `dẫn người đi khởi động lại vô ích: ${d.vi}`);
  assert.match(d.vi, /dừng vì vượt trần/i);
  assert.notEqual(d.muc, sk.MUC.DO, 'đèn ĐỎ là đèn «Page đang bật bot» — máy không hỏng');
  assert.equal(d.diTiep?.duong, '/page-bot');
});

test('GL2 D5c · trong trần (chỉ A bật, trần 1) ⇒ đèn xanh như cũ + hiện trần; «Máy chạy bot» theo số đo hàng đợi (đứng thật)', async () => {
  await datCot('A');
  const env = envTran('1');
  noiMan(env);
  const b = await sk.bangDen(bcQt(X), { env });
  const d = lay(b, 'bot_bat');
  assert.equal(d.muc, sk.MUC.XANH, d.vi);
  assert.match(d.vi, /V3_TRAN_PAGE_BAT=1/);
  assert.match(d.vi, /1\/1 page/);
  const m = lay(b, 'may_chay_bot');
  assert.equal(m.muc, sk.MUC.DO, 'trong trần thì «máy đứng» là thật — không được che');
  assert.match(m.vi, /đang đứng/);
  const dY = lay(await sk.bangDen(bcQt(Y), { env }), 'bot_bat');
  assert.equal(dY.muc, sk.MUC.VANG, 'team Y không page nào bật — như cũ');
});

test('GL2 D5e · page KHÔNG có id Facebook (`page_id = \'\'`, dư từ di trú) bật trong team: worker không đếm ⇒ đèn cũng không', async () => {
  await datCot('A');
  const r = (await pool.query("INSERT INTO page (team_id, page_id, ten, bot_ai_bat) VALUES ($1,'','GL2 rỗng',true) RETURNING id", [X])).rows[0];
  try {
    const env = envTran('1');
    noiMan(env);
    const d = lay(await sk.bangDen(bcQt(X), { env }), 'bot_bat');
    assert.equal(d.muc, sk.MUC.XANH, `worker đếm 1/1 (trong trần) mà đèn nói vượt: ${d.vi}`);
  } finally { await pool.query('DELETE FROM page WHERE id=$1', [r.id]); }
});

test('GL2 D5d · vắng biến, 0 page bật ⇒ đèn hiện «0 — chưa đặt»', async () => {
  await datCot();
  const env = envTran(undefined);
  noiMan(env);
  const d = lay(await sk.bangDen(bcQt(X), { env }), 'bot_bat');
  assert.equal(d.muc, sk.MUC.VANG);
  assert.match(d.vi, /V3_TRAN_PAGE_BAT=0 — chưa đặt/);
});

test('GL2 C5e · cửa bật qua công tắc (datCongTacBot → noiVanHanhV3 → setPage): vượt ⇒ 409 có số đo, cột không đổi; trong trần ⇒ thành', async () => {
  await datCot('A');
  const env = envTran('1');
  noiMan(env);
  kp.datTaoTruyVan((bc) => taoTruyVanThat(pool, bc));
  const nhatKy = [];
  ct.datPheuNhatKy((bc, ban) => { nhatKy.push(ban); return { id: `nk${nhatKy.length}` }; });
  ct.xoaDemBat();
  const cu = { k: process.env.V3_BOT_KHOA, g: process.env.V3_BOT_GHI };
  delete process.env.V3_BOT_KHOA; delete process.env.V3_BOT_GHI;
  try {
    const e = await ct.datCongTacBot(bcQt(Y), ID.B, true).then(() => null, (x) => x);
    assert.ok(e, 'team Y bật được B trong khi A (team X) đã chiếm trần 1');
    assert.equal(e.status, 409, `${e.status} · ${e.message}`);
    assert.match(e.message, /đang bật 1\/1 page — trần V3_TRAN_PAGE_BAT=1/);
    assert.equal(await cot('B'), false);
    assert.equal(nhatKy.length, 0, 'bị chặn thì không ghi nhật ký «đã bật»');
    assert.equal((await ct.datCongTacBot(bcQt(X), ID.A, false)).botAiBat, false, 'tắt luôn đi được');
    assert.equal((await ct.datCongTacBot(bcQt(Y), ID.B, true)).botAiBat, true, 'tắt A rồi thì B bật được');
    assert.equal(await cot('B'), true);
  } finally {
    ct.datCongTacV3(null); ct.xoaDemBat();
    for (const [k, v] of [['V3_BOT_KHOA', cu.k], ['V3_BOT_GHI', cu.g]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});

test('GL2 M4f · khi vượt, màn /page-bot VẪN thấy page đang bật (team X thấy A, team Y thấy B) — để người tắt bớt', async () => {
  await datCot('A', 'B');
  const docSanSang = noiMan(envTran('1'));
  const kq = await docSanSang();
  assert.deepEqual(kq.pages.filter((p) => p.aiEnabled === true).map((p) => p.pageId).sort(), [PID.A, PID.B],
    'bộ đọc cửa kiểm (nguồn 6 màn) phải còn thấy CẢ HAI page bật');
  kp.datTaoTruyVan((bc) => taoTruyVanThat(pool, bc));
  kp.datDocSanSang(docSanSang);
  for (const [team, k] of [[X, 'A'], [Y, 'B']]) {
    const ds = await kp.danhSachPage(bcQt(team));
    const p = ds.page.find((x) => x.pageId === PID[k]);
    assert.equal(p?.botAiBat, true, `team ${team}: màn Page phải hiện page ${k} đang BẬT (nút mời «Tắt»), đo: ${JSON.stringify(p)}`);
  }
  kp.datDocSanSang(null);
});
