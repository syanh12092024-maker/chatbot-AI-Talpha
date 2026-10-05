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
import { createHash } from "node:crypto";
import { tachSoHieu, chuanHoaTen, chuanSku } from "../pos/ten-goc.js";
import { LoiSanPhamGoc } from "./san-pham-goc.js";
import { themAnh, boAnh } from "./anh-san-pham.js";
import { HE_SO_TE } from "../pos/tao-don.js";
import { docSanPhamGoiGia } from "./catalog.js";   // GSP3b — bộ đọc CHUNG của bot (rap-prompt.js re-export chính hàm này)

// goi_gia lưu đơn vị NHỎ (×HE_SO_TE — nap-tu-kb.js); màn và người đối soát đọc đơn vị LỚN (99 SAR). Quy đổi MỘT chỗ, ở đây —
// màn không tự chia (cùng quy ước `giaCuaMon` ở san-pham-goc.js).
const lonTheoTe = (v, te) => (v == null ? v : Number(v) / (HE_SO_TE[String(te || "").toUpperCase()] || 1));
export const bacDonViLon = (bac) => (bac || []).map((t) => ({
  ...t, gia: lonTheoTe(t.gia, t.tienTe), giaGoc: lonTheoTe(t.giaGoc, t.tienTe), phiShip: lonTheoTe(t.phiShip, t.tienTe),
}));

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
      id: String(r.id), ten: r.ten || "", bienThe: r.bien_the || "", bac: bacDonViLon(r.bac), soAnh: r.so_anh, anhDau: r.anh_dau || null,
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

/* ═══ GSP3 · ĐỐI SOÁT GIÁ + ẢNH THEO ĐƠN VỊ GỐC × SHOP (CR-02-10b mục 5 + 5e · review (a) G3-C1) ═══════════════════════════
 * Một lượt = MỘT gốc × MỘT shop, KHÔNG phải một page: mọi page cùng gắn gốc × shop đọc CHUNG một bảng giá (món POS — catalog.js),
 * nên chép theo page là để page bấm trước thắng ngầm rồi `saveProduct` đẩy giá đó sang bot + cửa tiền của mọi page anh em.
 * Bảng giá khác nhau giữa các bản sao (hoặc với giá món đang có) ⇒ 409 `lech_gia_giua_page` — NGƯỜI chọn một bảng.
 *   · «bản sao chưa quyết» = `!daQuyet(...)` (vị từ dùng chung phía trên — cấm viết lại).
 *   · «bảng» so trên TRỌN hàng `goi_gia` trừ khoá (`to_jsonb − id/san_pham_id/team_id`), giá trị THÔ trong CSDL (đơn vị nhỏ) —
 *     không so sau quy đổi số thực. Chép thì qua cửa lưu giá ĐÃ CÓ (`luuGia` → `saveProduct` chỉ-giá, nơi gọi tiêm vào) với
 *     `offers` ở đơn vị LỚN; số trả lên màn cũng đơn vị lớn (`bacDonViLon`). KHÔNG lấy `bac` của `dsViecChuyen` làm nguồn
 *     (nó đã là đơn vị lớn — quy đổi hai lần ⇒ giá ÷100).
 *   · Bản sao giữ NGUYÊN: chỉ thêm `doi_soat*` (không sửa bậc/ảnh/tên, không chạm `sua_luc`, không đặt `pos_ma`).
 *   · (đối kháng vòng 2) Lựa chọn ràng với thứ người ĐÃ THẤY: POST mang `dauDonVi` của GET, đơn vị đổi giữa hai lượt ⇒ 409
 *     `don_vi_da_doi` (F1). Tiền tệ chỉ chặn bảng SẼ GHI; bản sao thua mang tệ sai vẫn đối soát được (F4).
 */

// Thị trường (`ket_noi_pos.market`) → tiền tệ. Hằng RIÊNG của đối soát: ngoài bảng ⇒ `thi_truong_la`, dừng, không đoán.
// Taiwan cố ý vắng: `HE_SO_TE` (tao-don.js) không có TWD nên `saveProduct` sẽ từ chối bậc của nó.
export const TIEN_TE_THI_TRUONG = Object.freeze({ Saudi: "SAR", UAE: "AED", Kuwait: "KWD", Qatar: "QAR", Oman: "OMR", Bahrain: "BHD" });

// Chín cột bậc giá `saveProduct` ghi được (`src/admin-v3/operations.js` INSERT goi_gia — ca A0 đối chiếu với lược đồ thật). Phép
// SO dùng trọn hàng nên cột mới của `goi_gia` tự vào phép so; phép CHÉP chỉ chép được chín cột này ⇒ bảng thắng mang cột lạ có
// giá trị ⇒ 409 `cot_bac_la` (chép thiếu một cột là đổi thứ khách trả mà không ai chọn).
export const COT_BAC_CHEP = Object.freeze(["so_luong", "gia", "tien_te", "gia_goc", "khuyen_mai", "phi_ship", "mien_ship", "bat", "nhan"]);

const loi409 = (thongDiep, ma, duLieu) => Object.assign(new LoiSanPhamGoc(thongDiep, ma, 409), { duLieu });
const kyBang = (bac) => bac.map((x) => x.ky).join("\n");   // bậc đã xếp theo so_luong (UNIQUE trong một sản phẩm)
// Bảng có bậc mang tiền tệ ≠ tiền tệ thị trường (so CHÍNH XÁC — `saveProduct` cũng tra HE_SO_TE đúng chữ). Thị trường lạ ⇒ không phán.
const bacSaiTe = (bac, tienTe) => tienTe != null && bac.some((x) => x.dong.tien_te !== tienTe);

