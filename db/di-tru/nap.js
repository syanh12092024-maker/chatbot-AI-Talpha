// Bộ NẠP: đọc JSON nguồn → ghi vào CSDL v3. Idempotent (chạy 2 lần không nhân đôi).
//
// Mọi dòng di trú vào team KỸ THUẬT `chua-phan` — chưa chốt mapping page↔team
// (chờ H7 §8 sổ). ⛔ KHÔNG đoán team theo thị trường: đoán sai là trộn khách hai team.
import {
  docPages,
  docAiEnabled,
  docConvState,
  docKichBan,
  pageLac,
} from "./nguon.js";

export const TEAM_KY_THUAT = "chua-phan";

async function idTeam(pool, slug) {
  const r = await pool.query("SELECT id FROM team WHERE slug = $1", [slug]);
  if (!r.rowCount)
    throw new Error(
      `chưa có team slug='${slug}' — chạy \`npm run migrate\` trước`,
    );
  return r.rows[0].id;
}

const gio = (v) => (v ? new Date(typeof v === "number" ? v : String(v)) : null);

// ── page ───────────────────────────────────────────────────────────────────
// Khoá tự nhiên: page_id. `bot_ai_bat` KHÔNG nằm trong pages.json — nó được đặt
// riêng ở nạpCongTacAi() từ ai-enabled.json, nên câu UPDATE dưới đây CỐ Ý không
// đụng cột đó (nếu đụng, mỗi lượt di trú lại tắt sạch công tắc).
export async function napPage(pool, goc) {
  const teamId = await idTeam(pool, TEAM_KY_THUAT);
  const rows = docPages(goc);
  for (const p of rows) {
    await pool.query(
      `INSERT INTO page (team_id, page_id, ten, thi_truong, nganh_hang, marketer,
                         pos_shop_id, pos_via, token_idx, the_pancake, mat_dau, kiem_luc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (page_id) DO UPDATE SET
         ten = EXCLUDED.ten, thi_truong = EXCLUDED.thi_truong, nganh_hang = EXCLUDED.nganh_hang,
         marketer = EXCLUDED.marketer, pos_shop_id = EXCLUDED.pos_shop_id, pos_via = EXCLUDED.pos_via,
         token_idx = EXCLUDED.token_idx, the_pancake = EXCLUDED.the_pancake,
         mat_dau = EXCLUDED.mat_dau, kiem_luc = EXCLUDED.kiem_luc, sua_luc = now()`,
      [
        teamId,
        p.pageId,
        p.ten,
        p.thiTruong,
        p.nganhHang,
        p.marketer,
        p.posShopId,
        p.posVia,
        p.tokenIdx,
        JSON.stringify(p.the),
        p.matDau,
        gio(p.kiemLuc),
      ],
    );
  }
  return { nguon: rows.length };
}

// ── công tắc AI ────────────────────────────────────────────────────────────
// NGUỒN DUY NHẤT: ai-enabled.json. Bật đúng tập đó, TẮT mọi page ngoài tập —
// hai vế trong một lượt, nếu không thì page bị gỡ khỏi danh sách sẽ bật mãi mãi.
// Page trong danh sách mà không có dòng `page` (page lạc) được TRẢ RA để liệt kê,
// KHÔNG nuốt im: `UPDATE … WHERE page_id=$1` chạm 0 dòng là công tắc mất câm.
export async function napCongTacAi(pool, goc) {
  const bat = docAiEnabled(goc);
  const r = await pool.query(
    `UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[])), sua_luc = now()
     WHERE bot_ai_bat <> (page_id = ANY($1::text[]))`,
    [bat],
  );
  const coTrongBang = await pool.query(
    "SELECT page_id FROM page WHERE page_id = ANY($1::text[])",
    [bat],
  );
  const co = new Set(coTrongBang.rows.map((x) => x.page_id));
  return {
    nguon: bat.length,
    doiTrangThai: r.rowCount,
    khongCoDongPage: bat.filter((id) => !co.has(id)),
  };
}

