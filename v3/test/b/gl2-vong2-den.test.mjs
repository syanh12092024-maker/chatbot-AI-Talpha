// PHIẾU GL2 · VÒNG 2 · N1 (review (b) 07/10) — đèn «Page đang bật bot» khi VƯỢT TRẦN phải kể page bật TOÀN HỆ theo TEAM.
//
// Kịch bản review đã chạy (probe R1): trần 1 · A (pilot, team X) + B (team Y, bật ngoài cổng) ⇒ worker DỪNG. Người team X đọc
// đèn cũ «Team này đang bật 1: A. Còn 1 page bật ở team khác», bấm «Tắt bớt» → /page-bot team X chỉ thấy A → tắt A ⇒ worker chạy
// lại trên B (ai_sale/Botcake chưa tắt ở B) ⇒ khách nhận HAI câu. Hợp đồng vòng 2:
//   · đèn nói TỔNG số page bật toàn hệ; kể TÊN page của MỌI team người xem là thành viên (kèm tên team);
//   · team người xem KHÔNG thuộc: chỉ SỐ page + TÊN team — KHÔNG lộ tên/id page (cách ly team); team kỹ thuật thì nói đúng đường xử;
//   · câu cảnh báo: tắt một page thì worker chạy lại các page còn lại — kiểm page pilot trước; page ở team khác: báo quản trị team đó.
// CHUỖI THẬT trên hộp cát Postgres: cổng `taoTruyVanThat` (kẹp team) + bộ đọc `noiVanHanhV3` (đúng thứ `v3/chay-that.js:170,299`
// tiêm) + cổng danh tính `taoCongDanhTinh` (đúng thứ `chay-that.js:300` giao). Không gọi mạng; env truyền vào, không sửa `.env`.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungSandbox } = await import('../../../db/sandbox.js');
const { nhipMayBot } = await import('../../../src/queue/kho.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
const { noiVanHanhV3 } = await import('../../src/noi-day/van-hanh-v3.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const { datCongDanhTinh } = await import('../../src/auth/kho-nguoi-dung.js');
const sk = await import('../../src/ui/suc-khoe/kho-suc-khoe.js');
const nhip = await import('../../src/ui/chung/nhip-may-bot.js');

const ENV_MO = { V3_PANCAKE_GUI: '1', PANCAKE_READONLY: '0', V3_RAP_PROMPT_BAT: '1', ANTHROPIC_API_KEY: 'fake-only' };
const ENV1 = { ...ENV_MO, V3_TRAN_PAGE_BAT: '1' };

const fetchCu = globalThis.fetch;
let goiFetch = 0;
let sb; let pool; let X; let Y; let K; const ND = {}; const ID = {};
const PID = { A: '976000000001', B: '976000000002', K: '976000000003' };
const TEN = { A: 'GL2V2 PILOT A', B: 'GL2V2 LẠC B', K: 'GL2V2 KHO K' };
const TEN_X = 'Tiểu Alpha'; const TEN_Y = 'GL2V2 Y'; const TEN_K = 'Chưa phân team (kỹ thuật)';

before(async () => {
  globalThis.fetch = async (u) => { goiFetch += 1; throw new Error(`ca GL2 v2: lượt gọi mạng lạ ${u}`); };
  sb = await dungSandbox('gl2_v2_den');
  pool = sb.pool;
  const mot = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  X = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  K = String((await mot('SELECT id FROM team WHERE la_ky_thuat = true ORDER BY id LIMIT 1')).id);
  Y = String((await mot('INSERT INTO team (slug, ten) VALUES ($1,$2) RETURNING id', ['gl2v2-y', TEN_Y])).id);
  // u1 chỉ thuộc X · u2 thuộc CẢ X lẫn Y · u3 chỉ thuộc Y (cả ba quản trị) · u4 marketer của X (không kéo được page kho tạm).
  // Lược đồ cấm gán thành viên vào team kỹ thuật (không ai «thuộc» K).
  for (const [k, teams, vai] of [['u1', [X], 'quan-tri'], ['u2', [X, Y], 'quan-tri'], ['u3', [Y], 'quan-tri'], ['u4', [X], 'marketer']]) {
    ND[k] = String((await mot('INSERT INTO nguoi_dung (email, ten) VALUES ($1,$1) RETURNING id', [`${k}@gl2v2.vn`])).id);
    for (const t of teams) {
      await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3', [t, ND[k], vai]);
    }
  }
  for (const [k, team] of [['A', X], ['B', Y], ['K', K]]) {
    ID[k] = String((await mot('INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id', [team, PID[k], TEN[k]])).id);
    const sp = (await mot("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [team, ID[k], `gl2v2-${k}`])).id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  }
});
after(async () => {
  globalThis.fetch = fetchCu;
  if (sb) await sb.don();
  assert.equal(goiFetch, 0, 'ca không được gọi mạng');
});

const bc = (nguoi, team, vai = VAI.QUAN_TRI) => taoBoiCanh({ nguoiDungId: ND[nguoi], tenDangNhap: `${nguoi}@gl2v2.vn`, teamId: team, vai: [vai] });
const datCot = async (...dsBat) => pool.query('UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))', [dsBat.map((k) => PID[k])]);
const lay = (b, ma) => b.den.find((d) => d.ma === ma);

/** Nối màn bằng ĐÚNG các bộ đọc tiến trình giao diện thật dùng; `danhTinh` = cổng danh tính (mặc định: cổng thật). */
function noiMan(env, { danhTinh = () => taoCongDanhTinh(pool) } = {}) {
  sk.datTaoTruyVan((b) => taoTruyVanThat(pool, b));
  sk.datDocKhoToken(null);
  sk.datTrangThaiCauBot(null);
  sk.datDocSanSang(noiVanHanhV3(pool, env, { docLegacy: async () => ({ pages: [] }) }));
  datCongDanhTinh(danhTinh);
  nhip.datDocNhip((b) => nhipMayBot(pool, { teamId: b?.teamId ?? null }));
  nhip.xoaNhoNhip();
}
const CANH_BAO = [/tắt một page thì worker chạy lại các page còn lại/i, /kiểm page nào là page pilot trước khi tắt/i, /page ở team khác: báo quản trị team đó/i];
/** Cả thân trả về của màn (không chỉ câu đèn) — thứ trình duyệt nhận được. */
const khongLo = (b, ...dsK) => {
  const than = JSON.stringify(b);
  for (const k of dsK) {
    assert.ok(!than.includes(TEN[k]), `LỘ TÊN page ${k} của team người xem không thuộc: ${lay(b, 'bot_bat').vi}`);
    assert.ok(!than.includes(PID[k]), `LỘ ID page ${k} của team người xem không thuộc: ${lay(b, 'bot_bat').vi}`);
  }
};

test('GL2 N1a · vượt (A team X + B team Y, trần 1) · người xem CHỈ thuộc một team ⇒ kể page team mình + «1 page ở team <tên>», KHÔNG lộ page team kia; câu cảnh báo đủ', async () => {
  await datCot('A', 'B');
  noiMan(ENV1);
  for (const [nguoi, team, cuaMinh, tenMinh, kia, tenKia] of [['u1', X, 'A', TEN_X, 'B', TEN_Y], ['u3', Y, 'B', TEN_Y, 'A', TEN_X]]) {
    const b = await sk.bangDen(bc(nguoi, team), { env: ENV1 });
    const d = lay(b, 'bot_bat');
    assert.equal(d.muc, sk.MUC.DO, d.vi);
    assert.match(d.vi, /toàn hệ đang bật 2\/1 page/, `phải nói TỔNG toàn hệ: ${d.vi}`);
    assert.ok(d.vi.includes(TEN[cuaMinh]) && d.vi.includes(tenMinh), `${nguoi}: phải kể page ${cuaMinh} kèm team «${tenMinh}»: ${d.vi}`);
    assert.match(d.vi, /1 page bật ở team khác/);
    assert.ok(d.vi.includes(tenKia), `${nguoi}: phải nói TÊN team đang bật page kia («${tenKia}»): ${d.vi}`);
    for (const re of CANH_BAO) assert.match(d.vi, re);
    khongLo(b, kia);
    console.log(`[gl2] N1a đèn (${nguoi}, team ${tenMinh}): ${d.vi}`);
  }
});

test('GL2 N1b · vượt · người xem thuộc CẢ HAI team ⇒ thấy tên CẢ HAI page kèm team, không còn page nào «ở team khác»', async () => {
  await datCot('A', 'B');
  noiMan(ENV1);
  const d = lay(await sk.bangDen(bc('u2', X), { env: ENV1 }), 'bot_bat');
  assert.equal(d.muc, sk.MUC.DO, d.vi);
  for (const s of [TEN.A, TEN.B, TEN_X, TEN_Y]) assert.ok(d.vi.includes(s), `thiếu «${s}»: ${d.vi}`);
  // /code-review vòng 2 #1: công tắc kẹp team đang mở ⇒ page ở team KHÁC của chính người xem phải nói «đổi team rồi tắt».
  assert.ok(d.vi.includes(`${TEN_Y} (team khác của bạn — đổi team ở màn Chọn team rồi tắt ở màn Page & Bot): ${TEN.B}`), d.vi);
  assert.doesNotMatch(d.vi, /page bật ở team khác/, `cả hai page đều thuộc team của người xem: ${d.vi}`);
  for (const re of CANH_BAO) assert.match(d.vi, re);
});

test('GL2 N1c · vượt vì page bật ở TEAM KỸ THUẬT «chưa phân» ⇒ số + tên team + ĐÚNG đường xử; quản trị (kéo được) thấy tên + id để lọc kho, marketer chỉ thấy số', async () => {
  await datCot('A', 'K');
  noiMan(ENV1);
  for (const [nguoi, vai] of [['u2', VAI.QUAN_TRI], ['u4', VAI.MARKETER]]) {
    const b = await sk.bangDen(bc(nguoi, X, vai), { env: ENV1 });
    const d = lay(b, 'bot_bat');
    assert.equal(d.muc, sk.MUC.DO, d.vi);
    assert.match(d.vi, /toàn hệ đang bật 2\/1 page/);
    assert.ok(d.vi.includes(TEN.A), d.vi);
    assert.match(d.vi, /1 page bật ở team khác/);
    assert.ok(d.vi.includes(TEN_K), `phải nói tên team kỹ thuật: ${d.vi}`);
    assert.match(d.vi, /không màn nào tắt thẳng được/, d.vi);
    assert.match(d.vi, /Người và team \(\/cau-hinh-team\) › «Chuyển page sang team khác» › nút «Kho chưa phân team»/, d.vi);
    assert.match(d.vi, /kéo page về team mình rồi tắt ở màn Page & Bot/, d.vi);
    if (vai === VAI.QUAN_TRI) {
      // /code-review vòng 2 #2: kho «chưa phân» cắt 200 dòng xếp theo tên ⇒ người kéo được cần id để gõ vào ô lọc.
      assert.ok(d.vi.includes(`${TEN.K} — id ${PID.K}`) && /gõ id vào ô lọc của kho/.test(d.vi), d.vi);
    } else khongLo(b, 'K');
    console.log(`[gl2] N1c đèn (${nguoi} ${vai}, team kỹ thuật bật): ${d.vi}`);
  }
});

test('GL2 N1d · vượt · cổng danh tính HỎNG ⇒ chỉ coi team đang xem là của mình (không đoán rộng ra), vẫn không lộ page team kia, đèn vẫn đỏ', async () => {
  await datCot('A', 'B');
  noiMan(ENV1, { danhTinh: () => { throw new Error('cổng danh tính giả hỏng'); } });
  const b = await sk.bangDen(bc('u2', X), { env: ENV1 });
  const d = lay(b, 'bot_bat');
  assert.equal(d.muc, sk.MUC.DO, d.vi);
  assert.ok(d.vi.includes(TEN.A), d.vi);
  assert.match(d.vi, /1 page bật ở team khác/);
  assert.match(d.vi, /không đọc được danh sách team của bạn/, `mù thì phải NÓI mù: ${d.vi}`);
  khongLo(b, 'B');
});

test('GL2 N1e · trong trần (chỉ A bật, trần 1) ⇒ đèn xanh như cũ, không kể danh sách / cảnh báo vượt', async () => {
  await datCot('A');
  noiMan(ENV1);
  const d = lay(await sk.bangDen(bc('u1', X), { env: ENV1 }), 'bot_bat');
  assert.equal(d.muc, sk.MUC.XANH, d.vi);
  assert.match(d.vi, /Toàn hệ đang bật 1\/1 page — trần V3_TRAN_PAGE_BAT=1/);
  assert.doesNotMatch(d.vi, /tắt một page thì worker chạy lại/i);
});
