// TẦNG ĐỌC CỦA MÀN «CỬA KIỂM SẴN SÀNG» (G2-F5, sóng 4).
//
// Yêu cầu nguyên văn (`03-MAN-HINH.md` dòng 65): *«Sáu điều kiện, bấm ô đỏ nhảy thẳng tới
// chỗ sửa»*. Cả hai vế nằm ở `DIEU_KIEN` dưới đây: mỗi bậc có `ten` (điều kiện) và `di` (chỗ nhảy).
//
// ⚠️ TÀI LIỆU NÓI **SÁU**, MÃ NGUỒN CÓ **BẢY**. `LADDER` ở `src/readiness.js` có 8 khoá, trong
//    đó `READY` là kết quả chứ không phải điều kiện ⇒ còn 7 điều kiện thật:
//    NO_TOKEN · MISSING_TAGS · MISSING_PRODUCT · MISSING_SCRIPT · MISSING_POS · THIN_SCRIPT ·
//    SCRIPT_STALE. Màn hiện đủ BẢY, vì thứ chặn bot là mã nguồn chứ không phải tài liệu. Bỏ
//    một bậc cho khớp con số trong tài liệu là giấu đi một lý do page không chạy được.
//
// ═══ MÀN NÀY KHÔNG TỰ TÍNH LẠI SÁU ĐIỀU KIỆN ═══════════════════════════════════════════
// `src/readiness.js` (273 dòng) đã tính, đã chạy thật nhiều tháng, và nó là cái CHẶN việc
// bật AI ở v1. Tính lại ở v3 nghĩa là có hai cái thang: màn báo xanh còn cửa v1 vẫn chặn,
// hoặc ngược lại. Nên màn đi qua cầu HTTP đọc kết quả của chính nó.
//
// KHÔNG `import 'src/readiness.js'`: nó kéo theo `kb.js` · `page-registry.js` · `pancake.js`
// · `store.js` · `stats.js` · `wa.js` — đọc file, giữ trạng thái, và nối cả WhatsApp. Nạp
// chuỗi đó vào tiến trình v3 là dựng một bản thứ hai của nửa con bot.
//
// ═══ BẢNG MÃ CHÉP TAY, VÀ ĐƯỢC KHOÁ BẰNG BÀI TEST ═════════════════════════════════════
// Vì không nhập được `LADDER`, tám mã dưới đây là chép tay — đúng cái kiểu «gõ hai lần» đã
// từng làm cả hệ mất vai (`quan_tri` vs `quan-tri`). Nên `v3/test/b/san-sang.test.mjs` ĐỌC
// THẲNG `src/readiness.js` và so từng mã. Thêm/bớt một bậc thang bên v1 → bài test đỏ.
//
// ═══ LỌC THEO TEAM LÀ VIỆC CỦA TẦNG NÀY ═══════════════════════════════════════════════
// Cầu trả về TOÀN HỆ (676 page hôm 25/08) vì v1 không biết team. Ở đây giao với danh sách
// page của team rồi mới trả ra. Không lọc ở trình duyệt: lọc ở trình duyệt nghĩa là dữ liệu
// team khác đã đi qua dây mạng rồi.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG = 'page';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/**
 * BẢY ĐIỀU KIỆN + `READY` = tám bậc thang của `LADDER` bên v1, chép đúng thứ tự.
 * `chan: true` nghĩa là AI KHÔNG được bật. `chan: false` chỉ là nhắc.
 *
 * `di` = bấm ô đỏ thì nhảy đi đâu. `null` nghĩa là **chưa có màn nào sửa được** — và khi đó
 * `lam` phải nói người ta làm gì thay thế. Một ô đỏ không bấm được mà cũng không nói phải
 * làm sao là đúng cái lỗi 24/08: người ta ngồi nhìn một màn không biết nó hỏng hay đã xong.
 */