// ── hội thoại ──────────────────────────────────────────────────────────────
// Khoá tự nhiên: (page_id, psid). Hội thoại của page LẠC bị bỏ qua và trả ra để
// liệt kê (đo 22/08: 0 hội thoại rơi vào diện này — nhưng phép đo phải tồn tại).
export async function napHoiThoai(pool, goc) {
  const teamId = await idTeam(pool, TEAM_KY_THUAT);
  const { hoiThoai, khoaLa, soVaSurrogate } = docConvState(goc);
  const r = await pool.query("SELECT page_id, id FROM page");
  const idCuaPage = new Map(r.rows.map((x) => [x.page_id, x.id]));
  const boQua = [];
  for (const c of hoiThoai) {
    const pid = idCuaPage.get(c.pageId);
    if (!pid) {
      boQua.push(c.pageId);
      continue;
    }
    await pool.query(
      `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu, trang_thai_truoc,
                              ly_do_cuoi, bat_dau_luc, cham_luc, nguoi_that_luc, chot_don_luc,
                              ai_noi_luc, ai_noi_gi, luot_llm, moc_luot_llm, luot_ai,
                              luot_doi_thu, nhac_da_gui, diem_nong, diem_lead, ho_so)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (page_id, psid) DO UPDATE SET
         trang_thai = EXCLUDED.trang_thai, chu_so_huu = EXCLUDED.chu_so_huu,
         trang_thai_truoc = EXCLUDED.trang_thai_truoc, ly_do_cuoi = EXCLUDED.ly_do_cuoi,
         bat_dau_luc = EXCLUDED.bat_dau_luc, cham_luc = EXCLUDED.cham_luc,
         nguoi_that_luc = EXCLUDED.nguoi_that_luc, chot_don_luc = EXCLUDED.chot_don_luc,
         ai_noi_luc = EXCLUDED.ai_noi_luc, ai_noi_gi = EXCLUDED.ai_noi_gi,
         luot_llm = EXCLUDED.luot_llm, moc_luot_llm = EXCLUDED.moc_luot_llm,
         luot_ai = EXCLUDED.luot_ai, luot_doi_thu = EXCLUDED.luot_doi_thu,
         nhac_da_gui = EXCLUDED.nhac_da_gui, diem_nong = EXCLUDED.diem_nong,
         diem_lead = EXCLUDED.diem_lead, ho_so = EXCLUDED.ho_so, sua_luc = now()`,
      [
        teamId,
        pid,
        c.psid,
        c.trangThai,
        c.chuSoHuu,
        c.trangThaiTruoc,
        c.lyDoCuoi,
        gio(c.batDauLuc),
        gio(c.chamLuc),
        gio(c.nguoiThatLuc),
        gio(c.chotDonLuc),
        gio(c.aiNoiLuc),
        c.aiNoiGi,
        c.luotLlm,
        JSON.stringify(c.mocLuotLlm),
        c.luotAi,
        c.luotDoiThu,
        c.nhacDaGui,
        c.diemNong,
        JSON.stringify(c.diemLead),
        JSON.stringify(c.hoSo),
      ],
    );
  }
  return { nguon: hoiThoai.length, khoaLa, boQuaPageLac: boQua, soVaSurrogate };
}

// ── kịch bản ───────────────────────────────────────────────────────────────
// Khoá tự nhiên: (page_id, phiên bản). Bản của page LẠC bị bỏ qua và trả ra để
// liệt kê — tệp nguồn KHÔNG bị đụng nên không mất gì, nhưng phải nhìn thấy được.
export async function napKichBan(pool, goc) {
  const teamId = await idTeam(pool, TEAM_KY_THUAT);
  const { ban, soTepLichSu, soMucKb, kbRieng, kbKhongCfg, soVaSurrogate } =
    docKichBan(goc);
  const r = await pool.query("SELECT page_id, id FROM page");
  const idCuaPage = new Map(r.rows.map((x) => [x.page_id, x.id]));
  const boQua = [];
  for (const b of ban) {
    const pid = idCuaPage.get(b.pageId);
    if (!pid) {
      boQua.push(`${b.pageId} v${b.phienBan} (${b.nguon})`);
      continue;
    }
    await pool.query(
      `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi,
                             noi_dung_may, nguoi_sua, ghi_chu, sua_luc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (page_id, phien_ban) DO UPDATE SET
         trang_thai = EXCLUDED.trang_thai, noi_dung_nguoi = EXCLUDED.noi_dung_nguoi,
         noi_dung_may = EXCLUDED.noi_dung_may, nguoi_sua = EXCLUDED.nguoi_sua,
         ghi_chu = EXCLUDED.ghi_chu, sua_luc = EXCLUDED.sua_luc`,
      [
        teamId,
        pid,
        b.phienBan,
        b.trangThai,
        JSON.stringify(b.nguoi),
        b.may,
        b.nguoiSua,
        b.ghiChu,
        gio(b.suaLuc),
      ],
    );
  }
  return {
    nguon: ban.length,
    soTepLichSu,
    soMucKb,
    kbRieng,
    kbKhongCfg,
    boQuaPageLac: boQua,
    soVaSurrogate,
  };
}

// ── chạy trọn lượt ─────────────────────────────────────────────────────────
export async function diTruTatCa(pool, goc) {
  const page = await napPage(pool, goc);
  const congTac = await napCongTacAi(pool, goc);
  const hoiThoai = await napHoiThoai(pool, goc);
  const kichBan = await napKichBan(pool, goc);
  return { page, congTac, hoiThoai, kichBan, pageLac: pageLac(goc) };
}
