// TẦNG ĐỌC/GHI CỦA MÀN «BỘ LUẬT CHUNG» (G2-C1, sóng 1 — màn NGUY HIỂM NHẤT giai đoạn 2).
//
// Sửa sai một dòng ở đây là **mọi page của team đổi cách nói với khách cùng lúc**.
//
// ⚠️ ĐỪNG GHI MỘT CON SỐ CỐ ĐỊNH VÀO ĐÂY. Bản trước ghi «51 page» — số đó chép từ cột
//    `page.bot_ai_bat` lúc 22/08, và tới 25/08 cột đã lệch: CSDL ghi 50 page bật AI trong khi
//    tiến trình bot chạy 0. Số đúng phải ĐO lúc chạy (`demAnhHuong()`), không phải chép vào
//    chú thích rồi mọi người tin theo. Xem `PHIEU-B-Y7`.
//
// ═══ BA THỨ BẮT BUỘC PHẢI CÓ TRƯỚC KHI CHO BẤM ÁP ═══════════════════════════════════════
// Sổ giao việc ghi thẳng: «phải hiện bản mới khác bản cũ chỗ nào, bao nhiêu page bị ảnh
// hưởng, và nút lùi về bản trước. Không có ba thứ đó thì đừng cho sửa.» Cả ba nằm ở đây:
//   ① `soSanh()`      — khác nhau chỗ nào, theo từng dòng
//   ② `demAnhHuong()` — bao nhiêu page, và bao nhiêu trong số đó đang BẬT bot
//   ③ `apPhienBan()`  — áp được bản nào thì lùi được về bản đó, cùng một hàm
//
// ═══ SỬA KHÔNG ÁP NGAY ══════════════════════════════════════════════════════════════════
// `luuBanNhap()` tạo một phiên bản MỚI với `dang_dung = false`. Nó không đụng gì tới bản
// đang chạy. Phải gọi `apPhienBan()` — một thao tác riêng, một cú bấm riêng, một dòng nhật
// ký riêng — thì bot mới đổi cách nói.
//
// ═══ CẮT SANG CỬA CÓ GIAO DỊCH CỦA NGƯỜI A — 25/08/2026 ════════════════════════════════
//
// Bản đầu của file này tự ghi bằng hai lời gọi `db.sua()` RỜI NHAU, và tôi đã ghi thẳng
// trong chú thích rằng «tầng truy vấn chưa phơi `giaoDich()` ra». **Sai.** Người A đã giao
// `src/db/noi-dung.js` (G2-A4) với `apBoLuat()` — và cái rào giao dịch chỉ ăn khi nơi gọi đi
// qua nó, nên nó nằm đó trong khi màn này vẫn ghi rời.
//
// Cửa của A mạnh hơn bản tôi ở BỐN điểm, không phải một:
//   · `BEGIN` — hạ bản cũ và dựng bản mới trong MỘT giao dịch
//   · `pg_advisory_xact_lock` — hai quản trị bấm cùng lúc thì người sau xếp hàng, không giẫm
//   · `FOR UPDATE` trên dòng bản
//   · **luật §9 mà tôi THIẾU HẲN**: bản `nguon='ai'` chưa ai duyệt thì TỪ CHỐI áp
//     («đề xuất của AI phải có người duyệt mới áp»)
//
// ⇒ Màn này nay CHỈ dịch tham số và gom kết quả. Mọi luật nằm ở cửa của A.
// ⛔ Và KHÔNG ghi nhật ký nữa — `apBoLuat`/`taoBanBoLuat` tự ghi trong giao dịch. Ghi thêm là
//    đẻ hai bản ghi cho một thao tác, đúng lỗi đã tránh được ở lát «gán page ↔ team».
//
// ═══ TRẠNG THÁI BẢN — nay đọc thẳng cột, không phải suy từ nhật ký ══════════════════════
// Migration 009 thêm `nguon` · `duyet_boi` · `duyet_luc` · `ghi_chu`. Bản đầu của file này
// suy «chờ duyệt hay bản cũ» bằng cách tra `nhat_ky` (vì chưa có cột nào trả lời). Nay có
// cột thật thì dùng cột: `duyet_luc IS NULL` = chưa duyệt. Bớt một phép tra, và quan trọng
// hơn: trạng thái thôi phụ thuộc việc ghi nhật ký có thành công hay không.
//
// ═══ MỘT CHỖ LƯỢC ĐỒ VẪN HẸP ═══════════════════════════════════════════════════════════
//
// `bo_luat_chung.team_id` NULL = luật TOÀN HỆ, và tầng truy vấn của A **cố ý** không cho
//    ghi vào dòng đó qua `ctx` thường (`themMoi` luôn đặt `team_id = ctx.teamId`;
//    `suaTheoId` dựng `WHERE team_id = ctx.teamId` nên không bao giờ khớp `NULL`).
//    → KHÔNG GÁNH, và KHÔNG xin mở. Đây là thiết kế đúng: màn này quản bộ luật CỦA TEAM,
//      còn bản toàn hệ là bản KẾ THỪA, chỉ đọc. Hợp đồng đọc `(team_id = $ctx OR team_id
//      IS NULL)` của A đã nói đúng điều đó rồi — team có bản riêng thì bản riêng thắng.
//      Màn hiện bản toàn hệ kèm nhãn «kế thừa, không sửa ở đây», không giấu nó đi.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';

