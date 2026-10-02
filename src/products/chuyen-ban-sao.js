// DANH SÁCH VIỆC CHUYỂN — page đang đọc BẢN SAO theo page → gắn vào sản phẩm gốc (GSP2 · CR-02-10b mục 5 + 5e).
//
// ─── BÀI HỌC REVIEW (a) G2-C1 / G2-C1b ──────────────────────────────────────────────────────────
// «Xong» KHÔNG được suy từ «món POS đã có giá»: hai page cùng gốc × shop mang giá bản sao khác nhau — suy từ giá thì page sau
// tự «xong», giá page đầu thắng ngầm và bị đẩy sang bot page sau. Trạng thái tính theo PAGE × BẢN SAO bằng DẤU QUYẾT ĐỊNH lưu
// trong dữ liệu (`san_pham.doi_soat*`, migration 032), và dấu chỉ có hiệu lực với ĐÚNG gốc × shop lúc quyết — page bị gắn lại
// thì quyết định cũ hết hiệu lực. Vị từ DUY NHẤT là `daQuyet` (GSP3 gọi đúng hàm này — cấm viết lại bản thứ hai).
//
// Lưới migration: CSDL chưa áp 032 ⇒ coi mọi bản sao là «chưa quyết» (KHÔNG ném); chỉ ghi `boQuaPage`/`huyBoQua` mới từ chối
// (409 `chua_migrate`) — im lặng nuốt một lượt ghi còn tệ hơn.
import { tachSoHieu, chuanHoaTen, chuanSku } from "../pos/ten-goc.js";
import { LoiSanPhamGoc } from "./san-pham-goc.js";

const gon = (s) => String(s ?? "").trim();
export const DOI_SOAT_GIA_TRI = Object.freeze(["chep", "giu_gia_mon", "bo_qua"]);
export const HANH_DONG_BO_QUA = "bo_qua_chuyen_page";

/**
 * VỊ TỪ DÙNG CHUNG: bản sao đã được NGƯỜI quyết cho đúng page ở trạng thái HIỆN TẠI chưa?
 *   (doi_soat ∈ {chep, giu_gia_mon}  VÀ  doi_soat_goc = gốc page đang gắn  VÀ  doi_soat_shop = shop page đang gắn)
 *   HOẶC (doi_soat = bo_qua  VÀ  page CHƯA gắn gốc).
 * @param {{doiSoat?: string|null, doiSoatGoc?: string|null, doiSoatShop?: string|null}} banSao
 * @param {{sanPhamGocMa?: string|null, posShopId?: string|null}} page
 */
export function daQuyet(banSao, page) {
  const d = banSao?.doiSoat ?? null;
  const goc = page?.sanPhamGocMa ?? null;
  const shop = page?.posShopId ?? null;
  if (d === "chep" || d === "giu_gia_mon") {
    return goc != null && shop != null && banSao.doiSoatGoc === goc && String(banSao.doiSoatShop) === String(shop);
  }
  if (d === "bo_qua") return goc == null;
  return false;
}

/* ─── CHẤM GỢI Ý (hàm THUẦN) ───────────────────────────────────────────────────────────────── */
// Tên nước/thị trường ở tên page («Kreain Nature PH in Saudi») không nói gì về SẢN PHẨM — bỏ trước khi so.
const TU_BO = new Set([
  "saudi", "ksa", "arabia", "uae", "emirates", "dubai", "kuwait", "oman", "qatar", "bahrain", "jordan", "iraq", "egypt", "gcc",
  "taiwan", "in", "the", "of", "and", "for", "page", "shop", "store", "official",
]);
const tuKhoa = (s) => chuanHoaTen(s).split(" ").filter((t) => t.length >= 2 && !TU_BO.has(t));

/**
 * Điểm 0..1 giữa TÊN PAGE và TÊN MÓN POS: Dice trên tập từ (sau khi bỏ số hiệu đầu tên món — `tachSoHieu` —, bỏ tên nước/thị
 * trường, không phân biệt hoa thường/dấu). Một tên nằm trọn trong tên kia sau khi dính liền (Birth stone ↔ Birthstone) ≥ 0,8.
 * 0 ⇒ KHÔNG gợi ý — không bịa. Tên trống ⇒ 0.
 */
