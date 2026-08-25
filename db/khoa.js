// Mã hoá khoá API của `cau_hinh_model` (02 §"Nền dữ liệu": «khoá mã hoá khi lưu»).
//
// Hình dạng bao thư:  v1.<iv_b64>.<tag_b64>.<ct_b64>   — AES-256-GCM.
// CHECK ở tầng DB (`khoa_api_ma LIKE 'v1.%'`) là cái rào thứ hai: code quên gọi
// `maHoa()` thì INSERT đỏ ngay, không lặng lẽ ghi khoá nguyên văn vào cột.
//
// KHOÁ MÃ HOÁ đọc từ biến môi trường `V3_KHOA_MA_HOA` (32 byte, hex hoặc base64).
// THIẾU LÀ NÉM LỖI — cấm sinh khoá mặc định trong file: một khoá nằm trong mã nguồn
// thì cột "đã mã hoá" chỉ là lời khai, ai đọc được repo là đọc được khoá.
// ⚠️ Biến này CHƯA có trong `.env` (đo 22/08) — người vận hành phải đặt trước khi
//    người B ghi khoá thật ở L1-M4. Xem §9 sổ điều hành.
import crypto from "node:crypto";

const NHAN = "v1";

export function khoaGoc(env = process.env) {
  const raw = env.V3_KHOA_MA_HOA;
  if (!raw) {
    throw new Error(
      "Thiếu V3_KHOA_MA_HOA (32 byte, hex hoặc base64). Không có khoá thì không ghi " +
        "được cau_hinh_model.khoa_api_ma — cấm rơi về khoá mặc định.",
    );
  }
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      `V3_KHOA_MA_HOA phải đúng 32 byte, đang là ${buf.length} byte.`,
    );
  }
  return buf;
}

export function maHoa(nguyenVan, env = process.env) {
  if (nguyenVan === null || nguyenVan === undefined || nguyenVan === "")
    return null;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", khoaGoc(env), iv);
  const ct = Buffer.concat([c.update(String(nguyenVan), "utf8"), c.final()]);
  return [
    NHAN,
    iv.toString("base64"),
    c.getAuthTag().toString("base64"),
    ct.toString("base64"),
  ].join(".");
}

export function giaiMa(baoThu, env = process.env) {
  if (!baoThu) return null;
  const p = String(baoThu).split(".");
  if (p.length !== 4 || p[0] !== NHAN)
    throw new Error("bao thư khoá sai khuôn (chờ v1.<iv>.<tag>.<ct>)");
  const d = crypto.createDecipheriv(
    "aes-256-gcm",
    khoaGoc(env),
    Buffer.from(p[1], "base64"),
  );
  d.setAuthTag(Buffer.from(p[2], "base64"));
  return Buffer.concat([
    d.update(Buffer.from(p[3], "base64")),
    d.final(),
  ]).toString("utf8");
}

// ═══ KHOÁ API LƯU Ở ĐÂU (đổi ở migration 008 — PHIEU-B-Y2) ════════════════════
// TRƯỚC 008: `cau_hinh_model.khoa_api_ma`, tức MỖI DÒNG VAI TRÒ một bản. Team nào xếp
// `chinh` và `nen` cùng nhà là cùng một khoá lưu HAI BẢN; đổi khoá quên một bản thì chat
// vẫn chạy còn việc nền chết câm.
// TỪ 008: bảng `khoa_nha`, MỘT bản cho mỗi (team × nhà). `cau_hinh_model` không còn cột
// khoá. Ghi khoá MỘT LẦN là mọi ô dùng nhà đó đọc ra khoá mới.
//
// ⛔ `khoa_nha` CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn (nó chứa khoá đã mã
//    hoá) — mọi đường ghi/đọc khoá đi qua đúng ba hàm dưới đây, đúng tiền lệ `ket_noi_pos`.

/** Ghi (hoặc đổi) khoá API của một NHÀ cho một team. Cửa RA duy nhất của `khoa_nha`.
 *  `khoaApi = null` → giữ nguyên khoá cũ (không xoá) — đổi model mà vô tình xoá khoá là
 *  một cách rất rẻ để làm team đó câm. Muốn XOÁ khoá thì dùng `xoaKhoaNha`. */
