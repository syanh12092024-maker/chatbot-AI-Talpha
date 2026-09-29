// ĐƠN MESSENGER CHỜ DUYỆT — đọc · lưu · duyệt · loại. MỘT bản dùng cho hai cửa:
//   · `/api/van-hanh/orders/*` (quản trị, màn «Hội thoại và đơn»)
//   · `/api/hop-thu/don/*`     (sale + quản trị, Hộp thư — phiếu LL2, CR-28-09c)
//
// Tách ra từ `router.js` ngày 29/09 (LL2) — thân hàm GIỮ NGUYÊN VĂN, chỉ đổi chỗ đứng. Hai
// cửa gọi chung một bản vì đây là đường TIỀN: duyệt = tạo đơn thật trên POS (qua
// `src/orders/hang-cho.js#duyet`, đủ cửa kiểm + van `V3_POS_GHI`). Hai bản chép là hai chỗ
// để một bản vá chỉ tới được một bên.
//
// Ai được gọi là việc của ROUTER (cái chắn vai ở cửa HTTP). Tệp này chỉ kẹp TEAM: mọi câu
// SQL mang `team_id = bc.teamId`.
import {
  idOf,
  fault,
  transaction,
  audit,
} from "../../../../src/admin-v3/operations.js";
import { docSanPhamGoiGia } from "../../../../src/products/catalog.js";
import { duyet, loai } from "../../../../src/orders/hang-cho.js";
import { HE_SO_TE } from "../../../../src/pos/index.js";

/** Một đơn chờ duyệt + sản phẩm/gói giá của page để sửa. Không có (hoặc team khác) ⇒ 404. */
export async function docDonCho(pool, bc, id) {
  const o = (
    await pool.query(
      `SELECT o.*,o.xmin::text AS version,p.id AS page_row_id,p.san_pham_goc_ma,p.pos_shop_id
      FROM hang_cho_tao_don o JOIN hoi_thoai h ON h.id=o.hoi_thoai_id AND h.team_id=o.team_id
      JOIN page p ON p.id=h.page_id WHERE o.team_id=$1 AND o.id=$2`,
      [bc.teamId, idOf(id)],
    )
  ).rows[0];
  if (!o) throw fault("Không tìm thấy đơn", 404);
  return {
    item: o,
    currencyFactors: HE_SO_TE,
    products: await docSanPhamGoiGia(pool, bc.teamId, o.page_row_id, o),
  };
}

/** Lưu thông tin đơn (chỉ khi còn `cho_duyet` và đúng phiên bản đã đọc). */
export async function luuDonCho(pool, bc, id, b) {
  id = idOf(id);
  if (
    ![
      "ten",
      "sdt",
      "dia_chi",
      "thanh_pho",
      "kho_hang",
      "san_pham_ma",
    ].every((k) => typeof b?.[k] === "string" && b[k].length <= 1000) ||
    !Number.isInteger(b.so_luong) ||
    b.so_luong < 1 ||
    !b.version
  )
    throw fault("Dữ liệu đơn không hợp lệ");
  await transaction(pool, async (c) => {
    const o = (
      await c.query(
        `SELECT o.*,o.xmin::text AS version,p.id AS page_row_id,p.san_pham_goc_ma,p.pos_shop_id
        FROM hang_cho_tao_don o JOIN hoi_thoai h ON h.id=o.hoi_thoai_id JOIN page p ON p.id=h.page_id
        WHERE o.team_id=$1 AND o.id=$2 FOR UPDATE OF o`,
        [bc.teamId, id],
      )
    ).rows[0];
    if (!o) throw fault("Không tìm thấy đơn", 404);
    if (o.trang_thai !== "cho_duyet" || o.version !== b.version)
      throw fault("Đơn đã đổi hoặc đã xử lý; tải lại", 409);
    const products = await docSanPhamGoiGia(c, bc.teamId, o.page_row_id, o);
    const product = products.find(
      (p) => p.ma === b.san_pham_ma && !p.het_hang,
    );
    const offer = product?.goiGia.find((g) => g.so_luong === b.so_luong);
    if (!offer)
      throw fault("Không có gói giá hợp lệ cho sản phẩm / số lượng này");
    const d = { ...o.du_lieu_don };
    for (const k of [
      "ten",
      "sdt",
      "dia_chi",
      "thanh_pho",
      "kho_hang",
      "san_pham_ma",
      "so_luong",
    ])
      d[k] = b[k];
    d.tong_tien = Number(offer.gia);
    d.tien_te = offer.tien_te;
    delete d.tong_tien_lon;
    await c.query(
      "UPDATE hang_cho_tao_don SET du_lieu_don=$3,cua_kiem='{}' WHERE team_id=$1 AND id=$2",
      [bc.teamId, id, JSON.stringify(d)],
    );
    await audit(c, bc, "hang_cho_tao_don", id, "v3_sua_don", [
      "du_lieu_don",
    ]);
  });
  return { ok: true };
}

/** Duyệt = tạo đơn POS qua `hang-cho.js#duyet` (đủ cửa kiểm, van `V3_POS_GHI`). */
export async function duyetDonCho(pool, bc, id, body, orderDeps = {}) {
  if (typeof body?.version !== "string")
    throw fault("Tải lại đơn trước khi duyệt");
  return duyet(
    pool,
    { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId },
    {
      hangChoId: idOf(id),
      nguoiDuyetId: bc.nguoiDungId,
      expectedVersion: body.version,
    },
    orderDeps,
  );
}

/** Loại đơn — lý do 5–300 ký tự, ghi vào hàng chờ. */
export async function loaiDonCho(pool, bc, id, body) {
  if (
    typeof body?.reason !== "string" ||
    body.reason.trim().length < 5 ||
    body.reason.length > 300
  )
    throw fault("Lý do cần 5–300 ký tự");
  return loai(
    pool,
    { teamId: bc.teamId },
    {
      hangChoId: idOf(id),
      nguoiDuyetId: bc.nguoiDungId,
      lyDo: body.reason,
    },
  );
}
