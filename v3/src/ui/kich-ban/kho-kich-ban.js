// TẦNG ĐỌC/GHI CỦA MÀN «KỊCH BẢN» + «SOẠN KỊCH BẢN» (G2-D1 · G2-D2, sóng 2).
//
// ═══ HAI BƯỚC KHÔNG ĐƯỢC ĐẢO ═══════════════════════════════════════════════════════════
// Tiêu chí sóng 2: «Marketer viết bằng tiếng Việt → bấm một nút ra bản cho máy → **cả hai
// bản đều lưu**» (`kich_ban.noi_dung_nguoi` + `noi_dung_may`).
//
// `noi_dung_may` là bản DỰNG RA, không phải bản người gõ. Nó phải dựng bằng ĐÚNG hàm mà bộ
// di trú và bộ ráp prompt đang dùng (`db/di-tru/nguon.js#dungBanChoMay`) — tự viết lại một
// bản dựng thứ hai là màn hình hứa một prompt khác cái bot thật sự nhận.
//
// ⛔ KHÔNG BAO GIỜ cho sửa thẳng `noi_dung_may`. Sửa được nó là hai bản rời nhau: bản người
//    nói một đằng, bản máy chạy một nẻo, và không ai biết bản nào mới là thật.
//
// ═══ BA TẦNG CÂY — VÀ HAI TẦNG TRÊN HÔM NAY KHÔNG CÓ DỮ LIỆU ═══════════════════════════
// Kế hoạch ghi «cây ba tầng: sản phẩm → nước → page, tầng dưới ghi rõ Kế thừa». Đo thật
// 25/08 trên `aicloser_v3`:
//
//   · tầng SẢN PHẨM — `page.nganh_hang` rỗng **514/514**, bảng `san_pham` **0 dòng**
//   · tầng NƯỚC     — `page.thi_truong` rỗng **374/514** (còn lại: KSA 34, UAE 32, Khác 28…)
//   · tầng PAGE     — 70/514 page có bản LIVE; **444 page KHÔNG có kịch bản riêng**
//
// Và lược đồ chặn thêm một nấc: `kich_ban.page_id` là **NOT NULL**, nên KHÔNG lưu được một
// bản kịch bản ở tầng sản phẩm hay tầng nước. «Kế thừa từ tầng trên» hôm nay không có tầng
// trên nào để kế thừa — đã phát `PHIEU-B-Y6`.
//
// ⇒ Màn dựng cây bằng ĐÚNG những tầng có dữ liệu, và **nói thẳng hai tầng kia đang trống**.
//   Dựng đủ ba tầng trên dữ liệu rỗng thì ra một cây có đúng một nhánh «(chưa phân loại)» —
//   trông như màn hình hỏng, và che mất sự thật là dữ liệu chưa có.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';

export const BANG = 'kich_ban';
export const BANG_PAGE = 'page';

export const HANH_DONG_LUU = 'luu_ban_nhap_kich_ban';
export const HANH_DONG_LIVE = 'dua_kich_ban_len_live';

/** Marketer là người viết kịch bản (`01-QUYET-DINH.md` §9). Quản trị cũng sửa được. */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);
/** Đưa lên LIVE là đổi cách bot nói với khách thật — thêm người duyệt kịch bản. */
export const VAI_DUYET_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.DUYET_KICH_BAN]);

/** Đúng SÁU trường của `src/kb.js#SCRIPT_FIELDS`. Gõ lại là đẻ bản sao thứ hai. */
export const TRUONG = Object.freeze(['tone', 'greeting', 'salesPrompt', 'fastLanePrice', 'fastLaneShip', 'fastLaneHowto']);

export const NHAN_TRUONG = Object.freeze({
  tone: 'Giọng điệu / phong cách',
  greeting: 'Câu chào mở đầu',
  salesPrompt: 'Cách bán / điểm mạnh riêng',
  fastLanePrice: 'Trả lời nhanh — hỏi giá',
  fastLaneShip: 'Trả lời nhanh — hỏi ship',
  fastLaneHowto: 'Trả lời nhanh — hỏi cách dùng',
});

/** Ba trường ĐI VÀO PROMPT (khối «hướng dẫn riêng cho page»). Ba trường còn lại là câu trả
 *  lời có sẵn của lớp 0 đồng — chúng KHÔNG tốn token của model. Người viết cần biết chỗ này. */
export const TRUONG_VAO_PROMPT = Object.freeze(['tone', 'greeting', 'salesPrompt']);

export const TRANG_THAI = Object.freeze(['DRAFT', 'REVIEW', 'LIVE', 'ARCHIVED']);

