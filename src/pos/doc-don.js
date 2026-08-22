// ĐỌC ĐƠN THẬT TỪ POS → bảng `don_hang` (phiếu L1-M1 ②.2 · luật suy `nguon` là ②.4).
//
// ═══ BỐN QUYẾT ĐỊNH ĐO ĐƯỢC CỦA FILE NÀY ════════════════════════════════════
//
// ① `ma_pos` = "<shop_id>:<id_đơn>", KHÔNG phải id đơn trần.
//    Vì id đơn của POS là DÃY RIÊNG TỪNG SHOP, không phải id toàn hệ. Đo 22/08:
//    Saudi tới 62.029 · UAE tới 47.421 · Kuwait tới 13.922 · Taiwan tới 344 — bốn dãy
//    đều đếm từ 1, chồng lên nhau hoàn toàn. Mọi shop hiện đậu chung team `chua-phan`,
//    mà `don_hang` có UNIQUE (team_id, ma_pos) ⇒ ghi id trần là đơn Saudi #344 và đơn
//    Taiwan #344 tranh nhau MỘT dòng. Không ai thấy, vì bên thua chỉ là một lượt update.
//
// ② `nguon` suy từ `conversation_id`, và suy được vì HAI KHUÔN KHỚP NHAU:
//    POS trả `conversation_id` = "<page_id_fb>_<psid>" — ĐÚNG khuôn khoá của
//    `conv-state.json` mà L0-M1 đã nạp thành `hoi_thoai (page_id, psid)`.
//      · có conversation_id đúng khuôn  → `messenger`
//      · KHÔNG có conversation_id       → `trang_ban_hang` (khách vào bằng form, 01 §1)
//      · CÓ nhưng SAI khuôn             → KHÔNG SUY ĐƯỢC ⇒ bỏ qua đơn + LIỆT KÊ mã ra,
//        cấm đoán. Đoán sai chiều này là bịt luôn lỗ 37,4% mà cả L3 sinh ra để vá.
//    Phân bố đo 22/08 trên 2.100 đơn mới nhất của 7 shop: có conversation_id 1.593
//    (75,9%) · không có 507 (24,1%) · sai khuôn 0.
//
// ③ `trang_thai_he` KHÁC `trang_thai_pos` — hai cột, hai chủ.
//    `trang_thai_pos` = MÃ SỐ POS dạng text ("12"), refresh mỗi lượt đọc.
//    `trang_thai_he`  = trạng thái của máy trạng thái v3, chủ là L3-M1. Cửa POS chỉ
//    GIEO giá trị đầu `'moi_tu_pos'` lúc TẠO dòng và KHÔNG BAO GIỜ đụng lại — nếu cửa
//    POS được phép ghi đè cột này thì mỗi lượt job đọc đơn sẽ xoá sạch tiến trình mà
//    L3 đang giữ. (Từ vựng của cột là của L3-M1, xem sổ nợ §9.)
//
// ④ `nguon` chỉ ghi LÚC TẠO, không refresh. Máy trạng thái L3 rẽ nhánh theo cột này;
//    một đơn lật nguồn giữa chừng là lật luôn nhánh nghiệp vụ đang chạy dở. Lượt đọc
//    sau thấy lệch thì BÁO ra (`lechNguon`), không tự sửa.
//
// ⑤ `khach`/`san_pham_ma`/`status_history` — NUÔI ở đây, và NHẬP `chuanHoaSdt` TRỰC
//    TIẾP từ `../orders/loc-trung.js`, KHÔNG qua `../orders/index.js` (phiếu VA-Q12).
//    Lý do nói ra (luật 13 tho-thi-cong): phiếu khai ưu tiên `orders/index.js`, và hàm
//    ĐÃ được export ở đó — nhưng `orders/index.js` re-export cả `cua-pos.js`, mà file
//    đó `import … from "../pos/index.js"`. Nhập theo đường đó tạo VÒNG: `src/pos` →
//    `src/orders` → `src/pos`. ĐO THỬ 23/08 (tạm thêm dòng import, chạy
//    `node --test test/l1-m1-doc-pos.test.js`): vòng này CHẠY ĐƯỢC hôm nay (Node giải
//    quyết được nhờ `chuanHoaSdt` là function DECLARATION hoisted, gọi ở runtime chứ
//    không ở module-scope) — nhưng codebase này đã trả giá 4 lần cho việc GIỮ layer
//    `src/pos` (L1) không phụ thuộc ngược vào `src/orders` (L3) — xem 4 «cửa hẹp» ghi
//    trùng ở §9 sổ điều hành, sinh ra chính vì tôn trọng ranh giới lớp. Vòng qua
//    index.js "chạy được hôm nay" nhưng vỡ IM LẶNG nếu mai có ai đổi `chuanHoaSdt`
//    thành hằng `const`, hoặc một file trong chuỗi re-export thêm một dòng chạy ở
//    module-scope. Nhập thẳng `loc-trung.js` (0 phụ thuộc ngược vào `src/pos`) tốn
//    đúng một dòng khác với chữ phiếu, không vòng, không rủi ro — cùng khuôn
//    `cua-pos.js:18` đã làm với `import SÂU có chủ ý` khi hàng rào không vừa.
//    Giá phải trả: `khach.so_dien_thoai` LƯU DẠNG ĐÃ CHUẨN HOÁ (không phải chuỗi thô
//    của POS) — để một SĐT chỉ có ĐÚNG MỘT `khach` dù POS khai `0501234567` hay
//    `+966501234567` (không thì lặp lại chính lỗi «58 khách bị tách đôi» mà
//    `loc-trung.js` đã đo, nhưng lần này lặp NGAY TRONG bảng `khach`). Đổi lại: mất
//    khả năng hiển thị số điện thoại ở ĐÚNG định dạng gốc khách đã nhập — chưa có màn
//    nào trong v3 cần điều đó, nếu cần thì đó là một quyết định khác, không phải lượt
//    này.
//
// ⛔ `tong_tien` để NULL — xem khối «TIỀN» cuối file. Fail-CLOSED, có nợ §9.
import { layNhieu, themMoi } from "../db/index.js";
import { xacDinhTeam, suaTheoIdPos } from "./kho.js";
import { layKetNoi } from "./ket-noi.js";
import { guiDocDon } from "./api.js";
import { chuanHoaSdt } from "../orders/loc-trung.js";

