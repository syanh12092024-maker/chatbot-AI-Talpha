// HỢP ĐỒNG GIỮA CỔNG GIẢ VÀ CỔNG THẬT — bộ ca DUY NHẤT của vai B chạy trên POSTGRES THẬT.
//
// ═══ VÌ SAO PHẢI CÓ ═══════════════════════════════════════════════════════════════
// `07-KE-HOACH-GD2.md` §0 bài học ①, trả giá rồi: *«313 bài test xanh trên bản giả KHÔNG
// chứng minh gì về cơ sở dữ liệu thật — nối vào thật thì vấp bốn chỗ liên tiếp (thiếu `IN`,
// thiếu `LIMIT`, thiếu toán tử so sánh, Postgres trả `Date` mà code tính bằng ms)»*, và
// kết luận là *«giai đoạn 2 chạy trên Postgres thật ngay từ module đầu»*.
//
// Đo 01/09: 31/31 tệp test của vai B nạp `testkit/db-gia.js`, **0 tệp** đụng Postgres. Tức
// bài học ① chưa được cài vào thước — nó mới nằm trong tài liệu.
//
// Bộ ca này không kiểm màn nào cả. Nó kiểm ĐÚNG MỘT thứ: hai bản cài của cùng một giao
// diện cổng dữ liệu có trả lời GIỐNG NHAU không. Bản giả dễ tính hơn bản thật ở chỗ nào
// thì chỗ đó là chỗ mọi màn sẽ vỡ khi nối vào thật.
//
// ═══ THIẾU POSTGRES THÌ NÓI RA, KHÔNG XANH GIẢ ════════════════════════════════════
// Không có `DATABASE_URL_V3` ⇒ `skip` KÈM LÝ DO. Một bộ ca tự bỏ qua trong im lặng là bộ
// ca luôn xanh — đúng thứ nguy hiểm nhất trong một tệp sinh ra để chống xanh giả.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI, LoiXuyenTeam } = await import('../../src/auth/boi-canh.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');

const COD = !!process.env.DATABASE_URL_V3;
const VI_SAO_BO = 'thiếu DATABASE_URL_V3 — bộ ca hợp đồng KHÔNG đo được gì, và đây là bỏ '
  + 'qua CÓ NÓI, không phải xanh';

let sb = null;
let tThat = null;
let tGia = null;
let TEAM_A = null;
let TEAM_B = null;

if (COD) {
  const { dungSandbox } = await import('../../../db/sandbox.js');
  sb = await dungSandbox('bhopdong');
  const r = await sb.pool.query("SELECT id, slug FROM team ORDER BY id");
  TEAM_A = String(r.rows[0].id);
  TEAM_B = String(r.rows[1].id);

  // `nguoiDungId` đi thẳng vào câu SQL của A (cột bigint). Bản giả nhận chuỗi tuỳ ý, bản
  // thật thì `invalid input syntax for type bigint` — chính là loại lệch mà tệp này sinh ra
  // để bắt, nên fixture phải dùng một người dùng CÓ THẬT.
  const nguoi = await sb.pool.query(
    "INSERT INTO nguoi_dung (email, ten) VALUES ('hd@talpha.vn','HĐ') RETURNING id",
  );
  const NGUOI_ID = String(nguoi.rows[0].id);
  const bcThat = (teamId) => taoBoiCanh({
    nguoiDungId: NGUOI_ID, tenDangNhap: 'hd@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
  });
  tThat = (teamId = TEAM_A) => taoTruyVanThat(sb.pool, bcThat(teamId));

  // Bản GIẢ gieo cùng hai team, để hai bên xuất phát từ một trạng thái.
  const gia = dungCongGia({
    team: [{ id: TEAM_A, slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: TEAM_B, slug: 'b', ten: 'B', la_ky_thuat: false }],
    page: [],
  });
  tGia = (teamId = TEAM_A) => gia.taoTruyVan(bcThat(teamId));
}

/** Chạy `viec` trên CẢ HAI cổng, trả `[giả, thật]` — nơi gọi so hai vế. */
async function caHai(viec, teamId) {
  const g = await viec(tGia(teamId));
  const t = await viec(tThat(teamId));
  return [g, t];
}

let dem = 0;
const pageMoi = (o = {}) => ({
  page_id: `88${String(++dem).padStart(10, '0')}`,
  ten: `P${dem}`,
  ...o,
});

test('HĐ-1 · `them` rồi `chon` — hai cổng cùng thấy dòng vừa ghi, cùng hình dạng', { skip: COD ? false : VI_SAO_BO }, async () => {
  const p = pageMoi({ ten: 'Hợp đồng 1' });
  const [g, t] = await caHai(async (db) => {
    const dong = await db.them('page', { ...p });
    const doc = await db.chon('page', { page_id: p.page_id });
    return { coId: dong?.id != null, soDong: doc.length, ten: doc[0]?.ten };
  });
  assert.deepEqual(g, t, `bản giả: ${JSON.stringify(g)} · bản thật: ${JSON.stringify(t)}`);
  assert.equal(t.soDong, 1);
});

