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

// Bộ GHI của phiếu này: mọi đường ghi khoá API đi qua đúng hàm này (án lệ «cửa RA
// đúng một cái»). Người B ở L1-M4 gọi hàm này, không tự viết câu INSERT khác.
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
    `INSERT INTO cau_hinh_model (team_id, vai_tro, nha_cung_cap, ma_model, khoa_api_ma, do_ngau_nhien, bat)
     SELECT t.id, $2, $3, $4, $5, $6, $7 FROM team t WHERE t.slug = $1
     ON CONFLICT (team_id, vai_tro) DO UPDATE
       SET nha_cung_cap = EXCLUDED.nha_cung_cap,
           ma_model     = EXCLUDED.ma_model,
           khoa_api_ma  = COALESCE(EXCLUDED.khoa_api_ma, cau_hinh_model.khoa_api_ma),
           do_ngau_nhien = EXCLUDED.do_ngau_nhien,
           bat          = EXCLUDED.bat,
           sua_luc      = now()
     RETURNING id`,
    [
      teamSlug,
      vaiTro,
      nhaCungCap,
      maModel,
      maHoa(khoaApi, env),
      doNgauNhien,
      bat,
    ],
  );
  if (!r.rowCount) throw new Error(`không có team slug='${teamSlug}'`);
  return r.rows[0].id;
}
