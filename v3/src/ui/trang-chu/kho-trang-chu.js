// TẦNG ĐỌC CỦA MÀN «TRANG CHỦ» (G2-F1, sóng 4).
//
// Yêu cầu nguyên văn (`07-KE-HOACH-GD2.md` dòng 196): *«Marketer vào thấy đúng việc của
// mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng»*.
//
// ═══ ĐÂY LÀ DANH SÁCH VIỆC, KHÔNG PHẢI BẢNG SỐ LIỆU ════════════════════════════════════
// Mỗi ô là một việc CÓ NGƯỜI LÀM và CÓ CHỖ ĐỂ BẤM SANG. Phễu, doanh thu, tỉ lệ chốt là màn
// «Báo cáo» — dựng thêm một bản ở đây là hai màn đếm ra hai con số rồi cãi nhau.
//
// ═══ MỖI VIỆC KHAI VAI NÀO NHÌN THẤY ═══════════════════════════════════════════════════
// «Đúng việc của mình» nghĩa là marketer KHÔNG thấy việc hạ tầng, và quản trị không phải
// lọc mắt qua việc của người khác. Lọc theo vai làm ở ĐÂY, không phải ở trình duyệt.
//
// ═══ BA TRẠNG THÁI RỖNG, VÀ CHÚNG KHÁC NHAU ════════════════════════════════════════════
// Bài học 24/08 (chủ dự án nhìn một bảng rỗng rồi tưởng màn hỏng) đặt đúng vào màn này, vì
// đây là màn người ta mở ĐẦU TIÊN. Ba trạng thái phải nói ra bằng ba câu khác nhau:
//
//   `xong`        — có nguồn, đếm được, và đúng là 0. «Không có việc» là tin tốt.
//   `chua-nap`    — có bảng, nhưng bảng chưa từng được ghi. 0 ở đây KHÔNG phải «hết việc»,
//                   mà là «chưa ai đổ dữ liệu vào». Phải nói ra, kèm cách kiểm chứng.
//   `chua-co-bang`— bảng không tồn tại. Việc này chưa làm được, chỉ đường tới phiếu.
//
// Gộp ba thành một chữ «0» là cách chắc chắn nhất để người ta yên tâm sai.

import { batBuocBoiCanh, coVai, VAI } from '../../auth/boi-canh.js';

/**
 * KHÔNG có `sale`, và đó là chủ ý — `03-MAN-HINH.md` nói thẳng: *«Bảng điều phối | Sale vào
 * THẲNG đây»*. Sale mở phần mềm là để nhận việc đang đếm ngược, không phải để đọc một trang
 * tổng quan rồi bấm thêm một nhát. Cho sale vào đây là thêm một bước vào đúng luồng cần nhanh
 * nhất, và làm hỏng luôn tiêu chí §9 «sale chỉ thấy bảng điều phối».
 *
 * (Bản đầu của màn này CÓ cho sale vào. Lưới quét `phan-quyen-nam-vai.test.mjs` bắt được.)
 */
export const VAI_VAO_DUOC = Object.freeze([
  VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER, VAI.DUYET_KICH_BAN,
]);

/** Vì sao một ô rỗng. Ba mã, ba câu khác nhau — xem khối chú thích đầu file. */
export const VI_RONG = Object.freeze({
  XONG: 'xong',
  CHUA_NAP: 'chua-nap',
  CHUA_CO_BANG: 'chua-co-bang',
});

