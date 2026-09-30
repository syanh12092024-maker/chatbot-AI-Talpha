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
import { tachSoHieu, chuanHoaTen, maGocDeXuat, gopTheoSoHieu } from "../pos/ten-goc.js";

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
    `SELECT g.id, g.ma_goc, g.ten, g.mo_ta, g.so_hieu, g.tao_luc, g.sua_luc,
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

/** 23505 của `san_pham_goc` ⇒ lỗi người đọc được (mã trùng hay số hiệu trùng); lỗi khác trả nguyên. */
function loiTrung(e, so, ma) {
  if (e?.code !== "23505") return e;
  return new LoiSanPhamGoc(
    so && /so_hieu/.test(e.constraint || "")
      ? `số hiệu ${so} đã thuộc một sản phẩm gốc khác của team này`
      : `mã gốc "${ma}" đã có trong team này`,
    "trung", 409,
  );
}

/**
 * SỬA tên/mô tả/số hiệu. `ma_goc` KHÔNG sửa được ở đây, và đó là chủ ý: nó là khoá mà
 * `san_pham.ma_goc`, `kich_ban.san_pham_goc_ma` và `page.san_pham_goc_ma` đang trỏ tới —
 * đổi nó bằng một câu UPDATE là bỏ rơi mọi chỗ trỏ, im lặng.
 */
export async function suaSanPhamGoc(pool, teamId, id, { ten, moTa, soHieu } = {}) {
  const dat = [];
  const tham = [teamId, String(id)];
  if (ten !== undefined) { tham.push(gon(ten)); dat.push(`ten = $${tham.length}`); }
  if (moTa !== undefined) { tham.push(gon(moTa)); dat.push(`mo_ta = $${tham.length}`); }
  if (soHieu !== undefined) { tham.push(batBuocSoHieu(soHieu)); dat.push(`so_hieu = $${tham.length}`); }
  if (!dat.length) throw new LoiSanPhamGoc("không có gì để sửa", "rong");
  try {
    const r = await pool.query(
      `UPDATE san_pham_goc SET ${dat.join(", ")}, sua_luc = now()
        WHERE team_id = $1 AND id = $2
        RETURNING id, ma_goc, ten, mo_ta, so_hieu, tao_luc, sua_luc`,
      tham,
    );
    if (!r.rowCount) throw new LoiSanPhamGoc(`không có sản phẩm gốc #${id} trong team này`, "khong_thay", 404);
    return doiRa(r.rows[0]);
  } catch (e) {
    if (e?.code === "23505") {
      throw new LoiSanPhamGoc(`số hiệu này đã thuộc một sản phẩm gốc khác của team`, "trung", 409);
    }
    throw e;
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
  await pool.query("DELETE FROM san_pham_goc WHERE team_id = $1 AND id = $2", [teamId, String(id)]);
  return { id: String(id), maGoc: ma, ten: cu.rows[0].ten };
}

