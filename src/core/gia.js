// LÕI CHUNG · GIÁ — nguồn sự thật DUY NHẤT cho "một đơn đáng bao nhiêu tiền" (phiếu BH1).
//
// ═══ VÌ SAO CÓ FILE NÀY ════════════════════════════════════════════════════════════
// Trước BH1, tổng tiền của một đơn là **tham số do MODEL điền**: `tools.js` khai
// `total_price` với mô tả «LẤY TỪ bảng giá KB, KHÔNG tự bịa» — nhưng đó là một LỜI DẶN
// trong prompt, không phải một cái cửa. Không dòng code nào đối chiếu con số ấy với bảng
// giá trước khi nó đi tiếp vào `pancake-orders.js:164` → `shipping_fee` → **số tiền người
// giao hàng thu của khách**.
//
// Hệ quả đã trả giá thật (07/08/2026, khách Priscela Amon): AI báo gấp đôi giá → khách
// huỷ đơn + BLOCK page. Cách chữa hồi đó là viết thêm luật vào prompt (`CORE §6`). Luật
// prompt chỉ làm giảm xác suất; nó không phải cái chặn.
//
// Nguyên tắc của file này: **model ĐỀ NGHỊ, server QUYẾT.** Con số đi xuống POS luôn là
// số lấy từ bảng giá, không bao giờ là số model gõ ra.
//
// ═══ MỘT CỬA, KHÔNG PHẢI HAI ═══════════════════════════════════════════════════════
// `outbound-guard.js#allowedPrices` (chiều RA: chặn tin nói sai giá) và `order-bridge.js#
// checkTotal` (cửa ② của 5 cửa tạo đơn) vốn tự dựng tập giá riêng. Ba bản khai cho cùng
// một sự thật thì bản thứ hai và thứ ba là bản TRÔI. Từ BH1: `allowedPrices` gọi xuống
// đây; `checkTotal` gộp ở phiếu sau (ghi §9).
//
// ═══ GIỚI HẠN ĐÃ ĐO, ĐỪNG TIN QUÁ TAY ══════════════════════════════════════════════
// `kb.js#productTiers(p)` trả `{label, price}` — **KHÔNG có số lượng**. Nhãn là chuỗi tự
// do marketer gõ: "Buy 1 Get 2 FREE (Total 3 Products)" · "𝐁𝐮𝐲 𝟏 𝐆𝐞𝐭 𝟏" · "1 Set" ·
// "2 Pairs – (Most Popular Choice)". Đo 16/09 trên 77 page thật: 63 page có đúng 2 gói,
// 5 page có 1 gói, **7 page có 0 gói**. Vì vậy suy "khách muốn 2 cái" → "gói nào" là việc
// KHÔNG chắc chắn, và file này **cố ý không đoán**: không khớp rõ đúng một gói thì nói
// thẳng là chưa rõ, để tầng trên hỏi lại khách một câu (đúng `CORE §6` mục 2).

import { productTiers } from '../kb.js';

/** Mã kết quả — tầng trên đọc mã, không đọc chuỗi tiếng Việt (chuỗi để cho NGƯỜI đọc). */
export const MA = Object.freeze({
  OK: 'OK',                             // xác định được tổng hợp lệ
  CHUA_RO: 'CHUA_RO',                   // chưa đủ căn cứ để chốt tổng — KHÔNG phải lỗi
  KHONG_CO_BANG_GIA: 'KHONG_CO_BANG_GIA',
  LECH_BANG_GIA: 'LECH_BANG_GIA',       // model nêu số không có trong bảng
  LECH_GOI: 'LECH_GOI',                 // model chọn gói A nhưng báo giá gói B
});

const chuan = (s) => String(s == null ? '' : s)
  .toLowerCase()
  .replace(/[\u{1D400}-\u{1D7FF}]/gu, (c) => {                 // 𝐁𝐮𝐲 → buy (marketer hay dùng)
    const cp = c.codePointAt(0);
    const bang = [[0x1D400, 26, 'a'], [0x1D41A, 26, 'a'], [0x1D7CE, 10, '0'], [0x1D7E2, 10, '0']];
    for (const [goc, n, dau] of bang) if (cp >= goc && cp < goc + n) return String.fromCharCode(dau.charCodeAt(0) + (cp - goc));
    return ' ';
  })
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

/** Bảng giá phẳng của page: mọi gói của mọi sản phẩm, kèm tiền tệ. */
export function bangGia(kb) {
  const ra = [];
  for (const p of (kb?.products || [])) {
    const tienTe = String(p.currency || '').toUpperCase();
    for (const t of productTiers(p)) {
      if (!(t.price > 0)) continue;
      ra.push({ nhan: String(t.label || '').trim(), gia: Number(t.price), tienTe, spId: p.id, spTen: p.name });
    }
  }
  return ra;
}

/** Tập số tiền hợp lệ — `outbound-guard#allowedPrices` dùng lại chính hàm này. */
export function giaHopLe(kb) {
  return new Set(bangGia(kb).map((g) => g.gia));
}

