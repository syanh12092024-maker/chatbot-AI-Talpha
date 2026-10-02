// TRANG CỦA MỘT PAGE — «page này là gì, bot có trả lời nó không, còn thiếu gì để lên chạy».
//
// ═══ VÌ SAO CÓ MÀN NÀY (GD2 · 25/09/2026) ══════════════════════════════════════════════
// Hôm nay muốn biết một page đang ở đâu thì phải ghé BA màn: «Bắt đầu» (điều kiện), «Công
// tắc từng page» (bật/tắt, người phụ trách), «Page còn thiếu gì» (cũng điều kiện, cắt khác).
// Đo 22/09: 7 màn · 11 bước để cài xong một page. Ba màn ấy hỏi cùng một câu hỏi bằng ba
// cách, và không màn nào trả lời trọn.
//
// Màn này gom về MỘT chỗ cho MỘT page. Ba màn kia không bị xoá — chúng chuyển hướng về
// danh sách page (luật «không đổi đường dẫn nào; đường cũ nào gộp đi thì chuyển hướng»).
//
// ═══ KHÔNG THÊM MỘT CỬA GHI NÀO ════════════════════════════════════════════════════════
// Màn này CHỈ ĐỌC. Bật/tắt bot vẫn bấm qua `POST /api/page-bot/:id/bot`, giao page vẫn qua
// `POST /api/page-bot/:id/giao` — cùng hai cửa đã có bảy chốt và nhật ký. Tiêu chí của phiếu
// là «còn đúng MỘT cửa ghi bật bot»; dựng thêm cửa thứ hai ở đây là tự phá tiêu chí của mình.
//
// ═══ MỘT NGUỒN CHO MỖI CÂU HỎI ═════════════════════════════════════════════════════════
// Thông tin page ← `page-bot/kho-page.js#motPage` (cùng bộ đọc với bảng danh sách).
// Điều kiện     ← `page-bot/kho-page.js#cuaKiemMotPage` + bảng từ vựng `DIEU_KIEN_TAT_CA`
//                 của màn «Page còn thiếu gì». Không dựng bảng từ vựng thứ hai: hai bảng là
//                 hai luật, và luật thứ hai luôn là luật quên cập nhật.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';
import { motPage, cuaKiemMotPage, danhMucGoc, LoiPageBot, congTruyVan as congPage,
  LOC, CHU_LOC, kiemLoc, ganTrangThaiPage, hopLoc, hopTim, demTheoLoc } from '../page-bot/kho-page.js';
import { trangThaiCongTac } from '../page-bot/cong-tac.js';
import { DIEU_KIEN_TAT_CA } from '../san-sang/kho-san-sang.js';
import { phamViMarketer, maGocCuaPhamVi, cauPhamVi } from '../chung/pham-vi-marketer.js';
import { NHAN_TRUONG } from '../kich-ban/kho-kich-ban.js';
import { timGiaGoCung } from './gia-kich-ban.js';

// `DUONG_TRANG` và `VAI_VAO_DUOC` khai ở `router.js` — đúng nếp của mọi màn khác, và thước
// ①b («mọi đường trong menu trỏ tới màn có thật») đọc thẳng chữ trong tệp router.

/* ─────────────────────── cổng tiêm: hai khối nội dung của page ───────────────────────
 *
 * CÙNG bộ đọc với màn «Đoạn chữ gửi cho AI» (`docKhoi.sanPham` · `docKhoi.kichBan`) — tức
 * cùng bộ mà đường ráp prompt của bot dùng. Dựng bộ đọc thứ hai ở đây là hẹn ngày màn khoe
 * một bản kịch bản khác cái bot đang gửi.
 */
let _docKhoi = null;
export function datDocKhoi(bo) {
  if (bo == null) { _docKhoi = null; return null; }
  for (const t of ['sanPham', 'kichBan']) {
    if (typeof bo[t] !== 'function') throw new LoiMotPage(`datDocKhoi: thiếu hàm \`${t}\`.`);
  }
  // `sua` không bắt buộc: thiếu thì tab sản phẩm CHỈ ĐỌC và nói ra, chứ không im lặng
  // hiện một danh sách không bấm được.
  _docKhoi = bo;
  return _docKhoi;
}
export const daNoiDocKhoi = () => !!_docKhoi;

