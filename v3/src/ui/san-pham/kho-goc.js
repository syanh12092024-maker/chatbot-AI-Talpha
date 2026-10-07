// TẦNG GHI CỦA «SẢN PHẨM GỐC» trên màn «Sản phẩm & kho».
//
// Bảng `san_pham_goc` (014) là danh mục do NGƯỜI định nghĩa — máy cố ý không tự tạo (xem
// `src/pos/doc-danh-muc.js`: 113 biến thể không số hiệu sẽ đẻ 113 dòng rác). Nhưng trước
// lượt này người cũng không tạo được bằng giao diện: nơi duy nhất sinh ra dòng là một
// script chỉ IN câu SQL đề nghị. Tức luật «của người» trên thực tế là «của người CÓ SSH».
//
// Ba việc của tầng này, đúng khuôn các màn khác: kiểm VAI, gọi tầng A, GHI NHẬT KÝ.
// Tầng A (`src/products/san-pham-goc.js`) giữ luật dữ liệu — mã gốc cấm dấu ":", số hiệu
// 1–4 chữ số, và không cho bỏ một sản phẩm gốc còn chỗ trỏ tới.
import { batBuocBoiCanh, batBuocVai, VAI } from '../../auth/boi-canh.js';
import { HANH_DONG, moTa as moTaHanhDong } from '../../audit/hanh-dong.js';
import { LoiSanPham } from './kho-san-pham.js';
import { botGhepTuDuLieu } from '../prompt-page/kho-prompt.js';
import { marketerCuaTeam } from '../../auth/kho-nguoi-dung.js';
import { phamViMarketer } from '../chung/pham-vi-marketer.js';
import { goiYChoSanPham, SO_NGAY } from '../../../../src/hrm/goi-y-marketer.js';

/**
 * CHỈ `quan-tri`. Đặt tên sản phẩm là đổi thứ bot gọi trước mặt khách, và mã gốc là khoá
 * mà kịch bản trỏ tới. Bản đầu tôi cho cả `quan-ly` sửa — sai luật đã ký của §9: «quản lý
 * đi kiểm, không đi làm», và lưới `phan-quyen-nam-vai` bắt đỏ ngay.
 */
export const VAI_SUA_DUOC = Object.freeze([VAI.QUAN_TRI]);
export const BANG = 'san_pham_goc';

let _cua = null;
let _pheuNhatKy = null;

/** Nhận bộ năm hàm của tầng A. Thiếu một là từ chối cả cụm — nửa cửa khó hiểu hơn không cửa. */
export function datKhoGoc(cua) {
  if (cua == null) { _cua = null; return null; }
  // LL13: + `chiTiet` · `monChuaGan` · `gan` · `go` — sản phẩm là lõi (thị trường = shop POS).
  // LL11: + `kienThuc` — sửa kiến thức sản phẩm (nhà mới của kỹ năng).
  // VE8a: + `goiYGop` · `gop` — gộp món POS thành sản phẩm (bản vẽ 2a′).
  // VE8b: + `luuGia` · `ganPage` · `goPage` — giá theo thị trường + gắn page ngay trong màn.
  const thieu = ['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop',
    'luuGia', 'ganPage', 'goPage']
    .filter((k) => typeof cua[k] !== 'function');
  if (thieu.length) throw new LoiSanPham(`datKhoGoc thiếu hàm: ${thieu.join(', ')}`, 'noi_day_thieu', 500);
  _cua = cua;
  return _cua;
}
export const daNoiKhoGoc = () => _cua != null;

export function datPheuNhatKyGoc(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datPheuNhatKyGoc cần một hàm');
  _pheuNhatKy = fn || null;
  return _pheuNhatKy;
}

/**
 * VE1 · 29/09: tab «Lịch sử» của một sản phẩm (bản vẽ 2a). Đường ĐỌC nhật ký tiêm vào như phễu ghi — tầng giao diện
 * không import `audit/index.js` (luật nối dây ở `vai-b.js`).
 */
let _docNhatKy = null;
export function datDocNhatKyGoc(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datDocNhatKyGoc cần một hàm');
  _docNhatKy = fn || null;
  return _docNhatKy;
}

