// TẦNG ĐỌC CỦA MÀN «CẤU HÌNH TEAM» (G2-B1, sóng 0 giai đoạn 2).
//
// Màn này gỡ chặn H7 — việc «gán 514 page cho ba team» hôm nay chỉ làm được bằng psql tay.
//
// ─── LUẬT SỐ MỘT CỦA FILE NÀY: RỖNG PHẢI NÓI VÌ SAO RỖNG ────────────────────────────────
// Đã dính thật 24/08: chủ dự án đăng nhập, thấy bảng rỗng, tưởng màn hình hỏng. Sự thật là
// chưa ai gán page cho team. «Không có gì ở đây» đọc như tin mừng trong khi nó là tin dữ.
//
// Nên MỌI khối của màn này trả về một `KhoiRong` khi rỗng, và `KhoiRong` bắt buộc phân biệt:
//   · `xong`         — rỗng vì đã làm hết. Tin mừng thật.
//   · `chua_cai_dat` — rỗng vì chưa ai cài. PHẢI kèm `diTiep` chỉ đường.
// Không có trạng thái thứ ba, và không có đường trả rỗng trần. Hàm nào quên khai `vi` thì
// `khoiRong()` ném ngay tại chỗ dựng, không để nó trôi ra màn hình thành một ô trắng.
//
// ─── LUẬT SỐ HAI: KHÔNG NHÌN SANG TEAM KHÁC ─────────────────────────────────────────────
// Màn này CÓ VẺ cần đếm page của cả ba team («514 ở kia, 0 ở đây»). KHÔNG LÀM. `01-QUYET-DINH`
// §8 nói điều kiện team nằm ở tầng truy vấn, tự chèn — và tầng truy vấn của A chặn đúng như
// vậy. Đi vòng qua `boiCanhMay`/`ctxHeThong` để đếm hộ là tự tay mở đúng cái cửa hậu mà cả
// lớp team sinh ra để đóng, và mở nó ở MÀN QUẢN TRỊ thì càng khó thấy.
// Con số cả-ba-team là việc của `PHIEU-B-Y3` (một hàm đếm ở đất người A, có kiểm vai).
// Tới lúc đó màn này nói thẳng: «chỉ đếm được team đang mở».
//
// Cổng dữ liệu tiêm từ ngoài (`datTaoTruyVan`), giống ba module kia — không import chéo.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const BANG_HOI_THOAI = 'hoi_thoai';
export const BANG_MODEL = 'cau_hinh_model';
export const BANG_THANH_VIEN = 'thanh_vien_team';
export const BANG_NGUOI_DUNG = 'nguoi_dung';
export const BANG_VAI = 'vai';
export const BANG_TEAM = 'team';

export class LoiCauHinhTeam extends Error {
  constructor(thongDiep, ma = 'cau_hinh_team') {
    super(thongDiep);
    this.name = 'LoiCauHinhTeam';
    this.ma = ma;
    this.status = 400;
  }
}

/* ───────────────────────────── hai cổng tiêm từ ngoài ───────────────────────────── */

let _taoTruyVan = null;
let _congDanhTinh = null;
let _docKetNoiPos = null;

/** Cổng ĐÃ gắn điều kiện team (người A giao) — dùng cho `page`, `hoi_thoai`, `cau_hinh_model`. */
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/**
 * Cổng danh tính — bốn bảng DÙNG CHUNG (`team` `nguoi_dung` `vai` `thanh_vien_team`).
 * Bốn bảng này KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của A nên gọi cổng kia với chúng là ném.
 */
export function datCongDanhTinh(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datCongDanhTinh cần một hàm');
  _congDanhTinh = fn || null;
  return _congDanhTinh;
}

/**
 * Đọc kết nối POS của một team. Tiêm từ ngoài vì `ket_noi_pos` CHỨA BÍ MẬT và cố ý có bộ đọc
 * riêng của người A (`src/pos/ket-noi.js#lietKeThiTruong`) — không mở nó ra cho hàm đọc chung.
 * Chưa nối thì khối kết nối hiện «chưa nối bộ đọc», KHÔNG hiện «không có kết nối nào».
 */
export function datDocKetNoiPos(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiCauHinhTeam('datDocKetNoiPos cần một hàm');
  _docKetNoiPos = fn || null;
  return _docKetNoiPos;
}

export const daNoiTruyVan = () => typeof _taoTruyVan === 'function';
export const daNoiDanhTinh = () => typeof _congDanhTinh === 'function';
export const daNoiKetNoiPos = () => typeof _docKetNoiPos === 'function';

