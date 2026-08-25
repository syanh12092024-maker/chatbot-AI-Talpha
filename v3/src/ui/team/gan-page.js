// LÁT 4 CỦA MÀN «CẤU HÌNH TEAM» — gán page ↔ team. Mở được từ 25/08/2026.
//
// Đây là lý do cả sóng 0 tồn tại: hôm qua chuyển một page sang team khác chỉ làm được bằng
// psql tay. Nay người A đã giao `chuyenPageSangTeam` (`PHIEU-B-Y3` xong) và lát này nối vào.
//
// ─── VIỆC CỦA FILE NÀY MỎNG, VÌ PHẦN KHÓ NẰM Ở ĐẤT NGƯỜI A ─────────────────────────────
// `src/db/chuyen-team.js` đã lo trọn phần khó, và lo tốt hơn thứ B tự viết được:
//   · một GIAO DỊCH cho page + toàn bộ con (hội thoại, kịch bản, sản phẩm…)
//   · `FOR UPDATE` trên dòng page — hai người bấm cùng lúc không giẫm nhau
//   · từ chối team ĐÍCH là team kỹ thuật (chuyển vào đó là làm page tàng hình)
//   · đòi vai `quan-tri` TRONG team đang đứng, tra thẳng bảng `thanh_vien_team`
//   · ghi `nhat_ky` NGAY TRONG giao dịch — ghi hỏng là cuộn lại tất
//   · trả về `daChuyen` và `boLai` để con số bỏ lại HIỆN RA, không âm thầm
//
// ⛔ NÊN FILE NÀY **KHÔNG** GHI NHẬT KÝ. Hàm của A đã ghi rồi; ghi thêm một dòng nữa là đẻ
//    hai bản ghi cho một thao tác, và người đọc nhật ký sau này đếm gấp đôi.
//
// ─── CHUYỂN NHIỀU PAGE: KHÔNG DỪNG Ở LỖI ĐẦU TIÊN ──────────────────────────────────────
// 514 page đang dồn ở một team. Người ta sẽ chọn hàng chục page rồi bấm một lần. Nếu page
// thứ ba hỏng mà cả mẻ dừng lại thì hai page đầu đã chuyển, phần còn lại thì chưa, và màn
// hình chỉ nói «lỗi» — người dùng không biết mình đang đứng ở đâu. Nên: chạy hết, và trả về
// kết quả TỪNG PAGE. Mỗi page là một giao dịch riêng của A; giữa các page không có giao dịch
// bao ngoài, và đó là điều đúng — chuyển được page nào thì page đó xong hẳn.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { BANG_PAGE, BANG_TEAM, LoiCauHinhTeam, congTruyVan, congDanhTinh } from './kho-team.js';

/** Vai chuyển được page. Hàm của A cũng tự kiểm lại — hai lớp, cố ý. */
export const VAI_CHUYEN_DUOC = Object.freeze([VAI.QUAN_TRI]);

/** Trần một mẻ. Không phải giới hạn kỹ thuật — là để một cú bấm nhầm không dời 514 page. */
export const TOI_DA_MOT_ME = 100;

let _chuyenPage = null;

/**
 * Nối hàm chuyển page của người A (`src/db/chuyen-team.js#chuyenPageSangTeam`).
 * Chưa nối → lát này báo «chưa mở được» kèm lý do, KHÔNG giả vờ chuyển rồi im.
 */
export function datChuyenPage(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datChuyenPage cần một hàm');
  _chuyenPage = fn || null;
  return _chuyenPage;
}

export const daNoiChuyenPage = () => typeof _chuyenPage === 'function';

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * Các team CHUYỂN SANG ĐƯỢC: team nghiệp vụ, trừ team đang mở.
 * Team kỹ thuật không có ở đây — hàm của A cũng từ chối, nhưng hiện nó ra rồi để người ta
 * bấm và nhận lỗi thì tệ hơn là không hiện.
 */
export async function danhSachTeamDich(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const dt = congDanhTinh();
  const ds = await dt.chon(BANG_TEAM, {}, { sapXep: 'ten' });
  return ds
    .filter((t) => t.la_ky_thuat !== true && String(t.id) !== String(bc.teamId))
    .map((t) => ({ teamId: String(t.id), slug: t.slug, ten: t.ten }));
}

