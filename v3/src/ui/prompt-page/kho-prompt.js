// TẦNG ĐỌC CỦA MÀN «PROMPT CỦA PAGE» (G2-C3, sóng 1).
//
// Việc của màn: cho xem prompt **THẬT** gửi cho model — bốn khối, số token từng khối, và soi
// mâu thuẫn giữa các khối.
//
// ═══ DÙNG BỘ ĐỌC CỦA NGƯỜI A, KHÔNG DỰNG LẠI ════════════════════════════════════════════
// `src/chat/rap-prompt.js` đã có đủ bốn bộ đọc khối, và nó là thứ ĐANG chạy trên đường chat.
// Dựng lại ở đây là đẻ bản thứ hai, rồi màn hình hiện một prompt khác cái bot thật sự gửi —
// mà đó đúng là thứ màn này sinh ra để loại trừ.
//
// ⚠️ KHÔNG gọi `rapKb()`: nó có cờ `V3_RAP_PROMPT_BAT`, vắng cờ thì lui về `kb.js` cũ và
//    KHÔNG đụng CSDL. Màn này cần thấy bốn khối trong CSDL bất kể cờ, và cần thấy TỪNG KHỐI
//    riêng để đếm token. Nên gọi bốn bộ đọc lẻ — chúng không nhìn cờ.
//
// ⚠️⚠️ CÁI GIÁ, ĐO ĐƯỢC 25/08 và KHAI THẲNG Ở ĐÂY: bốn bộ đọc của A chạy dưới `ctxHeThong()`,
//    và `layNhieu` **ghi một dòng `nhat_ky` cho MỖI lượt gọi qua cửa đó** (cố ý — `01 §9`
//    "ghi cả việc máy làm"). Nên **mỗi lượt XEM một page đẻ 4 dòng nhật ký `doc`**. Đo thật:
//    xem 3 page → 15 dòng.
//
//    Với một màn XEM mà người ta lướt qua 514 page, đó là ~2.000 dòng `doc` chôn lấp những
//    dòng thao tác thật — và `nhat_ky` là bảng CHỈ-THÊM, không dọn lại được.
//
//    VẪN GIỮ bộ đọc của A, không tự viết bản khác: bản khác thì màn hiện một prompt KHÁC cái
//    bot thật sự gửi, và đó là hỏng nặng hơn hẳn. Đã phát `PHIEU-B-Y5` xin A một cửa đọc
//    không-ghi-nhật-ký cho đường XEM. Trong lúc chờ: đọc `san_pham` một lần thay vì hai
//    (bớt 1/5 số dòng), và màn chỉ dựng prompt cho MỘT page mỗi lượt, không dựng hàng loạt.
//
// ═══ SOI MÂU THUẪN — và giới hạn của nó, khai ngay ══════════════════════════════════════
// Đây là dò theo TỪ KHOÁ, không phải hiểu nghĩa. Nó bắt được kiểu mâu thuẫn thô («không
// giảm giá» ở khối luật vs «giảm 10%» ở khối kịch bản) và bỏ sót kiểu tinh vi. Màn phải khai
// đúng như vậy: một danh sách «chỗ đáng đọc lại», không phải một phán quyết.

import { batBuocBoiCanh } from '../../auth/boi-canh.js';

/** Bốn khối, đúng thứ tự và đúng tên của `01-QUYET-DINH.md` §6. */
export const KHOI = Object.freeze({
  BO_LUAT: 'bo_luat_chung',
  KY_NANG: 'ky_nang',
  KICH_BAN: 'kich_ban',
  SAN_PHAM: 'san_pham',
});

/** Token tham chiếu của §6 — để so «khối này đang phình so với thiết kế bao nhiêu». */
export const TOKEN_THIET_KE = Object.freeze({
  bo_luat_chung: 2256,
  ky_nang: 180,        // mỗi kỹ năng
  kich_ban: 1400,
  san_pham: 1500,
});