function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiCauHinhTeam('chưa nối cổng truy vấn — gọi datTaoTruyVan(taoTruyVan) lúc dựng ứng dụng', 'chua_noi');
  }
  return _taoTruyVan(bc);
}

function congDanhTinh() {
  if (!_congDanhTinh) {
    throw new LoiCauHinhTeam('chưa nối cổng danh tính — gọi datCongDanhTinh(taoCongDanhTinh) lúc dựng ứng dụng', 'chua_noi');
  }
  return _congDanhTinh();
}

/* ─────────────────────────── khối rỗng: bắt buộc khai VÌ SAO ─────────────────────────── */

export const VI_RONG = Object.freeze({
  XONG: 'xong',                   // rỗng vì đã làm hết
  CHUA_CAI_DAT: 'chua_cai_dat',   // rỗng vì chưa ai cài — phải chỉ đường đi tiếp
});
const VI_HOP_LE = new Set(Object.values(VI_RONG));

/**
 * Dựng trạng thái rỗng. `vi` bắt buộc và phải là một trong hai mã trên; `chua_cai_dat` thì
 * bắt buộc có `diTiep` — «chưa cài đặt xong» mà không chỉ đường thì cũng bằng không nói gì.
 */
export function khoiRong({ vi, noi, diTiep = null } = {}) {
  if (!VI_HOP_LE.has(vi)) {
    throw new LoiCauHinhTeam(`khoiRong: phải khai vì sao rỗng (${[...VI_HOP_LE].join(' | ')}), nhận "${vi}". `
      + 'Rỗng không lý do là thứ làm người ta ngồi chờ một hệ thống không bao giờ có việc.');
  }
  if (!noi) throw new LoiCauHinhTeam('khoiRong: thiếu câu `noi` — phải nói bằng tiếng người');
  if (vi === VI_RONG.CHUA_CAI_DAT && !diTiep) {
    throw new LoiCauHinhTeam('khoiRong: `chua_cai_dat` bắt buộc kèm `diTiep` (chữ + đường) — '
      + 'nói "chưa xong" mà không chỉ chỗ sửa thì người đọc vẫn kẹt y như cũ.');
  }
  return Object.freeze({ rong: true, vi, noi, diTiep });
}

/* ──────────────────────────────────── tổng quan team ──────────────────────────────────── */

/**
 * Số đo của TEAM ĐANG MỞ. Một mẻ đọc `page` rồi tính cả ba con số trong JS — đọc ba lần là
 * ba lần kéo trọn bảng (tầng truy vấn của A chưa có `COUNT`, xem `noi-day/cong-du-lieu-that.js`).
 */
export async function tongQuanTeam(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const dt = congDanhTinh();

  const pages = await db.chon(BANG_PAGE, {});
  const soPage = pages.length;
  const botBat = pages.filter((p) => p.bot_ai_bat === true).length;
  const coMarketer = pages.filter((p) => String(p.marketer || '').trim() !== '').length;
  const trongDiem = pages.filter((p) => p.trong_diem === true).length;

  // ⚠️ GIÁ: chưa có `COUNT` ở tầng dưới nên đây là kéo trọn `hoi_thoai` của team về đếm.
  //    Hôm nay 28.953 dòng cho team `tieu-alpha`. Chịu được ở quy mô này, KHÔNG chịu được
  //    khi lên vài trăm nghìn. Bản vá đúng: `dem()` ở tầng truy vấn — đã ghi vào PHIEU-B-Y3.
  const soHoiThoai = await db.dem(BANG_HOI_THOAI, {});
  const dongModel = await db.chon(BANG_MODEL, {});
  const thanhVien = await dt.chon(BANG_THANH_VIEN, { team_id: bc.teamId });

  return {
    teamId: bc.teamId,
    page: { tong: soPage, botBat, coMarketer, thieuMarketer: soPage - coMarketer, trongDiem },
    hoiThoai: soHoiThoai,
    model: { soDong: dongModel.length, daCauHinh: dongModel.length > 0 },
    thanhVien: thanhVien.length,
    // Cảnh báo, không phải số đo: một team ôm page mà không ai phụ trách là chỗ tiền chảy
    // mà không ai nhìn. Để màn hình khỏi phải tự suy ra luật này.
    canhBao: canhBaoTuTongQuan({ soPage, coMarketer, botBat, soDongModel: dongModel.length }),
  };
}