const RE_CONV = /^(\d+)_(\d+)$/;

/** Suy `don_hang.nguon` từ một đơn POS. Trả null = KHÔNG suy được (cấm đoán). */
export function suyNguon(donPos) {
  const c = donPos.conversation_id;
  if (c == null || c === "") return { nguon: "trang_ban_hang", conv: null };
  const m = RE_CONV.exec(String(c));
  if (!m) return { nguon: null, conv: String(c) };
  return { nguon: "messenger", conv: String(c), pageIdFb: m[1], psid: m[2] };
}

/** Bản đồ page_id FB (text) → page.id (bigint) của team, nạp MỘT lượt cho cả job. */
async function banDoPage(pool, ctx, teamId) {
  const ds = await layNhieu(pool, ctx, "page", {
    dieuKien: { team_id: teamId },
  });
  const m = new Map();
  for (const p of ds) m.set(String(p.page_id), String(p.id));
  return m;
}

/** Bản đồ "<page.id>|<psid>" → hoi_thoai.id, nạp MỘT lượt. */
async function banDoHoiThoai(pool, ctx, teamId) {
  const ds = await layNhieu(pool, ctx, "hoi_thoai", {
    dieuKien: { team_id: teamId },
  });
  const m = new Map();
  for (const h of ds) m.set(`${h.page_id}|${h.psid}`, String(h.id));
  return m;
}

