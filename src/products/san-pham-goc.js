// KHO SẢN PHẨM GỐC (`san_pham_goc`, migration 014) — đọc, tạo, sửa.
//
// ─── VÌ SAO CÓ FILE NÀY ────────────────────────────────────────────────────────────────
// Bảng có từ 15/09 và là khoá của tầng kịch bản («sản phẩm» trong `kich_ban`,
// `ky_nang.bat_cho_nhom_sp_goc`), nhưng đo 17/09: KHÔNG một đường nào TẠO nó. Nơi duy nhất
// sinh ra dòng là `ops/bin/goi-y-gop-san-pham.mjs` — mà script ấy cố ý chỉ IN câu SQL đề
// nghị cho người soát, không ghi. Nghĩa là muốn có sản phẩm gốc thì phải gõ SQL trên máy
// chủ, và `doc-danh-muc.js` mỗi lượt lại đếm ra một đống «số hiệu chưa có sản phẩm gốc»
// mà không ai đóng được.
//
// ─── MÁY KHÔNG ĐƯỢC TỰ TẠO, NHƯNG PHẢI DỌN SẴN BÀN ─────────────────────────────────────
// `doc-danh-muc.js` ghi rõ lý do cấm máy tự tạo: 113 biến thể không có số hiệu sẽ đẻ 113
// sản phẩm gốc rác, và đặt tên một sản phẩm là quyết định của người. File này giữ nguyên
// luật đó — máy KHÔNG tạo. Việc của nó là dọn bàn: `soHieuChuaCoGoc()` gom đúng những số
// hiệu POS đang chờ người đặt tên, kèm các tên đã thấy ở từng shop để người chọn.
import { tachSoHieu, chuanHoaTen, maGocDeXuat, chuanSku } from "../pos/ten-goc.js";
import { HE_SO_TE } from "../pos/index.js";

export class LoiSanPhamGoc extends Error {
  constructor(thongDiep, ma = "san_pham_goc", status = 400) {
    super(thongDiep);
    this.name = "LoiSanPhamGoc";
    this.ma = ma;
    this.status = status;
  }
}

const gon = (s) => String(s ?? "").trim();

/** Mã gốc: người đặt, và CẤM dấu ":" — dấu đó thuộc mã POS `<shop>:<variation>`. */
function batBuocMaGoc(ma) {
  const m = gon(ma);
  if (!m) throw new LoiSanPhamGoc("thiếu mã gốc", "thieu_ma");
  if (m.includes(":")) {
    throw new LoiSanPhamGoc(
      'mã gốc KHÔNG được chứa dấu ":" — dấu đó là của mã POS `<shop>:<biến thể>`',
      "ma_co_hai_cham",
    );
  }
  if (m.length > 120) throw new LoiSanPhamGoc("mã gốc dài quá 120 ký tự", "ma_dai");
  return m;
}

/** Số hiệu: 1–4 chữ số, bỏ số 0 đứng đầu (POS có cả `008` lẫn `8` cho cùng một thứ). */
function batBuocSoHieu(so) {
  const s = gon(so);
  if (!s) return null;
  if (!/^[0-9]{1,4}$/.test(s)) {
    throw new LoiSanPhamGoc("số hiệu phải là 1–4 chữ số, hoặc để trống", "so_hieu_la");
  }
  return String(Number(s));
}

/** Danh sách sản phẩm gốc của team, kèm ĐẾM biến thể POS đã nối vào từng cái. */
export async function dsSanPhamGoc(pool, teamId) {
  const r = await pool.query(
    `SELECT g.id, g.ma_goc, g.ten, g.mo_ta, g.so_hieu, g.sku, g.marketer, g.marketer_ma_nv, g.tao_luc, g.sua_luc,
            (SELECT count(*)::int FROM san_pham s
              WHERE s.team_id = g.team_id AND s.ma_goc = g.ma_goc) AS so_bien_the,
            -- LL13: thị trường = SHOP của món POS (1 shop = 1 thị trường) · page bán qua món POS hoặc gán cả page.
            (SELECT count(DISTINCT split_part(s.ma, ':', 1))::int FROM san_pham s
              WHERE s.team_id = g.team_id AND s.ma_goc = g.ma_goc AND s.nguon = 'pos') AS so_thi_truong,
            (SELECT count(DISTINCT p.id)::int FROM page p
              WHERE p.team_id = g.team_id AND (p.san_pham_goc_ma = g.ma_goc OR p.id IN (
                SELECT b.page_id FROM san_pham b JOIN san_pham m ON m.team_id = b.team_id AND m.ma = b.pos_ma
                 WHERE b.team_id = g.team_id AND m.ma_goc = g.ma_goc AND m.nguon = 'pos'))) AS so_page
       FROM san_pham_goc g WHERE g.team_id = $1
      ORDER BY (g.so_hieu IS NULL), length(g.so_hieu), g.so_hieu, g.ma_goc`,
    [teamId],
  );
  return r.rows.map((d) => ({
    id: String(d.id),
    maGoc: d.ma_goc,
    ten: d.ten,
    moTa: d.mo_ta,
    soHieu: d.so_hieu,
    sku: d.sku ?? null,
    marketer: d.marketer ?? "",
    marketerMaNv: d.marketer_ma_nv ?? null,   // LL15d (031): mã NV HRM của marketer được chọn — khoá lọc «chỉ thấy sản phẩm mình»
    soBienThe: d.so_bien_the,
    soThiTruong: d.so_thi_truong,
    soPage: d.so_page,
    taoLuc: new Date(d.tao_luc).getTime(),
    suaLuc: new Date(d.sua_luc).getTime(),
  }));
}

/**
 * SỐ HIỆU ĐANG CHỜ NGƯỜI: đọc được từ tên biến thể POS trong `san_pham` nhưng chưa có
 * sản phẩm gốc nào mang số ấy. Kèm các tên đã thấy, để người chọn thay vì tự nhớ.
 *
 * Tách số hiệu Ở JS bằng CHÍNH hàm mà `doc-danh-muc.js` dùng (`tachSoHieu`) — viết lại
 * bằng regex SQL là đẻ bản thứ hai của một luật, rồi hai bên trôi khỏi nhau.
 */
export async function soHieuChuaCoGoc(pool, teamId) {
  const r = await pool.query(
    "SELECT ten, ma FROM san_pham WHERE team_id = $1 AND ma_goc IS NULL",
    [teamId],
  );
  const daCo = new Set(
    (await pool.query("SELECT so_hieu FROM san_pham_goc WHERE team_id = $1 AND so_hieu IS NOT NULL", [teamId]))
      .rows.map((x) => String(x.so_hieu)),
  );
  const theoSo = new Map();
  let khongCoSoHieu = 0;
  for (const d of r.rows) {
    const { soHieu, ten } = tachSoHieu(d.ten);
    if (!soHieu) { khongCoSoHieu += 1; continue; }
    if (daCo.has(soHieu)) continue;   // đã có gốc, chỉ là biến thể này chưa nối lại
    if (!theoSo.has(soHieu)) theoSo.set(soHieu, { soHieu, ten: [], soBienThe: 0 });
    const o = theoSo.get(soHieu);
    o.soBienThe += 1;
    if (ten && !o.ten.includes(ten)) o.ten.push(ten);
  }
  return {
    cho: [...theoSo.values()].sort((a, b) => Number(a.soHieu) - Number(b.soHieu)),
    // Biến thể KHÔNG có số hiệu: máy không gộp được, nói ra để người vào POS gõ số.
    khongCoSoHieu,
  };
}

