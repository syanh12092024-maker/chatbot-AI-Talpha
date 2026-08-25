// TẦNG ĐỌC CỦA MÀN «SẢN PHẨM & KHO» (G2-F6, sóng 4).
//
// ═══ BẢNG `san_pham` CỦA v3 CÓ 0 DÒNG, NHƯNG SẢN PHẨM THÌ CÓ THẬT ══════════════════════
// Đo 25/08: `san_pham` = 0 dòng, còn tiến trình bot đang bán **71 sản phẩm trên 69 page**.
// Nguồn thật là Google Sheet mà bot đọc; bảng v3 chỉ là đích của một lượt nạp CHƯA AI CHẠY.
//
// Tôi đã một lần kết luận sai vì nhìn bảng rỗng: cùng đúng lỗi với cột `page.bot_ai_bat`
// (CSDL nói 50 page bật bot, nguồn thật nói 0 — xem `PHIEU-B-Y7`). Bản sao rỗng không phải
// bằng chứng là không có gì. Nên màn này đọc NGUỒN, và nói rõ nó đang đọc từ đâu.
//
// ═══ CON SỐ QUAN TRỌNG NHẤT CỦA MÀN: 96% SẢN PHẨM KHÔNG CÓ TÊN ════════════════════════
// `01-QUYET-DINH.md` mục 12 đã cảnh báo trước: *«Tên sản phẩm trống trong dữ liệu — chỉ có
// bảng giá và ảnh. Phải lấy tên và mã từ POS.»* Đo 25/08: **68/71 sản phẩm tên rỗng**, 0
// sản phẩm thiếu mã, 459 ảnh, 71/71 có bậc giá.
//
// Nghĩa là bot đang chào bán món hàng nó KHÔNG GỌI ĐƯỢC TÊN — chỉ đưa được ảnh và giá.
// Màn KHÔNG bịa tên thay thế (lấy tên page, lấy nhãn ảnh, đánh số…): bịa một cái tên là
// làm cho lỗ này biến mất khỏi màn trong khi nó vẫn còn nguyên ở chỗ khách nhìn.
//
// ═══ TỒN KHO: CHƯA CÓ NGUỒN, VÀ MÀN NÓI THẲNG ═════════════════════════════════════════
// Nghiệm thu đòi *«hết hàng thì tự tắt bot cho sản phẩm đó»*. Dữ liệu Sheet KHÔNG có trường
// tồn kho — chỉ mã, tên, giá, ảnh. Cửa POS (`docDanhMuc`) đọc được tồn kho nhưng chưa ai nối.
// Màn hiện cột tồn kho là «chưa có nguồn», không hiện 0 — 0 nghĩa là hết hàng.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_PAGE = 'page';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

/** Vì sao một chỗ trống. Cùng ba mã với Trang chủ — đừng đẻ bộ mã thứ hai. */
export const VI_RONG = Object.freeze({
  XONG: 'xong', CHUA_NAP: 'chua-nap', CHUA_CO_NGUON: 'chua-co-nguon',
});