// ⚠️ HAI TÊN cho mỗi điều kiện, có chủ ý (thêm 14/09/2026):
//   · `ten`  — viết như LỖI («Không token nào phủ page»). Đúng ở màn này, vì màn này CHỈ hiện
//              điều kiện khi nó hỏng.
//   · `nhan` — tên TRUNG TÍNH («Token Pancake»). Dùng khi hiện CẢ điều kiện ĐÃ ĐẠT.
// Đo trên ảnh chụp màn «Bắt đầu»: dùng `ten` cho điều kiện đã đạt ra câu «✓ Xong · Không token
// nào phủ page» — tức «Đã xong: không có token», tự mâu thuẫn. Mục M4 của bản đặc tả dùng
// danh từ trung tính. Hai tên ở CÙNG một chỗ, nên vẫn là một bảng từ vựng — không lệch được.
export const DIEU_KIEN = Object.freeze({
  NO_TOKEN: {
    chan: true, nhan: 'Tài khoản Pancake', ten: 'Chưa có tài khoản Pancake nào phủ page này',
    di: '/ket-noi', nutDi: 'Mở màn Kết nối',
    lam: 'Đây là đường bot đọc tin khách và gửi câu trả lời. Thêm một tài khoản Pancake có quyền '
      + 'trên page này, hoặc thay tài khoản đã hết hạn.',
  },
  MISSING_TAGS: {
    chan: true, nhan: 'Thẻ hội thoại', ten: 'Thiếu thẻ Pancake',
    di: null, nutDi: null,
    lam: 'Thẻ hội thoại nằm bên Pancake, màn này chưa sửa được. Vào Pancake → cài đặt page → '
      + 'thẻ hội thoại, tạo đủ các thẻ còn thiếu ghi ở cột bên phải, rồi mở lại màn này.',
  },
  MISSING_PRODUCT: {
    chan: true, nhan: 'Sản phẩm và giá', ten: 'Chưa có sản phẩm nào kèm giá bán',
    di: '/san-pham', nutDi: 'Xem sản phẩm của page',
    lam: 'Page chạy bot cũ lấy sản phẩm và giá từ Google Sheet của page. Điền sản phẩm vào Sheet, '
      + 'rồi mở màn «Sản phẩm & kho» để xem bot đã đọc được chưa.',
  },
  MISSING_SCRIPT: {
    chan: true, nhan: 'Kịch bản bán hàng', ten: 'Thiếu kịch bản bán',
    di: '/kich-ban', nutDi: 'Soạn kịch bản',
    lam: 'Page chưa có câu chào hoặc chưa có cách bán, nên bot không biết mở lời thế nào. Soạn một '
      + 'bản rồi cho chạy.',
  },
  MISSING_POS: {
    chan: false, nhan: 'Kết nối kho hàng', ten: 'Chưa nối kho hàng của thị trường này',
    // ⚠️ 24/09: nút cũ dẫn sang «Người và team» — màn đó CHỈ ĐỌC danh sách kết nối từ 15/09,
    //    bấm vào không sửa được gì. Chỗ sửa thật là màn «Kết nối & token».
    di: '/ket-noi', nutDi: 'Nối kho hàng',
    lam: 'Bot vẫn tư vấn và chốt được, chỉ là đơn chốt xong không đẩy sang kho hàng được, nên phải '
      + 'nhập tay. Nối shop của thị trường này ở màn Kết nối.',
  },
  THIN_SCRIPT: {
    chan: false, nhan: 'Kịch bản đủ chi tiết', ten: 'Kịch bản mỏng',
    di: '/kich-ban', nutDi: 'Bổ sung kịch bản',
    lam: 'Kịch bản thiếu giọng điệu, hoặc phần cách bán quá ngắn. Bot vẫn chạy nhưng câu trả lời '
      + 'sẽ chung chung, khách hỏi sâu là hụt.',
  },
  SCRIPT_STALE: {
    chan: false, nhan: 'Kịch bản còn hiệu quả', ten: 'Kịch bản cũ, chốt kém',
    di: '/kich-ban', nutDi: 'Xem lại kịch bản',
    lam: 'Kịch bản lâu không sửa VÀ tỉ lệ chốt đang dưới 1%. Kịch bản cũ mà vẫn ra đơn đều thì hệ '
      + 'không nhắc — dòng này chỉ hiện khi cả hai điều cùng đúng.',
  },
  READY: {
    chan: false, nhan: 'Đủ điều kiện', ten: 'Đủ điều kiện',
    di: null, nutDi: null, lam: '',
  },
});