export class LoiTrangChu extends Error {
  constructor(thongDiep, ma = 'trang_chu', status = 400) {
    super(thongDiep);
    this.name = 'LoiTrangChu';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docSanSang = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiTrangChu('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}
/** Cùng bộ đọc cửa kiểm của màn «Cửa kiểm sẵn sàng» — không dựng đường đọc thứ hai. */
export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiTrangChu('datDocSanSang cần một hàm');
  _docSanSang = fn || null;
  return _docSanSang;
}
export const daNoiTrangChu = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiTrangChu('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── từng việc một ─────────────────────────── */

/**
 * ⚠️ `di` là đường TRONG v3 và phải trỏ tới màn ĐÃ DỰNG. Trỏ tới một màn chưa có thì người
 *    ta bấm vào và rơi ra 404 — tệ hơn cả không cho bấm.
 */
async function vDeXuatChoDuyet(d) {
  // `duyet_luc: null` = `IS NULL` ở tầng thật. Kho giả cũng vậy từ 25/08 (trước đó cột
  // không gieo thì không khớp — xem `v3/testkit/db-gia.js#hop`).
  const so = await d.dem('bo_luat_chung', { nguon: 'ai', duyet_luc: null });
  return {
    ma: 'de_xuat_cho_duyet',
    ten: 'Đề xuất của AI chờ duyệt',
    so,
    gap: so > 0,
    vai: [VAI.QUAN_TRI],
    di: '/ai-de-xuat',
    lam: 'Bản do AI đề xuất không áp được cho tới khi có người đọc và duyệt.',
    viRong: VI_RONG.XONG,
    noiRong: 'Không có đề xuất nào chờ. Bình thường — hàng này chỉ có việc khi ai đó đưa một đề xuất vào.',
  };
}

async function vKichBanChoDuyet(d) {
  const so = await d.dem('kich_ban', { trang_thai: ['DRAFT', 'REVIEW'] });
  return {
    ma: 'kich_ban_cho_duyet',
    ten: 'Kịch bản chờ duyệt',
    so,
    gap: so > 0,
    vai: [VAI.DUYET_KICH_BAN, VAI.QUAN_TRI],
    di: '/kich-ban',
    lam: 'Bản nháp chưa đưa lên LIVE — page vẫn đang chạy bản cũ.',
    viRong: VI_RONG.XONG,
    noiRong: 'Không bản nháp nào chờ. Mọi kịch bản đang ở LIVE hoặc đã lưu trữ.',
  };
}

async function vPageChuaCoMarketer(d) {
  const ds = await d.chon('page', {});
  const so = ds.filter((p) => !String(p.marketer || '').trim()).length;
  return {
    ma: 'page_chua_marketer',
    ten: 'Page chưa có người phụ trách',
    so,
    gap: so > 0,
    vai: [VAI.QUAN_TRI, VAI.QUAN_LY],
    di: '/page-bot',
    lam: 'Page không có marketer thì cảnh báo kịch bản mỏng không biết nhắc ai.',
    viRong: VI_RONG.XONG,
    noiRong: 'Mọi page đều có người phụ trách.',
    tong: ds.length,
  };
}

/**
 * Việc cần người xử. Đây là ô DỄ NÓI DỐI NHẤT của màn.
 *
 * `viec_can_xu_ly` rỗng có thể là «hôm nay không có việc» (tin tốt) hoặc «hàng đợi chưa
 * từng được nạp» (v3 chưa chạy luồng sống). Phân biệt bằng một dấu hiệu ĐO ĐƯỢC: nếu bảng
 * rỗng TOÀN BỘ mà `hoi_thoai` lại có bản ghi ở trạng thái HANDOFF, thì hàng đợi chưa nạp —
 * không thể vừa có hội thoại giao cho người vừa không có việc nào.
 *
 * Đo 25/08 trên máy chủ: `viec_can_xu_ly` = 0, `hoi_thoai` HANDOFF = 988 ⇒ CHƯA NẠP.
 * Báo «0 việc» ở cảnh này là nói với sale rằng không có gì phải làm.
 */
async function vViecChoNguoi(d) {
  const tong = await d.dem('viec_can_xu_ly', {});
  const mo = tong === 0 ? 0 : await d.dem('viec_can_xu_ly', { nguoi_nhan_id: null });
  const handoff = await d.dem('hoi_thoai', { trang_thai: 'HANDOFF' });
  const chuaNap = tong === 0 && handoff > 0;
  return {
    ma: 'viec_cho_nguoi',
    ten: 'Việc cần người xử',
    so: mo,
    gap: mo > 0,
    // Không khai `sale`: sale nhìn thấy hàng đợi này ở CHÍNH bảng điều phối, kèm đồng hồ
    // đếm ngược. Ô ở đây là để quản trị/quản lý biết hàng đợi có đang chạy hay không.
    vai: [VAI.QUAN_TRI, VAI.QUAN_LY],
    di: '/dieu-phoi',
    lam: 'Hội thoại bot đã giao lại cho người, có đồng hồ đếm ngược.',
    viRong: chuaNap ? VI_RONG.CHUA_NAP : VI_RONG.XONG,
    noiRong: chuaNap
      ? `Bảng \`viec_can_xu_ly\` KHÔNG có dòng nào, trong khi \`hoi_thoai\` có ${handoff} `
        + 'hội thoại ở trạng thái HANDOFF. Hai điều đó không thể cùng đúng — nghĩa là hàng '
        + 'đợi chưa được nạp, KHÔNG phải là hết việc.'
      : 'Không việc nào đang chờ người nhận.',
    diTiepRong: chuaNap
      ? 'Luồng sống của v3 chưa đẩy việc vào bảng này. Hội thoại hiện có là bản nhập từ lịch '
        + 'sử (không dòng nào có `nguoi_that_luc`), nên v3 cũng không biết ai đã xử chúng. '
        + 'Sale vẫn phải làm việc trên Pancake cho tới khi luồng sống chạy.'
      : null,
    doiChung: { handoff, tongViec: tong },
  };
}

/** Sản phẩm hết hàng — mục thứ hai của yêu cầu, và chưa có dữ liệu để làm. */
async function vSanPhamHetHang(d) {
  let tong = 0;
  let coBang = true;
  try {
    tong = await d.dem('san_pham', {});
  } catch {
    // Bảng không tồn tại là chuyện KHÁC hẳn bảng rỗng — đừng nuốt thành 0.
    coBang = false;
  }
  if (!coBang || tong === 0) {
    return {
      ma: 'san_pham_het_hang',
      ten: 'Sản phẩm hết hàng',
      so: 0,
      gap: false,
      vai: [VAI.MARKETER, VAI.QUAN_TRI, VAI.QUAN_LY],
      di: null,
      lam: 'Page vẫn chạy quảng cáo cho mặt hàng đã hết là đốt tiền vào đơn không giao được.',
      viRong: coBang ? VI_RONG.CHUA_NAP : VI_RONG.CHUA_CO_BANG,
      noiRong: coBang
        ? 'Bảng `san_pham` có nhưng KHÔNG có dòng nào — chưa đồng bộ danh mục từ POS về.'
        : 'Chưa có bảng `san_pham`.',
      diTiepRong: 'Cần đồng bộ danh mục sản phẩm từ POS vào bảng `san_pham` trước. Chừng nào '
        + 'bảng còn rỗng, ô này KHÔNG có nghĩa «không mặt hàng nào hết» — nó có nghĩa «chưa '
        + 'biết». Màn «Sản phẩm & kho» cũng đang chờ đúng dữ liệu này.',
    };
  }
  const ds = await d.chon('san_pham', {});
  const het = ds.filter((s) => Number(s.ton_kho ?? 0) <= 0);
  return {
    ma: 'san_pham_het_hang', ten: 'Sản phẩm hết hàng', so: het.length, gap: het.length > 0,
    // ⛔ `di: null` — màn «Sản phẩm & kho» CHƯA DỰNG. Bản đầu trỏ `/san-pham` và nút hiện ra
    //    thật trên bản xem thử; bấm vào là 404. Một nút chết còn tệ hơn không có nút: người
    //    ta tưởng mình bấm sai. Nối lại khi màn đó có.
    vai: [VAI.MARKETER, VAI.QUAN_TRI, VAI.QUAN_LY], di: null,
    chuaCoMan: 'Màn «Sản phẩm & kho» chưa dựng. Tạm thời sửa tồn kho bên POS.',
    lam: 'Page vẫn chạy quảng cáo cho mặt hàng đã hết là đốt tiền vào đơn không giao được.',
    // `donVi` — đừng để trình duyệt gõ cứng «page»: ô này đếm SẢN PHẨM. Bản đầu hiện
    // «Sản phẩm hết hàng / 2 page», một nhãn sai ngay trên con số.
    viRong: VI_RONG.XONG, noiRong: 'Không mặt hàng nào hết.', tong: ds.length, donVi: 'sản phẩm',
  };
}

/**
 * Hai việc lấy từ CỬA KIỂM — không đếm lại, gọi đúng bộ đọc màn «Cửa kiểm sẵn sàng» dùng.
 * Cầu hỏng thì hai ô này khai rõ là chưa đọc được, KHÔNG rơi về 0.
 */
async function vTuCuaKiem(d, bc) {
  const khung = (ma, ten, di, lam) => ({
    ma, ten, so: null, gap: false, vai: [VAI.MARKETER, VAI.QUAN_TRI, VAI.QUAN_LY], di, lam,
    viRong: VI_RONG.CHUA_NAP, noiRong: null, diTiepRong: null, docDuoc: false,
  });
  const chan = khung('page_bi_chan', 'Page bot KHÔNG bật được', '/san-sang',
    'Vướng ít nhất một điều kiện chặn — bot sẽ không trả lời khách trên page này.');
  const mong = khung('page_kich_ban_mong', 'Page kịch bản mỏng', '/san-sang',
    'Bot vẫn chạy nhưng trả lời chung chung: thiếu giọng điệu hoặc phần cách bán quá ngắn.');

  if (!_docSanSang) {
    const noi = 'Chưa nối cầu sang tiến trình bot nên chưa đọc được cửa kiểm.';
    chan.noiRong = noi; mong.noiRong = noi;
    chan.diTiepRong = 'Đặt `V3_BOT_V1_GOC`, `ADMIN_USER`, `ADMIN_PASS` rồi khởi động lại v3.';
    mong.diTiepRong = chan.diTiepRong;
    return [chan, mong];
  }

  let toanHe;
  try {
    toanHe = await _docSanSang();
  } catch (e) {
    // KHÔNG để 0 lọt ra: «0 page bị chặn» là tin mừng, và đây không phải tin mừng.
    const noi = `Không đọc được cửa kiểm từ tiến trình bot: ${e?.message || e}`;
    chan.noiRong = noi; mong.noiRong = noi;
    chan.diTiepRong = 'Số 0 ở đây sẽ là tin mừng giả — nên màn để trống thay vì đoán.';
    mong.diTiepRong = chan.diTiepRong;
    return [chan, mong];
  }

  const cuaTeam = new Set((await d.chon('page', {})).map((p) => String(p.page_id)));
  const cua = (toanHe.pages || []).filter((p) => cuaTeam.has(String(p.pageId)));

  chan.so = cua.filter((p) => (p.blockers || []).length).length;
  chan.gap = chan.so > 0;
  chan.docDuoc = true;
  chan.viRong = VI_RONG.XONG;
  chan.noiRong = 'Không page nào bị chặn.';
  chan.tong = cua.length;

  mong.so = cua.filter((p) => (p.warnings || []).some((w) => w.code === 'THIN_SCRIPT')).length;
  mong.gap = mong.so > 0;
  mong.docDuoc = true;
  mong.viRong = VI_RONG.XONG;
  mong.noiRong = 'Không page nào bị chấm là kịch bản mỏng.';
  mong.tong = cua.length;

  return [chan, mong];
}

/* ─────────────────────────── ghép màn ─────────────────────────── */

export async function manTrangChu(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const d = truyVan(bc);

  const [deXuat, kichBan, marketer, viec, sanPham, cuaKiem] = await Promise.all([
    vDeXuatChoDuyet(d), vKichBanChoDuyet(d), vPageChuaCoMarketer(d),
    vViecChoNguoi(d), vSanPhamHetHang(d), vTuCuaKiem(d, bc),
  ]);

  const tatCa = [...cuaKiem, deXuat, kichBan, sanPham, marketer, viec];

  // LỌC THEO VAI ở đây, không ở trình duyệt: ẩn bằng CSS thì dữ liệu đã đi qua dây mạng rồi.
  const cuaToi = tatCa.filter((v) => coVai(bc, ...v.vai));

  // Việc gấp lên trước; trong cùng nhóm thì số lớn lên trước.
  const xepHang = [...cuaToi].sort((a, b) => Number(b.gap) - Number(a.gap) || (b.so ?? -1) - (a.so ?? -1));

  const soGap = cuaToi.filter((v) => v.gap).length;
  const soChuaDocDuoc = cuaToi.filter((v) => v.so === null).length;

  return {
    teamId: bc.teamId,
    tenDangNhap: bc.tenDangNhap,
    vai: bc.vai,
    viec: xepHang,
    soGap,
    soChuaDocDuoc,
    // Số việc BỊ ẨN vì vai — nói ra để người ta biết màn không hiện hết, chứ không tưởng
    // là hệ thống chỉ có bấy nhiêu việc.
    soAnVaiKhac: tatCa.length - cuaToi.length,
    trong: cuaToi.length ? null : {
      rong: true, vi: VI_RONG.CHUA_NAP,
      noi: `Vai của bạn (${bc.vai.join(', ') || 'không có vai nào'}) chưa có việc nào trên màn này.`,
      diTiep: 'Nếu bạn nghĩ mình phải thấy việc ở đây, nhờ quản trị kiểm lại vai ở màn Cấu hình team.',
    },
  };
}
