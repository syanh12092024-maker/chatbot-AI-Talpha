// BA KHỐI DÙNG CHUNG — Chính sách · FAQ · Xử lý phản đối (`khoi_dung_chung`, migration 026 · CR-28-09b MN7).
//
// Ghép vào prompt MỌI page của bot (sau sản phẩm). Tới 28/09 chỉ sống ở Google Sheet; nay chỗ ghi
// duy nhất là CSDL v3, bot đọc bản chép `kb-chung.json` (xem `src/kb.js#datKhoiChung`).
//
// `sachKhoiChung` là luật làm sạch DUY NHẤT — `src/kb.js` nhập lại từ đây. Hai bản của một luật
// làm sạch là hai định nghĩa «cùng nội dung», và lượt tắt Sheet cần đúng một định nghĩa ấy.

export class LoiKhoiChung extends Error {
  constructor(thongDiep, ma = "khoi_chung", status = 400) {
    super(thongDiep);
    this.name = "LoiKhoiChung";
    this.ma = ma;
    this.status = status;
  }
}

const g = (v) => String(v ?? "").trim();

/** Cùng hình dạng `kb.js#parsePolicies/parseFaqs/parseObjections` dựng từ Sheet. Dòng thiếu khoá bị bỏ. */
export function sachKhoiChung(d = {}) {
  const ds = (x) => (Array.isArray(x) ? x : []);
  return {
    policies: ds(d.policies).map((p) => ({ topic: g(p?.topic), content: g(p?.content) })).filter((p) => p.topic),
    faqs: ds(d.faqs).map((f) => ({ q: g(f?.q), a: g(f?.a) })).filter((f) => f.q),
    objections: ds(d.objections).map((o) => ({ type: g(o?.type), says: g(o?.says), reply: g(o?.reply) })).filter((o) => o.type),
  };
}

function batBuocCo(sach) {
  const dai = JSON.stringify(sach).length;
  if (dai > 60000) throw new LoiKhoiChung("ba khối dùng chung dài quá 60.000 ký tự — mỗi lượt chat đều gửi chúng cho AI", "qua_dai");
}

/** Bản của team. Chưa áp 026 ⇒ `{ chuaCo: true }` (nói ra, không ném). Chưa có dòng ⇒ ba khối rỗng, phiên bản 0. */
export async function docKhoiChung(db, teamId) {
  let r;
  try {
    r = await db.query(
      "SELECT noi_dung, phien_ban, nguoi_sua, sua_luc FROM khoi_dung_chung WHERE team_id = $1",
      [teamId],
    );
  } catch (e) {
    if (e?.code === "42P01") return { chuaCo: true, noiDung: sachKhoiChung(), phienBan: 0 };
    throw e;
  }
  const d = r.rows[0];
  if (!d) return { chuaCo: false, noiDung: sachKhoiChung(), phienBan: 0, nguoiSua: "", suaLuc: null };
  return { chuaCo: false, noiDung: sachKhoiChung(d.noi_dung), phienBan: d.phien_ban, nguoiSua: d.nguoi_sua, suaLuc: d.sua_luc };
}

/**
 * LƯU (trong giao dịch của nơi gọi). `phienBanCu` phải khớp bản đang có — hai người cùng sửa thì
 * người lưu sau nhận 409 thay vì âm thầm đè. Trả `{ truoc, sau, phienBan }` cho nhật ký.
 */
export async function luuKhoiChung(c, teamId, noiDung, { phienBanCu, nguoiSua = "" } = {}) {
  const sach = sachKhoiChung(noiDung);
  batBuocCo(sach);
  const cu = await docKhoiChung(c, teamId);
  if (cu.chuaCo) throw new LoiKhoiChung("máy chủ chưa áp bản cập nhật cơ sở dữ liệu cho khối dùng chung", "chua_ap", 503);
  if (phienBanCu !== undefined && Number(phienBanCu) !== Number(cu.phienBan)) {
    throw new LoiKhoiChung("người khác vừa sửa khối dùng chung — tải lại rồi sửa tiếp", "da_doi", 409);
  }
  const r = await c.query(
    `INSERT INTO khoi_dung_chung (team_id, noi_dung, phien_ban, nguoi_sua, sua_luc)
     VALUES ($1, $2, 1, $3, now())
     ON CONFLICT (team_id) DO UPDATE SET noi_dung = EXCLUDED.noi_dung, phien_ban = khoi_dung_chung.phien_ban + 1,
       nguoi_sua = EXCLUDED.nguoi_sua, sua_luc = now()
     RETURNING phien_ban`,
    [teamId, JSON.stringify(sach), nguoiSua],
  );
  return { truoc: cu.noiDung, sau: sach, phienBan: r.rows[0].phien_ban };
}
