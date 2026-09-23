// MÀN «BẮT ĐẦU» — tầng dữ liệu. MỎNG CÓ CHỦ Ý.
//
// ═══ VÌ SAO CÓ MÀN NÀY, VÀ VÌ SAO NÓ KHÔNG PHẢI MÀN THỨ TƯ ════════════════════════
// Câu hỏi của chủ dự án (14/09/2026): «với một người tiếp nhận ban đầu, cần làm những gì
// để đủ một con bot chạy?»
//
// Ba màn đã trả lời được TỪNG PHẦN câu đó, và đó chính là vấn đề:
//   · `/san-sang`  nói page THIẾU GÌ và bấm đi đâu sửa — nhưng không có đích đến.
//   · `/page-bot`  có công tắc bật — nhưng nằm trong bảng 50 dòng, cách chỗ chẩn đoán.
//   · `/trang-chu` là màn mở đầu — nhưng là danh sách việc, không phải một lối đi.
// Người mới phải tự nối ba màn ấy lại, và không có gì nói cho họ biết là đã xong.
//
// Màn này KHÔNG thêm dữ liệu mới, KHÔNG thêm từ vựng mới, KHÔNG thêm quyền ghi mới:
//   · số liệu:  `manSanSang()` của `/san-sang` — cùng một lời gọi, cùng một nguồn
//   · câu chữ:  `DIEU_KIEN` của `/san-sang` — cùng «làm gì» và cùng nút «đi đâu»
//   · bật bot:  `POST /api/page-bot/:id/bot` đã có — bảy chốt, nhật ký ai bấm, hộp xác nhận
// Nó chỉ đổi CÁCH BÀY: một page mỗi lần, bốn việc theo thứ tự, và một đích đến.
//
// ⚠️ Thêm một điều kiện mới thì sửa `DIEU_KIEN` ở `san-sang/kho-san-sang.js`, ĐỪNG sửa ở
//    đây. Hai bảng từ vựng cho cùng bảy điều kiện là cách chắc chắn để chúng lệch nhau.

import {
  manSanSang, DIEU_KIEN, MA_DIEU_KIEN, DIEU_KIEN_V3, MA_DIEU_KIEN_V3, DIEU_KIEN_TAT_CA,
} from '../san-sang/kho-san-sang.js';

export class LoiBatDau extends Error {
  constructor(thongDiep, ma = 'bat_dau', status = 400) {
    super(thongDiep);
    this.name = 'LoiBatDau';
    this.ma = ma;
    this.status = status;
  }
}

/** Mã CHẶN — page còn một cái là bản cũ TỪ CHỐI bật AI. Lấy từ `DIEU_KIEN`, không gõ lại. */
export const MA_CHAN = Object.freeze(MA_DIEU_KIEN.filter((m) => DIEU_KIEN[m].chan));
/** Mã NHẮC — bật được, nhưng người bật phải biết mình đang nhận cái gì. */
export const MA_NHAC = Object.freeze(MA_DIEU_KIEN.filter((m) => !DIEU_KIEN[m].chan));

/* ═══ PAGE CHẠY BẢN MỚI CÓ DANH SÁCH ĐIỀU KIỆN RIÊNG (GD1 · 23/09/2026) ════════════════
 * Trước lượt này màn chỉ biết bốn điều kiện của bản CŨ và lọc theo đúng bốn mã đó. Page
 * chạy bản mới vướng `BOTMOI_THIEU_GIA` thì mã ấy không nằm trong danh sách ⇒ rơi ra ngoài,
 * màn hiện «4/4 điều kiện hoàn thành» cho một page bot đang KHÔNG chạy được. Mỗi page phải
 * được chấm bằng danh sách của chính bản bot nó chạy.
 */
export const MA_CHAN_MOI = Object.freeze(MA_DIEU_KIEN_V3.filter((m) => DIEU_KIEN_V3[m].chan));
export const MA_NHAC_MOI = Object.freeze(MA_DIEU_KIEN_V3.filter((m) => !DIEU_KIEN_V3[m].chan));
const maChanCua = (banBot) => (banBot === 'moi' ? MA_CHAN_MOI : MA_CHAN);
const maNhacCua = (banBot) => (banBot === 'moi' ? MA_NHAC_MOI : MA_NHAC);

/**
 * Xếp page theo thứ tự NGƯỜI MỚI NÊN LÀM, không theo tên.
 *
 * Ý: đưa lên đầu những page GẦN XONG NHẤT. Người mới làm xong một page rồi mới có
 * cảm giác việc này làm được; bắt đầu bằng page thiếu cả bốn thứ thì bỏ giữa đường.
 * Thứ tự: đang chạy (để xem lại) → sạch mà chưa bật → còn ít việc → còn nhiều việc.
 */
function thuTuLam(a, b) {
  if (a.dangChay !== b.dangChay) return a.dangChay ? -1 : 1;
  if (a.botKhongThay !== b.botKhongThay) return a.botKhongThay ? 1 : -1;
  if (a.chan.length !== b.chan.length) return a.chan.length - b.chan.length;
  if (a.nhac.length !== b.nhac.length) return a.nhac.length - b.nhac.length;
  return String(a.ten).localeCompare(String(b.ten), 'vi');
}

