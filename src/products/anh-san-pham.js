// KHO ẢNH SẢN PHẨM (`anh_san_pham`, migration 025) — thêm, sửa nhãn, bỏ, xếp lại.
//
// ─── VÌ SAO CÓ FILE NÀY ────────────────────────────────────────────────────────────────
// CR-28-09b (luật một nguồn, 01-QUYET-DINH §8): ảnh bot gửi khách có đúng MỘT chỗ ghi là
// CSDL v3. Trước đó 543 ảnh chỉ nằm trong `kb-overrides.json` của tiến trình bot v1, không
// màn nào sửa được — và 48 ảnh trong số đó đã hỏng mà không ai biết (đo prod 28/09).
//
// ─── MỖI HÀM TRẢ `sanPhamId` ───────────────────────────────────────────────────────────
// Lưu ảnh xong mà bot chưa nhận là vi phạm luật một nguồn («lưu xong mà bot vẫn chạy bản
// cũ»). Tầng này KHÔNG tự đẩy sang bot — nó không biết page nào bán sản phẩm này — nên nó
// trả `sanPhamId` để nơi gọi (cửa ghi của màn) đẩy đúng các page liên quan (MN3).
//
// ─── NHÃN GIỮ NGUYÊN VĂN ───────────────────────────────────────────────────────────────
// `src/tools.js#send_product_image` chọn ảnh bằng `nhãn.includes(loại)` và ưu tiên nhãn chứa
// «sản phẩm». Tầng này chỉ cắt khoảng trắng hai đầu — không hạ chữ, không dịch, không gộp.

export class LoiAnhSanPham extends Error {
  constructor(thongDiep, ma = "anh_san_pham", status = 400) {
    super(thongDiep);
    this.name = "LoiAnhSanPham";
    this.ma = ma;
    this.status = status;
  }
}

const gon = (s) => String(s ?? "").trim();

/**
 * CÙNG luật với CHECK của 025 — kiểm trước ở đây để trả một câu người đọc được thay vì
 * lỗi ràng buộc của Postgres. Sửa một bên thì sửa cả bên kia (ca AS1 canh hai bên khớp).
 */
export const KHUON_DUONG = /^(https?:\/\/\S+|\/uploads\/[A-Za-z0-9_-][A-Za-z0-9._-]*)$/;

function batBuocDuong(duong) {
  const d = gon(duong);
  if (!d) throw new LoiAnhSanPham("thiếu đường ảnh", "thieu_duong");
  if (d.length > 2000) throw new LoiAnhSanPham("đường ảnh dài quá 2000 ký tự", "duong_dai");
  if (!KHUON_DUONG.test(d)) {
    throw new LoiAnhSanPham(
      "đường ảnh phải là link công khai http(s)://… hoặc tệp đã tải lên /uploads/… — "
      + "một đường khác thì Facebook không tải được và ảnh không bao giờ tới khách",
      "duong_la",
    );
  }
  return d;
}

function batBuocNhan(nhan) {
  const n = gon(nhan);
  if (n.length > 80) throw new LoiAnhSanPham("nhãn ảnh dài quá 80 ký tự", "nhan_dai");
  return n;
}

async function batBuocSanPham(pool, teamId, sanPhamId) {
  const r = await pool.query(
    "SELECT id FROM san_pham WHERE team_id = $1 AND id = $2",
    [teamId, String(sanPhamId)],
  );
  if (!r.rowCount) {
    throw new LoiAnhSanPham(`không có sản phẩm #${sanPhamId} trong team này`, "khong_thay_san_pham", 404);
  }
}

function doiRa(d) {
  return {
    id: String(d.id),
    sanPhamId: String(d.san_pham_id),
    duong: d.duong,
    nhan: d.nhan,
    thuTu: d.thu_tu,
    nguon: d.nguon,
  };
}

const COT = "id, san_pham_id, duong, nhan, thu_tu, nguon";

