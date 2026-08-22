// ĐỌC DANH MỤC + TỒN KHO THẬT TỪ POS → `san_pham` / `goi_gia` (phiếu L1-M1 ②.2).
//
// Đây là thứ đóng chỗ hở 01 §12: bản đang chạy SUY NGƯỢC sản phẩm từ 25 đơn gần nhất
// (`src/pancake-orders.js:127 productRef`), nên «sản phẩm mới chưa có đơn thì không tạo
// được đơn», và «tên sản phẩm trống trong dữ liệu». Nguồn đúng là endpoint danh mục:
//   GET /shops/<shop>/products/variations  → id biến thể · product.name · remain_quantity
//
// ═══ HAI SỰ THẬT ĐO ĐƯỢC 22/08, ĐỌC KỸ TRƯỚC KHI SỬA ════════════════════════
//
// ① `retail_price` = 0 trên **128/128** biến thể mẫu của 3 shop (UAE 50 · Kuwait 50 ·
//    Taiwan 28). Danh mục POS của các shop này KHÔNG mang giá — giá thật sống trong
//    từng đơn (`cod` = `shipping_fee`), đúng như chú thích của bản đang chạy
//    («giá lưu ở cod vì catalog giá 0»). Nghĩa là `docDanhMuc` chữa được «tên sản phẩm
//    trống» và «không biết tồn kho», nhưng KHÔNG chữa được bảng giá: `goi_gia` sẽ ra
//    **0 dòng** cho tới khi ai đó nhập giá vào POS. Nói ra chứ không im lặng ghi giá 0
//    — một bảng giá toàn số 0 nguy hơn một bảng giá trống, vì nó trông như đã có.
//
// ② Tồn kho ÂM có thật (Taiwan có biến thể `remain_quantity = -3`, cờ
//    `is_sell_negative_variation = true`). Cột `san_pham.ton_kho` là `int` nên giữ được
//    số âm — KHÔNG kẹp về 0: kẹp là xoá mất tín hiệu «đã bán quá tồn».
import { layNhieu, themMoi } from "../db/index.js";
import { xacDinhTeam, suaTheoIdPos } from "./kho.js";
import { layKetNoi } from "./ket-noi.js";
import { guiDocBienThe } from "./api.js";

/** Tên hiển thị của một biến thể: tên sản phẩm + phần phân biệt (size/thuộc tính). */
export function tenBienThe(v) {
  const goc = String(v.product?.name ?? "").trim();
  const them = [];
  if (v.size) them.push(String(v.size));
  for (const f of v.fields || []) {
    const g = f?.value ?? f?.name;
    if (g) them.push(String(g));
  }
  const duoi = them.join(" / ");
  return duoi ? `${goc} — ${duoi}` : goc;
}

/**
 * Đọc danh mục của MỘT thị trường → upsert `san_pham` (+ `goi_gia` khi POS có giá).
 * @param shop   TÊN THỊ TRƯỜNG (khoá của ket_noi_pos)
 * @param tienTe mã tệ của shop, CHỈ dùng khi POS trả giá > 0. Không biết ⇒ bỏ qua dòng
 *               giá và LIỆT KÊ ra (fail-CLOSED: `goi_gia.tien_te` là NOT NULL, đoán tệ
 *               là đoán tiền).
 */