/**
 * DẤU ĐƠN VỊ (đối kháng GSP3 vòng 2 · F1): băm thứ người chọn ĐÃ THẤY ở khung (GET) để cửa ghi (POST) từ chối khi đơn vị đổi giữa
 * hai lượt — page gắn thêm / gỡ ra (kể cả page chưa có bản sao: nó nằm trong danh sách «page sẽ đổi giá»), tập bản sao chưa quyết
 * đổi, bảng một bản sao đổi, giá món đổi. Không có dấu thì
 * `chon` chỉ trỏ banSaoId: bảng của page mới gắn THUA NGẦM, hoặc một bảng chưa ai thấy được chép lên món (đúng loại G3-C1).
 * Băm trên giá trị GỐC trong CSDL (`ky` = trọn hàng goi_gia dạng jsonb text, không qua quy đổi). Cố ý KHÔNG gồm: `xmin` của món
 * (đồng bộ danh mục POS upsert dòng món — `src/pos/doc-danh-muc.js` — ⇒ 409 giả mỗi lượt đồng bộ) và ảnh (không đổi tiền; ảnh của
 * lượt lùi được theo `nguon='kb'`), `market` (đổi thị trường thì kiểm tiền tệ / `thi_truong_la` đã chặn mọi lượt ghi sai tệ).
 */
function dauCuaDonVi(dv) {
  const tho = JSON.stringify({
    v: 1, goc: String(dv.goc.id), shop: dv.shop,
    mon: dv.mon.map((m) => [m.ma, kyBang(m.bac)]),
    page: dv.pages.map((p) => String(p.id)),
    banSao: dv.banSao.filter((b) => !b.daQuyet).map((b) => [b.id, b.pageId, kyBang(b.bac)]),
  });
  return createHash("sha256").update(tho).digest("hex").slice(0, 32);
}
const bacRa = (bac) => bacDonViLon(bac.map(({ dong: d }) => ({
  soLuong: d.so_luong, gia: d.gia, tienTe: d.tien_te, giaGoc: d.gia_goc ?? null, khuyenMai: d.khuyen_mai ?? "",
  phiShip: d.phi_ship ?? null, mienShip: d.mien_ship ?? null, bat: d.bat !== false, nhan: d.nhan ?? "",
})));
const anhRa = (a) => ({ id: String(a.id), duong: a.duong, nhan: a.nhan || "", thuTu: a.thu_tu, nguon: a.nguon });
// Bậc THÔ (đơn vị nhỏ) → `offers` của `saveProduct` (đơn vị LỚN — nó nhân HE_SO_TE đúng một lần). ĐỦ cột, kể cả bậc tắt.
const offerTu = ({ dong: d }) => ({
  so_luong: d.so_luong, price: lonTheoTe(d.gia, d.tien_te), tien_te: d.tien_te,
  gia_goc: d.gia_goc == null ? null : lonTheoTe(d.gia_goc, d.tien_te), khuyen_mai: d.khuyen_mai ?? "",
  phi_ship: d.phi_ship == null ? null : lonTheoTe(d.phi_ship, d.tien_te), mien_ship: d.mien_ship ?? null,
  bat: d.bat !== false, nhan: d.nhan ?? "",
});

async function docBacTheo(db, teamId, ids) {
  const ra = new Map();
  if (!ids.length) return ra;
  const r = await db.query(
    `SELECT g.san_pham_id, to_jsonb(g) - 'id' - 'san_pham_id' - 'team_id' AS dong,
            (to_jsonb(g) - 'id' - 'san_pham_id' - 'team_id')::text AS ky
       FROM goi_gia g WHERE g.team_id = $1 AND g.san_pham_id = ANY($2::bigint[]) ORDER BY g.san_pham_id, g.so_luong`,
    [teamId, ids.map(String)],
  );
  for (const x of r.rows) {
    const k = String(x.san_pham_id);
    if (!ra.has(k)) ra.set(k, []);
    ra.get(k).push({ dong: x.dong, ky: x.ky });
  }
  return ra;
}