/** Bốn cảnh báo suy từ số đo. Suy ở ĐÂY, không suy trong HTML — để có bài test khoá lại. */
export function canhBaoTuTongQuan({ soPage, coMarketer, botBat, soDongModel }) {
  const ra = [];
  // TEAM KHÔNG CÓ PAGE NÀO — cảnh báo này là nửa còn thiếu của luật ①.
  // Ô số hiện «0 page» đọc như một sự thật trung tính, trong khi nó là dấu hiệu team chưa
  // được chia page. Không có câu này thì người mở màn Auus/Pialpha EU hôm nay thấy sáu con
  // số 0 và không biết mình phải làm gì tiếp — đúng cảnh đã dính thật 24/08.
  if (soPage === 0) {
    ra.push({
      ma: 'chua_duoc_chia_page',
      muc: 'do',
      chu: 'Team này chưa được chia page nào — nên mọi màn hình của team sẽ rỗng: không có '
        + 'hội thoại, không có việc cần xử, không có báo cáo. Đây là việc CHƯA LÀM, không '
        + 'phải «đã xong».',
    });
  }
  if (soPage > 0 && coMarketer === 0) {
    ra.push({
      ma: 'khong_ai_phu_trach',
      muc: 'do',
      chu: `${soPage} page, chưa page nào có marketer — báo cáo cắt theo marketer sẽ trống hoàn toàn.`,
    });
  } else if (soPage > 0 && coMarketer < soPage) {
    ra.push({
      ma: 'thieu_marketer',
      muc: 'vang',
      chu: `${soPage - coMarketer}/${soPage} page chưa có marketer.`,
    });
  }
  if (soDongModel === 0) {
    ra.push({
      ma: 'chua_cau_hinh_model',
      muc: 'do',
      chu: 'Team chưa chọn model AI nào — chưa có model thì bot của team này không trả lời được.',
    });
  }
  if (botBat > 0 && soDongModel === 0) {
    ra.push({
      ma: 'bot_bat_ma_khong_model',
      muc: 'do',
      chu: `${botBat} page đang BẬT bot AI trong khi team chưa cấu hình model.`,
    });
  }
  return ra;
}

/* ──────────────────────────────────── thành viên và vai ──────────────────────────────────── */

/** Năm vai, lấy từ HẰNG — cấm gõ lại chuỗi mã vai ở bất kỳ đâu (bài học ② giai đoạn 1). */
export const TEN_VAI = Object.freeze({
  [VAI.QUAN_TRI]: 'Quản trị',
  [VAI.MARKETER]: 'Marketer',
  [VAI.SALE]: 'Sale',
  [VAI.QUAN_LY]: 'Quản lý',
  [VAI.DUYET_KICH_BAN]: 'Người duyệt kịch bản',
});

/** Danh sách vai cho ô chọn trên màn hình, kèm id thật trong bảng `vai`. */
export async function danhSachVai() {
  const dt = congDanhTinh();
  const dong = await dt.chon(BANG_VAI, {}, { sapXep: 'id' });
  return dong.map((v) => ({ id: String(v.id), ma: v.ma, ten: TEN_VAI[v.ma] || v.ten || v.ma }));
}

/**
 * Thành viên của team đang mở, gộp sẵn tên + email + các vai.
 * Một người có thể mang NHIỀU vai trong cùng một team (`UNIQUE (team, người, vai)`), nên gộp
 * theo người chứ không trả mỗi dòng cấp quyền một hàng — bảng có hai dòng cùng tên người là
 * thứ ai nhìn cũng tưởng dữ liệu hỏng.
 */
export async function thanhVienCua(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const dt = congDanhTinh();

  const dongCap = await dt.chon(BANG_THANH_VIEN, { team_id: bc.teamId });
  if (!dongCap.length) {
    // Không thể là `xong`: một team không có ai thì không ai vào được, kể cả người đang xem
    // (họ đang ở đây nhờ một dòng cấp quyền, nên rỗng thật sự là dữ liệu hỏng hoặc chưa cài).
    return {
      nguoi: [],
      trong: khoiRong({
        vi: VI_RONG.CHUA_CAI_DAT,
        noi: 'Team này chưa có thành viên nào.',
        diTiep: { chu: 'Thêm thành viên đầu tiên', duong: '#them-thanh-vien' },
      }),
    };
  }

  const idNguoi = [...new Set(dongCap.map((d) => String(d.nguoi_dung_id)))];
  const idVai = [...new Set(dongCap.map((d) => String(d.vai_id)))];
  // Cổng danh tính dựng `= ANY($n)` cho mảng — hai mẻ, không N+1.
  const nguoi = await dt.chon(BANG_NGUOI_DUNG, { id: idNguoi });
  const vai = await dt.chon(BANG_VAI, { id: idVai });

  const tenVai = new Map(vai.map((v) => [String(v.id), v.ma]));
  const hoSo = new Map(nguoi.map((n) => [String(n.id), n]));

  const gop = new Map();
  for (const d of dongCap) {
    const nid = String(d.nguoi_dung_id);
    if (!gop.has(nid)) {
      const n = hoSo.get(nid) || {};
      gop.set(nid, {
        nguoiDungId: nid,
        email: n.email || '(không tra được)',
        ten: n.ten || '',
        hoatDong: n.hoat_dong !== false,
        vai: [],
      });
    }
    const ma = tenVai.get(String(d.vai_id));
    if (ma) gop.get(nid).vai.push({ ma, ten: TEN_VAI[ma] || ma, capId: String(d.id), vaiId: String(d.vai_id) });
  }

  const nguoiRa = [...gop.values()].sort((a, b) => (a.email > b.email ? 1 : a.email < b.email ? -1 : 0));
  return { nguoi: nguoiRa, trong: null };
}