export async function ghiKhoaNha(
  pool,
  { teamSlug, nhaCungCap, khoaApi = null },
  env = process.env,
) {
  const r = await pool.query(
    `INSERT INTO khoa_nha (team_id, nha_cung_cap, khoa_api_ma)
     SELECT t.id, $2, $3 FROM team t WHERE t.slug = $1
     ON CONFLICT (team_id, nha_cung_cap) DO UPDATE
       SET khoa_api_ma = COALESCE(EXCLUDED.khoa_api_ma, khoa_nha.khoa_api_ma),
           sua_luc     = now()
     RETURNING id`,
    [teamSlug, nhaCungCap, maHoa(khoaApi, env)],
  );
  if (!r.rowCount) throw new Error(`không có team slug='${teamSlug}'`);
  return r.rows[0].id;
}

/** Đọc khoá NGUYÊN VĂN của một (team × nhà). null = chưa có khoá.
 *  Đòi `V3_KHOA_MA_HOA` (để giải mã) — chỉ gọi ở nơi THẬT SỰ cần khoá để gọi API. Chỗ nào
 *  chỉ cần biết «team này có khoá riêng không» thì gọi `coKhoaNha`, đừng kéo khoá ra. */
export async function docKhoaNha(
  pool,
  { teamId, nhaCungCap },
  env = process.env,
) {
  const r = await pool.query(
    `SELECT khoa_api_ma FROM khoa_nha WHERE team_id = $1 AND nha_cung_cap = $2`,
    [teamId, nhaCungCap],
  );
  return r.rowCount ? giaiMa(r.rows[0].khoa_api_ma, env) : null;
}

/** Có khoá riêng hay không — KHÔNG giải mã, KHÔNG đòi `V3_KHOA_MA_HOA`.
 *  Câu hỏi «có khoá riêng không» là câu hỏi định tuyến, không phải câu hỏi bí mật; kéo
 *  bản mã ra khỏi CSDL chỉ để đếm nó là mở rộng bề mặt rò rỉ mà chẳng được gì. */
export async function coKhoaNha(pool, { teamId, nhaCungCap }) {
  const r = await pool.query(
    `SELECT 1 FROM khoa_nha
      WHERE team_id = $1 AND nha_cung_cap = $2 AND khoa_api_ma IS NOT NULL`,
    [teamId, nhaCungCap],
  );
  return r.rowCount > 0;
}

// Bộ GHI cấu hình model. Từ 008 nó KHÔNG còn ghi khoá vào `cau_hinh_model` nữa — đưa
// `khoaApi` vào thì khoá đi thẳng sang `khoa_nha` theo `nhaCungCap`, tức là ghi một lần
// cho MỌI vai trò dùng nhà đó. Chữ ký giữ nguyên để nơi gọi cũ không phải sửa.
export async function ghiCauHinhModel(
  pool,
  {
    teamSlug,
    vaiTro,
    nhaCungCap,
    maModel,
    khoaApi = null,
    doNgauNhien = null,
    bat = true,
  },
  env = process.env,
) {
  const r = await pool.query(
    `INSERT INTO cau_hinh_model (team_id, vai_tro, nha_cung_cap, ma_model, do_ngau_nhien, bat)
     SELECT t.id, $2, $3, $4, $5, $6 FROM team t WHERE t.slug = $1
     ON CONFLICT (team_id, vai_tro) DO UPDATE
       SET nha_cung_cap  = EXCLUDED.nha_cung_cap,
           ma_model      = EXCLUDED.ma_model,
           do_ngau_nhien = EXCLUDED.do_ngau_nhien,
           bat           = EXCLUDED.bat,
           sua_luc       = now()
     RETURNING id`,
    [teamSlug, vaiTro, nhaCungCap, maModel, doNgauNhien, bat],
  );
  if (!r.rowCount) throw new Error(`không có team slug='${teamSlug}'`);
  if (khoaApi != null && khoaApi !== "") {
    await ghiKhoaNha(pool, { teamSlug, nhaCungCap, khoaApi }, env);
  }
  return r.rows[0].id;
}