/** Bảy bậc THẬT SỰ là điều kiện — `READY` là kết quả, không phải điều kiện. */
export const MA_DIEU_KIEN = Object.freeze(Object.keys(DIEU_KIEN).filter((m) => m !== 'READY'));

/* ═══ ĐIỀU KIỆN CỦA PAGE CHẠY BẰNG BẢN MỚI (GD1 · 23/09/2026) ═══════════════════════════
 *
 * Page của hệ chia làm hai: chạy bằng BẢN CŨ (tiến trình bot v1, bậc thang `LADDER` ở trên)
 * hoặc bằng BẢN MỚI (`pageStatus` của `src/admin-v3/operations.js`). Hai bên tính điều kiện
 * bằng hai bộ luật khác nhau — đó là sự thật của hệ, không phải lỗi.
 *
 * Lỗi là ở CÁCH CHỞ: bản mới trả điều kiện dưới dạng CÂU CHỮ tự do, cầu nối nhét nguyên câu
 * vào ô `code`, nên mọi màn tra bảng từ vựng đều trượt và hiện ra «mã lạ» — một ô đỏ không
 * tên, không nút sửa. Đo 22/09 trên bản dev: page duy nhất đang chạy hiện «Chỉ kiểm tra cấu
 * hình V3 (mã lạ)» ở màn Page còn thiếu gì, và màn Bắt đầu báo «Bot trả về điều kiện màn này
 * chưa biết».
 *
 * Nên bảng này đặt TÊN cho từng điều kiện của bản mới, đúng khuôn với bảng của bản cũ: có
 * `nhan` trung tính, có `chan` hay chỉ nhắc, có `lam` (làm gì) và `di` (bấm đi đâu).
 *
 * ⚠️ CHÉP TAY — và được khoá bằng bài test. `v3/test/b/gd1-mot-nguon.test.mjs` đọc thẳng
 *    `src/admin-v3/operations.js`, bóc mọi câu `blockers.push("…")` ra và đòi mỗi câu phải
 *    có một mã ở đây. Bên kia thêm một điều kiện mà quên khai → bài test đỏ, không phải đợi
 *    người dùng gặp một ô đỏ không tên.
 */