export class LoiMotPage extends Error {
  constructor(thongDiep, ma = 'mot_page', status = 400) {
    super(thongDiep);
    this.name = 'LoiMotPage';
    this.ma = ma;
    this.status = status;
  }
}

/**
 * Một điều kiện, đã tra bảng từ vựng.
 *
 * ⚠️ Mã lạ KHÔNG bị nuốt: bên bot thêm một bậc thang mới mà bảng từ vựng chưa biết thì nó
 *    vẫn hiện ra, gắn nhãn «chưa có trong bảng từ». Nuốt đi là làm một lý do page không chạy
 *    được biến mất khỏi màn — đúng bệnh mà cả nhóm màn này sinh ra để chữa.
 */
function doDieuKien(b, laChan) {
  const ma = String(b?.code || '');
  const dk = DIEU_KIEN_TAT_CA[ma] || null;
  return {
    ma,
    nhan: dk?.nhan || ma,
    ten: dk?.ten || ma,
    lam: dk?.lam || '',
    di: dk?.di || null,
    nutDi: dk?.nutDi || null,
    chiTiet: String(b?.detail || ''),
    chan: dk ? dk.chan : !!laChan,
    la: !dk,
  };
}


/**
 * VE2 · 29/09: cột trái của màn một page (bản vẽ 2c) — page của team, gọn, xếp theo tên. Bot bật hỏi TIẾN TRÌNH BOT
 * qua cửa kiểm của «Tất cả page» (`ganTrangThaiPage`; `vai-b.js` nối nó và `chung/bot-bat-that.js` vào CÙNG một bộ
 * đọc); bot không thấy page ⇒ cột bản sao; không hỏi được ⇒ `nguonBot: 'ban_sao'` + lý do để màn KHAI — không im
 * lặng đổi nguồn số (án lệ 28/09: năm màn nói hai con số).
 */
export async function dsPageGon(boiCanh, { loc = LOC.TAT_CA, tim = '' } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  kiemLoc(loc);
  // VE2b · 30/09: lọc bằng ĐÚNG phép gắn + bộ lọc + ô tìm của «Tất cả page» (người quyết: «vào màn page sẽ có bộ lọc
  // như page-bot») — cột này mở cho cả marketer, còn cửa danh sách kia thì không, nên dùng chung HÀM chứ không gọi cửa.
  // LL15d: marketer chỉ thấy page KẾ THỪA sản phẩm mình phụ trách (`page.san_pham_goc_ma` ∈ sản phẩm gán mã NV của mình).
  const pv = await phamViMarketer(bc);
  const maGoc = pv ? await maGocCuaPhamVi(congPage(bc), pv) : null;
  const tatCa = ((await congPage(bc).chon('page', {})) || []).filter((p) => !maGoc || maGoc.has(String(p.san_pham_goc_ma || '')));
  const { doc, viSao, loiBotViSao } = await ganTrangThaiPage(bc, tatCa);
  const khop = tatCa.filter((p) => hopLoc(p, loc) && hopTim(p, tim));
  return {
    phamVi: pv ? { chiCuaToi: true, cau: cauPhamVi(pv) } : { chiCuaToi: false },
    nguonBot: doc ? 'bot' : 'ban_sao',
    viSao: viSao || null,
    loiBotViSao,
    loc,
    chuLoc: CHU_LOC,
    dem: demTheoLoc(tatCa),
    soTong: tatCa.length,
    ds: khop.map((p) => ({
      id: String(p.id), pageId: String(p.page_id || ''), ten: p.ten || '', thiTruong: p.thi_truong || '',
      sanPhamGocMa: p.san_pham_goc_ma || '', botBat: p.bot_ai_bat === true, coLoiBot: p._coLoiBot,
    })).sort((a, b) => (a.ten || a.pageId).localeCompare(b.ten || b.pageId, 'vi')),
  };
}

/**
 * Trang của một page.
 *
 * @returns {Promise<object|null>} `null` khi page không thuộc team đang mở — nơi gọi trả
 *   **404**, không phải 403: 403 là lời xác nhận «dòng này có thật ở team khác».
 */
/** LL15d: page ngoài phạm vi marketer ⇒ 403 nói vì sao (page CÓ trong team — giấu bằng 404 là nói sai). */
async function chanPageNgoaiPhamVi(bc, p) {
  const pv = await phamViMarketer(bc);
  if (!pv) return;
  if ((await maGocCuaPhamVi(congPage(bc), pv)).has(String(p.sanPhamGocMa || ''))) return;
  throw new LoiPageBot(pv.maNv ? 'page này không bán sản phẩm bạn phụ trách' : cauPhamVi(pv), 'khong_phu_trach', 403);
}