/**
 * Chọn gói khách đang nhắm tới. TRẢ `null` KHI KHÔNG CHẮC — đó là điểm của hàm này.
 *
 * Thứ tự thử, dừng ở bước đầu tiên cho ĐÚNG MỘT kết quả:
 *   ① chỉ có 1 gói trong bảng      → chính nó (không có gì để nhầm)
 *   ② nhãn khớp `variant` model gửi (bằng nhau, rồi chứa nhau)
 *   ③ nhãn mở đầu bằng số lượng khách nói ("2 sets" ↔ "2 Sets", "buy 2 …")
 * Bước ③ cố ý HẸP: chỉ khớp khi con số đứng ở ĐẦU nhãn hoặc ngay sau "buy". Nhãn
 * "Buy 1 Get 2 FREE (Total 3 Products)" chứa cả 1, 2 và 3 — khớp lỏng là chọn nhầm gói,
 * mà chọn nhầm gói nghĩa là thu sai tiền của một người thật.
 */
export function chonGoi({ kb, variant, qty } = {}) {
  const ds = bangGia(kb);
  if (!ds.length) return null;
  if (ds.length === 1) return ds[0];

  const v = chuan(variant);
  if (v) {
    const bang = ds.filter((g) => chuan(g.nhan) === v);
    if (bang.length === 1) return bang[0];
    const chua = ds.filter((g) => { const n = chuan(g.nhan); return n && (n.includes(v) || v.includes(n)); });
    if (chua.length === 1) return chua[0];
  }

  const n = Number(qty);
  if (Number.isFinite(n) && n > 0) {
    const theoSo = ds.filter((g) => {
      const nhan = chuan(g.nhan);
      return new RegExp(`^${n}\\b`).test(nhan) || new RegExp(`^buy ${n}\\b`).test(nhan);
    });
    if (theoSo.length === 1) return theoSo[0];
  }
  return null;
}

/**
 * CỬA TIỀN. Model đề nghị `tong`; hàm này nói tổng nào được đi tiếp.
 *
 * @param {object} a
 *   @param {object} a.kb
 *   @param {string} [a.variant]  gói model khai
 *   @param {number} [a.qty]
 *   @param {number} [a.tong]     tổng model khai (`total_price`)
 * @returns {{chan:boolean, ma:string, tong:number, tienTe:string, goi:object|null,
 *            lyDo:string, hopLe:number[]}}
 *   `chan === true` ⇒ tầng trên PHẢI dừng, trả `lyDo` nguyên văn cho model đọc.
 *
 * ⚠️ HÀNH VI CÓ CHỦ Ý: **thiếu tổng KHÔNG bị chặn ở đây.** Đường "model không nêu tổng"
 * đã fail-closed sẵn ở cửa ⑤ (`order-bridge.js#precheck` → `NO_TOTAL`/`NO_PRICE_TABLE`
 * khoá nút Tạo đơn của sale). Chặn thêm lần nữa ở đây chỉ làm mất một lượt chốt mà không
 * thêm một lớp an toàn nào — và sẽ phá hợp đồng đang có của `test/l2-m1-nhac-truong.js`
 * (ca N1b chốt đơn KHÔNG kèm `total_price` và phải xanh). BH1 đóng lỗ **số SAI**, không
 * đổi hành vi **thiếu số**.
 */
export function tinhTong({ kb, variant, qty, tong } = {}) {
  const ds = bangGia(kb);
  const hopLe = [...new Set(ds.map((g) => g.gia))].sort((a, b) => a - b);
  const goi = chonGoi({ kb, variant, qty });
  const tienTe = goi?.tienTe || ds[0]?.tienTe || '';
  const soModel = Number(tong);
  const coSo = Number.isFinite(soModel) && soModel > 0;

  if (!coSo) {
    // Server tự điền khi biết chắc gói — đây là nửa "server QUYẾT" của nguyên tắc.
    if (goi) return { chan: false, ma: MA.OK, tong: goi.gia, tienTe, goi, lyDo: '', hopLe };
    return { chan: false, ma: MA.CHUA_RO, tong: 0, tienTe, goi: null, hopLe,
      lyDo: 'Chưa chốt được tổng tiền (không rõ khách lấy gói nào) — nhân viên sẽ xác nhận tổng.' };
  }

  if (!ds.length) {
    return { chan: true, ma: MA.KHONG_CO_BANG_GIA, tong: 0, tienTe: '', goi: null, hopLe,
      lyDo: 'TỪ CHỐI: page này chưa có bảng giá trong KB nên không có gì để đối chiếu tổng tiền. '
        + 'TUYỆT ĐỐI không nêu tổng tiền nào với khách; nói "nhân viên sẽ xác nhận tổng" rồi gọi lại tool không kèm total_price.' };
  }

  if (!hopLe.includes(soModel)) {
    return { chan: true, ma: MA.LECH_BANG_GIA, tong: 0, tienTe, goi, hopLe,
      lyDo: `TỪ CHỐI: tổng ${soModel} KHÔNG khớp gói nào trong bảng giá. Giá hợp lệ: ${hopLe.join(', ')}. `
        + 'Tổng chỉ được là ĐÚNG giá MỘT gói — không tự nhân/cộng. Sửa lại rồi gọi tool lần nữa.' };
  }

  if (goi && goi.gia !== soModel) {
    return { chan: true, ma: MA.LECH_GOI, tong: 0, tienTe: goi.tienTe, goi, hopLe,
      lyDo: `TỪ CHỐI: gói "${goi.nhan}" có giá ${goi.gia} ${goi.tienTe}, nhưng tổng khai là ${soModel}. `
        + 'Hỏi lại khách ĐÚNG MỘT câu kèm giá để biết khách lấy gói nào, rồi gọi tool lại.' };
  }

  return { chan: false, ma: MA.OK, tong: soModel, tienTe, goi, lyDo: '', hopLe };
}
