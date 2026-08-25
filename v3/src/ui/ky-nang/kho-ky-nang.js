// TẦNG ĐỌC/GHI CỦA MÀN «THƯ VIỆN KỸ NĂNG» (G2-C2, sóng 1).
//
// Kỹ năng là TẦNG CÒN THIẾU giữa bộ luật chung và kịch bản page (`01-QUYET-DINH.md` §6):
// khối tư vấn dùng lại được, bật cho đúng sản phẩm cần.
//
// ═══ VÌ SAO TẦNG NÀY ĐÁNG TIỀN — số thật, không phải lý thuyết ═══════════════════════════
// §6 đo được: hai sản phẩm CÓ SIZE đang hoàn **26,8%** và **19,2%**, trong khi sản phẩm
// không size hoàn **9,3%** — và cả hai đều CHƯA bật kỹ năng hỏi size. Đó là toàn bộ lý do
// màn này tồn tại: một công tắc, và nó đụng tới tỉ lệ hoàn hàng.
//
// ═══ HAI TRẠNG THÁI RẤT DỄ NHẦM, VÀ CHÚNG KHÁC HẲN NHAU ═════════════════════════════════
//   · `bat = false`               → kỹ năng TẮT. Không page nào nhận.
//   · `bat = true`, nhóm RỖNG     → BẬT CHO CẢ TEAM. Mọi page nhận.
//   · `bat = true`, nhóm có mã SP → chỉ page bán đúng sản phẩm đó nhận.
// Hợp đồng này do `src/chat/rap-prompt.js#docKyNang` của người A định nghĩa, KHÔNG phải do
// màn này đặt ra. Nhóm rỗng nghĩa là «quản trị đã bật có chủ đích, không khoanh nhóm» —
// khác hẳn «chưa ai bật». Màn phải nói ra chỗ khác nhau đó bằng chữ, vì nhìn vào cột
// `bat_cho_nhom_sp` trống thì hai nghĩa trông y hệt.

import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';

export const BANG = 'ky_nang';
export const BANG_SAN_PHAM = 'san_pham';
export const BANG_PAGE = 'page';

export const HANH_DONG_BAT_TAT = 'bat_tat_ky_nang';
export const HANH_DONG_DAT_NHOM = 'dat_nhom_ky_nang';

export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);

/** Ba phạm vi, đặt tên để màn hình và nhật ký nói cùng một thứ tiếng. */
export const PHAM_VI = Object.freeze({
  TAT: 'tat',
  CA_TEAM: 'ca_team',
  THEO_NHOM: 'theo_nhom',
});

export const CHU_PHAM_VI = Object.freeze({
  tat: 'Đang TẮT — không page nào nhận',
  ca_team: 'Bật cho CẢ TEAM — mọi page đều nhận',
  theo_nhom: 'Chỉ những sản phẩm đã chọn',
});