/** Dữ liệu THÔ của một đơn vị gốc × shop: món POS (+ bậc, ảnh, version) · page đang gắn · bản sao của các page đó (+ dấu). */
async function docDonViTho(db, teamId, gocId, shopId, co032) {
  const id = String(gocId ?? "");
  const g = /^[1-9]\d*$/.test(id)
    ? (await db.query("SELECT id, ma_goc, ten, marketer FROM san_pham_goc WHERE team_id = $1 AND id = $2", [teamId, id])).rows[0]
    : null;
  if (!g) throw new LoiSanPhamGoc("không có sản phẩm gốc này trong team", "khong_co", 404);
  const shop = gon(shopId);
  if (!shop) throw new LoiSanPhamGoc("chọn shop POS của đơn vị đối soát", "thieu_shop");
  const [kn, monR, pageR] = await Promise.all([
    db.query("SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2 LIMIT 1", [teamId, shop]),
    db.query(
      `SELECT id, ma, ten, xmin::text AS version FROM san_pham
        WHERE team_id = $1 AND nguon = 'pos' AND ma_goc = $2 AND split_part(ma, ':', 1) = $3 ORDER BY ma`,
      [teamId, g.ma_goc, shop],
    ),
    db.query(
      `SELECT id, page_id, ten, marketer, san_pham_goc_ma, pos_shop_id FROM page
        WHERE team_id = $1 AND san_pham_goc_ma = $2 AND pos_shop_id = $3 ORDER BY id`,
      [teamId, g.ma_goc, shop],
    ),
  ]);
  if (!monR.rowCount) throw new LoiSanPhamGoc(`sản phẩm «${g.ma_goc}» chưa bán ở shop ${shop}`, "shop_ngoai_san_pham", 404);
  const trang = new Map(pageR.rows.map((p) => [String(p.id), p]));
  const cot = co032 ? "doi_soat, doi_soat_goc, doi_soat_shop"
    : "NULL::text AS doi_soat, NULL::text AS doi_soat_goc, NULL::text AS doi_soat_shop";
  const bs = trang.size ? (await db.query(
    `SELECT id, page_id, ten, ${cot} FROM san_pham
      WHERE team_id = $1 AND nguon <> 'pos' AND page_id = ANY($2::bigint[]) ORDER BY page_id, id`,
    [teamId, [...trang.keys()]],
  )).rows : [];
  const ids = [...monR.rows.map((m) => String(m.id)), ...bs.map((b) => String(b.id))];
  const [bac, anhR] = await Promise.all([
    docBacTheo(db, teamId, ids),
    db.query(
      `SELECT id, san_pham_id, duong, nhan, thu_tu, nguon FROM anh_san_pham
        WHERE team_id = $1 AND san_pham_id = ANY($2::bigint[]) ORDER BY san_pham_id, thu_tu, id`,
      [teamId, ids],
    ),
  ]);
  const anh = new Map();
  for (const a of anhR.rows) {
    const k = String(a.san_pham_id);
    if (!anh.has(k)) anh.set(k, []);
    anh.get(k).push(a);
  }
  const market = kn.rows[0]?.market ?? null;
  return {
    goc: g, shop, market,
    tienTe: market != null && Object.hasOwn(TIEN_TE_THI_TRUONG, String(market).trim()) ? TIEN_TE_THI_TRUONG[String(market).trim()] : null,
    pages: pageR.rows,
    mon: monR.rows.map((m) => ({ id: String(m.id), ma: m.ma, ten: m.ten || "", version: m.version,
      bac: bac.get(String(m.id)) || [], anh: anh.get(String(m.id)) || [] })),
    banSao: bs.map((b) => {
      const p = trang.get(String(b.page_id));
      return {
        id: String(b.id), pageId: String(b.page_id), page: p, ten: b.ten || "",
        bac: bac.get(String(b.id)) || [], anh: anh.get(String(b.id)) || [],
        doiSoat: b.doi_soat ?? null,
        daQuyet: daQuyet({ doiSoat: b.doi_soat, doiSoatGoc: b.doi_soat_goc, doiSoatShop: b.doi_soat_shop },
          { sanPhamGocMa: p.san_pham_goc_ma, posShopId: p.pos_shop_id }),
      };
    }),
  };
}

const banSaoRa = (b) => ({ id: b.id, pageId: b.pageId, pageFb: b.page.page_id, tenPage: b.page.ten || b.page.page_id,
  marketerPage: b.page.marketer || "" });
const pageRa = (dv) => (p) => ({
  pageId: String(p.id), pageFb: p.page_id, ten: p.ten || p.page_id, marketer: p.marketer || "",
  trangThai: dv.banSao.some((b) => b.pageId === String(p.id) && !b.daQuyet) ? "cho_doi_soat" : "xong",
});

/**
 * BỘ ĐỌC một đơn vị gốc × shop cho khung đối soát. Giá/giá gốc/ship ở đơn vị LỚN (quy đổi MỘT chỗ — tầng này).
 * `bangKhacNhau` = các bảng KHÁC NHAU giữa bản sao CHƯA quyết (có bậc) và giá món đang có; `bang` ở bản sao/món trỏ vào nó.
 * `pageChuaGanCungMon` = page `chua_gan` có gợi ý số 1 trỏ món của đơn vị (cùng bộ chấm của danh sách việc chuyển) — báo trước,
 * không chặn. CSDL chưa áp 032 ⇒ đọc được (`co032:false`, mọi bản sao «chưa quyết»), chỉ cửa GHI từ chối.
 * `dauDonVi` = dấu của đúng đơn vị vừa đọc (`dauCuaDonVi`) — màn gửi lại nguyên trong POST. `banSao[].tienTeSai` = có bậc
 * mang tiền tệ ≠ thị trường: bảng đó không chọn làm bảng thắng được (F4) — bản sao vẫn đối soát được khi nó THUA.
 */
export async function donViDoiSoat(pool, teamId, gocId, shopId) {
  const co032 = await coCot032(pool);
  const dv = await docDonViTho(pool, teamId, gocId, shopId, co032);
  return dungDonViRa(pool, teamId, dv, co032);
}