/** TẠO. `so_hieu` trống là hợp lệ — sản phẩm chưa lên POS vẫn được đặt tên trước. */
export async function taoSanPhamGoc(pool, teamId, { maGoc, ten, moTa, soHieu } = {}) {
  const ma = batBuocMaGoc(maGoc);
  const so = batBuocSoHieu(soHieu);
  try {
    const r = await pool.query(
      `INSERT INTO san_pham_goc (team_id, ma_goc, ten, mo_ta, so_hieu)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, ma_goc, ten, mo_ta, so_hieu, tao_luc, sua_luc`,
      [teamId, ma, gon(ten), gon(moTa), so],
    );
    return { ...doiRa(r.rows[0]), soBienThe: 0 };
  } catch (e) {
    throw loiTrung(e, so, ma);
  }
}

/** 23505 của `san_pham_goc` ⇒ lỗi người đọc được (mã · số hiệu · SKU trùng); lỗi khác trả nguyên. */
function loiTrung(e, so, ma, sku = null) {
  if (e?.code !== "23505") return e;
  const rang = String(e.constraint || "");
  return new LoiSanPhamGoc(
    sku && /sku/.test(rang) ? `SKU ${sku} đã là một sản phẩm gốc khác của team này`
      : so && /so_hieu/.test(rang) ? `số hiệu ${so} đã thuộc một sản phẩm gốc khác của team này`
        : `mã gốc "${ma}" đã có trong team này`,
    "trung", 409,
  );
}

/**
 * SỬA tên/mô tả/số hiệu/SKU/marketer (VE8: SKU + marketer — migration 028). `ma_goc` KHÔNG sửa được ở đây, và đó là chủ ý: nó là khoá mà
 * `san_pham.ma_goc`, `kich_ban.san_pham_goc_ma` và `page.san_pham_goc_ma` đang trỏ tới —
 * đổi nó bằng một câu UPDATE là bỏ rơi mọi chỗ trỏ, im lặng.
 */
export async function suaSanPhamGoc(pool, teamId, id, { ten, moTa, soHieu, sku, marketer, marketerMaNv } = {}) {
  const dat = [];
  const tham = [teamId, String(id)];
  if (ten !== undefined) { tham.push(gon(ten)); dat.push(`ten = $${tham.length}`); }
  if (moTa !== undefined) { tham.push(gon(moTa)); dat.push(`mo_ta = $${tham.length}`); }
  if (soHieu !== undefined) { tham.push(batBuocSoHieu(soHieu)); dat.push(`so_hieu = $${tham.length}`); }
  if (sku !== undefined) { tham.push(chuanSku(sku)); dat.push(`sku = $${tham.length}`); }
  if (marketer !== undefined) { tham.push(gon(marketer).slice(0, 120)); dat.push(`marketer = $${tham.length}`); }
  // LL15d: mã NV đi CÙNG tên (tầng màn tra tên từ tài khoản HRM). Gõ tay tên mà không mã ⇒ xoá mã cũ — tên và mã không lệch nhau.
  if (marketerMaNv !== undefined || marketer !== undefined) {
    tham.push(marketerMaNv === undefined ? null : (gon(marketerMaNv) || null)); dat.push(`marketer_ma_nv = $${tham.length}`);
  }
  if (!dat.length) throw new LoiSanPhamGoc("không có gì để sửa", "rong");
  const cau = `UPDATE san_pham_goc SET ${dat.join(", ")}, sua_luc = now()
        WHERE team_id = $1 AND id = $2
        RETURNING id, ma_goc, ten, mo_ta, so_hieu, sku, marketer, marketer_ma_nv, tao_luc, sua_luc`;
  const khongCo = () => new LoiSanPhamGoc(`không có sản phẩm gốc #${id} trong team này`, "khong_thay", 404);
  const trung = (e) => loiTrung(e, soHieu === undefined ? null : batBuocSoHieu(soHieu), "", sku === undefined ? null : chuanSku(sku));
  // Không đổi marketer ⇒ một câu, không cần giao dịch (cùng đường cũ).
  if (marketer === undefined) {
    let r;
    try { r = await pool.query(cau, tham); } catch (e) { throw trung(e); }
    if (!r.rowCount) throw khongCo();
    return { ...doiRa(r.rows[0]), soPageTheoMarketer: 0 };
  }
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const r = await khach.query(cau, tham);
    if (!r.rowCount) throw khongCo();
    // VE8b · «1 page chỉ của 1 marketer … marketer nghỉ ⇒ chuyển page và sản phẩm cho mkt khác» (người quyết 30/09):
    // đổi marketer của sản phẩm ⇒ MỌI page đang bán nó đổi theo, cùng giao dịch.
    const soPageTheo = (await khach.query(
      "UPDATE page SET marketer = $3, sua_luc = now() WHERE team_id = $1 AND san_pham_goc_ma = $2 AND marketer IS DISTINCT FROM $3",
      [teamId, r.rows[0].ma_goc, r.rows[0].marketer],
    )).rowCount;
    await khach.query("COMMIT");
    return { ...doiRa(r.rows[0]), soPageTheoMarketer: soPageTheo };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw trung(e);
  } finally {
    khach.release();
  }
}

/**
 * BỎ — chỉ khi KHÔNG còn ai trỏ tới. Xoá một sản phẩm gốc đang được biến thể POS, kịch bản
 * hay page trỏ tới là làm mất nghĩa của những dòng đó mà không ai được báo; nên ở đây từ
 * chối và NÓI RA chỗ đang trỏ, thay vì xoá rồi để người khác phát hiện bằng một lượt chat hỏng.
 */
