// BA THAO TÁC GHI CỦA MÀN «PAGE & BOT» — và ba đường đi khác nhau, cố ý.
//
//   ① bật/tắt BOT AI  → KHÔNG chạm CSDL. Đi qua `noi-day/cau-bot-v1.js` sang tiến trình bot.
//   ② gán marketer    → CSDL v3. Bền — `PHIEU-B-Y4` đã chặn di trú xoá cột này.
//   ③ cờ trọng điểm   → CSDL v3, an toàn (cột không nằm trong câu ghi đè của di trú).
//
// ─── VÌ SAO ① KHÔNG GHI XUỐNG CỘT `bot_ai_bat` ─────────────────────────────────────────
// Vì cột đó là BẢN SAO. Nguồn thật là `ai-enabled.json` + `Set` trong RAM tiến trình bot.
// Ghi vào cột thì:
//   · bot KHÔNG đổi hành vi — khách vẫn được (hoặc không được) bot trả lời y như cũ;
//   · lượt `npm run di-tru` kế tiếp chép đè lại từ file, xoá sạch dấu vết.
// Tức là một nút bấm báo thành công và không làm gì. Đúng họ lỗi với `suaTheoId` bỏ rơi
// `team_id`. Nên ở đây: gọi sang bot, rồi ĐỌC LẠI trạng thái bot trả về, và **đồng bộ cột
// trong CSDL theo kết quả thật** — cột chỉ chép lại sự thật, không bao giờ là sự thật.
//
// ─── LỚP TEAM: v3 GIỮ QUYỀN, v1 GIỮ CÔNG TẮC ───────────────────────────────────────────
// `/admin/api/pages/:id/ai` của v1 không biết team. Nên MỌI thao tác ở đây phải tra page qua
// cổng có điều kiện team TRƯỚC, và page không thuộc team thì trả `null` để router ra **404**
// — không phải 403. 403 là xác nhận «dòng này có thật ở team khác».

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { BANG, LoiPageBot, motPage, congTruyVan } from './kho-page.js';
import { datBotAi, trangThaiCau } from '../../noi-day/cau-bot-v1.js';

export const HANH_DONG_BOT = 'bat_tat_bot_ai';
export const HANH_DONG_MARKETER = 'gan_marketer';
export const HANH_DONG_TRONG_DIEM = 'dat_trong_diem';

/** Vai được sửa. `quan-ly` xem được màn nhưng không gạt được công tắc. */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

export const DAI_MARKETER = 120;

/**
 * Câu này TỪNG là một cảnh báo: di trú ghi đè cột `marketer` bằng `pages.json` (nguồn rỗng),
 * nên mỗi lượt `npm run di-tru` xoá trắng công gán tay. `PHIEU-B-Y4` đã vá — di trú nay chỉ
 * ĐIỀN VÀO CHỖ TRỐNG, không xoá chỗ đã có.
 *
 * Giữ lại `null` thay vì xoá hẳn hằng: nơi gọi vẫn đọc nó, và một hằng `null` nói rõ «không
 * còn cảnh báo nào» hơn là một hằng biến mất rồi để `undefined` trôi ra màn hình.
 */
export const CANH_BAO_MARKETER = null;

export const PHIEU_MARKETER = 'PHIEU-B-Y4';

/* ─── phễu tiêm ─── */

let _pheuNhatKy = null;