/**
 * Bản đồ SĐT ĐÃ CHUẨN HOÁ → khach.id của team, nạp MỘT lượt (quyết định ⑤ đầu file).
 * Chạy `chuanHoaSdt` lại trên GIÁ TRỊ ĐANG LƯU dù đã lưu ở dạng chuẩn hoá — phòng thân
 * cho dữ liệu cũ/ghi tay lệch khuôn (chuanHoaSdt THUẦN nên gọi lại trên một số ĐÃ chuẩn
 * hoá không đổi gì, tốn 0, an toàn tuyệt đối một chiều).
 */
async function banDoKhach(pool, ctx, teamId) {
  const ds = await layNhieu(pool, ctx, "khach", {
    dieuKien: { team_id: teamId },
  });
  const m = new Map();
  for (const k of ds) {
    const sdt = chuanHoaSdt(k.so_dien_thoai);
    if (sdt) m.set(sdt, String(k.id));
  }
  return m;
}

/** Rút mã biến thể POS từ `items[]` của một đơn, khuôn "<shop_id>:<variation_id>"
 *  (CÙNG khoá với `san_pham.ma` — xem `doc-danh-muc.js`). Đơn không có dòng hàng /
 *  thiếu variation_id (4,1% đo 23/08) → MẢNG RỖNG, KHÔNG bịa (②#3 phiếu VA-Q12). */
function rutSanPhamMa(donPos, shopId) {
  const items = Array.isArray(donPos.items) ? donPos.items : [];
  return items
    .map((it) => it?.variation_id)
    .filter((vid) => vid != null && vid !== "")
    .map((vid) => `${shopId}:${vid}`);
}

/**
 * Đọc đơn của MỘT thị trường theo trạng thái → ghi/refresh `don_hang`.
 *
 * @param ctx     bối cảnh team. Job nền dùng `ctxHeThong()` + `teamId` tường minh.
 * @param shop    TÊN THỊ TRƯỜNG như `pancake-shops.json` (Saudi/UAE/…), khoá của ket_noi_pos.
 * @param trangThai MÃ SỐ trạng thái POS (số), hoặc null = mọi trạng thái.
 * @param tuNgay  'YYYY-MM-DD' — mốc bắt đầu (UTC), hoặc null.
 */
