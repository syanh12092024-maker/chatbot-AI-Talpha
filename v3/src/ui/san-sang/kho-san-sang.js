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
export const DIEU_KIEN = Object.freeze({
  NO_TOKEN: {
    chan: true, ten: 'Không token nào phủ page',
    di: '/ket-noi', nutDi: 'Mở kho token',
    lam: 'Thêm một token Pancake có phủ page này, hoặc thay token đã chết.',
  },
  MISSING_TAGS: {
    chan: true, ten: 'Thiếu thẻ Pancake',
    di: null, nutDi: null,
    lam: 'Thẻ nằm bên Pancake, v3 chưa có màn sửa. Vào Pancake → cài đặt page → thẻ hội thoại, '
      + 'tạo đủ các thẻ còn thiếu ghi ở cột bên phải.',
  },
  MISSING_PRODUCT: {
    chan: true, ten: 'Chưa có sản phẩm/giá',
    di: null, nutDi: null,
    lam: 'Sản phẩm và giá lấy từ Google Sheet của page. Điền sản phẩm vào Sheet — màn «Sản phẩm '
      + '& kho» của v3 chưa dựng (chờ bảng `san_pham` có dữ liệu).',
  },
  MISSING_SCRIPT: {
    chan: true, ten: 'Thiếu kịch bản bán',
    di: '/kich-ban', nutDi: 'Soạn kịch bản',
    lam: 'Page chưa có câu chào hoặc chưa có cách bán. Soạn rồi đưa lên LIVE.',
  },
  MISSING_POS: {
    chan: false, ten: 'Chưa nối shop POS',
    di: '/cau-hinh-team', nutDi: 'Nối POS',
    lam: 'AI vẫn tư vấn và chốt được, chỉ là không đẩy nổi đơn sang POS. Nối shop ở mục «Kết nối POS».',
  },
  THIN_SCRIPT: {
    chan: false, ten: 'Kịch bản mỏng',
    di: '/kich-ban', nutDi: 'Bổ sung kịch bản',
    lam: 'Thiếu giọng điệu hoặc phần cách bán quá ngắn. Bot vẫn chạy nhưng trả lời sẽ chung chung.',
  },
  SCRIPT_STALE: {
    chan: false, ten: 'Kịch bản cũ, chốt kém',
    di: '/kich-ban', nutDi: 'Xem lại kịch bản',
    lam: 'Lâu không sửa VÀ tỉ lệ chốt dưới 1%. Cũ mà vẫn ra đơn thì v1 không báo.',
  },
  READY: {
    chan: false, ten: 'Đủ điều kiện',
    di: null, nutDi: null, lam: '',
  },
});

/** Bảy bậc THẬT SỰ là điều kiện — `READY` là kết quả, không phải điều kiện. */
export const MA_DIEU_KIEN = Object.freeze(Object.keys(DIEU_KIEN).filter((m) => m !== 'READY'));

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
      teamId: bc.teamId, page: [], dem: demRong(), lech: null, dieuKien: DIEU_KIEN,
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
    dieuKien: DIEU_KIEN,
    toanHe: toanHe.toanHe || null,
    trong: page.length ? null : {
      rong: true, vi: 'chua-cai-dat',
      noi: 'Team này chưa có page nào.',
      diTiep: 'Gán page cho team ở màn Cấu hình team → mục «Page của team».',
    },
  };
}

const demRong = () => ({ tong: 0, chan: 0, nhac: 0, san: 0, botKhongThay: 0, dangChay: 0, chayMaBiChan: 0 });

function dem(page) {
  const k = demRong();
  k.tong = page.length;
  for (const p of page) {
    if (p.botKhongThay) { k.botKhongThay += 1; continue; }
    if (p.chan.length) k.chan += 1;
    else if (p.nhac.length) k.nhac += 1;
    else k.san += 1;
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

function nhan(b, laChan) {
  const ma = String(b?.code || '');
  const dk = DIEU_KIEN[ma] || null;
  return {
    ma,
    ten: dk?.ten || ma,
    chiTiet: String(b?.detail || ''),
    chan: dk ? dk.chan : laChan,
    di: dk?.di || null,
    nutDi: dk?.nutDi || null,
    lam: dk?.lam || '',
    // Mã v1 trả về mà bảng ở đây không biết — hiện ra chứ không nuốt. Nuốt đi thì bậc thang
    // mới của v1 lặng lẽ biến mất khỏi màn.
    la: !dk,
  };
}
const nhac_ = (b) => nhan(b, false);
