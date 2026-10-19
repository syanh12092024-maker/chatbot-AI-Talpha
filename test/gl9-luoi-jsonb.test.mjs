// GL9 ④3 — LƯỚI ở sáu cửa ghi jsonb còn `JSON.stringify` trần sau GL8. Gọi THẲNG từng cửa với chuỗi mang nửa cặp thay thế lẻ ⇒ ghi
// được, đọc lại jsonb không còn nửa cặp; chữ lành giữ nguyên.
//   · `lan_gui.noi_dung`                        — `src/queue/lan-gui.js#bocCuaGuiBen` (ghi TRƯỚC khi gửi; cửa giả nhận args NGUYÊN BẢN)
//   · `hang_cho_tao_don.du_lieu_don|cua_kiem`   — `src/orders/hang-cho.js#duyet` nhánh CHẶN (:869-870) và nhánh TẠO ĐƠN (:970-971)
//   · `so_ai.du_lieu` sự kiện tạo đơn           — `hang-cho.js#ghiSuKienTaoDon` (:1080, không export ⇒ đo qua `duyet` + `taoDon` giả)
//   · `hang_cho_tao_don.cua_kiem` lúc loại      — `hang-cho.js#loai` (:1128)
//   · `hoi_thoai.ho_so` lúc đối chiếu tin lỗi   — `src/queue/reconcile.js#handoffFailedMessage` (:31; hồ sơ do `context.js` cắt)
//   · `nhat_ky.truoc|sau`                       — `src/db/nhat-ky.js#ghiNhatKy`
// Postgres HỘP CÁT riêng (`aicloser_v3_test_gl9j_p<pid>`, tự dựng tự dọn). KHÔNG mạng: POS tiêm (`nap` giả · `taoDon` giả).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import { ghiNhatKy } from "../src/db/nhat-ky.js";
import { bocCuaGuiBen } from "../src/queue/lan-gui.js";
import { handoffFailedMessage } from "../src/queue/reconcile.js";
import { extractFromText, emptyProfile } from "../src/context.js";
import { vaoHangCho, duyet, loai } from "../src/orders/hang-cho.js";

const KHOA = { V3_KHOA_MA_HOA: "c".repeat(64) }; // KHÔNG đụng .env thật
const MO = { ...KHOA, V3_POS_GHI: "1" };
const SHOP = "9995091";
const MARKET = "UAE";
const BIEN_THE = `${SHOP}:3e272c3b-ea70-4d10-981e-e9049090391b`;
const HO_SO_DU = {
  ten: "Sara", sdt: "+971500000991", dia_chi: "Jumeirah 3", thanh_pho: "Dubai", so_luong: 2,
  tong_tien: 199, tien_te: "AED", san_pham_ma: BIEN_THE, kho_hang: "kho-gia-lap",
};

let sb, pool, TEAM, pageId;
const PAGE_TEXT = "555999888991";
const q = (sql, p) => pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

const khongNuaCap = (v) => {
  if (typeof v === "string") return v.isWellFormed();
  if (Array.isArray(v)) return v.every(khongNuaCap);
  if (v && typeof v === "object") return Object.values(v).every(khongNuaCap);
  return true;
};

/** POS giả — GET (đọc đơn sống) trả rỗng; POST không được xảy ra (taoDon tiêm). */
function napGia() {
  const f = async (_url, tuyChon = {}) => {
    if ((tuyChon.method || "GET") === "POST") { f.post += 1; throw new Error("ca GL9 không được POST POS"); }
    return { ok: true, status: 200, text: async () => JSON.stringify({ data: [], total_entries: 0 }) };
  };
  f.post = 0;
  return f;
}

async function dongChoDuyet(psid, tinId) {
  const h = await mot(
    "INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,$3,'CLOSING','AI') RETURNING *",
    [TEAM, pageId, psid],
  );
  await q(
    "INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung, trang_thai) VALUES ($1,$2,$3,$4,$5,'yes i confirm','xong')",
    [TEAM, PAGE_TEXT, psid, `conv-${psid}`, `msg-${psid}`],
  );
  const kq = await vaoHangCho(pool, ctxHeThong(), { hoiThoaiId: h.id, teamId: TEAM, hoSo: HO_SO_DU, convId: `conv-${psid}`, tinId },
    { env: MO, nap: napGia() });
  return kq.id;
}