/** Nhật ký của MỘT sản phẩm gốc, mới nhất trước. Chưa nối ⇒ ném 500: trả rỗng trông y hệt «chưa ai sửa gì». */
export async function lichSuGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docNhatKy) {
    throw new LoiSanPham('máy chủ chưa nối đường đọc nhật ký — KHÔNG phải «chưa ai sửa gì».', 'chua_noi', 500);
  }
  const pv = await phamViMarketer(bc);
  if (pv) chanNgoaiPhamVi(pv, await cua().chiTiet(bc, id));   // LL15d: lịch sử cũng chỉ của sản phẩm mình phụ trách
  const { dong } = await _docNhatKy(bc, { doiTuongLoai: BANG, doiTuongId: String(id), gioiHan: 50 });
  return (dong || []).map((r) => {
    const tn = String(r.tac_nhan || '');
    return {
      luc: r.xay_ra_luc,
      ai: tn.startsWith('nguoi:') ? tn.slice(6) : tn.startsWith('may:') ? 'máy · ' + tn.slice(4) : tn,
      hanhDong: r.hanh_dong, moTa: moTaHanhDong(r.hanh_dong), ghiChu: r.ghi_chu || '',
    };
  });
}

function cua() {
  if (!_cua) {
    throw new LoiSanPham(
      'máy chủ chưa nối kho sản phẩm gốc — lỗi dựng ứng dụng, KHÔNG phải «chưa có sản phẩm nào».',
      'chua_noi', 500,
    );
  }
  return _cua;
}

/** Ghi nhật ký CÓ NÉM: đổi danh mục sản phẩm mà không truy ngược được thì không nên xảy ra. */
async function ghi(bc, banGhi) {
  if (!_pheuNhatKy) {
    throw new LoiSanPham('chưa nối phễu nhật ký — từ chối sửa danh mục sản phẩm gốc', 'chua_noi', 500);
  }
  return _pheuNhatKy(bc, banGhi);
}

/* ═══ LL15d · 02/10 — MARKETER CHỈ THẤY SẢN PHẨM MÌNH PHỤ TRÁCH (01 §9) ═══
 * Phụ trách = `san_pham_goc.marketer_ma_nv` (031) — NGƯỜI chọn từ hồ sơ HRM (CR-28-09c), máy chỉ gợi ý từ đơn POS. Marketer (không
 * mang quản trị/quản lý) chỉ thấy + chỉ mở + chỉ sửa kiến thức của sản phẩm gán đúng mã NV của mình; sản phẩm chưa gán KHÔNG hiện
 * (màn nói có bao nhiêu và nhờ quản trị gán). Tài khoản marketer không mã NV (tạo tay) ⇒ không thấy sản phẩm nào, màn nói vì sao. */
const cuaToi = (pv, g) => !pv || (!!pv.maNv && g && g.marketerMaNv === pv.maNv);
function chanNgoaiPhamVi(pv, g) {
  if (cuaToi(pv, g)) return;
  throw new LoiSanPham(pv.maNv ? 'sản phẩm này không do bạn phụ trách — quản trị gán marketer ở tab Chung của sản phẩm'
    : 'tài khoản của bạn chưa gắn hồ sơ HRM (không có mã nhân viên) nên chưa phụ trách sản phẩm nào', 'khong_phu_trach', 403);
}

// Bộ đọc gợi ý từ đơn POS (`src/hrm/goi-y-marketer.js#taoDocGoiYMarketer`) — tiêm từ `chay-that.js`; vắng ⇒ màn nói «chưa nối».
let _docGoiY = null;
export function datDocGoiYMarketer(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datDocGoiYMarketer cần một hàm');
  _docGoiY = fn || null;
  return _docGoiY;
}
async function goiYCua(goc, chonDuoc) {
  if (!_docGoiY) return { noi: false, viSao: 'máy chủ chưa nối đọc đơn POS từ BigQuery (V3_BQ_KHOA)' };
  try {
    const du = await _docGoiY();
    const posMa = (goc.thiTruong || []).flatMap((t) => (t.mon || []).map((m) => m.posMa));
    return { noi: true, soNgay: SO_NGAY, docLuc: du.luc, goiY: goiYChoSanPham(du, posMa, chonDuoc) };
  } catch (e) {
    return { noi: false, viSao: `đọc đơn POS hỏng (${String(e?.message || e).slice(0, 120)})` };
  }
}
/** Marketer `maNv` có phải marketer chọn được của team không ⇒ trả { marketer: tên, marketerMaNv } cho tầng A; '' ⇒ bỏ gán. */
async function marketerTheoMa(bc, maNv) {
  const v = String(maNv ?? '').trim();
  if (!v) return { marketer: '', marketerMaNv: null };
  const nguoi = (await marketerCuaTeam(bc.teamId)).find((c) => c.maNv === v);
  if (!nguoi) throw new LoiSanPham(`mã ${v} không phải marketer (có hồ sơ HRM) của team này`, 'marketer_la', 400);
  return { marketer: nguoi.ten, marketerMaNv: nguoi.maNv };
}