export async function trangMotPage(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const p = await motPage(bc, id);
  if (!p) return null;
  await chanPageNgoaiPhamVi(bc, p);

  // CR-02-10 · MB2: một công tắc (`page.bot_ai_bat`); cửa chỉ còn khoá tay của người vận hành.
  const cuaBot = trangThaiCongTac();

  let doc = null;
  let viSaoKhongDoc = null;
  try {
    const r = await cuaKiemMotPage(p.pageId);
    doc = r.doc;
    viSaoKhongDoc = r.viSao;
  } catch (e) {
    viSaoKhongDoc = `Lõi bot lỗi khi đọc cửa kiểm: ${e?.message || e}`;
  }

  // ⚠️ BA CẢNH, KHÔNG PHẢI HAI (sửa 25/09 sau lượt thử A→Z):
  //    ① cầu hỏng / chưa nối  ⇒ chưa đo được, và đó là việc của người quản trị hệ thống;
  //    ② cầu ĐỌC ĐƯỢC nhưng KHÔNG thấy page này ⇒ đây là một câu trả lời THẬT: tiến trình
  //       bot không biết page ấy (chưa quét về, hoặc token không phủ). Người dùng làm được;
  //    ③ đọc được và thấy ⇒ có danh sách điều kiện.
  //    Gộp ① và ② vào một câu «chưa đọc được» là đẩy người ta đi hỏi người quản trị một việc
  //    họ tự sửa được. Đo được ở lượt thử A→Z: page vừa tạo rơi vào ②, màn nói như ①.
  const botKhongThay = !doc && !viSaoKhongDoc;
  const chuaDoDuoc = !doc && !!viSaoKhongDoc;
  const chan = (doc?.blockers || []).map((b) => doDieuKien(b, true));
  const nhac = (doc?.warnings || []).map((b) => doDieuKien(b, false));

  return {
    page: {
      id: p.id,
      pageId: p.pageId,
      ten: p.ten || p.pageId,
      thiTruong: p.thiTruong,
      nganhHang: p.nganhHang,
      marketer: p.marketer,
      sanPhamGocMa: p.sanPhamGocMa,
      matDau: p.matDau,
    },
    // CÔNG TẮC DUY NHẤT (CR-02-10 · MB2): cột `bot_ai_bat` LÀ sự thật — worker đọc thẳng nó. Trước
    // 02/10 màn giữ hai con số (RAM tiến trình bot v1 ↔ cột bản sao) vì từng lệch 50; nay chỉ một.
    bot: {
      bat: p.botAiBat === true,
      batDuoc: doc ? !!doc.aiAllowed : null,
      trangThai: doc?.readiness || null,
    },
    tinhTrang: {
      chuaDoDuoc,
      botKhongThay,
      viSaoKhongDoc,
      chan,
      nhac,
      // «Sẵn sàng» CHỈ khi ĐỌC ĐƯỢC, THẤY page, và không còn chặn. Hai cảnh kia không kết luận.
      san: !chuaDoDuoc && !botKhongThay && chan.length === 0,
    },
    // NHỮNG THỨ SỬA ĐƯỢC NGAY TẠI ĐÂY. Trước lượt này chúng nằm rải trong bảng danh sách —
    // sửa thị trường của một page phải đi tìm đúng dòng trong 514 dòng.
    thietLap: {
      thiTruong: p.thiTruong,
      nganhHang: p.nganhHang,
      sanPhamGocMa: p.sanPhamGocMa,
      trongDiem: p.trongDiem,
      botcakeTat: p.botcakeTat,
      danhMucGoc: await danhMucGoc(bc),
    },
    // Hai việc còn lại là CÔNG CỤ RIÊNG, không nhét vào trang page được: chạy thử là một
    // phiên đo có dữ liệu riêng, đoạn chữ gửi AI là màn chẩn đoán bốn khối. Giữ đường dẫn,
    // mang sẵn page.
    diTiep: [
      { chu: 'Chạy thử, chưa gửi ai', duong: `/van-hanh-v3?tab=dien-tap&page=${encodeURIComponent(p.pageId)}` },
      { chu: 'Đoạn chữ gửi cho AI', duong: `/prompt-page?page=${encodeURIComponent(p.pageId)}` },
    ],
    cuaBot,
  };
}

