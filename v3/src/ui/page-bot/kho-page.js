// TẦNG ĐỌC CỦA MÀN «PAGE & BOT» (G2-B2, sóng 0 giai đoạn 2).
//
// Màn này gỡ chặn H8 và cái số đau nhất của dự án: **514/514 page chưa có marketer** (đo
// 25/08 trên `aicloser_v3`; tài liệu ghi 314/315 là số cũ). Không gán xong thì mọi báo cáo
// cắt theo marketer đều trống.
//
// ─── BA CỘT, BA CHỦ SỞ HỮU KHÁC NHAU — đây là thứ quan trọng nhất của file này ──────────
//
// | Cột | Ai là NGUỒN THẬT | Ghi từ màn này thì sao |
// |---|---|---|
// | `bot_ai_bat` | `ai-enabled.json` + RAM tiến trình bot | **KHÔNG ghi vào CSDL.** Đi qua `noi-day/cau-bot-v1.js`; cột trong CSDL chỉ là bản sao |
// | `marketer`   | CSDL v3. **`PHIEU-B-Y4` xong 25/08** — di trú nay `CASE WHEN page.marketer <> '' THEN page.marketer ELSE EXCLUDED.marketer END` | ghi được, **và di trú không xoá nữa**: nguồn điền vào chỗ trống, không bao giờ xoá chỗ đã có |
// | `trong_diem` | CSDL v3, và CHỈ CSDL v3 | ghi thẳng, an toàn — cột này không nằm trong câu `ON CONFLICT DO UPDATE` của di trú |
//
// Ba dòng trên là lý do màn này không phải «một cái bảng có mấy cái công tắc». Gạt nhầm chỗ
// thì hoặc bot không đổi hành vi (nhưng màn báo đã đổi), hoặc công sức gán 514 marketer bay
// sạch trong một lượt `npm run di-tru` mà không ai được báo.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

export const BANG = 'page';

/** Cột `napPage` GHI ĐÈ mỗi lượt di trú (`db/di-tru/nap.js`, câu ON CONFLICT DO UPDATE).
 *  Đọc thẳng từ đó, KHÔNG gõ lại theo trí nhớ — bài test đối chiếu với file thật. */
export const COT_BI_DI_TRU_GHI_DE = Object.freeze([
  'ten', 'thi_truong', 'nganh_hang', 'pos_shop_id', 'pos_via',
  'token_idx', 'the_pancake', 'mat_dau', 'kiem_luc',
]);

/** Cột màn này cho sửa, và cột đó có bị di trú ghi đè không. */
export const COT_SUA_DUOC = Object.freeze({
  // Cả hai nay đều BỀN. `marketer` từng không bền — `PHIEU-B-Y4` (A làm 25/08) đổi câu di
  // trú thành `CASE WHEN page.marketer <> '' THEN page.marketer ELSE EXCLUDED.marketer END`:
  // nguồn ĐIỀN VÀO CHỖ TRỐNG nhưng KHÔNG BAO GIỜ XOÁ CHỖ ĐÃ CÓ.
  marketer: { benVung: true, vi: null },
  trong_diem: { benVung: true, vi: null },
});