/**
 * Rút một dòng của `manSanSang` về đúng thứ màn này cần.
 *
 * ⚠️ TÊN TRƯỜNG LẤY TỪ `kho-san-sang.js`, KHÔNG ĐOÁN. Lượt đầu tôi đoán bốn tên và sai cả
 *    bốn (`dangChay` · `thiTruong` · `chan` là mảng MÃ · không biết `botKhongThay`).
 *    Đây đúng cái án lệ «không còn tên cột NÀO do người sau tự đoán».
 *
 * `chan`/`nhac` của nguồn là mảng ĐỐI TƯỢNG `{ ma, chiTiet, chan, la }` — `chiTiet` là câu
 * v1 nói cụ thể (thiếu ĐÚNG thẻ nào), phải giữ: nó là phần người mới cần nhất.
 * `la: true` = mã v1 mới thêm mà bảng từ vựng chưa biết — hiện ra, không nuốt.
 */
function xepMotPage(p) {
  const theoMa = new Map();
  for (const b of [...(p.chan || []), ...(p.nhac || [])]) theoMa.set(b.ma, b);
  // Đọc theo THỨ TỰ của `MA_CHAN`/`MA_NHAC` để bốn việc luôn hiện cùng thứ tự ở mọi page —
  // người mới học được nhịp, không phải đọc lại từ đầu mỗi page.
  const maChan = maChanCua(p.banBot);
  const maNhac = maNhacCua(p.banBot);
  const chan = maChan.filter((m) => theoMa.has(m)).map((m) => theoMa.get(m));
  const nhac = maNhac.filter((m) => theoMa.has(m)).map((m) => theoMa.get(m));
  // Mã v1 trả mà bảng từ vựng chưa biết — dồn vào cuối, KHÔNG bỏ.
  const la = [...theoMa.values()].filter((b) => b.la);

  return {
    // HAI mã, và chúng KHÔNG thay nhau được. `pageId` là mã Facebook — thứ hiện cho người
    // đọc và dùng làm khoá chọn page trên màn. `id` là khoá dòng trong CSDL v3 — thứ cửa
    // `POST /api/page-bot/:id/bot` tra (`kho-page.js#motPage` tìm theo `page.id`). Lượt đầu
    // màn này gửi `pageId` vào cửa ấy nên nút «Bật bot» 404 — lối vào của người mới, và là
    // lối duy nhất màn này có việc để làm.
    id: String(p.id || ''),
    pageId: String(p.pageId || ''),
    banBot: p.banBot === 'moi' ? 'moi' : 'cu',
    // Danh sách điều kiện PHẢI ĐẠT của chính page này — màn đếm «x/y xong» theo danh sách
    // này, không theo một danh sách chung cho cả hai bản bot.
    maChan,
    maNhac,
    ten: p.ten || String(p.pageId || ''),
    marketer: p.marketer || '',
    // SỰ THẬT là `botTheoBot` (RAM tiến trình bot), không phải cột bản sao của CSDL v3.
    dangChay: p.botTheoBot === true,
    lechBanSao: p.botTheoBot != null && p.botTheoBot !== p.botTheoCsdl,
    // Trạng thái THỨ BA: bot không thấy page này. Không phải «sẵn sàng», là «không biết».
    botKhongThay: !!p.botKhongThay,
    batDuoc: p.batDuoc === true,
    chan,
    nhac,
    la,
  };
}

/**
 * Dữ liệu của màn. Trả LUÔN cả bảng từ vựng để trang không phải gõ lại câu nào.
 *
 * `trong` đi nguyên từ `manSanSang`: nếu cầu sang tiến trình bot chưa nối thì màn này
 * phải nói ĐÚNG câu ấy, không được hiện «0 page» như thể đã đọc được và thấy trống.
 */
export async function manBatDau(boiCanh) {
  const m = await manSanSang(boiCanh);
  const ds = Array.isArray(m.page) ? m.page.map(xepMotPage) : [];
  ds.sort(thuTuLam);

  const dem = {
    tong: ds.length,
    dangChay: ds.filter((p) => p.dangChay).length,
    sanChuaBat: ds.filter((p) => p.batDuoc && !p.dangChay && !p.botKhongThay).length,
    conViec: ds.filter((p) => !p.batDuoc && !p.botKhongThay).length,
    botKhongThay: ds.filter((p) => p.botKhongThay).length,
    lechBanSao: ds.filter((p) => p.lechBanSao).length,
  };

  return {
    teamId: m.teamId,
    page: ds,
    dem,
    dieuKien: DIEU_KIEN_TAT_CA,
    // Giữ cho tương thích: danh sách của bản CŨ. Màn đọc `p.maChan` của từng page.
    maChan: MA_CHAN,
    maNhac: MA_NHAC,
    trong: m.trong || null,
  };
}