export class LoiKichBan extends Error {
  constructor(thongDiep, ma = 'kich_ban', status = 400) {
    super(thongDiep);
    this.name = 'LoiKichBan';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _pheuNhatKy = null;
let _dungBanMay = null;
let _dayLenBot = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKichBan('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKichBan('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

/**
 * Hàm dựng BẢN CHO MÁY. Người A giao (`db/di-tru/nguon.js#dungBanChoMay`) — đúng hàm mà bộ
 * di trú dùng, nên bản màn hình hứa và bản trong CSDL là một.
 */
export function datDungBanMay(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKichBan('datDungBanMay cần một hàm');
  _dungBanMay = fn || null;
  return _dungBanMay;
}

/**
 * Đẩy một bản lên LIVE ở TIẾN TRÌNH BOT (`POST /admin/api/kb/:pageId/config`).
 * Cùng lý lẽ với công tắc bot: bản LIVE thật nằm ở `kb-overrides.json` + RAM tiến trình bot,
 * cột trong CSDL chỉ là bản sao. Ghi cột mà không gọi sang bot thì bot vẫn nói y như cũ.
 */
export function datDayLenBot(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKichBan('datDayLenBot cần một hàm');
  _dayLenBot = fn || null;
  return _dayLenBot;
}

export const daNoiDungBanMay = () => typeof _dungBanMay === 'function';
export const daNoiDayLenBot = () => typeof _dayLenBot === 'function';

export function congTruyVan(bc) {
  if (!_taoTruyVan) throw new LoiKichBan('chưa nối cổng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiKichBan('chưa nối phễu nhật ký — từ chối ghi vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

export const KY_TU_MOI_TOKEN = 2.985;
export const uocToken = (chu) => Math.round(String(chu || '').length / KY_TU_MOI_TOKEN);

/** Chuẩn hoá về đúng sáu trường, cắt khoảng trắng. Trường lạ bị BỎ, không im lặng giữ. */
export function lamSach(cfg = {}) {
  const ra = {};
  for (const k of TRUONG) ra[k] = String(cfg?.[k] ?? '').trim();
  return ra;
}

export const coNoiDung = (cfg) => TRUONG.some((k) => lamSach(cfg)[k]);

/* ─────────────────────────── cây ─────────────────────────── */

export const CHUA_PHAN = '(chưa phân loại)';

/**
 * Cây kịch bản. Dựng bằng ĐÚNG những tầng CÓ DỮ LIỆU — xem khối chú thích đầu file.
 * Trả kèm `tangTrong` để màn nói thẳng tầng nào đang rỗng và vì sao.
 */
export async function cayKichBan(boiCanh, { tim = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const [pages, ban] = await Promise.all([
    db.chon(BANG_PAGE, {}, { sapXep: 'ten' }),
    db.chon(BANG, {}),
  ]);

  const liveTheoPage = new Map();
  const soBanTheoPage = new Map();
  for (const b of ban) {
    const k = String(b.page_id);
    soBanTheoPage.set(k, (soBanTheoPage.get(k) || 0) + 1);
    if (b.trang_thai === 'LIVE') liveTheoPage.set(k, b);
  }

  const t = String(tim || '').trim().toLowerCase();
  const khop = t
    ? pages.filter((p) => [p.ten, p.page_id, p.thi_truong].some((v) => String(v || '').toLowerCase().includes(t)))
    : pages;

  // Nhóm theo NƯỚC (`thi_truong`) — tầng duy nhất còn dữ liệu. Nhóm rỗng gom vào một nhánh
  // có TÊN RÕ RÀNG, không để nó thành một nhánh không nhãn.
  const nhom = new Map();
  for (const p of khop) {
    const nuoc = String(p.thi_truong || '').trim() || CHUA_PHAN;
    if (!nhom.has(nuoc)) nhom.set(nuoc, []);
    const live = liveTheoPage.get(String(p.id)) || null;
    nhom.get(nuoc).push({
      id: String(p.id),
      pageId: String(p.page_id || ''),
      ten: p.ten || '',
      botAiBat: p.bot_ai_bat === true,
      coKichBan: !!live,
      phienBanLive: live ? Number(live.phien_ban) : null,
      soBan: soBanTheoPage.get(String(p.id)) || 0,
      uocToken: live ? uocToken(live.noi_dung_may) : 0,
    });
  }

  const nhanh = [...nhom.entries()]
    .map(([nuoc, ds]) => ({
      nuoc,
      chuaPhanLoai: nuoc === CHUA_PHAN,
      page: ds,
      soPage: ds.length,
      soCoKichBan: ds.filter((x) => x.coKichBan).length,
      soBotBat: ds.filter((x) => x.botAiBat).length,
    }))
    // Nhánh «chưa phân loại» xuống CUỐI: nó thường to nhất, để đầu là nó che mất các nhánh thật.
    .sort((a, b) => (a.chuaPhanLoai !== b.chuaPhanLoai
      ? (a.chuaPhanLoai ? 1 : -1)
      : b.soPage - a.soPage));

  const coKB = khop.filter((p) => liveTheoPage.has(String(p.id))).length;
  return {
    teamId: bc.teamId,
    nhanh,
    soPage: khop.length,
    soTong: pages.length,
    soCoKichBan: coKB,
    soThieuKichBan: khop.length - coKB,
    tangTrong: tangTrong(pages),
    trong: khop.length ? null : {
      rong: true,
      vi: t ? 'khong_khop' : 'chua_cai_dat',
      noi: t ? `Không page nào khớp "${t}".` : 'Team này chưa được chia page nào.',
      diTiep: t ? null : { chu: 'Sang màn Cấu hình team', duong: '/cau-hinh-team' },
    },
  };
}

/**
 * Tầng nào của cây đang KHÔNG có dữ liệu — và vì sao. Nói ra chứ không vẽ một cây rỗng rồi
 * để người đọc tưởng màn hình hỏng.
 */
export function tangTrong(pages) {
  const coNganh = pages.filter((p) => String(p.nganh_hang || '').trim()).length;
  const coThiTruong = pages.filter((p) => String(p.thi_truong || '').trim()).length;
  const ra = [];
  if (!coNganh) {
    ra.push({
      tang: 'san_pham',
      chu: `Tầng SẢN PHẨM đang trống: ${pages.length}/${pages.length} page chưa có ngành hàng, `
        + 'và bảng `san_pham` chưa có dòng nào. Nên cây chỉ dựng được hai tầng.',
    });
  }
  if (coThiTruong < pages.length) {
    ra.push({
      tang: 'nuoc',
      chu: `Tầng NƯỚC thiếu một phần: ${pages.length - coThiTruong}/${pages.length} page chưa có `
        + `thị trường — chúng gom vào nhánh «${CHUA_PHAN}».`,
    });
  }
  return ra;
}

/* ─────────────────────────── một page ─────────────────────────── */

/** Mọi bản của một page + bản LIVE + bản người đang soạn dở. */
export async function banCuaPage(boiCanh, pageRowId) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const p = await db.mot(BANG_PAGE, { id: String(pageRowId) });
  if (!p) throw new LoiKichBan(`không có page id=${pageRowId} trong team này.`, 'khong_thay', 404);

  const ds = (await db.chon(BANG, { page_id: String(pageRowId) }))
    .map((b) => ({
      id: String(b.id),
      phienBan: Number(b.phien_ban),
      trangThai: b.trang_thai,
      nguoiSua: b.nguoi_sua || '',
      ghiChu: b.ghi_chu || '',
      suaLuc: b.sua_luc || b.tao_luc || null,
      nguoi: lamSach(b.noi_dung_nguoi),
      may: b.noi_dung_may || '',
      uocToken: uocToken(b.noi_dung_may),
    }))
    .sort((a, b) => b.phienBan - a.phienBan);

  const live = ds.find((b) => b.trangThai === 'LIVE') || null;
  return {
    page: { id: String(p.id), pageId: String(p.page_id || ''), ten: p.ten || '',
      thiTruong: p.thi_truong || '', botAiBat: p.bot_ai_bat === true },
    ban: ds,
    live,
    truong: TRUONG,
    nhanTruong: NHAN_TRUONG,
    truongVaoPrompt: TRUONG_VAO_PROMPT,
    // Page chưa có bản nào KHÔNG phải «chưa cài đặt xong» theo nghĩa hỏng — nó là trạng thái
    // thật của 444/514 page hôm nay. Nhưng phải nói bot đang chạy bằng gì.
    trong: ds.length ? null : {
      rong: true,
      vi: 'chua_cai_dat',
      noi: 'Page này chưa có kịch bản riêng nào. Bot đang chạy bằng bộ luật chung + dữ liệu '
        + 'sản phẩm, KHÔNG có hướng dẫn riêng nào về giọng điệu, câu chào hay cách bán. '
        + `Hôm nay 444/514 page ở tình trạng này.`,
      diTiep: { chu: 'Soạn bản đầu tiên', duong: '#soan' },
    },
  };
}

/* ─────────────────────────── ghi ─────────────────────────── */

/**
 * BƯỚC 1 → BƯỚC 2, KHÔNG ĐẢO: nhận bản NGƯỜI, tự dựng bản MÁY, lưu CẢ HAI.
 * Luôn tạo phiên bản mới `DRAFT` — không sửa đè, vì bản cũ là thứ các page đang chạy bằng nó.
 */
export async function luuBanNhap(boiCanh, pageRowId, { nguoi, ghiChu = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  if (!_dungBanMay) {
    throw new LoiKichBan(
      'chưa nối hàm dựng bản cho máy (`dungBanChoMay` của người A) — từ chối lưu. Tự dựng một '
      + 'bản thứ hai ở đây là màn hình hứa một prompt khác cái bot thật sự nhận.',
      'chua_noi', 500,
    );
  }
  const { page } = await banCuaPage(bc, pageRowId);   // ném 404 nếu page không thuộc team

  const sach = lamSach(nguoi);
  if (!coNoiDung(sach)) {
    throw new LoiKichBan('bản kịch bản trống — không có trường nào có nội dung.', 'trong_rong');
  }
  const may = String(_dungBanMay(sach) || '');

  const db = congTruyVan(bc);
  const daCo = await db.chon(BANG, { page_id: String(pageRowId) });
  const phienBan = Math.max(0, ...daCo.map((b) => Number(b.phien_ban) || 0)) + 1;

  const dong = await db.them(BANG, {
    page_id: String(pageRowId),
    phien_ban: phienBan,
    trang_thai: 'DRAFT',              // ⛔ KHÔNG lên LIVE ngay. Đó là thao tác riêng.
    noi_dung_nguoi: sach,
    noi_dung_may: may,
    nguoi_sua: bc.tenDangNhap || String(bc.nguoiDungId || ''),
    ghi_chu: ghiChu,
    sua_luc: new Date().toISOString(),
  });

  await ghi(bc, {
    hanhDong: HANH_DONG_LUU,
    doiTuongLoai: BANG,
    doiTuongId: dong ? String(dong.id) : null,
    sau: { page: page.pageId, phien_ban: phienBan, uoc_token: uocToken(may) },
    ghiChu: ghiChu || `lưu bản nháp kịch bản v${phienBan} cho ${page.ten || page.pageId}`,
  });

  return { id: dong ? String(dong.id) : null, phienBan, trangThai: 'DRAFT', may, uocToken: uocToken(may) };
}

/**
 * Đưa một bản lên LIVE.
 *
 * HAI CHỖ GHI, ĐÚNG THỨ TỰ:
 *   ① gọi sang TIẾN TRÌNH BOT — đó mới là nơi bản LIVE thật nằm (`kb-overrides.json` + RAM)
 *   ② rồi mới sửa cột `trang_thai` trong CSDL — cột là BẢN SAO
 * Đảo thứ tự thì cột nói «LIVE» trong khi bot vẫn nói y như cũ, và màn hình chính là thứ
 * người ta nhìn để tin.
 *
 * Lược đồ đã có `UNIQUE INDEX ... WHERE trang_thai='LIVE'` — đúng MỘT bản LIVE mỗi page,
 * chặn ở tầng CSDL. Nên phải hạ bản cũ TRƯỚC khi dựng bản mới, nếu không Postgres từ chối.
 */
export async function duaLenLive(boiCanh, pageRowId, id, { lyDo = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_DUYET_DUOC);
  if (!_dayLenBot) {
    throw new LoiKichBan(
      'chưa nối cửa đẩy sang tiến trình bot — từ chối. Sửa cột `trang_thai` mà không gọi sang '
      + 'bot thì bot vẫn nói y như cũ, và màn hình báo LIVE là nói dối.',
      'chua_noi', 500,
    );
  }
  const { page, ban, live } = await banCuaPage(bc, pageRowId);
  const b = ban.find((x) => x.id === String(id));
  if (!b) throw new LoiKichBan(`không có bản id=${id} của page này.`, 'khong_thay', 404);
  if (b.trangThai === 'LIVE') throw new LoiKichBan(`bản v${b.phienBan} đang LIVE rồi.`, 'dang_live');

  // ① Bot trước.
  await _dayLenBot(page.pageId, b.nguoi);

  // ② Rồi mới tới cột. Hạ bản cũ trước — `UNIQUE INDEX` chặn hai bản LIVE cùng lúc.
  const db = congTruyVan(bc);
  if (live) await db.sua(BANG, { id: live.id }, { trang_thai: 'ARCHIVED' });
  await db.sua(BANG, { id: b.id }, { trang_thai: 'LIVE', sua_luc: new Date().toISOString() });

  await ghi(bc, {
    hanhDong: HANH_DONG_LIVE,
    doiTuongLoai: BANG,
    doiTuongId: String(b.id),
    truoc: live ? { phien_ban: live.phienBan, id: live.id } : null,
    sau: { phien_ban: b.phienBan, page: page.pageId, bot_ai_bat: page.botAiBat },
    ghiChu: lyDo || `đưa kịch bản v${b.phienBan} lên LIVE cho ${page.ten || page.pageId}`,
  });

  return { id: String(b.id), phienBan: b.phienBan, haBan: live ? live.phienBan : null };
}