export const BANG = 'bo_luat_chung';
export const BANG_PAGE = 'page';

export const HANH_DONG_LUU = 'luu_ban_nhap_bo_luat';
export const HANH_DONG_AP = 'ap_bo_luat';

/** Vai sửa được bộ luật chung. Người duyệt kịch bản KHÔNG nằm ở đây — `01 §9` tách hai việc. */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

/** Bốn trạng thái suy ra được, và chúng KHÁC NHAU thật. */
export const TRANG_THAI = Object.freeze({
  DANG_AP: 'dang_ap',       // `dang_dung = true`
  CHO_DUYET: 'cho_duyet',   // bản người viết, chưa duyệt — nhưng §9 cho áp thẳng
  DA_DUYET: 'da_duyet',     // `duyet_luc` đã có
  // `nguon='ai'` mà chưa duyệt — `apBoLuat` TỪ CHỐI áp. Trạng thái RIÊNG, không gộp vào
  // «chờ duyệt»: gộp là mời người ta bấm một nút chắc chắn báo lỗi.
  AI_CHUA_DUYET: 'ai_chua_duyet',
  // Bản TOÀN HỆ (`team_id IS NULL`). KHÔNG phải «chờ duyệt»: màn này không áp nó được, và
  // gọi nó là «chờ duyệt» là mời người ta đi bấm một nút sẽ báo lỗi. Nó là bản team đang
  // KẾ THỪA khi chưa có bản riêng.
  KE_THUA: 'ke_thua',
});

export const CHU_TRANG_THAI = Object.freeze({
  dang_ap: 'Đang áp',
  cho_duyet: 'Bản nháp',
  da_duyet: 'Đã duyệt',
  ai_chua_duyet: 'AI đề xuất — CHƯA duyệt',
  ke_thua: 'Bản kế thừa',
});