/** Ảnh của một sản phẩm, theo thứ tự người xếp (trùng thứ tự thì ảnh thêm trước đứng trước). */
export async function dsAnh(pool, teamId, sanPhamId) {
  const r = await pool.query(
    `SELECT ${COT} FROM anh_san_pham WHERE team_id = $1 AND san_pham_id = $2 ORDER BY thu_tu, id`,
    [teamId, String(sanPhamId)],
  );
  return r.rows.map(doiRa);
}

/** THÊM một ảnh vào CUỐI danh sách của sản phẩm. */
export async function themAnh(pool, teamId, sanPhamId, { duong, nhan, nguon = "nguoi" } = {}) {
  const d = batBuocDuong(duong);
  const n = batBuocNhan(nhan);
  if (!["nguoi", "kb"].includes(nguon)) throw new LoiAnhSanPham(`nguồn ảnh lạ: ${nguon}`, "nguon_la");
  await batBuocSanPham(pool, teamId, sanPhamId);
  try {
    const r = await pool.query(
      `INSERT INTO anh_san_pham (team_id, san_pham_id, duong, nhan, thu_tu, nguon)
       VALUES ($1, $2, $3, $4,
               (SELECT COALESCE(max(thu_tu), -1) + 1 FROM anh_san_pham WHERE team_id = $1 AND san_pham_id = $2),
               $5)
       RETURNING ${COT}`,
      [teamId, String(sanPhamId), d, n, nguon],
    );
    return doiRa(r.rows[0]);
  } catch (e) {
    if (e?.code === "23505") throw new LoiAnhSanPham("ảnh này đã có trong sản phẩm", "trung", 409);
    throw e;
  }
}

/** SỬA NHÃN. Đường ảnh không sửa được — muốn đổi ảnh thì bỏ ảnh cũ, thêm ảnh mới. */
export async function suaNhanAnh(pool, teamId, id, { nhan } = {}) {
  const r = await pool.query(
    `UPDATE anh_san_pham SET nhan = $3 WHERE team_id = $1 AND id = $2 RETURNING ${COT}`,
    [teamId, String(id), batBuocNhan(nhan)],
  );
  if (!r.rowCount) throw new LoiAnhSanPham(`không có ảnh #${id} trong team này`, "khong_thay", 404);
  return doiRa(r.rows[0]);
}

/** BỎ một ảnh. Trả lại dòng đã bỏ để nhật ký ghi được «trước». */
export async function boAnh(pool, teamId, id) {
  const r = await pool.query(
    `DELETE FROM anh_san_pham WHERE team_id = $1 AND id = $2 RETURNING ${COT}`,
    [teamId, String(id)],
  );
  if (!r.rowCount) throw new LoiAnhSanPham(`không có ảnh #${id} trong team này`, "khong_thay", 404);
  return doiRa(r.rows[0]);
}

/**
 * XẾP LẠI — `dsId` phải là ĐÚNG tập ảnh hiện có của sản phẩm, không thừa không thiếu.
 * Nhận một tập lệch (màn cũ, hai người cùng sửa) mà vẫn xếp là âm thầm đẩy những ảnh không
 * được nhắc tới ra một vị trí không ai chọn.
 */
export async function xepAnh(pool, teamId, sanPhamId, dsId = []) {
  const moi = (Array.isArray(dsId) ? dsId : []).map(String);
  const hienCo = (await dsAnh(pool, teamId, sanPhamId)).map((a) => a.id);
  const khop = moi.length === hienCo.length && new Set(moi).size === moi.length
    && moi.every((x) => hienCo.includes(x));
  if (!khop) {
    throw new LoiAnhSanPham(
      "danh sách xếp không khớp các ảnh hiện có — tải lại rồi xếp lại",
      "lech_tap", 409,
    );
  }
  for (let i = 0; i < moi.length; i += 1) {
    await pool.query(
      "UPDATE anh_san_pham SET thu_tu = $4 WHERE team_id = $1 AND san_pham_id = $2 AND id = $3",
      [teamId, String(sanPhamId), moi[i], i],
    );
  }
  return dsAnh(pool, teamId, sanPhamId);
}
