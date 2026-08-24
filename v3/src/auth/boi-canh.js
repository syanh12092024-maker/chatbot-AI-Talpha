// BỐI CẢNH TEAM — điểm bàn giao #5 giữa người B và người A.
//
// Đây là thứ đi kèm MỌI lời gọi xuống cơ sở dữ liệu. Điều kiện team nằm ở tầng truy vấn
// và lấy team từ đúng đối tượng này — không lấy từ query string, không lấy từ body, không
// lấy từ bộ lọc trên màn hình. Sót một chỗ là team này nhìn thấy khách của team kia.
//
// LUẬT QUAN TRỌNG NHẤT CỦA FILE NÀY: thiếu bối cảnh thì NÉM LỖI, không trả dữ liệu rỗng.
// Trả rỗng nguy hiểm hơn ném lỗi — nó trông như "không có dữ liệu" thay vì "gọi sai", nên
// lỗi đi lọt qua nghiệm thu rồi mới lộ ra ở khách thật.

/** Thiếu bối cảnh team, hoặc bối cảnh không đủ trường. */
export class LoiThieuBoiCanh extends Error {
  constructor(chiTiet = '') {
    super(`Thiếu bối cảnh team${chiTiet ? ` — ${chiTiet}` : ''}. Truy vấn bị chặn.`);
    this.name = 'LoiThieuBoiCanh';
    this.ma = 'thieu_boi_canh';
    this.status = 500;
  }
}

/** Chưa đăng nhập (hoặc vé hết hạn) — dùng ở tầng HTTP. */
export class LoiChuaDangNhap extends Error {
  constructor(chiTiet = '') {
    super(`Chưa đăng nhập${chiTiet ? ` — ${chiTiet}` : ''}.`);
    this.name = 'LoiChuaDangNhap';
    this.ma = 'chua_dang_nhap';
    this.status = 401;
  }
}

/** Cố đọc/ghi dữ liệu của team khác. Luôn kèm ghi nhật ký ở nơi ném ra. */
export class LoiXuyenTeam extends Error {
  constructor(teamXin, teamCua) {
    super(`Chặn truy cập xuyên team: xin team ${teamXin}, vé cấp cho team ${teamCua}.`);
    this.name = 'LoiXuyenTeam';
    this.ma = 'chan_xuyen_team';
    this.status = 403;
    this.teamXin = String(teamXin);
    this.teamCua = String(teamCua);
  }
}

/** Không đủ vai để làm việc này. */
export class LoiThieuVai extends Error {
  constructor(canVai = []) {
    super(`Không đủ quyền. Cần một trong các vai: ${canVai.join(', ')}.`);
    this.name = 'LoiThieuVai';
    this.ma = 'thieu_vai';
    this.status = 403;
  }
}

/** Hai vai tối thiểu của giai đoạn 1. Ba vai còn lại (marketer, quản lý, người duyệt) là giai đoạn 2. */
// ⚠️ GẠCH NGANG, chép đúng `vai.ma` của lược đồ thật (`db/migrate/001_nen.up.sql`, seed 5 vai).
//    Bản đoán cũ dùng gạch DƯỚI: lệch một dấu thì không ai tra ra vai, `batBuocVaiHTTP` chặn
//    sạch, mà màn hình trông y hệt phân quyền đang chạy đúng.
export const VAI = Object.freeze({ QUAN_TRI: 'quan-tri', SALE: 'sale' });
const VAI_HOP_LE = new Set(Object.values(VAI));

/** Nguồn của vé: người thật đang đăng nhập, hay việc nền do máy chạy. */
export const NGUON = Object.freeze({ PHIEN: 'phien', MAY: 'may' });

/**
 * Dựng một bối cảnh đã chuẩn hoá. Ném lỗi ngay tại đây nếu thiếu trường — dựng sai thì
 * hỏng ở chỗ dựng, đừng để nó trôi xuống tận câu truy vấn rồi mới vỡ.
 */
