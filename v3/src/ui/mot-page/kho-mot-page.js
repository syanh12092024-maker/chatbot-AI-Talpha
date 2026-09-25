// TRANG CỦA MỘT PAGE — «page này là gì, bot có trả lời nó không, còn thiếu gì để lên chạy».
//
// ═══ VÌ SAO CÓ MÀN NÀY (GD2 · 25/09/2026) ══════════════════════════════════════════════
// Hôm nay muốn biết một page đang ở đâu thì phải ghé BA màn: «Bắt đầu» (điều kiện), «Công
// tắc từng page» (bật/tắt, người phụ trách), «Page còn thiếu gì» (cũng điều kiện, cắt khác).
// Đo 22/09: 7 màn · 11 bước để cài xong một page. Ba màn ấy hỏi cùng một câu hỏi bằng ba
// cách, và không màn nào trả lời trọn.
//
// Màn này gom về MỘT chỗ cho MỘT page. Ba màn kia không bị xoá — chúng chuyển hướng về
// danh sách page (luật «không đổi đường dẫn nào; đường cũ nào gộp đi thì chuyển hướng»).
//
// ═══ KHÔNG THÊM MỘT CỬA GHI NÀO ════════════════════════════════════════════════════════
// Màn này CHỈ ĐỌC. Bật/tắt bot vẫn bấm qua `POST /api/page-bot/:id/bot`, giao page vẫn qua
// `POST /api/page-bot/:id/giao` — cùng hai cửa đã có bảy chốt và nhật ký. Tiêu chí của phiếu
// là «còn đúng MỘT cửa ghi bật bot»; dựng thêm cửa thứ hai ở đây là tự phá tiêu chí của mình.
//
// ═══ MỘT NGUỒN CHO MỖI CÂU HỎI ═════════════════════════════════════════════════════════
// Thông tin page ← `page-bot/kho-page.js#motPage` (cùng bộ đọc với bảng danh sách).
// Điều kiện     ← `page-bot/kho-page.js#cuaKiemMotPage` + bảng từ vựng `DIEU_KIEN_TAT_CA`
//                 của màn «Page còn thiếu gì». Không dựng bảng từ vựng thứ hai: hai bảng là
//                 hai luật, và luật thứ hai luôn là luật quên cập nhật.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { motPage, cuaKiemMotPage, LoiPageBot } from '../page-bot/kho-page.js';
import { trangThaiCau, trangThaiCauDaoGiao } from '../page-bot/cong-tac.js';
import { DIEU_KIEN_TAT_CA } from '../san-sang/kho-san-sang.js';

// `DUONG_TRANG` và `VAI_VAO_DUOC` khai ở `router.js` — đúng nếp của mọi màn khác, và thước
// ①b («mọi đường trong menu trỏ tới màn có thật») đọc thẳng chữ trong tệp router.

export class LoiMotPage extends Error {
  constructor(thongDiep, ma = 'mot_page', status = 400) {
    super(thongDiep);
    this.name = 'LoiMotPage';
    this.ma = ma;
    this.status = status;
  }
}

/**
 * Một điều kiện, đã tra bảng từ vựng.
 *
 * ⚠️ Mã lạ KHÔNG bị nuốt: bên bot thêm một bậc thang mới mà bảng từ vựng chưa biết thì nó
 *    vẫn hiện ra, gắn nhãn «chưa có trong bảng từ». Nuốt đi là làm một lý do page không chạy
 *    được biến mất khỏi màn — đúng bệnh mà cả nhóm màn này sinh ra để chữa.
 */
function doDieuKien(b, laChan) {
  const ma = String(b?.code || '');
  const dk = DIEU_KIEN_TAT_CA[ma] || null;
  return {
    ma,
    nhan: dk?.nhan || ma,
    ten: dk?.ten || ma,
    lam: dk?.lam || '',
    di: dk?.di || null,
    nutDi: dk?.nutDi || null,
    chiTiet: String(b?.detail || ''),
    chan: dk ? dk.chan : !!laChan,
    la: !dk,
  };
}

/**
 * Câu «đi sửa ở đâu» của điều kiện «chưa nằm trong danh sách bản mới» ĐỔI THEO CẦU DAO.
 *
 * Bảng từ vựng viết câu ấy hồi việc giao page còn phải SSH vào máy chủ. Từ 024, khi cầu dao
 * `V3_GIAO_PAGE_TREN_MAN` mở thì việc ấy là một cái nút ngay trên màn này. Để nguyên câu cũ
 * là bảo người ta đi nhờ người quản trị hệ thống một việc họ tự bấm được — án lệ #27: sửa
 * luật thì phải sửa cả chỗ khai luật.
 */
