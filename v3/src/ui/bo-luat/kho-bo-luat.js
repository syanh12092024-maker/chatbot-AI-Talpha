// TẦNG ĐỌC/GHI CỦA MÀN «BỘ LUẬT CHUNG» (G2-C1, sóng 1 — màn NGUY HIỂM NHẤT giai đoạn 2).
//
// Sửa sai một dòng ở đây là **51 page đổi cách nói với khách cùng lúc**.
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
// ═══ HAI CHỖ LƯỢC ĐỒ HẸP, VÀ CÁCH GÁNH ══════════════════════════════════════════════════
//
// ① `bo_luat_chung` KHÔNG có cột `trang_thai` (`kich_ban` thì có).
//    Nên «bản này đang chờ duyệt hay là bản cũ đã từng chạy?» không đọc thẳng ra được.
//    Suy bằng SỐ PHIÊN BẢN thì sai sau lượt lùi: lùi về v1 xong thì v2, v3 lại trông như
//    «chờ duyệt» trong khi chúng đã từng chạy và bị gạt.
//    → GÁNH bằng `nhat_ky`: bảng CHỈ-THÊM, không sửa không xoá được, và nó vốn sinh ra để
//      trả lời đúng câu hỏi «việc này đã từng xảy ra chưa». Một phiên bản đã từng áp thì có
//      một dòng `ap_bo_luat`. Không có dòng nào = chưa bao giờ chạy = ĐANG CHỜ DUYỆT.
//    Không xin thêm cột: câu trả lời chính xác đã có sẵn, chỉ là nằm ở bảng khác.
//
// ② `bo_luat_chung.team_id` NULL = luật TOÀN HỆ, và tầng truy vấn của A **cố ý** không cho
//    ghi vào dòng đó qua `ctx` thường (`themMoi` luôn đặt `team_id = ctx.teamId`;
//    `suaTheoId` dựng `WHERE team_id = ctx.teamId` nên không bao giờ khớp `NULL`).
//    → KHÔNG GÁNH, và KHÔNG xin mở. Đây là thiết kế đúng: màn này quản bộ luật CỦA TEAM,
//      còn bản toàn hệ là bản KẾ THỪA, chỉ đọc. Hợp đồng đọc `(team_id = $ctx OR team_id
//      IS NULL)` của A đã nói đúng điều đó rồi — team có bản riêng thì bản riêng thắng.
//      Màn hiện bản toàn hệ kèm nhãn «kế thừa, không sửa ở đây», không giấu nó đi.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';

export const BANG = 'bo_luat_chung';
export const BANG_PAGE = 'page';
export const BANG_NHAT_KY = 'nhat_ky';

export const HANH_DONG_LUU = 'luu_ban_nhap_bo_luat';
export const HANH_DONG_AP = 'ap_bo_luat';

/** Vai sửa được bộ luật chung. Người duyệt kịch bản KHÔNG nằm ở đây — `01 §9` tách hai việc. */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);

/** Bốn trạng thái suy ra được, và chúng KHÁC NHAU thật. */
export const TRANG_THAI = Object.freeze({
  DANG_AP: 'dang_ap',       // `dang_dung = true`
  DA_TUNG_AP: 'da_tung_ap', // có dòng `ap_bo_luat` trong nhật ký
  CHO_DUYET: 'cho_duyet',   // chưa bao giờ chạy, và áp được
  // Bản TOÀN HỆ (`team_id IS NULL`). KHÔNG phải «chờ duyệt»: màn này không áp nó được, và
  // gọi nó là «chờ duyệt» là mời người ta đi bấm một nút sẽ báo lỗi. Nó là bản team đang
  // KẾ THỪA khi chưa có bản riêng.
  KE_THUA: 'ke_thua',
});

export const CHU_TRANG_THAI = Object.freeze({
  dang_ap: 'Đang áp',
  da_tung_ap: 'Bản cũ',
  cho_duyet: 'Chờ duyệt',
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

export function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiBoLuat('chưa nối cổng truy vấn — gọi datTaoTruyVan() lúc dựng ứng dụng', 'chua_noi', 500);
  }
  return _taoTruyVan(bc);
}