/** Màn đọc: danh sách sản phẩm gốc (+ phạm vi marketer · số giá). */
export async function manSanPhamGoc(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const [ds, gia, pv] = await Promise.all([cua().ds(bc), cua().dem(bc), phamViMarketer(bc)]);
  const goc = ds.filter((g) => cuaToi(pv, g));
  return {
    goc,
    // LL15d: marketer chỉ thấy sản phẩm mình phụ trách — kèm số để màn nói phần còn lại ở đâu.
    phamVi: pv ? { chiCuaToi: true, coMaNv: !!pv.maNv, soCuaToi: goc.length, soTeam: ds.length,
      soChuaGan: ds.filter((g) => !g.marketerMaNv).length } : { chiCuaToi: false },
    // Giá KHÔNG về theo lượt kéo danh mục (POS trả `retail_price = 0`), nên màn phải nói
    // thẳng còn bao nhiêu món chưa có giá — im lặng ở đây là để bot cầm một kho hàng mà
    // không biết bán bao nhiêu.
    gia,
    // GSP2: `cho` / `khongCoSoHieu` ĐÃ GỠ (thợ GSP1 để lại) — sản phẩm gốc chỉ sinh từ gộp món POS theo SKU, hết «số hiệu chờ đặt tên».
    suaDuoc: bc.vai.some((v) => VAI_SUA_DUOC.includes(v)),
  };
}

// GSP1 (02/10): KHÔNG còn cửa HTTP nào gọi hàm này (router bỏ `POST /api/san-pham/goc` — gốc chỉ sinh từ gộp món POS theo SKU).
// Còn nằm lại vì `ui/san-pham/index.js` (ngoài phạm vi phiếu) vẫn re-export — gỡ ở phiếu có index.js (nợ §9 N-GSP-TAOGOC).
export async function taoGoc(boiCanh, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().tao(bc, than);
  await ghi(bc, {
    hanhDong: HANH_DONG.TAO_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, soHieu: kq.soHieu },
    ghiChu: `tạo sản phẩm gốc "${kq.maGoc}"${kq.soHieu ? ` (số hiệu ${kq.soHieu})` : ' — chưa gán số hiệu'}`,
  });
  return kq;
}

export async function suaGoc(boiCanh, id, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  // LL15d: chọn marketer theo MÃ NV (hồ sơ HRM) — tên lấy từ tài khoản, page kế thừa tên như trước.
  if (than && than.marketerMaNv !== undefined) {
    const { marketerMaNv, ...con } = than;
    than = { ...con, ...(await marketerTheoMa(bc, marketerMaNv)) };
  }
  const kq = await cua().sua(bc, id, than);
  await ghi(bc, {
    hanhDong: HANH_DONG.SUA_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, soHieu: kq.soHieu, sku: kq.sku, marketer: kq.marketer, marketerMaNv: kq.marketerMaNv ?? null },
    ghiChu: `sửa sản phẩm gốc "${kq.maGoc}" (${Object.keys(than || {}).join(', ') || 'không đổi gì'})`
      + `${kq.soPageTheoMarketer ? ` · ${kq.soPageTheoMarketer} page đổi marketer theo` : ''}`,
  });
  return kq;
}

export async function boGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().bo(bc, id);
  await ghi(bc, {
    hanhDong: HANH_DONG.BO_SAN_PHAM_GOC,
    doiTuongLoai: BANG,
    doiTuongId: kq.id,
    truoc: { maGoc: kq.maGoc, ten: kq.ten },
    ghiChu: `bỏ sản phẩm gốc "${kq.maGoc}"`,
  });
  return kq;
}