export function chamGoiY(tenPage, tenMon) {
  const a = tuKhoa(tenPage);
  const b = tuKhoa(tachSoHieu(tenMon).ten);
  if (!a.length || !b.length) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let chung = 0;
  for (const t of sa) if (sb.has(t)) chung += 1;
  let diem = (2 * chung) / (sa.size + sb.size);
  const dinhA = a.join("");
  const dinhB = b.join("");
  const ngan = dinhA.length <= dinhB.length ? dinhA : dinhB;
  const dai = ngan === dinhA ? dinhB : dinhA;
  if (ngan.length >= 4 && dai.includes(ngan)) diem = Math.max(diem, 0.8);
  return Math.round(diem * 100) / 100;
}

/* ─── LƯỚI MIGRATION ─────────────────────────────────────────────────────────────────────────── */
async function coCot032(pool) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'san_pham'
        AND column_name IN ('doi_soat', 'doi_soat_luc', 'doi_soat_goc', 'doi_soat_shop')`,
  );
  return r.rows[0].n === 4;
}

const LOAI_THU_TU = { goc: 0, noi: 1, moi: 2 };

/**
 * Mỗi page có bản sao (`san_pham.page_id = page.id AND nguon <> 'pos'`) MỘT dòng, trừ page `xong`.
 * Trả `{ viec, dem, shopCuaTeam, gocCuaTeam }`; `dem.chuaXong = chuaGan + choDoiSoat` là số GSP4 chờ về 0 (`bo_qua` tính là đã quyết).
 */
export async function dsViecChuyen(pool, teamId) {
  const co032 = await coCot032(pool);
  const cot = co032
    ? "s.doi_soat, s.doi_soat_luc, s.doi_soat_goc, s.doi_soat_shop"
    : "NULL::text AS doi_soat, NULL::timestamptz AS doi_soat_luc, NULL::text AS doi_soat_goc, NULL::text AS doi_soat_shop";
  const [bs, gocR, monR, kn] = await Promise.all([
    pool.query(
      `SELECT s.id, s.ten, s.bien_the, s.page_id, ${cot},
              p.page_id AS page_fb, p.ten AS page_ten, p.marketer AS page_marketer, p.san_pham_goc_ma, p.pos_shop_id,
              (SELECT count(*)::int FROM anh_san_pham a WHERE a.san_pham_id = s.id AND a.team_id = s.team_id) AS so_anh,
              (SELECT a.duong FROM anh_san_pham a WHERE a.san_pham_id = s.id AND a.team_id = s.team_id ORDER BY a.thu_tu, a.id LIMIT 1) AS anh_dau,
              COALESCE((SELECT json_agg(json_build_object('soLuong', g.so_luong, 'gia', g.gia::float8, 'tienTe', g.tien_te,
                          'giaGoc', g.gia_goc::float8, 'khuyenMai', g.khuyen_mai, 'phiShip', g.phi_ship::float8,
                          'mienShip', g.mien_ship, 'bat', g.bat, 'nhan', g.nhan) ORDER BY g.so_luong)
                         FROM goi_gia g WHERE g.san_pham_id = s.id AND g.team_id = s.team_id), '[]'::json) AS bac
         FROM san_pham s JOIN page p ON p.id = s.page_id AND p.team_id = s.team_id
        WHERE s.team_id = $1 AND s.nguon <> 'pos'
        ORDER BY p.id, s.id`,
      [teamId],
    ),
    pool.query("SELECT id, ma_goc, ten, so_hieu, sku, marketer FROM san_pham_goc WHERE team_id = $1", [teamId]),
    pool.query(
      `SELECT ma, ten, sku, ma_goc FROM san_pham WHERE team_id = $1 AND nguon = 'pos' ORDER BY ma`, [teamId],
    ),
    pool.query("SELECT shop_id, market FROM ket_noi_pos WHERE team_id = $1", [teamId]),
  ]);
  const gocTheoMa = new Map(gocR.rows.map((g) => [g.ma_goc, g]));
  const gocTheoSku = new Map();
  for (const g of gocR.rows) {
    const k = chuanSku(g.sku) ?? (g.so_hieu != null ? chuanSku(g.so_hieu) : null);
    if (k && !gocTheoSku.has(k)) gocTheoSku.set(k, g);
  }
  const thiTruongShop = new Map(kn.rows.map((k) => [String(k.shop_id), k.market]));
  const monTheoShop = new Map();
  for (const m of monR.rows) {
    const shop = m.ma.split(":")[0];
    if (!monTheoShop.has(shop)) monTheoShop.set(shop, []);
    monTheoShop.get(shop).push(m);
  }
  const gocRa = (g) => (g ? { id: String(g.id), maGoc: g.ma_goc, ten: g.ten || "", marketer: g.marketer || "" } : null);

  const theoPage = new Map();
  for (const r of bs.rows) {
    const k = String(r.page_id);
    if (!theoPage.has(k)) {
      theoPage.set(k, {
        pageId: k, pageFb: r.page_fb, ten: r.page_ten || "", marketerPage: r.page_marketer || "",
        sanPhamGocMa: r.san_pham_goc_ma ?? null, posShopId: r.pos_shop_id ?? null, banSao: [],
      });
    }
    theoPage.get(k).banSao.push({
      id: String(r.id), ten: r.ten || "", bienThe: r.bien_the || "", bac: r.bac || [], soAnh: r.so_anh, anhDau: r.anh_dau || null,
      doiSoat: r.doi_soat ?? null, doiSoatGoc: r.doi_soat_goc ?? null, doiSoatShop: r.doi_soat_shop ?? null,
    });
  }

  const viec = [];
  const dem = { chuaGan: 0, choDoiSoat: 0, boQua: 0, xong: 0, chuaXong: 0 };
  const boQua = [];
  for (const p of theoPage.values()) {
    const page = { sanPhamGocMa: p.sanPhamGocMa, posShopId: p.posShopId };
    const chuaQuyet = p.banSao.filter((b) => !daQuyet(b, page));
    const daGan = p.sanPhamGocMa != null && p.posShopId != null;
    let trangThai;
    if (!daGan) trangThai = chuaQuyet.length ? "chua_gan" : "bo_qua";
    else trangThai = chuaQuyet.length ? "cho_doi_soat" : "xong";
    if (trangThai === "xong") { dem.xong += 1; continue; }
    if (trangThai === "chua_gan") dem.chuaGan += 1;
    else if (trangThai === "cho_doi_soat") dem.choDoiSoat += 1;
    else { dem.boQua += 1; boQua.push(p.pageId); }

    const shopCoMat = p.posShopId != null ? String(p.posShopId) : null;
    const goc = gocRa(gocTheoMa.get(p.sanPhamGocMa));
    let goiY = [];
    if (trangThai === "chua_gan" && shopCoMat) {
      goiY = (monTheoShop.get(shopCoMat) || []).map((m) => {
        const diem = chamGoiY(p.ten, m.ten);
        if (!(diem > 0)) return null;
        const o = { posMa: m.ma, tenMon: m.ten || "", sku: m.sku || null, diem };
        if (m.ma_goc) return { ...o, loai: "goc", goc: gocRa(gocTheoMa.get(m.ma_goc)) };
        const sku = chuanSku(m.sku) ?? (tachSoHieu(m.ten || "").soHieu ? chuanSku(tachSoHieu(m.ten).soHieu) : null);
        const g = sku ? gocTheoSku.get(sku) : null;
        return g ? { ...o, loai: "noi", gocTheoSku: gocRa(g) } : { ...o, loai: "moi" };
      }).filter(Boolean)
        .sort((a, b) => b.diem - a.diem || LOAI_THU_TU[a.loai] - LOAI_THU_TU[b.loai] || a.posMa.localeCompare(b.posMa))
        .slice(0, 3);
    }
    viec.push({
      pageId: p.pageId, pageFb: p.pageFb, ten: p.ten, marketerPage: p.marketerPage,
      shop: shopCoMat ? { id: shopCoMat, market: thiTruongShop.get(shopCoMat) ?? null } : null,
      goc: daGan ? goc : null, trangThai, banSao: p.banSao, goiY,
    });
  }
  dem.chuaXong = dem.chuaGan + dem.choDoiSoat;

  // Lý do «không chuyển» nằm ở NHẬT KÝ (không thêm cột): lấy dòng mới nhất của từng page `bo_qua`.
  if (boQua.length) {
    const lr = await pool.query(
      `SELECT DISTINCT ON (doi_tuong_id) doi_tuong_id, xay_ra_luc, sau->>'lyDo' AS ly_do
         FROM nhat_ky WHERE team_id = $1 AND hanh_dong = $3 AND doi_tuong = 'page' AND doi_tuong_id = ANY($2::text[])
        ORDER BY doi_tuong_id, xay_ra_luc DESC, id DESC`,
      [teamId, boQua, HANH_DONG_BO_QUA],
    );
    const ly = new Map(lr.rows.map((r) => [r.doi_tuong_id, { lyDo: r.ly_do || "", luc: r.xay_ra_luc }]));
    for (const v of viec) if (v.trangThai === "bo_qua") v.boQua = ly.get(v.pageId) || { lyDo: "", luc: null };
  }
  return {
    viec, dem,
    // Cho ô chọn tay ở màn: page chưa có shop ⇒ chọn shop của team; không gợi ý nào đúng ⇒ chọn một gốc của team.
    shopCuaTeam: kn.rows.map((k) => ({ id: String(k.shop_id), market: k.market ?? null })),
    gocCuaTeam: gocR.rows.map((g) => gocRa(g)),
  };
}

async function giaoDich(pool, fn) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const kq = await fn(khach);
    await khach.query("COMMIT");
    return kq;
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

async function batBuocCo032(db) {
  if (!(await coCot032(db))) {
    throw new LoiSanPhamGoc("CSDL chưa áp migration 032 (đối soát bản sao) — chưa ghi được quyết định", "chua_migrate", 409);
  }
}

/**
 * Ghi «KHÔNG CHUYỂN» (page chết / thôi bán): mọi bản sao CHƯA quyết của page ⇒ `bo_qua`, goc/shop = NULL. Page đang gắn gốc ⇒ 409
 * (gỡ gắn trước — nếu không «không chuyển» và «đã gắn» đứng cùng lúc). Một giao dịch.
 */
export async function boQuaPage(pool, teamId, pageId, lyDo) {
  const ly = gon(lyDo);
  if (!ly) throw new LoiSanPhamGoc("cho biết lý do không chuyển (page chết / thôi bán …)", "thieu_ly_do");
  if (ly.length > 500) throw new LoiSanPhamGoc("lý do dài quá 500 ký tự", "ly_do_dai");
  return giaoDich(pool, async (db) => {
    await batBuocCo032(db);
    const p = (await db.query(
      "SELECT id, page_id, ten, san_pham_goc_ma FROM page WHERE team_id = $1 AND id = $2 FOR UPDATE", [teamId, String(pageId ?? "")],
    )).rows[0];
    if (!p) throw new LoiSanPhamGoc("không có page này trong team", "khong_co_page", 404);
    if (p.san_pham_goc_ma) {
      throw new LoiSanPhamGoc(`page đang gắn sản phẩm «${p.san_pham_goc_ma}» — gỡ gắn trước rồi mới «không chuyển»`, "page_dang_gan", 409);
    }
    const tong = (await db.query(
      "SELECT count(*)::int AS n FROM san_pham WHERE team_id = $1 AND page_id = $2 AND nguon <> 'pos'", [teamId, p.id],
    )).rows[0].n;
    if (!tong) throw new LoiSanPhamGoc("page này không có bản sao sản phẩm nào để chuyển", "khong_co_ban_sao", 404);
    const r = await db.query(
      `UPDATE san_pham SET doi_soat = 'bo_qua', doi_soat_luc = now(), doi_soat_goc = NULL, doi_soat_shop = NULL, sua_luc = now()
        WHERE team_id = $1 AND page_id = $2 AND nguon <> 'pos' AND doi_soat IS DISTINCT FROM 'bo_qua'`,
      [teamId, p.id],
    );
    return { pageId: String(p.id), pageFb: p.page_id, ten: p.ten || "", soBanSao: tong, soDoi: r.rowCount, lyDo: ly };
  });
}

/** Bỏ quyết định «không chuyển» (lùi): bản sao `bo_qua` của page ⇒ NULL. Không có gì để bỏ ⇒ 404. */
export async function huyBoQua(pool, teamId, pageId) {
  return giaoDich(pool, async (db) => {
    await batBuocCo032(db);
    const p = (await db.query(
      "SELECT id, page_id, ten FROM page WHERE team_id = $1 AND id = $2 FOR UPDATE", [teamId, String(pageId ?? "")],
    )).rows[0];
    if (!p) throw new LoiSanPhamGoc("không có page này trong team", "khong_co_page", 404);
    const r = await db.query(
      `UPDATE san_pham SET doi_soat = NULL, doi_soat_luc = NULL, doi_soat_goc = NULL, doi_soat_shop = NULL, sua_luc = now()
        WHERE team_id = $1 AND page_id = $2 AND nguon <> 'pos' AND doi_soat = 'bo_qua'`,
      [teamId, p.id],
    );
    if (!r.rowCount) throw new LoiSanPhamGoc("page này chưa ghi «không chuyển»", "khong_bo_qua", 404);
    return { pageId: String(p.id), pageFb: p.page_id, ten: p.ten || "", soDoi: r.rowCount };
  });
}