export async function boSanPhamGoc(pool, teamId, id) {
  const cu = await pool.query(
    "SELECT id, ma_goc, ten FROM san_pham_goc WHERE team_id = $1 AND id = $2",
    [teamId, String(id)],
  );
  if (!cu.rowCount) throw new LoiSanPhamGoc(`không có sản phẩm gốc #${id} trong team này`, "khong_thay", 404);
  const ma = cu.rows[0].ma_goc;
  const [sp, kb, pg] = await Promise.all([
    pool.query("SELECT count(*)::int c FROM san_pham WHERE team_id = $1 AND ma_goc = $2", [teamId, ma]),
    pool.query("SELECT count(*)::int c FROM kich_ban WHERE team_id = $1 AND san_pham_goc_ma = $2", [teamId, ma]),
    pool.query("SELECT count(*)::int c FROM page WHERE team_id = $1 AND san_pham_goc_ma = $2", [teamId, ma]),
  ]);
  const troToi = [
    sp.rows[0].c ? `${sp.rows[0].c} biến thể POS` : null,
    kb.rows[0].c ? `${kb.rows[0].c} kịch bản` : null,
    pg.rows[0].c ? `${pg.rows[0].c} page` : null,
  ].filter(Boolean);
  if (troToi.length) {
    throw new LoiSanPhamGoc(
      `còn ${troToi.join(" · ")} đang trỏ tới "${ma}" — gỡ chúng trước rồi mới bỏ được`,
      "dang_duoc_tro_toi", 409,
    );
  }
  // GSP3 (review chặng 2 GSP2 F1): dấu đối soát khoá theo `ma_goc` CHỮ — bỏ gốc rồi gộp lại CÙNG mã thì dấu `chep`/`giu_gia_mon` cũ
  // sống lại và page gắn vào gốc mới tính «xong» mà chưa ai so giá. Xoá gốc + dọn dấu của mã đó trong MỘT câu (CTE ghi — một giao
  // dịch). CSDL chưa áp 032 ⇒ xoá như cũ, không dọn, không ném (hàm này đang chạy trên prod); câu kiểm cột cùng khuôn
  // `chuyen-ban-sao.js#coCot032`.
  const co032 = (await pool.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'san_pham'
        AND column_name IN ('doi_soat', 'doi_soat_luc', 'doi_soat_goc', 'doi_soat_shop')`,
  )).rows[0]?.n === 4;
  if (co032) {
    await pool.query(
      `WITH bo AS (DELETE FROM san_pham_goc WHERE team_id = $1 AND id = $2 RETURNING ma_goc)
       UPDATE san_pham SET doi_soat = NULL, doi_soat_luc = NULL, doi_soat_goc = NULL, doi_soat_shop = NULL
        WHERE team_id = $1 AND nguon <> 'pos' AND doi_soat_goc IN (SELECT ma_goc FROM bo)`,
      [teamId, String(id)],
    );
  } else {
    await pool.query("DELETE FROM san_pham_goc WHERE team_id = $1 AND id = $2", [teamId, String(id)]);
  }
  return { id: String(id), maGoc: ma, ten: cu.rows[0].ten };
}

function doiRa(d) {
  return {
    id: String(d.id),
    maGoc: d.ma_goc,
    ten: d.ten,
    moTa: d.mo_ta,
    soHieu: d.so_hieu,
    sku: d.sku ?? null,
    marketer: d.marketer ?? "",
    marketerMaNv: d.marketer_ma_nv ?? null,
    taoLuc: new Date(d.tao_luc).getTime(),
    suaLuc: new Date(d.sua_luc).getTime(),
  };
}

/**
 * BA CON SỐ VỀ GIÁ — thứ quyết định bot có chào bán được hay không.
 *
 * Danh mục POS của các shop này trả `retail_price = 0` (đo 22/08: 128/128 biến thể), nên
 * lượt «Kéo danh mục» KHÔNG mang giá về được: giá thật sống trong từng đơn. Người phải
 * nhập tay ở màn Vận hành V3, và cửa ghi ấy đặt `cau_hinh_tay = true` để lượt kéo sau
 * không đè lên.
 *
 * Nên con số đáng hiện trên màn không phải «có bao nhiêu sản phẩm», mà là **bao nhiêu sản
 * phẩm chưa có bậc giá nào** — đó là số món bot đang có trong kho mà không biết bán giá nào.
 */
export async function demGia(pool, teamId) {
  const r = await pool.query(
    `SELECT count(*)::int AS tong,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM goi_gia g WHERE g.team_id = s.team_id AND g.san_pham_id = s.id
            ))::int AS co_gia,
            count(*) FILTER (WHERE s.cau_hinh_tay)::int AS tay
       FROM san_pham s WHERE s.team_id = $1`,
    [teamId],
  );
  const d = r.rows[0];
  return { tong: d.tong, coGia: d.co_gia, chuaCoGia: d.tong - d.co_gia, nhapTay: d.tay };
}

/* ═══ LL13 · SẢN PHẨM LÀ LÕI — thị trường · món POS · page đang bán (CR-28-09c, 01 §6 mới) ═══════════════
 * Mỗi SHOP POS là MỘT thị trường (01 §8 mới: 1 shop = 1 thị trường). Món POS (`san_pham.nguon='pos'`, mã
 * `<shop>:<biến thể>`) thuộc một sản phẩm gốc qua `ma_goc` — một shop có thể có NHIỀU biến thể (size) của
 * cùng sản phẩm, nên luật khoá là «một món chỉ thuộc MỘT gốc», không phải «một shop một biến thể».
 * Page bán sản phẩm qua bản sao của page trỏ tới món POS (`san_pham.pos_ma`, MN8) HOẶC gán cả page vào gốc
 * (`page.san_pham_goc_ma`, 015) — màn gộp cả hai và nói page đến bằng đường nào.
 */
const shopCua = (ma) => String(ma || "").split(":")[0] || null;

/** Một sản phẩm gốc: thị trường (theo shop) · món POS · page đang bán. `null` = không có trong team. */
export async function chiTietSanPhamGoc(pool, teamId, id) {
  const g = (await pool.query(
    "SELECT id, ma_goc, ten, mo_ta, so_hieu, sku, marketer, marketer_ma_nv, kien_thuc FROM san_pham_goc WHERE team_id = $1 AND id = $2",
    [teamId, id],
  )).rows[0];
  if (!g) return null;
  const mon = (await pool.query(
    `SELECT s.id, s.xmin::text AS version, s.ma, s.ten, s.ton_kho, s.het_hang, s.gia_tay, k.market
       FROM san_pham s
       LEFT JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1)
      WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc = $2
      ORDER BY k.market NULLS LAST, s.ma`,
    [teamId, g.ma_goc],
  )).rows;
  const ban = (await pool.query(
    `SELECT p.id, p.page_id, p.ten, 'mon_pos' AS qua, s.pos_ma, NULL::text AS shop_page
       FROM san_pham s JOIN page p ON p.id = s.page_id AND p.team_id = s.team_id
      WHERE s.team_id = $1 AND s.nguon <> 'pos' AND s.pos_ma = ANY($2::text[])
     UNION ALL
     SELECT p.id, p.page_id, p.ten, 'ca_page' AS qua, NULL AS pos_ma, p.pos_shop_id AS shop_page
       FROM page p WHERE p.team_id = $1 AND p.san_pham_goc_ma = $3`,
    [teamId, mon.map((m) => m.ma), g.ma_goc],
  )).rows;
  // VE1 · 29/09: «Giá ở <thị trường>» (bản vẽ 2a). Mô hình hôm nay giữ giá ở BẢN SAO của từng page (`goi_gia` của
  // `san_pham` nguon<>'pos'), nối về món qua `pos_ma` — gom bậc giá của các bản sao đã nối món của shop, đếm page dùng
  // mỗi bậc. KHÔNG dựng một bảng giá thị trường bịa: cùng số lượng mà khác giá ở hai page ⇒ HAI dòng + `lechGia`.
  const bac = (await pool.query(
    `SELECT s.pos_ma, s.page_id, g.so_luong, g.gia::float8 AS gia, g.tien_te, g.nhan
       FROM san_pham s JOIN goi_gia g ON g.san_pham_id = s.id AND g.team_id = s.team_id
      WHERE s.team_id = $1 AND s.nguon <> 'pos' AND s.pos_ma = ANY($2::text[])`,
    [teamId, mon.map((m) => m.ma)],
  )).rows;
  const theoShop = new Map();
  // VE8b: giá CỦA CHÍNH món (goi_gia món POS) — thứ `catalog.js` đọc cho page gán vào sản phẩm; sửa được ở màn này.
  const giaTheoMon = await giaCuaMon(pool, teamId, mon.map((m) => m.id));
  for (const m of mon) {
    const shop = shopCua(m.ma);
    if (!theoShop.has(shop)) theoShop.set(shop, { shopId: shop, thiTruong: m.market || null, mon: [], page: [], gia: new Map() });
    theoShop.get(shop).mon.push({ id: String(m.id), version: m.version, posMa: m.ma, ten: m.ten, tonKho: m.ton_kho,
      hetHang: !!m.het_hang, giaTay: !!m.gia_tay, goiGia: giaTheoMon.get(String(m.id)) || [] });
  }
  for (const r of bac) {
    const t = theoShop.get(shopCua(r.pos_ma));
    if (!t) continue;
    const k = `${r.so_luong}|${r.gia}|${r.tien_te}|${r.nhan || ''}`;
    if (!t.gia.has(k)) t.gia.set(k, { soLuong: r.so_luong, gia: r.gia, tienTe: r.tien_te, nhan: r.nhan || '', page: new Set() });
    t.gia.get(k).page.add(String(r.page_id));
  }
  const trangPage = new Map();
  for (const b of ban) {
    const key = String(b.id);
    if (!trangPage.has(key)) trangPage.set(key, { id: key, pageId: String(b.page_id), ten: b.ten || "", qua: new Set(), shop: new Set() });
    const x = trangPage.get(key);
    x.qua.add(b.qua);
    if (b.pos_ma) { x.shop.add(shopCua(b.pos_ma)); theoShop.get(shopCua(b.pos_ma))?.page.push(key); }
    // VE8b: page gắn cả vào sản phẩm bán ở shop CỦA page (`pos_shop_id`) — hiện dưới đúng thị trường đó.
    else if (b.shop_page) { x.shop.add(String(b.shop_page)); theoShop.get(String(b.shop_page))?.page.push(key); }
  }
  return {
    id: String(g.id), maGoc: g.ma_goc, ten: g.ten, moTa: g.mo_ta, soHieu: g.so_hieu, sku: g.sku ?? null, marketer: g.marketer ?? "",
    marketerMaNv: g.marketer_ma_nv ?? null,
    kienThuc: g.kien_thuc && typeof g.kien_thuc === 'object' ? g.kien_thuc : {},
    thiTruong: [...theoShop.values()].map((t) => {
      const gia = [...t.gia.values()]
        .map((x) => ({ soLuong: x.soLuong, gia: x.gia, tienTe: x.tienTe, nhan: x.nhan, soPage: x.page.size }))
        .sort((a, b) => a.soLuong - b.soLuong || a.gia - b.gia);
      const moiSo = new Map();
      for (const x of gia) moiSo.set(`${x.soLuong}|${x.tienTe}`, (moiSo.get(`${x.soLuong}|${x.tienTe}`) || 0) + 1);
      return { ...t, page: [...new Set(t.page)], gia, lechGia: [...moiSo.values()].some((n) => n > 1),
        coGia: t.mon.some((m) => m.goiGia.some((g) => g.bat)) };
    }),
    page: [...trangPage.values()].map((p) => ({ ...p, qua: [...p.qua], shop: [...p.shop] })),
  };
}

/** Món POS CHƯA thuộc gốc nào (chỗ chọn khi «Thêm thị trường»), gom theo shop. */
export async function monPosChuaGan(pool, teamId) {
  const r = await pool.query(
    `SELECT s.ma, s.ten, s.ton_kho, k.market
       FROM san_pham s
       LEFT JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1)
      WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc IS NULL
      ORDER BY k.market NULLS LAST, s.ten, s.ma`,
    [teamId],
  );
  return r.rows.map((m) => ({ posMa: m.ma, ten: m.ten, tonKho: m.ton_kho, shopId: shopCua(m.ma), thiTruong: m.market || null }));
}

/**
 * GẮN một món POS vào sản phẩm gốc («Thêm thị trường» — hoặc thêm biến thể ở thị trường đã có).
 * Từ chối: gốc không có · món không có/không phải món POS · món ĐÃ thuộc gốc khác (gỡ ở gốc kia trước —
 * đổi chỗ lặng lẽ là kéo cả page đang bán món đó sang sản phẩm khác mà không ai hay).
 */
export async function ganMonPosVaoGoc(pool, teamId, id, posMa) {
  const ma = gon(posMa);
  if (!ma || !ma.includes(":")) throw new LoiSanPhamGoc("mã món POS phải có dạng <shop>:<biến thể>", "ma_pos_la");
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const g = (await khach.query("SELECT ma_goc FROM san_pham_goc WHERE team_id = $1 AND id = $2", [teamId, id])).rows[0];
    if (!g) throw new LoiSanPhamGoc("không có sản phẩm gốc này", "khong_co", 404);
    const m = (await khach.query(
      "SELECT id, ma_goc, nguon FROM san_pham WHERE team_id = $1 AND ma = $2 FOR UPDATE", [teamId, ma],
    )).rows[0];
    if (!m || m.nguon !== "pos") throw new LoiSanPhamGoc("không có món POS này trong danh mục đã kéo", "khong_co_mon", 404);
    if (m.ma_goc && m.ma_goc !== g.ma_goc) {
      throw new LoiSanPhamGoc(`món này đang thuộc sản phẩm «${m.ma_goc}» — gỡ ở đó trước`, "mon_thuoc_goc_khac", 409);
    }
    await khach.query("UPDATE san_pham SET ma_goc = $3, sua_luc = now() WHERE team_id = $1 AND id = $2", [teamId, m.id, g.ma_goc]);
    const daCo = m.ma_goc === g.ma_goc;
    // GSP3c: món THẬT SỰ vào gốc (NULL → G) ⇒ quyết định đối soát cũ của G × shop hết hiệu lực, cùng giao dịch. Gắn lại món vốn đã
    // thuộc G (`daCo`) không đổi tập món ⇒ không bỏ dấu (review (a) N3).
    const boDau = daCo ? 0 : await boDauDoiSoatGocShop(khach, teamId, g.ma_goc, shopCua(ma));
    await khach.query("COMMIT");
    return { maGoc: g.ma_goc, posMa: ma, shopId: shopCua(ma), daCo, boDauDoiSoat: boDau };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/**
 * GỠ một món POS khỏi sản phẩm gốc. Món không thuộc gốc này ⇒ 404 (không gỡ nhầm món của gốc khác).
 * GSP3c: gỡ + bỏ dấu đối soát của gốc × shop (mã gốc CŨ — `RETURNING g.ma_goc`) trong MỘT giao dịch.
 */
export async function goMonPosKhoiGoc(pool, teamId, id, posMa) {
  const ma = gon(posMa);
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const r = await khach.query(
      `UPDATE san_pham s SET ma_goc = NULL, sua_luc = now()
         FROM san_pham_goc g
        WHERE s.team_id = $1 AND g.team_id = $1 AND g.id = $2 AND s.ma = $3 AND s.nguon = 'pos' AND s.ma_goc = g.ma_goc
        RETURNING g.ma_goc`,
      [teamId, id, ma],
    );
    if (!r.rowCount) throw new LoiSanPhamGoc("món này không thuộc sản phẩm gốc này", "khong_thuoc", 404);
    const boDau = await boDauDoiSoatGocShop(khach, teamId, r.rows[0].ma_goc, shopCua(ma));
    await khach.query("COMMIT");
    return { maGoc: r.rows[0].ma_goc, posMa: ma, shopId: shopCua(ma), boDauDoiSoat: boDau };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/* ═══ GSP3c · ĐỔI MÓN ⇒ QUYẾT ĐỊNH ĐỐI SOÁT CŨ HẾT HIỆU LỰC (nợ N-GSP3-DOI-MON + F6 · review (a) C1 · N1 · N3 · N5) ═══════════════
 * Dấu `chep`/`giu_gia_mon` (migration 032, ghi ở `chuyen-ban-sao.js#doiSoatDonVi`) là quyết định của NGƯỜI trên ĐÚNG tập món của
 * gốc × shop lúc quyết. Vị từ `daQuyet` chỉ so CHỮ gốc × shop ⇒ tập món đổi mà dấu còn ⇒ page tính «xong» dù chưa ai so giá với món
 * mới (gỡ x rồi gắn y chưa giá; hoặc thêm món ĐÃ CÓ GIÁ ⇒ cửa tiền MỞ ở giá đó) và bộ đếm `chuaXong` — cổng phát GSP4 — về 0 sớm.
 * Ba cửa đổi tập món của gốc × shop gọi CHUNG hàm dưới đây, trong giao dịch của chính chúng: `ganMonPosVaoGoc` · `goMonPosKhoiGoc` ·
 * `src/pos/doc-danh-muc.js` (lượt «Kéo danh mục» tự nối món theo SKU/số hiệu: món mới mang gốc, hoặc `ma_goc` NULL → gốc).
 */