export class LoiBoLuat extends Error {
  constructor(thongDiep, ma = 'bo_luat', status = 400) {
    super(thongDiep);
    this.name = 'LoiBoLuat';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _pheuNhatKy = null;
let _cua = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiBoLuat('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiBoLuat('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

export const daNoiTruyVanBoLuat = () => typeof _taoTruyVan === 'function';

/**
 * Cửa GHI có giao dịch của người A (`src/db/noi-dung.js`). Ba hàm, tiêm cùng một lần vì
 * thiếu một cái là màn hỏng nửa vời — thà ném lúc dựng ứng dụng.
 * @param {{taoBan:Function, ap:Function, duyet:Function}} bo
 */
export function datCuaBoLuat(bo) {
  if (bo == null) { _cua = null; return null; }
  for (const t of ['taoBan', 'ap', 'duyet']) {
    if (typeof bo[t] !== 'function') throw new LoiBoLuat(`datCuaBoLuat: thiếu hàm \`${t}\`.`);
  }
  _cua = bo;
  return _cua;
}

export const daNoiCuaBoLuat = () => _cua != null;

function cua() {
  if (!_cua) {
    throw new LoiBoLuat(
      'chưa nối cửa ghi bộ luật của người A (`src/db/noi-dung.js`) — TỪ CHỐI ghi. Ghi bằng '
      + 'hai lời gọi rời là bỏ mất giao dịch, khoá chống bấm-cùng-lúc, và luật «đề xuất của '
      + 'AI phải có người duyệt» mà cửa đó thi hành.',
      'chua_noi', 500,
    );
  }
  return _cua;
}

export function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiBoLuat('chưa nối cổng truy vấn — gọi datTaoTruyVan() lúc dựng ứng dụng', 'chua_noi', 500);
  }
  return _taoTruyVan(bc);
}

/**
 * ⛔ KHÔNG DÙNG NỮA — giữ hàm để cửa tiêm không đổi chữ ký, nhưng màn này KHÔNG tự ghi nhật
 * ký từ 25/08: `taoBanBoLuat`/`apBoLuat`/`duyetBoLuat` của người A ghi NGAY TRONG giao dịch.
 * Ghi thêm là đẻ hai bản ghi cho một thao tác, rồi người đọc nhật ký đếm gấp đôi.
 */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiBoLuat('chưa nối phễu nhật ký — từ chối ghi bộ luật vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/* ─────────────────────────── đo token ─────────────────────────── */

/**
 * Ước lượng token. KHÔNG phải số đo thật — mỗi nhà đếm token một kiểu, và bộ đếm thật nằm
 * ở phía nhà cung cấp. Dùng tỉ lệ ~3,8 ký tự/token đo được trên chính bộ luật đang chạy
 * (6.734 ký tự ↔ 2.256 token theo `01-QUYET-DINH.md` §6 · 6734/2256 = 2,985).
 *
 * Ghi rõ «ước lượng» ở mọi chỗ hiện con số này. Một con số không có nhãn thì người đọc mặc
 * định coi nó là số đo.
 */
export const KY_TU_MOI_TOKEN = 2.985;
export const uocToken = (chu) => Math.round(String(chu || '').length / KY_TU_MOI_TOKEN);

/* ─────────────────────────── so sánh hai bản ─────────────────────────── */

/**
 * So hai bản theo TỪNG DÒNG. Trả về danh sách `{ loai, chu, dong }` với
 * `loai ∈ giu | them | bo`.
 *
 * Thuật toán: dãy con chung dài nhất (LCS). Không dùng thư viện — thêm một phụ thuộc chỉ
 * để so hai đoạn chữ vài trăm dòng là không đáng, và bản này có bài test.
 */
export function soSanh(cu, moi) {
  const a = String(cu || '').split('\n');
  const b = String(moi || '').split('\n');
  const n = a.length;
  const m = b.length;

  // Bảng LCS. 6.734 ký tự ≈ 150 dòng nên bảng 150×150 — không cần tối ưu gì thêm.
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
  }

  const ra = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ra.push({ loai: 'giu', chu: a[i], dong: j + 1 }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { ra.push({ loai: 'bo', chu: a[i], dong: null }); i++; }
    else { ra.push({ loai: 'them', chu: b[j], dong: j + 1 }); j++; }
  }
  while (i < n) { ra.push({ loai: 'bo', chu: a[i], dong: null }); i++; }
  while (j < m) { ra.push({ loai: 'them', chu: b[j], dong: j + 1 }); j++; }
  return ra;
}

/** Tóm tắt phép so — con số hiện cạnh nút áp. */
export function tomTatSoSanh(cu, moi) {
  const d = soSanh(cu, moi);
  const them = d.filter((x) => x.loai === 'them').length;
  const bo = d.filter((x) => x.loai === 'bo').length;
  return {
    them,
    bo,
    giu: d.filter((x) => x.loai === 'giu').length,
    coDoi: them > 0 || bo > 0,
    tokenCu: uocToken(cu),
    tokenMoi: uocToken(moi),
    tokenChenh: uocToken(moi) - uocToken(cu),
  };
}

/* ─────────────────────────── ảnh hưởng ─────────────────────────── */

/**
 * BAO NHIÊU PAGE BỊ ẢNH HƯỞNG — con số phải hiện TRƯỚC khi bấm áp.
 *
 * Hai số, không phải một, vì chúng trả lời hai câu khác nhau:
 *   · `tongPage`  — bộ luật này sẽ nằm trong prompt của bao nhiêu page
 *   · `dangBatBot` — bao nhiêu page trong số đó ĐANG nói chuyện với khách thật ngay lúc này
 * Chỉ hiện số thứ nhất là để người ta bấm áp mà không biết mình vừa đổi cách nói của 50
 * page đang có khách; chỉ hiện số thứ hai là giấu mất phần sẽ ảnh hưởng khi bật bot sau này.
 */
/**
 * ② trong ba thứ bắt buộc: **bao nhiêu page bị ảnh hưởng**, hỏi TRƯỚC khi cho bấm áp.
 *
 * ⚠️ HỎI NGUỒN THẬT, KHÔNG HỎI CỘT. Bản trước đếm `page.bot_ai_bat === true`. Đo 25/08 trên
 *    máy chủ: cột nói 50, `ai-enabled.json` nói 0 — cột chỉ là BẢN SAO và đã cũ từ 24/08.
 *    `db/migrate/001_nen.up.sql` khai thẳng: «NGUỒN DUY NHẤT của cờ này là `ai-enabled.json`
 *    … Cấm suy ra từ bất kỳ trường nào khác». → `PHIEU-B-Y7`, người A đã giao `xemAnhHuongBoLuat`.
 *
 * Không có cửa của A thì VẪN trả số, nhưng khai rõ `nguon: 'cot_csdl'` kèm cảnh báo — im lặng
 * rơi về cột chính là cái đã sai.
 */
export async function demAnhHuong(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);