/* ═══ LL13 · SẢN PHẨM LÀ LÕI (CR-28-09c) — thị trường · món POS · page đang bán ═══ */

/** Một sản phẩm gốc + chỗ chọn món để «Thêm thị trường». Đọc: cùng vai với màn. */
export async function chiTietGoc(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const [goc, monChuaGan, pv] = await Promise.all([cua().chiTiet(bc, id), cua().monChuaGan(bc), phamViMarketer(bc)]);
  if (!goc) return null;
  chanNgoaiPhamVi(pv, goc);   // LL15d: mở thẳng đường dẫn sản phẩm của người khác ⇒ 403, không lộ chi tiết
  const suaDuoc = bc.vai.some((v) => VAI_SUA_DUOC.includes(v));
  // LL15d: ô chọn marketer (tài khoản marketer có mã NV của team) + gợi ý từ đơn POS — chỉ cho người gán được.
  const marketerChon = suaDuoc ? await marketerCuaTeam(bc.teamId) : [];
  // `botDocKienThuc`: kiến thức ở tab Chung chỉ tới bot khi máy chủ ghép lời từ dữ liệu v3 (`V3_RAP_PROMPT_BAT`).
  // Vắng ⇒ bot vẫn ráp từ kho cũ theo page — màn phải nói ra, không hứa «mọi page dùng ngay» (VE1b).
  return { goc, monChuaGan, suaDuoc,
    suaKienThuc: bc.vai.some((v) => VAI_SUA_KIEN_THUC.includes(v)), botDocKienThuc: botGhepTuDuLieu(),
    marketerChon, goiYMarketer: suaDuoc ? await goiYCua(goc, marketerChon) : null };
}

/** Gắn một món POS vào sản phẩm gốc — thêm thị trường (shop mới) hoặc thêm biến thể. Quản trị, có nhật ký. */
export async function ganMonPos(boiCanh, id, posMa) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().gan(bc, id, posMa);
  await ghi(bc, {
    hanhDong: HANH_DONG.GAN_MON_POS_GOC, doiTuongLoai: BANG, doiTuongId: String(id),
    sau: { maGoc: kq.maGoc, posMa: kq.posMa, shopId: kq.shopId, boDauDoiSoat: kq.boDauDoiSoat ?? 0 },
    ghiChu: `gắn món POS ${kq.posMa} (shop ${kq.shopId}) vào sản phẩm "${kq.maGoc}"${kq.daCo ? ' — đã gắn từ trước' : ''}`
      + cauBoDau(kq),
  });
  return kq;
}

// GSP3c: đổi món của gốc × shop bỏ dấu đối soát của bản sao gốc × shop đó (tầng A) ⇒ nhật ký NÓI RA bao nhiêu bản sao bị bỏ dấu.
const cauBoDau = (kq) => (kq.boDauDoiSoat
  ? ` · bỏ dấu đối soát ${kq.boDauDoiSoat} bản sao (gốc × shop ${kq.shopId}) — page của chúng về «chờ đối soát»` : '');

/** Gỡ một món POS khỏi sản phẩm gốc. Quản trị, có nhật ký. */
export async function goMonPos(boiCanh, id, posMa) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().go(bc, id, posMa);
  await ghi(bc, {
    hanhDong: HANH_DONG.GO_MON_POS_GOC, doiTuongLoai: BANG, doiTuongId: String(id),
    truoc: { maGoc: kq.maGoc, posMa: kq.posMa, shopId: kq.shopId },
    sau: { boDauDoiSoat: kq.boDauDoiSoat ?? 0 },
    ghiChu: `gỡ món POS ${kq.posMa} (shop ${kq.shopId}) khỏi sản phẩm "${kq.maGoc}"${cauBoDau(kq)}`,
  });
  return kq;
}

/* ═══ VE8a · GỘP MÓN POS THÀNH SẢN PHẨM (bản vẽ 2a′) — máy gợi ý nhóm, NGƯỜI xác nhận ═══ */

/** Gợi ý gộp + số đầu màn. Đọc: mọi vai của màn; `suaDuoc` nói màn có vẽ ô chọn/nút không. */
export async function goiYGop(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const kq = await cua().goiYGop(bc);
  const suaDuoc = bc.vai.some((v) => VAI_SUA_DUOC.includes(v));
  return { ...kq, suaDuoc, marketerChon: suaDuoc ? await marketerCuaTeam(bc.teamId) : [] };
}