// Lưới migration 032 — cùng khuôn `chuyen-ban-sao.js#coCot032` (hàm đó không export; tệp đó phiếu khác giữ).
async function coCotDoiSoat(db) {
  const r = await db.query(
    `SELECT count(*)::int AS n FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name = 'san_pham'
        AND column_name IN ('doi_soat', 'doi_soat_luc', 'doi_soat_goc', 'doi_soat_shop')`,
  );
  return r.rows[0]?.n === 4;
}

/**
 * BỎ DẤU đối soát của MỌI bản sao (trong team) mang dấu `chep`/`giu_gia_mon` của đúng gốc × shop ⇒ page của chúng về `cho_doi_soat`
 * (bộ đếm tăng đúng số page đang gắn gốc × shop đó). Trả số bản sao bị bỏ dấu. CSDL chưa áp 032 ⇒ 0, không ném (gắn/gỡ/kéo chạy trên prod).
 *   · Kẹp `team_id`: `ma_goc` chỉ duy nhất TRONG team, còn shop dùng chung nhiều team được (review N3).
 *   · Dấu `bo_qua` KHÔNG đụng — nó chỉ hiệu lực khi page chưa gắn (`daQuyet`), không gắn với tập món nào.
 *   · Bản sao giữ nguyên ngoài bốn cột dấu (không chạm `sua_luc` — cùng luật lượt đánh dấu của đối soát).
 *   · KHÔNG gọi khi SỬA GIÁ món (Theo thị trường · GP1 điền giá): giá thuộc món × shop — MỘT bảng; đối soát đã quyết chọn bảng, còn sửa
 *     giá ở chỗ ghi duy nhất là một quyết định MỚI của người trên nguồn thật. Bỏ dấu mỗi lần sửa giá thì bộ đếm không bao giờ về 0 và
 *     kéo người quay lại so với bản sao mà CR-02-10b đã tuyên là lưu trữ (review N5). Xoá hết bậc ⇒ món không giá ⇒ cửa tiền ĐÓNG.
 */
