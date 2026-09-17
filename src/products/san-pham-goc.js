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
import { tachSoHieu } from "../pos/ten-goc.js";

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
              WHERE s.team_id = g.team_id AND s.ma_goc = g.ma_goc) AS so_bien_the
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
    if (e?.code === "23505") {
      throw new LoiSanPhamGoc(
        so && /so_hieu/.test(e.constraint || "")
          ? `số hiệu ${so} đã thuộc một sản phẩm gốc khác của team này`
          : `mã gốc "${ma}" đã có trong team này`,
        "trung", 409,
      );
    }
    throw e;
  }
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