/** Gộp: MỘT sản phẩm gốc + gắn các món đã chọn (một giao dịch ở tầng A). Quản trị; MỘT dòng nhật ký kể đủ món. */
export async function gopMonThanhGoc(boiCanh, than) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  if (than && than.marketerMaNv !== undefined) {
    const { marketerMaNv, ...con } = than;
    than = { ...con, ...(await marketerTheoMa(bc, marketerMaNv)) };
  }
  const kq = await cua().gop(bc, than);
  const ds = kq.posMa || [];
  await ghi(bc, {
    hanhDong: HANH_DONG.TAO_SAN_PHAM_GOC, doiTuongLoai: BANG, doiTuongId: kq.id,
    sau: { maGoc: kq.maGoc, ten: kq.ten, sku: kq.sku, marketer: kq.marketer, posMa: ds },
    ghiChu: `gộp ${ds.length} món POS thành sản phẩm gốc "${kq.maGoc}"${kq.sku ? ` (SKU ${kq.sku})` : ''}`
      + `${kq.marketer ? ` · marketer ${kq.marketer}` : ''}: `
      + `${ds.slice(0, 12).join(', ')}${ds.length > 12 ? '…' : ''}`,
  });
  return kq;
}

/* ═══ VE8b · GIÁ THEO THỊ TRƯỜNG + GẮN PAGE — quản trị ═══ */

/**
 * Lưu bậc giá của MỘT món POS trong sản phẩm (giá của thị trường đó). `saveProduct` (chế độ chỉ-giá) tự ghi nhật ký giá
 * cũ → mới và đẩy bản chép sang bot TRONG giao dịch — không ghi lần hai ở đây. Lỗi của nó chỉ mang `status` (không `ma`)
 * ⇒ bọc lại để router trả đúng mã (409 «đã đổi, tải lại» không được thành 500).
 */
export async function luuGiaMon(boiCanh, id, than = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  try {
    return await cua().luuGia(bc, id, than.posMa, { version: than.version, offers: than.offers });
  } catch (e) {
    if (e && typeof e.status === 'number' && !e.ma) throw new LoiSanPham(e.message, 'luu_gia', e.status);
    throw e;
  }
}

const chuPage = (kq) => kq.ten || kq.pageFb || kq.pageId;

/** Gắn page vào sản phẩm ở một thị trường. Quản trị; nhật ký ở CẢ page lẫn sản phẩm (hai màn lịch sử đều thấy). */
export async function ganPageSanPham(boiCanh, id, than = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().ganPage(bc, id, { pageId: than.pageId, shopId: than.shopId });
  const chu = `gắn page «${chuPage(kq)}» vào sản phẩm "${kq.maGoc}" · ${kq.thiTruong || 'shop ' + kq.shopId}`
    + `${kq.marketer ? ` · marketer ${kq.marketer}` : ''}${kq.soBacGia ? '' : ' — thị trường này CHƯA có bậc giá'}`;
  const sau = { sanPhamGocMa: kq.maGoc, posShopId: kq.shopId, thiTruong: kq.thiTruong, marketer: kq.marketer };
  await ghi(bc, { hanhDong: HANH_DONG.GAN_SAN_PHAM_GOC, doiTuongLoai: 'page', doiTuongId: kq.pageId, truoc: kq.truoc, sau, ghiChu: chu });
  await ghi(bc, { hanhDong: HANH_DONG.GAN_SAN_PHAM_GOC, doiTuongLoai: BANG, doiTuongId: String(id), sau: { pageId: kq.pageId, ...sau }, ghiChu: chu });
  return kq;
}

/** Gỡ page khỏi sản phẩm (page chết / thôi bán). Quản trị; nhật ký ở page lẫn sản phẩm. */
export async function goPageSanPham(boiCanh, id, pageId) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await cua().goPage(bc, id, pageId);
  const chu = `gỡ page «${chuPage(kq)}» khỏi sản phẩm "${kq.maGoc}"`;
  await ghi(bc, { hanhDong: HANH_DONG.GAN_SAN_PHAM_GOC, doiTuongLoai: 'page', doiTuongId: kq.pageId, truoc: { sanPhamGocMa: kq.maGoc }, sau: { sanPhamGocMa: null }, ghiChu: chu });
  await ghi(bc, { hanhDong: HANH_DONG.GAN_SAN_PHAM_GOC, doiTuongLoai: BANG, doiTuongId: String(id), truoc: { pageId: kq.pageId }, ghiChu: chu });
  return kq;
}

