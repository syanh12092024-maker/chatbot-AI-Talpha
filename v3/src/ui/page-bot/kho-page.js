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
  'ten', 'pos_shop_id', 'pos_via',
  'token_idx', 'the_pancake', 'mat_dau', 'kiem_luc',
]);

/** Cột màn này cho sửa, và cột đó có bị di trú ghi đè không. */
export const COT_SUA_DUOC = Object.freeze({
  // Cả năm nay đều BỀN. `marketer` từng không bền — `PHIEU-B-Y4` (A làm 25/08) đổi câu di
  // trú thành `CASE WHEN page.marketer <> '' THEN page.marketer ELSE EXCLUDED.marketer END`:
  // nguồn ĐIỀN VÀO CHỖ TRỐNG nhưng KHÔNG BAO GIỜ XOÁ CHỖ ĐÃ CÓ.
  marketer: { benVung: true, vi: null },
  trong_diem: { benVung: true, vi: null },
  // 15/09: ba cột nữa mở cho sửa. `thi_truong`/`nganh_hang` phải VÁ DI TRÚ TRƯỚC (cùng
  // nhánh CASE) — trước lượt này chúng bị ghi đè trần, nên mở nút mà không vá là hứa với
  // người dùng một thứ lượt «Kéo dữ liệu về» kế tiếp sẽ xoá.
  thi_truong: { benVung: true, vi: null },
  nganh_hang: { benVung: true, vi: null },
  // `botcake_tat` chưa bao giờ nằm trong câu ghi đè — an toàn sẵn, như `trong_diem`.
  botcake_tat: { benVung: true, vi: null },
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
 * BỘ ĐỌC CỬA KIỂM — tiêm từ `vai-b.js`, và phải là CÙNG hàm mà màn «Cửa kiểm sẵn sàng»
 * dùng. Hai màn đọc hai nguồn là hai con số, rồi không ai biết tin cái nào.
 *
 * ⚠️ Không nối được ≠ mọi page đều ổn. Thiếu bộ đọc thì cột «Còn thiếu gì» phải nói
 *    «chưa đọc được», KHÔNG được để trống — một ô trống trông y hệt «page này không
 *    thiếu gì», và đó là kết luận ngược hẳn sự thật.
 */
let _docSanSang = null;
export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDocSanSang: cần một hàm');
  _docSanSang = fn || null;
}
export const daNoiCuaKiem = () => typeof _docSanSang === 'function';

/** Đọc cửa kiểm một lần cho cả mẻ. Hỏng thì trả lý do, không ném — bảng page vẫn phải hiện. */
async function docCuaKiem() {
  if (!_docSanSang) {
    return { doc: null, viSao: 'Chưa nối cầu sang tiến trình bot — xem màn Sức khoẻ hệ thống.' };
  }
  try {
    const kq = await _docSanSang();
    return { doc: new Map((kq?.pages || []).map((x) => [String(x.pageId), x])), viSao: null };
  } catch (e) {
    return { doc: null, viSao: `Cầu sang tiến trình bot lỗi: ${e?.message || e}` };
  }
}

/** Một dòng cửa kiểm, rút gọn còn thứ bảng page cần: hiện gì trong ô, và màu gì. */
export function gonCuaKiem(r) {
  if (!r) return { ma: 'BOT_KHONG_THAY', ten: 'Bot không thấy page này', muc: 'chan' };
  const chan = (r.blockers || [])[0];
  if (chan) return { ma: chan.code, ten: TEN_NGAN[chan.code] || chan.code, muc: 'chan' };
  const nhac = (r.warnings || [])[0];
  if (nhac) return { ma: nhac.code, ten: TEN_NGAN[nhac.code] || nhac.code, muc: 'nhac' };
  return { ma: 'READY', ten: 'Đủ điều kiện', muc: 'san' };
}

/**
 * Tên NGẮN cho ô bảng — bảng có 50 dòng, câu dài làm vỡ cột.
 * Câu đầy đủ và nút «đi sửa» vẫn ở màn «Cửa kiểm sẵn sàng`; đây chỉ là cái nhãn.
 */
export const TEN_NGAN = Object.freeze({
  NO_TOKEN: 'Không có token',
  MISSING_TAGS: 'Thiếu thẻ Pancake',
  MISSING_PRODUCT: 'Chưa có bảng giá',
  MISSING_SCRIPT: 'Chưa có lời chào',
  MISSING_POS: 'Chưa nối POS',
  THIN_SCRIPT: 'Kịch bản mỏng',
  SCRIPT_STALE: 'Kịch bản cũ',
  READY: 'Đủ điều kiện',
});

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

  // Cửa kiểm đọc MỘT lần cho cả trang, không phải mỗi dòng một lượt.
  const { doc, viSao } = await docCuaKiem();

  // CR-15/09 — sản phẩm GỐC của từng page trong trang. Đọc MỘT mẻ cho cả trang, cùng lý do
  // với cửa kiểm ở trên: 25 dòng × 1 truy vấn là 25 lượt đi CSDL cho một lần vẽ bảng.
  // LƯỚI MIGRATION 014 (án lệ #7). Deploy code trước khi áp 014 thì bảng `san_pham_goc`
  // chưa tồn tại và MỌI lượt vẽ bảng này ném — màn Page & bot chết trắng. Đã xảy ra thật
  // 16/09: code CR6 lên prod trước migration vì tôi nói «014 chưa cần chạy».
  // Mù thì NÓI RA: cột hiện «chưa áp 014», không ném, và không giả vờ «page chưa gán».
  const coBangGoc = await coBangSanPhamGoc(db);
  const sanPhamGoc = coBangGoc ? await docSanPhamGocCuaTrang(db, cat) : new Map();
  const dsGoc = coBangGoc ? await db.chon('san_pham_goc', {}, { sapXep: 'ten' }) : [];

  return {
    page: cat.map((p) => ({
      ...gonPage(p),
      cuaKiem: doc ? gonCuaKiem(doc.get(String(p.page_id))) : null,
      // Mảng, không phải một giá trị: một page BÁN ĐƯỢC nhiều sản phẩm gốc, và gộp chúng
      // thành một chuỗi là mất thông tin ngay ở chỗ CR này sinh ra để giữ.
      sanPhamGoc: sanPhamGoc.get(String(p.id)) || [],
    })),
    // Danh mục để màn dựng ô chọn. Rỗng = chưa ai soát gộp (phiếu CR3), và màn phải nói
    // đúng câu đó chứ không hiện một ô chọn trống không lý do.
    sanPhamGocChonDuoc: dsGoc.map((g) => ({
      maGoc: g.ma_goc, ten: g.ten || g.ma_goc, soHieu: g.so_hieu || null,
    })),
    // Phân biệt «chưa áp migration» với «chưa ai soát gộp» — hai câu dẫn người đọc đi hai
    // hướng khác nhau, và chỉ một trong hai là việc của họ.
    sanPhamGocApDuoc: coBangGoc,
    cuaKiemDocDuoc: !!doc,
    cuaKiemViSao: viSao,
    trang: t,
    soTrang,
    soKhop: daLoc.length,
    soTong: tatCa.length,
    dem: demTheoLoc(tatCa),
    trong: cat.length ? null : viSaoRong({ soTong: tatCa.length, loc, tim }),
  };
}

