// UI-HT3 · bàn hội thoại đo trên POSTGRES SANDBOX thật, qua CỔNG DỮ LIỆU THẬT.
//
// Vì sao ca này tồn tại: UI-HT1 đọc `tin_cho_xu_ly` qua cổng — xanh trên cổng giả, nhưng hai bảng
// `tin_cho_xu_ly`/`lan_gui` KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn nên cổng thật
// NÉM ⇒ mở hội thoại nào trên máy chủ cũng 500 (bắt được 28/09 trước deploy). Cổng giả không có
// danh sách bảng; chỉ Postgres + cổng thật mới bắt được loại lỗi này — và cả tên cột sai, kiểu
// `numeric`/`timestamptz` thật của `don_hang`/`so_ai`/`kich_ban`.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { taoBoiCanh, VAI } from "../v3/src/auth/boi-canh.js";
import { taoTruyVanThat } from "../v3/src/noi-day/cong-du-lieu-that.js";
import { datTaoTruyVan } from "../v3/src/ui/dispatch/index.js";
import { docKichBanChoPage } from "../src/db/kich-ban.js";
import {
  taoDocDauVetV3Sql, datDocDauVetV3, docHoiThoai, datDocTinPancake, xoaNhoHoiThoai, datChiMucSoAi,
  boiCanhHoiThoai, datGiaiKichBan, datLaTinTuDong,
} from "../v3/src/ui/ban-hoi-thoai/index.js";

let sb, teamA, teamB, pA, htA, htKhac;
const q = async (sql, a = []) => (await sb.pool.query(sql, a)).rows;
const BAY = Date.parse("2026-09-28T10:00:00Z");

