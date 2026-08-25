// CÂY CẦU SANG TIẾN TRÌNH BOT v1 — cho hai màn G2-B2 (Page & Bot) và G2-B4 (Kết nối & token).
//
// ─── VÌ SAO PHẢI CÓ CÂY CẦU, KHÔNG GHI THẲNG XUỐNG CSDL ────────────────────────────────
//
// Hai thứ mà hai màn đó điều khiển KHÔNG nằm trong cơ sở dữ liệu v3:
//
//   ① CÔNG TẮC BOT AI. Nguồn thật là `ai-enabled.json` + một `Set` trong RAM của tiến trình
//      bot (`src/store.js`). Cột `page.bot_ai_bat` của v3 chỉ là BẢN SAO, và
//      `db/di-tru/nap.js#napCongTacAi` chép lại nó từ file mỗi lượt di trú — **cả hai chiều**
//      («bật đúng tập đó, TẮT mọi page ngoài tập»). Ghi thẳng vào cột ⇒ bot KHÔNG đổi hành
//      vi, rồi lượt di trú kế tiếp xoá luôn dấu vết. Màn hình báo «đã bật» mà không có gì
//      xảy ra — đúng họ lỗi im lặng của `suaTheoId` bỏ rơi `team_id` (xem `PHIEU-B-Y3`).
//
//   ② KHO TOKEN PANCAKE. Nguồn thật là `.env` + `pancake-tokens.json`, nạp vào biến
//      `_fileToks` trong RAM của tiến trình bot (`src/pancake.js`). v3 chạy ở TIẾN TRÌNH
//      KHÁC (`aicloser-v3`, cổng 3102). Ghi file từ đây thì bot vẫn dùng bản trong RAM cũ
//      cho tới khi khởi động lại — mà tiêu chí nghiệm thu sóng 0 đòi đúng điều ngược lại:
//      «thêm token mới → page nhận được trong một lượt quét, KHÔNG restart».
//
// ⇒ Cửa đúng là HTTP `/admin/api` của chính tiến trình bot. Nó đã có sẵn, đã chạy thật, và
//    nó là nơi DUY NHẤT vừa đổi được RAM vừa lưu được file trong cùng một lượt.
//
// **KHÔNG sửa một dòng nào của `src/`.** File này chỉ gọi HTTP.
//
// ─── PHÂN VAI: v3 giữ QUYỀN, v1 giữ CÔNG TẮC ───────────────────────────────────────────
// `/admin/api/pages/:id/ai` của v1 KHÔNG biết team là gì — ai gọi được là bật/tắt được mọi
// page. Nên lớp v3 phải kiểm team và ghi nhật ký TRƯỚC khi gọi qua đây; cây cầu này cố ý
// KHÔNG tự kiểm quyền, để không có hai bản luật phân quyền ở hai chỗ.
//
// ─── CỬA GHI MẶC ĐỊNH ĐÓNG ──────────────────────────────────────────────────────────────
// Cùng quy ước với `V3_PANCAKE_GUI` / `V3_WA_GUI` / `V3_POS_GHI` của người A: hai điều kiện,
// thiếu một là đóng. Đây là đường chạm KHÁCH THẬT — bật bot cho một page là bot bắt đầu tự
// trả lời người thật — nên mặc định phải là KHÔNG.
//
//   V3_BOT_GHI === '1'   VÀ   PANCAKE_READONLY !== '1'
//
// ĐỌC thì không cần cờ: xem danh sách token và trạng thái công tắc không đổi gì cả, mà biết
// trạng thái lại đúng là thứ giúp người ta quyết định. Màn hình hiện đủ, và nói rõ cửa ghi
// đang đóng — thay vì hiện một màn trống rồi để người ta đoán.

export const BIEN_CO_GHI = 'V3_BOT_GHI';
export const BIEN_CHAN_DOC = 'PANCAKE_READONLY';
export const BIEN_GOC = 'V3_BOT_V1_GOC';

export class LoiCauBotDong extends Error {
  constructor(lyDo) {
    super(lyDo);
    this.name = 'LoiCauBotDong';
    this.ma = 'cua_ghi_dong';
    this.status = 409;
  }
}

export class LoiCauBotHong extends Error {
  constructor(thongDiep, status = 502) {
    super(thongDiep);
    this.name = 'LoiCauBotHong';
    this.ma = 'cau_bot_hong';
    this.status = status;
  }
}