export function taoBoiCanh({ nguoiDungId, tenDangNhap, teamId, vai, nguon = NGUON.PHIEN, ip, lyDo, capLuc } = {}) {
  if (!teamId) throw new LoiThieuBoiCanh('không có teamId');
  const dsVai = (Array.isArray(vai) ? vai : [vai]).filter(Boolean).map(String);
  if (!dsVai.length) throw new LoiThieuBoiCanh('không có vai');
  for (const v of dsVai) if (!VAI_HOP_LE.has(v)) throw new LoiThieuBoiCanh(`vai lạ: ${v}`);
  if (nguon === NGUON.PHIEN && !nguoiDungId) throw new LoiThieuBoiCanh('vé người thật mà không có nguoiDungId');
  return Object.freeze({
    nguoiDungId: nguoiDungId == null ? null : String(nguoiDungId),
    tenDangNhap: tenDangNhap == null ? null : String(tenDangNhap),
    teamId: String(teamId),
    vai: Object.freeze(dsVai),
    nguon,
    ip: ip || null,
    lyDo: lyDo || null,          // chỉ có ở vé máy: "hàng đợi nhắc", "mổ hội thoại đêm"…
    capLuc: capLuc || Date.now(),
  });
}

/**
 * Vé cho VIỆC NỀN. Bot trả lời khách lúc 3 giờ sáng thì không có ai đăng nhập, nhưng vẫn
 * phải đi qua điều kiện team — nếu không thì việc nền thành cái cửa hậu bỏ qua lớp team.
 * `nguon:'may'` để nhật ký phân biệt được người làm và máy làm (mục 9 của 01-QUYET-DINH:
 * "ghi cả việc máy làm").
 */
export function boiCanhMay(teamId, lyDo, vai = [VAI.QUAN_TRI]) {
  if (!lyDo) throw new LoiThieuBoiCanh('vé máy phải nói rõ lý do — nhật ký cần nó để tra ngược');
  return taoBoiCanh({ teamId, vai, nguon: NGUON.MAY, lyDo });
}

/**
 * Cửa vào bắt buộc của tầng truy vấn. Gọi ở đầu MỌI hàm chạm dữ liệu.
 * Trả lại chính bối cảnh để viết được `const bc = batBuocBoiCanh(boiCanh)`.
 */
export function batBuocBoiCanh(bc) {
  if (!bc || typeof bc !== 'object') throw new LoiThieuBoiCanh('không truyền gì');
  if (!bc.teamId) throw new LoiThieuBoiCanh('không có teamId');
  if (!Array.isArray(bc.vai) || !bc.vai.length) throw new LoiThieuBoiCanh('không có vai');
  return bc;
}

/** Lấy bối cảnh từ request Express. Chưa đăng nhập thì ném, không trả undefined. */
export function cuaBoiCanh(req) {
  const bc = req && req.boiCanh;
  if (!bc) throw new LoiChuaDangNhap();
  return batBuocBoiCanh(bc);
}

export function coVai(bc, ...vai) {
  batBuocBoiCanh(bc);
  return vai.some((v) => bc.vai.includes(v));
}

export function batBuocVai(bc, ...vai) {
  if (!coVai(bc, ...vai)) throw new LoiThieuVai(vai);
  return bc;
}

/**
 * Đối chiếu team mà nơi gọi tự truyền tay với team trên vé.
 * Khớp → trả về team đó. Lệch → ném LoiXuyenTeam để nơi gọi ghi nhật ký rồi ném tiếp.
 *
 * Đây là lớp chặn THỨ HAI. Lớp thứ nhất là tầng truy vấn của người A. Chặn hai lớp vì
 * tiêu chí nghiệm thu đòi "sửa tham số trên URL để truy vấn xuyên team → bị chặn ở tầng
 * dữ liệu, có ghi nhật ký" — mà một lớp thì chỉ cần một chỗ quên là thủng.
 */
export function doiChieuTeam(bc, teamXin) {
  batBuocBoiCanh(bc);
  if (teamXin == null || teamXin === '') return bc.teamId;
  if (String(teamXin) !== bc.teamId) throw new LoiXuyenTeam(teamXin, bc.teamId);
  return bc.teamId;
}

/** Rút gọn để ghi nhật ký — KHÔNG kèm vé, không kèm khoá. */
export function tomTat(bc) {
  if (!bc) return null;
  return {
    nguoiDungId: bc.nguoiDungId, tenDangNhap: bc.tenDangNhap,
    teamId: bc.teamId, vai: [...(bc.vai || [])], nguon: bc.nguon, ip: bc.ip, lyDo: bc.lyDo,
  };
}