before(async () => {
  sb = await dungSandbox("gl9j");
  pool = sb.pool;
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  pageId = (await mot("INSERT INTO page (team_id, page_id, ten, thi_truong, pos_shop_id) VALUES ($1,$2,'GL9',' ',$3) RETURNING id",
    [TEAM, PAGE_TEXT, SHOP])).id;
  await q("INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
    [TEAM, MARKET, SHOP, maHoa("khoa-gia-lap", KHOA)]);
  const sp = (await mot("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [TEAM, pageId, BIEN_THE])).id;
  await q("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,2,199,'AED')", [TEAM, sp]);
  console.log(`   [gl9j] hộp cát ${sb.ten} · tệp đo ${new URL("../src/orders/hang-cho.js", import.meta.url).pathname}`);
});
after(async () => { if (sb) await sb.don(); });

test("GL9 J1 · lan-gui: nội dung gửi mang nửa cặp ⇒ sổ gửi ghi được (noi_dung lành) · cửa nhận args GIỐNG HỆT đầu vào (===)", async () => {
  const tin = { id: 990001, team_id: TEAM, page_id: PAGE_TEXT, conv_id: null };
  const nhan = [];
  const cua = Object.fromEntries(["guiTin", "guiAnh", "ghiNote", "gatThe"].map((l) => [l, async (...a) => { nhan.push([l, a]); return { ok: true, id: `m-${l}` }; }]));
  const boc = bocCuaGuiBen(pool, tin, cua, { env: {} });
  const ctx = { gia: "ctx" };
  const dauTin = { pageId: PAGE_TEXT, psid: "KH", convId: "c1", text: "Yes po! \ud83d" };
  const dauNote = { pageId: PAGE_TEXT, message: "\udc00ghi chú 📦 lành" };
  const r1 = await boc.guiTin(pool, ctx, dauTin);
  const r2 = await boc.ghiNote(pool, ctx, dauNote);
  assert.deepEqual([r1.ok, r2.ok], [true, true]);
  assert.equal(nhan.length, 2, "cửa phải được gọi đúng 2 lượt");
  assert.equal(nhan[0][1][2], dauTin, "cửa guiTin phải nhận CHÍNH object đầu vào");
  assert.equal(nhan[0][1][2].text, "Yes po! \ud83d", "chữ gửi khách bị lưới sửa — lưới chỉ được đụng bản ghi sổ");
  assert.equal(nhan[1][1][2].message, "\udc00ghi chú 📦 lành");
  assert.ok(nhan.every(([, a]) => a[0] === pool && a[1] === ctx && a.length === 3));
  const dong = (await q("SELECT loai, noi_dung, trang_thai FROM lan_gui WHERE team_id=$1 AND tin_id=$2 ORDER BY buoc", [TEAM, tin.id])).rows;
  assert.deepEqual(dong.map((d) => [d.loai, d.trang_thai]), [["guiTin", "da_gui"], ["ghiNote", "da_gui"]]);
  assert.ok(khongNuaCap(dong.map((d) => d.noi_dung)));
  assert.deepEqual(dong[0].noi_dung, { pageId: PAGE_TEXT, psid: "KH", convId: "c1", text: "Yes po! " });
  assert.deepEqual(dong[1].noi_dung, { pageId: PAGE_TEXT, message: "ghi chú 📦 lành" });
});

test("GL9 J2 · duyet nhánh CHẶN (:869-870): boSung + lỗi nguồn mang nửa cặp ⇒ UPDATE được, du_lieu_don/cua_kiem lành", async () => {
  const id = await dongChoDuyet("psJ2", 990002);
  const nap = napGia();
  const kq = await duyet(pool, ctxHeThong(), { hangChoId: id, teamId: TEAM, boSung: { ten: "Sara \ud83d", dia_chi: "Jumeirah\udc00 3" } },
    { env: MO, nap, kiemTrung: async () => { throw new Error("tra trùng hỏng giữa chừng \ud83d"); } });
  assert.equal(kq.chan, true, `phải bị chặn ở cửa ③ (unknown nguồn e): ${JSON.stringify(kq)}`);
  assert.equal(nap.post, 0);
  const hc = await mot("SELECT trang_thai, du_lieu_don, cua_kiem FROM hang_cho_tao_don WHERE id=$1", [id]);
  assert.equal(hc.trang_thai, "cho_duyet");
  assert.ok(khongNuaCap(hc.du_lieu_don) && khongNuaCap(hc.cua_kiem));
  assert.deepEqual([hc.du_lieu_don.ten, hc.du_lieu_don.dia_chi], ["Sara ", "Jumeirah 3"]);   // `chu()` gọt trước, lưới xoá nửa cặp sau
  assert.match(hc.cua_kiem.cong["3_chong_trung"].nguon.e_kiem_trung.chi_tiet, /tra trùng hỏng giữa chừng $/);
});

test("GL9 J3 · duyet nhánh TẠO ĐƠN (:970-971 · :1080 · nhat_ky): mã POS mang nửa cặp ⇒ tạo đơn được, bốn bản ghi jsonb lành", async () => {
  const id = await dongChoDuyet("psJ3", 990003);
  const nap = napGia();
  const ma = `${SHOP}:71\ud83d`;
  const kq = await duyet(pool, ctxHeThong(), { hangChoId: id, teamId: TEAM }, {
    env: MO, nap,
    taoDon: async () => ({ maPos: ma, status: 12, nhanStatus: "Chờ in \udc00", payload: {} }),
  });
  assert.equal(kq.tao, true, JSON.stringify(kq.chan_vi || kq));
  assert.equal(nap.post, 0);
  const hc = await mot("SELECT trang_thai, du_lieu_don, cua_kiem FROM hang_cho_tao_don WHERE id=$1", [id]);
  assert.equal(hc.trang_thai, "da_duyet");
  assert.ok(khongNuaCap(hc.du_lieu_don) && khongNuaCap(hc.cua_kiem));
  assert.equal(hc.du_lieu_don.ma_pos, `${SHOP}:71`);
  assert.deepEqual([hc.cua_kiem.cong["5_tao_don"].ma_pos, hc.cua_kiem.cong["5_tao_don"].nhan], [`${SHOP}:71`, "Chờ in "]);
  const sa = await mot("SELECT du_lieu FROM so_ai WHERE nguon_tep='hang_cho_tao_don:order' AND nguon_dong=$1", [Number(id)]);
  assert.ok(sa, "thiếu dòng so_ai sự kiện tạo đơn");
  assert.deepEqual(sa.du_lieu, { hang_cho_id: String(id), don_hang_id: String(kq.donId), ma_pos: `${SHOP}:71` });
  const nk = await mot("SELECT sau FROM nhat_ky WHERE hanh_dong='hang_cho_duyet_tao_don' AND doi_tuong_id=$1", [String(id)]);
  assert.ok(nk && khongNuaCap(nk.sau));
  assert.equal(nk.sau.ma_pos, `${SHOP}:71`);
});

test("GL9 J4 · loai (:1128 + nhat_ky): lý do sale gõ mang nửa cặp ⇒ tu_choi, cua_kiem/nhat_ky lành", async () => {
  const id = await dongChoDuyet("psJ4", 990004);
  const kq = await loai(pool, ctxHeThong(), { hangChoId: id, teamId: TEAM, lyDo: "khách đổi ý \ud83d" });
  assert.equal(kq.dong?.trang_thai, "tu_choi");
  const hc = await mot("SELECT cua_kiem FROM hang_cho_tao_don WHERE id=$1", [id]);
  assert.ok(khongNuaCap(hc.cua_kiem));
  assert.equal(hc.cua_kiem.ket_thuc.ly_do, "khách đổi ý ");
  const nk = await mot("SELECT sau FROM nhat_ky WHERE hanh_dong='hang_cho_loai' AND doi_tuong_id=$1", [String(id)]);
  assert.deepEqual(nk.sau, { trang_thai: "tu_choi", ly_do: "khách đổi ý " });
});

test("GL9 J5 · reconcile (:31): địa chỉ bị context.js cắt giữa emoji ⇒ ho_so ghi được, lành, hội thoại về SALE", async () => {
  const diaChi = `Al Barsha villa 9, Dubai ${"x".repeat(974)}📦 cuối`;           // slice(0,1000) chém đôi 📦
  const tien = extractFromText(diaChi, emptyProfile());
  assert.equal(tien.address.isWellFormed(), false, "tiền điều kiện: context.js phải để lại nửa cặp (nếu không, ca này không đo lưới)");
  const h = await mot("INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,'psJ5','SELLING','AI') RETURNING id", [TEAM, pageId]);
  const t = await mot("INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung, trang_thai) VALUES ($1,$2,'psJ5','c5','m5',$3,'loi') RETURNING id",
    [TEAM, PAGE_TEXT, diaChi]);
  const kq = await handoffFailedMessage(pool, { teamId: TEAM, id: t.id, reason: "đối chiếu ca GL9 J5" });
  assert.equal(kq.ok, true);
  const ht = await mot("SELECT chu_so_huu, ho_so FROM hoi_thoai WHERE id=$1", [h.id]);
  assert.equal(ht.chu_so_huu, "SALE");
  assert.ok(khongNuaCap(ht.ho_so));
  assert.equal(ht.ho_so.address, diaChi.slice(0, 999));
});

test("GL9 J6 · ghiNhatKy thẳng: truoc/sau mang nửa cặp ⇒ ghi được, lành; dữ liệu lành ra y hệt", async () => {
  const id = await ghiNhatKy(pool, {
    teamId: TEAM, tacNhan: "may:gl9", hanhDong: "gl9_j6", doiTuong: "x", doiTuongId: "1",
    truoc: { a: "x\ud83d", so: 1 }, sau: { b: ["\udc00ok", "📦 lành"], lo: { c: null } }, ghiChu: "j6",
  });
  const nk = await mot("SELECT truoc, sau FROM nhat_ky WHERE id=$1", [id]);
  assert.deepEqual(nk.truoc, { a: "x", so: 1 });
  assert.deepEqual(nk.sau, { b: ["ok", "📦 lành"], lo: { c: null } });
  const id2 = await ghiNhatKy(pool, { teamId: TEAM, tacNhan: "may:gl9", hanhDong: "gl9_j6b", truoc: null, sau: null });
  const nk2 = await mot("SELECT truoc, sau FROM nhat_ky WHERE id=$1", [id2]);
  assert.deepEqual([nk2.truoc, nk2.sau], [null, null], "null phải giữ NULL (không thành 'null' jsonb)");
});
