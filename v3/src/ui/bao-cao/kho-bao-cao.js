// TẦNG ĐỌC CỦA MÀN «BÁO CÁO» (G2-G1, sóng 3 — làm ở sóng 4).
//
// Yêu cầu nguyên văn: *«Tách hai luồng đơn — đo bằng HAI THƯỚC khác nhau»* (`01-QUYET-DINH §1`).
//
// ═══ NGUYÊN TẮC CỦA MÀN: KHÔNG CỘNG NHỮNG THỨ ĐO BẰNG THƯỚC KHÁC NHAU ═════════════════
// Người A đã dựng `baoCaoHaiLuong` theo đúng nguyên tắc đó và CỐ Ý không trả về một tổng.
// Màn này giữ nguyên tắc ấy, và phải áp nó thêm MỘT LẦN NỮA ở chỗ A chưa gặp:
//
// ═══ BA CON SỐ ĐƠN, BA CÂU HỎI ═══════════════════════════════════════════════════════
// Truy 26/08 tận nơi tính (xem `noi-day/cau-bot-v1.js#donHangToanHe`):
//   · **269** — bot TỰ TAY tạo đơn qua lời gọi công cụ, khử trùng theo khách, toàn thời gian
//   · **907** — đơn THẬT ở POS Pancake quy cho hội thoại có AI, 60 ngày, đã bỏ đơn huỷ
//   · **893** — số HỘI THOẠI có đơn ở POS, cùng phép quét
//
// Lệch hơn BA LẦN, và cả ba đều đúng — chúng trả lời ba câu khác nhau. Khách chat với bot
// rồi sale chốt hộ, hoặc khách tự đặt sau khi chat, đều vào 907 mà không vào 269.
//
// Chọn một cái rồi gọi nó là «số đơn» là làm hai chuyện cùng lúc: báo sai, và giấu mất hai
// con số kia. Màn hiện CẢ BA, mỗi cái một nhãn nói rõ nó đo gì và trong bao lâu.
//
// ═══ LUỒNG TRANG BÁN HÀNG: KHÔNG CÓ NGUỒN NÀO ════════════════════════════════════════
// `don_hang` của v3 có 0 dòng, và tiến trình bot chỉ biết luồng Messenger. Nên nửa thứ hai
// của yêu cầu chưa đo được. Màn khai thẳng, KHÔNG lấy số Messenger lấp vào chỗ đó.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Ba thước đo đơn. Mã + nhãn ở MỘT chỗ — màn và bài test dùng chung. */
export const THUOC = Object.freeze({
  BOT_TU_TAO: {
    ma: 'bot_tu_tao', ten: 'Bot tự tay chốt',
    doGi: 'Đơn do CHÍNH BOT tạo bằng lời gọi công cụ, mỗi khách đếm một lần.',
    khoang: 'toàn thời gian',
    nguon: '`src/stats.js#incOrder`, gọi từ `src/tools.js`',
  },
  POS_QUY_CHO_AI: {
    ma: 'pos_quy_cho_ai', ten: 'Đơn thật ở POS quy cho AI',
    doGi: 'Đơn CÓ THẬT trong POS Pancake, có hội thoại thuộc tập AI, đã bỏ đơn huỷ/hoàn. '
      + 'Gồm cả đơn sale chốt hộ hoặc khách tự đặt sau khi chat với bot.',
    khoang: '60 ngày gần nhất',
    nguon: '`src/pancake-orders.js#aiOrderStats` — hỏi thẳng POS',
  },
  HOI_THOAI_CO_DON: {
    ma: 'hoi_thoai_co_don', ten: 'Hội thoại có đơn',
    doGi: 'Số HỘI THOẠI dẫn tới ít nhất một đơn — không phải số đơn.',
    khoang: '60 ngày gần nhất',
    nguon: 'cùng phép quét POS',
  },
});