/** Người dùng CHƯA ở team này — để ô «thêm thành viên» chọn. */
export async function nguoiChuaVaoTeam(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const dt = congDanhTinh();
  const dangCo = new Set((await dt.chon(BANG_THANH_VIEN, { team_id: bc.teamId }))
    .map((d) => String(d.nguoi_dung_id)));
  const tatCa = await dt.chon(BANG_NGUOI_DUNG, {}, { sapXep: 'email' });
  return tatCa
    .filter((n) => n.hoat_dong !== false)
    .map((n) => ({ nguoiDungId: String(n.id), email: n.email, ten: n.ten || '', daO: dangCo.has(String(n.id)) }));
}

/* ──────────────────────────────────── kết nối ──────────────────────────────────── */

/**
 * Kết nối POS của team đang mở. KHÔNG BAO GIỜ trả khoá — `lietKeThiTruong` của người A cố ý
 * không giải mã, và màn này cũng không có lý do gì cần khoá.
 */
export async function ketNoiCua(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docKetNoiPos) {
    // KHÁC HẲN «không có kết nối nào». Chưa nối bộ đọc là lỗi cấu hình máy chủ; báo đúng
    // như vậy chứ đừng để người dùng đi tìm kết nối bị mất.
    return {
      pos: [],
      trong: khoiRong({
        vi: VI_RONG.CHUA_CAI_DAT,
        noi: 'Máy chủ chưa nối bộ đọc kết nối POS — đây là lỗi cấu hình, không phải «không có kết nối».',
        diTiep: { chu: 'Xem cách nối ở v3/src/vai-b.js (datDocKetNoiPos)', duong: null },
      }),
    };
  }
  const pos = await _docKetNoiPos(bc);
  if (!pos.length) {
    return {
      pos: [],
      trong: khoiRong({
        vi: VI_RONG.CHUA_CAI_DAT,
        noi: 'Team này chưa có kết nối POS nào — chưa có thì không tạo được đơn cho thị trường nào.',
        diTiep: { chu: 'Nạp từ pancake-shops.json bằng `npm run di-tru`', duong: null },
      }),
    };
  }
  return { pos, trong: null };
}

/* ──────────────────────────────── gán page ↔ team (LÁT 4) ──────────────────────────────── */

/**
 * Trạng thái của việc gán page — HIỆN RA, KHÔNG GIẤU ĐI.
 *
 * Lát này đang bị chặn ở đất người A (`PHIEU-B-Y3`). Giấu nút đi thì người dùng đi tìm mãi
 * một chức năng tài liệu có hứa; hiện nút mờ kèm đúng lý do thì họ biết phải đợi ai, đợi gì.
 */
export const PHIEU_GAN_PAGE = 'PHIEU-B-Y3';
export const LY_DO_CHUA_GAN_DUOC = 'Tầng truy vấn không cho đổi cột `team_id` — `suaTheoId` bỏ '
  + 'qua nó trong im lặng, nên nút sẽ báo «đã gán» mà không có gì đổi. Chuyển page còn phải kéo '
  + 'theo hội thoại, kịch bản và sản phẩm của page đó, nếu không thì chúng thành mồ côi ở team cũ.';

export async function trangThaiGanPage(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const pages = await db.chon(BANG_PAGE, {});
  return {
    moDuoc: false,
    phieu: PHIEU_GAN_PAGE,
    lyDo: LY_DO_CHUA_GAN_DUOC,
    soPageTeamNay: pages.length,
    // Nói thẳng giới hạn thay vì hiện một con số trông như đã đếm cả hệ thống.
    ghiChu: 'Chỉ đếm được page của team đang mở — lớp team chặn đọc sang team khác, và màn '
      + 'này KHÔNG đi vòng qua vé máy để lách (xem đầu file).',
  };
}
