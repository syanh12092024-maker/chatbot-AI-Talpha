// CỬA HTTP tới Pancake POS — chỗ DUY NHẤT trong v3 chạm mạng của POS.
//
// Vì sao gom một chỗ: phép ghi ngược trạng thái đơn là lệnh GHI RA NGOÀI đầu tiên của
// v3 (làn 🟥). Rải `fetch` khắp nơi thì cửa nào cũng phải tự nhớ luật; gom lại thì
// `guiDatTrangThai()` là điểm DUY NHẤT có thể phát ra một lệnh đổi đơn khách thật, và
// bộ ca đếm được số lượt gọi nó (án lệ #31 skill tho-thi-cong: cửa RA đúng một cái).
//
// ⛔ KHÔNG có hàm xoá đơn ở đây, sẽ không bao giờ có (§0a luật 2 sổ điều hành).
// ⛔ Không đọc `pancake-shops.json` — khoá đến từ bảng `ket_noi_pos` (src/pos/ket-noi.js).
//
// ĐO ĐƯỢC 22/08 (máy dev, IP cá nhân): POS `pos.pages.fm` **KHÔNG chặn IP máy này** —
// 7/7 shop trả HTTP 200. Lỗi 121 mà sổ §0a nhắc là chuyện TOKEN PAGE của Graph API,
// KHÔNG phải POS. Nghĩa là phép đọc (docDon/docDanhMuc) đo được ngay ở local; chỉ
// phép GHI mới phải chờ diễn tập VPS, và chờ vì luật, không phải vì mạng.
const POS = "https://pos.pages.fm/api/v1";

/**
 * Lỗi CÓ TÊN — POS không trả lời / trả lỗi. Cấm nuốt thành «0 đơn».
 *
 * `coPhanHoi` là vế QUAN TRỌNG của nhật ký hai pha (phiếu ②.2d): `true` = POS ĐÃ trả
 * lời và trả lời là "không" (biết chắc lệnh KHÔNG chạy) · `false` = mất tăm giữa đường
 * (timeout/đứt mạng — KHÔNG biết lệnh có tới nơi không). Chỉ vế `false` mới được để lại
 * dòng bắt-đầu MỒ CÔI; gộp hai vế làm một là biến mọi lượt POS chối thành một cảnh báo
 * «mất phản hồi» giả, và cảnh báo giả thì vài ngày sau không ai đọc nữa.
 */
export class LoiPosKhongTraLoi extends Error {
  constructor(thongDiep, { coPhanHoi = false, http = null } = {}) {
    super(thongDiep);
    this.name = "LoiPosKhongTraLoi";
    this.coPhanHoi = coPhanHoi;
    this.http = http;
  }
}

// fetch có hạn giờ — một lượt treo không kéo sập cả job nền.
async function goi(url, tuyChon = {}, hanMs = 20000, nap = fetch) {
  const ac = new AbortController();
  const dongHo = setTimeout(() => ac.abort(), hanMs);
  try {
    const r = await nap(url, { ...tuyChon, signal: ac.signal });
    const chu = await r.text();
    let j = null;
    try {
      j = JSON.parse(chu);
    } catch {
      /* giữ nguyên chu để báo lỗi có nội dung */
    }
    if (!r.ok || j == null) {
      throw new LoiPosKhongTraLoi(
        `POS trả HTTP ${r.status}: ${String(chu).slice(0, 200)}`,
        { coPhanHoi: true, http: r.status },
      );
    }
    return j;
  } catch (e) {
    if (e instanceof LoiPosKhongTraLoi) throw e;
    throw new LoiPosKhongTraLoi(
      `POS không phản hồi (${url.split("?")[0]}): ${e.message}`,
      { coPhanHoi: false },
    );
  } finally {
    clearTimeout(dongHo);
  }
}

const q = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

/**
 * Đọc MỘT trang đơn. `trangThai` là MÃ SỐ (không phải nhãn) hoặc null = mọi trạng thái.
 * `tuNgay` dạng YYYY-MM-DD; POS nhận mốc unix giây.
 */
export async function guiDocDon(
  ketNoi,
  { trangThai = null, tuNgay = null, trang = 1, coTrang = 100 } = {},
  { nap = fetch } = {},
) {
  const tham = {
    api_key: ketNoi.apiKey,
    page_number: trang,
    page_size: coTrang,
    status: trangThai,
    startDateTime: tuNgay
      ? Math.floor(new Date(`${tuNgay}T00:00:00Z`).getTime() / 1000)
      : null,
  };
  const j = await goi(
    `${POS}/shops/${ketNoi.shopId}/orders?${q(tham)}`,
    {},
    20000,
    nap,
  );
  return {
    donHang: j.data || [],
    tong: j.total_entries ?? 0,
    tongTrang: j.total_pages ?? 0,
  };
}

/** Đọc MỘT đơn theo id POS — đây là vế GET của cửa (c) compare-and-set. */
export async function guiDocMotDon(ketNoi, donId, { nap = fetch } = {}) {
  const j = await goi(
    `${POS}/shops/${ketNoi.shopId}/orders/${donId}?${q({ api_key: ketNoi.apiKey })}`,
    {},
    20000,
    nap,
  );
  const d = j.data;
  if (!d || d.id == null) {
    throw new LoiPosKhongTraLoi(
      `POS trả về không có đơn ${donId} (shop ${ketNoi.shopId}) — không suy ra trạng thái live được.`,
    );
  }
  return d;
}

/** Đọc MỘT trang biến thể (danh mục + tồn kho thật). */
export async function guiDocBienThe(
  ketNoi,
  { trang = 1, coTrang = 100 } = {},
  { nap = fetch } = {},
) {
  const j = await goi(
    `${POS}/shops/${ketNoi.shopId}/products/variations?${q({
      api_key: ketNoi.apiKey,
      page_number: trang,
      page_size: coTrang,
    })}`,
    {},
    20000,
    nap,
  );
  return {
    bienThe: j.data || [],
    tong: j.total_entries ?? 0,
    tongTrang: j.total_pages ?? 0,
  };
}

/**
 * ⚠️ ĐIỂM DUY NHẤT PHÁT RA LỆNH ĐỔI ĐƠN KHÁCH THẬT.
 * Hàm này KHÔNG tự kiểm cửa nào cả — bốn cửa an toàn nằm ở `src/pos/ghi-nguoc.js`,
 * và đó là hàm duy nhất được phép gọi hàm này. Cố ý tách: một cửa ra trần trụi thì bộ
 * ca đếm được «PUT bao nhiêu lượt», còn nếu nhét cửa vào đây thì mỗi lối gọi mới lại
 * phải tự nhớ luật.
 */
export async function guiDatTrangThai(
  ketNoi,
  donId,
  maMoi,
  { nap = fetch } = {},
) {
  return goi(
    `${POS}/shops/${ketNoi.shopId}/orders/${donId}?${q({ api_key: ketNoi.apiKey })}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: Number(maMoi) }),
    },
    20000,
    nap,
  );
}
