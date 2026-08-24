// GHI THÀNH VIÊN VÀ VAI — hai thao tác DUY NHẤT của màn «Cấu hình team» có ghi xuống CSDL.
//
// Phạm vi hẹp, cố ý: chỉ `thanh_vien_team`, chỉ thêm một dòng cấp quyền và bớt một dòng cấp
// quyền. KHÔNG tạo người dùng, KHÔNG đổi mật khẩu, KHÔNG sửa bảng `vai`, KHÔNG tạo team.
// Ba thứ đó là danh mục nền — xem khối chú thích đầu `noi-day/cong-danh-tinh.js`.
//
// ─── BA RÀO, VÀ VÌ SAO TỪNG CÁI ─────────────────────────────────────────────────────────
//
// ① CHỈ `quan-tri` GỌI ĐƯỢC. Cấp quyền cho người khác là quyền mạnh nhất trong hệ này: ai
//    làm được việc đó thì tự cấp cho mình mọi vai còn lại.
//
// ② KHÔNG TỰ RÚT VAI QUẢN TRỊ CUỐI CÙNG CỦA TEAM. Không có rào này thì một quản trị bấm
//    nhầm là team đó KHÔNG CÒN AI cấu hình được nữa, và không có màn nào để sửa — phải quay
//    lại psql tay, đúng thứ màn này sinh ra để xoá. Rào này đếm trên CẢ TEAM, không phải chỉ
//    trên người đang bấm: rút vai của quản trị KHÁC mà họ là người cuối cùng cũng chặn.
//
// ③ VAI PHẢI TRA RA TỪ BẢNG `vai`. Nơi gọi gửi lên MÃ vai (`'marketer'`), file này tra ra
//    `vai_id`. Không nhận `vai_id` thô từ trình duyệt: id là số, gõ nhầm một chữ số thì gán
//    trúng một vai khác mà không có gì kêu. Mã vai gõ sai thì không tra ra và bị chặn ngay.
//
// Mọi lượt ghi đều ghi `nhat_ky`. Ghi hỏng thì KHÔNG nuốt — thao tác cấp quyền mà không truy
// ngược được là thao tác không được phép làm.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { BANG_THANH_VIEN, BANG_VAI, BANG_NGUOI_DUNG, LoiCauHinhTeam } from './kho-team.js';

export const HANH_DONG_THEM = 'them_thanh_vien';
export const HANH_DONG_BOT = 'bot_thanh_vien';

export class LoiRutQuanTriCuoi extends Error {
  constructor() {
    super('Không rút được vai Quản trị cuối cùng của team — rút xong thì không còn ai cấu hình '
      + 'được team này, và không có màn hình nào để sửa. Cấp vai Quản trị cho người khác trước.');
    this.name = 'LoiRutQuanTriCuoi';
    this.ma = 'quan_tri_cuoi';
    this.status = 409;
  }
}

/* ─── phễu tiêm: cổng danh tính và nhật ký (không import chéo) ─── */

let _congDanhTinh = null;
let _pheuNhatKy = null;

export function datCongDanhTinh(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datCongDanhTinh cần một hàm');
  _congDanhTinh = fn || null;
  return _congDanhTinh;
}

export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

export const daNoiDanhTinhGhi = () => typeof _congDanhTinh === 'function';
export const daNoiPheuNhatKyTeam = () => typeof _pheuNhatKy === 'function';

function cong() {
  if (!_congDanhTinh) {
    throw new LoiCauHinhTeam('chưa nối cổng danh tính cho tầng ghi thành viên', 'chua_noi');
  }
  return _congDanhTinh();
}

/**
 * Ghi nhật ký — CÓ NÉM RA NGOÀI, khác hẳn `ghiNhatKyDieuPhoi`.
 * Bên bảng điều phối, nhật ký hỏng không được biến một lần chặn 403 thành 500. Ở đây thì
 * ngược lại: đây là thao tác CẤP QUYỀN. Cấp quyền xong mà không ghi được ai cấp cho ai lúc
 * nào thì thao tác đó không nên xảy ra.
 */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiCauHinhTeam('chưa nối phễu nhật ký — từ chối ghi thành viên vì không truy ngược được', 'chua_noi');
  }
  return _pheuNhatKy(bc, banGhi);
}

/* ─── tra cứu ─── */

async function traVai(maVai) {
  const dt = cong();
  const dong = await dt.mot(BANG_VAI, { ma: String(maVai) });
  if (!dong) {
    throw new LoiCauHinhTeam(`không có vai mã "${maVai}" trong bảng \`vai\`.`, 'vai_la');
  }
  return { id: String(dong.id), ma: dong.ma };
}

