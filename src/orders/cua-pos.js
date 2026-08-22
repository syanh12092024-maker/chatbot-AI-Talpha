// CẦU NỐI máy trạng thái đơn → CỬA POS THẬT (phiếu L3-M1). Chỉ file này biết đường đi
// tới `src/pos/`; `may-trang-thai.js` và `quet-don-moi.js` chỉ thấy hai hàm deps.
//
// ═══ BA THỨ ĐO ĐƯỢC BUỘC PHẢI CÓ FILE NÀY ════════════════════════════════════
// ① `ghiNguocTrangThai` ĐÒI `market` (tên thị trường), nhưng `don_hang` KHÔNG có cột
//    shop/thị trường (đo 22/08: 14 cột, không cột nào). Đường duy nhất: `ma_pos` =
//    `"<shop_id>:<id đơn POS>"` (L1-M1 §7.3) → tra `ket_noi_pos` theo `shop_id` → market.
//    Không tra ra ⇒ fail-CLOSED (ném lỗi có tên), KHÔNG đoán thị trường.
// ② `ghiNguocTrangThai` nhận `donId` là id đơn TRÊN POS (số), không phải `don_hang.id`.
//    Chỗ duy nhất trong L3 cần id POS trần nằm ở đây, tách khỏi mọi interface khác.
// ③ Đọc LIVE trước khi chọn vế `tu` của CAS: `src/pos/index.js` (cửa VÀO duy nhất)
//    KHÔNG re-export hàm đọc MỘT đơn — nó chỉ export `docDon` (quét cả shop, phân
//    trang, ghi DB). Nên file này import SÂU `src/pos/api.js#guiDocMotDon`. Đó là hàm
//    CHỈ-ĐỌC (GET), không phải đường ghi; nhưng nó vẫn là một lượt với sang đất phiếu
//    khác ⇒ đã ghi §9 sổ điều hành: phiếu sau nên re-export `docMotDonLive` ở
//    `src/pos/index.js` rồi xoá import sâu này đi.
import { layKetNoi, lietKeThiTruong, ghiNguocTrangThai } from "../pos/index.js";
import { guiDocMotDon } from "../pos/api.js"; // ⛔ import SÂU có chủ ý — xem ③ trên
import { ctxHeThong } from "../db/index.js";

/** Lỗi CÓ TÊN — không suy được thị trường/id POS của đơn ⇒ không gọi cửa POS. */
export class LoiKhongRoThiTruong extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiKhongRoThiTruong";
  }
}

/** `"1635200759:47419"` → `{ shopId: "1635200759", donIdPos: "47419" }`. Sai khuôn ⇒ ném. */
export function taChMaPos(maPos) {
  const s = String(maPos ?? "");
  const i = s.indexOf(":");
  if (i <= 0 || i === s.length - 1) {
    throw new LoiKhongRoThiTruong(
      `ma_pos=${JSON.stringify(maPos)} không đúng khuôn "<shop_id>:<id đơn POS>" ` +
        `(L1-M1 §7.3) — id trần là hai shop tranh nhau một dòng, cấm đoán.`,
    );
  }
  return { shopId: s.slice(0, i), donIdPos: s.slice(i + 1) };
}

/** shop_id (từ `ma_pos`) → `market` của CHÍNH team đó. Không tra ra ⇒ fail-CLOSED. */
export async function thiTruongCuaDon(pool, ctx, { don, teamId }) {
  const { shopId, donIdPos } = taChMaPos(don.ma_pos);
  const ds = await lietKeThiTruong(pool, ctx?.laHeThong ? ctxHeThong() : ctx, {
    teamId: ctx?.laHeThong ? teamId : null,
  });
  const kn = ds.find((x) => String(x.shopId) === shopId && x.bat);
  if (!kn) {
    throw new LoiKhongRoThiTruong(
      `không có kết nối POS đang BẬT cho shop_id=${shopId} trong team ${teamId} ` +
        `(đơn ${don.ma_pos}) — cửa POS đòi \`market\` tường minh, hệ KHÔNG đoán thị ` +
        `trường từ page_id (17,4% đơn thật không có page_id).`,
    );
  }
  return { market: kn.market, shopId, donIdPos };
}

/**
 * ĐỌC LIVE mã trạng thái của một đơn trên POS (GET, không ghi gì).
 * Vế `tu` của compare-and-set phải so với sự thật NGAY TRƯỚC lượt ghi — sale vẫn đổi
 * trạng thái bằng tay song song, nên ảnh chụp `don_hang.trang_thai_pos` trong CSDL
 * luôn có thể cũ hơn POS (lý do cửa (c) của `ghi-nguoc.js` tồn tại).
 */
export async function docLivePos(
  pool,
  ctx,
  { don, teamId },
  { nap = fetch, env = process.env } = {},
) {
  const { market, donIdPos } = await thiTruongCuaDon(pool, ctx, {
    don,
    teamId,
  });
  const ketNoi = await layKetNoi(
    pool,
    ctx?.laHeThong ? ctxHeThong() : ctx,
    market,
    { teamId: ctx?.laHeThong ? teamId : null, env },
  );
  const live = await guiDocMotDon(ketNoi, donIdPos, { nap });
  return Number(live.status);
}

/**
 * GHI NGƯỢC trạng thái đơn — bọc mỏng `ghiNguocTrangThai` (bốn cửa an toàn của L1-M1
 * chạy NGUYÊN VẸN bên trong: van env · bảng chuyển · CAS live · nhật ký hai pha).
 * Việc duy nhất của lớp bọc: dịch `don_hang.id` + `ma_pos` sang `{market, donId POS}`.
 */
export async function ghiNguocPos(
  pool,
  ctx,
  { don, teamId, tu, sang },
  tuyChon = {},
) {
  const { market, donIdPos } = await thiTruongCuaDon(pool, ctx, {
    don,
    teamId,
  });
  return ghiNguocTrangThai(
    pool,
    ctx?.laHeThong ? ctxHeThong() : ctx,
    {
      market,
      donId: donIdPos,
      tu,
      sang,
      teamId: ctx?.laHeThong ? teamId : null,
    },
    tuyChon,
  );
}