function vaCauDao(dk, cauDao) {
  if (dk.ma !== 'BOTMOI_NGOAI_DANH_SACH' || !cauDao.mo) return dk;
  return {
    ...dk,
    lam: 'Page này chưa được giao cho bot mới. Bấm «Giao sang bot mới» ở ngay khối trên — '
      + 'bot cũ sẽ được tắt trước, và chỉ khi nó xác nhận đã tắt thì page mới đổi chủ.',
    di: null,
    nutDi: null,
  };
}

/**
 * Trang của một page.
 *
 * @returns {Promise<object|null>} `null` khi page không thuộc team đang mở — nơi gọi trả
 *   **404**, không phải 403: 403 là lời xác nhận «dòng này có thật ở team khác».
 */
export async function trangMotPage(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const p = await motPage(bc, id);
  if (!p) return null;

  const cauDao = trangThaiCauDaoGiao();
  const cuaBot = trangThaiCau();

  let doc = null;
  let viSaoKhongDoc = null;
  try {
    const r = await cuaKiemMotPage(p.pageId);
    doc = r.doc;
    viSaoKhongDoc = r.viSao;
  } catch (e) {
    viSaoKhongDoc = `Cầu sang tiến trình bot lỗi: ${e?.message || e}`;
  }

  // ⚠️ KHÔNG ĐỌC ĐƯỢC ≠ KHÔNG THIẾU GÌ. Hai câu ấy dẫn người đọc đi hai hướng ngược nhau,
  //    và câu thứ hai là câu khiến người ta bật bot cho một page chưa sẵn sàng.
  const chuaDoDuoc = !doc;
  const chan = (doc?.blockers || []).map((b) => vaCauDao(doDieuKien(b, true), cauDao));
  const nhac = (doc?.warnings || []).map((b) => vaCauDao(doDieuKien(b, false), cauDao));

  return {
    page: {
      id: p.id,
      pageId: p.pageId,
      ten: p.ten || p.pageId,
      thiTruong: p.thiTruong,
      nganhHang: p.nganhHang,
      marketer: p.marketer,
      sanPhamGocMa: p.sanPhamGocMa,
      matDau: p.matDau,
    },
    // BOT NÀO PHỤ TRÁCH — và đổi được ngay tại đây khi cầu dao mở.
    chuBot: {
      la: doc?.runtime === 'v3' || p.giaoBotMoi ? 'moi' : 'cu',
      giaoBotMoi: p.giaoBotMoi,
      cauDao,
    },
    // HAI CON SỐ, GIỮ CẢ HAI. `theoBot` là sự thật (RAM tiến trình bot), `theoCsdl` là cột
    // bản sao — đã có lần lệch 50. Gộp một là mất khả năng phát hiện lệch.
    bot: {
      theoBot: doc ? !!doc.aiEnabled : null,
      theoCsdl: p.botAiBat,
      lech: doc ? !!doc.aiEnabled !== p.botAiBat : null,
      batDuoc: doc ? !!doc.aiAllowed : null,
      trangThai: doc?.readiness || null,
    },
    tinhTrang: {
      chuaDoDuoc,
      viSaoKhongDoc,
      chan,
      nhac,
      // «Sẵn sàng» CHỈ khi đo được và không còn chặn. Chưa đo được thì không kết luận.
      san: !chuaDoDuoc && chan.length === 0,
    },
    // Bốn việc thường làm tiếp với một page. Mỗi đường dẫn mang sẵn page để màn kia lọc —
    // người dùng không phải tìm lại page mình vừa đứng.
    diTiep: [
      { chu: 'Sản phẩm & giá của page', duong: `/san-pham?page=${encodeURIComponent(p.pageId)}` },
      { chu: 'Kịch bản của page', duong: `/kich-ban?page=${encodeURIComponent(p.pageId)}` },
      { chu: 'Chạy thử, chưa gửi ai', duong: `/van-hanh-v3?tab=dien-tap&page=${encodeURIComponent(p.pageId)}` },
      { chu: 'Đoạn chữ gửi cho AI', duong: `/prompt-page?page=${encodeURIComponent(p.pageId)}` },
    ],
    cuaBot,
  };
}

export { LoiPageBot };