  if (_cua && typeof _cua.xemAnhHuong === 'function') {
    const a = await _cua.xemAnhHuong(bc);
    return {
      tongPage: a.soPage,
      dangBatBot: a.soPageDangBatBot,
      nguon: a.nguon,
      lech: a.lech || null,
      tenVaiPage: Array.isArray(a.tenVaiPage) ? a.tenVaiPage : [],
    };
  }

  const db = congTruyVan(bc);
  const pages = await db.chon(BANG_PAGE, {});
  const batBot = pages.filter((p) => p.bot_ai_bat === true);
  return {
    tongPage: pages.length,
    dangBatBot: batBot.length,
    nguon: 'cot_csdl',
    lech: {
      co: null,
      viSao: 'Chưa nối `xemAnhHuong` của tầng dữ liệu, nên con số này đếm từ CỘT '
        + '`page.bot_ai_bat` — một bản sao đã từng lệch 50 page (B-Y7). Coi nó là ước lượng '
        + 'trên, đừng coi là số page thật sự đang chạy.',
    },
    tenVaiPage: batBot.slice(0, 5).map((p) => p.ten || p.page_id || String(p.id)),
  };
}

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * Trạng thái một bản — đọc THẲNG CỘT từ migration 009, không tra nhật ký nữa.
 *
 * Bản đầu suy «chờ duyệt hay bản cũ» bằng cách hỏi `nhat_ky` xem bản này đã từng áp chưa,
 * vì lúc đó chưa có cột nào trả lời được. Nay `duyet_luc` trả lời thẳng, và trạng thái thôi
 * phụ thuộc việc ghi nhật ký có thành công hay không.
 */
function trangThaiCua(r) {
  if (r.dang_dung === true) return TRANG_THAI.DANG_AP;
  // Bản toàn hệ không áp được ở màn này — xem `KE_THUA` ở trên.
  if (r.team_id == null || r.team_id === '') return TRANG_THAI.KE_THUA;
  // `nguon='ai'` chưa duyệt là một trạng thái RIÊNG: `apBoLuat` của người A TỪ CHỐI áp nó
  // (01-QUYET-DINH §9). Gộp nó vào «chờ duyệt» là mời người ta bấm một nút sẽ báo lỗi.
  if (r.nguon === 'ai' && !r.duyet_luc) return TRANG_THAI.AI_CHUA_DUYET;
  if (r.duyet_luc) return TRANG_THAI.DA_DUYET;
  return TRANG_THAI.CHO_DUYET;
}