export class LoiSanPham extends Error {
  constructor(thongDiep, ma = 'san_pham', status = 400) {
    super(thongDiep);
    this.name = 'LoiSanPham';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docDanhSach = null;
let _docMotPage = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiSanPham('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export function datDocKhoSanPham({ danhSach, motPage } = {}) {
  if (danhSach != null && typeof danhSach !== 'function') throw new LoiSanPham('danhSach cần một hàm');
  if (motPage != null && typeof motPage !== 'function') throw new LoiSanPham('motPage cần một hàm');
  _docDanhSach = danhSach || null; _docMotPage = motPage || null;
  return { danhSach: _docDanhSach, motPage: _docMotPage };
}
export const daNoiSanPham = () => typeof _taoTruyVan === 'function' && typeof _docDanhSach === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiSanPham('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/** Page của team — dùng để giao với danh sách toàn hệ của cầu. */
async function pageCuaTeam(bc) {
  const ds = await truyVan(bc).chon(BANG_PAGE, {}, { sapXep: 'ten' });
  return new Map(ds.map((p) => [String(p.page_id), p]));
}

const CHUA_NOI = {
  vi: VI_RONG.CHUA_NAP,
  noi: 'Chưa nối cầu sang tiến trình bot nên chưa đọc được kho sản phẩm.',
  diTiep: 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` rồi khởi động lại v3.',
};

/* ─────────────────────────── màn chính ─────────────────────────── */

export async function manSanPham(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const cuaTeam = await pageCuaTeam(bc);

  if (!_docDanhSach) {
    return { teamId: bc.teamId, page: [], dem: demRong(), nguon: null, trong: { rong: true, ...CHUA_NOI } };
  }

  let toanHe;
  try {
    toanHe = await _docDanhSach();
  } catch (e) {
    // Cầu hỏng ≠ không có sản phẩm. Ném — một danh sách rỗng ở đây trông y hệt «chưa nạp».
    throw new LoiSanPham(
      `Không đọc được kho sản phẩm từ tiến trình bot: ${e?.message || e}. Màn TỪ CHỐI đoán — `
      + 'một bảng rỗng ở đây trông y như «team này chưa có sản phẩm nào».',
      'cau_hong', 502,
    );
  }

  const page = toanHe
    .filter((p) => cuaTeam.has(p.pageId))
    .map((p) => {
      const v3 = cuaTeam.get(p.pageId);
      return {
        pageId: p.pageId,
        ten: p.ten || v3.ten || p.pageId,
        soSanPham: p.soSanPham,
        botBat: p.botBat,
        thiTruong: p.thiTruong || v3.thi_truong || '',
        marketer: p.marketer || (v3.marketer || '').trim(),
        coKichBan: p.coKichBan,
      };
    })
    .sort((a, b) => b.soSanPham - a.soSanPham || String(a.ten).localeCompare(String(b.ten)));

  return {
    teamId: bc.teamId,
    page,
    dem: dem(page, cuaTeam.size),
    nguon: nguonSo(),
    tonKho: KHONG_CO_TON_KHO,
    trong: page.length ? null : {
      rong: true, vi: VI_RONG.CHUA_NAP,
      noi: 'Không page nào của team có sản phẩm trong kho của tiến trình bot.',
      diTiep: 'Sản phẩm nhập qua Google Sheet của page. Kiểm ở màn Cửa kiểm sẵn sàng — '
        + 'điều kiện «Chưa có sản phẩm/giá» sẽ liệt kê đúng các page còn thiếu.',
    },
  };
}

const demRong = () => ({ tongPage: 0, coSanPham: 0, khongCoSanPham: 0, tongSanPham: 0 });

function dem(page, tongPageTeam) {
  const co = page.filter((p) => p.soSanPham > 0);
  return {
    tongPage: tongPageTeam,
    coSanPham: co.length,
    khongCoSanPham: tongPageTeam - co.length,
    tongSanPham: co.reduce((s, p) => s + p.soSanPham, 0),
  };
}

/** Màn phải nói nó đọc từ đâu — vì bảng `san_pham` của v3 rỗng và người ta sẽ hỏi. */
const nguonSo = () => ({
  ten: 'tiến trình bot v1 (Google Sheet của page)',
  khongPhai: 'bảng `san_pham` của CSDL v3',
  viSao: 'Bảng `san_pham` có 0 dòng vì chưa ai chạy nạp danh mục từ POS. Sản phẩm bot đang '
    + 'dùng để bán nằm trong Sheet, và đó là thứ màn này hiện. Hai chỗ chưa đồng bộ với nhau.',
});

const KHONG_CO_TON_KHO = Object.freeze({
  co: false,
  vi: VI_RONG.CHUA_CO_NGUON,
  noi: 'Dữ liệu Sheet KHÔNG có trường tồn kho — chỉ mã, tên, giá, ảnh.',
  diTiep: 'Nghiệm thu đòi «hết hàng thì tự tắt bot cho sản phẩm đó». Cửa POS (`docDanhMuc` '
    + 'của L1-M1) đọc được tồn kho nhưng chưa ai nối vào. Chừng nào chưa nối, màn KHÔNG hiện '
    + 'số 0 ở cột tồn kho — 0 nghĩa là hết hàng, và đó là điều màn chưa biết.',
});

/* ─────────────────────────── chi tiết một page ─────────────────────────── */

export async function sanPhamCuaMotPage(boiCanh, pageIdFacebook) {
  const bc = batBuocBoiCanh(boiCanh);
  const cuaTeam = await pageCuaTeam(bc);
  const id = String(pageIdFacebook);

  // Page của team khác → 404, KHÔNG phải 403: 403 xác nhận page đó có thật ở team khác.
  if (!cuaTeam.has(id)) throw new LoiSanPham(`Không có page ${id} trong team này.`, 'khong_thay', 404);
  if (!_docMotPage) throw new LoiSanPham(CHUA_NOI.noi, 'chua_noi', 500);

  let d;
  try {
    d = await _docMotPage(id);
  } catch (e) {
    throw new LoiSanPham(`Không đọc được sản phẩm của page ${id}: ${e?.message || e}`, 'cau_hong', 502);
  }

  const sp = (d.sanPham || []).map((s) => ({
    ...s,
    // Nhãn tường minh thay vì để giao diện tự đoán từ chuỗi rỗng.
    thieuTen: !s.ten,
    soAnh: s.anh.length,
    soBac: s.bacGia.length,
    // KHÔNG bịa tên. Đây là thứ hiện thay, và nó phải trông như một chỗ trống.
    goiLa: s.ten || `(chưa có tên — mã ${s.ma || '?'})`,
  }));

  return {
    pageId: id,
    tenPage: d.tenPage || cuaTeam.get(id).ten || id,
    sanPham: sp,
    dem: {
      tong: sp.length,
      thieuTen: sp.filter((s) => s.thieuTen).length,
      coAnh: sp.filter((s) => s.soAnh > 0).length,
      tongAnh: sp.reduce((n, s) => n + s.soAnh, 0),
      tienTe: [...new Set(sp.map((s) => s.tienTe).filter(Boolean))],
    },
    tonKho: KHONG_CO_TON_KHO,
    trong: sp.length ? null : {
      rong: true, vi: VI_RONG.CHUA_NAP,
      noi: 'Page này chưa có sản phẩm nào trong Sheet.',
      diTiep: 'Bot sẽ không chào bán được gì — đây là một trong bảy điều kiện CHẶN ở Cửa kiểm sẵn sàng.',
    },
  };
}