async function dungDonViRa(pool, teamId, dv, co032) {
  const nhom = new Map();
  const them = (bac, f) => {
    if (!bac.length) return;
    const k = kyBang(bac);
    if (!nhom.has(k)) nhom.set(k, { bac, banSaoIds: [], monPosMa: [] });
    f(nhom.get(k));
  };
  for (const b of dv.banSao) if (!b.daQuyet) them(b.bac, (n) => n.banSaoIds.push(b.id));
  for (const m of dv.mon) them(m.bac, (n) => n.monPosMa.push(m.ma));
  const thuTu = new Map([...nhom.keys()].map((k, i) => [k, i]));
  const monCua = new Set(dv.mon.map((m) => m.ma));
  const { viec } = await dsViecChuyen(pool, teamId);
  return {
    co032,
    dauDonVi: dauCuaDonVi(dv),
    goc: { id: String(dv.goc.id), maGoc: dv.goc.ma_goc, ten: dv.goc.ten || "", marketer: dv.goc.marketer || "" },
    shop: { id: dv.shop, market: dv.market, tienTe: dv.tienTe },
    mon: dv.mon.map((m) => ({ posMa: m.ma, id: m.id, ten: m.ten, bac: bacRa(m.bac), anh: m.anh.map(anhRa),
      bang: m.bac.length ? thuTu.get(kyBang(m.bac)) : null })),
    banSao: dv.banSao.map((b) => ({ ...banSaoRa(b), ten: b.ten, bac: bacRa(b.bac), anh: b.anh.map(anhRa), doiSoat: b.doiSoat,
      daQuyet: b.daQuyet, bang: !b.daQuyet && b.bac.length ? thuTu.get(kyBang(b.bac)) : null, tienTeSai: bacSaiTe(b.bac, dv.tienTe) })),
    pageDonVi: dv.pages.map(pageRa(dv)),
    pageChuaGanCungMon: viec.filter((v) => v.trangThai === "chua_gan" && v.goiY[0] && monCua.has(v.goiY[0].posMa))
      .map((v) => ({ pageId: v.pageId, ten: v.ten || v.pageFb })),
    bangKhacNhau: [...nhom.values()].map((n) => ({ bac: bacRa(n.bac), banSaoIds: n.banSaoIds, laGiaMon: n.monPosMa.length > 0,
      monPosMa: n.monPosMa })),
  };
}

/**
 * CỬA GHI đối soát một đơn vị gốc × shop. `than = { gocId, shopId, dauDonVi, cap?: [{banSaoId, posMa}], chon?: {<posMa>: {banSaoId} | 'giu_gia_mon'} }`.
 * `dauDonVi` BẮT BUỘC = dấu `donViDoiSoat` trả cho khung người đang xem; thiếu ⇒ 409 `thieu_dau_don_vi`, lệch ⇒ 409 `don_vi_da_doi`
 * (cả hai kèm `donVi` mới để màn vẽ lại, 0 ghi, 0 đẩy) — không có đường «không dấu».
 * `deps.luuGia(posMa, {offers, version})` = cửa lưu giá có sẵn (khoSanPhamGoc.luuGia → saveProduct chỉ-giá, đẩy bản chép TRONG
 * giao dịch, đẩy hỏng ⇒ không lưu); `deps.dayMon(monId)` = cùng bước đẩy đó nhưng không ghi giá (nhánh bảng thắng = bảng món).
 * Thứ tự: KIỂM HẾT (sai một điều ⇒ 409, không ghi gì) → mỗi món: ảnh → giá/đẩy → (hỏng ⇒ gỡ ảnh vừa thêm) → ĐÁNH DẤU một câu.
 */
