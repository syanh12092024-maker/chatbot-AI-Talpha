// ĐỌC KẾT NỐI POS của một team (bảng `ket_noi_pos`, migration 002).
//
// Bảng này chứa BÍ MẬT (khoá API POS, mã hoá AES-256-GCM) nên nó cố ý nằm NGOÀI
// `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2 — không mở nó ra cho một hàm
// `SELECT *` dùng chung. Đây là bộ đọc riêng, đúng án lệ `ghiCauHinhModel` (L0-M1).
//
// ⛔ Đối tượng trả về MANG KHOÁ NGUYÊN VĂN trong bộ nhớ. Cấm log nó, cấm ghi nó xuống
//    đĩa, cấm đưa nguyên vẹn vào `nhat_ky` — chỉ log `market`/`shopId`.
import { giaiMa, maHoa } from "../../db/khoa.js";
import { xacDinhTeam } from "./kho.js";
import { moiTruongKhoa } from "./moi-truong.js";

/** Lỗi CÓ TÊN — không có kết nối POS cho thị trường này trong team. */
export class LoiThieuKetNoiPos extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiThieuKetNoiPos";
  }
}

function doDayKhoa(dong, env) {
  // Khoá gốc có thể chỉ nằm ở tệp `.env` (không script v3 nào nạp nó vào process.env).
  const apiKey = giaiMa(dong.api_key_ma, moiTruongKhoa(env));
  if (!apiKey) {
    throw new LoiThieuKetNoiPos(
      `kết nối POS ${dong.market} (shop ${dong.shop_id}) giải mã ra rỗng — khoá hỏng.`,
    );
  }
  return {
    id: String(dong.id),
    teamId: String(dong.team_id),
    market: dong.market,
    shopId: dong.shop_id,
    apiKey, // ⛔ BÍ MẬT — không log
    bat: dong.bat,
  };
}

/**
 * Lấy MỘT kết nối theo tên thị trường.
 * `market` là khoá NGƯỜI (Saudi/UAE/…) vì `don_hang` không có cột shop — mọi lượt gọi
 * cửa POS phải khai thị trường tường minh. Đó là lựa chọn fail-CLOSED: thà bắt người
 * gọi nói rõ còn hơn đoán shop từ `page_id` (đo 22/08: 17,4% đơn thật KHÔNG có page_id).
 */
export async function layKetNoi(
  pool,
  ctx,
  market,
  { teamId = null, env = process.env } = {},
) {
  const team = await xacDinhTeam(pool, ctx, {
    teamId,
    doiTuong: "ket_noi_pos",
  });
  const r = await pool.query(
    "SELECT * FROM ket_noi_pos WHERE team_id = $1 AND market = $2 AND bat",
    [team.teamId, market],
  );
  if (!r.rowCount) {
    throw new LoiThieuKetNoiPos(
      `team ${team.teamId} không có kết nối POS đang bật cho thị trường "${market}" ` +
        `— chạy \`npm run di-tru\` để nạp từ pancake-shops.json, hoặc kiểm cột bat.`,
    );
  }
  return doDayKhoa(r.rows[0], env);
}

/** Liệt kê thị trường của một team — KHÔNG giải mã khoá (dùng cho màn/cổng đếm). */
export async function lietKeThiTruong(pool, ctx, { teamId = null } = {}) {
  const team = await xacDinhTeam(pool, ctx, {
    teamId,
    doiTuong: "ket_noi_pos",
  });
  const r = await pool.query(
    "SELECT id, market, shop_id, bat FROM ket_noi_pos WHERE team_id = $1 ORDER BY market",
    [team.teamId],
  );
  return r.rows.map((d) => ({
    id: String(d.id),
    market: d.market,
    shopId: d.shop_id,
    bat: d.bat,
  }));
}