export const TEN_KHOI = Object.freeze({
  bo_luat_chung: 'Bộ luật chung',
  ky_nang: 'Kỹ năng',
  kich_ban: 'Kịch bản page',
  san_pham: 'Dữ liệu sản phẩm',
});

export const AI_SUA = Object.freeze({
  bo_luat_chung: 'Quản trị · dùng chung mọi page của team',
  ky_nang: 'Marketer · bật theo nhóm sản phẩm',
  kich_ban: 'Marketer phụ trách page',
  san_pham: 'Đồng bộ tự động từ POS',
});

export const KY_TU_MOI_TOKEN = 2.985;
export const uocToken = (chu) => Math.round(String(chu || '').length / KY_TU_MOI_TOKEN);

export class LoiPrompt extends Error {
  constructor(thongDiep, ma = 'prompt', status = 400) {
    super(thongDiep);
    this.name = 'LoiPrompt';
    this.ma = ma;
    this.status = status;
  }
}

/* ─────────────────────────── cổng tiêm ─────────────────────────── */

let _taoTruyVan = null;
let _docKhoi = null;

export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== 'function') throw new LoiPrompt('datTaoTruyVan cần một hàm');
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}

/**
 * Nối bốn bộ đọc khối của người A (`src/chat/rap-prompt.js`).
 * @param {{boLuat:Function, kyNang:Function, kichBan:Function, sanPham:Function}} bo
 */
export function datDocKhoi(bo) {
  if (bo == null) { _docKhoi = null; return null; }
  for (const t of ['boLuat', 'kyNang', 'kichBan', 'sanPham']) {
    if (typeof bo[t] !== 'function') throw new LoiPrompt(`datDocKhoi: thiếu hàm \`${t}\`.`);
  }
  _docKhoi = bo;
  return _docKhoi;
}

export const daNoiDocKhoi = () => _docKhoi != null;

function congTruyVan(bc) {
  if (!_taoTruyVan) throw new LoiPrompt('chưa nối cổng truy vấn', 'chua_noi', 500);
  return _taoTruyVan(bc);
}

/* ─────────────────────────── đọc ─────────────────────────── */

/** Danh sách page để chọn. Chỉ page có id Facebook — bộ đọc khối tra theo khoá đó. */
export async function pageChonDuoc(boiCanh, { tim = '', gioiHan = 200 } = {}) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = congTruyVan(bc);
  const tatCa = await db.chon('page', {}, { sapXep: 'ten' });
  const t = String(tim || '').trim().toLowerCase();
  const khop = t
    ? tatCa.filter((p) => [p.ten, p.page_id].some((v) => String(v || '').toLowerCase().includes(t)))
    : tatCa;
  return {
    page: khop.slice(0, gioiHan).map((p) => ({
      id: String(p.id), pageId: String(p.page_id || ''), ten: p.ten || '',
      botAiBat: p.bot_ai_bat === true,
    })),
    soKhop: khop.length,
    soTong: tatCa.length,
    catBot: Math.max(0, khop.length - gioiHan),
  };
}

/**
 * Bốn khối của MỘT page, kèm token từng khối và các chỗ đáng đọc lại.
 * Khối nào thiếu thì khai `thieu: true` kèm lý do — «mù thì phải nói ra», không im.
 */