/** Page của team đang mở, để chọn. Tìm theo tên hoặc id Facebook. */
export async function pageDeChuyen(boiCanh, { tim = '', gioiHan = 200 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const tatCa = await db.chon(BANG_PAGE, {}, { sapXep: 'ten' });
  const t = String(tim || '').trim().toLowerCase();
  const khop = t
    ? tatCa.filter((p) => [p.ten, p.page_id, p.thi_truong, p.marketer]
      .some((v) => String(v == null ? '' : v).toLowerCase().includes(t)))
    : tatCa;
  return {
    page: khop.slice(0, gioiHan).map((p) => ({
      id: String(p.id),
      pageId: String(p.page_id || ''),
      ten: p.ten || '',
      thiTruong: p.thi_truong || '',
      botAiBat: p.bot_ai_bat === true,
    })),
    soKhop: khop.length,
    soTong: tatCa.length,
    catBot: khop.length > gioiHan ? khop.length - gioiHan : 0,
  };
}

/* ─────────────────────────── ghi ─────────────────────────── */

export class LoiChuyenPage extends Error {
  constructor(thongDiep, ma = 'chuyen_page', status = 400) {
    super(thongDiep);
    this.name = 'LoiChuyenPage';
    this.ma = ma;
    this.status = status;
  }
}

/**
 * Chuyển một mẻ page sang team khác.
 *
 * Trả về kết quả TỪNG PAGE — `{ pageId, xong, loi?, daChuyen?, boLai? }`. Nơi gọi hiện đủ
 * cả phần xong lẫn phần hỏng; gộp thành một chữ «lỗi» là lấy mất thông tin người ta cần để
 * biết phải làm gì tiếp.
 */
export async function chuyenNhieuPage(boiCanh, { pageIds, teamDichId, lyDo = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_CHUYEN_DUOC);

  if (!_chuyenPage) {
    throw new LoiChuyenPage(
      'chưa nối hàm chuyển page của người A (`chuyenPageSangTeam`) — máy chủ dựng thiếu một dây.',
      'chua_noi', 500,
    );
  }
  const ds = [...new Set((Array.isArray(pageIds) ? pageIds : []).map(String).filter(Boolean))];
  if (!ds.length) throw new LoiChuyenPage('chưa chọn page nào.', 'thieu_tham_so');
  if (!teamDichId) throw new LoiChuyenPage('chưa chọn team đích.', 'thieu_tham_so');
  if (String(teamDichId) === String(bc.teamId)) {
    throw new LoiChuyenPage('team đích trùng team đang mở — không có gì để chuyển.', 'trung_team');
  }
  if (ds.length > TOI_DA_MOT_ME) {
    throw new LoiChuyenPage(
      `một mẻ tối đa ${TOI_DA_MOT_ME} page, đang chọn ${ds.length}. Chia nhỏ ra — trần này để `
      + 'một cú bấm nhầm không dời cả kho page.',
      'qua_nhieu',
    );
  }

  const ketQua = [];
  for (const id of ds) {
    try {
      const kq = await _chuyenPage(bc, { pageId: id, teamDichId: String(teamDichId), lyDo });
      ketQua.push({
        pageId: id, xong: true,
        teamCu: kq?.teamCu ?? null, teamMoi: kq?.teamMoi ?? null,
        daChuyen: kq?.daChuyen || {}, boLai: kq?.boLai || {},
      });
    } catch (e) {
      // Chạy tiếp. Xem khối chú thích đầu file: dừng giữa chừng để lại một trạng thái
      // nửa vời mà màn hình không mô tả nổi.
      ketQua.push({ pageId: id, xong: false, loi: e?.message || String(e), ma: e?.ma || null });
    }
  }

  const xong = ketQua.filter((r) => r.xong);
  // Cộng dồn số dòng con đã đi theo và số dòng cố ý bỏ lại — hai con số này là thứ người
  // dùng cần thấy để tin rằng hội thoại đã đi theo page.
  const gop = (lay) => ketQua.reduce((acc, r) => {
    for (const [bang, n] of Object.entries(r[lay] || {})) acc[bang] = (acc[bang] || 0) + n;
    return acc;
  }, {});

  return {
    soChon: ds.length,
    soXong: xong.length,
    soHong: ds.length - xong.length,
    daChuyen: gop('daChuyen'),
    boLai: gop('boLai'),
    ketQua,
  };
}