/**
 * Ghi nhật ký CÓ NÉM. Không phải chỗ nuốt lỗi được: dòng `ap_bo_luat` vừa là dấu vết vừa là
 * DỮ LIỆU — nó là thứ duy nhất phân biệt «bản cũ» với «chờ duyệt» (xem khối ① đầu file).
 * Ghi hụt là một bản đã chạy bỗng trông như chưa duyệt, và người sau bấm áp lại nó.
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
export async function demAnhHuong(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const pages = await db.chon(BANG_PAGE, {});
  const batBot = pages.filter((p) => p.bot_ai_bat === true);
  return {
    tongPage: pages.length,
    dangBatBot: batBot.length,
    tenVaiPage: batBot.slice(0, 5).map((p) => p.ten || p.page_id || String(p.id)),
  };
}

/* ─────────────────────────── đọc ─────────────────────────── */

/** Đã từng áp phiên bản nào — đọc từ `nhat_ky`, bảng chỉ-thêm. Xem khối ① đầu file. */
async function idDaTungAp(db) {
  const dong = await db.chon(BANG_NHAT_KY, { hanh_dong: HANH_DONG_AP });
  return new Set(dong.map((d) => String(d.doi_tuong_id ?? d.doiTuongId ?? '')).filter(Boolean));
}

function trangThaiCua(r, daTungAp) {
  if (r.dang_dung === true) return TRANG_THAI.DANG_AP;
  if (daTungAp.has(String(r.id))) return TRANG_THAI.DA_TUNG_AP;
  // Bản toàn hệ không áp được ở màn này — xem `KE_THUA` ở trên.
  if (r.team_id == null || r.team_id === '') return TRANG_THAI.KE_THUA;
  return TRANG_THAI.CHO_DUYET;
}

/**
 * Mọi phiên bản team NHÌN THẤY — của team, và bản toàn hệ (`team_id IS NULL`).
 * Hợp đồng đọc hai vế đã cài sẵn trong tầng truy vấn của A; ở đây chỉ phân loại.
 */