export const DIEU_KIEN_V3 = Object.freeze({
  BOTMOI_NGOAI_DANH_SACH: {
    chan: true, nhan: 'Page được phép chạy bản mới', ten: 'Chưa nằm trong danh sách bản mới',
    di: null, nutDi: null,
    lam: 'Danh sách này nằm ở cấu hình máy chủ, màn chưa sửa được. Nhờ người quản trị hệ thống '
      + 'thêm page rồi khởi động lại dịch vụ.',
  },
  BOTMOI_CHUA_MO_GUI: {
    chan: true, nhan: 'Cửa gửi tin cho khách', ten: 'Máy chủ chưa mở cửa gửi tin',
    di: null, nutDi: null,
    lam: 'Máy chủ đang ở chế độ chỉ đọc: bot nghĩ ra câu trả lời nhưng không gửi cho khách. '
      + 'Nhờ người quản trị hệ thống mở cửa gửi.',
  },
  BOTMOI_CHUA_RAP_LOI: {
    chan: true, nhan: 'Cách ghép lời cho bot', ten: 'Máy chủ chưa bật cách ghép lời mới',
    di: null, nutDi: null,
    lam: 'Chưa bật thì bot không đọc được kịch bản và giá của page. Nhờ người quản trị hệ thống bật.',
  },
  BOTMOI_THIEU_SAN_PHAM: {
    chan: true, nhan: 'Sản phẩm của page', ten: 'Page chưa có sản phẩm nào',
    di: '/page-bot', nutDi: 'Gán sản phẩm gốc',
    lam: 'Page chưa gắn sản phẩm gốc, hoặc kho chưa kéo sản phẩm của shop này về.',
  },
  BOTMOI_THIEU_GIA: {
    chan: true, nhan: 'Giá bán', ten: 'Chưa có gói giá hợp lệ',
    di: '/van-hanh-v3', nutDi: 'Nhập giá bán',
    lam: 'Sản phẩm có rồi nhưng chưa ai đặt giá bán. Bot không được tự chế giá, nên chưa chào được.',
  },
  BOTMOI_THIEU_MODEL: {
    chan: true, nhan: 'Model AI và khoá', ten: 'Chưa chọn model hoặc chưa dán khoá',
    di: '/model-ai', nutDi: 'Mở màn Model AI',
    lam: 'Chọn model chính rồi dán khoá của nhà đó. Chưa có khoá thì bot không gọi được model nào.',
  },
  BOTMOI_MODEL_HONG: {
    // Tên phải KHÁC `BOTMOI_THIEU_MODEL`: hai dòng cùng tên trên một màn trông như màn hỏng,
    // và người đọc không biết mình đang phải sửa cái nào (đo trên ảnh chụp 23/09).
    chan: true, nhan: 'Cấu hình model đọc lên bị lỗi', ten: 'Đọc cấu hình model không được',
    di: '/model-ai', nutDi: 'Mở màn Model AI',
    lam: 'Cấu hình model của team đọc lên bị lỗi. Mở màn Model AI, chọn lại model và lưu.',
  },
  // ── Hai mã NHẮC: không chặn, nhưng người bật bot phải biết mình đang nhận cái gì ──
  BOTMOI_DIEN_TAP: {
    chan: false, nhan: 'Đang chạy thử', ten: 'Đang chạy thử, không gửi cho khách',
    di: null, nutDi: null,
    lam: 'Bot đọc tin thật, soạn câu trả lời và ghi sổ, nhưng KHÔNG gửi đi. Đây là cấu hình cố ý.',
  },
  BOTMOI_CHUA_DO_MAY_CHAY_BOT: {
    chan: false, nhan: 'Máy chạy bot', ten: 'Chưa đo máy chạy bot',
    di: '/suc-khoe', nutDi: 'Xem hệ còn sống không',
    lam: 'Các điều kiện trên mới kiểm CẤU HÌNH. Chưa ai xác nhận máy chạy bot còn sống và kết nối '
      + 'ra ngoài còn tốt.',
  },
});

export const MA_DIEU_KIEN_V3 = Object.freeze(Object.keys(DIEU_KIEN_V3));

/**
 * MỘT bảng từ vựng cho cả hai bản bot — thứ mọi màn tra theo mã.
 *
 * Giữ `DIEU_KIEN` riêng (chỉ bản cũ) vì bài test `san-sang` khoá nó vào `LADDER` của v1:
 * thêm mã của bản mới vào đó là làm hỏng chính cái khoá ấy.
 */
export const DIEU_KIEN_TAT_CA = Object.freeze({ ...DIEU_KIEN, ...DIEU_KIEN_V3 });

