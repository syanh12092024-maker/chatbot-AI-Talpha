// UI-HT3 · CỘT BỐI CẢNH của BÀN HỘI THOẠI (CR-28-09). CHỈ ĐỌC.
//
// Một hội thoại → mọi thứ sale cần biết trước khi nhảy sang Pancake: khách là ai và có hay hoàn
// không · đơn nào đang bàn trong chính hội thoại này · bot đang ở giai đoạn nào, ai giữ, vì sao
// đẩy · kịch bản nào đang chạy trên page · bot đã trả lời bao nhiêu lượt, bằng model nào.
//
// ĐO 28/09 trên máy chủ (nhật ký `phieu-UI-HT3.md`):
//   · `don_hang` 123.629 dòng, 2.326 gắn hội thoại, KHÔNG có chỉ mục theo `hoi_thoai_id` ⇒ đọc
//     đơn của hội thoại là một lượt quét bảng (~50 ms). Chấp nhận — thêm chỉ mục là migration,
//     ngoài phạm vi CR (nợ §9).
//   · `so_ai` 0 dòng ⇒ khối «Bot v3» hiện «chưa có dữ liệu», không bịa (CR mục 3). Bot CŨ thì có
//     Sổ AI riêng (`ai-messages.jsonl`) — đếm lượt từ đó, và NÓI nó là sổ của bot cũ.
//   · 74 kịch bản LIVE, đều tầng page. Vẫn đi qua bộ giải BA TẦNG thật (`src/db/kich-ban.js#
//     docKichBanChoPage`), tiêm từ `chay-that.js` — đọc thẳng `kich_ban` tầng page là sai ngay
//     ngày có bản tầng nước đầu tiên (page kế thừa mà màn nói «không có kịch bản»).
//
// Mọi bảng đọc ở đây đều nằm trong `BANG_NGHIEP_VU_CHUAN` (`src/db/truy-van.js`) nên đi qua
// cổng team — hội thoại team khác ⇒ `null` ⇒ router 404, không đọc thêm gì.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { congTruyVan, tenPageCua, LoiDieuPhoi } from '../dispatch/kho-viec.js';
import { hoSoCua } from '../dispatch/chi-tiet.js';
import { convIdCua } from '../dispatch/lien-ket.js';
import { tenMessengerCua, luotBotCuCua } from './doc-hoi-thoai.js';

const chuoi = (v) => (v == null ? '' : String(v).trim());
const soHoacNull = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

/** Lượt không gọi model (`src/chat/so-ai.js#KHONG_GOI_MODEL`) — không phải «model gần nhất». */
export const KHONG_GOI_MODEL = 'khong-goi-model';

/**
 * Chữ cho `don_hang.trang_thai_he`. Nguồn sự thật là máy trạng thái (`src/orders/may-trang-thai.js
 * #BANG_CHUYEN`) — bộ ca so KHOÁ với nó, lệch là đỏ (bài học nhãn tầng hoàn 28/09: mã thiếu nhãn
 * thì hiện mã thô xám cho 11.439 khách mà không ai thấy).
 */
export const CHU_TRANG_THAI_DON = Object.freeze({
  moi_tu_pos: 'Mới về từ POS',
  moi: 'Mới',
  cho_gui_wa: 'Chờ gửi WhatsApp xác nhận',
  da_gui_wa: 'Đã gửi WhatsApp, chờ khách',
  gui_wa_loi: 'Gửi WhatsApp lỗi',
  cho_sale: 'Chờ sale xử',
  day_cho_in: 'Đã đẩy sang in đơn',
  dong: 'Đã đóng',
});

/**
 * Chữ cho `don_hang.trang_thai_pos` — mã SỐ của POS (máy chủ 28/09: 16 · 2 · 3 · 5 · 6 … trên đơn
 * gắn hội thoại). Nguồn sự thật: bảng mã ĐÃ XÁC MINH `src/pos/ma-trang-thai.js#BANG_MA` (nhãn máy
 * `status_name` đọc từ API POS); chữ Việt dịch theo cột «nghĩa» ở đầu file đó. Bộ ca so KHOÁ.
 * Mã ngoài bảng (máy chủ có mã 17) hiện «mã N · chưa xác minh» — không đoán.
 */