/**
 * Bảng `san_pham_goc` có tồn tại chưa (migration 014)? Đọc MỘT lần rồi nhớ.
 * `to_regclass` trả NULL thay vì ném khi bảng không có — đúng khuôn lưới migration của
 * `src/db/kich-ban.js#coCotCap`.
 */
let _coBangGoc = null;
async function coBangSanPhamGoc(db) {
  if (_coBangGoc !== null) return _coBangGoc;
  try {
    // Tầng truy vấn chung không cho câu SQL trần, nên thử đọc một mẻ rỗng: bảng chưa có thì
    // `pg` ném `42P01`, và ta đọc đúng mã ấy chứ không nuốt mọi lỗi.
    await db.chon('san_pham_goc', {});
    _coBangGoc = true;
  } catch (e) {
    if (e?.code === '42P01' || /san_pham_goc.*does not exist|relation .* does not exist/i.test(e?.message || '')) {
      _coBangGoc = false;
      console.warn('[page-bot] migration 014 chưa áp — cột «Sản phẩm gốc» TẮT. Chạy `npm run migrate`.');
    } else {
      throw e; // lỗi khác thì phải nổ, đừng đội lốt «chưa áp migration»
    }
  }
  return _coBangGoc;
}

/**
 * Sản phẩm GỐC của từng page trong trang (CR-15/09) → Map<pageId, [{maGoc, ten, soBienThe}]>.
 *
 * Đọc `san_pham` của cả trang MỘT mẻ rồi gộp ở tầng JS. Biến thể chưa ai gộp (`ma_goc` null)
 * bị bỏ qua ở đây — nhưng KHÔNG im lặng: `soBienTheChuaGop` đếm chúng, để màn nói được
 * «page này có 3 biến thể mà chưa cái nào gộp» thay vì hiện một ô trống.
 */
async function docSanPhamGocCuaTrang(db, cat) {
  const ra = new Map();
  if (!cat.length) return ra;
  const ids = cat.map((p) => String(p.id));
  const sp = await db.chon('san_pham', { page_id: ids });
  const ten = new Map();
  for (const g of await db.chon('san_pham_goc', {})) ten.set(g.ma_goc, g.ten || g.ma_goc);

  for (const pid of ids) ra.set(pid, []);
  const dem = new Map(); // pageId → Map<maGoc, số biến thể>
  const chuaGop = new Map();
  for (const r of sp) {
    const pid = String(r.page_id);
    if (!ra.has(pid)) continue;
    if (!r.ma_goc) { chuaGop.set(pid, (chuaGop.get(pid) || 0) + 1); continue; }
    if (!dem.has(pid)) dem.set(pid, new Map());
    const m = dem.get(pid);
    m.set(r.ma_goc, (m.get(r.ma_goc) || 0) + 1);
  }
  for (const [pid, m] of dem) {
    ra.set(pid, [...m.entries()]
      .map(([maGoc, soBienThe]) => ({ maGoc, ten: ten.get(maGoc) || maGoc, soBienThe }))
      .sort((a, b) => a.ten.localeCompare(b.ten)));
  }
  for (const [pid, n] of chuaGop) {
    const ds = ra.get(pid) || [];
    ds.soBienTheChuaGop = n; // gắn vào mảng, màn đọc được mà không đổi hình dạng phần tử
    ra.set(pid, ds);
  }
  return ra;
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