/* ═══ GSP2 · DANH SÁCH VIỆC CHUYỂN (TẠM, gỡ ở GSP5) — page đang đọc bản sao → gắn vào sản phẩm gốc ═══
 * Ba hàm của tầng A (`src/products/chuyen-ban-sao.js`) là hàm TUỲ CHỌN của `datKhoGoc` — KHÔNG thêm vào danh sách bắt buộc
 * (thêm là 5 tệp ca fake ll13 · ve8a · ve8b · ll15d · vai-b-noi-day đỏ). Chưa nối ⇒ 500 `chua_noi` nói rõ, không trả rỗng.
 * Vai: quản trị (`VAI_SUA_DUOC`). Marketer ⇒ 403: page chưa gắn nằm ngoài phạm vi marketer (LL15d). */
function hamChuyen(ten, viec = 'danh sách việc chuyển') {
  const f = cua()[ten];
  if (typeof f !== 'function') throw new LoiSanPham(`máy chủ chưa nối «${ten}» của ${viec}`, 'chua_noi', 500);
  return f;
}

export async function viecChuyen(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const { viec, dem, shopCuaTeam, gocCuaTeam } = await hamChuyen('dsChuyen')(bc);
  return { dem, viec, shopCuaTeam, gocCuaTeam };
}

export async function boQuaChuyenPage(boiCanh, pageId, lyDo) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await hamChuyen('boQuaChuyen')(bc, pageId, lyDo);
  await ghi(bc, {
    hanhDong: HANH_DONG.BO_QUA_CHUYEN_PAGE, doiTuongLoai: 'page', doiTuongId: kq.pageId,
    sau: { doiSoat: 'bo_qua', lyDo: kq.lyDo, soBanSao: kq.soBanSao },
    ghiChu: `không chuyển page «${chuPage(kq)}» sang sản phẩm — ${kq.lyDo}`,
  });
  return kq;
}

export async function huyBoQuaChuyenPage(boiCanh, pageId) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  const kq = await hamChuyen('huyBoQuaChuyen')(bc, pageId);
  await ghi(bc, {
    hanhDong: HANH_DONG.HUY_BO_QUA_CHUYEN_PAGE, doiTuongLoai: 'page', doiTuongId: kq.pageId,
    truoc: { doiSoat: 'bo_qua' }, sau: { doiSoat: null },
    ghiChu: `bỏ quyết định «không chuyển» của page «${chuPage(kq)}»`,
  });
  return kq;
}

/* ═══ GSP3 · ĐỐI SOÁT GIÁ + ẢNH THEO ĐƠN VỊ GỐC × SHOP (CR-02-10b 5e) ═══
 * Hai hàm TUỲ CHỌN của `datKhoGoc` (`donViDoiSoat` · `doiSoat`) — như ba hàm GSP2, KHÔNG vào danh sách bắt buộc. Quản trị.
 * Tầng A ghi giá qua cửa lưu giá có sẵn (saveProduct chỉ-giá tự ghi nhật ký `v3_sua_san_pham` truoc/sau); ở đây ghi THÊM một dòng
 * `doi_soat_ban_sao` ở sản phẩm + MỖI page của đơn vị: món đích · bảng thắng (page nào / giá món) · bảng cũ · page đổi giá · số ảnh. */
export async function xemDoiSoat(boiCanh, gocId, shopId) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  return hamChuyen('donViDoiSoat')(bc, gocId, shopId);
}

const chuBang = (m) => (m.bangThang.laGiaMon ? 'giữ giá món' : `bảng page «${m.bangThang.tenPage}»`);

