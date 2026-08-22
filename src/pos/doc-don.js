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
// ⛔ `tong_tien` để NULL — xem khối «TIỀN» cuối file. Fail-CLOSED, có nợ §9.
import { layNhieu, themMoi } from "../db/index.js";
import { xacDinhTeam, suaTheoIdPos } from "./kho.js";
import { layKetNoi } from "./ket-noi.js";
import { guiDocDon } from "./api.js";

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
  };

  const pageMap = await banDoPage(pool, ctx, team.teamId);
  const htMap = await banDoHoiThoai(pool, ctx, team.teamId);

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
        });
        kq.them++;
      } else {
        const cu = daCo[0];
        if (cu.nguon !== suy.nguon) {
          // KHÔNG tự sửa — báo ra (quyết định ④ đầu file).
          kq.lechNguon.push({ maPos, trongDb: cu.nguon, doDuoc: suy.nguon });
        }
        if (String(cu.trang_thai_pos ?? "") === String(o.status)) {
          kq.giuNguyen++;
        } else {
          await suaTheoIdPos(pool, ctx, {
            teamId,
            bang: "don_hang",
            id: cu.id,
            duLieu: {
              trang_thai_pos: String(o.status),
              tien_te: o.order_currency ?? cu.tien_te,
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