export class LoiPageBot extends Error {
  constructor(thongDiep, ma = 'page_bot', status = 400) {
    super(thongDiep);
    this.name = 'LoiPageBot';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiPageBot('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

export const daNoiTruyVanPage = () => typeof _taoTruyVan === 'function';

export function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiPageBot('chưa nối cổng truy vấn — gọi datTaoTruyVan(taoTruyVan) lúc dựng ứng dụng', 'chua_noi', 500);
  }
  return _taoTruyVan(bc);
}

/* ─────────────────────────── bộ lọc ─────────────────────────── */

export const LOC = Object.freeze({
  TAT_CA: 'tat_ca',
  BOT_BAT: 'bot_bat',
  BOT_TAT: 'bot_tat',
  THIEU_MARKETER: 'thieu_marketer',
  CO_MARKETER: 'co_marketer',
  TRONG_DIEM: 'trong_diem',
  MAT_DAU: 'mat_dau',
});
const LOC_HOP_LE = new Set(Object.values(LOC));

export const CHU_LOC = Object.freeze({
  [LOC.TAT_CA]: 'Tất cả',
  [LOC.BOT_BAT]: 'Bot đang BẬT',
  [LOC.BOT_TAT]: 'Bot đang tắt',
  [LOC.THIEU_MARKETER]: 'Chưa có marketer',
  [LOC.CO_MARKETER]: 'Đã có marketer',
  [LOC.TRONG_DIEM]: 'Page trọng điểm',
  [LOC.MAT_DAU]: 'Mất dấu',
});

const co = (v) => v === true;
const chuoiCo = (v) => String(v == null ? '' : v).trim() !== '';

function hopLoc(p, loc) {
  switch (loc) {
    case LOC.BOT_BAT: return co(p.bot_ai_bat);
    case LOC.BOT_TAT: return !co(p.bot_ai_bat);
    case LOC.THIEU_MARKETER: return !chuoiCo(p.marketer);
    case LOC.CO_MARKETER: return chuoiCo(p.marketer);
    case LOC.TRONG_DIEM: return co(p.trong_diem);
    case LOC.MAT_DAU: return co(p.mat_dau);
    default: return true;
  }
}

function hopTim(p, tim) {
  if (!tim) return true;
  const t = String(tim).toLowerCase();
  return [p.ten, p.page_id, p.thi_truong, p.nganh_hang, p.marketer]
    .some((v) => String(v == null ? '' : v).toLowerCase().includes(t));
}

/* ─────────────────────────── đọc ─────────────────────────── */

export const MOI_TRANG = 50;

/**
 * Danh sách page của TEAM ĐANG MỞ, đã lọc và cắt trang.
 *
 * Lọc và cắt trang trong JS chứ không đẩy xuống SQL: tầng truy vấn của người A chỉ dựng
 * `cot = $n`, không có `LIKE`, không có `LIMIT` (xem `noi-day/cong-du-lieu-that.js`). Một mẻ
 * đọc trọn `page` của team — hôm nay 514 dòng cho `tieu-alpha`. Chịu được; nợ đã ghi.
 */
export async function danhSachPage(boiCanh, { loc = LOC.TAT_CA, tim = '', trang = 0 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!LOC_HOP_LE.has(loc)) {
    throw new LoiPageBot(`bộ lọc lạ: "${loc}" (có: ${[...LOC_HOP_LE].join(', ')})`, 'loc_la');
  }
  const db = congTruyVan(bc);
  const tatCa = await db.chon(BANG, {}, { sapXep: 'ten' });

  const daLoc = tatCa.filter((p) => hopLoc(p, loc) && hopTim(p, tim));
  const soTrang = Math.max(1, Math.ceil(daLoc.length / MOI_TRANG));
  const t = Math.min(Math.max(0, Number(trang) || 0), soTrang - 1);
  const cat = daLoc.slice(t * MOI_TRANG, (t + 1) * MOI_TRANG);

  return {
    page: cat.map(gonPage),
    trang: t,
    soTrang,
    soKhop: daLoc.length,
    soTong: tatCa.length,
    dem: demTheoLoc(tatCa),
    trong: cat.length ? null : viSaoRong({ soTong: tatCa.length, loc, tim }),
  };
}

/** Chỉ trả ra thứ màn hình dùng. `page.id` để gọi API, `page_id` là id Facebook để người đọc. */
export function gonPage(p) {
  return {
    id: String(p.id),
    pageId: String(p.page_id || ''),
    ten: p.ten || '',
    thiTruong: p.thi_truong || '',
    nganhHang: p.nganh_hang || '',
    marketer: p.marketer || '',
    botAiBat: co(p.bot_ai_bat),
    botcakeTat: co(p.botcake_tat),
    trongDiem: co(p.trong_diem),
    matDau: co(p.mat_dau),
  };
}

export function demTheoLoc(tatCa) {
  const d = {};
  for (const m of Object.values(LOC)) d[m] = tatCa.filter((p) => hopLoc(p, m)).length;
  return d;
}

/**
 * VÌ SAO danh sách rỗng — ba nghĩa khác hẳn nhau, và chỉ một trong ba là tin mừng.
 * Trả rỗng trần ở đây là tái phạm đúng lỗi 24/08.
 */
export function viSaoRong({ soTong, loc, tim }) {
  if (soTong === 0) {
    return {
      rong: true,
      vi: 'chua_cai_dat',
      noi: 'Team này chưa được chia page nào — nên màn này không có gì để cấu hình.',
      diTiep: { chu: 'Sang màn Cấu hình team', duong: '/cau-hinh-team' },
    };
  }
  if (tim) {
    return { rong: true, vi: 'khong_khop', noi: `Không page nào khớp "${tim}".`, diTiep: null };
  }
  if (loc === LOC.THIEU_MARKETER) {
    // Đây là cái rỗng ĐÁNG MỪNG DUY NHẤT của màn này.
    return { rong: true, vi: 'xong', noi: 'Mọi page đều đã có marketer.', diTiep: null };
  }
  return { rong: true, vi: 'khong_khop', noi: `Không page nào ở nhóm "${CHU_LOC[loc] || loc}".`, diTiep: null };
}

/** Một page của team đang mở, tra theo `page.id`. Không thuộc team → `null` (router trả 404). */
export async function motPage(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const p = await db.mot(BANG, { id: String(id) });
  return p ? gonPage(p) : null;
}
