// ĐỌC KẾT NỐI POS của một team (bảng `ket_noi_pos`, migration 002).
//
// Bảng này chứa BÍ MẬT (khoá API POS, mã hoá AES-256-GCM) nên nó cố ý nằm NGOÀI
// `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2 — không mở nó ra cho một hàm
// `SELECT *` dùng chung. Đây là bộ đọc riêng, đúng án lệ `ghiCauHinhModel` (L0-M1).
//
// ⛔ Đối tượng trả về MANG KHOÁ NGUYÊN VĂN trong bộ nhớ. Cấm log nó, cấm ghi nó xuống
//    đĩa, cấm đưa nguyên vẹn vào `nhat_ky` — chỉ log `market`/`shopId`.
import { giaiMa } from "../../db/khoa.js";
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
