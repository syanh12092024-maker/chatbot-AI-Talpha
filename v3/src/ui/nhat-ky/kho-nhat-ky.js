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

/**
 * Bộ tra TÊN cho cột «Ai» và «Đối tượng»: `({ nguoi: id[], team: id[] }) → { nguoi: Map, team: Map }`.
 *
 * Vì sao cần: bộ ghi (`audit/index.js`) lưu `tac_nhan` là `nguoi`/`may` TRƠN kèm
 * `nguoi_dung_id`, không phải `nguoi:<email>` như lược đồ ghi chú. Nên màn in chữ «nguoi» ở
 * cột Ai, và «team #1» ở cột Đối tượng (audit 28/09). Thiếu bộ tra thì vẫn chạy, rơi về mã.
 */
let _traTen = null;
export function datTraTen(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiManNhatKy('datTraTen cần một hàm');
  _traTen = fn || null;
  return _traTen;
}

/** Tên loại đối tượng bằng tiếng người. Loại chưa có ở đây thì hiện nguyên mã. */
export const TEN_DOI_TUONG = Object.freeze({
  team: 'Team', page: 'Page', nguoi_dung: 'Người dùng', thanh_vien_team: 'Thành viên team',
  vai: 'Vai', ket_noi_pos: 'Kết nối POS', token_pancake: 'Token Pancake', duong_dan: 'Đường dẫn',
  kich_ban: 'Kịch bản', bo_luat_chung: 'Quy tắc chung', ky_nang: 'Kỹ năng',
  cau_hinh_model: 'Cấu hình model', mau_0_dong: 'Câu trả lời sẵn', san_pham: 'Sản phẩm',
  san_pham_goc: 'Sản phẩm gốc', viec_can_xu_ly: 'Việc cần xử lý', don_hang: 'Đơn hàng',
  hoi_thoai: 'Hội thoại', khach: 'Khách',
  // VE7e · 01/10: hai loại đo thấy trên prod mà chưa có nhãn (hiện nguyên mã `anh_san_pham` trên màn).
  anh_san_pham: 'Ảnh sản phẩm', khoi_dung_chung: 'Chính sách · FAQ · Phản đối',
});

/* ═══ VE7e · 01/10 (bản vẽ 4 › Nhật ký) — mỗi dòng một CÂU đọc được: «lúc · ai · việc · đối tượng bằng TÊN» ═══════════
 * Tên đối tượng lấy theo thứ tự, KHÔNG đoán: ① bảng sống của team — một lượt đọc mỗi bảng cho cả trang · ② không còn (đã xoá)
 * thì tên CHÍNH DÒNG NHẬT KÝ chụp lúc xảy ra (`sau.ten` / `truoc.ten`) · ③ không có thì «Loại #id» như cũ.
 * Đo prod 01/10: `anh_san_pham` trỏ `san_pham.id` 4/4 · `ky_nang` 2/2 · `san_pham_goc` 2/6 (4 dòng là sản phẩm đã xoá). */
let _taoTruyVan = null;
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiManNhatKy('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}
/** Loại đối tượng → bảng có cột `ten` (chỉ bảng tầng truy vấn cho đọc — `ket_noi_pos` có hàm riêng nên dùng ảnh chụp). */
export const BANG_TEN = Object.freeze({
  page: 'page', san_pham: 'san_pham', anh_san_pham: 'san_pham', san_pham_goc: 'san_pham_goc', ky_nang: 'ky_nang',
});
async function tenDoiTuongCua(bc, dong) {
  const ra = new Map();   // `${loai}|${id}` → tên
  if (!_taoTruyVan) return ra;
  const theoBang = new Map();
  for (const d of dong) {
    const loai = d.doi_tuong ?? d.doi_tuong_loai;
    const bang = BANG_TEN[loai];
    if (!bang || d.doi_tuong_id == null || d.doi_tuong_id === '') continue;
    if (!theoBang.has(bang)) theoBang.set(bang, new Set());
    theoBang.get(bang).add(String(d.doi_tuong_id));
  }
  for (const [bang, ids] of theoBang) {
    try {
      const rows = (await _taoTruyVan(bc).chon(bang, { id: [...ids] })) || [];
      for (const r of rows) {
        const ten = String(r.ten || '').trim();
        if (!ten) continue;
        for (const [loai, b] of Object.entries(BANG_TEN)) if (b === bang) ra.set(`${loai}|${r.id}`, ten);
      }
    } catch { /* tra tên hỏng thì rơi về ảnh chụp trong dòng / #id — nhật ký không được chết vì một cái nhãn */ }
  }
  return ra;
}
function tenTrongDong(d) {
  for (let o of [d.sau, d.truoc]) {
    if (typeof o === 'string') { try { o = JSON.parse(o); } catch { o = null; } }
    const v = o && typeof o === 'object' ? o.ten : null;
    if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 80);
  }
  return null;
}
/** Tên việc của MÁY (`tac_nhan` = `may:<việc>`) — chỉ những việc đọc mã thấy rõ; việc lạ hiện nguyên mã, không đoán nghĩa. */
export const TEN_VIEC_MAY = Object.freeze({
  'tang-truy-van': 'tầng dữ liệu',
  'cua-pos': 'cửa POS', 'cua-pos-tao-don': 'tạo đơn POS', 'cua-pos-ghi-nguoc': 'ghi ngược lên POS',
  'hang-cho-tao-don': 'hàng chờ tạo đơn', 'cua-whatsapp-gui': 'gửi WhatsApp',
  'l2-nap': 'bot nhận tin', 'l2-chat': 'bot trả lời', 'l2-worker': 'hàng đợi tin',
  'cham-ti-le-hoan': 'chấm tỉ lệ hoàn', 'di-tru': 'di trú dữ liệu',
  'dong-bo-hrm': 'đồng bộ người theo HRM',
});

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * `tac_nhan` theo lược đồ là `nguoi:<email>` | `may:<job>`, nhưng bộ ghi thật lưu `may` TRƠN —
 * trước 28/09 mọi dòng máy vì thế rơi vào làn người. Nhận cả hai dạng.
 */