export class LoiSanSang extends Error {
  constructor(thongDiep, ma = 'san_sang', status = 400) {
    super(thongDiep);
    this.name = 'LoiSanSang';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docSanSang = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanSang('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}
export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanSang('datDocSanSang cần một hàm');
  _docSanSang = fn || null;
  return _docSanSang;
}
export const daNoiSanSang = () => typeof _taoTruyVan === 'function' && typeof _docSanSang === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiSanSang('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── đọc ─────────────────────────── */

export async function manSanSang(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const d = truyVan(bc);

  // Page của TEAM — điều kiện team do tầng truy vấn tự chèn, không phải bộ lọc ở đây.
  const pageTeam = await d.chon(BANG, {}, { sapXep: 'ten' });

  if (!_docSanSang) {
    // Rỗng vì CHƯA CÀI ĐẶT XONG — nói thẳng, và chỉ đường đi tiếp.
    return {
      teamId: bc.teamId, page: [], dem: demRong(), lech: null, dieuKien: DIEU_KIEN_TAT_CA,
      trong: {
        rong: true, vi: 'chua-cai-dat',
        noi: 'Chưa nối cầu sang tiến trình bot, nên chưa đọc được sáu điều kiện của page nào.',
        diTiep: 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` trong `.env` rồi khởi động lại v3. '
          + 'Xem trạng thái cầu ở màn Sức khoẻ hệ thống.',
      },
    };
  }

  let toanHe;
  try {
    toanHe = await _docSanSang();
  } catch (e) {
    // Cầu hỏng ≠ mọi page sẵn sàng. Ném ra, đừng trả danh sách rỗng: một danh sách rỗng
    // trông y hệt «không page nào có vấn đề», và đó là kết luận ngược hẳn sự thật.
    throw new LoiSanSang(
      `Không đọc được cửa kiểm từ tiến trình bot: ${e?.message || e}. Màn TỪ CHỐI đoán — `
      + 'một bảng rỗng ở đây trông y như «mọi page đều ổn».',
      'cau_hong', 502,
    );
  }

  const theoId = new Map((toanHe.pages || []).map((p) => [String(p.pageId), p]));

  const page = pageTeam.map((p) => {
    const r = theoId.get(String(p.page_id)) || null;
    const chan = (r?.blockers || []).map((b) => nhan(b, true));
    const nhac = (r?.warnings || []).map((b) => nhac_(b));
    return {
      id: String(p.id),
      pageId: String(p.page_id),
      ten: p.ten || String(p.page_id),
      marketer: (p.marketer || '').trim(),
      // BẢN BOT ĐANG CHẠY PAGE NÀY — `cu` (tiến trình bot v1) hay `moi` (đường v3).
      // Không có nó thì hai bộ điều kiện khác nhau nằm lẫn trong một bảng mà không ai biết
      // dòng nào tính bằng luật nào; người dùng đọc «thiếu sản phẩm» ở hai dòng rồi đi sửa
      // cùng một chỗ, mà thật ra hai dòng ấy đo hai thứ khác nhau.
      banBot: r?.runtime === 'v3' ? 'moi' : 'cu',
      // ⚠️ HAI CON SỐ, CỐ Ý GIỮ CẢ HAI. `botTheoBot` là sự thật (RAM của tiến trình bot),
      //    `botTheoCsdl` là cột bản sao trong CSDL v3. Gộp một là mất khả năng phát hiện lệch.
      botTheoBot: r ? !!r.aiEnabled : null,
      botTheoCsdl: p.bot_ai_bat === true,
      batDuoc: r ? !!r.aiAllowed : null,
      trangThai: r?.readiness || null,
      chan,
      nhac,
      soToken: r?.tokens ?? null,
      thieu: r?.missing || [],
      // Page có trong CSDL v3 mà bot không thấy — không phải «sẵn sàng», là «không biết».
      botKhongThay: !r,
    };
  });

  return {
    teamId: bc.teamId,
    page,
    dem: dem(page),
    lech: lech(page),
    dieuKien: DIEU_KIEN_TAT_CA,
    toanHe: toanHe.toanHe || null,
    trong: page.length ? null : {
      rong: true, vi: 'chua-cai-dat',
      noi: 'Team này chưa có page nào.',
      diTiep: 'Gán page cho team ở màn Cấu hình team → mục «Page của team».',
    },
  };
}

const demRong = () => ({
  tong: 0, chan: 0, nhac: 0, san: 0, batDuoc: 0,
  botKhongThay: 0, dangChay: 0, chayMaBiChan: 0,
});

function dem(page) {
  const k = demRong();
  k.tong = page.length;
  for (const p of page) {
    if (p.botKhongThay) { k.botKhongThay += 1; continue; }
    if (p.chan.length) k.chan += 1;
    else if (p.nhac.length) k.nhac += 1;
    else k.san += 1;

    // ⚠️ CON SỐ NGƯỜI DÙNG THẬT SỰ CẦN: bao nhiêu page BẬT ĐƯỢC NGAY.
    //
    // `san` (sạch hoàn toàn) và `nhac` (chỉ vướng cảnh báo) đều bật được — cảnh báo KHÔNG
    // chặn. Nhưng bản đầu của màn chỉ hiện hai ô đó tách rời, và chủ dự án đọc «đủ điều kiện
    // = 1» rồi tưởng cả team chỉ bật được một page. Thật ra là 69.
    //
    // Người ta tới màn này để hỏi «tôi bật được page nào», không phải «page nào sạch nhất».
    // Bắt họ tự cộng hai ô là bắt họ tự trả lời câu hỏi mà màn sinh ra để trả lời.
    if (!p.chan.length) k.batDuoc += 1;
    if (p.botTheoBot) {
      k.dangChay += 1;
      // Page đang chạy MÀ vẫn có điều kiện chặn — hàng nguy hiểm nhất bảng.
      if (p.chan.length) k.chayMaBiChan += 1;
    }
  }
  return k;
}

/**
 * Lệch giữa cột `page.bot_ai_bat` của CSDL v3 và trạng thái thật trong tiến trình bot.
 *
 * ĐO ĐƯỢC THẬT 25/08: CSDL v3 ghi 50 page bật AI, `ai-enabled.json` của bot là `[]` — 0 page.
 * Cột này là bản sao, và bản sao đã lệch. Nó quan trọng vì màn «Bộ luật chung» đếm *«bao
 * nhiêu page bị ảnh hưởng»* bằng chính cột đó — tức con số ② trong ba thứ bắt buộc phải có
 * trước khi cho bấm áp đang lấy từ nguồn sai.
 */
function lech(page) {
  const co = page.filter((p) => !p.botKhongThay);
  const chiCsdl = co.filter((p) => p.botTheoCsdl && !p.botTheoBot);
  const chiBot = co.filter((p) => !p.botTheoCsdl && p.botTheoBot);
  if (!chiCsdl.length && !chiBot.length) return null;
  return {
    coLech: true,
    soChiCsdl: chiCsdl.length,
    soChiBot: chiBot.length,
    viDu: [...chiCsdl, ...chiBot].slice(0, 8).map((p) => ({
      pageId: p.pageId, ten: p.ten, csdl: p.botTheoCsdl, bot: p.botTheoBot,
    })),
    noi: `${chiCsdl.length} page CSDL ghi là đang bật AI nhưng tiến trình bot không chạy, `
      + `${chiBot.length} page ngược lại. Con số ĐÚNG là con số của tiến trình bot — cột `
      + '`page.bot_ai_bat` chỉ là bản sao và đang cũ.',
  };
}

/**
 * Một ô điều kiện trên MỘT page.
 *
 * ⚠️ CHỈ CHỞ THỨ RIÊNG CỦA PAGE NÀY: `ma` + `chiTiet`. Tên bậc, chỗ nhảy, câu chỉ việc đều
 *    là thứ CHUNG của bậc thang — chúng đã nằm trong `dieuKien` gửi kèm MỘT lần, trình duyệt
 *    tra theo `ma`.
 *
 *    Đo 25/08 trên 514 page thật: chở kèm thì gói JSON **586 KB** cho 1.397 ô, vì cùng một
 *    câu «Thêm một token Pancake có phủ page này…» bị chép lại 120 lần. Bỏ đi còn **288 KB**.
 *
 *    Và nó cũng là cùng một mối nguy như chuỗi gõ hai lần, chỉ ở dạng dữ liệu: hai bản sao
 *    của một câu thì sửa một bản là hai nơi nói khác nhau.
 */
function nhan(b, laChan) {
  const ma = String(b?.code || '');
  // Tra bảng CHUNG: page bản cũ mang mã của `LADDER`, page bản mới mang mã `V3_*`. Một bảng
  // cho cả hai, nên không màn nào phải biết page đang chạy bằng bản nào mới đọc được điều kiện.
  const dk = DIEU_KIEN_TAT_CA[ma] || null;
  return {
    ma,
    chiTiet: String(b?.detail || ''),
    chan: dk ? dk.chan : laChan,
    // Mã v1 trả về mà bảng ở đây không biết — hiện ra chứ không nuốt. Nuốt đi thì bậc thang
    // mới của v1 lặng lẽ biến mất khỏi màn.
    la: !dk,
  };
}
const nhac_ = (b) => nhan(b, false);