export const CHU_TRANG_THAI_POS = Object.freeze({
  0: 'Mới · chờ xác nhận',
  1: 'Đã duyệt',
  2: 'Đang giao',
  3: 'Đã giao',
  4: 'Đang hoàn',
  5: 'Đã hoàn',
  6: 'Đã huỷ',
  7: 'Đã xoá',
  8: 'Đang đóng gói',
  9: 'Chờ xử lý',
  11: 'Chờ hàng',
  12: 'Chờ in',
  16: 'Đã thu tiền',
  20: 'Đã đặt hàng',
});
const chuTrangThaiPos = (v) => {
  const m = chuoi(v);
  if (!m) return null;
  return CHU_TRANG_THAI_POS[m] || `mã ${m} · chưa xác minh`;
};

/** @type {null | ((teamId:string, pageRowId:string) => Promise<{ban:object|null, tuDau:string, viSao:string|null}>)} */
let _giaiKichBan = null;
/** Tiêm bộ giải kịch bản ba tầng (`docKichBanChoPage(pool, teamId, pageRowId)`). */
export function datGiaiKichBan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDieuPhoi('datGiaiKichBan cần một hàm');
  _giaiKichBan = fn || null;
  return _giaiKichBan;
}
export const daNoiGiaiKichBan = () => typeof _giaiKichBan === 'function';

/** Đơn MỚI NHẤT của chính hội thoại này — «đơn đang bàn». */
function donDangBanCua(don) {
  if (!don.length) return null;
  const d = don.reduce((a, b) => {
    const ta = Number(a.tao_luc) || 0, tb = Number(b.tao_luc) || 0;
    return tb > ta || (tb === ta && Number(b.id) > Number(a.id)) ? b : a;
  });
  const ma = chuoi(d.trang_thai_he);
  return {
    id: String(d.id),
    maPos: chuoi(d.ma_pos) || null,
    trangThai: CHU_TRANG_THAI_DON[ma] || ma || null,
    trangThaiPos: chuTrangThaiPos(d.trang_thai_pos),
    tongTien: soHoacNull(d.tong_tien),
    tienTe: chuoi(d.tien_te) || null,
    taoLuc: soHoacNull(d.tao_luc),
    daDong: d.dong_luc != null,
  };
}

async function kichBanCua(bc, p) {
  if (!p) return { co: false, viSao: 'Hội thoại không gắn page nào.' };
  if (!_giaiKichBan) return { co: false, viSao: 'Máy chủ chưa nối bộ giải kịch bản (datGiaiKichBan).' };
  try {
    const kq = await _giaiKichBan(bc.teamId, String(p.id));
    const b = kq?.ban;
    if (!b) return { co: false, viSao: chuoi(kq?.viSao) || 'Page này chưa có kịch bản nào đang chạy.' };
    return {
      co: true,
      phienBan: soHoacNull(b.phien_ban),
      tuDau: chuoi(kq.tuDau) || null,
      nguoiSua: chuoi(b.nguoi_sua) || null,
      suaLuc: soHoacNull(b.sua_luc instanceof Date ? b.sua_luc.getTime() : b.sua_luc),
    };
  } catch (e) {
    return { co: false, viSao: `Không đọc được kịch bản: ${chuoi(e?.message || e).slice(0, 160)}` };
  }
}

/** Sổ AI v3 của hội thoại: số lượt trả lời, model gần nhất, tiền. Trống ⇒ nói «chưa có dữ liệu». */
function soAiCua(dong) {
  if (!dong.length) return { co: false, viSao: 'Chưa có dữ liệu — bot v3 chưa ghi lượt nào cho hội thoại này.' };
  const moi = [...dong].sort((a, b) => (Number(b.xay_ra_luc) || 0) - (Number(a.xay_ra_luc) || 0));
  // Tiền chỉ có nghĩa trên lượt GỌI model — lượt chuyển người/Fast Lane không tốn đồng nào, đếm
  // chúng vào mẫu số là nói «thiếu giá» cho một lượt vốn không có giá.
  const goiModel = dong.filter((d) => chuoi(d.ma_model) && d.ma_model !== KHONG_GOI_MODEL);
  const coTien = goiModel.filter((d) => soHoacNull(d.tien_vnd) != null);
  return {
    co: true,
    soLuot: dong.filter((d) => d.loai === 'reply').length,
    soDong: dong.length,
    model: chuoi(goiModel.sort((a, b) => (Number(b.xay_ra_luc) || 0) - (Number(a.xay_ra_luc) || 0))[0]?.ma_model) || null,
    cuoiLuc: soHoacNull(moi[0].xay_ra_luc),
    // `soDongCoTien < soGoiModel` thì màn nói «N/M lượt có giá» — không để tổng thiếu trông như đủ.
    tienVnd: coTien.length ? coTien.reduce((s, d) => s + Number(d.tien_vnd), 0) : null,
    soDongCoTien: coTien.length,
    soGoiModel: goiModel.length,
  };
}