export class LoiKyNang extends Error {
  constructor(thongDiep, ma = 'ky_nang', status = 400) {
    super(thongDiep);
    this.name = 'LoiKyNang';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _pheuNhatKy = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKyNang('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

export function datPheuNhatKy(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiKyNang('datPheuNhatKy cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

export const daNoiTruyVanKyNang = () => typeof _taoTruyVan === 'function';

export function congTruyVan(bc) {
  if (!_taoTruyVan) {
    throw new LoiKyNang('chưa nối cổng truy vấn — gọi datTaoTruyVan() lúc dựng ứng dụng', 'chua_noi', 500);
  }
  return _taoTruyVan(bc);
}

async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiKyNang('chưa nối phễu nhật ký — từ chối ghi vì không truy ngược được', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/** Cùng tỉ lệ với màn bộ luật — một chỗ duy nhất thì hai màn không nói hai con số. */
export const KY_TU_MOI_TOKEN = 2.985;
export const uocToken = (chu) => Math.round(String(chu || '').length / KY_TU_MOI_TOKEN);

const nhomCua = (r) => (Array.isArray(r.bat_cho_nhom_sp) ? r.bat_cho_nhom_sp.filter(Boolean) : []);

export function phamViCua(r) {
  if (r.bat !== true) return PHAM_VI.TAT;
  return nhomCua(r).length ? PHAM_VI.THEO_NHOM : PHAM_VI.CA_TEAM;
}

/* ─────────────────────────── đọc ─────────────────────────── */

/**
 * Thư viện kỹ năng của team, kèm SỐ PAGE THẬT SỰ NHẬN mỗi kỹ năng.
 *
 * Con số đó là thứ đáng hiện nhất: một kỹ năng «đang bật» mà 0 page nhận (vì khoanh nhóm
 * vào một mã sản phẩm không page nào bán) trông y hệt một kỹ năng đang chạy tốt.
 */
export async function manKyNang(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const [dong, sanPham, pages] = await Promise.all([
    db.chon(BANG, {}, { sapXep: 'ma' }),
    db.chon(BANG_SAN_PHAM, {}, { sapXep: 'ma' }),
    db.chon(BANG_PAGE, {}),
  ]);

  // `san_pham.page_id` là khoá ngoại bigint sang `page.id`. Gom mã SP theo page một lần.
  const spTheoPage = new Map();
  for (const s of sanPham) {
    const k = String(s.page_id ?? '');
    if (!k) continue;
    if (!spTheoPage.has(k)) spTheoPage.set(k, []);
    spTheoPage.get(k).push(String(s.ma));
  }

  const demPageNhan = (r) => {
    if (r.bat !== true) return 0;
    const nhom = nhomCua(r);
    if (!nhom.length) return pages.length;            // bật cả team
    const t = new Set(nhom.map(String));
    return pages.filter((p) => (spTheoPage.get(String(p.id)) || []).some((m) => t.has(m))).length;
  };

  const kyNang = dong.map((r) => ({
    id: String(r.id),
    ma: r.ma,
    ten: r.ten || r.ma,
    bat: r.bat === true,
    nhom: nhomCua(r).map(String),
    phamVi: phamViCua(r),
    soPageNhan: demPageNhan(r),
    soKyTu: String(r.noi_dung || '').length,
    uocToken: uocToken(r.noi_dung),
    noiDung: r.noi_dung || '',
    phienBan: Number(r.phien_ban || 1),
  }));

  return {
    teamId: bc.teamId,
    kyNang,
    sanPham: sanPham.map((s) => ({ ma: String(s.ma), ten: s.ten || s.ma, pageId: String(s.page_id ?? '') })),
    soPage: pages.length,
    chuPhamVi: CHU_PHAM_VI,
    canhBao: canhBaoKyNang(kyNang, { soSanPham: sanPham.length, soPage: pages.length }),
    trong: kyNang.length ? null : {
      rong: true,
      vi: 'chua_cai_dat',
      noi: 'Team này chưa có kỹ năng nào trong thư viện — tầng giữa bộ luật chung và kịch bản '
        + 'đang trống, nên bot chỉ có luật chung + kịch bản page.',
      diTiep: { chu: 'Kỹ năng do di trú gieo (`npm run di-tru`)', duong: null },
    },
  };
}

/**
 * Cảnh báo suy từ cả thư viện. Suy Ở ĐÂY để có bài test, không suy trong HTML.
 */
export function canhBaoKyNang(kyNang, { soSanPham, soPage } = {}) {
  const ra = [];
  const bat = kyNang.filter((k) => k.bat);

  if (kyNang.length && !bat.length) {
    ra.push({
      ma: 'khong_bat_cai_nao', muc: 'vang',
      chu: `Cả ${kyNang.length} kỹ năng đều đang TẮT — tầng kỹ năng không vào prompt của page nào. `
        + 'Hai sản phẩm có size đang hoàn 26,8% và 19,2% (sản phẩm không size hoàn 9,3%), và '
        + 'cả hai đều chưa bật kỹ năng hỏi size.',
    });
  }

  // Kỹ năng BẬT mà 0 page nhận — trông y hệt kỹ năng đang chạy tốt nếu chỉ nhìn cột `bat`.
  const batMaTrong = bat.filter((k) => k.soPageNhan === 0);
  if (batMaTrong.length) {
    ra.push({
      ma: 'bat_ma_khong_ai_nhan', muc: 'do',
      chu: `${batMaTrong.length} kỹ năng đang BẬT nhưng KHÔNG page nào nhận `
        + `(${batMaTrong.map((k) => k.ma).join(', ')}) — nhóm sản phẩm đã khoanh không khớp `
        + 'page nào. Trông như đang chạy, thực tế không vào prompt của ai.',
    });
  }

  if (soSanPham === 0 && soPage > 0) {
    ra.push({
      ma: 'chua_co_san_pham', muc: 'vang',
      chu: 'Chưa có sản phẩm nào trong CSDL — nên chỉ bật được kỹ năng cho CẢ TEAM, không '
        + 'khoanh theo nhóm sản phẩm được. Đồng bộ sản phẩm từ POS trước.',
    });
  }
  return ra;
}

/* ─────────────────────────── ghi ─────────────────────────── */

async function traKyNang(bc, id) {
  const db = congTruyVan(bc);
  const r = await db.mot(BANG, { id: String(id) });
  if (!r) throw new LoiKyNang(`không có kỹ năng id=${id} trong team này.`, 'khong_thay', 404);
  return r;
}

/** Bật/tắt một kỹ năng. Đây là công tắc đụng tới tỉ lệ hoàn hàng — có nhật ký. */
export async function batTatKyNang(boiCanh, id, bat) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const r = await traKyNang(bc, id);
  const moi = !!bat;
  if (moi === (r.bat === true)) return { id: String(id), bat: moi, doi: false };

  const db = congTruyVan(bc);
  await db.sua(BANG, { id: String(id) }, { bat: moi });

  await ghi(bc, {
    hanhDong: HANH_DONG_BAT_TAT,
    doiTuongLoai: BANG,
    doiTuongId: String(id),
    truoc: { bat: r.bat === true, pham_vi: phamViCua(r) },
    sau: { bat: moi, pham_vi: phamViCua({ ...r, bat: moi }) },
    ghiChu: `${moi ? 'BẬT' : 'TẮT'} kỹ năng "${r.ten || r.ma}"`,
  });
  return { id: String(id), bat: moi, doi: true };
}

/**
 * Đặt nhóm sản phẩm cho một kỹ năng.
 * Mảng RỖNG = bật cho cả team (hợp đồng của `docKyNang`) — không phải «tắt». Nơi gọi muốn
 * tắt thì gọi `batTatKyNang`, và màn hình phải nói rõ hai việc đó khác nhau.
 */
export async function datNhomSanPham(boiCanh, id, nhom) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const r = await traKyNang(bc, id);

  const ds = [...new Set((Array.isArray(nhom) ? nhom : []).map(String).map((x) => x.trim()).filter(Boolean))];
  const db = congTruyVan(bc);

  // Mã sản phẩm phải CÓ THẬT — khoanh vào một mã gõ sai thì kỹ năng bật mà không ai nhận,
  // và đó đúng là kiểu hỏng chỉ lộ ra khi ai đó đi đọc tỉ lệ hoàn hàng ba tuần sau.
  if (ds.length) {
    const sp = await db.chon(BANG_SAN_PHAM, {});
    const co = new Set(sp.map((s) => String(s.ma)));
    const la = ds.filter((m) => !co.has(m));
    if (la.length) {
      throw new LoiKyNang(
        `mã sản phẩm không có thật: ${la.join(', ')}. Khoanh nhóm vào mã sai thì kỹ năng bật `
        + 'mà không page nào nhận, và chỗ hỏng chỉ lộ ra khi đọc tỉ lệ hoàn hàng nhiều tuần sau.',
        'ma_san_pham_la',
      );
    }
  }

  const cu = nhomCua(r);
  if (cu.length === ds.length && cu.every((x, i) => String(x) === ds[i])) {
    return { id: String(id), nhom: ds, doi: false };
  }

  await db.sua(BANG, { id: String(id) }, { bat_cho_nhom_sp: ds });
  await ghi(bc, {
    hanhDong: HANH_DONG_DAT_NHOM,
    doiTuongLoai: BANG,
    doiTuongId: String(id),
    truoc: { nhom: cu, pham_vi: phamViCua(r) },
    sau: { nhom: ds, pham_vi: phamViCua({ ...r, bat_cho_nhom_sp: ds }) },
    ghiChu: ds.length
      ? `khoanh kỹ năng "${r.ten || r.ma}" cho ${ds.length} sản phẩm`
      : `bỏ khoanh nhóm — kỹ năng "${r.ten || r.ma}" áp cho CẢ TEAM`,
  });
  return { id: String(id), nhom: ds, doi: true };
}