export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiPageBot('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

export const daNoiPheuNhatKyPage = () => typeof _pheuNhatKy === 'function';

/**
 * Ghi nhật ký, CÓ NÉM RA NGOÀI.
 * Cùng lý lẽ với tầng ghi thành viên: gạt công tắc bot là đổi cách hệ thống nói chuyện với
 * khách thật. Không truy ngược được ai gạt lúc nào thì thao tác đó không nên xảy ra.
 */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiPageBot('chưa nối phễu nhật ký — từ chối ghi vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/** Tra page trong bối cảnh team. Không thuộc team → ném `khong_thay` (router → 404). */
async function traTrongTeam(bc, id) {
  const p = await motPage(bc, id);
  if (!p) {
    throw new LoiPageBot(`không có page id=${id} trong team này.`, 'khong_thay', 404);
  }
  return p;
}

/* ────────────────────────── ① bật/tắt BOT AI ────────────────────────── */

/**
 * Gạt công tắc bot AI cho một page.
 *
 * Thứ tự cố ý: kiểm quyền → kiểm team → gọi bot → **đọc kết quả THẬT bot trả về** → chép
 * vào cột CSDL → ghi nhật ký. Không đảo: chép cột trước rồi gọi bot mà bot hỏng thì cột nói
 * một đằng bot làm một nẻo, và không ai biết vì cột chính là thứ màn hình hiện.
 */
/**
 * TRẦN BẬT HÀNG LOẠT — chốt thay cho cái cờ môi trường đã bỏ.
 *
 * Rủi ro thật ở màn này không phải «một người không được phép bấm nút» — bảy chốt trước đó
 * lo việc ấy rồi. Rủi ro là **một cú bấm nhầm kéo cả 69 page lên cùng lúc**, và bot bắt đầu
 * nhắn cho khách của 69 page trước khi ai kịp đọc nó nói gì.
 *
 * ⚠️ CHỈ CHẶN CHIỀU BẬT. Tắt bot thì KHÔNG BAO GIỜ bị chặn — lúc cần tắt gấp là lúc đang có
 *    sự cố, và một cái trần chặn người ta tắt bot là cái trần gây ra thiệt hại chứ không ngăn.
 */
export const TRAN_BAT_MOT_DOT = 5;
export const CUA_SO_TRAN_MS = 10 * 60 * 1000;

const _datBat = [];

/** Số lượt bật còn lại trong cửa sổ hiện tại — màn hiện ra để người ta biết trước. */
export function conBatDuoc(bayGio = Date.now()) {
  while (_datBat.length && bayGio - _datBat[0] > CUA_SO_TRAN_MS) _datBat.shift();
  return Math.max(0, TRAN_BAT_MOT_DOT - _datBat.length);
}

/** Cho bài test dựng lại cảnh sạch. Không dùng ở đường chạy thật. */
export function xoaDemBat() { _datBat.length = 0; }

function batBuocDuoiTran(bat, bayGio = Date.now()) {
  if (!bat) return;                       // tắt: không bao giờ chặn
  if (conBatDuoc(bayGio) > 0) return;
  const cho = Math.ceil((CUA_SO_TRAN_MS - (bayGio - _datBat[0])) / 60000);
  throw new LoiPageBot(
    `Đã bật ${TRAN_BAT_MOT_DOT} page trong ${CUA_SO_TRAN_MS / 60000} phút — dừng ở đây. `
    + `Bật thêm được sau ${cho} phút nữa.\n\n`
    + 'Trần này để một cú bấm nhầm không kéo cả trăm page lên cùng lúc. Hãy đọc vài hội thoại '
    + 'mà số page vừa bật tạo ra trước khi bật tiếp. TẮT bot thì không bị chặn.',
    'qua_tran_bat', 429,
  );
}

export async function datCongTacBot(boiCanh, id, bat) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  batBuocDuoiTran(!!bat);
  const p = await traTrongTeam(bc, id);
  if (!p.pageId) {
    throw new LoiPageBot(`page id=${id} không có id Facebook — không gạt được công tắc.`, 'thieu_page_id');
  }

  const truoc = p.botAiBat;
  const kq = await datBotAi(p.pageId, bat);        // ném LoiCauBotDong nếu cửa ghi bị khoá

  // Chỉ tính vào trần khi bot THẬT SỰ vừa được bật — gạt lại một page đang bật không tốn
  // lượt, và một lượt gọi hỏng cũng không tốn.
  if (kq.batSauKhiDoi && !truoc) _datBat.push(Date.now());

  // Chép sự thật vừa đọc được từ bot vào cột. Cột là BẢN SAO, không phải nguồn.
  const db = congTruyVan(bc);
  await db.sua(BANG, { id: String(id) }, { bot_ai_bat: kq.batSauKhiDoi, sua_luc: new Date().toISOString() });

  await ghi(bc, {
    hanhDong: HANH_DONG_BOT,
    doiTuongLoai: BANG,
    doiTuongId: String(id),
    truoc: { bot_ai_bat: truoc },
    sau: { bot_ai_bat: kq.batSauKhiDoi },
    ghiChu: `${kq.batSauKhiDoi ? 'BẬT' : 'TẮT'} bot AI cho page ${p.ten || p.pageId} (${p.pageId})`,
  });

  return { id: String(id), pageId: p.pageId, botAiBat: kq.batSauKhiDoi, doi: truoc !== kq.batSauKhiDoi };
}

/* ────────────────────────── ② gán marketer ────────────────────────── */

export async function ganMarketer(boiCanh, id, marketer) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const p = await traTrongTeam(bc, id);

  const ten = String(marketer == null ? '' : marketer).trim();
  if (ten.length > DAI_MARKETER) {
    throw new LoiPageBot(`tên marketer dài quá ${DAI_MARKETER} ký tự.`, 'qua_dai');
  }
  if (ten === p.marketer) return { id: String(id), marketer: ten, doi: false };

  const db = congTruyVan(bc);
  await db.sua(BANG, { id: String(id) }, { marketer: ten, sua_luc: new Date().toISOString() });

  await ghi(bc, {
    hanhDong: HANH_DONG_MARKETER,
    doiTuongLoai: BANG,
    doiTuongId: String(id),
    truoc: { marketer: p.marketer },
    sau: { marketer: ten },
    ghiChu: ten ? `gán marketer "${ten}" cho page ${p.ten || p.pageId}` : `bỏ marketer khỏi page ${p.ten || p.pageId}`,
  });

  return { id: String(id), marketer: ten, doi: true, canhBao: CANH_BAO_MARKETER };
}

/* ────────────────────────── ③ cờ trọng điểm ────────────────────────── */

export async function datTrongDiem(boiCanh, id, bat) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const p = await traTrongTeam(bc, id);
  const moi = !!bat;
  if (moi === p.trongDiem) return { id: String(id), trongDiem: moi, doi: false };

  const db = congTruyVan(bc);
  await db.sua(BANG, { id: String(id) }, { trong_diem: moi, sua_luc: new Date().toISOString() });

  await ghi(bc, {
    hanhDong: HANH_DONG_TRONG_DIEM,
    doiTuongLoai: BANG,
    doiTuongId: String(id),
    truoc: { trong_diem: p.trongDiem },
    sau: { trong_diem: moi },
    ghiChu: `${moi ? 'đánh dấu' : 'bỏ đánh dấu'} page trọng điểm: ${p.ten || p.pageId}`,
  });

  return { id: String(id), trongDiem: moi, doi: true };
}

/** Trạng thái cửa ghi sang tiến trình bot — màn hình hiện để biết vì sao công tắc mờ. */
export { trangThaiCau };