export async function doiSoatDonVi(pool, teamId, { gocId, shopId, cap, chon, dauDonVi } = {}, { luuGia, dayMon } = {}) {
  if (typeof luuGia !== "function" || typeof dayMon !== "function") {
    throw new LoiSanPhamGoc("máy chủ chưa nối cửa lưu giá / đẩy bản chép cho đối soát", "chua_noi", 500);
  }
  if (!(await coCot032(pool))) {
    throw new LoiSanPhamGoc("CSDL chưa áp migration 032 — đối soát ghi dấu doi_soat nên không chạy nửa vời", "chua_ap_032", 409);
  }
  const dv = await docDonViTho(pool, teamId, gocId, shopId, true);
  const donVi = { gocId: String(dv.goc.id), maGoc: dv.goc.ma_goc, tenGoc: dv.goc.ten || "", shopId: dv.shop, market: dv.market };
  const chuaQuyet = dv.banSao.filter((b) => !b.daQuyet);
  if (!chuaQuyet.length) return { ...donVi, daXong: true };

  // ⓪ DẤU ĐƠN VỊ (F1): tính lại TRONG lượt, trên CHÍNH dữ liệu kế hoạch ghi dưới đây dùng. Đơn vị người chọn đã thấy ≠ đơn vị lúc bấm
  // ⇒ dừng trước mọi kiểm khác (chúng đang chạy trên một đơn vị người chưa thấy), trả đơn vị mới để màn vẽ lại cho người chọn lại.
  const thieuDau = typeof dauDonVi !== "string" || !dauDonVi;
  if (thieuDau || dauDonVi !== dauCuaDonVi(dv)) {
    throw loi409(thieuDau
      ? "thân không mang dấu đơn vị đã xem — mở khung đối soát (đọc đơn vị) rồi chọn; chưa ghi gì"
      : `đơn vị «${dv.goc.ma_goc}» · shop ${dv.shop} đã đổi trong lúc khung mở (page gắn/gỡ, bảng bản sao hoặc giá món đổi) — `
        + "xem lại các bảng rồi chọn lại; chưa ghi gì", thieuDau ? "thieu_dau_don_vi" : "don_vi_da_doi",
    { donVi: await dungDonViRa(pool, teamId, dv, true) });
  }

  // ① Cặp bản sao → món. Gốc có đúng 1 món ⇒ mọi bản sao vào món đó; >1 món ⇒ `cap` phải phủ MỌI bản sao chưa quyết.
  const monTheoMa = new Map(dv.mon.map((m) => [m.ma, m]));
  const laChuaQuyet = new Set(chuaQuyet.map((b) => b.id));
  const capVao = new Map();
  let capSai = "";
  for (const x of Array.isArray(cap) ? cap : []) {
    const b = String(x?.banSaoId ?? "");
    const m = gon(x?.posMa);
    if (!laChuaQuyet.has(b)) capSai ||= `bản sao #${b} không thuộc đơn vị hoặc đã quyết`;
    else if (!monTheoMa.has(m)) capSai ||= `«${m}» không phải món của «${dv.goc.ma_goc}» ở shop ${dv.shop}`;
    else if (capVao.has(b) && capVao.get(b) !== m) capSai ||= `bản sao #${b} được cặp vào hai món`;
    else capVao.set(b, m);
  }
  if (dv.mon.length === 1) for (const b of chuaQuyet) if (!capVao.has(b.id)) capVao.set(b.id, dv.mon[0].ma);
  const thieuCap = chuaQuyet.filter((b) => !capVao.has(b.id));
  if (capSai || thieuCap.length) {
    throw loi409(capSai || `sản phẩm có ${dv.mon.length} món ở shop này — chọn món cho từng bản sao (${thieuCap.length} bản sao chưa cặp)`,
      "can_chon_mon", { mon: dv.mon.map((m) => ({ posMa: m.ma, ten: m.ten })), banSao: chuaQuyet.map(banSaoRa) });
  }
  // ② Thị trường → tiền tệ (không đoán).
  if (!dv.tienTe) {
    throw loi409(`thị trường «${dv.market ?? "chưa khai"}» của shop ${dv.shop} không có trong bảng tiền tệ đối soát — dừng, không đoán`,
      "thi_truong_la", { market: dv.market, biet: Object.keys(TIEN_TE_THI_TRUONG) });
  }
  // ③ Tiền tệ (F4 · đối kháng vòng 2): kiểm CHỈ trên bảng SẼ GHI lên món (bảng thắng ≠ giá món — ngay sau khi chọn được bảng thắng
  // ở ④) và nêu ra trên các bảng ĐỀ XUẤT khi chưa chọn (409 `lech_gia_giua_page` đánh `tienTeSai` từng bảng). Bản sao THUA mang tệ
  // sai KHÔNG chặn đơn vị: bảng nó không lên món, không ra bot, không vào cửa tiền ⇒ đánh `giu_gia_mon` như mọi bản sao thua.
  const teSai = (bac) => bacSaiTe(bac, dv.tienTe);
  const lechTe = [];
  // ④ Bảng của từng món đích: bảng các bản sao cặp vào (bản sao KHÔNG có bậc không đề xuất giá) ∪ bảng món đang có.
  const keHoach = []; const lech = []; const chonSai = []; const khongGiaMon = []; const khongGia = []; const cotLa = [];
  for (const m of dv.mon) {
    const banSaoMon = chuaQuyet.filter((b) => capVao.get(b.id) === m.ma);
    if (!banSaoMon.length) continue;
    const kyMon = m.bac.length ? kyBang(m.bac) : null;
    const nhom = new Map();
    for (const b of banSaoMon) {
      if (!b.bac.length) continue;
      const k = kyBang(b.bac);
      if (!nhom.has(k)) nhom.set(k, { ky: k, bac: b.bac, banSao: [] });
      nhom.get(k).banSao.push(b);
    }
    if (kyMon && !nhom.has(kyMon)) nhom.set(kyMon, { ky: kyMon, bac: m.bac, banSao: [] });
    const c = chon != null && typeof chon === "object" && Object.hasOwn(chon, m.ma) ? chon[m.ma] : undefined;
    let thang;
    if (c === "giu_gia_mon") {
      if (!kyMon) { khongGiaMon.push(m.ma); continue; }
      thang = { ky: kyMon, bac: m.bac, banSao: null };
    } else if (c !== undefined) {
      const b = banSaoMon.find((x) => x.id === String(c?.banSaoId ?? ""));
      if (!b || !b.bac.length) { chonSai.push(m.ma); continue; }
      thang = { ky: kyBang(b.bac), bac: b.bac, banSao: b };
    } else if (!nhom.size) { khongGia.push(m.ma); continue; }
    else if (nhom.size > 1) { lech.push({ m, nhom, kyMon }); continue; }
    else { const [n] = nhom.values(); thang = { ky: n.ky, bac: n.bac, banSao: n.banSao[0] || null }; }
    const ghiGia = thang.ky !== kyMon;
    if (ghiGia && teSai(thang.bac)) {   // bảng SẼ GHI mang tệ sai ⇒ chặn món này (mọi bản sao mang đúng bảng đó được nêu tên)
      for (const b of nhom.get(thang.ky)?.banSao || []) {
        for (const x of b.bac) if (x.dong.tien_te !== dv.tienTe) lechTe.push({ ...banSaoRa(b), posMa: m.ma, soLuong: x.dong.so_luong, tienTe: x.dong.tien_te });
      }
      continue;
    }
    if (ghiGia) {
      for (const x of thang.bac) for (const [k, v] of Object.entries(x.dong)) if (!COT_BAC_CHEP.includes(k) && v != null) cotLa.push(`${m.ma}:${k}`);
    }
    // Ảnh sẽ thêm: hợp ảnh các bản sao cặp vào món, theo thứ tự page rồi thu_tu, bỏ `duong` món đã có / đã gom.
    const coRoi = new Set(m.anh.map((a) => a.duong));
    const can = [];
    for (const b of banSaoMon) for (const a of b.anh) if (!coRoi.has(a.duong)) { coRoi.add(a.duong); can.push(a); }
    keHoach.push({ m, banSaoMon, kyMon, thang, ghiGia, can });
  }
  const pageDonVi = dv.pages.map(pageRa(dv));
  if (chonSai.length) {
    throw loi409(`lựa chọn không hợp lệ cho ${chonSai.join(", ")} — chọn một bản sao CÓ bậc giá đã cặp vào món, hoặc «giữ giá món»`,
      "chon_khong_hop_le", { posMa: chonSai });
  }
  if (khongGiaMon.length) {
    throw loi409(`món ${khongGiaMon.join(", ")} chưa có giá — không «giữ giá món» được; chọn bảng của một page`, "khong_co_gia_mon",
      { posMa: khongGiaMon });
  }
  if (lechTe.length) {
    throw loi409(`bảng sẽ ghi lên món mang tiền tệ khác ${dv.tienTe} (thị trường ${dv.market}): page `
      + `${[...new Set(lechTe.map((x) => x.tenPage))].join(", ")} — chọn bảng khác hoặc «giữ giá món»; không quy đổi đoán`,
    "lech_tien_te", { tienTeThiTruong: dv.tienTe, bac: lechTe });
  }
  if (lech.length) {
    // Bảng đề xuất mang tệ sai (≠ giá món — chọn nó là GHI) được NÊU RÕ để màn cho người chọn bảng đúng / giữ giá món.
    const saiTe = lech.flatMap(({ nhom, kyMon }) => [...nhom.values()].filter((n) => n.ky !== kyMon && teSai(n.bac))
      .flatMap((n) => n.banSao.map((b) => banSaoRa(b).tenPage)));
    throw loi409(`bảng giá khác nhau giữa các page (hoặc với giá món đang có) ở ${lech.map((x) => x.m.ma).join(", ")} — chọn MỘT bảng; `
      + `lựa chọn đổi giá bot ở ${pageDonVi.length} page`
      + (saiTe.length ? ` · bảng mang tiền tệ khác ${dv.tienTe}, không chọn được: page ${saiTe.join(", ")}` : ""), "lech_gia_giua_page", {
      tienTeThiTruong: dv.tienTe,
      lech: lech.map(({ m, nhom, kyMon }) => ({ posMa: m.ma, tenMon: m.ten, bang: [...nhom.values()].map((n) => ({
        bac: bacRa(n.bac), laGiaMon: n.ky === kyMon, tienTeSai: n.ky !== kyMon && teSai(n.bac), banSao: n.banSao.map(banSaoRa) })) })),
      pageDoiGia: pageDonVi,
    });
  }
  if (khongGia.length) {
    throw loi409(`không bản sao nào có bậc giá và món ${khongGia.join(", ")} chưa có giá — nhập giá ở «Theo thị trường» trước`,
      "khong_co_gia", { posMa: khongGia });
  }
  if (cotLa.length) {
    throw loi409(`bảng thắng mang cột bậc giá cửa lưu chưa chép được: ${cotLa.join(", ")}`, "cot_bac_la", { cot: cotLa });
  }
  // Luật của cửa lưu giá (`saveProduct`) và kho ảnh (`themAnh`) mà CSDL KHÔNG ràng buộc — kiểm TRƯỚC để sai thì 409 không ghi gì,
  // thay vì chèn ảnh rồi bị từ chối giữa lượt. Hai cửa đó vẫn là lưới cuối (chép luật, không thay luật: sửa ở đó thì sửa ở đây).
  const khongChep = [];
  for (const k of keHoach) {
    if (k.ghiGia) {
      if (k.thang.bac.length > 30) khongChep.push(`${k.m.ma}: ${k.thang.bac.length} bậc — cửa lưu giá nhận tối đa 30`);
      for (const { dong: d } of k.thang.bac) {
        const nho = Number(d.gia);
        if (!Number.isInteger(nho) || nho < 1) khongChep.push(`${k.m.ma} bậc ${d.so_luong}: giá ${d.gia} (đơn vị nhỏ) — cửa lưu giá chỉ nhận giá dương, nguyên đơn vị nhỏ`);
        if (String(d.nhan ?? "").length > 160) khongChep.push(`${k.m.ma} bậc ${d.so_luong}: nhãn bậc dài quá 160 ký tự`);
      }
    }
    for (const a of k.can) if (String(a.nhan ?? "").trim().length > 80) khongChep.push(`${k.m.ma}: ảnh ${a.duong} có nhãn dài quá 80 ký tự`);
  }
  if (khongChep.length) {
    throw loi409(`dữ liệu bản sao cửa lưu không nhận: ${khongChep.slice(0, 3).join(" · ")}${khongChep.length > 3 ? " …" : ""}`,
      "khong_chep_duoc", { loi: khongChep });
  }

  // ⑤ Ghi từng món: ảnh (nối cuối, khử trùng theo `duong`, theo thứ tự page rồi thu_tu) → giá hoặc đẩy → hỏng thì gỡ ảnh vừa thêm.
  const ra = [];
  for (const k of keHoach) {
    const { m } = k;
    const daThem = [];
    try {
      for (const a of k.can) daThem.push((await themAnh(pool, teamId, m.id, { duong: a.duong, nhan: a.nhan, nguon: "kb" })).id);
      if (k.ghiGia) await luuGia(m.ma, { offers: k.thang.bac.map(offerTu), version: m.version });
      else await dayMon(m.id);
    } catch (e) {
      const con = [];
      for (const id of daThem) {
        try { await boAnh(pool, teamId, id); } catch { con.push(id); }
      }
      // Món TRƯỚC đã ghi (giá + ảnh + đẩy — đã commit, không lùi được ở đây) ⇒ mang đủ bản ghi của chúng theo lỗi để lớp trên ghi
      // nhật ký «đối soát DỞ»; đơn vị CHƯA đánh dấu, chạy lại sẽ thấy món đã ghi khớp bảng và đi tiếp.
      const daXongMon = ra;
      if (con.length) {
        throw Object.assign(new LoiSanPhamGoc(
          `nửa vời: ${con.length} ảnh còn trên món ${m.ma} (đẩy/lưu hỏng: ${String(e?.message || e)}; gỡ ảnh cũng hỏng)`, "nua_voi", 500,
        ), { duLieu: { nuaVoi: true, posMa: m.ma, posMaHong: m.ma, anhCon: con.length, anhConIds: con, loiGoc: String(e?.message || e), daXongMon } });
      }
      if (daXongMon.length && e && typeof e === "object") e.duLieu = { ...(e.duLieu || {}), daXongMon, posMaHong: m.ma };
      throw e;
    }
    let canhBao = "";
    if (k.ghiGia) {   // đọc lại: bảng trên món phải đúng bảng đã chọn (saveProduct chuẩn hoá nhãn/khuyến mãi thì nói ra, không im)
      const sau = (await docBacTheo(pool, teamId, [m.id])).get(m.id) || [];
      if (kyBang(sau) !== k.thang.ky) canhBao = "bảng trên món sau khi lưu khác bảng đã chọn (cửa lưu chuẩn hoá nhãn/khuyến mãi)";
    }
    ra.push({
      posMa: m.ma, monId: m.id, tenMon: m.ten, ghiGia: k.ghiGia, anhThem: daThem.length, canhBao,
      bangThang: k.thang.banSao ? { ...banSaoRa(k.thang.banSao), laGiaMon: false, bac: bacRa(k.thang.bac) }
        : { laGiaMon: true, bac: bacRa(k.thang.bac) },
      // Bảng CŨ của món ở đơn vị LỚN — đúng khuôn `offers` của cửa lưu giá ⇒ đường lùi nhập lại được. `saveProduct` chụp `truoc`.
      bangCu: k.ghiGia && m.bac.length ? bacRa(m.bac) : null,
    });
  }

  // ⑥ Đánh dấu MỘT câu, chỉ sau khi mọi món xong: `chep` cho bản sao có bảng được ghi lên món, `giu_gia_mon` cho phần còn lại.
  const chep = keHoach.filter((k) => k.ghiGia)
    .flatMap((k) => k.banSaoMon.filter((b) => b.bac.length && kyBang(b.bac) === k.thang.ky).map((b) => b.id));
  await pool.query(
    `UPDATE san_pham SET doi_soat = CASE WHEN id = ANY($3::bigint[]) THEN 'chep' ELSE 'giu_gia_mon' END,
            doi_soat_luc = now(), doi_soat_goc = $4, doi_soat_shop = $5
      WHERE team_id = $1 AND id = ANY($2::bigint[]) AND nguon <> 'pos'`,
    [teamId, chuaQuyet.map((b) => b.id), chep, dv.goc.ma_goc, dv.shop],
  );
  return {
    ...donVi, daXong: false, mon: ra,
    pageDonVi: pageDonVi.map((p) => ({ ...p, trangThai: "xong" })),
    // Page vừa rời «chờ đối soát» — đúng số bộ đếm giảm (page đã xong từ trước vẫn đổi giá nhưng không làm bộ đếm giảm).
    pageSangXong: pageDonVi.filter((p) => p.trangThai === "cho_doi_soat").map(({ pageId, pageFb, ten }) => ({ pageId, pageFb, ten })),
    pageDoiGia: ra.some((x) => x.ghiGia) ? pageDonVi.map(({ pageId, pageFb, ten }) => ({ pageId, pageFb, ten })) : [],
    danhDau: { chep, giuGiaMon: chuaQuyet.map((b) => b.id).filter((id) => !chep.includes(id)) },
  };
}