test('HĐ-2 · LỚP TEAM: team khác KHÔNG thấy dòng của team này (cả hai cổng)', { skip: COD ? false : VI_SAO_BO }, async () => {
  const p = pageMoi({ ten: 'Của team A' });
  await tThat(TEAM_A).them('page', { ...p });
  await tGia(TEAM_A).them('page', { ...p });
  const [g, t] = await caHai(async (db) => (await db.chon('page', { page_id: p.page_id })).length, TEAM_B);
  assert.equal(t, 0, 'cổng thật để lọt dòng của team khác — đây là lỗ lớp team');
  assert.equal(g, t, 'bản giả và bản thật phải cùng một câu trả lời về lớp team');
});

test('HĐ-3 · truyền tay `team_id` của team khác ⇒ NÉM ở cả hai cổng', { skip: COD ? false : VI_SAO_BO }, async () => {
  const chay = async (db) => {
    try {
      await db.chon('page', { team_id: TEAM_B });
      return 'KHÔNG NÉM';
    } catch (e) {
      return e instanceof LoiXuyenTeam ? 'LoiXuyenTeam' : e.constructor.name;
    }
  };
  assert.equal(await chay(tThat(TEAM_A)), 'LoiXuyenTeam');
  assert.equal(await chay(tGia(TEAM_A)), 'LoiXuyenTeam');
});

test('HĐ-4 · `gioiHan` cắt đúng số dòng ở CẢ HAI (chỗ bản giả từng dễ tính hơn)', { skip: COD ? false : VI_SAO_BO }, async () => {
  const nhom = `nh${Date.now().toString(36)}`;
  for (let i = 0; i < 3; i++) {
    const p = pageMoi({ ten: `${nhom}-${i}` });
    await tThat(TEAM_A).them('page', { ...p });
    await tGia(TEAM_A).them('page', { ...p });
  }
  const [g, t] = await caHai(async (db) => (await db.chon('page', {}, { gioiHan: 2 })).length);
  assert.equal(t, 2, 'bản thật phải tôn trọng `gioiHan` — thiếu LIMIT là một trong bốn chỗ đã vấp');
  assert.equal(g, t);
});

test('HĐ-5 · `dem` đếm đúng và bằng nhau', { skip: COD ? false : VI_SAO_BO }, async () => {
  const p = pageMoi({ ten: 'Đếm' });
  await tThat(TEAM_A).them('page', { ...p });
  await tGia(TEAM_A).them('page', { ...p });
  const [g, t] = await caHai((db) => db.dem('page', { page_id: p.page_id }));
  assert.equal(t, 1);
  assert.equal(g, t);
});

test('HĐ-6 · `sua` theo id: cả hai trả SỐ DÒNG đổi, và đọc lại thấy giá trị mới', { skip: COD ? false : VI_SAO_BO }, async () => {
  const p = pageMoi({ ten: 'Trước sửa' });
  const [g, t] = await caHai(async (db) => {
    const dong = await db.them('page', { ...p });
    const n = await db.sua('page', { id: dong.id }, { ten: 'Sau sửa' });
    const lai = await db.chon('page', { id: dong.id });
    return { n, ten: lai[0]?.ten };
  });
  assert.deepEqual(t, { n: 1, ten: 'Sau sửa' });
  assert.deepEqual(g, t);
});

test('HĐ-7 · KIỂU DỮ LIỆU: cột thời gian về dạng SO SÁNH ĐƯỢC ở cả hai (Date vs ms — chỗ đã vấp)', { skip: COD ? false : VI_SAO_BO }, async () => {
  const p = pageMoi({ ten: 'Thời gian' });
  const [g, t] = await caHai(async (db) => {
    const dong = await db.them('page', { ...p });
    const v = dong?.tao_luc;
    // Không đòi hai bên CÙNG KIỂU — đòi cả hai đều quy được về mốc thời gian hợp lệ.
    // Bản trước của B tính `Date.now() - dong.tao_luc` và ra NaN vì Postgres trả `Date`.
    const moc = v == null ? null : new Date(v).getTime();
    return { co: v != null, hopLe: moc != null && Number.isFinite(moc) };
  });
  assert.deepEqual(t, { co: true, hopLe: true }, 'cột thời gian của bản thật phải quy được về số');
  assert.deepEqual(g, t);
});

test('HĐ-8 · `xoa` bị TỪ CHỐI ở cả hai cổng (luật 2 — không xoá dữ liệu)', { skip: COD ? false : VI_SAO_BO }, async () => {
  for (const db of [tThat(TEAM_A), tGia(TEAM_A)]) {
    await assert.rejects(() => db.xoa('don_hang', { id: 1 }));
  }
});

test('HĐ-9 · bộ ca này CÓ chạy trên Postgres thật (không phải bỏ qua im lặng)', () => {
  if (!COD) {
    assert.fail(`bộ ca hợp đồng đã bị bỏ qua: ${VI_SAO_BO}`);
  }
  assert.ok(sb, 'phải dựng được sandbox Postgres');
});

test.after(async () => {
  if (sb) await sb.don();
});