export async function promptCua(boiCanh, pageIdFacebook) {
  const bc = batBuocBoiCanh(boiCanh);
  if (!_docKhoi) {
    throw new LoiPrompt(
      'chưa nối bộ đọc khối của người A (`src/chat/rap-prompt.js`) — máy chủ dựng thiếu một dây. '
      + 'Đây là lỗi cấu hình, KHÔNG phải "page này không có prompt".',
      'chua_noi', 500,
    );
  }
  const db = congTruyVan(bc);
  const dsPage = await db.chon('page', { page_id: String(pageIdFacebook) });
  const page = dsPage[0];
  if (!page) throw new LoiPrompt(`không có page "${pageIdFacebook}" trong team này.`, 'khong_thay', 404);

  // ĐỌC `san_pham` MỘT LẦN rồi dùng cho cả hai chỗ (khối sản phẩm, và lọc kỹ năng theo mã
  // SP). Bản đầu để `docKhoi.kyNang` tự đi đọc lại — mỗi lượt xem tốn HAI lượt đọc bảng đó,
  // và mỗi lượt đọc qua `ctxHeThong()` lại đẻ một dòng `nhat_ky` (xem khối ⚠️ dưới đây).
  const sanPham = await _docKhoi.sanPham(bc.teamId, page.id);
  const [boLuat, kyNang, kichBan] = await Promise.all([
    _docKhoi.boLuat(bc.teamId),
    _docKhoi.kyNang(bc.teamId, page.id, (sanPham || []).map((s) => String(s.ma))),
    _docKhoi.kichBan(bc.teamId, page.id),
  ]);

  const khoi = [
    dungKhoi(KHOI.BO_LUAT, boLuat ? boLuat.noi_dung : null, {
      lyDoThieu: 'Team chưa có bộ luật chung nào đang áp, và cũng không kế thừa bản toàn hệ nào.',
      duongSua: '/bo-luat',
      phu: boLuat ? `v${boLuat.phien_ban}${boLuat.team_id == null ? ' · bản toàn hệ (kế thừa)' : ''}` : null,
    }),
    dungKhoi(KHOI.KY_NANG, (kyNang || []).map((k) => k.noi_dung).join('\n\n') || null, {
      lyDoThieu: 'Không kỹ năng nào đang bật cho page này — hoặc chưa bật cái nào, hoặc nhóm '
        + 'sản phẩm đã khoanh không khớp sản phẩm của page.',
      duongSua: '/ky-nang',
      phu: (kyNang || []).length ? `${kyNang.length} kỹ năng: ${kyNang.map((k) => k.ma).join(', ')}` : null,
      soPhan: (kyNang || []).length,
    }),
    dungKhoi(KHOI.KICH_BAN, kichBan ? kichBan.noi_dung_may : null, {
      lyDoThieu: 'Page này chưa có bản kịch bản nào ở trạng thái LIVE.',
      duongSua: null,
      phu: kichBan ? `v${kichBan.phien_ban} · LIVE` : null,
    }),
    dungKhoi(KHOI.SAN_PHAM, moTaSanPham(sanPham), {
      lyDoThieu: 'Page này chưa có sản phẩm nào trong CSDL — bot không biết mình đang bán gì.',
      duongSua: null,
      phu: (sanPham || []).length ? `${sanPham.length} sản phẩm` : null,
      soPhan: (sanPham || []).length,
    }),
  ];

  const tongToken = khoi.reduce((a, k) => a + k.uocToken, 0);
  return {
    page: { id: String(page.id), pageId: String(page.page_id), ten: page.ten || '', botAiBat: page.bot_ai_bat === true },
    khoi,
    tongToken,
    soKhoiThieu: khoi.filter((k) => k.thieu).length,
    mauThuan: soiMauThuan(khoi),
    tenKhoi: TEN_KHOI,
    aiSua: AI_SUA,
    tokenThietKe: TOKEN_THIET_KE,
  };
}

function dungKhoi(ma, noiDung, { lyDoThieu, duongSua = null, phu = null, soPhan = null } = {}) {
  const chu = noiDung == null ? '' : String(noiDung);
  const co = chu.trim().length > 0;
  const tk = uocToken(chu);
  const mocThietKe = ma === KHOI.KY_NANG && soPhan
    ? TOKEN_THIET_KE.ky_nang * soPhan
    : TOKEN_THIET_KE[ma];
  return {
    ma,
    ten: TEN_KHOI[ma],
    aiSua: AI_SUA[ma],
    thieu: !co,
    lyDoThieu: co ? null : lyDoThieu,
    duongSua,
    phu,
    soPhan,
    noiDung: chu,
    soKyTu: chu.length,
    uocToken: tk,
    tokenThietKe: mocThietKe,
    // Bao nhiêu phần trăm so với con số §6 đã thiết kế. Khối phình gấp đôi là tiền gấp đôi
    // cho MỌI lượt chat của page đó — đây là chỗ chi phí trốn.
    soVoiThietKe: mocThietKe ? +(tk / mocThietKe).toFixed(2) : null,
  };
}