export async function docDanhMuc(
  pool,
  ctx,
  { shop, teamId = null, tienTe = null, soTrangToiDa = 20, coTrang = 100 } = {},
  { nap = fetch, env = process.env } = {},
) {
  if (!shop)
    throw new Error(
      "docDanhMuc: thiếu `shop` (tên thị trường trong ket_noi_pos).",
    );
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "san_pham" });
  const ketNoi = await layKetNoi(pool, ctx, shop, { teamId, env });

  // RF-15 — GÁN `san_pham.page_id`. Danh mục POS đọc theo SHOP, nhưng `cua2Tien`
  // (L3-M4) JOIN `san_pham.page_id = <page của hội thoại>`: không có cột này thì MỌI
  // `goi_gia` POS vô hình với cửa tiền (nợ cũ khai SAI nguyên nhân «giá 0»). Một shop
  // CÓ THỂ mang nhiều page (`san_pham` chỉ giữ MỘT page_id — hạn chế mô hình, ghi §9);
  // nên chỉ gán khi shop có ĐÚNG MỘT page. 0/nhiều page ⇒ để null + ĐẾM ra (mù CÓ NÓI
  // RA, án lệ #7), KHÔNG đoán một page.
  const pagesCuaShop = await layNhieu(pool, ctx, "page", {
    dieuKien: { team_id: team.teamId, pos_shop_id: String(ketNoi.shopId) },
  });
  const pageId = pagesCuaShop.length === 1 ? pagesCuaShop[0].id : null;

  const kq = {
    shop,
    shopId: ketNoi.shopId,
    pageId,
    pageCuaShop: pagesCuaShop.length,
    pageMoHo: 0, // san_pham KHÔNG gán được page vì shop có 0 hoặc >1 page
    docDuoc: 0,
    them: 0,
    capNhat: 0,
    giuNguyen: 0,
    boQuaDaXoa: 0,
    khongCoTen: [],
    giaGhiDuoc: 0,
    giaKhongBietTe: [],
    tongPos: 0,
    tonKhoAm: 0,
  };

  for (let trang = 1; trang <= soTrangToiDa; trang++) {
    const lo = await guiDocBienThe(ketNoi, { trang, coTrang }, { nap });
    if (trang === 1) kq.tongPos = lo.tong;
    if (!lo.bienThe.length) break;

    for (const v of lo.bienThe) {
      if (v.is_removed) {
        kq.boQuaDaXoa++;
        continue;
      }
      kq.docDuoc++;
      // Cùng luật đặt mã với `don_hang.ma_pos`: gắn shop vào khoá. Id biến thể là UUID
      // nên không đụng nhau, nhưng giữ tiền tố thì đọc một dòng `san_pham` là biết ngay
      // nó của shop nào — bảng không có cột shop.
      const ma = `${ketNoi.shopId}:${v.id}`;
      const ten = tenBienThe(v);
      if (!ten) kq.khongCoTen.push(ma);
      const tonKho =
        v.remain_quantity == null ? null : Number(v.remain_quantity);
      if (tonKho != null && tonKho < 0) kq.tonKhoAm++;

      const daCo = await layNhieu(pool, ctx, "san_pham", {
        dieuKien: { team_id: team.teamId, ma },
      });

      if (pageId == null) kq.pageMoHo++; // shop 0/nhiều page ⇒ san_pham này mù page

      let spId;
      if (!daCo.length) {
        const moi = await themMoi(pool, ctx, "san_pham", {
          team_id: team.teamId,
          ma,
          ten,
          page_id: pageId, // RF-15 — null khi shop 0/nhiều page (đã đếm pageMoHo)
          mo_ta: String(v.barcode ?? ""),
          ton_kho: tonKho,
          het_hang: tonKho != null && tonKho <= 0,
          nguon: "pos",
        });
        spId = moi.id;
        kq.them++;
      } else {
        const cu = daCo[0];
        spId = cu.id;
        const doiTen = String(cu.ten ?? "") !== ten;
        const doiTon = String(cu.ton_kho ?? "") !== String(tonKho ?? "");
        // RF-15 — backfill page_id cho san_pham cũ còn NULL (di trú/L1-M1 tạo trước).
        const thieuPage = pageId != null && cu.page_id == null;
        if (!doiTen && !doiTon && !thieuPage) {
          kq.giuNguyen++;
        } else {
          await suaTheoIdPos(pool, ctx, {
            teamId,
            bang: "san_pham",
            id: cu.id,
            duLieu: {
              ten,
              ton_kho: tonKho,
              het_hang: tonKho != null && tonKho <= 0,
              ...(thieuPage ? { page_id: pageId } : {}),
              sua_luc: new Date(),
            },
            hanhDong: "pos_doc_danh_muc_refresh",
          });
          kq.capNhat++;
        }
      }

      // RF-9 — ĐƠN VỊ: `retail_price` POS Ở ĐƠN VỊ NHỎ (minor). Ghi THẲNG vào
      // `goi_gia.gia` (cũng minor, khai tường minh ở migration 007 COMMENT), KÈM
      // `tien_te`. Cửa tạo đơn (`tao-don.js`) dùng con số này TRỰC TIẾP, KHÔNG nhân
      // `HE_SO_TE` lần nữa — nhân ở đây rồi lại nhân bên kia = thu ×100/×1000.
      const gia = Number(v.retail_price ?? 0);
      if (gia > 0) {
        if (!tienTe) {
          kq.giaKhongBietTe.push({ ma, gia });
          continue;
        }
        const coGia = await layNhieu(pool, ctx, "goi_gia", {
          dieuKien: { team_id: team.teamId, san_pham_id: spId, so_luong: 1 },
        });
        if (!coGia.length) {
          await themMoi(pool, ctx, "goi_gia", {
            team_id: team.teamId,
            san_pham_id: spId,
            so_luong: 1,
            gia,
            tien_te: tienTe,
          });
          kq.giaGhiDuoc++;
        } else if (String(coGia[0].gia) !== String(gia)) {
          await suaTheoIdPos(pool, ctx, {
            teamId,
            bang: "goi_gia",
            id: coGia[0].id,
            duLieu: { gia, tien_te: tienTe },
            hanhDong: "pos_doc_danh_muc_gia",
          });
          kq.giaGhiDuoc++;
        }
      }
    }
    if (lo.bienThe.length < coTrang) break;
  }
  return kq;
}