/**
 * Mọi phiên bản team NHÌN THẤY — của team, và bản toàn hệ (`team_id IS NULL`).
 * Hợp đồng đọc hai vế đã cài sẵn trong tầng truy vấn của A; ở đây chỉ phân loại.
 */
export async function danhSachBan(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const dong = await db.chon(BANG, {});

  const ban = dong
    .map((r) => ({
      id: String(r.id),
      phienBan: Number(r.phien_ban),
      // `team_id` rỗng = bản TOÀN HỆ. Màn này KHÔNG sửa được nó — xem khối ② đầu file.
      toanHe: r.team_id == null || r.team_id === '',
      dangDung: r.dang_dung === true,
      trangThai: trangThaiCua(r),
      nguon: r.nguon || 'nguoi',
      duyetLuc: r.duyet_luc || null,
      duyetBoi: r.duyet_boi || null,
      ghiChu: r.ghi_chu || '',
      nguoiSua: r.nguoi_sua || '',
      suaLuc: r.sua_luc || r.tao_luc || null,
      soKyTu: String(r.noi_dung || '').length,
      uocToken: uocToken(r.noi_dung),
      noiDung: r.noi_dung || '',
    }))
    .sort((a, b) => b.phienBan - a.phienBan || Number(b.id) - Number(a.id));

  const dangAp = ban.find((b) => b.dangDung) || null;
  const cuaTeam = ban.filter((b) => !b.toanHe);
  const toanHe = ban.filter((b) => b.toanHe);

  return {
    ban,
    dangAp,
    // Team chưa có bản riêng → đang KẾ THỪA bản toàn hệ. Phải nói ra, vì «không có bản nào»
    // và «đang dùng bản kế thừa» là hai chuyện khác hẳn nhau.
    keThua: cuaTeam.length === 0 && toanHe.length > 0,
    soBanCuaTeam: cuaTeam.length,
    soBanToanHe: toanHe.length,
    trong: ban.length ? null : {
      rong: true,
      vi: 'chua_cai_dat',
      noi: 'Chưa có bộ luật chung nào — cả bản của team lẫn bản toàn hệ đều trống. Bot đang '
        + 'chạy mà không có khối quy tắc cứng nào trong prompt.',
      diTiep: { chu: 'Soạn bản đầu tiên', duong: '#soan' },
    },
  };
}

/** Một màn đầy đủ: danh sách bản + ảnh hưởng + bản đang áp. */
export async function manBoLuat(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const [ds, anhHuong] = await Promise.all([danhSachBan(bc), demAnhHuong(bc)]);
  return {
    teamId: bc.teamId,
    ...ds,
    anhHuong,
    chuTrangThai: CHU_TRANG_THAI,
    kyTuMoiToken: KY_TU_MOI_TOKEN,
  };
}

/** So một bản với bản ĐANG ÁP — dữ liệu cho khối "khác chỗ nào". */
export async function soVoiDangAp(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const { ban, dangAp } = await danhSachBan(bc);
  const b = ban.find((x) => x.id === String(id));
  if (!b) throw new LoiBoLuat(`không có bản id=${id} trong tầm nhìn của team này.`, 'khong_thay', 404);
  return {
    ban: b,
    dangAp,
    tomTat: tomTatSoSanh(dangAp ? dangAp.noiDung : '', b.noiDung),
    dong: soSanh(dangAp ? dangAp.noiDung : '', b.noiDung),
  };
}

/* ─────────────────────────── ghi ─────────────────────────── */

export const DAI_TOI_THIEU = 200;

/**
 * Lưu một bản nháp MỚI. KHÔNG áp — bản đang chạy không đổi một chữ.
 *
 * Luôn tạo dòng mới, không bao giờ sửa đè: `bo_luat_chung` là chỗ giữ lịch sử của thứ quyết
 * định cách bot nói với khách. Sửa đè là xoá mất bản mà cả team đã chạy bằng nó — và lúc cần
 * lùi thì không còn gì để lùi về.
 */