before(async () => {
  sb = await dungSandbox("uiht3");
  teamA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'"))[0].id;
  teamB = (await q("SELECT id FROM team WHERE slug='auus'"))[0].id;
  [pA] = await q("INSERT INTO page (team_id, page_id, ten) VALUES ($1,'102938','Tiểu Alpha Store') RETURNING id", [teamA]);
  const [pB] = await q("INSERT INTO page (team_id, page_id, ten) VALUES ($1,'556677','B') RETURNING id", [teamB]);
  const [k] = await q(
    `INSERT INTO khach (team_id, so_dien_thoai, ten, dia_chi, thanh_pho, ti_le_hoan, tang_hoan, cham_hoan_luc)
     VALUES ($1,'96891234567','Aisha','Way 3021','Muscat',71.4,'rui_ro_cao',now()) RETURNING id`, [teamA]);
  [htA] = await q(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, khach_id, trang_thai, chu_so_huu, ly_do_cuoi, ai_noi_gi, cham_luc)
     VALUES ($1,$2,'7733',$3,'HANDOFF','SALE','khiếu nại','Could you send a photo?',$4) RETURNING id`,
    [teamA, pA.id, k.id, new Date(BAY)]);
  [htKhac] = await q(
    "INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu) VALUES ($1,$2,'7733','GREET','AI') RETURNING id",
    [teamB, pB.id]);

  // Hàng đợi v3: hai dòng có mã khách (mới nhất thắng) + một dòng mã rỗng MỚI HƠN + dòng team khác.
  const tin = async (team, msg, cust) => (await q(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, cust_id, msg_id, noi_dung, trang_thai)
     VALUES ($1,'102938','7733','102938_7733',$2,$3,'hi','xong') RETURNING id`, [team, cust, msg]))[0].id;
  const t1 = await tin(teamA, "m1", "c-cu");
  const t2 = await tin(teamA, "m2", "c-moi");
  await tin(teamA, "m3", "");
  const tB = await tin(teamB, "m9", "c-team-B");
  const gui = (team, tinId, buoc, loai, tt, pid, noiDung) => q(
    `INSERT INTO lan_gui (team_id, tin_id, buoc, loai, noi_dung, trang_thai, provider_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`, [team, tinId, buoc, loai, JSON.stringify(noiDung), tt, pid]);
  await gui(teamA, t1, 1, "guiTin", "da_gui", "pk-1", "Hello! Thank you for your order.");
  await gui(teamA, t2, 1, "guiTin", "khong_ro", null, "The 2-pack is 159 SAR with free delivery.");
  await gui(teamA, t2, 2, "guiTin", "dien_tap", null, "chưa bao giờ rời hệ");
  await gui(teamA, t2, 3, "guiTin", "dang_gui", null, "đang gửi dở");
  await gui(teamA, t2, 4, "ghiNote", "da_gui", "pk-note", "ghi chú");
  await gui(teamB, tB, 1, "guiTin", "da_gui", "pk-team-B", "tin của team khác");

  // Đơn: một đơn cũ + một đơn MỚI của hội thoại; một đơn chỉ của khách.
  const don = (ma, ht, tt, tao, tien) => q(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, hoi_thoai_id, page_id, tong_tien, tien_te, tao_luc)
     VALUES ($1,$2,'messenger',$3,'2',$4,$5,$6,$7,'SAR',$8)`, [teamA, ma, tt, k.id, ht, pA.id, tien, new Date(tao)]);
  await don("77:10", htA.id, "dong", BAY - 86_400_000, 99);
  await don("77:11", htA.id, "cho_sale", BAY - 3_600_000, 129);
  await don("77:12", null, "dong", BAY - 5 * 86_400_000, 50);

  // Sổ AI v3: hai lượt trả lời (một chưa tính tiền) + một lượt không gọi model; một dòng khách khác.
  const soAi = (psid, loai, model, luc, tien, dong) => q(
    `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, tien_vnd, nguon_tep, nguon_dong)
     VALUES ($1,$2,'102938',$3,$4,$5,$6,'test',$7)`, [teamA, new Date(luc), psid, loai, model, tien, dong]);
  await soAi("7733", "reply", "claude-haiku-4-5", BAY - 1_800_000, 300.5, 1);
  await soAi("7733", "reply", "claude-sonnet-5", BAY - 1_200_000, null, 2);
  await soAi("7733", "handoff", "khong-goi-model", BAY - 600_000, 0, 3);
  await soAi("1111", "reply", "khac", BAY, 9999, 4);

  // Kịch bản LIVE tầng page — đọc bằng BỘ GIẢI BA TẦNG thật.
  await q(
    `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may, nguoi_sua, sua_luc, cap)
     VALUES ($1,$2,3,'LIVE','{}','x','ngoc',$3,'page')`, [teamA, pA.id, new Date(BAY - 7_200_000)]);

  datTaoTruyVan((bc) => taoTruyVanThat(sb.pool, bc));
  datChiMucSoAi(null);
  datLaTinTuDong(null);
});
after(async () => {
  datDocDauVetV3(null); datGiaiKichBan(null); datDocTinPancake(null);
  if (sb) await sb.don();
});

const bc = (team = teamA) => taoBoiCanh({ nguoiDungId: "1", tenDangNhap: "an", teamId: String(team), vai: [VAI.SALE] });

test("S1 · dấu vết v3 bằng SQL: mã khách MỚI NHẤT khác rỗng · chỉ guiTin da_gui/khong_ro · KHÔNG lọt team khác", async () => {
  const doc = taoDocDauVetV3Sql(sb.pool);
  const dv = await doc(bc(), { pageFb: "102938", psid: "7733" });
  assert.equal(dv.maKhach, "c-moi");
  assert.deepEqual(dv.gui.map((g) => g.provider_id).sort(), ["pk-1", null].sort());
  assert.equal(typeof dv.gui.find((g) => g.provider_id === "pk-1").noi_dung, "string", "jsonb chuỗi về lại chuỗi");
  const dvB = await doc(bc(teamB), { pageFb: "102938", psid: "7733" });
  assert.equal(dvB.maKhach, "c-team-B");
  assert.deepEqual(dvB.gui.map((g) => g.provider_id), ["pk-team-B"]);
});

test("S2 · docHoiThoai trọn đường qua CỔNG THẬT + bộ đọc SQL: đọc được, mã khách từ hàng đợi v3, nhãn bot đúng", async () => {
  datDocDauVetV3(taoDocDauVetV3Sql(sb.pool));
  xoaNhoHoiThoai();
  const goi = [];
  datDocTinPancake(async (pageId, convId, custId) => {
    goi.push(custId);
    return { ok: true, messages: [
      { id: "pk-1", from: { id: pageId }, message: "đã sửa chữ trên Pancake" },
      { id: "x2", from: { id: pageId }, message: "The 2-pack is 159 SAR with free delivery." },
      { id: "x3", from: { id: pageId }, message: "chưa bao giờ rời hệ — sale gõ trùng chữ" },
      { id: "x4", from: { id: "k" }, message: "ok" },
    ] };
  });
  const kq = await docHoiThoai(bc(), String(htA.id));
  assert.equal(kq.lichSuLoi, null);
  assert.equal(kq.nguonMa, "hang_doi_v3");
  assert.deepEqual(goi, ["c-moi"]);
  assert.deepEqual(kq.lichSu.map((t) => t.nguon), ["ai", "ai", "page", "khach"]);
});

test("S3 · boiCanhHoiThoai qua CỔNG THẬT + bộ giải kịch bản thật: đúng cột, đúng kiểu (numeric/timestamptz)", async () => {
  datGiaiKichBan((teamId, pageRowId) => docKichBanChoPage(sb.pool, teamId, pageRowId));
  const x = await boiCanhHoiThoai(bc(), String(htA.id));
  assert.equal(x.khach.ten, "Aisha");
  assert.equal(x.khach.diaChi, "Way 3021 · Muscat");
  assert.equal(x.khach.tangHoan.muc, "chan");
  assert.equal(x.khach.tiLeHoan, 71.4);
  assert.equal(x.khach.soDon, 3);
  assert.equal(x.donDangBan.maPos, "77:11");
  assert.equal(x.donDangBan.trangThai, "Chờ sale xử");
  assert.equal(x.donDangBan.trangThaiPos, "Đang giao");
  assert.equal(x.donDangBan.tongTien, 129);
  assert.equal(x.donDangBan.taoLuc, BAY - 3_600_000);
  assert.equal(x.giaiDoan, "HANDOFF");
  assert.equal(x.lyDoCuoi, "khiếu nại");
  assert.equal(x.chamLuc, BAY);
  assert.equal(x.kichBan.co, true);
  assert.equal(x.kichBan.phienBan, 3);
  assert.equal(x.kichBan.nguoiSua, "ngoc");
  assert.equal(x.kichBan.suaLuc, BAY - 7_200_000);
  assert.match(x.kichBan.tuDau, /chính page/);
  assert.equal(x.soAi.soLuot, 2);
  assert.equal(x.soAi.soDong, 3);
  assert.equal(x.soAi.model, "claude-sonnet-5");
  assert.equal(x.soAi.tienVnd, 300.5);
  assert.equal(x.soAi.soGoiModel, 2);
  assert.equal(x.soAi.soDongCoTien, 1);
  assert.equal(await boiCanhHoiThoai(bc(), String(htKhac.id)), null, "hội thoại team khác");
});
