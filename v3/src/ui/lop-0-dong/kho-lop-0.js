// TẦNG ĐỌC CỦA MÀN «LỚP TRẢ LỜI 0 ĐỒNG» (G2-D4, sóng 2 — làm ở sóng 4).
//
// Yêu cầu: *«Mẫu miễn phí + đối chiếu bộ từ khoá Botcake»*.
//
// ═══ LỚP NÀY LÀ CHỖ TIẾT KIỆM TIỀN, KHÔNG PHẢI CHỖ TRẢ LỜI HAY ══════════════════════
// Mỗi câu bắt được ở đây là một lượt gọi model KHÔNG xảy ra. Đo ở màn Chi phí: 127 đ/tin.
// Nên con số quan trọng nhất của màn là **số lần chặn**, không phải số mẫu.
//
// ═══ BẢNG CÓ, DÒNG CHƯA CÓ ═════════════════════════════════════════════════════════
// Người A giao `mau_0_dong` ở migration 012 (đúng `PHIEU-B-Y6` ⓑ). Đo 28/08: **0 dòng**.
// Bảng có mà rỗng là «chưa ai nhập mẫu», KHÁC hẳn «không có bảng» — và cũng khác «lớp này
// không chặn được gì». Màn phải nói đúng cái nào.
//
// ═══ ĐỐI CHIẾU BOTCAKE: CHƯA CÓ NGUỒN ═════════════════════════════════════════════
// Vế thứ hai của yêu cầu đòi so bộ từ khoá của lớp này với bộ từ khoá Botcake — để biết chỗ
// nào hai bên cùng bắt (thừa) và chỗ nào không bên nào bắt (lọt). v3 chưa có đường đọc bộ từ
// khoá Botcake. Màn khai thẳng vế đó chưa làm được, thay vì im lặng chỉ hiện vế một.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG = 'mau_0_dong';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Giá một lượt gọi model tránh được, đồng. Đo ở màn Chi phí AI 26/08. */
export const VND_MOI_TIN = 127;

export class LoiLop0 extends Error {
  constructor(thongDiep, ma = 'lop_0_dong', status = 400) {
    super(thongDiep);
    this.name = 'LoiLop0';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiLop0('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export const daNoiLop0 = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiLop0('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

export async function manLop0(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const ds = await truyVan(bc).chon(BANG, {}, { sapXep: 'ma' });

  const mau = ds.map((m) => ({
    id: String(m.id),
    ma: m.ma || '',
    ten: m.ten || '',
    bat: m.bat === true,
    tuKhoa: Array.isArray(m.tu_khoa) ? m.tu_khoa
      : String(m.tu_khoa || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean),
    soLanChan: Number(m.so_lan_chan || 0),
    chanLanCuoi: m.chan_lan_cuoi || null,
    nhomSp: m.bat_cho_nhom_sp || null,
    daiNoiDung: String(m.noi_dung || '').length,
  }));

  const bat = mau.filter((m) => m.bat);
  const tongChan = mau.reduce((s, m) => s + m.soLanChan, 0);

  return {
    teamId: bc.teamId,
    mau,
    dem: {
      tongMau: mau.length,
      dangBat: bat.length,
      tongChan,
      // Con số đáng nói nhất: chặn được bấy nhiêu lượt tức là KHÔNG tốn bấy nhiêu tiền.
      tienTietKiem: tongChan * VND_MOI_TIN,
      vndMoiTin: VND_MOI_TIN,
      soMauChuaChanLanNao: bat.filter((m) => m.soLanChan === 0).length,
    },
    botcake: {
      doiChieuDuoc: false,
      noi: 'v3 chưa có đường đọc bộ từ khoá Botcake, nên chưa so được hai bên.',
      viSaoCan: 'So để biết chỗ nào CẢ HAI cùng bắt (thừa một lớp) và chỗ nào KHÔNG bên nào '
        + 'bắt (khách hỏi mà không ai trả lời). Thiếu phép so này thì không biết lớp 0 đồng '
        + 'đang bù chỗ nào cho Botcake.',
    },
    trong: mau.length ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Bảng `mau_0_dong` CÓ nhưng chưa có mẫu nào — chưa ai nhập.',
      diTiep: `Mỗi câu bắt được ở lớp này là một lượt gọi model không xảy ra, tức ${VND_MOI_TIN} đ `
        + 'tiết kiệm. Bảng rỗng nghĩa là lớp này chưa chặn gì cả — KHÔNG phải là nó chặn không hiệu quả.',
    },
  };
}