const env = (t) => process.env[t] || '';

/** Gốc của tiến trình bot v1. Mặc định cùng máy, cổng `PORT` của bot. */
export function gocBot() {
  if (env(BIEN_GOC)) return env(BIEN_GOC).replace(/\/+$/, '');
  const cong = env('PORT') || '3100';
  return `http://127.0.0.1:${cong}`;
}

/** Có đủ tài khoản gọi `/admin/api` không (Basic auth của `src/server.js`). */
export const coTaiKhoan = () => !!(env('ADMIN_USER') && env('ADMIN_PASS'));

/**
 * Cửa ghi mở hay đóng, và VÌ SAO đóng — trả về câu người đọc được, không phải một cờ trần.
 * Màn hình hiện thẳng câu này; «không bật được» mà không nói vì sao thì người ta đi hỏi vòng.
 */
export function trangThaiCau() {
  const thieu = [];
  if (env(BIEN_CO_GHI) !== '1') {
    thieu.push('`' + BIEN_CO_GHI + '` chưa đặt bằng `1` — cửa ghi của v3 mặc định ĐÓNG, đây là '
      + 'đường chạm khách thật (bật bot cho một page là bot bắt đầu tự trả lời người thật)');
  }
  if (env(BIEN_CHAN_DOC) === '1') {
    thieu.push('`' + BIEN_CHAN_DOC + '=1` đang bật — máy này ở chế độ CHỈ ĐỌC với Pancake');
  }
  if (!coTaiKhoan()) {
    thieu.push('thiếu `ADMIN_USER`/`ADMIN_PASS` — không gọi được `/admin/api` của tiến trình bot');
  }
  return { mo: thieu.length === 0, thieu, goc: gocBot() };
}

function batBuocMo() {
  const t = trangThaiCau();
  if (!t.mo) throw new LoiCauBotDong('Cửa ghi sang tiến trình bot đang ĐÓNG: ' + t.thieu.join(' · '));
}

function tieuDe() {
  const co = Buffer.from(env('ADMIN_USER') + ':' + env('ADMIN_PASS')).toString('base64');
  return { Authorization: 'Basic ' + co, 'Content-Type': 'application/json', Accept: 'application/json' };
}

/**
 * Gọi một đường của `/admin/api`.
 * `ghi` = true thì kiểm cửa trước. Đọc thì chỉ cần tài khoản.
 */
async function goi(duong, { phuongThuc = 'GET', than = null, ghi = false, hetGio = 8000 } = {}) {
  if (ghi) batBuocMo();
  else if (!coTaiKhoan()) {
    throw new LoiCauBotDong('thiếu `ADMIN_USER`/`ADMIN_PASS` — không đọc được trạng thái từ tiến trình bot');
  }
  const bo = AbortSignal.timeout ? AbortSignal.timeout(hetGio) : undefined;
  let res;
  try {
    res = await fetch(gocBot() + '/admin/api' + duong, {
      method: phuongThuc,
      headers: tieuDe(),
      body: than == null ? undefined : JSON.stringify(than),
      signal: bo,
    });
  } catch (e) {
    // Bot không chạy là một sự thật đáng nói, không phải một lỗi 500 vô danh: nó nghĩa là
    // công tắc bot đang KHÔNG ai điều khiển được, kể cả bằng dashboard cũ.
    throw new LoiCauBotHong('Không gọi được tiến trình bot ở ' + gocBot()
      + ' — bot có đang chạy không? (' + (e && e.message ? e.message : e) + ')');
  }
  if (res.status === 401) {
    throw new LoiCauBotHong('Tiến trình bot từ chối đăng nhập — `ADMIN_USER`/`ADMIN_PASS` sai.', 502);
  }
  let d = null;
  try { d = await res.json(); } catch { d = null; }
  if (!res.ok) {
    throw new LoiCauBotHong('Tiến trình bot trả ' + res.status + ': '
      + ((d && (d.error || d.thongDiep)) || 'không rõ lý do'), 502);
  }
  return d;
}

/**
 * Cửa gọi CHUNG sang `/admin/api` — cho những màn cần một đường không nằm trong danh sách
 * hàm sẵn có ở dưới (ví dụ `POST /kb/:pageId/config` của màn soạn kịch bản).
 *
 * Vẫn đi qua đúng `goi()`: cùng lớp kiểm cửa ghi, cùng lớp dịch lỗi, cùng hết-giờ. Phơi
 * `goi` ra thẳng thì mỗi nơi gọi lại tự đặt tuỳ chọn một kiểu.
 */
