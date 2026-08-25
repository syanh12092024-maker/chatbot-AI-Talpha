// TẦNG ĐỌC/GHI CỦA MÀN «AI ĐỀ XUẤT» (G2-F8, sóng 4).
//
// ═══ MÀN NÀY LÀ NỬA CÒN LẠI CỦA MỘT TIÊU CHÍ ═══════════════════════════════════════════
// Nghiệm thu giai đoạn 2, nguyên văn: *«Kịch bản NGƯỜI VIẾT → áp thẳng. Đề xuất CỦA AI →
// phải duyệt mới áp. Hai đường khác nhau, có test.»*
//
// Nửa thứ nhất đã có: `/api/bo-luat/nhap` ghi CỨNG `nguon:'nguoi'`, không nhận từ trình duyệt.
// Nửa thứ hai là màn này — cửa DUY NHẤT ghi được bản `nguon='ai'`.
//
// Tách hai cửa chứ không thêm một tham số vào cửa cũ, vì một tham số thì ai gọi cũng đặt
// được, và cái cửa duyệt mà §9 dựng ra thành một chỗ đi vòng.
//
// ═══ MÀN NÀY KHÔNG SINH RA ĐỀ XUẤT ═════════════════════════════════════════════════════
// Nó KHÔNG gọi model để nghĩ hộ. Nó là chỗ **nhận** một đề xuất (do người hoặc một việc nền
// đưa vào), rồi bắt nó xếp hàng qua cửa duyệt. Sinh đề xuất là việc khác, tốn tiền model, và
// chưa ai đặt hàng — làm bây giờ là đoán.
//
// ═══ BA TẦNG, VÀ HÔM NAY CHỈ MỘT TẦNG NHẬN ĐƯỢC ĐỀ XUẤT ════════════════════════════════
// Kế hoạch: *«Đề xuất sửa ở CẢ BA TẦNG, không chỉ kịch bản»* — bộ luật chung · kỹ năng ·
// kịch bản page. Đo 25/08:
//   · `bo_luat_chung` — CÓ cột `nguon`+`duyet_luc` (migration 009) ⇒ **nhận được**
//   · `ky_nang`       — KHÔNG có cột nào phân biệt nguồn, cũng không có `duyet_luc`
//   · `kich_ban`      — KHÔNG có `nguon`; `trang_thai` có `REVIEW` nhưng không nói ai đề xuất
// ⇒ Màn khai thẳng hai tầng kia chưa nhận được, và **không giả vờ** bằng cách nhét nguồn vào
//   một cột ghi chú. Đã ghi vào `PHIEU-B-Y6` phần bổ sung.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';

export const TANG = Object.freeze({
  BO_LUAT: 'bo_luat_chung',
  KY_NANG: 'ky_nang',
  KICH_BAN: 'kich_ban',
});

export const TEN_TANG = Object.freeze({
  bo_luat_chung: 'Bộ luật chung',
  ky_nang: 'Thư viện kỹ năng',
  kich_ban: 'Kịch bản page',
});

/** Tầng nào NHẬN được đề xuất hôm nay, và tầng nào chưa — kèm lý do bằng cột thật. */
export const TANG_NHAN_DUOC = Object.freeze({
  bo_luat_chung: { duoc: true, vi: null },
  ky_nang: {
    duoc: false,
    vi: 'Bảng `ky_nang` chưa có cột phân biệt nguồn (`nguon`) và chưa có `duyet_luc` — không '
      + 'lưu được «ai đề xuất» và «ai đã duyệt», nên cửa duyệt không dựng được.',
  },
  kich_ban: {
    duoc: false,
    vi: 'Bảng `kich_ban` có `trang_thai=REVIEW` nhưng KHÔNG có cột `nguon` — không phân biệt '
      + 'được bản người viết với bản AI đề xuất, mà đó chính là chỗ §9 tách hai đường.',
  },
});

/** Chỉ quản trị đưa đề xuất vào và duyệt. Người duyệt kịch bản KHÔNG duyệt bộ luật chung. */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

export const DAI_TOI_THIEU = 200;