export async function boDauDoiSoatGocShop(db, teamId, maGoc, shop) {
  if (!maGoc || !shop) return 0;
  if (!(await coCotDoiSoat(db))) return 0;
  const r = await db.query(
    `UPDATE san_pham SET doi_soat = NULL, doi_soat_luc = NULL, doi_soat_goc = NULL, doi_soat_shop = NULL
      WHERE team_id = $1 AND nguon <> 'pos' AND doi_soat IN ('chep', 'giu_gia_mon') AND doi_soat_goc = $2 AND doi_soat_shop = $3`,
    [teamId, String(maGoc), String(shop)],
  );
  return r.rowCount;
}

/**
 * QUÉT LÙI một lần (CHỈ ĐỌC, toàn hệ — mọi team): dấu `chep`/`giu_gia_mon` có thể đã cũ vì ghi trong quãng GSP3 lên prod → GSP3c lên
 * prod (bỏ dấu ở trên chỉ bắt sự kiện SAU deploy). «Cũ» theo đúng định nghĩa phiếu GSP3c ② Ra 6: gốc × shop của dấu HIỆN có món POS
 * (cùng team) mà `san_pham.sua_luc` > `doi_soat_luc`. Trả `{ co032, so, ds }` — `ds` mỗi bản sao một dòng, kèm các món đổi sau dấu,
 * để người soát từng dòng trước khi bỏ dấu (theo gật của người quyết).
 * ⚠️ Đây là CẬN TRÊN, không phải số đúng: `sua_luc` của món POS còn nhảy khi lượt kéo đổi tồn kho/tên/SKU (`doc-danh-muc.js` —
 *    `suaTheoIdPos` ghi `sua_luc`), khi sửa giá món (`operations.js` chế độ chỉ-giá) và khi gắn lại món đã thuộc gốc — những việc đó
 *    KHÔNG đổi tập món. Và nó KHÔNG thấy món đã GỠ khỏi gốc (món không còn ở gốc × shop) — gỡ thuần không mở giá mới nào, còn gỡ rồi
 *    gắn/kéo về thì món mới/món kéo về có `sua_luc` mới nên vẫn đếm.
 * Chạy (tổng, trên máy chủ, từ gốc repo — chỉ đọc; `db/ket-noi.js` tự đọc `DATABASE_URL_V3` ở `.env` gốc repo; đã thử trên hộp cát):
 *   node -e "import('./db/ket-noi.js').then(async ({ voiPool }) => { const { demDauCu } = await
 *     import('./src/products/san-pham-goc.js'); console.log(JSON.stringify(await voiPool((p) => demDauCu(p)), null, 1)); })"
 */
export async function demDauCu(db) {
  if (!(await coCotDoiSoat(db))) return { co032: false, so: 0, ds: [] };
  const r = await db.query(
    `SELECT b.id, b.team_id, b.page_id, b.doi_soat, b.doi_soat_goc, b.doi_soat_shop, b.doi_soat_luc,
            array_agg(m.ma ORDER BY m.ma) AS mon_doi, max(m.sua_luc) AS mon_doi_luc
       FROM san_pham b
       JOIN san_pham m ON m.team_id = b.team_id AND m.nguon = 'pos' AND m.ma_goc = b.doi_soat_goc
                      AND split_part(m.ma, ':', 1) = b.doi_soat_shop AND m.sua_luc > b.doi_soat_luc
      WHERE b.nguon <> 'pos' AND b.doi_soat IN ('chep', 'giu_gia_mon')
      GROUP BY b.id
      ORDER BY b.team_id, b.page_id, b.id`,
  );
  return {
    co032: true,
    so: r.rowCount,
    ds: r.rows.map((d) => ({
      banSaoId: String(d.id), teamId: String(d.team_id), pageId: d.page_id == null ? null : String(d.page_id),
      doiSoat: d.doi_soat, maGoc: d.doi_soat_goc, shopId: d.doi_soat_shop,
      doiSoatLuc: new Date(d.doi_soat_luc).toISOString(), monDoi: d.mon_doi, monDoiLuc: new Date(d.mon_doi_luc).toISOString(),
    })),
  };
}

/* ═══ LL11 · KIẾN THỨC SẢN PHẨM (021) — nhà mới của «kỹ năng» (CR-28-09c) ══════════════════════════════════
 * Khái niệm kỹ năng sinh ra cho đúng MỘT ca (hỏi size: sản phẩm có size hoàn 26,8% / 19,2%, không size 9,3% —
 * 01 §6). Câu đó thuộc về SẢN PHẨM, nên nó sống ở `san_pham_goc.kien_thuc` cùng công dụng · cách dùng…: mở thị
 * trường mới thì biến thể mới tự thừa hưởng. Trước LL11 cột này có người ĐỌC (bộ ráp prompt v3) mà không có
 * đường GHI nào.
 */