export async function docDon(
  pool,
  ctx,
  {
    shop,
    trangThai = null,
    tuNgay = null,
    teamId = null,
    soTrangToiDa = 3,
    coTrang = 100,
  } = {},
  { nap = fetch, env = process.env } = {},
) {
  if (!shop)
    throw new Error("docDon: thiếu `shop` (tên thị trường trong ket_noi_pos).");
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "don_hang" });
  const ketNoi = await layKetNoi(pool, ctx, shop, { teamId, env });

  const kq = {
    shop,
    shopId: ketNoi.shopId,
    trangThaiLoc: trangThai,
    docDuoc: 0,
    them: 0,
    capNhat: 0,
    giuNguyen: 0,
    theoNguon: { messenger: 0, trang_ban_hang: 0 },
    khongSuyDuocNguon: [],
    lechNguon: [],
    khopHoiThoai: 0,
    tongPos: 0,
    // Nợ Q1/Q2 (§9 sổ điều hành) — khach + san_pham_ma.
    khachMoi: 0, // khach vừa TẠO trong lượt này
    khachDaCo: 0, // khớp khach ĐÃ CÓ (cùng team + SĐT chuẩn hoá)
    donKhongSdt: 0, // đơn KHÔNG có SĐT → khach_id NULL — nói ra, không im (②#1 phiếu)
  };

  const pageMap = await banDoPage(pool, ctx, team.teamId);
  const htMap = await banDoHoiThoai(pool, ctx, team.teamId);
  const khachMap = await banDoKhach(pool, ctx, team.teamId);

  for (let trang = 1; trang <= soTrangToiDa; trang++) {
    const lo = await guiDocDon(
      ketNoi,
      { trangThai, tuNgay, trang, coTrang },
      { nap },
    );
    if (trang === 1) kq.tongPos = lo.tong;
    if (!lo.donHang.length) break;

    for (const o of lo.donHang) {
      kq.docDuoc++;
      const maPos = `${ketNoi.shopId}:${o.id}`;
      const suy = suyNguon(o);
      if (suy.nguon === null) {
        // CẤM đoán: liệt kê ra rồi bỏ qua đơn này (cột `nguon` là NOT NULL).
        kq.khongSuyDuocNguon.push({ maPos, conversationId: suy.conv });
        continue;
      }

      const pageBigint = o.page_id
        ? (pageMap.get(String(o.page_id)) ?? null)
        : null;
      let hoiThoaiId = null;
      if (suy.pageIdFb && suy.psid) {
        const pid = pageMap.get(suy.pageIdFb);
        if (pid) hoiThoaiId = htMap.get(`${pid}|${suy.psid}`) ?? null;
        if (hoiThoaiId) kq.khopHoiThoai++;
      }

      // ── Nợ Q1 (§9): upsert `khach` theo (team, SĐT chuẩn hoá) — nguồn duy nhất
      // `shipping_address.phone_number` (ĐO 23/08: có trên 2.083/2.100 đơn mẫu, khớp
      // cùng cột đã dùng để đo bảng chuẩn hoá của L3-M2). Không SĐT → khach_id NULL,
      // ĐẾM chứ không im lặng (nói ra ở kq.donKhongSdt).
      const sdtChuan = chuanHoaSdt(o.shipping_address?.phone_number ?? null);
      let khachId = null;
      if (sdtChuan) {
        khachId = khachMap.get(sdtChuan) ?? null;
        if (!khachId) {
          // Khuôn `const moi = await themMoi(...)` cùng `doc-danh-muc.js`.
          const moi = await themMoi(pool, ctx, "khach", {
            team_id: team.teamId,
            so_dien_thoai: sdtChuan,
            ten: o.shipping_address?.full_name || o.bill_full_name || "",
            dia_chi:
              o.shipping_address?.full_address ||
              o.shipping_address?.address ||
              "",
            thanh_pho: o.shipping_address?.province_name || "",
          });
          khachId = String(moi.id);
          khachMap.set(sdtChuan, khachId); // cùng SĐT gặp lại TRONG lượt này → tái dùng
          kq.khachMoi++;
        } else {
          kq.khachDaCo++;
        }
      } else {
        kq.donKhongSdt++;
      }

      // ── Nợ Q2 (§9): mã biến thể POS của các dòng hàng — mảng RỖNG khi thiếu
      // (4,1% đơn thật, KHÔNG bịa). Nợ Q3: lịch sử chuyển trạng thái RAW, CHỈ LƯU
      // (chưa ai đọc — migration 006).
      const sanPhamMa = rutSanPhamMa(o, ketNoi.shopId);
      const lichSuTrangThai = JSON.stringify(o.status_history ?? []);

      const daCo = await layNhieu(pool, ctx, "don_hang", {
        dieuKien: { team_id: team.teamId, ma_pos: maPos },
      });

      if (!daCo.length) {
        await themMoi(pool, ctx, "don_hang", {
          team_id: team.teamId,
          ma_pos: maPos,
          nguon: suy.nguon,
          // GIEO một lần, chủ cột là L3-M1 (xem quyết định ③ đầu file).
          trang_thai_he: "moi_tu_pos",
          trang_thai_pos: String(o.status),
          hoi_thoai_id: hoiThoaiId,
          page_id: pageBigint,
          tien_te: o.order_currency ?? null,
          khach_id: khachId,
          san_pham_ma: sanPhamMa,
          status_history: lichSuTrangThai,
        });
        kq.them++;
      } else {
        const cu = daCo[0];
        if (cu.nguon !== suy.nguon) {
          // KHÔNG tự sửa — báo ra (quyết định ④ đầu file).
          kq.lechNguon.push({ maPos, trongDb: cu.nguon, doDuoc: suy.nguon });
        }
        // Ưu tiên giá trị MỚI đọc được; lượt này không có SĐT thì GIỮ khach_id cũ
        // (đơn không lẽ nào "mất" khách đã nối được ở lượt trước) — cùng khuôn
        // `tien_te: o.order_currency ?? cu.tien_te` đã có sẵn ở đây.
        const khachIdMoi = khachId ?? cu.khach_id;
        const trangThaiDoi =
          String(cu.trang_thai_pos ?? "") !== String(o.status);
        const khachDoi = String(khachIdMoi ?? "") !== String(cu.khach_id ?? "");
        const spDoi =
          JSON.stringify(cu.san_pham_ma ?? []) !== JSON.stringify(sanPhamMa);
        // status_history: chỉ ép ghi khi đang NULL (chưa từng ghi). Không diff nội
        // dung ở đây — jsonb KHÔNG giữ nguyên thứ tự khoá khi đọc lại (Postgres tự
        // canon hoá), nên so JSON.stringify(giá trị mới từ POS) với
        // JSON.stringify(giá trị đã qua vòng jsonb) có thể lệch dù NỘI DUNG như nhau
        // ⇒ "đổi" giả vĩnh viễn. Mọi lượt CÓ cập nhật (vì lý do khác) vẫn mang theo
        // bản mới nhất, nên cột không bị đứng hình sau lượt ghi đầu.
        const lsThieu = cu.status_history == null;
        if (!trangThaiDoi && !khachDoi && !spDoi && !lsThieu) {
          kq.giuNguyen++;
        } else {
          await suaTheoIdPos(pool, ctx, {
            teamId,
            bang: "don_hang",
            id: cu.id,
            duLieu: {
              trang_thai_pos: String(o.status),
              tien_te: o.order_currency ?? cu.tien_te,
              khach_id: khachIdMoi,
              san_pham_ma: sanPhamMa,
              status_history: lichSuTrangThai,
              sua_luc: new Date(),
            },
            hanhDong: "pos_doc_don_refresh",
          });
          kq.capNhat++;
        }
      }
      kq.theoNguon[suy.nguon]++;
    }
    if (lo.donHang.length < coTrang) break;
  }
  return kq;
}