async function traNguoi(nguoiDungId) {
  const dt = cong();
  const dong = await dt.mot(BANG_NGUOI_DUNG, { id: String(nguoiDungId) });
  if (!dong) throw new LoiCauHinhTeam(`không có người dùng id=${nguoiDungId}.`, 'khong_co_nguoi');
  return dong;
}

/** Đếm số dòng cấp vai `quan-tri` đang có trong team — dùng cho rào ②. */
async function demQuanTri(teamId) {
  const dt = cong();
  const vaiQt = await traVai(VAI.QUAN_TRI);
  const dong = await dt.chon(BANG_THANH_VIEN, { team_id: String(teamId), vai_id: vaiQt.id });
  return { so: dong.length, vaiId: vaiQt.id, dong };
}

/* ─── hai thao tác ─── */

/**
 * Cấp một vai cho một người trong TEAM ĐANG MỞ.
 * Đã có sẵn dòng đó → không nhân đôi (`ON CONFLICT DO NOTHING` ở cổng), trả `daCo: true`.
 */
export async function themThanhVien(boiCanh, { nguoiDungId, maVai } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);                       // rào ①
  if (!nguoiDungId) throw new LoiCauHinhTeam('thiếu nguoiDungId', 'thieu_tham_so');
  if (!maVai) throw new LoiCauHinhTeam('thiếu mã vai', 'thieu_tham_so');

  const nguoi = await traNguoi(nguoiDungId);
  const vai = await traVai(maVai);                    // rào ③
  const dt = cong();

  const truoc = await dt.mot(BANG_THANH_VIEN, {
    team_id: bc.teamId, nguoi_dung_id: String(nguoiDungId), vai_id: vai.id,
  });
  if (truoc) {
    return { daCo: true, capId: String(truoc.id), nguoiDungId: String(nguoiDungId), maVai: vai.ma };
  }

  // Trigger `tg_chan_tv_team_ky_thuat` chặn team kỹ thuật ở tầng CSDL; cổng danh tính dịch
  // nó thành `LoiTeamKyThuat` có mã và câu người đọc được.
  const dong = await dt.them(BANG_THANH_VIEN, {
    team_id: bc.teamId, nguoi_dung_id: String(nguoiDungId), vai_id: vai.id,
  });

  await ghi(bc, {
    hanhDong: HANH_DONG_THEM,
    doiTuongLoai: BANG_THANH_VIEN,
    doiTuongId: dong ? String(dong.id) : null,
    sau: { nguoi_dung_id: String(nguoiDungId), email: nguoi.email, vai: vai.ma, team_id: bc.teamId },
    ghiChu: `cấp vai ${vai.ma} cho ${nguoi.email}`,
  });

  return { daCo: false, capId: dong ? String(dong.id) : null, nguoiDungId: String(nguoiDungId), maVai: vai.ma };
}

/**
 * Rút một vai của một người trong TEAM ĐANG MỞ.
 * Không có dòng đó → trả `0`, KHÔNG ném: «không có gì để rút» không phải lỗi của người bấm.
 */
export async function botThanhVien(boiCanh, { nguoiDungId, maVai } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, VAI.QUAN_TRI);                       // rào ①
  if (!nguoiDungId) throw new LoiCauHinhTeam('thiếu nguoiDungId', 'thieu_tham_so');
  if (!maVai) throw new LoiCauHinhTeam('thiếu mã vai', 'thieu_tham_so');

  const nguoi = await traNguoi(nguoiDungId);
  const vai = await traVai(maVai);                    // rào ③
  const dt = cong();

  // RÀO ② — đếm TRƯỚC khi xoá. Đếm sau thì đã muộn.
  if (vai.ma === VAI.QUAN_TRI) {
    const { so } = await demQuanTri(bc.teamId);
    const dangCo = await dt.mot(BANG_THANH_VIEN, {
      team_id: bc.teamId, nguoi_dung_id: String(nguoiDungId), vai_id: vai.id,
    });
    if (dangCo && so <= 1) throw new LoiRutQuanTriCuoi();
  }

  const soXoa = await dt.xoa(BANG_THANH_VIEN, {
    team_id: bc.teamId, nguoi_dung_id: String(nguoiDungId), vai_id: vai.id,
  });
  if (!soXoa) return { soXoa: 0, nguoiDungId: String(nguoiDungId), maVai: vai.ma };

  await ghi(bc, {
    hanhDong: HANH_DONG_BOT,
    doiTuongLoai: BANG_THANH_VIEN,
    doiTuongId: null,
    truoc: { nguoi_dung_id: String(nguoiDungId), email: nguoi.email, vai: vai.ma, team_id: bc.teamId },
    ghiChu: `rút vai ${vai.ma} của ${nguoi.email}`,
  });

  return { soXoa, nguoiDungId: String(nguoiDungId), maVai: vai.ma };
}
