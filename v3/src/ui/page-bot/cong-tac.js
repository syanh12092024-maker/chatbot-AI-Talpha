// BA THAO TÁC GHI CỦA MÀN «PAGE & BOT» — và ba đường đi khác nhau, cố ý.
//
//   ① bật/tắt BOT AI  → KHÔNG chạm CSDL. Đi qua `noi-day/cau-bot-v1.js` sang tiến trình bot.
//   ② gán marketer    → CSDL v3. ⚠️ di trú sẽ ghi đè — xem `CANH_BAO_MARKETER`.
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
 * ⚠️ Câu này hiện THẲNG trên màn hình cạnh ô marketer, không giấu trong tài liệu.
 * Người gán 514 marketer xứng đáng biết trước rằng nó xoá được bằng một lệnh.
 */
export const CANH_BAO_MARKETER =
  'Lưu ý: chạy `npm run di-tru` sẽ ghi đè cột marketer bằng dữ liệu `pages.json`, mà nguồn đó '
  + 'hiện KHÔNG có marketer nào — tức là xoá trắng những gì gán ở đây. Đã phát `PHIEU-B-Y4` '
  + 'xin người A cho di trú thôi đụng vào cột này.';

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
export async function datCongTacBot(boiCanh, id, bat) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const p = await traTrongTeam(bc, id);
  if (!p.pageId) {
    throw new LoiPageBot(`page id=${id} không có id Facebook — không gạt được công tắc.`, 'thieu_page_id');
  }

  const truoc = p.botAiBat;
  const kq = await datBotAi(p.pageId, bat);        // ném LoiCauBotDong nếu cửa ghi đóng

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