export function goiAdminV1(duong, tuyChon = {}) {
  return goi(duong, tuyChon);
}

/* ────────────────────────────── công tắc BOT AI (G2-B2) ────────────────────────────── */

/**
 * Bật/tắt bot AI cho MỘT page, bằng id Facebook (`page.page_id`, không phải `page.id`).
 * Trả về trạng thái SAU khi đổi, đọc từ chính tiến trình bot — không đoán theo tham số gửi đi.
 */
export async function datBotAi(pageIdFacebook, bat) {
  const d = await goi('/pages/' + encodeURIComponent(String(pageIdFacebook)) + '/ai',
    { phuongThuc: 'POST', than: { on: !!bat }, ghi: true });
  return { pageId: String(pageIdFacebook), batSauKhiDoi: !!(d && d.aiEnabled) };
}

/* ──────────────────────────── cửa kiểm sẵn sàng (G2-F5) ──────────────────────────── */

/**
 * Sáu điều kiện sẵn sàng của MỌI page mà tiến trình bot nhìn thấy.
 *
 * ⚠️ TRẢ VỀ TOÀN HỆ, KHÔNG THEO TEAM — v1 không biết team là gì. Nơi gọi **bắt buộc** phải
 *    lọc lại theo danh sách page của team mình trước khi trả ra trình duyệt. Ai quên bước đó
 *    là để team này đọc được tình trạng page của team kia.
 *
 * ⚠️ HẾT-GIỜ RIÊNG 25 GIÂY, không dùng 8 giây mặc định. Đo trên máy chủ 25/08: đường này mất
 *    **10,6 – 13,2 giây** và trả về 300 KB cho 676 page — `allReadiness()` đọc sổ đăng ký, số
 *    liệu và kho phiên bản kịch bản cho TỪNG page. Để 8 giây thì màn luôn báo «bot có đang
 *    chạy không?» trong khi bot vẫn khoẻ, và người ta đi tìm một lỗi không có.
 *
 *    Chỉ nới cho đường NÀY. Đường gạt công tắc vẫn 8 giây — ở đó chờ lâu nghĩa là bot treo
 *    thật, và biết sớm quan trọng hơn.
 *
 * ⚠️ `aiEnabled` ở đây đọc từ **RAM của tiến trình bot** (`store.js#isAiEnabled`), tức là
 *    SỰ THẬT về việc bot có đang trả lời page đó không. Cột `page.bot_ai_bat` trong CSDL v3
 *    chỉ là bản sao, và đã có lần lệch — xem `docs/v3/SO-TAY-VAI-B.md`. Khi hai số khác nhau,
 *    con số ĐÚNG là con số ở đây.
 */
export async function sanSangToanHe() {
  const d = await goi('/readiness', { hetGio: 25000 });
  const ds = Array.isArray(d && d.pages) ? d.pages : [];
  return {
    pages: ds,
    // Ba con số này do chính v1 đếm trên TOÀN HỆ. Màn theo team phải tự đếm lại trên phần
    // của mình — giữ lại đây chỉ để đối chiếu khi nghi ngờ.
    toanHe: { chan: d?.blocked ?? null, nhac: d?.warned ?? null, san: d?.ready ?? null, tong: ds.length },
  };
}

/* ─────────────────────────── kho sản phẩm (G2-F6, G2-F7) ─────────────────────────── */

/**
 * Danh sách page kèm SỐ sản phẩm — một lời gọi cho toàn hệ.
 *
 * ⚠️ Nguồn sản phẩm là Google Sheet mà tiến trình bot đọc, **không phải bảng `san_pham`**
 *    của CSDL v3. Bảng đó có 0 dòng (đo 25/08) vì chưa ai chạy nạp từ POS. Đọc bảng rồi
 *    kết luận «chưa có sản phẩm» là đúng cái lỗi đã mắc với cột `page.bot_ai_bat`: nhìn
 *    bản sao rỗng rồi tin, trong khi nguồn thật có 71 sản phẩm trên 69 page.
 *
 * ⚠️ TOÀN HỆ, KHÔNG THEO TEAM — nơi gọi phải lọc lại theo page của team mình.
 */
