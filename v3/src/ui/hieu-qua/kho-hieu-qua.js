// TẦNG ĐỌC CỦA MÀN «HIỆU QUẢ KỊCH BẢN» (G2-G3, sóng 3 — làm ở sóng 4).
//
// Yêu cầu: *«A/B hai bản cạnh nhau theo phễu · **chưa đủ mẫu thì nói rõ chưa kết luận**»*.
//
// ═══ MÀN NÀY KHÔNG TỰ TÍNH — GỌI HÀM CỦA NGƯỜI A ══════════════════════════════════════
// `src/db/so-lieu.js#hieuQuaKichBan` đã làm đúng phần khó nhất: nó trả `tiLeChot: null` khi
// chưa đủ mẫu, thay vì trả số rồi dặn màn hình «nhớ ẩn đi». Chú thích của A ghi thẳng: *«Trả
// tỉ lệ rồi dặn màn hình nhớ ẩn đi là mời người ta quên»*. Tự tính lại ở đây là dựng bản thứ
// hai của đúng cái luật ấy — và bản thứ hai bao giờ cũng là bản trôi.
//
// ═══ HÔM NAY CHƯA CÓ GÌ ĐỂ SO, VÀ ĐÓ LÀ HAI LÝ DO KHÁC NHAU ══════════════════════════
// Đo 28/08: `so_ai` **0 dòng**, và `kich_ban` chỉ có `LIVE` + `ARCHIVED` — không bản nào ở
// `DRAFT`/`REVIEW`. Tức thiếu CẢ HAI vế:
//   · không có SỐ LIỆU  (`so_ai` rỗng — bot chạy nhưng chưa ghi vào sổ của v3)
//   · không có HAI BẢN để so (mỗi page đúng một bản LIVE)
// Gộp hai lý do đó thành một câu «chưa đủ dữ liệu» là giấu mất việc phải làm — chúng cần hai
// người khác nhau sửa.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_SO_AI = 'so_ai';
export const BANG_KICH_BAN = 'kich_ban';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER, VAI.DUYET_KICH_BAN]);

export class LoiHieuQua extends Error {
  constructor(thongDiep, ma = 'hieu_qua', status = 400) {
    super(thongDiep);
    this.name = 'LoiHieuQua';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docHieuQua = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiHieuQua('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
/** `hieuQuaKichBan` của người A — nguồn DUY NHẤT. Không có thì màn nói chưa nối, không tự tính. */
export function datDocHieuQua(fn) { _docHieuQua = fn || null; return _docHieuQua; }
export const daNoiHieuQua = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiHieuQua('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

export async function manHieuQua(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = truyVan(bc);

  // Hai vế phải đo RIÊNG — chúng hỏng vì hai lý do khác nhau và cần hai người khác nhau sửa.
  const [soAi, kichBan] = await Promise.all([
    db.dem(BANG_SO_AI, {}).catch(() => null),
    db.chon(BANG_KICH_BAN, {}, { gioiHan: 5000 }).catch(() => []),
  ]);

  const theoTrangThai = {};
  for (const k of kichBan) {
    const t = String(k.trang_thai ?? '(rỗng)');
    theoTrangThai[t] = (theoTrangThai[t] || 0) + 1;
  }

  let ket = null; let loi = null;
  if (_docHieuQua) {
    try { ket = await _docHieuQua(bc); } catch (e) { loi = String(e?.message || e); }
  } else loi = 'Chưa nối `hieuQuaKichBan` của tầng dữ liệu.';

  return {
    teamId: bc.teamId,
    dieuKien: [
      {
        ma: 'so_lieu', ten: 'Có số liệu để đo',
        du: (soAi ?? 0) > 0,
        so: soAi,
        noi: (soAi ?? 0) > 0
          ? `Sổ AI có ${soAi} lượt.`
          : 'Sổ `so_ai` KHÔNG có dòng nào — bot đang chạy nhưng chưa ghi vào sổ của v3.',
        diTiep: (soAi ?? 0) > 0 ? null
          : 'Lớp model phải đẩy từng lượt gọi qua phễu `datPheuSoAi`. Chừng nào chưa, mọi con '
            + 'số A/B đều là 0 — và 0 ở đây KHÔNG có nghĩa «bản nào cũng dở».',
      },
      {
        ma: 'hai_ban', ten: 'Có ít nhất hai bản để so',
        du: (ket?.dsBan?.length ?? 0) >= 2,
        so: ket?.dsBan?.length ?? 0,
        noi: `Kịch bản hiện có: ${Object.entries(theoTrangThai).map(([k, v]) => `${k} ${v}`).join(' · ') || 'chưa có bản nào'}.`,
        diTiep: (ket?.dsBan?.length ?? 0) >= 2 ? null
          : 'Mỗi page đang có đúng một bản LIVE, nên không có gì để so với gì. Muốn A/B thì '
            + 'phải có hai bản cùng chạy trên cùng tập khách.',
      },
    ],
    ketQua: ket
      ? {
          docDuoc: true,
          nguong: ket.nguong,
          dsBan: ket.dsBan || [],
          soSanhDuoc: !!ket.soSanhDuoc,
          ketLuanChung: ket.ketLuanChung ?? null,
        }
      : { docDuoc: false, noi: loi },
    trong: (ket?.dsBan?.length ?? 0) ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Chưa bản kịch bản nào có lượt nào trong Sổ AI.',
      diTiep: 'Hai điều kiện ở trên phải xong CẢ HAI thì màn này mới có việc.',
    },
  };
}
