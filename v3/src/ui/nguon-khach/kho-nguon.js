// TẦNG ĐỌC CỦA MÀN «NGUỒN KHÁCH VÀO» (G2-G4, sóng 4).
//
// Yêu cầu nguyên văn: *«Sơ đồ hai luồng đơn chạy song song, chỉ gặp nhau ở đích. Chỗ rơi 37,4%»*.
//
// ═══ TÔI ĐÃ ĐỌC SAI TÊN MÀN MỘT LƯỢT ═════════════════════════════════════════════════
// Tên «Nguồn khách vào» làm tôi tưởng nó hỏi «khách đến từ đâu», rồi tôi báo màn bị chặn vì
// `hoi_thoai` không có cột `nguon`. Sai: yêu cầu đòi **sơ đồ hai luồng đơn** và **một chỗ rơi
// cụ thể**. Cột `nguon` nằm ở `don_hang`, và nó có sẵn.
//
// ═══ 37,4% LÀ GÌ — TRUY RA MỚI BIẾT ══════════════════════════════════════════════════
// `PHIEU-L3-M1.md` dòng 17: *«Số phải bịt: **37,4% BUY NOW không gửi WhatsApp**»*. Tức nó
// KHÔNG nằm trong phễu Messenger — nó nằm ở luồng TRANG BÁN HÀNG: khách bấm BUY NOW, hệ
// thống lẽ ra nhắn WhatsApp hỏi thông tin, và 37,4% không bao giờ được nhắn.
//
// Đo 28/08: `don_hang` có 1.633 đơn `trang_ban_hang`, cột `so_lan_thu_wa` có mặt trên tất cả
// nhưng **bằng 0 ở tất cả**, `ly_do_khong_gui` **NULL ở tất cả**. Luồng WhatsApp của v3 chưa
// chạy lần nào ⇒ **chỗ rơi 37,4% chưa đo lại được**. Màn nói thẳng, và KHÔNG chép con số
// 37,4% ra như thể vừa đo.
//
// ═══ PHỄU LÀ ẢNH CHỤP, KHÔNG PHẢI DÒNG CHẢY ═════════════════════════════════════════
// `/ops/conv-state` cho biết mỗi hội thoại ĐANG đứng ở bậc nào — không cho biết bao nhiêu
// người đã đi qua bậc đó rồi rời đi. Lấy hiệu hai bậc rồi gọi là «tỉ lệ rơi» là đọc sai bản
// chất: một hội thoại đã thành đơn không còn nằm ở SELLING nữa.
//
// Nên màn hiện phân bố kèm chữ «đang đứng ở», và KHÔNG tính tỉ lệ rơi giữa hai bậc.

import { batBuocBoiCanh, VAI } from '../../auth/boi-canh.js';

export const BANG_DON = 'don_hang';
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY, VAI.MARKETER]);

export const NGUON_DON = Object.freeze({ MESSENGER: 'messenger', TRANG: 'trang_ban_hang' });

/**
 * Trần đọc mỗi lượt. **Chạm trần thì PHẢI nói** — hai màn Rủi ro hoàn và Hồ sơ khách đã có
 * cảnh báo này, màn Nguồn khách thì bản đầu QUÊN. Bắt được lúc soát bằng mắt 28/08: hai luồng
 * cộng lại ra **đúng 60.000**, bằng chằn chặn trần — tức bảng đã bị cắt và màn im lặng.
 *
 * Một tổng bị cắt trông y hệt một tổng đúng, và ở màn này nó còn tệ hơn: tỉ lệ giữa hai luồng
 * cũng sai theo, vì phép cắt không chia đều cho hai bên.
 */
export const TRAN_DOC = 60000;

/** Bậc phễu theo thứ tự, tên tiếng Việt. Mã lấy từ `/ops/conv-state`. */
export const BAC = Object.freeze([
  { ma: 'GREET', ten: 'Vừa chào' },
  { ma: 'QUALIFY', ten: 'Đang hỏi nhu cầu' },
  { ma: 'SELLING', ten: 'Đang bán' },
  { ma: 'CLOSING', ten: 'Đang chốt' },
  { ma: 'POST_SALE', ten: 'Sau bán' },
  { ma: 'HANDOFF', ten: 'Đã giao người' },
  { ma: 'COLD', ten: 'Nguội' },
]);

