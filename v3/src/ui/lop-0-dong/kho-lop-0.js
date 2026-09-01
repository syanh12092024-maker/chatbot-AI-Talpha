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
/**
 * GHI hẹp hơn ĐỌC. `01-QUYET-DINH.md` §9: kịch bản do NGƯỜI viết thì áp thẳng, không cần
 * duyệt — nên marketer sửa được mẫu của mình. `quan-ly` chỉ xem: vai đó đọc số để quyết,
 * không phải người soạn lời bot nói.
 */
export const VAI_GHI_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);

/**
 * MÃ luật của lớp từ-khoá đang chạy (`src/chat/lop-tu-khoa.js`) — mẫu mang đúng một trong
 * các mã này thì bộ đếm `so_lan_chan` mới cộng được, vì `handler-v3` đếm theo `tk.rule`.
 * Mẫu mang mã lạ vẫn lưu được (người ta có thể chuẩn bị trước cho luật sắp thêm), nhưng
 * màn phải NÓI RA rằng nó sẽ không bao giờ được đếm — im lặng thì người dùng tưởng lớp
 * này không chặn được gì.
 */
export const MA_DEM_DUOC = Object.freeze(['that_gia', 'hoi_size', 'howto']);

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

let _pheuNhatKy = null;
export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiLop0('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null; return _pheuNhatKy;
}
async function ghiNhatKy(bc, banGhi) {
  // Mẫu 0 đồng là LỜI BOT NÓI VỚI KHÁCH — sửa mà không truy ngược được là không sửa.
  if (!_pheuNhatKy) {
    throw new LoiLop0('chưa nối phễu nhật ký — từ chối ghi vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/** Chuẩn hoá bộ từ khoá: nhận mảng hoặc chuỗi ngăn bằng dấu phẩy/xuống dòng. */
export function chuanTuKhoa(v) {
  const ds = Array.isArray(v) ? v : String(v || '').split(/[,\n]/);
  return [...new Set(ds.map((x) => String(x).trim().toLowerCase()).filter(Boolean))];
}

/**
 * Tạo hoặc sửa MỘT mẫu 0 đồng. Cùng một cửa cho cả hai để không có hai luật hợp lệ.
 *
 * KHÔNG cho sửa `so_lan_chan`/`chan_lan_cuoi` từ đây: đó là số ĐO ĐƯỢC của đường chat, sửa
 * tay là làm hỏng chính con số dùng để nghiệm thu «chặn ≥33% lưu lượng».
 */
export async function luuMau(boiCanh, { ma, ten, tuKhoa, noiDung, bat, nhomSp } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const vai = Array.isArray(bc.vai) ? bc.vai : [];
  if (!vai.some((v) => VAI_GHI_DUOC.includes(v))) {
    throw new LoiLop0('vai này chỉ được XEM mẫu 0 đồng, không được sửa.', 'thieu_vai', 403);
  }
  const maChuan = String(ma || '').trim();
  if (!maChuan) throw new LoiLop0('thiếu `ma` — mẫu phải có mã để bộ đếm cộng vào.', 'thieu_ma');
  const noi = String(noiDung || '').trim();
  if (!noi) throw new LoiLop0('mẫu rỗng thì lớp 0 đồng trả lời khách bằng gì?', 'thieu_noi_dung');
  const tk = chuanTuKhoa(tuKhoa);
  if (!tk.length) throw new LoiLop0('mẫu không có từ khoá nào thì không bao giờ khớp.', 'thieu_tu_khoa');

  const db = truyVan(bc);
  const dangCo = (await db.chon(BANG, { ma: maChuan }))[0] || null;
  const truong = {
    ma: maChuan,
    ten: String(ten || maChuan).trim(),
    tu_khoa: tk,
    noi_dung: noi,
    bat: bat === true,
    bat_cho_nhom_sp: chuanTuKhoa(nhomSp),
    nguoi_sua: String(bc.tenDangNhap || bc.nguoiDungId || ''),
  };

  let dong;
  if (dangCo) {
    await db.sua(BANG, { id: dangCo.id }, { ...truong, sua_luc: new Date() });
    dong = (await db.chon(BANG, { id: dangCo.id }))[0];
  } else {
    dong = await db.them(BANG, truong);
  }
  await ghiNhatKy(bc, {
    hanhDong: dangCo ? 'sua_mau_0_dong' : 'tao_mau_0_dong',
    doiTuongLoai: BANG,
    doiTuongId: String(dong?.id ?? maChuan),
    sau: { ma: maChuan, bat: truong.bat, so_tu_khoa: tk.length },
    ghiChu: `${dangCo ? 'sửa' : 'tạo'} mẫu 0 đồng \`${maChuan}\` — ${truong.bat ? 'BẬT' : 'tắt'}`,
  });
  return {
    ok: true,
    taoMoi: !dangCo,
    mau: { id: String(dong?.id ?? ''), ma: maChuan, bat: truong.bat, tuKhoa: tk },
    demDuoc: MA_DEM_DUOC.includes(maChuan),
    canhBao: MA_DEM_DUOC.includes(maChuan) ? null
      : `Mã \`${maChuan}\` không nằm trong bộ luật của lớp từ-khoá đang chạy `
        + `(${MA_DEM_DUOC.join(' · ')}) ⇒ mẫu lưu được nhưng \`so_lan_chan\` sẽ KHÔNG BAO GIỜ tăng.`,
  };
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
      // Mẫu mang mã ngoài bộ luật đang chạy sẽ không bao giờ được đếm — nói ra.
      soMauKhongDemDuoc: mau.filter((m) => !MA_DEM_DUOC.includes(m.ma)).length,
    },
    maDemDuoc: MA_DEM_DUOC,
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