export class LoiBaoCao extends Error {
  constructor(thongDiep, ma = 'bao_cao', status = 400) {
    super(thongDiep);
    this.name = 'LoiBaoCao';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docDon = null;
let _docChiPhi = null;
let _docHaiLuong = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiBaoCao('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export function datDocDon(fn) { _docDon = fn || null; return _docDon; }
export function datDocChiPhi(fn) { _docChiPhi = fn || null; return _docChiPhi; }
/** `baoCaoHaiLuong` của người A — nguồn DUY NHẤT biết tách hai luồng. */
export function datDocHaiLuong(fn) { _docHaiLuong = fn || null; return _docHaiLuong; }
export const daNoiBaoCao = () => typeof _taoTruyVan === 'function' && typeof _docDon === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiBaoCao('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

export async function manBaoCao(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const cuaTeam = new Map(
    (await truyVan(bc).chon(BANG_PAGE, {}, { sapXep: 'ten' })).map((p) => [String(p.page_id), p]),
  );

  if (!_docDon) {
    return {
      teamId: bc.teamId, messenger: null, trangBanHang: khongCoNguon(), thuoc: THUOC,
      trong: {
        rong: true, vi: 'chua-nap',
        noi: 'Chưa nối cầu sang tiến trình bot nên chưa đọc được đơn hàng.',
        diTiep: 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` rồi khởi động lại v3. '
          + 'Bảng `don_hang` của v3 KHÔNG dùng thay được — nó có 0 dòng.',
      },
    };
  }

  let don;
  try {
    don = await _docDon();
  } catch (e) {
    throw new LoiBaoCao(
      `Không đọc được đơn hàng từ tiến trình bot: ${e?.message || e}. Màn TỪ CHỐI hiện 0 — `
      + '«0 đơn» ở màn báo cáo là câu dễ tin nhất và sai nhất.', 'cau_hong', 502,
    );
  }

  const page = (don.page || [])
    .filter((p) => cuaTeam.has(p.pageId))
    .map((p) => ({
      ...p,
      ten: cuaTeam.get(p.pageId).ten || p.pageId,
      marketer: (cuaTeam.get(p.pageId).marketer || '').trim(),
    }))
    .sort((a, b) => b.posQuyChoAi - a.posQuyChoAi);

  // Con số ① nằm ở gói chi phí (cùng bộ đếm `/stats`). Không đọc được thì để `null`.
  let botTuTao = null;
  if (_docChiPhi) {
    try {
      const cp = await _docChiPhi();
      const cua = (cp.page || []).filter((p) => cuaTeam.has(p.pageId));
      botTuTao = cua.reduce((s, p) => s + (p.soDon || 0), 0);
    } catch { botTuTao = null; }
  }

  const soCu = page.filter((p) => p.soCu);

  return {
    teamId: bc.teamId,
    thuoc: THUOC,
    messenger: {
      botTuTao,
      posQuyChoAi: page.reduce((s, p) => s + p.posQuyChoAi, 0),
      hoiThoaiCoDon: page.reduce((s, p) => s + p.hoiThoaiCoDon, 0),
      page,
      // Số CHƯA ĐỦ thì nói ra — một tổng thiếu trông y hệt một tổng đúng.
      thieu: don.thieu
        ? { co: true, soPageLoi: don.soPageQuetLoi,
            noi: `${don.soPageQuetLoi} page quét POS lỗi — tổng dưới đây là CẬN DƯỚI, không phải số thật.` }
        : { co: false },
      soCu: soCu.length
        ? { so: soCu.length, noi: `${soCu.length} page đang hiện số của LẦN QUÉT TRƯỚC vì lượt này lỗi.` }
        : null,
      quetLuc: don.quetLuc,
    },
    trangBanHang: khongCoNguon(),
    viSaoKhongCong:
      '`01-QUYET-DINH §1` — hai luồng đo bằng HAI THƯỚC khác nhau: trang bán hàng có đơn '
      + 'trước rồi mới hỏi, Messenger thì chốt trong hội thoại. Cộng lại là trả lời sai mọi '
      + 'câu hỏi sau đó. Ba con số của luồng Messenger cũng KHÔNG cộng được với nhau — '
      + 'chúng đo ba chuyện khác nhau, không phải ba phần của một chuyện.',
    trong: page.length ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Không page nào của team có đơn nào trong lượt quét POS.',
      diTiep: 'Bot chưa chạy trên page nào của team, hoặc chưa page nào nối shop POS — '
        + 'xem Cửa kiểm sẵn sàng.',
    },
  };
}

/**
 * Luồng trang bán hàng — chưa có nguồn nào. KHÔNG lấy số Messenger lấp vào: lấp vào là biến
 * một nửa yêu cầu chưa làm được thành một con số trông như đã đo.
 */
function khongCoNguon() {
  return {
    coNguon: false,
    soDon: null,
    vi: 'chua-co-nguon',
    noi: 'Chưa đo được. Bảng `don_hang` của CSDL v3 có 0 dòng, và tiến trình bot chỉ biết '
      + 'luồng Messenger — không nơi nào ghi đơn đến từ trang bán hàng.',
    diTiep: 'Cần nối đường đọc đơn của trang bán hàng vào `don_hang` (cột `nguon = '
      + '"trang_ban_hang"`). Chừng nào chưa có, con số của luồng này là **chưa biết**, '
      + 'không phải 0.',
  };
}