export const KHOA_KIEN_THUC = Object.freeze(['cong_dung', 'hop_voi', 'cach_dung', 'hoi_size', 'thanh_phan', 'canh_bao', 'them']);
export const TRAN_KIEN_THUC = 2000;

/** Thay TRỌN khối kiến thức (khoá lạ ⇒ từ chối, không lặng lẽ bỏ; ô rỗng ⇒ không lưu khoá đó). */
export async function suaKienThucGoc(pool, teamId, id, kienThuc = {}) {
  if (!kienThuc || typeof kienThuc !== 'object' || Array.isArray(kienThuc)) {
    throw new LoiSanPhamGoc('kiến thức phải là một bảng khoá → chữ', 'kien_thuc_la');
  }
  const la = Object.keys(kienThuc).filter((k) => !KHOA_KIEN_THUC.includes(k));
  if (la.length) throw new LoiSanPhamGoc(`khoá kiến thức lạ: ${la.join(', ')}`, 'khoa_la');
  const sach = {};
  for (const k of KHOA_KIEN_THUC) {
    const v = gon(kienThuc[k]);
    if (!v) continue;
    if (v.length > TRAN_KIEN_THUC) throw new LoiSanPhamGoc(`«${k}» dài quá ${TRAN_KIEN_THUC} ký tự`, 'kien_thuc_dai');
    sach[k] = v;
  }
  const r = await pool.query(
    `UPDATE san_pham_goc SET kien_thuc = $3::jsonb, sua_luc = now()
      WHERE team_id = $1 AND id = $2
      RETURNING id, ma_goc, kien_thuc, (SELECT kien_thuc FROM san_pham_goc WHERE team_id = $1 AND id = $2) AS cu`,
    [teamId, id, JSON.stringify(sach)],
  );
  if (!r.rowCount) throw new LoiSanPhamGoc('không có sản phẩm gốc này', 'khong_co', 404);
  return { id: String(r.rows[0].id), maGoc: r.rows[0].ma_goc, kienThuc: r.rows[0].kien_thuc, truoc: r.rows[0].cu };
}

/* ═══ VE8a · GỘP MÓN POS THÀNH SẢN PHẨM (bản vẽ 2a′ · CR-28-09c) ═══════════════════════════════════════════
 * Mỗi shop POS đặt mã riêng cho món — cùng một sản phẩm bán ở ba nước là ba mã. KHOÁ GỘP = SKU (người quyết 30/09:
 * «cùng 1 sản phẩm ở các pos id chung 1 sku»; migration 028): `san_pham.sku` chuẩn hoá bằng `chuanSku`. Món chưa có SKU
 * (kéo trước khi có cột) lùi về số đầu tên — đo prod: trùng SKU 371/373 — rồi mới tới tên. MÁY GỢI Ý, NGƯỜI XÁC NHẬN
 * (luật đầu tệp: máy không tự tạo sản phẩm gốc):
 *   · SKU ĐÃ là một sản phẩm ⇒ nhóm «nối vào sản phẩm có sẵn» (lượt kéo sau cũng tự nối — đây là nối NGAY);
 *   · không SKU, không số: cùng tên (chuẩn hoá) mới đứng chung; không tên ⇒ đứng một mình.
 * Gộp nhầm là bot báo giá của nước này cho khách nước khác — nên không có đường «gộp tất cả».
 */
const loaiNhom = { noi: 0, moi: 1 };
const SKU_THU = "sp test";   // SKU món thử của đội vận hành (nợ N-SPTEST) — gộp thì phải thấy cảnh báo

/** Khoá nhóm của một món POS: SKU → số đầu tên → tên. `null` khi không có gì để so (không tên). */
function khoaMon(m) {
  const { soHieu, ten } = tachSoHieu(m.ten || "");
  const sku = chuanSku(m.sku) ?? (soHieu ? chuanSku(soHieu) : null);
  if (sku) return { khoa: `sku:${sku}`, sku, tuTen: !chuanSku(m.sku), ten };
  const k = chuanHoaTen(ten);
  return k ? { khoa: `ten:${k}`, sku: null, ten } : { khoa: `mon:${m.ma}`, sku: null, ten };
}

/** Gợi ý gộp + số đầu màn. Chỉ ĐỌC; món đã thuộc sản phẩm không vào gợi ý. */
export async function goiYGopMonPos(pool, teamId) {
  const [mon, goc, kn, tong, banSao] = await Promise.all([
    pool.query(
      `SELECT s.ma, s.ten, s.sku, s.ton_kho, k.market
         FROM san_pham s
         LEFT JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1)
        WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc IS NULL
        ORDER BY s.ma`,
      [teamId],
    ),
    pool.query("SELECT id, ma_goc, ten, so_hieu, sku FROM san_pham_goc WHERE team_id = $1", [teamId]),
    pool.query("SELECT shop_id, bat FROM ket_noi_pos WHERE team_id = $1", [teamId]),
    pool.query(
      `SELECT count(*)::int AS mon, count(DISTINCT split_part(ma, ':', 1))::int AS shop,
              count(*) FILTER (WHERE sku IS NULL)::int AS chua_sku
         FROM san_pham WHERE team_id = $1 AND nguon = 'pos'`,
      [teamId],
    ),
    pool.query(
      `SELECT count(*)::int AS tong, count(*) FILTER (WHERE pos_ma IS NULL)::int AS chua_noi
         FROM san_pham WHERE team_id = $1 AND nguon <> 'pos' AND page_id IS NOT NULL`,
      [teamId],
    ),
  ]);
  // Sản phẩm có sẵn theo SKU — gốc cũ chỉ mang số hiệu thì số hiệu cũng là SKU (cùng không gian khoá sau `chuanSku`).
  const gocTheoSku = new Map();
  for (const g of goc.rows) {
    const k = chuanSku(g.sku) ?? (g.so_hieu != null ? chuanSku(g.so_hieu) : null);
    if (k && !gocTheoSku.has(k)) gocTheoSku.set(k, g);
  }
  const theoKhoa = new Map();
  for (const m of mon.rows) {
    const k = khoaMon(m);
    if (!theoKhoa.has(k.khoa)) theoKhoa.set(k.khoa, { ...k, ds: [], tenTheo: new Map(), tuTen: 0, skuTho: null });
    const o = theoKhoa.get(k.khoa);
    if (!o.skuTho && m.sku) o.skuTho = String(m.sku).trim();   // SKU để HIỆN: nguyên văn POS, không phải khoá chuẩn hoá
    o.ds.push({ posMa: m.ma, tenPos: m.ten || "", sku: m.sku || null, shopId: shopCua(m.ma), thiTruong: m.market || null, tonKho: m.ton_kho });
    if (k.tuTen) o.tuTen += 1;
    const kt = chuanHoaTen(k.ten);
    if (!o.tenTheo.has(kt)) o.tenTheo.set(kt, { ten: k.ten, n: 0 });
    o.tenTheo.get(kt).n += 1;
  }
  const nhom = [...theoKhoa.values()].map((o) => {
    // Tên đại diện = tên gặp nhiều nhất; hoà thì tên dài nhất (bản ngắn hay là bản bị cắt — đo 15/09).
    const daiDien = [...o.tenTheo.values()].sort((a, b) => b.n - a.n || b.ten.length - a.ten.length)[0];
    const soShop = new Set(o.ds.map((x) => x.shopId)).size;
    const tenLech = o.tenTheo.size > 1 ? [...o.tenTheo.values()].map((x) => x.ten) : [];
    const canh = [
      o.sku === SKU_THU ? `SKU «SP TEST» là món thử — kiểm trước khi gộp` : "",
      o.tuTen ? `${o.tuTen} món chưa có SKU (kéo lại danh mục để lấy) — tạm theo số đầu tên` : "",
    ].filter(Boolean);
    const g = o.sku ? gocTheoSku.get(o.sku) : null;
    const skuHien = o.skuTho || o.sku;
    if (g) {
      return { khoa: `goc:${g.id}`, loai: "noi", sku: o.sku, skuHien, gocId: String(g.id), maGoc: g.ma_goc, ten: g.ten || "",
        soShop, tenLech, canh, mon: o.ds,
        lyDo: `SKU ${skuHien} đã là sản phẩm «${g.ten || g.ma_goc}» — ${o.ds.length} món chưa nối` };
    }
    return { khoa: o.khoa, loai: "moi", sku: o.sku, skuHien, ten: daiDien.ten, maGocDeXuat: maGocDeXuat(daiDien.ten),
      soShop, tenLech, canh, mon: o.ds,
      lyDo: o.sku
        ? (soShop > 1 ? `Cùng SKU ${skuHien} ở ${soShop} shop` : `SKU ${skuHien} · ${o.ds.length} món · một shop`)
        : (soShop > 1 ? `Cùng tên ở ${soShop} shop · không có SKU — xem kỹ trước khi gộp` : "Không có SKU — gộp thì shop mới KHÔNG tự nối") };
  });
  nhom.sort((a, b) => loaiNhom[a.loai] - loaiNhom[b.loai] || b.soShop - a.soShop
    || (a.sku == null) - (b.sku == null) || String(a.sku).localeCompare(String(b.sku), "vi", { numeric: true })
    || String(a.ten).localeCompare(String(b.ten)));
  return {
    dem: {
      shopTong: kn.rows.length, shopBat: kn.rows.filter((k) => k.bat).length, shopDaKeo: tong.rows[0].shop,
      monPos: tong.rows[0].mon, monChuaGan: mon.rows.length, monChuaSku: tong.rows[0].chua_sku, soGoc: goc.rows.length,
      banSao: banSao.rows[0].tong, banSaoChuaNoi: banSao.rows[0].chua_noi,
    },
    nhom,
  };
}