/**
 * LL2 · đơn chờ duyệt của hội thoại — đơn MỚI NHẤT còn `cho_duyet` (bot chốt lại thì hàng chờ có
 * thể có hơn một; sale duyệt đơn mới nhất, `soDon` nói còn bao nhiêu). Chỉ đọc; sửa/duyệt ở
 * `/api/hop-thu/don/:id/*` (module `hop-thu`).
 */
export function donChoDuyetCua(ds) {
  const ds2 = (Array.isArray(ds) ? ds : []).filter((o) => o.trang_thai === 'cho_duyet');
  if (!ds2.length) return null;
  const o = ds2.sort((a, b) => (soHoacNull(b.tao_luc) || 0) - (soHoacNull(a.tao_luc) || 0))[0];
  const d = o.du_lieu_don || {};
  return {
    id: String(o.id), soDon: ds2.length,
    ten: chuoi(d.ten) || null, soDienThoai: chuoi(d.sdt) || null, diaChi: chuoi(d.dia_chi) || null,
    sanPhamMa: chuoi(d.san_pham_ma) || null, soLuong: soHoacNull(d.so_luong),
    tongTien: soHoacNull(d.tong_tien), tienTe: d.tien_te || null, taoLuc: soHoacNull(o.tao_luc),
  };
}

/**
 * Bối cảnh một hội thoại cho cột phải.
 *
 * @returns {Promise<null | object>}  `null` = không có hội thoại này TRONG TEAM (router 404).
 */
export async function boiCanhHoiThoai(boiCanh, hoiThoaiId) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const id = chuoi(hoiThoaiId);
  if (!id) return null;
  const h = await db.mot('hoi_thoai', { id });
  if (!h) return null;

  const p = h.page_id != null ? await db.mot('page', { id: String(h.page_id) }) : null;
  const pageFb = chuoi(p?.page_id);
  const psid = chuoi(h.psid);
  const ma = convIdCua(h, p);
  const [khach, donHt, soAi, kichBan, donChoHt] = await Promise.all([
    h.khach_id != null ? db.mot('khach', { id: String(h.khach_id) }) : null,
    db.chon('don_hang', { hoi_thoai_id: id }),
    pageFb && psid ? db.chon('so_ai', { page_id: pageFb, psid }) : [],
    kichBanCua(bc, p),
    // LL2: đơn bot đã chốt, đang CHỜ SALE DUYỆT trong hội thoại này (Hộp thư duyệt ngay cạnh chat).
    db.chon('hang_cho_tao_don', { hoi_thoai_id: id, trang_thai: 'cho_duyet' }),
  ]);
  const donKhach = khach ? await db.chon('don_hang', { khach_id: String(khach.id) }, { sapXep: 'tao_luc' }) : [];

  return {
    hoiThoaiId: id,
    tenPage: tenPageCua(p),
    tenMessenger: tenMessengerCua(ma),
    giaiDoan: h.trang_thai || null,
    nguoiGiu: h.chu_so_huu || null,
    lyDoCuoi: chuoi(h.ly_do_cuoi) || null,
    aiNoiGi: chuoi(h.ai_noi_gi) || null,
    chamLuc: soHoacNull(h.cham_luc),
    // `{hoi_thoai_id}` để `hoSoCua` nói đúng lý do «hội thoại chưa nối hồ sơ khách».
    khach: hoSoCua(khach, donKhach, { hoi_thoai_id: id }),
    donDangBan: donDangBanCua(donHt),
    donChoDuyet: donChoDuyetCua(donChoHt),
    kichBan,
    soAi: soAiCua(soAi),
    botCu: luotBotCuCua(ma),
  };
}