export { LoiPageBot };


/**
 * HAI KHỐI NỘI DUNG của page — sản phẩm kèm giá, và kịch bản đang chạy.
 *
 * Tách khỏi `trangMotPage` vì chúng nặng hơn hẳn: chỉ đọc khi người ta mở đúng tab ấy.
 * CHỈ ĐỌC — sửa vẫn ở màn chuyên của nó, và màn này nói thẳng điều đó.
 */
export async function noiDungPage(boiCanh, id) {
  const bc = batBuocBoiCanh(boiCanh);
  const p = await motPage(bc, id);
  if (!p) return null;
  await chanPageNgoaiPhamVi(bc, p);
  if (!_docKhoi) {
    // Chưa nối ≠ page không có gì. Nói ra, và nói rõ đó là lỗi dựng ứng dụng.
    return { chuaNoi: true, viSao: 'Máy chủ chưa nối bộ đọc sản phẩm và kịch bản của page.' };
  }
  const [sanPham, kichBan] = await Promise.all([
    Promise.resolve(_docKhoi.sanPham(bc.teamId, p.id)).catch((e) => ({ loi: String(e?.message || e) })),
    Promise.resolve(_docKhoi.kichBan(bc.teamId, p.id)).catch((e) => ({ loi: String(e?.message || e) })),
  ]);
  // BẢN SỬA ĐƯỢC lấy THEO ĐÚNG những sản phẩm bộ đọc của bot vừa trả về — một luật cho câu
  // «page này bán gì», và bản sửa chỉ đi lấy thêm `version` cùng đủ bậc giá (kể cả bậc TẮT:
  // thiếu chúng thì lượt lưu kế tiếp xoá mất, vì cửa ghi thay trọn danh sách).
  let sanPhamSua = null;
  if (typeof _docKhoi.sua === 'function' && Array.isArray(sanPham)) {
    sanPhamSua = await Promise.resolve(_docKhoi.sua(bc, sanPham.map((x) => x.id)))
      .catch((e) => ({ loi: String(e?.message || e) }));
  }
  // GIÁ GÕ CỨNG TRONG KỊCH BẢN (28/09) — so với bảng giá ĐANG BẬT, đơn vị lớn. Lấy từ bản
  // sửa được vì nó đã đổi đơn vị bằng đúng hệ số của cửa tiền (`HE_SO_TE`); không có bản ấy
  // thì `null` = KHÔNG KIỂM ĐƯỢC, khác hẳn «không có giá nào gõ cứng».
  let giaGoCung = null;
  if (Array.isArray(sanPhamSua)) {
    const bangGia = sanPhamSua.flatMap((x) => (x.offers || [])
      .filter((g) => g.bat !== false)
      .map((g) => ({ gia: Number(g.price), tienTe: g.tien_te })));
    giaGoCung = timGiaGoCung(kichBan && !kichBan.loi ? kichBan.noi_dung_nguoi : null, bangGia, NHAN_TRUONG);
  }
  // QUY TẮC CHUNG (CR-28-09b · MN6): khối ĐẦU TIÊN AI nhận, dùng chung mọi page. Màn page chỉ
  // hiện TÓM TẮT và chỉ đường — sửa ở đây là đổi cả team, nên không đặt ô sửa cạnh kịch bản
  // riêng của một page. `null` = chưa nối bộ đọc (khác «không có bản nào trong CSDL»).
  let boLuat = null;
  if (typeof _docKhoi.boLuat === 'function') {
    boLuat = await Promise.resolve(_docKhoi.boLuat(bc.teamId))
      .then((r) => (r ? { coBan: true, phienBan: r.phien_ban, soKyTu: String(r.noi_dung || '').length, suaLuc: r.sua_luc || null }
        : { coBan: false }))
      .catch((e) => ({ loi: String(e?.message || e) }));
  }
  // BA KHỐI DÙNG CHUNG (MN7): `null` = chưa nối bộ đọc; `{chuaCo:true}` = chưa áp migration 026.
  let khoiChung = null;
  if (typeof _docKhoi.khoiChung === 'function') {
    khoiChung = await Promise.resolve(_docKhoi.khoiChung(bc.teamId)).catch((e) => ({ loi: String(e?.message || e) }));
  }
  return { chuaNoi: false, sanPham, kichBan, sanPhamSua, giaGoCung, boLuat, khoiChung };
}