export class LoiDeXuat extends Error {
  constructor(thongDiep, ma = 'de_xuat', status = 400) {
    super(thongDiep);
    this.name = 'LoiDeXuat';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _docBoLuat = null;
let _cua = null;

/** Đọc danh sách bản bộ luật — dùng lại bộ đọc của màn Bộ luật, không dựng đường đọc thứ hai. */
export function datDocBoLuat(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiDeXuat('datDocBoLuat cần một hàm');
  _docBoLuat = fn || null;
  return _docBoLuat;
}

/** Cửa ghi có giao dịch của người A (`src/db/noi-dung.js`) — cùng cửa mà màn Bộ luật dùng. */
export function datCuaBoLuat(bo) {
  if (bo == null) { _cua = null; return null; }
  for (const t of ['taoBan', 'duyet']) {
    if (typeof bo[t] !== 'function') throw new LoiDeXuat(`datCuaBoLuat: thiếu hàm \`${t}\`.`);
  }
  _cua = bo;
  return _cua;
}

export const daNoiDeXuat = () => _cua != null && typeof _docBoLuat === 'function';

function cua() {
  if (!_cua) {
    throw new LoiDeXuat(
      'chưa nối cửa ghi của người A — TỪ CHỐI. Ghi bản đề xuất bằng đường khác là bỏ qua '
      + 'đúng cái cửa duyệt mà §9 dựng ra.', 'chua_noi', 500,
    );
  }
  return _cua;
}

/* ─────────────────────────── đọc ─────────────────────────── */

export async function manDeXuat(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docBoLuat) throw new LoiDeXuat('chưa nối bộ đọc bộ luật', 'chua_noi', 500);
  const { ban } = await _docBoLuat(bc);

  // CHỈ bản do AI đề xuất. Bản người viết thuộc màn Bộ luật — trộn hai loại vào một danh
  // sách là làm mờ đúng cái ranh giới màn này sinh ra để giữ.
  const deXuat = ban
    .filter((b) => b.nguon === 'ai')
    .map((b) => ({
      id: b.id,
      tang: TANG.BO_LUAT,
      tenTang: TEN_TANG[TANG.BO_LUAT],
      phienBan: b.phienBan,
      trangThai: b.trangThai,
      daDuyet: !!b.duyetLuc,
      duyetBoi: b.duyetBoi || null,
      duyetLuc: b.duyetLuc || null,
      ghiChu: b.ghiChu || '',
      nguoiSua: b.nguoiSua || '',
      suaLuc: b.suaLuc || null,
      soKyTu: b.soKyTu,
      uocToken: b.uocToken,
    }))
    .sort((a, b) => b.phienBan - a.phienBan);

  const choDuyet = deXuat.filter((d) => !d.daDuyet);
  return {
    teamId: bc.teamId,
    deXuat,
    soChoDuyet: choDuyet.length,
    tang: Object.entries(TANG_NHAN_DUOC).map(([ma, t]) => ({
      ma, ten: TEN_TANG[ma], ...t,
    })),
    trong: deXuat.length ? null : {
      rong: true,
      // «Chưa có đề xuất nào» là trạng thái BÌNH THƯỜNG, không phải chưa cài đặt xong.
      // Gọi nó là «chưa cài đặt» thì người ta đi tìm một thứ không hỏng.
      vi: 'xong',
      noi: 'Chưa có đề xuất nào của AI đang chờ. Đây là trạng thái bình thường — màn này chỉ '
        + 'có việc khi có ai đó (hoặc một việc nền) đưa một đề xuất vào.',
      diTiep: null,
    },
  };
}

/* ─────────────────────────── ghi ─────────────────────────── */

/**
 * Nhận một đề xuất của AI. Ghi `nguon='ai'` — và đó là toàn bộ điểm của cửa này.
 *
 * ⛔ Bản ghi ra ở đây KHÔNG áp được cho tới khi có người bấm duyệt: `apBoLuat` của người A
 *    từ chối bản `nguon='ai'` chưa có `duyet_luc`. Màn này không tự duyệt hộ.
 */
export async function nhanDeXuat(boiCanh, { noiDung, ghiChu = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);

  const chu = String(noiDung == null ? '' : noiDung);
  if (chu.trim().length < DAI_TOI_THIEU) {
    throw new LoiDeXuat(
      `đề xuất chỉ có ${chu.trim().length} ký tự — quá ngắn (tối thiểu ${DAI_TOI_THIEU}).`,
      'qua_ngan',
    );
  }
  if (!String(ghiChu).trim()) {
    // Đề xuất không nói VÌ SAO thì người duyệt không có gì để cân. Bắt buộc ở đây chứ không
    // ở cửa của A: đây là luật của màn, không phải của tầng dữ liệu.
    throw new LoiDeXuat(
      'đề xuất phải kèm lý do — người duyệt cần biết AI đề xuất đổi cái gì và vì sao, nếu '
      + 'không thì «duyệt» chỉ là bấm cho xong.',
      'thieu_ly_do',
    );
  }

  const kq = await cua().taoBan(bc, { noiDung: chu, ghiChu, nguon: 'ai' });
  return {
    id: kq && kq.id != null ? String(kq.id) : null,
    phienBan: kq ? Number(kq.phienBan ?? kq.phien_ban) : null,
    nguon: 'ai',
    daDuyet: false,
  };
}

/** Duyệt một đề xuất. Duyệt KHÁC áp — duyệt xong vẫn phải sang màn Bộ luật bấm áp. */
export async function duyetDeXuat(boiCanh, id, { ghiChu = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().duyet(bc, { id: String(id), ghiChu });
  return { id: String(id), daDuyet: true, ...(kq || {}) };
}