export async function danhSachBan(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const [dong, daTungAp] = await Promise.all([db.chon(BANG, {}), idDaTungAp(db)]);

  const ban = dong
    .map((r) => ({
      id: String(r.id),
      phienBan: Number(r.phien_ban),
      // `team_id` rỗng = bản TOÀN HỆ. Màn này KHÔNG sửa được nó — xem khối ② đầu file.
      toanHe: r.team_id == null || r.team_id === '',
      dangDung: r.dang_dung === true,
      trangThai: trangThaiCua(r, daTungAp),
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
 * định cách bot nói với khách. Sửa đè là xoá mất bản mà 51 page đã chạy bằng nó — và lúc cần
 * lùi thì không còn gì để lùi về.
 */
export async function luuBanNhap(boiCanh, { noiDung, ghiChu = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);

  const chu = String(noiDung == null ? '' : noiDung);
  if (chu.trim().length < DAI_TOI_THIEU) {
    // Bộ luật đang chạy dài 6.734 ký tự. Một bản vài chục ký tự gần như chắc chắn là dán
    // nhầm hoặc ô soạn bị xoá trắng, và áp nó vào là 51 page mất sạch quy tắc cứng.
    throw new LoiBoLuat(
      `bộ luật chung chỉ có ${chu.trim().length} ký tự — quá ngắn (tối thiểu ${DAI_TOI_THIEU}). `
      + 'Bản đang chạy dài 6.734 ký tự; một bản ngắn thế này gần như chắc chắn là dán nhầm.',
      'qua_ngan',
    );
  }

  const db = congTruyVan(bc);
  const { ban, dangAp } = await danhSachBan(bc);
  if (dangAp && dangAp.noiDung === chu) {
    throw new LoiBoLuat('nội dung không khác bản đang áp — không tạo bản trùng.', 'khong_doi');
  }

  const phienBan = Math.max(0, ...ban.map((b) => b.phienBan)) + 1;
  const dong = await db.them(BANG, {
    phien_ban: phienBan,
    noi_dung: chu,
    dang_dung: false,              // ⛔ KHÔNG áp ngay. Áp là một thao tác riêng.
    nguoi_sua: bc.tenDangNhap || String(bc.nguoiDungId || ''),
    sua_luc: new Date().toISOString(),
  });

  await ghi(bc, {
    hanhDong: HANH_DONG_LUU,
    doiTuongLoai: BANG,
    doiTuongId: dong ? String(dong.id) : null,
    sau: { phien_ban: phienBan, so_ky_tu: chu.length, uoc_token: uocToken(chu) },
    ghiChu: ghiChu || `lưu bản nháp v${phienBan}`,
  });

  return { id: dong ? String(dong.id) : null, phienBan, daAp: false };
}

/**
 * ÁP một phiên bản — và đây cũng là nút LÙI VỀ BẢN TRƯỚC. Cùng một hàm, cố ý:
 * «áp bản v5» và «lùi về bản v3» là đúng một thao tác nhìn từ hai phía. Viết hai hàm là đẻ
 * hai đường ghi cho cùng một sự việc, rồi một trong hai quên ghi nhật ký.
 */
export async function apPhienBan(boiCanh, id, { lyDo = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);

  const db = congTruyVan(bc);
  const { ban, dangAp } = await danhSachBan(bc);
  const b = ban.find((x) => x.id === String(id));
  if (!b) throw new LoiBoLuat(`không có bản id=${id} trong tầm nhìn của team này.`, 'khong_thay', 404);
  if (b.toanHe) {
    // Xem khối ② đầu file: tầng truy vấn cố ý không cho ghi vào dòng toàn hệ.
    throw new LoiBoLuat(
      'đây là bản TOÀN HỆ (dùng chung mọi team) — màn này không sửa và không áp nó được. '
      + 'Team đang kế thừa nó sẵn; muốn khác thì soạn một bản riêng của team.',
      'ban_toan_he', 400,
    );
  }
  if (b.dangDung) throw new LoiBoLuat(`bản v${b.phienBan} đang áp rồi.`, 'dang_ap');

  const laLui = !!(dangAp && b.phienBan < dangAp.phienBan);

  // Hạ bản cũ TRƯỚC, dựng bản mới SAU. Ngược lại thì có một khoảnh khắc hai bản cùng
  // `dang_dung=true`, và `docBoLuatChung` của người A lấy `phien_ban` cao nhất — tức là
  // trong khoảnh khắc đó một lượt lùi có thể vẫn đọc ra bản mới.
  //
  // ⚠️ KHÔNG có giao dịch: tầng truy vấn của A chưa phơi `giaoDich()` ra. Nếu hạ xong mà
  //    dựng hỏng thì team KHÔNG có bản nào đang áp, và `docBoLuatChung` trả `null` ⇒ prompt
  //    rơi về bản toàn hệ (bản kế thừa), KHÔNG phải rơi về rỗng. Hỏng theo hướng an toàn.
  //    Ghi rõ ở đây để người sau không tưởng là đã có giao dịch.
  for (const cu of ban.filter((x) => x.dangDung && !x.toanHe)) {
    await db.sua(BANG, { id: cu.id }, { dang_dung: false });
  }
  await db.sua(BANG, { id: b.id }, { dang_dung: true, sua_luc: new Date().toISOString() });

  const anhHuong = await demAnhHuong(bc);
  await ghi(bc, {
    hanhDong: HANH_DONG_AP,
    doiTuongLoai: BANG,
    doiTuongId: String(b.id),
    truoc: dangAp ? { phien_ban: dangAp.phienBan, id: dangAp.id } : null,
    sau: {
      phien_ban: b.phienBan,
      la_lui: laLui,
      so_page_anh_huong: anhHuong.tongPage,
      so_page_bat_bot: anhHuong.dangBatBot,
    },
    ghiChu: lyDo || (laLui ? `LÙI về bản v${b.phienBan}` : `áp bản v${b.phienBan}`),
  });

  return { id: String(b.id), phienBan: b.phienBan, laLui, anhHuong };
}