/* ═══ GSP3b · TRANG PAGE ĐỌC ĐÚNG THỨ BOT ĐỌC + KHOÁ SỬA BẢN SAO CỦA PAGE ĐÃ GẮN (CR-02-10b mục 2 lớp 4 · 5e · review (a) G2-N1) ═══
 * «Page đã chuyển» = `page.san_pham_goc_ma` có chữ — ĐÚNG điều kiện `catalog.js#docSanPhamGoiGia` bỏ nhánh `page_id`
 * (`const maGoc = trang.san_pham_goc_ma; … maGoc ? { ma_goc } : { page_id }` — chuỗi rỗng = chưa gắn, như ở đó). Từ lúc ấy bot,
 * cửa tiền, cổng bật KHÔNG còn đọc bản sao của page: sửa bản sao là sửa thứ không ai đọc, còn bước đẩy (`daySanPhamSangBot` →
 * `pageBanSanPham` theo `page_id` → `dayPageSangBot`) lại đọc MÓN POS và đẩy nó (có thể chưa giá) — màn báo «đã lưu», bot mất giá.
 * Page gắn gốc mà chưa có shop: catalog trả [] (bot không bán gì) — vẫn «đã chuyển» (bản sao vẫn không ai đọc).
 * Dòng `nguon='pos'` (kể cả món RF-15 mang `page_id`) và bản sao của page CHƯA gắn KHÔNG bị chốt này chạm.
 */