/**
 * GỘP: tạo MỘT sản phẩm gốc (mang SKU chuẩn hoá — khoá tự nối món shop mới — và marketer phụ trách) rồi gắn các món
 * đã chọn — MỘT giao dịch, được cả hoặc không gì. SKU dạng số 1–4 chữ số điền luôn `so_hieu` (74 chỗ đọc cột cũ).
 * Từ chối (không để lại gì): chưa chọn món · món không có / không phải món POS · món đã thuộc sản phẩm khác · mã gốc
 * hoặc SKU trùng.
 */
export async function gopMonThanhGoc(pool, teamId, { maGoc, ten, sku, marketer, marketerMaNv, posMa } = {}) {
  const ma = batBuocMaGoc(maGoc);
  const mk = gon(marketer).slice(0, 120);
  const ds = [...new Set((Array.isArray(posMa) ? posMa : []).map(gon).filter(Boolean))];
  if (!ds.length) throw new LoiSanPhamGoc("chưa chọn món POS nào để gộp", "thieu_mon");
  if (ds.length > 200) throw new LoiSanPhamGoc("một lượt gộp tối đa 200 món", "nhieu_mon");
  const la = ds.find((m) => !m.includes(":"));
  if (la) throw new LoiSanPhamGoc(`mã món POS phải có dạng <shop>:<biến thể> — «${la}» thì không`, "ma_pos_la");
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const mon = (await khach.query(
      "SELECT id, ma, ma_goc, nguon, sku FROM san_pham WHERE team_id = $1 AND ma = ANY($2::text[]) FOR UPDATE",
      [teamId, ds],
    )).rows;
    const co = new Map(mon.map((m) => [m.ma, m]));
    const thieu = ds.filter((m) => co.get(m)?.nguon !== "pos");
    if (thieu.length) {
      throw new LoiSanPhamGoc(`không có món POS này trong danh mục đã kéo: ${thieu.slice(0, 5).join(", ")}`, "khong_co_mon", 404);
    }
    const daThuoc = mon.find((m) => m.ma_goc);
    if (daThuoc) {
      throw new LoiSanPhamGoc(`món ${daThuoc.ma} đang thuộc sản phẩm «${daThuoc.ma_goc}» — gỡ ở đó trước`, "mon_thuoc_goc_khac", 409);
    }
    const khongSku = mon.filter((m) => !chuanSku(m.sku));
    if (khongSku.length) {
      throw new LoiSanPhamGoc(`món chưa có SKU: ${khongSku.map((m) => m.ma).join(', ')} — kéo lại danh mục ở Cài đặt › Kết nối để lấy SKU thật, rồi gộp`, 'mon_chua_sku', 409);
    }
    const cacSku = new Set(mon.map((m) => chuanSku(m.sku)));
    if (cacSku.size !== 1) {
      throw new LoiSanPhamGoc(`các món có SKU khác nhau: ${mon.map((m) => `${m.ma}: ${m.sku}`).join(', ')}`, 'sku_khac_nhau', 409);
    }
    const khoa = [...cacSku][0];
    if (sku !== undefined && chuanSku(sku) !== khoa) {
      throw new LoiSanPhamGoc(`SKU gửi lên lệch SKU thật của món (${khoa}) — đọc lại gợi ý rồi gộp`, 'sku_lech', 409);
    }
    const so = /^[0-9]{1,4}$/.test(khoa) ? khoa : null;
    let g;
    try {
      g = (await khach.query(
        `INSERT INTO san_pham_goc (team_id, ma_goc, ten, mo_ta, so_hieu, sku, marketer, marketer_ma_nv)
         VALUES ($1,$2,$3,'',$4,$5,$6,$7) RETURNING id, ma_goc, ten, mo_ta, so_hieu, sku, marketer, marketer_ma_nv, tao_luc, sua_luc`,
        [teamId, ma, gon(ten), so, khoa, mk, gon(marketerMaNv) || null],
      )).rows[0];
    } catch (e) {
      throw loiTrung(e, so, ma, khoa);
    }
    await khach.query(
      "UPDATE san_pham SET ma_goc = $3, sua_luc = now() WHERE team_id = $1 AND ma = ANY($2::text[]) AND nguon = 'pos' AND ma_goc IS NULL",
      [teamId, ds, ma],
    );
    await khach.query("COMMIT");
    return { ...doiRa(g), sku: g.sku, marketer: g.marketer, soBienThe: ds.length, posMa: ds };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/* ═══ VE8b · GIÁ THEO THỊ TRƯỜNG + GẮN PAGE — ngay trong màn Sản phẩm (người quyết 30/09) ═════════════════════════
 * «giá theo thị trường tức theo từng pos id, crud được ở đây … page cũng có thể gắn được ở đây» · «1 page chỉ của 1
 * marketer và bán 1 sản phẩm tại 1 thời điểm» · page die ⇒ gắn sản phẩm sang page mới.
 *   · GIÁ của một thị trường = `goi_gia` của CHÍNH món POS shop đó — đúng thứ `catalog.js#docSanPhamGoiGia` đọc cho page đã
 *     gán vào sản phẩm (bot báo giá và cửa tiền cùng một nguồn). Ghi qua `saveProduct` chế độ chỉ-giá (nối dây ở máy chủ).
 *   · GẮN PAGE ghi MỘT lần bốn cột: sản phẩm · shop POS · thị trường (tên ở Kết nối) · marketer của sản phẩm. Thiếu
 *     `pos_shop_id` thì `catalog.js` trả page 0 sản phẩm — nên shop bắt buộc, và phải là thị trường sản phẩm có bán.
 */
async function giaCuaMon(pool, teamId, ids) {
  const ra = new Map();
  if (!ids.length) return ra;
  const r = await pool.query(
    `SELECT san_pham_id, so_luong, gia::float8 AS gia, tien_te, gia_goc::float8 AS gia_goc, khuyen_mai,
            phi_ship::float8 AS phi_ship, mien_ship, bat, nhan
       FROM goi_gia WHERE team_id = $1 AND san_pham_id = ANY($2::bigint[]) ORDER BY so_luong`,
    [teamId, ids.map(String)],
  );
  for (const g of r.rows) {
    const hs = HE_SO_TE[g.tien_te] || 1;   // ô nhập ở đơn vị LỚN — cùng quy ước với `saveProduct`
    const k = String(g.san_pham_id);
    if (!ra.has(k)) ra.set(k, []);
    ra.get(k).push({ soLuong: g.so_luong, gia: g.gia / hs, tienTe: g.tien_te, giaGoc: g.gia_goc == null ? null : g.gia_goc / hs,
      khuyenMai: g.khuyen_mai || "", phiShip: g.phi_ship == null ? null : g.phi_ship / hs, mienShip: g.mien_ship,
      bat: g.bat !== false, nhan: g.nhan || "" });
  }
  return ra;
}

/** Món POS `posMa` có thuộc sản phẩm `id` không — cửa trước lượt lưu giá (không sửa giá món của sản phẩm khác). */
export async function monCuaGoc(pool, teamId, id, posMa) {
  const r = await pool.query(
    `SELECT s.id FROM san_pham s JOIN san_pham_goc g ON g.team_id = s.team_id AND g.ma_goc = s.ma_goc
      WHERE s.team_id = $1 AND g.id = $2 AND s.ma = $3 AND s.nguon = 'pos'`,
    [teamId, String(id), gon(posMa)],
  );
  if (!r.rowCount) throw new LoiSanPhamGoc("món này không thuộc sản phẩm này", "khong_thuoc", 404);
  return { id: String(r.rows[0].id) };
}

/** GẮN page vào sản phẩm ở một thị trường: ghi sản phẩm · shop · thị trường · marketer — một giao dịch. */
export async function ganPageVaoGoc(pool, teamId, id, { pageId, shopId } = {}) {
  const shop = gon(shopId);
  if (!shop) throw new LoiSanPhamGoc("chọn thị trường (shop POS) cho page", "thieu_shop");
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const g = (await khach.query("SELECT ma_goc, marketer FROM san_pham_goc WHERE team_id = $1 AND id = $2", [teamId, String(id)])).rows[0];
    if (!g) throw new LoiSanPhamGoc("không có sản phẩm gốc này", "khong_co", 404);
    const ban = (await khach.query(
      "SELECT count(*)::int AS n FROM san_pham WHERE team_id = $1 AND nguon = 'pos' AND ma_goc = $2 AND split_part(ma, ':', 1) = $3",
      [teamId, g.ma_goc, shop],
    )).rows[0].n;
    if (!ban) {
      throw new LoiSanPhamGoc(`sản phẩm chưa bán ở shop ${shop} — thêm thị trường trước (tab «Theo thị trường»)`, "shop_ngoai_san_pham", 409);
    }
    const p = (await khach.query(
      "SELECT id, page_id, ten, san_pham_goc_ma, pos_shop_id, thi_truong, marketer FROM page WHERE team_id = $1 AND id = $2 FOR UPDATE",
      [teamId, String(pageId ?? "")],
    )).rows[0];
    if (!p) throw new LoiSanPhamGoc("không có page này trong team", "khong_co_page", 404);
    const tt = (await khach.query("SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2 LIMIT 1", [teamId, shop])).rows[0]?.market ?? null;
    const mk = g.marketer || p.marketer || "";
    await khach.query(
      `UPDATE page SET san_pham_goc_ma = $3, pos_shop_id = $4, thi_truong = COALESCE($5, thi_truong), marketer = $6, sua_luc = now()
        WHERE team_id = $1 AND id = $2`,
      [teamId, p.id, g.ma_goc, shop, tt, mk],
    );
    // GSP3 (review chặng 2 GSP2 F2): «không chuyển» (`bo_qua`) chỉ là quyết định cho page CHƯA gắn. Gắn ⇒ xoá dấu đó cùng giao
    // dịch — không thì gắn → gỡ làm `bo_qua` sống lại và page rời bộ đếm mà không ai quyết lại. CSDL chưa áp 032 ⇒ bỏ qua bước
    // dọn, gắn như cũ (câu kiểm cột cùng khuôn `chuyen-ban-sao.js#coCot032`).
    const co032 = (await khach.query(
      `SELECT count(*)::int AS n FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = 'san_pham'
          AND column_name IN ('doi_soat', 'doi_soat_luc', 'doi_soat_goc', 'doi_soat_shop')`,
    )).rows[0]?.n === 4;
    if (co032) {
      await khach.query(
        `UPDATE san_pham SET doi_soat = NULL, doi_soat_luc = NULL, doi_soat_goc = NULL, doi_soat_shop = NULL
          WHERE team_id = $1 AND page_id = $2 AND nguon <> 'pos' AND doi_soat = 'bo_qua'`,
        [teamId, p.id],
      );
    }
    const bac = (await khach.query(
      `SELECT count(*)::int AS n FROM goi_gia gg JOIN san_pham s ON s.id = gg.san_pham_id AND s.team_id = gg.team_id
        WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc = $2 AND split_part(s.ma, ':', 1) = $3 AND gg.bat IS NOT FALSE`,
      [teamId, g.ma_goc, shop],
    )).rows[0].n;
    await khach.query("COMMIT");
    return {
      pageId: String(p.id), pageFb: p.page_id, ten: p.ten || "", maGoc: g.ma_goc, shopId: shop, thiTruong: tt ?? p.thi_truong,
      marketer: mk, soBacGia: bac,
      truoc: { sanPhamGocMa: p.san_pham_goc_ma, posShopId: p.pos_shop_id, thiTruong: p.thi_truong, marketer: p.marketer },
    };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** GỠ page khỏi sản phẩm (page chết / thôi bán). Giữ shop · thị trường · marketer của page — chỉ bỏ sản phẩm. */
export async function goPageKhoiGoc(pool, teamId, id, pageId) {
  const r = await pool.query(
    `UPDATE page p SET san_pham_goc_ma = NULL, sua_luc = now()
       FROM san_pham_goc g
      WHERE p.team_id = $1 AND g.team_id = $1 AND g.id = $2 AND p.id = $3 AND p.san_pham_goc_ma = g.ma_goc
      RETURNING p.id, p.page_id, p.ten, g.ma_goc`,
    [teamId, String(id), String(pageId ?? "")],
  );
  if (!r.rowCount) throw new LoiSanPhamGoc("page này không bán sản phẩm này", "khong_thuoc", 404);
  const d = r.rows[0];
  return { pageId: String(d.id), pageFb: d.page_id, ten: d.ten || "", maGoc: d.ma_goc };
}