export const lanCua = (d) => (/^may(:|$)/.test(String(d.tac_nhan || '')) ? LAN.MAY : LAN.NGUOI);

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

  const cat = loc.slice(t * MOI_TRANG, (t + 1) * MOI_TRANG);
  let ten = { nguoi: new Map(), team: new Map() };
  if (_traTen) {
    const ids = (loc2) => [...new Set(loc2.filter(Boolean).map(String))];
    try {
      const r = await _traTen({
        // VE7e: người dùng làm ĐỐI TƯỢNG («Tạo người dùng mới · Người dùng · binh@…») tra cùng một lượt với người làm.
        nguoi: ids([...cat.map((d) => d.nguoi_dung_id),
          ...cat.filter((d) => (d.doi_tuong ?? d.doi_tuong_loai) === 'nguoi_dung').map((d) => d.doi_tuong_id)]),
        team: ids(cat.filter((d) => (d.doi_tuong ?? d.doi_tuong_loai) === 'team').map((d) => d.doi_tuong_id)),
      });
      ten = { nguoi: r?.nguoi || new Map(), team: r?.team || new Map() };
    } catch { /* tra tên hỏng thì hiện mã — nhật ký không được chết vì một cái nhãn */ }
  }

  const tenDt = await tenDoiTuongCua(bc, cat);

  return {
    teamId: bc.teamId,
    dong: cat.map((d) => gon(d, ten, tenDt)),
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
    // Chữ của từng mã, để bộ lọc «hành động» hiện «Đăng xuất» thay vì `dang_xuat`. Cùng hàm
    // `moTa` đã dựng `chuHanhDong` của từng dòng — không phải bản đồ thứ hai.
    chuMa: _nhomMa
      ? Object.fromEntries(Object.values(_nhomMa).flat().map((m) => [m, _moTa ? _moTa(m) : m]))
      : null,
    canhBao: canhBaoNhatKy({ dem, tong }),
  };
}

function gon(d, ten = { nguoi: new Map(), team: new Map() }, tenDt = new Map()) {
  const ma = d.hanh_dong;
  const loai = d.doi_tuong ?? d.doi_tuong_loai ?? null;
  const idDt = d.doi_tuong_id == null || d.doi_tuong_id === '' ? null : String(d.doi_tuong_id);
  const tenTeam = loai === 'team' && idDt ? ten.team.get(idDt) : null;
  // VE7e: tên đối tượng (không phải team) — bảng sống, rồi ảnh chụp trong dòng; không có thì giữ #id.
  const tenNguoiDt = loai === 'nguoi_dung' && idDt ? ten.nguoi.get(idDt) : null;
  const tenDoiTuong = !tenTeam && loai ? (tenNguoiDt || tenDt.get(`${loai}|${idDt}`) || tenTrongDong(d)) : null;
  const viec = lanCua(d) === LAN.MAY ? String(d.tac_nhan || '').replace(/^may:?/, '') : '';
  return {
    id: String(d.id ?? ''),
    thoiGian: d.xay_ra_luc ?? d.thoi_gian ?? null,
    lan: lanCua(d),
    tacNhan: d.tac_nhan || '',
    // `nguoi:<email>` → `<email>`; `may:<job>` → `<job>`. Hiện nguyên `may:tang-truy-van`
    // thì người đọc phải tự dịch mỗi dòng.
    ai: String(d.tac_nhan || '').replace(/^(nguoi|may)(:|$)/, '')
      || (d.nguoi_dung_id != null ? ten.nguoi.get(String(d.nguoi_dung_id)) || `người dùng #${d.nguoi_dung_id}` : '')
      || (lanCua(d) === LAN.MAY ? '' : '(không rõ)'),
    hanhDong: ma,
    chuHanhDong: _moTa ? _moTa(ma) : ma,
    doiTuong: loai ? (tenTeam || TEN_DOI_TUONG[loai] || loai) : null,
    tenDoiTuong: tenDoiTuong || null,
    // Đã ra tên (team hay đối tượng khác) thì thôi in `#id` — «Tiểu Alpha #1» là nói một thứ hai lần.
    doiTuongId: tenTeam || tenDoiTuong ? null : idDt,
    // Dòng MÁY: việc gì (nhãn khi đọc mã thấy rõ, không thì nguyên mã) — «máy · cửa POS» thay vì huy hiệu trơn.
    viecMay: viec ? (TEN_VIEC_MAY[viec] || viec) : null,
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
        + 'dấu vết của những lượt ĐỌC). Mỗi dòng thao tác thật đang bị chôn dưới hàng trăm dòng '
        + 'như vậy, và nhật ký cấm xoá nên không dọn lại được. '
        + 'Cách chữa thật: đường XEM đừng ghi nhật ký nữa.',
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