/**
 * BỘ ĐỌC sản phẩm của trang một page + màn Prompt (`docKhoi.sanPham` ở `v3/chay-that.js`): đọc dòng `page` rồi gọi bộ đọc
 * CHUNG với `trang` — page đã gắn gốc + shop ⇒ món POS của gốc ở shop (đúng thứ `catalog.js` trả cho bot · cửa tiền · cổng bật);
 * page chưa gắn ⇒ nhánh `page_id` (bản sao) như trước, tới GSP4. Page không thuộc team ⇒ [] (nơi gọi đã trả 404 trước đó).
 */
export async function docSanPhamTrangPage(db, teamId, pageRowId) {
  const id = String(pageRowId ?? "");
  if (!/^[1-9]\d*$/.test(id)) return [];
  const trang = (await db.query("SELECT * FROM page WHERE team_id = $1 AND id = $2", [teamId, id])).rows[0];
  if (!trang) return [];
  return docSanPhamGoiGia(db, teamId, trang.id, trang);
}

/**
 * CÂU + LỐI SANG cho page đã chuyển — MỘT bản cho cả 409 của chốt và dòng «chỉ xem» của trang page (hàm THUẦN).
 * Thị trường đọc `page.thi_truong` (cửa gắn `ganPageVaoGoc` ghi nó = thị trường của shop); vắng ⇒ nói số shop.
 */