export async function doiSoatDonVi(boiCanh, than = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  // `dauDonVi`: dấu đơn vị khung đã đọc (GET) — tầng A tính lại trong lượt, thiếu/lệch ⇒ 409 kèm đơn vị mới (đối kháng vòng 2 F1).
  const vao = { gocId: than.gocId, shopId: than.shopId, cap: than.cap, chon: than.chon, dauDonVi: than.dauDonVi };
  let kq;
  try {
    kq = await hamChuyen('doiSoat')(bc, vao);
  } catch (e) {
    const du = e?.duLieu;
    if (du?.nuaVoi || du?.daXongMon?.length) {
      // Không im: (a) NỬA VỜI — đẩy hỏng và gỡ ảnh cũng hỏng, ảnh của lượt còn trên món; (b) DỞ — gốc nhiều món, món trước đã đổi
      // giá + đẩy bot rồi món sau hỏng (đơn vị chưa đánh dấu). Ghi nhật ký rồi mới ném.
      const xong = (du.daXongMon || []).map((m) => `${m.posMa} ← ${chuBang(m)}`).join('; ');
      const chu = du.nuaVoi ? `đối soát NỬA VỜI — ${e.message}${xong ? ` · đã ghi trước đó: ${xong}` : ''}`
        : `đối soát DỞ — đã ghi ${xong}; hỏng ở ${du.posMaHong}: ${e.message} — chưa đánh dấu, chạy lại sẽ đi tiếp`;
      console.error(`[san-pham] ${chu}`);
      try {
        await ghi(bc, { hanhDong: HANH_DONG.DOI_SOAT_BAN_SAO, doiTuongLoai: BANG, doiTuongId: String(vao.gocId ?? ''),
          sau: { ...du, shopId: vao.shopId ?? null }, ghiChu: chu });
      } catch (le) { console.error('[san-pham] ghi nhật ký đối soát dở/nửa vời hỏng:', le?.message || le); }
    }
    // Lỗi của saveProduct / bước đẩy chỉ mang `status` (không `ma`) ⇒ bọc để router trả đúng mã (409 «đã đổi», 502 đẩy hỏng).
    if (e && typeof e.status === 'number' && !e.ma) throw Object.assign(new LoiSanPham(e.message, 'luu_gia', e.status), { duLieu: e.duLieu });
    throw e;
  }
  if (kq.daXong) return kq;
  const doi = kq.pageDoiGia.map((p) => p.ten).join(', ');
  const chu = `đối soát «${kq.tenGoc || kq.maGoc}» · ${kq.market || 'shop ' + kq.shopId}: `
    + kq.mon.map((m) => `${m.posMa} ← ${chuBang(m)}${m.ghiGia ? '' : ' (không đổi giá)'} · +${m.anhThem} ảnh`).join('; ')
    + (kq.pageDoiGia.length ? ` · ${kq.pageDoiGia.length} page đổi giá: ${doi}` : ' · không page nào đổi giá');
  const sau = { maGoc: kq.maGoc, shopId: kq.shopId, mon: kq.mon, pageDoiGia: kq.pageDoiGia, danhDau: kq.danhDau };
  await ghi(bc, { hanhDong: HANH_DONG.DOI_SOAT_BAN_SAO, doiTuongLoai: BANG, doiTuongId: kq.gocId, sau, ghiChu: chu });
  for (const p of kq.pageDonVi) {
    await ghi(bc, { hanhDong: HANH_DONG.DOI_SOAT_BAN_SAO, doiTuongLoai: 'page', doiTuongId: p.pageId, sau, ghiChu: chu });
  }
  return kq;
}

/* ═══ GP1 · ĐIỀN GIÁ TỪ ĐƠN POS (07/10) — món POS CHƯA có giá ← COD đơn POS một món (BigQuery, chỉ đọc) ═══
 * Hai hàm TUỲ CHỌN của `datKhoGoc` (`xemGiaTuDon` · `apGiaTuDon`) — như GSP2/GSP3, KHÔNG vào danh sách bắt buộc. Quản trị (marketer ⇒ 403:
 * bảng xem trước là giá của mọi sản phẩm của team, ngoài phạm vi LL15d). Tầng A (`src/products/gia-tu-don-pos.js`) tính lại xem trước
 * TRONG lượt áp và ghi qua cửa lưu giá có sẵn (saveProduct chỉ-giá tự ghi `v3_sua_san_pham` truoc/sau ở `san_pham`); ở đây ghi THÊM một
 * dòng `dien_gia_tu_don_pos` ở sản phẩm cho MỖI món đã ghi: bậc · số đơn · tỷ lệ · khoảng ngày. */