/* ═══════════════════ GHI KẾT NỐI POS (15/09/2026) ═══════════════════════════════════
 *
 * Trước lượt này bảng `ket_noi_pos` CHỈ được ghi bởi `db/di-tru/ket-noi-pos.js` đọc tệp
 * `pancake-shops.json`. Tức thêm một thị trường, đổi một khoá API, hay tắt một shop đều
 * phải SSH vào máy chủ rồi gõ SQL. Đây là đường TIỀN — không có kết nối đang bật thì
 * `layKetNoi()` ném và team đó KHÔNG tạo được đơn cho thị trường ấy — nên nó là chỗ ít
 * xứng đáng phải mở `psql` nhất.
 *
 * BỐN LUẬT của nhóm hàm này, đừng nới:
 *   ① KHOÁ API KHÔNG ĐI NGƯỢC RA. Hàm ghi NHẬN khoá nguyên văn, trả về bản ghi KHÔNG có
 *      khoá. Không hàm nào ở đây đọc khoá ra cho màn hình — `doDayKhoa` (bộ đọc) là đường
 *      duy nhất giải mã, và nó chỉ phục vụ cửa POS.
 *   ② MỌI CÂU GHI KÈM `team_id` TRONG `WHERE`. Id đi từ trình duyệt vào; thiếu vế đó là
 *      team này sửa được kết nối của team kia bằng cách đoán một con số.
 *   ③ KHÔNG ĐỔI `market`. Đó là khoá NGƯỜI mà `layKetNoi()` tra mỗi lượt tạo đơn: đổi tên
 *      lúc đang chạy thì cửa POS ngừng tìm thấy kết nối mà không ai báo. Đổi thị trường =
 *      BỎ rồi THÊM — một việc người ta nhìn thấy mình đang làm.
 *   ④ HAI RÀNG BUỘC UNIQUE PHẢI NÓI ĐƯỢC THÀNH CÂU. Để `23505` trần lên màn thì người dùng
 *      đọc được «duplicate key value violates unique constraint "ket_noi_pos_team_id_market_key"»
 *      — đúng và vô dụng. Lược đồ 002 đã khai vì sao hai ràng buộc đó tồn tại; câu lỗi ở
 *      đây nói lại đúng điều ấy.
 */

/** Lỗi CÓ TÊN của đường GHI — mang `ma` + `status` để router trả thẳng, không đoán. */
export class LoiGhiKetNoiPos extends Error {
  constructor(thongDiep, ma = "ghi_ket_noi_pos", status = 400) {
    super(thongDiep);
    this.name = "LoiGhiKetNoiPos";
    this.ma = ma;
    this.status = status;
  }
}

const chuoiGon = (v) => String(v ?? "").trim();

/** Bản ghi trả ra màn hình — KHÔNG có `api_key_ma`, KHÔNG có khoá giải mã (luật ①). */
function hinhDangRa(d) {
  return {
    id: String(d.id),
    market: d.market,
    shopId: d.shop_id,
    bat: d.bat,
    coKhoa: !!d.api_key_ma,
  };
}

/**
 * Đổi lỗi ràng buộc của Postgres thành câu người đọc được (luật ④).
 * Đọc `e.constraint` chứ không so chuỗi trong `e.message` — thông điệp của Postgres đổi
 * theo phiên bản và theo `lc_messages`, tên ràng buộc thì không.
 */
function doiLoiRangBuoc(e, { market, shopId }) {
  if (e?.code !== "23505") return e;
  const c = String(e.constraint || "");
  if (c.includes("market")) {
    return new LoiGhiKetNoiPos(
      `Team này đã có một kết nối POS cho thị trường "${market}". Một thị trường chỉ được ` +
        `một kết nối — sửa cái đang có thay vì thêm cái thứ hai.`,
      "trung_thi_truong",
      409,
    );
  }
  if (c.includes("shop")) {
    return new LoiGhiKetNoiPos(
      `Shop "${shopId}" đã được nối cho một thị trường khác của team này. Hai thị trường ` +
        `trỏ về cùng một shop là lỗi cấu hình câm — đơn của hai nước sẽ vào chung một sổ.`,
      "trung_shop",
      409,
    );
  }
  return e;
}

/** Mã hoá khoá API, kèm câu chỉ đúng chỗ hỏng khi thiếu `V3_KHOA_MA_HOA`. */
function bocKhoa(apiKey, env) {
  try {
    return maHoa(apiKey, moiTruongKhoa(env));
  } catch (e) {
    throw new LoiGhiKetNoiPos(
      `Không mã hoá được khoá API POS: ${e.message} — kết nối KHÔNG được ghi. ` +
        `Khai biến ở docs/v3/ban-giao/bien-moi-truong-v3.md.`,
      "thieu_khoa_ma_hoa",
      500,
    );
  }
}

/**
 * THÊM một kết nối POS cho team đang mở.
 *
 * ⚠️ KHÔNG gọi thử sang POS để kiểm khoá. Lượt gọi thử là một yêu cầu ra ngoài, và đường
 *    ra ngoài của dự án này đi qua van (`V3_PANCAKE_GUI`, `PANCAKE_READONLY`) — dựng thêm
 *    một đường nữa ở đây là dựng cửa thứ hai ra Internet để tiện. Hệ quả phải nói thẳng ở
 *    màn: khoá sai thì lượt TẠO ĐƠN đầu tiên mới biết. Ghi §9 sổ nợ để phiếu sau cấp nút
 *    «Thử kết nối» đi qua đúng cửa POS đã có.
 */