function moTaSanPham(ds) {
  if (!Array.isArray(ds) || !ds.length) return null;
  return ds.map((s) => {
    const gia = Array.isArray(s.goiGia) ? s.goiGia : (s.goi_gia || []);
    const dong = gia.map((g) => `  ${g.so_luong ?? g.soLuong} cái: ${g.gia} ${g.tien_te ?? g.tienTe ?? ''}`.trimEnd());
    return [`- ${s.ten || s.ma} (${s.ma})`, s.mo_ta || '', ...dong].filter(Boolean).join('\n');
  }).join('\n');
}

/* ─────────────────────────── soi mâu thuẫn ─────────────────────────── */

/**
 * Các cặp từ khoá đối nhau. Dò THÔ, cố ý — xem khối chú thích đầu file.
 * Mỗi cặp phải đi kèm một câu nói VÌ SAO nó đáng đọc lại, không chỉ nói «có mâu thuẫn».
 */
export const CAP_DOI_NHAU = Object.freeze([
  { a: /không\s+(tự\s+ý\s+)?giảm\s+giá|cấm\s+giảm\s+giá/i, b: /giảm\s+\d+\s*%|khuyến\s*mãi\s+\d+|sale\s+\d+\s*%/i,
    chu: 'Một khối cấm giảm giá, khối kia lại nêu mức giảm cụ thể — bot sẽ chọn theo khối nào?' },
  { a: /không\s+hứa\s+(ngày\s+)?giao|không\s+cam\s+kết\s+(ngày|thời\s*gian)/i, b: /giao\s+trong\s+\d+\s*(ngày|giờ|h)|nhận\s+hàng\s+sau\s+\d+/i,
    chu: 'Một khối cấm hứa ngày giao, khối kia lại hứa một mốc cụ thể.' },
  { a: /không\s+(xin|hỏi)\s+(thông\s+tin\s+)?thẻ|không\s+nhận\s+thanh\s+toán\s+trước/i, b: /chuyển\s+khoản\s+trước|thanh\s+toán\s+trước|đặt\s+cọc/i,
    chu: 'Một khối cấm thu tiền trước, khối kia lại nhắc chuyển khoản/đặt cọc.' },
  { a: /không\s+bịa|không\s+tự\s+(nghĩ|chế)\s+(ra\s+)?thông\s*số/i, b: /nếu\s+không\s+biết\s+thì\s+(cứ\s+)?(đoán|nói\s+đại)/i,
    chu: 'Một khối cấm bịa thông số, khối kia lại cho phép đoán.' },
]);

/**
 * Soi từng CẶP khối. Chỉ báo khi hai vế nằm ở HAI khối khác nhau — cùng một khối thì đó là
 * việc của người viết khối đó, không phải mâu thuẫn giữa các tầng.
 */
export function soiMauThuan(khoi) {
  const co = khoi.filter((k) => !k.thieu);
  const ra = [];
  for (const cap of CAP_DOI_NHAU) {
    for (const x of co) {
      for (const y of co) {
        if (x.ma === y.ma) continue;
        if (cap.a.test(x.noiDung) && cap.b.test(y.noiDung)) {
          ra.push({
            khoiA: x.ma, khoiB: y.ma,
            tenA: TEN_KHOI[x.ma], tenB: TEN_KHOI[y.ma],
            chu: cap.chu,
            trichA: trich(x.noiDung, cap.a),
            trichB: trich(y.noiDung, cap.b),
          });
        }
      }
    }
  }
  return ra;
}

function trich(chu, re) {
  const m = String(chu).match(re);
  if (!m) return null;
  const i = Math.max(0, m.index - 40);
  return String(chu).slice(i, m.index + m[0].length + 40).replace(/\s+/g, ' ').trim();
}