export async function danhSachPageKemSanPham() {
  const d = await goi('/pages', { hetGio: 20000 });
  const ds = Array.isArray(d) ? d : (d && Array.isArray(d.pages) ? d.pages : []);
  return ds.map((p) => ({
    pageId: String(p.id),
    ten: p.name || '',
    soSanPham: Number(p.products || 0),
    coKichBan: !!p.hasKb,
    thiTruong: p.market || '',
    nganhHang: p.category || '',
    marketer: (p.marketer || '').trim(),
    botBat: !!p.aiEnabled,
  }));
}

/**
 * Sản phẩm của MỘT page: mã, tên, bậc giá, tiền tệ, ảnh.
 *
 * ⚠️ 96% SẢN PHẨM KHÔNG CÓ TÊN (đo 25/08: 68/71). `01-QUYET-DINH.md` mục 12 đã cảnh báo:
 *    *«Tên sản phẩm trống trong dữ liệu — chỉ có bảng giá và ảnh. Phải lấy tên và mã từ
 *    POS.»* Hàm này KHÔNG bịa tên thay thế — trả đúng chuỗi rỗng để màn hiện ra được rằng
 *    bot đang bán một món nó không gọi được tên.
 */
export async function sanPhamCuaPage(pageIdFacebook) {
  const d = await goi('/kb/' + encodeURIComponent(String(pageIdFacebook)), { hetGio: 15000 });
  const ds = Array.isArray(d && d.products) ? d.products : [];
  const cfg = (d && d.config) || {};
  return {
    pageId: String(pageIdFacebook),
    tenPage: (d && d.pageName) || '',
    // BA Ô CẤU HÌNH, VÀ CHỈ BA. `kb-overrides.json` của page chỉ có `greeting`, `salesPrompt`,
    // `tone` — xem `90-phu-luc §4`. Không có ô nào cho **động cơ**, lời hứa trung tâm, nhóm
    // nhu cầu. Trả đúng ba ô này ra, đừng độn thêm khoá rỗng cho đẹp: một ô rỗng và một ô
    // KHÔNG TỒN TẠI là hai chuyện khác nhau, và màn «Đưa sản phẩm mới lên chạy» sống bằng
    // đúng sự khác nhau đó.
    cauHinh: {
      chao: String(cfg.greeting || '').trim(),
      cachBan: String(cfg.salesPrompt || '').trim(),
      giongDieu: String(cfg.tone || '').trim(),
    },
    sanPham: ds.map((s) => ({
      ma: String(s.id || ''),
      ten: String(s.name || '').trim(),
      moTa: String(s.desc || '').trim(),
      bienThe: String(s.variant || '').trim(),
      tienTe: String(s.currency || '').trim(),
      giaDau: s.price1 == null ? null : Number(s.price1),
      bacGia: Array.isArray(s.tiers)
        ? s.tiers.map((b) => ({ nhan: String(b.label || ''), gia: Number(b.price) }))
        : [],
      anh: Array.isArray(s.images)
        ? s.images.map((a) => ({ duong: String(a.url || ''), nhan: String(a.label || '') }))
            .filter((a) => a.duong)
        : [],
    })),
  };
}

/* ────────────────────────────── kho token Pancake (G2-B4) ────────────────────────────── */

/**
 * Danh sách token theo ĐÚNG THỨ TỰ DỰ PHÒNG: chính (.env) → phụ (.env) → thêm từ dashboard.
 * v1 chỉ trả về **tám ký tự cuối** của mỗi token, không trả token đầy đủ — giữ nguyên như vậy.
 */
export async function danhSachToken() {
  const ds = await goi('/pancake-tokens');
  return (Array.isArray(ds) ? ds : []).map((t, i) => ({
    thuTu: i,
    ten: t.name,
    het: t.exp || 0,
    daHet: !!t.expired,
    nguon: t.source,
    boDuoc: !!t.removable,
    soPageDangDung: t.pagesRouted || 0,
    duoi: t.tail,
  }));
}

export async function themToken(token) {
  return goi('/pancake-tokens', { phuongThuc: 'POST', than: { token }, ghi: true, hetGio: 20000 });
}

export async function boToken(thuTu) {
  return goi('/pancake-tokens/' + encodeURIComponent(String(thuTu)), { phuongThuc: 'DELETE', ghi: true });
}