const hamGiaTuDon = (ten) => hamChuyen(ten, '«Điền giá từ đơn POS»');

export async function xemGiaTuDon(boiCanh, soNgay) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  return hamGiaTuDon('xemGiaTuDon')(bc, { soNgay });
}

const chuBacGia = (b, te, soNgay) => `${b.soLuong} = ${b.giaLon} ${te} · ${b.soDonMuc}/${b.soDonGanDay} đơn gần nhất · ${b.tong} đơn ${soNgay} ngày`;

export async function apGiaTuDon(boiCanh, than = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_DUOC);
  // Không ghi được nhật ký thì KHÔNG ghi giá: kiểm phễu TRƯỚC khi tầng A chạm `goi_gia` (sau đó mỗi món đã commit riêng).
  if (!_pheuNhatKy) throw new LoiSanPham('chưa nối phễu nhật ký — từ chối điền giá', 'chua_noi', 500);
  const ham = hamGiaTuDon('apGiaTuDon');
  const kq = await ham(bc, { dauXemTruoc: than.dauXemTruoc, monIds: than.monIds, soNgay: than.soNgay });
  for (const m of kq.ghi) {
    const chu = `điền giá từ đơn POS ${kq.soNgay} ngày · ${m.posMa} (${m.ten || m.sku || ''}) · ${m.market || 'shop ' + m.shopId}: `
      + m.bac.map((b) => chuBacGia(b, m.tienTe, kq.soNgay)).join('; ') + ` · đơn ${m.tu}…${m.den}`;
    try {
      await ghi(bc, {
        hanhDong: HANH_DONG.DIEN_GIA_TU_DON_POS, doiTuongLoai: BANG, doiTuongId: String(m.gocId),
        sau: { monId: m.monId, posMa: m.posMa, shopId: m.shopId, market: m.market, tienTe: m.tienTe, soNgay: kq.soNgay, tu: m.tu, den: m.den,
          soDon: m.soDon, bac: m.bac.map((b) => ({ soLuong: b.soLuong, gia: b.gia, tong: b.tong, soDonGanDay: b.soDonGanDay, soDonMuc: b.soDonMuc,
            tiLe: b.tiLe, tu: b.tu, den: b.den })) },
        ghiChu: chu,
      });
    } catch (e) {
      // Giá ĐÃ commit (saveProduct chụp truoc/sau ở `san_pham`) — nói ra ở kết quả, không giấu.
      m.nhatKyLoi = String(e?.message || e).slice(0, 160);
      console.error(`[san-pham] ghi nhật ký điền giá ${m.posMa} hỏng:`, m.nhatKyLoi);
    }
  }
  return kq;
}

/* ═══ LL11 · KIẾN THỨC SẢN PHẨM — nhà mới của kỹ năng ═══ */

/**
 * Ai SỬA kiến thức: quản trị + MARKETER. Khác `VAI_SUA_DUOC` (tên · mã gốc — quản trị): kiến thức là lời tư vấn
 * marketer viết cho sản phẩm mình phụ trách (01 §6 · §9 «kịch bản do người viết áp dụng thẳng»), đúng chỗ màn
 * kỹ năng cũ cho marketer bật.
 */
export const VAI_SUA_KIEN_THUC = Object.freeze([VAI.QUAN_TRI, VAI.MARKETER]);

export async function suaKienThucGoc(boiCanh, id, kienThuc) {
  const bc = batBuocBoiCanh(boiCanh);
  batBuocVai(bc, ...VAI_SUA_KIEN_THUC);
  const pv = await phamViMarketer(bc);
  if (pv) chanNgoaiPhamVi(pv, await cua().chiTiet(bc, id));   // LL15d: marketer chỉ sửa kiến thức sản phẩm mình phụ trách
  const kq = await cua().kienThuc(bc, id, kienThuc);
  await ghi(bc, {
    hanhDong: HANH_DONG.SUA_KIEN_THUC_SAN_PHAM, doiTuongLoai: BANG, doiTuongId: String(id),
    truoc: kq.truoc || {}, sau: kq.kienThuc,
    ghiChu: `sửa kiến thức sản phẩm "${kq.maGoc}" (${Object.keys(kq.kienThuc || {}).join(', ') || 'để trống'})`,
  });
  return kq;
}