export function cauDaChuyen({ maGoc, tenGoc, gocId, shopId, thiTruong } = {}) {
  const ten = gon(tenGoc) || gon(maGoc);
  const shop = gon(shopId);
  const tt = gon(thiTruong);
  const sp = gon(gocId) || null;
  const duongSua = sp ? `/san-pham?sp=${encodeURIComponent(sp)}&tab=${shop ? "thi-truong" : "page"}` : "/san-pham";
  const cau = shop
    ? `Page này bán «${ten}» ở ${tt ? `«${tt}» (shop ${shop})` : `shop ${shop}`}. Giá + ảnh sửa ở Sản phẩm › «${ten}» › Theo thị trường — `
      + "sửa ở đó là sửa cho MỌI page cùng sản phẩm ở thị trường này."
    : `Page này gắn «${ten}» nhưng chưa chọn shop POS — bot chưa có sản phẩm nào để bán ở page này. Gắn page vào một thị trường ở `
      + `Sản phẩm › «${ten}» › Page đang bán; giá + ảnh sửa ở tab Theo thị trường.`;
  return { maGoc: gon(maGoc), tenGoc: ten, gocId: sp, shopId: shop || null, thiTruong: tt || null, duongSua, cau };
}

/**
 * Id số CHUẨN (`/^[1-9]\d*$/`) hoặc `null` khi vắng (null · undefined · ''). Dạng khác ⇒ 400 `ma_khong_hop_le` — KHÔNG cho qua: Postgres
 * ép «012» · «+12» · « 12» về đúng số 12, nên chốt mà bỏ qua dạng lạ thì cửa phía sau vẫn ghi vào đúng dòng bị khoá (/code-review CR1).
 */
export function idSo(x, ten = "mã") {
  if (x == null || x === "") return null;
  const s = String(x);
  if (!/^[1-9]\d*$/.test(s)) throw new LoiSanPhamGoc(`${ten} «${s.slice(0, 40)}» không hợp lệ`, "ma_khong_hop_le", 400);
  return s;
}

/**
 * CHỐT MÁY CHỦ của mọi cửa lưu sản phẩm/ảnh mở từ trang page: dòng `san_pham` `nguon <> 'pos'` mà page của nó (`san_pham.page_id`)
 * đã chuyển ⇒ 409 `ban_sao_da_chuyen` (kèm tên gốc + lối sang). Hai chỗ gọi: đầu mỗi cửa TRƯỚC khi ghi (lưới sớm — trả đúng mã trước mọi
 * kiểm khác) và CỬA RA chung `taoBuocDayBot` (v3/src/ui/van-hanh/router.js) ngay trước lời gọi đẩy, trong giao dịch ghi.
 * Trong giao dịch, câu đọc KHOÁ dòng page (`FOR SHARE`) ⇒ tuần tự với lượt gắn (`ganPageVaoGoc` khoá `FOR UPDATE`): gắn đang dở thì chốt
 * chờ rồi thấy page đã gắn; chốt qua rồi thì lượt gắn chờ giao dịch lưu xong (/code-review CR2).
 * Vắng id / không có dòng / dòng `nguon='pos'` / page chưa gắn ⇒ `null`, đi qua như cũ. Id dạng lạ ⇒ 400 (`idSo`).
 */
export async function chanBanSaoDaChuyen(db, teamId, sanPhamId) {
  const id = idSo(sanPhamId, "mã sản phẩm");
  if (!id) return null;
  const r = (await db.query(
    `SELECT s.id, p.id AS page_row, p.page_id AS page_fb, p.ten AS page_ten, p.san_pham_goc_ma, p.pos_shop_id, p.thi_truong,
            g.id AS goc_id, g.ten AS goc_ten
       FROM san_pham s
       JOIN page p ON p.team_id = s.team_id AND p.id = s.page_id
       LEFT JOIN san_pham_goc g ON g.team_id = p.team_id AND g.ma_goc = p.san_pham_goc_ma
      WHERE s.team_id = $1 AND s.id = $2 AND s.nguon <> 'pos'
        FOR SHARE OF p`,
    [teamId, id],
  )).rows[0];
  if (!r || !r.san_pham_goc_ma) return null;
  const c = cauDaChuyen({ maGoc: r.san_pham_goc_ma, tenGoc: r.goc_ten, gocId: r.goc_id, shopId: r.pos_shop_id, thiTruong: r.thi_truong });
  throw loi409(
    `bản sao này thuộc page «${r.page_ten || r.page_fb}» — page đã chuyển sang sản phẩm, bot không còn đọc bản sao. ${c.cau} Chưa ghi gì.`,
    "ban_sao_da_chuyen",
    { ...c, sanPhamId: String(r.id), pageId: String(r.page_row), pageFb: r.page_fb },
  );
}
