// TẦNG ĐỌC CỦA MÀN «NHẬT KÝ THAO TÁC» (G2-E5, sóng 3).
//
// ═══ MÀN NÀY MỎNG NHẤT SÓNG 3, VÌ MODULE ĐỌC ĐÃ CÓ TỪ L0-M4 ════════════════════════════
// `v3/src/audit/index.js#docNhatKy` đã lo trọn phần khó: lớp team hai lớp, chặn xuyên team
// có ghi dấu, lọc theo mã hành động / người / đối tượng / khoảng ngày, cắt trang. Màn này
// chỉ gộp thêm nhãn tiếng Việt và một phép đếm theo nhóm.
//
// ═══ MỘT VIỆC RIÊNG CỦA MÀN NÀY: TÁCH «VIỆC NGƯỜI LÀM» KHỎI «VIỆC MÁY ĐỌC» ═════════════
// Đo trên `aicloser_v3` 25/08: **1.043 dòng nhật ký, và 1.043 dòng trong đó là `doc`** —
// tức là 100% cuốn sổ là dấu vết của việc tầng truy vấn ĐỌC dữ liệu qua `ctxHeThong()`, chứ
// không phải việc ai đó làm gì. (Một lượt chạy hàng loạt đẻ 1.031 dòng `ky_nang` trong 110
// phút.) `01-QUYET-DINH.md` §9 đòi «ghi cả việc máy làm» nên chúng ĐÚNG là phải có — nhưng
// trộn chung thì mỗi dòng «ai bật bot cho page nào» bị chôn dưới hàng trăm dòng vô nghĩa.
//
// Nên màn TÁCH HAI LÀN, và **mặc định mở ở làn việc người**:
//   · làn NGƯỜI — thao tác có người bấm. Đây là thứ 99% lượt mở màn này đang đi tìm.
//   · làn MÁY   — việc nền và dấu vết đọc. Vẫn xem được, chỉ là không nằm chắn đường.
//
// ⚠️ Đây là chữa TRIỆU CHỨNG, không phải chữa bệnh. Bảng vẫn phình, và ai truy vấn thẳng
//    CSDL vẫn gặp đúng đống đó. Thuốc thật là `PHIEU-B-Y5` (cửa đọc không ghi nhật ký cho
//    đường XEM) — đang chờ người A.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

export class LoiManNhatKy extends Error {
  constructor(thongDiep, ma = 'nhat_ky', status = 400) {
    super(thongDiep);
    this.name = 'LoiManNhatKy';
    this.ma = ma;
    this.status = status;
  }
}

/** Hai làn. `tat_ca` có, nhưng KHÔNG phải mặc định — xem khối chú thích đầu file. */
export const LAN = Object.freeze({ NGUOI: 'nguoi', MAY: 'may', TAT_CA: 'tat_ca' });
export const CHU_LAN = Object.freeze({
  nguoi: 'Việc người làm',
  may: 'Việc máy làm',
  tat_ca: 'Tất cả',
});

export const MOI_TRANG = 100;

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _docNhatKy = null;
let _moTa = null;
let _nhomMa = null;

/**
 * Nối bộ đọc của L0-M4 (`v3/src/audit/index.js`). Tiêm chứ không import chéo — bốn module
 * của vai B cố ý không biết nhau, và màn này là module thứ năm.
 */
export function datDocNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiManNhatKy('datDocNhatKy cần một hàm');
  _docNhatKy = fn || null;
  return _docNhatKy;
}

/** Bản đồ mã → chữ tiếng Việt, và các nhóm để dựng bộ lọc. */
export function datDanhMuc({ moTa, nhom } = {}) {
  if (moTa != null && typeof moTa !== 'function') throw new LoiManNhatKy('datDanhMuc: `moTa` phải là hàm');
  _moTa = moTa || null;
  _nhomMa = nhom || null;
  return { moTa: _moTa, nhom: _nhomMa };
}

export const daNoiDocNhatKy = () => typeof _docNhatKy === 'function';

/* ─────────────────────────── đọc ─────────────────────────── */

/** `tac_nhan` của người A có dạng `nguoi:<email>` | `may:<job>`. Tách vế đầu. */
export const lanCua = (d) => (String(d.tac_nhan || '').startsWith('may:') ? LAN.MAY : LAN.NGUOI);