export async function luuBanNhap(boiCanh, { noiDung, ghiChu = '', nguon = 'nguoi' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);

  const chu = String(noiDung == null ? '' : noiDung);
  if (chu.trim().length < DAI_TOI_THIEU) {
    // Rào NÀY giữ ở đây, không đẩy sang cửa của A: nó là luật của MÀN HÌNH («bản đang chạy
    // dài 6.734 ký tự, một bản vài chục ký tự là dán nhầm»), không phải luật của tầng dữ liệu.
    throw new LoiBoLuat(
      `bộ luật chung chỉ có ${chu.trim().length} ký tự — quá ngắn (tối thiểu ${DAI_TOI_THIEU}). `
      + 'Bản đang chạy dài 6.734 ký tự; một bản ngắn thế này gần như chắc chắn là dán nhầm.',
      'qua_ngan',
    );
  }
  const { dangAp } = await danhSachBan(bc);
  if (dangAp && dangAp.noiDung === chu) {
    throw new LoiBoLuat('nội dung không khác bản đang áp — không tạo bản trùng.', 'khong_doi');
  }

  // Cửa của A tự đánh số phiên bản, tự ghi nhật ký, và có `UNIQUE (team, phien_ban)` chặn
  // hai người tạo cùng số. Màn này KHÔNG tự đánh số nữa — đánh số ở hai chỗ là chỗ đua nhau.
  const kq = await cua().taoBan(bc, { noiDung: chu, ghiChu, nguon });
  return {
    id: kq && kq.id != null ? String(kq.id) : null,
    phienBan: kq ? Number(kq.phienBan ?? kq.phien_ban) : null,
    nguon,
    daAp: false,
  };
}

/** Duyệt một bản — bắt buộc với bản `nguon='ai'` trước khi áp được (01-QUYET-DINH §9). */
export async function duyetBan(boiCanh, id, { ghiChu = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().duyet(bc, { id: String(id), ghiChu });
  return { id: String(id), ...(kq || {}) };
}

/**
 * ÁP một phiên bản — và đây cũng là nút LÙI VỀ BẢN TRƯỚC. Cùng một hàm, cố ý:
 * «áp bản v5» và «lùi về bản v3» là đúng một thao tác nhìn từ hai phía. Viết hai hàm là đẻ
 * hai đường ghi cho cùng một sự việc, rồi một trong hai quên ghi nhật ký.
 */
export async function apPhienBan(boiCanh, id, { lyDo = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);

  // Tra trước CHỈ để trả lời «đây có phải bản toàn hệ không» bằng câu người đọc được. Cửa
  // của A cũng từ chối nó, nhưng thông điệp của A nói theo góc dữ liệu; ở đây nói theo góc
  // người dùng và chỉ được đường đi tiếp.
  const { ban, dangAp } = await danhSachBan(bc);
  const b = ban.find((x) => x.id === String(id));
  if (!b) throw new LoiBoLuat(`không có bản id=${id} trong tầm nhìn của team này.`, 'khong_thay', 404);
  if (b.toanHe) {
    throw new LoiBoLuat(
      'đây là bản TOÀN HỆ (dùng chung mọi team) — màn này không sửa và không áp nó được. '
      + 'Team đang kế thừa nó sẵn; muốn khác thì soạn một bản riêng của team.',
      'ban_toan_he', 400,
    );
  }

  // MỌI luật còn lại nằm ở cửa của A: giao dịch, khoá chống bấm-cùng-lúc, `FOR UPDATE`,
  // «bản đang áp rồi», và «đề xuất của AI chưa duyệt thì từ chối». Không chép lại ở đây —
  // hai bản cài của cùng một luật là cách chắc chắn nhất để chúng lệch nhau.
  const kq = await cua().ap(bc, { id: String(id), lyDo });

  return {
    id: String(b.id),
    phienBan: b.phienBan,
    laLui: kq && kq.laLui != null ? !!kq.laLui : !!(dangAp && b.phienBan < dangAp.phienBan),
    anhHuong: (kq && kq.anhHuong)
      ? { tongPage: kq.anhHuong.soPage, dangBatBot: kq.anhHuong.soPageDangBatBot, tenVaiPage: [] }
      : await demAnhHuong(bc),
  };
}
