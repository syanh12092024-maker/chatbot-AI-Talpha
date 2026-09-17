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
import { tachSoHieu } from "./ten-goc.js";
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
  { nap = fetch, env = process.env, trongGiaoDich = false } = {},
) {
  if (!shop)
    throw new Error(
      "docDanhMuc: thiếu `shop` (tên thị trường trong ket_noi_pos).",
    );
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "san_pham" });
  // Serialize catalog sync with operator edits. Otherwise a sync that read the old
  // manual-config flag could overwrite a price just saved in the UI.
  if (!trongGiaoDich && typeof pool.connect === 'function') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`catalog:${team.teamId}`]);
      const result = await docDanhMuc(client, ctx, { shop, teamId, tienTe, soTrangToiDa, coTrang }, { nap, env, trongGiaoDich:true });
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
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
    // CR-15/09 — hai con số của việc nối `ma_goc`. Cố ý ĐẾM và TRẢ RA thay vì im lặng:
    // «chưa nối được» là trạng thái thật và người vận hành phải thấy nó, kẻo tưởng đã gán
    // xong rồi đi mở van (bài học «màn rỗng phải phân biệt xong-hết với chưa-cài-xong»).
    chuaCoSanPhamGoc: new Set(), // số hiệu đọc được mà CHƯA có san_pham_goc → việc CR3
    khongCoSoHieu: [],           // mã POS không mang số hiệu → người phải gán tay
    noiMaGoc: 0,                 // số biến thể nối được `ma_goc`
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

      // ── CR-15/09 · TỰ NỐI `ma_goc` THEO SỐ HIỆU ──────────────────────────────────
      // Đội vận hành gõ số hiệu vào đầu tên POS (`125 - Fitgum Acai Berry`), và đo 15/09
      // trên 7 shop: 78 số hiệu có mặt ở >1 shop, 75/78 tên khớp. Nên khi một sản phẩm gốc
      // ĐÃ TỒN TẠI với số hiệu ấy, biến thể của shop mới nối vào được mà không cần người.
      //
      // Đó chính là thứ làm «mở thị trường mới» rẻ đi: người đặt tên sản phẩm MỘT lần, các
      // shop sau tự khớp.
      //
      // ⛔ KHÔNG TỰ TẠO `san_pham_goc`. Đặt tên một sản phẩm là quyết định của người (mã gốc
      //    là thứ hiện trên màn và trong kịch bản). Máy tự tạo thì 113 biến thể không có số
      //    hiệu sẽ sinh ra 113 sản phẩm gốc rác, và không ai dọn.
      // ⛔ KHÔNG ghi đè `ma_goc` đã có. Người soát (CR3) thắng máy.
      const { soHieu } = tachSoHieu(ten);
      let maGoc = null;
      if (soHieu) {
        const goc = await layNhieu(pool, ctx, "san_pham_goc", {
          dieuKien: { team_id: team.teamId, so_hieu: soHieu },
        });
        if (goc.length) { maGoc = goc[0].ma_goc; kq.noiMaGoc++; }
        else kq.chuaCoSanPhamGoc.add(soHieu);
      } else {
        kq.khongCoSoHieu.push(ma);
      }
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
          ma_goc: maGoc, // null = chưa có sản phẩm gốc cho số hiệu này (người gán ở CR3)
        });
        spId = moi.id;
        kq.them++;
      } else {
        const cu = daCo[0];
        spId = cu.id;
        const doiTen = !cu.cau_hinh_tay && String(cu.ten ?? "") !== ten;
        const doiTon = String(cu.ton_kho ?? "") !== String(tonKho ?? "");
        // RF-15 — backfill page_id cho san_pham cũ còn NULL (di trú/L1-M1 tạo trước).
        const thieuPage = pageId != null && cu.page_id == null;
        // 17/09 — BACKFILL `ma_goc`, cùng khuôn và cùng lý do với `thieuPage`.
        //
        // Nhánh nối `ma_goc` ở trên chỉ chạy cho biến thể MỚI. Nên sản phẩm gốc đặt tên
        // SAU khi biến thể đã có trong bảng thì không bao giờ nối được: đo trên bản dev,
        // tạo gốc cho số hiệu 8 xong kéo lại ⇒ `chuaCoSanPhamGoc` giảm 55→54 (máy ĐÃ thấy
        // gốc) nhưng `san_pham.ma_goc` vẫn NULL. Tức lời hứa «đặt tên một lần, shop sau tự
        // khớp» chỉ đúng nửa vế, và đúng 137 dòng cũ của CR3 là nửa vế còn lại.
        //
        // ⛔ Vẫn KHÔNG ghi đè `ma_goc` đã có — người soát thắng máy. Chỉ điền chỗ NULL.
        const thieuGoc = maGoc != null && cu.ma_goc == null;
        if (!doiTen && !doiTon && !thieuPage && !thieuGoc) {
          kq.giuNguyen++;
        } else {
          await suaTheoIdPos(pool, ctx, {
            teamId,
            bang: "san_pham",
            id: cu.id,
            duLieu: {
              ...(!cu.cau_hinh_tay ? { ten, het_hang: tonKho != null && tonKho <= 0 } : {}),
              ton_kho: tonKho,
              ...(thieuPage ? { page_id: pageId } : {}),
              ...(thieuGoc ? { ma_goc: maGoc } : {}),
              sua_luc: new Date(),
            },
            hanhDong: "pos_doc_danh_muc_refresh",
          });
          kq.capNhat++;
          if (thieuGoc) kq.noiMaGoc++;   // đếm cả lượt nối muộn, không chỉ lượt nối lúc tạo
        }
      }

      // RF-9 — ĐƠN VỊ: `retail_price` POS Ở ĐƠN VỊ NHỎ (minor). Ghi THẲNG vào
      // `goi_gia.gia` (cũng minor, khai tường minh ở migration 007 COMMENT), KÈM
      // `tien_te`. Cửa tạo đơn (`tao-don.js`) dùng con số này TRỰC TIẾP, KHÔNG nhân
      // `HE_SO_TE` lần nữa — nhân ở đây rồi lại nhân bên kia = thu ×100/×1000.
      const gia = Number(v.retail_price ?? 0);
      if (gia > 0 && !daCo[0]?.cau_hinh_tay) {
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
  // `Set` không tuần tự hoá được qua JSON — đổi sang mảng ở CỬA RA, đúng một chỗ.
  kq.chuaCoSanPhamGoc = [...kq.chuaCoSanPhamGoc].sort((a, b) => Number(a) - Number(b));
  return kq;
}