export class LoiNguon extends Error {
  constructor(thongDiep, ma = 'nguon_khach', status = 400) {
    super(thongDiep);
    this.name = 'LoiNguon';
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
let _docPheu = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiNguon('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null; return _taoTruyVan;
}
export function datDocPheu(fn) { _docPheu = fn || null; return _docPheu; }
export const daNoiNguon = () => typeof _taoTruyVan === 'function';

function truyVan(bc) {
  if (!_taoTruyVan) throw new LoiNguon('chưa nối tầng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

export async function manNguon(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = truyVan(bc);

  const don = await db.chon(BANG_DON, {}, { gioiHan: TRAN_DOC });
  const chamTran = don.length >= TRAN_DOC;
  const mes = don.filter((d) => String(d.nguon) === NGUON_DON.MESSENGER);
  const trang = don.filter((d) => String(d.nguon) === NGUON_DON.TRANG);
  const khac = don.filter((d) => ![NGUON_DON.MESSENGER, NGUON_DON.TRANG].includes(String(d.nguon)));

  let pheu = null; let loiPheu = null;
  if (_docPheu) {
    try { pheu = await _docPheu(); } catch (e) { loiPheu = String(e?.message || e); }
  } else loiPheu = 'Chưa nối cầu sang tiến trình bot.';

  return {
    teamId: bc.teamId,
    chamTran: chamTran
      ? { co: true, tran: TRAN_DOC,
          noi: `Đã đọc tới trần ${TRAN_DOC} đơn — hai con số dưới đây là MỘT PHẦN, và TỈ LỆ `
            + 'giữa hai luồng cũng sai theo, vì phép cắt không chia đều cho hai bên.' }
      : { co: false },
    luong: [
      luong('messenger', 'Messenger', mes,
        'Khách nhắn trước, bot tư vấn rồi chốt TRONG hội thoại.'),
      luong('trang_ban_hang', 'Trang bán hàng', trang,
        'Khách bấm BUY NOW trên trang, có đơn TRƯỚC, rồi hệ thống mới hỏi thông tin.'),
    ],
    donKhac: khac.length
      ? { so: khac.length, nguon: [...new Set(khac.map((d) => String(d.nguon ?? '(rỗng)')))] }
      : null,
    gapNhauO: 'Cả hai luồng cùng đổ vào POS, và chỉ gặp nhau ở đó. Trước điểm đó chúng đo '
      + 'bằng hai thước khác nhau — xem màn Báo cáo.',
    pheu: pheuMessenger(pheu, loiPheu),
    choRoi: choRoiWhatsApp(trang),
    trong: don.length ? null : {
      rong: true, vi: 'chua-nap',
      noi: 'Team này chưa có đơn hàng nào.',
      diTiep: 'Đơn nhập về từ POS. Xem màn Báo cáo.',
    },
  };
}

function luong(ma, ten, ds, moTa) {
  const coTien = ds.filter((d) => d.tong_tien != null);
  return {
    ma, ten, moTa,
    soDon: ds.length,
    soDonCoTien: coTien.length,
    tongTien: coTien.reduce((s, d) => s + Number(d.tong_tien || 0), 0),
    tienDayDu: ds.length === 0 || coTien.length === ds.length,
    coDuLieu: ds.length > 0,
  };
}

/** Phễu Messenger — ẢNH CHỤP, không phải dòng chảy. Xem khối chú thích đầu file. */
function pheuMessenger(pheu, loi) {
  if (!pheu) {
    return {
      docDuoc: false,
      noi: `Chưa đọc được phân bố hội thoại: ${loi || 'không rõ'}.`,
      diTiep: 'Số 0 ở đây sẽ là kết luận sai — màn để trống thay vì đoán.',
      bac: [],
    };
  }
  const b = pheu.theoBac || {};
  return {
    docDuoc: true,
    tong: pheu.tong,
    // ⚠️ TOÀN HỆ, không theo team: `/ops/conv-state` không biết team. Khai rõ để không ai
    //    trừ con số này với con số theo team ở màn khác rồi tưởng tìm ra chỗ lệch.
    laToanHe: true,
    bac: BAC.filter((x) => b[x.ma] != null).map((x) => ({ ...x, so: Number(b[x.ma]) })),
    theoChuSoHuu: pheu.theoChuSoHuu || {},
    canhBao: 'Đây là ảnh chụp: mỗi hội thoại ĐANG đứng ở một bậc. Nó KHÔNG cho biết bao nhiêu '
      + 'người đã đi qua bậc đó rồi rời đi — một hội thoại đã thành đơn không còn nằm ở «đang '
      + 'bán» nữa. Vì vậy màn KHÔNG tính tỉ lệ rơi giữa hai bậc.',
  };
}

/**
 * Chỗ rơi 37,4% — `PHIEU-L3-M1` dòng 17: *«37,4% BUY NOW không gửi WhatsApp»*.
 * Đo lại được chưa? Hỏi bằng cột, không chép lại con số cũ.
 */
function choRoiWhatsApp(donTrang) {
  const coThu = donTrang.filter((d) => Number(d.so_lan_thu_wa || 0) > 0);
  const coLyDo = donTrang.filter((d) => d.ly_do_khong_gui != null && d.ly_do_khong_gui !== '');
  const doDuoc = coThu.length > 0 || coLyDo.length > 0;
  if (!doDuoc) {
    return {
      doDuoc: false,
      taiLieuNoi: 0.374,
      soDonTrang: donTrang.length,
      noi: `Có ${donTrang.length} đơn từ trang bán hàng, nhưng cột \`so_lan_thu_wa\` bằng 0 ở `
        + 'TẤT CẢ và `ly_do_khong_gui` rỗng ở tất cả — luồng gửi WhatsApp của v3 chưa chạy '
        + 'lần nào.',
      diTiep: 'Con số 37,4% là số ĐO CŨ ở `PHIEU-L3-M1`, không phải số đo hôm nay. Màn KHÔNG '
        + 'hiện nó như một chỉ số đang sống. Khi luồng WhatsApp chạy, hai cột trên sẽ tự có '
        + 'giá trị và ô này đo lại được.',
    };
  }
  const khongGui = donTrang.filter((d) => Number(d.so_lan_thu_wa || 0) === 0);
  return {
    doDuoc: true,
    taiLieuNoi: 0.374,
    soDonTrang: donTrang.length,
    soKhongGui: khongGui.length,
    tiLe: donTrang.length ? +(khongGui.length / donTrang.length).toFixed(3) : null,
    lyDo: [...new Set(coLyDo.map((d) => String(d.ly_do_khong_gui)))].slice(0, 8),
  };
}