export async function themKetNoi(
  pool,
  ctx,
  { market, shopId, apiKey } = {},
  { teamId = null, env = process.env } = {},
) {
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "ket_noi_pos" });
  const m = chuoiGon(market);
  const s = chuoiGon(shopId);
  const k = chuoiGon(apiKey);
  if (!m) throw new LoiGhiKetNoiPos("thiếu tên thị trường", "thieu_thi_truong");
  if (!s) throw new LoiGhiKetNoiPos("thiếu shop id", "thieu_shop");
  if (!k) throw new LoiGhiKetNoiPos("thiếu khoá API", "thieu_khoa");

  try {
    const r = await pool.query(
      `INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma)
       VALUES ($1,$2,$3,$4) RETURNING id, market, shop_id, bat, api_key_ma`,
      [team.teamId, m, s, bocKhoa(k, env)],
    );
    return hinhDangRa(r.rows[0]);
  } catch (e) {
    throw doiLoiRangBuoc(e, { market: m, shopId: s });
  }
}

/**
 * SỬA shop id và/hoặc khoá API của một kết nối. `apiKey` rỗng/vắng = GIỮ khoá đang có —
 * màn hình không bao giờ đọc được khoá cũ, nên bắt gõ lại để đổi shop là bắt người ta đi
 * tìm một bí mật họ không có.
 *
 * `market` KHÔNG sửa được (luật ③) — truyền vào cũng bị bỏ qua.
 */
export async function suaKetNoi(
  pool,
  ctx,
  id,
  { shopId, apiKey } = {},
  { teamId = null, env = process.env } = {},
) {
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "ket_noi_pos" });
  const s = chuoiGon(shopId);
  const k = chuoiGon(apiKey);
  if (!s && !k) {
    throw new LoiGhiKetNoiPos(
      "không có gì để sửa — cần shop id mới, khoá mới, hoặc cả hai",
      "khong_co_gi_sua",
    );
  }
  const dat = [];
  const bien = [String(id), team.teamId];
  if (s) { bien.push(s); dat.push(`shop_id = $${bien.length}`); }
  if (k) { bien.push(bocKhoa(k, env)); dat.push(`api_key_ma = $${bien.length}`); }

  try {
    const r = await pool.query(
      `UPDATE ket_noi_pos SET ${dat.join(", ")}, sua_luc = now()
       WHERE id = $1 AND team_id = $2
       RETURNING id, market, shop_id, bat, api_key_ma`,
      bien,
    );
    if (!r.rowCount) throw khongThay(id);
    return hinhDangRa(r.rows[0]);
  } catch (e) {
    throw doiLoiRangBuoc(e, { market: "(giữ nguyên)", shopId: s });
  }
}

/**
 * BẬT/TẮT một kết nối. Đây là cách ĐÚNG để ngừng dùng một shop: `layKetNoi()` chỉ nhận
 * hàng `bat`, nên tắt là cửa POS của thị trường đó đóng NGAY, mà bản ghi + khoá vẫn còn
 * để bật lại. Bỏ hẳn thì mất khoá, và người sau không biết thị trường ấy từng tồn tại.
 */
export async function batTatKetNoi(
  pool,
  ctx,
  id,
  bat,
  { teamId = null } = {},
) {
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "ket_noi_pos" });
  const r = await pool.query(
    `UPDATE ket_noi_pos SET bat = $3, sua_luc = now()
     WHERE id = $1 AND team_id = $2 RETURNING id, market, shop_id, bat, api_key_ma`,
    [String(id), team.teamId, !!bat],
  );
  if (!r.rowCount) throw khongThay(id);
  return hinhDangRa(r.rows[0]);
}

/**
 * BỎ HẲN một kết nối — mất luôn khoá đã mã hoá, không lấy lại được.
 * Màn hình phải hỏi lại trước khi gọi; ở đây chỉ làm đúng việc được bảo.
 */
export async function boKetNoi(pool, ctx, id, { teamId = null } = {}) {
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "ket_noi_pos" });
  const r = await pool.query(
    `DELETE FROM ket_noi_pos WHERE id = $1 AND team_id = $2
     RETURNING id, market, shop_id, bat, api_key_ma`,
    [String(id), team.teamId],
  );
  if (!r.rowCount) throw khongThay(id);
  return hinhDangRa(r.rows[0]);
}

/**
 * 404, KHÔNG phải 403 — cùng quy ước với màn «Lên chạy»: một id của team khác và một id
 * không tồn tại phải trả về đúng một câu, kẻo người dò được id nào đang có thật.
 */
function khongThay(id) {
  return new LoiGhiKetNoiPos(
    `Không có kết nối POS id=${id} trong team đang mở.`,
    "khong_thay",
    404,
  );
}