// ═══ TIỀN — vì sao `tong_tien` để NULL (fail-CLOSED, nợ §9) ══════════════════
// POS trả tiền ở ĐƠN VỊ NHỎ và hệ số quy đổi KHÁC NHAU theo tệ: AED/SAR/QAR/TWD ×100,
// còn KWD/OMR/BHD ×1000 (3 chữ số thập phân). Cột `don_hang.tong_tien` là
// numeric(14,2) — chia 1.000 cho một đơn KWD là LÀM TRÒN MẤT chữ số thứ ba ngay tại
// lượt ghi. Mà ghi thẳng số nhỏ (1300) vào một cột tên «tổng tiền» thì người đọc sau
// sẽ đọc thành 1.300 đơn vị tiền — sai 1.000 lần theo hướng không ai nghi ngờ.
// Cả hai lối đều là nói dối về tiền, nên lượt này KHÔNG ghi: `tien_te` có (nhãn, an
// toàn), `tong_tien` để NULL. Quy ước quy đổi là quyết định phải khai MỘT CHỖ cho cả
// hệ (giống §7.5 khai mốc ngày) — ghi §9 sổ, không tự chọn trong một cửa đọc đơn.
// (Đo 22/08: `total_price` = 0 trên MỌI đơn mẫu của cả 3 shop thử; tiền thật nằm ở
//  `cod` = `shipping_fee` = `money_to_collect`.)
