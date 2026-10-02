// PHẠM VI MARKETER (LL15d · 02/10) — MỘT luật cho mọi màn đọc sản phẩm/page: «Marketer chỉ thấy sản phẩm mình phụ trách» (01 §9).
//
//   · Phụ trách = `san_pham_goc.marketer_ma_nv` (031) — NGƯỜI chọn từ hồ sơ HRM (CR-28-09c), mã NV của tài khoản (`nguoi_dung.ma_nv`).
//   · Page KẾ THỪA sản phẩm (CR-28-09c «gán ở sản phẩm × thị trường, page kế thừa»): page thuộc phạm vi khi `page.san_pham_goc_ma` là
//     một sản phẩm của mình. Page chưa gắn sản phẩm nào ⇒ ngoài phạm vi mọi marketer (quản trị gắn ở Sản phẩm › Page đang bán).
//   · Ai bị lọc: tài khoản mang vai marketer mà KHÔNG mang quản trị / quản lý (hai vai đó thấy cả team).
//   · Tài khoản marketer không có mã NV (tạo tay, không gắn HRM) ⇒ phạm vi rỗng — màn nói vì sao.
import { VAI } from '../../auth/boi-canh.js';
import { maNvCua } from '../../auth/kho-nguoi-dung.js';

/** `null` = thấy cả team · `{ maNv }` = chỉ của mã NV này (`maNv` null ⇒ không gì). */
export async function phamViMarketer(bc) {
  const vai = bc.vai || [];
  if (vai.some((v) => v === VAI.QUAN_TRI || v === VAI.QUAN_LY) || !vai.includes(VAI.MARKETER)) return null;
  return { maNv: await maNvCua(bc.nguoiDungId) };
}

/** Mã gốc các sản phẩm của phạm vi — đọc qua tầng truy vấn có kẹp team (`san_pham_goc` thuộc BANG_NGHIEP_VU_CHUAN). */
export async function maGocCuaPhamVi(truyVan, pv) {
  if (!pv || !pv.maNv) return new Set();
  return new Set(((await truyVan.chon('san_pham_goc', { marketer_ma_nv: pv.maNv })) || []).map((g) => String(g.ma_goc)));
}

/** Câu màn nói khi phạm vi lọc bớt / rỗng. */
export function cauPhamVi(pv) {
  if (!pv) return null;
  return pv.maNv
    ? 'Bạn là marketer: chỉ hiện page của sản phẩm bạn phụ trách. Sản phẩm chưa gán marketer — nhờ quản trị gán ở Sản phẩm › Chung.'
    : 'Tài khoản của bạn chưa gắn hồ sơ HRM (không có mã nhân viên) nên chưa phụ trách sản phẩm nào — nhờ quản trị kiểm ở Người và team.';
}