function doiRa(d) {
  return {
    id: String(d.id),
    maGoc: d.ma_goc,
    ten: d.ten,
    moTa: d.mo_ta,
    soHieu: d.so_hieu,
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
    "SELECT id, ma_goc, ten, mo_ta, so_hieu, kien_thuc FROM san_pham_goc WHERE team_id = $1 AND id = $2",
    [teamId, id],
  )).rows[0];
  if (!g) return null;
  const mon = (await pool.query(
    `SELECT s.ma, s.ten, s.ton_kho, s.het_hang, k.market
       FROM san_pham s
       LEFT JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1)
      WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc = $2
      ORDER BY k.market NULLS LAST, s.ma`,
    [teamId, g.ma_goc],
  )).rows;
  const ban = (await pool.query(
    `SELECT p.id, p.page_id, p.ten, 'mon_pos' AS qua, s.pos_ma
       FROM san_pham s JOIN page p ON p.id = s.page_id AND p.team_id = s.team_id
      WHERE s.team_id = $1 AND s.nguon <> 'pos' AND s.pos_ma = ANY($2::text[])
     UNION ALL
     SELECT p.id, p.page_id, p.ten, 'ca_page' AS qua, NULL AS pos_ma
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
  for (const m of mon) {
    const shop = shopCua(m.ma);
    if (!theoShop.has(shop)) theoShop.set(shop, { shopId: shop, thiTruong: m.market || null, mon: [], page: [], gia: new Map() });
    theoShop.get(shop).mon.push({ posMa: m.ma, ten: m.ten, tonKho: m.ton_kho, hetHang: !!m.het_hang });
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
  }
  return {
    id: String(g.id), maGoc: g.ma_goc, ten: g.ten, moTa: g.mo_ta, soHieu: g.so_hieu,
    kienThuc: g.kien_thuc && typeof g.kien_thuc === 'object' ? g.kien_thuc : {},
    thiTruong: [...theoShop.values()].map((t) => {
      const gia = [...t.gia.values()]
        .map((x) => ({ soLuong: x.soLuong, gia: x.gia, tienTe: x.tienTe, nhan: x.nhan, soPage: x.page.size }))
        .sort((a, b) => a.soLuong - b.soLuong || a.gia - b.gia);
      const moiSo = new Map();
      for (const x of gia) moiSo.set(`${x.soLuong}|${x.tienTe}`, (moiSo.get(`${x.soLuong}|${x.tienTe}`) || 0) + 1);
      return { ...t, page: [...new Set(t.page)], gia, lechGia: [...moiSo.values()].some((n) => n > 1) };
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
    await khach.query("COMMIT");
    return { maGoc: g.ma_goc, posMa: ma, shopId: shopCua(ma), daCo: m.ma_goc === g.ma_goc };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** GỠ một món POS khỏi sản phẩm gốc. Món không thuộc gốc này ⇒ 404 (không gỡ nhầm món của gốc khác). */
export async function goMonPosKhoiGoc(pool, teamId, id, posMa) {
  const ma = gon(posMa);
  const r = await pool.query(
    `UPDATE san_pham s SET ma_goc = NULL, sua_luc = now()
       FROM san_pham_goc g
      WHERE s.team_id = $1 AND g.team_id = $1 AND g.id = $2 AND s.ma = $3 AND s.nguon = 'pos' AND s.ma_goc = g.ma_goc
      RETURNING g.ma_goc`,
    [teamId, id, ma],
  );
  if (!r.rowCount) throw new LoiSanPhamGoc("món này không thuộc sản phẩm gốc này", "khong_thuoc", 404);
  return { maGoc: r.rows[0].ma_goc, posMa: ma, shopId: shopCua(ma) };
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
 * Mỗi shop POS đặt mã riêng cho món — cùng một sản phẩm bán ở ba nước là ba mã. MÁY GỢI Ý nhóm, NGƯỜI xác nhận
 * (luật đầu tệp: máy không tự tạo sản phẩm gốc):
 *   · cùng SỐ HIỆU — khoá gộp chắc (`gopTheoSoHieu` của `src/pos/ten-goc.js`, MỘT luật với script gợi ý cũ);
 *   · số hiệu ĐÃ là một sản phẩm ⇒ nhóm «nối vào sản phẩm có sẵn» (lượt kéo sau cũng tự nối — đây là nối NGAY);
 *   · món KHÔNG số hiệu: cùng tên (chuẩn hoá bằng `chuanHoaTen`) mới đứng chung một nhóm; không tên ⇒ đứng một mình.
 * Gộp nhầm là bot báo giá của nước này cho khách nước khác — nên không có đường «gộp tất cả».
 */
const loaiNhom = { noi: 0, moi: 1 };

/** Gợi ý gộp + năm con số đầu màn. Chỉ ĐỌC; món đã thuộc sản phẩm không vào gợi ý. */
export async function goiYGopMonPos(pool, teamId) {
  const [mon, goc, kn, tong, banSao] = await Promise.all([
    pool.query(
      `SELECT s.ma, s.ten, s.ton_kho, k.market
         FROM san_pham s
         LEFT JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1)
        WHERE s.team_id = $1 AND s.nguon = 'pos' AND s.ma_goc IS NULL
        ORDER BY s.ma`,
      [teamId],
    ),
    pool.query("SELECT id, ma_goc, ten, so_hieu FROM san_pham_goc WHERE team_id = $1", [teamId]),
    pool.query("SELECT shop_id, bat FROM ket_noi_pos WHERE team_id = $1", [teamId]),
    pool.query(
      `SELECT count(*)::int AS mon, count(DISTINCT split_part(ma, ':', 1))::int AS shop
         FROM san_pham WHERE team_id = $1 AND nguon = 'pos'`,
      [teamId],
    ),
    pool.query(
      `SELECT count(*)::int AS tong, count(*) FILTER (WHERE pos_ma IS NULL)::int AS chua_noi
         FROM san_pham WHERE team_id = $1 AND nguon <> 'pos' AND page_id IS NOT NULL`,
      [teamId],
    ),
  ]);
  const gocTheoSo = new Map(goc.rows.filter((g) => g.so_hieu != null).map((g) => [String(g.so_hieu), g]));
  const ra = (m) => ({ posMa: m.ma, tenPos: m.ten || "", shopId: shopCua(m.ma), thiTruong: m.market || null, tonKho: m.ton_kho });
  const { nhom: theoSo, khongSo } = gopTheoSoHieu(mon.rows.map((m) => ({ ma: m.ma, ten: m.ten || "", cho: shopCua(m.ma), dong: m })));

  const nhom = theoSo.map((n) => {
    const ds = n.thanhVien.map((t) => ra(t.dong));
    const g = gocTheoSo.get(n.soHieu);
    if (g) {
      return { khoa: `goc:${g.id}`, loai: "noi", soHieu: n.soHieu, gocId: String(g.id), maGoc: g.ma_goc, ten: g.ten || "",
        soShop: n.soShop, tenLech: n.tenLech, mon: ds,
        lyDo: `Số hiệu ${n.soHieu} đã là sản phẩm «${g.ten || g.ma_goc}» — ${ds.length} món chưa nối` };
    }
    return { khoa: `so:${n.soHieu}`, loai: "moi", soHieu: n.soHieu, ten: n.ten, maGocDeXuat: n.maGocDeXuat,
      soShop: n.soShop, tenLech: n.tenLech, mon: ds,
      lyDo: n.soShop > 1 ? `Cùng số hiệu ${n.soHieu} ở ${n.soShop} shop` : `Số hiệu ${n.soHieu} · ${ds.length} món · một shop` };
  });
  const theoTen = new Map();
  for (const t of khongSo) {
    const k = chuanHoaTen(t.ten);
    const khoa = k ? `ten:${k}` : `mon:${t.ma}`;   // không tên ⇒ không gom với ai
    if (!theoTen.has(khoa)) theoTen.set(khoa, { ten: t.ten, ds: [] });
    theoTen.get(khoa).ds.push(ra(t.dong));
  }
  for (const [khoa, { ten, ds }] of theoTen) {
    const soShop = new Set(ds.map((x) => x.shopId)).size;
    nhom.push({ khoa, loai: "moi", soHieu: null, ten, maGocDeXuat: maGocDeXuat(ten), soShop, tenLech: [], mon: ds,
      lyDo: soShop > 1 ? `Cùng tên ở ${soShop} shop · không có số hiệu — xem kỹ trước khi gộp` : "Không có số hiệu — gộp thì lượt kéo sau KHÔNG tự nối shop mới" });
  }
  nhom.sort((a, b) => loaiNhom[a.loai] - loaiNhom[b.loai] || b.soShop - a.soShop
    || (a.soHieu == null) - (b.soHieu == null) || Number(a.soHieu) - Number(b.soHieu) || String(a.ten).localeCompare(String(b.ten)));
  return {
    dem: {
      shopTong: kn.rows.length, shopBat: kn.rows.filter((k) => k.bat).length, shopDaKeo: tong.rows[0].shop,
      monPos: tong.rows[0].mon, monChuaGan: mon.rows.length, soGoc: goc.rows.length,
      banSao: banSao.rows[0].tong, banSaoChuaNoi: banSao.rows[0].chua_noi,
    },
    nhom,
  };
}

/**
 * GỘP: tạo MỘT sản phẩm gốc và gắn các món đã chọn — MỘT giao dịch, được cả hoặc không gì. Từ chối (không để lại
 * gì): chưa chọn món · món không có / không phải món POS · món đã thuộc sản phẩm khác · mã gốc hoặc số hiệu trùng.
 */
export async function gopMonThanhGoc(pool, teamId, { maGoc, ten, soHieu, posMa } = {}) {
  const ma = batBuocMaGoc(maGoc);
  const so = batBuocSoHieu(soHieu);
  const ds = [...new Set((Array.isArray(posMa) ? posMa : []).map(gon).filter(Boolean))];
  if (!ds.length) throw new LoiSanPhamGoc("chưa chọn món POS nào để gộp", "thieu_mon");
  if (ds.length > 200) throw new LoiSanPhamGoc("một lượt gộp tối đa 200 món", "nhieu_mon");
  const la = ds.find((m) => !m.includes(":"));
  if (la) throw new LoiSanPhamGoc(`mã món POS phải có dạng <shop>:<biến thể> — «${la}» thì không`, "ma_pos_la");
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const mon = (await khach.query(
      "SELECT id, ma, ma_goc, nguon FROM san_pham WHERE team_id = $1 AND ma = ANY($2::text[]) FOR UPDATE",
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
    let g;
    try {
      g = (await khach.query(
        `INSERT INTO san_pham_goc (team_id, ma_goc, ten, mo_ta, so_hieu)
         VALUES ($1,$2,$3,'',$4) RETURNING id, ma_goc, ten, mo_ta, so_hieu, tao_luc, sua_luc`,
        [teamId, ma, gon(ten), so],
      )).rows[0];
    } catch (e) {
      throw loiTrung(e, so, ma);
    }
    await khach.query(
      "UPDATE san_pham SET ma_goc = $3, sua_luc = now() WHERE team_id = $1 AND ma = ANY($2::text[]) AND nguon = 'pos' AND ma_goc IS NULL",
      [teamId, ds, ma],
    );
    await khach.query("COMMIT");
    return { ...doiRa(g), soBienThe: ds.length, posMa: ds };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}
