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
import { motPage, cuaKiemMotPage, danhMucGoc, LoiPageBot } from '../page-bot/kho-page.js';
import { trangThaiCau, trangThaiCauDaoGiao } from '../page-bot/cong-tac.js';
import { DIEU_KIEN_TAT_CA } from '../san-sang/kho-san-sang.js';

// `DUONG_TRANG` và `VAI_VAO_DUOC` khai ở `router.js` — đúng nếp của mọi màn khác, và thước
// ①b («mọi đường trong menu trỏ tới màn có thật») đọc thẳng chữ trong tệp router.

/* ─────────────────────── cổng tiêm: hai khối nội dung của page ───────────────────────
 *
 * CÙNG bộ đọc với màn «Đoạn chữ gửi cho AI» (`docKhoi.sanPham` · `docKhoi.kichBan`) — tức
 * cùng bộ mà đường ráp prompt của bot dùng. Dựng bộ đọc thứ hai ở đây là hẹn ngày màn khoe
 * một bản kịch bản khác cái bot đang gửi.
 */
let _docKhoi = null;
export function datDocKhoi(bo) {
  if (bo == null) { _docKhoi = null; return null; }
  for (const t of ['sanPham', 'kichBan']) {
    if (typeof bo[t] !== 'function') throw new LoiMotPage(`datDocKhoi: thiếu hàm \`${t}\`.`);
  }
  // `sua` không bắt buộc: thiếu thì tab sản phẩm CHỈ ĐỌC và nói ra, chứ không im lặng
  // hiện một danh sách không bấm được.
  _docKhoi = bo;
  return _docKhoi;
}
export const daNoiDocKhoi = () => !!_docKhoi;

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

  // ⚠️ BA CẢNH, KHÔNG PHẢI HAI (sửa 25/09 sau lượt thử A→Z):
  //    ① cầu hỏng / chưa nối  ⇒ chưa đo được, và đó là việc của người quản trị hệ thống;
  //    ② cầu ĐỌC ĐƯỢC nhưng KHÔNG thấy page này ⇒ đây là một câu trả lời THẬT: tiến trình
  //       bot không biết page ấy (chưa quét về, hoặc token không phủ). Người dùng làm được;
  //    ③ đọc được và thấy ⇒ có danh sách điều kiện.
  //    Gộp ① và ② vào một câu «chưa đọc được» là đẩy người ta đi hỏi người quản trị một việc
  //    họ tự sửa được. Đo được ở lượt thử A→Z: page vừa tạo rơi vào ②, màn nói như ①.
  const botKhongThay = !doc && !viSaoKhongDoc;
  const chuaDoDuoc = !doc && !!viSaoKhongDoc;
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
      botKhongThay,
      viSaoKhongDoc,
      chan,
      nhac,
      // «Sẵn sàng» CHỈ khi ĐỌC ĐƯỢC, THẤY page, và không còn chặn. Hai cảnh kia không kết luận.
      san: !chuaDoDuoc && !botKhongThay && chan.length === 0,
    },
    // NHỮNG THỨ SỬA ĐƯỢC NGAY TẠI ĐÂY. Trước lượt này chúng nằm rải trong bảng danh sách —
    // sửa thị trường của một page phải đi tìm đúng dòng trong 514 dòng.
    thietLap: {
      thiTruong: p.thiTruong,
      nganhHang: p.nganhHang,
      sanPhamGocMa: p.sanPhamGocMa,
      trongDiem: p.trongDiem,
      botcakeTat: p.botcakeTat,
      danhMucGoc: await danhMucGoc(bc),
    },
    // Hai việc còn lại là CÔNG CỤ RIÊNG, không nhét vào trang page được: chạy thử là một
    // phiên đo có dữ liệu riêng, đoạn chữ gửi AI là màn chẩn đoán bốn khối. Giữ đường dẫn,
    // mang sẵn page.
    diTiep: [
      { chu: 'Chạy thử, chưa gửi ai', duong: `/van-hanh-v3?tab=dien-tap&page=${encodeURIComponent(p.pageId)}` },
      { chu: 'Đoạn chữ gửi cho AI', duong: `/prompt-page?page=${encodeURIComponent(p.pageId)}` },
    ],
    cuaBot,
  };
}

export { LoiPageBot };


/**
 * HAI KHỐI NỘI DUNG của page — sản phẩm kèm giá, và kịch bản đang chạy.
 *
 * Tách khỏi `trangMotPage` vì chúng nặng hơn hẳn: chỉ đọc khi người ta mở đúng tab ấy.
 * CHỈ ĐỌC — sửa vẫn ở màn chuyên của nó, và màn này nói thẳng điều đó.
 */
export async function noiDungPage(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const p = await motPage(bc, id);
  if (!p) return null;
  if (!_docKhoi) {
    // Chưa nối ≠ page không có gì. Nói ra, và nói rõ đó là lỗi dựng ứng dụng.
    return { chuaNoi: true, viSao: 'Máy chủ chưa nối bộ đọc sản phẩm và kịch bản của page.' };
  }
  const [sanPham, kichBan] = await Promise.all([
    Promise.resolve(_docKhoi.sanPham(bc.teamId, p.id)).catch((e) => ({ loi: String(e?.message || e) })),
    Promise.resolve(_docKhoi.kichBan(bc.teamId, p.id)).catch((e) => ({ loi: String(e?.message || e) })),
  ]);
  // BẢN SỬA ĐƯỢC lấy THEO ĐÚNG những sản phẩm bộ đọc của bot vừa trả về — một luật cho câu
  // «page này bán gì», và bản sửa chỉ đi lấy thêm `version` cùng đủ bậc giá (kể cả bậc TẮT:
  // thiếu chúng thì lượt lưu kế tiếp xoá mất, vì cửa ghi thay trọn danh sách).
  let sanPhamSua = null;
  if (typeof _docKhoi.sua === 'function' && Array.isArray(sanPham)) {
    sanPhamSua = await Promise.resolve(_docKhoi.sua(bc, sanPham.map((x) => x.id)))
      .catch((e) => ({ loi: String(e?.message || e) }));
  }
  return { chuaNoi: false, sanPham, kichBan, sanPhamSua };
}