export async function manNhatKy(boiCanh, { lan = LAN.NGUOI, hanhDong = '', trang = 0 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!Object.values(LAN).includes(lan)) {
    throw new LoiManNhatKy(`làn lạ: "${lan}" (có: ${Object.values(LAN).join(', ')})`, 'lan_la');
  }
  if (!_docNhatKy) {
    throw new LoiManNhatKy('chưa nối bộ đọc nhật ký (L0-M4) — máy chủ dựng thiếu một dây.', 'chua_noi', 500);
  }

  // Bộ đọc của L0-M4 không lọc theo LÀN (nó lọc theo mã hành động, người, đối tượng). Lọc
  // làn ở đây trong JS — `tac_nhan` là một cột chuỗi có tiền tố, không phải cột phân loại.
  //
  // ⚠️ GIÁ: phải kéo về nhiều hơn số cần hiện. Lấy dư gấp năm rồi cắt, và KHAI RA khi phép
  //    cắt có thể đã bỏ sót — thà nói «có thể còn nữa» hơn là hiện một trang trông như đủ.
  const xin = MOI_TRANG * 5;
  const { dong, tong } = await _docNhatKy(bc, {
    hanhDong: hanhDong || undefined,
    gioiHan: xin,
    buoc: 0,
  });

  const loc = lan === LAN.TAT_CA ? dong : dong.filter((d) => lanCua(d) === lan);
  const soTrang = Math.max(1, Math.ceil(loc.length / MOI_TRANG));
  const t = Math.min(Math.max(0, Number(trang) || 0), soTrang - 1);

  const dem = { nguoi: 0, may: 0 };
  for (const d of dong) dem[lanCua(d)]++;

  return {
    teamId: bc.teamId,
    dong: loc.slice(t * MOI_TRANG, (t + 1) * MOI_TRANG).map(gon),
    trang: t,
    soTrang,
    soKhop: loc.length,
    // `tong` là tổng của CẢ bảng theo bộ lọc mã, chưa trừ làn. Hiện cả hai để người đọc
    // biết mình đang nhìn một lát cắt, không phải toàn bộ.
    tongCaBang: tong,
    dem,
    catBot: tong > xin,
    lan,
    chuLan: CHU_LAN,
    nhomMa: _nhomMa || null,
    canhBao: canhBaoNhatKy({ dem, tong }),
  };
}

function gon(d) {
  const ma = d.hanh_dong;
  return {
    id: String(d.id ?? ''),
    thoiGian: d.thoi_gian ?? d.xay_ra_luc ?? null,
    lan: lanCua(d),
    tacNhan: d.tac_nhan || '',
    // `nguoi:<email>` → `<email>`; `may:<job>` → `<job>`. Hiện nguyên `may:tang-truy-van`
    // thì người đọc phải tự dịch mỗi dòng.
    ai: String(d.tac_nhan || '').replace(/^(nguoi|may):/, '') || '(không rõ)',
    hanhDong: ma,
    chuHanhDong: _moTa ? _moTa(ma) : ma,
    doiTuong: d.doi_tuong_loai ?? d.doi_tuong ?? null,
    doiTuongId: d.doi_tuong_id ?? null,
    ghiChu: d.ghi_chu || '',
    truoc: d.truoc ?? null,
    sau: d.sau ?? null,
  };
}

/**
 * Cảnh báo về CHÍNH CUỐN SỔ. Một cuốn sổ mà 99% số dòng là «có người mở ra xem» thì không
 * ai đọc nó nữa — và đó là hỏng công cụ điều tra, không phải hỏng hiệu năng.
 */
export function canhBaoNhatKy({ dem, tong }) {
  const ra = [];
  const tongLan = dem.nguoi + dem.may;
  if (!tongLan) return ra;
  const tiLeMay = dem.may / tongLan;
  if (tiLeMay >= 0.9) {
    ra.push({
      ma: 'ngap_dong_may', muc: 'vang',
      chu: `${Math.round(tiLeMay * 100)}% số dòng gần đây là việc MÁY (phần lớn là dấu vết `
        + '`doc` của tầng truy vấn). Mỗi dòng thao tác thật đang bị chôn dưới hàng trăm dòng '
        + 'như vậy, và `nhat_ky` cấm xoá ở tầng CSDL nên không dọn lại được. '
        + 'Thuốc thật: `PHIEU-B-Y5` — cửa đọc không ghi nhật ký cho đường XEM.',
    });
  }
  if (!dem.nguoi) {
    ra.push({
      ma: 'khong_co_viec_nguoi', muc: 'tin',
      chu: 'Chưa có thao tác nào do người bấm trong khoảng đang xem — đây là «chưa ai làm gì», '
        + 'KHÔNG phải «nhật ký hỏng».',
    });
  }
  return ra;
}
