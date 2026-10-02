// CẦU SANG LÕI BOT — cho các màn Page & Bot · Kết nối & token · Sẵn sàng · Số liệu · Kịch bản.
//
// ─── CR-02-10 · MB1 (02/10): KHÔNG CÒN LÀ CÂY CẦU HTTP ─────────────────────────────────
//
// Trước 02/10 mỗi hàm ở đây gọi `/admin/api` của tiến trình bot v1 (`src/server.js`, cổng
// 3100), vì công tắc AI, kho kiến thức (`kb-overrides.json` + RAM) và kho token sống trong RAM
// của tiến trình đó. v1 nay nghỉ hưu (01-QUYET-DINH §14): cùng những hàm thư viện mà handler
// v1 từng gọi (`src/kb.js` · `src/readiness.js` · `src/pancake.js` · `src/store.js` ·
// `src/core/so-lieu-bot-cu.js`) chạy NGAY TRONG tiến trình v3, sau `src/core/khoi-dong-loi.js`.
//
// Tên hàm và HÌNH DẠNG dữ liệu trả về GIỮ NGUYÊN — các màn đang gọi không phải sửa. Tên tệp
// còn mang «v1» tới MB4 (đổi tên cùng lượt gỡ chữ «bot cũ» trên màn).
//
// Bộ ca tiêm lõi giả bằng `datLoiBot({...})` thay vì giả `fetch` như trước.
//
// ─── PHÂN VAI: v3 giữ QUYỀN ─────────────────────────────────────────────────────────────
// Hàm ở đây KHÔNG tự kiểm vai/team — lớp màn kiểm và ghi nhật ký TRƯỚC khi gọi, để không có
// hai bản luật phân quyền ở hai chỗ. Phần lớn số liệu trả về là TOÀN HỆ: nơi gọi phải lọc lại
// theo page của team mình.

/**
 * ═══ CỬA GHI: MỞ MẶC ĐỊNH, CÓ KHOÁ TUỲ CHỌN ═══════════════════════════════════════
 *
 * Đường bật bot của v3 có BẢY CHỐT trước cờ này: đăng nhập · vai ở router · vai ở cửa ghi ·
 * vai ở tầng dưới (chỉ `quan-tri`) · cửa kiểm sẵn sàng từ chối page bị chặn · nhật ký ai bấm ·
 * hộp xác nhận. Cờ ở đây chỉ để khoá lại cho ai cần (máy dev, bản demo, lúc sự cố):
 *   · `V3_BOT_KHOA=1`  khoá
 *   · `V3_BOT_GHI=0`   cờ cũ — ai đã đặt vẫn được tôn trọng
 *   · `PANCAKE_READONLY=1` — van gửi của cả hệ: không bật/tắt bot, không thêm token; riêng
 *     đường ghi KHO (sản phẩm · kịch bản) được mở bởi `V3_GHI_KHO_BOT=1`.
 */
export const BIEN_KHOA = 'V3_BOT_KHOA';
/** Giữ tên cũ để ai đã đặt `V3_BOT_GHI=0` vẫn được tôn trọng. */
export const BIEN_CO_GHI = 'V3_BOT_GHI';
export const BIEN_CHAN_DOC = 'PANCAKE_READONLY';
/**
 * CR-28-09b · MN5 — `V3_GHI_KHO_BOT=1`: cho ghi KHO KIẾN THỨC của bot (sản phẩm · kịch bản vào
 * `kb-overrides.json`) dù `PANCAKE_READONLY=1`. Ghi kho là việc NỘI BỘ: không tin nào ra khách vì
 * nó. KHÔNG mở bật/tắt bot, KHÔNG mở thêm token. `V3_BOT_KHOA=1` / `V3_BOT_GHI=0` vẫn THẮNG.
 */
export const BIEN_GHI_KHO = 'V3_GHI_KHO_BOT';

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

/** Lõi chạy ở đâu — màn «Nguồn số» hiện câu này. Không còn địa chỉ HTTP nào. */
export function gocBot() { return 'trong tiến trình v3'; }

/** Giữ cho nơi gọi cũ: không còn tài khoản nào phải có — lõi nằm ngay trong tiến trình. */
export const coTaiKhoan = () => true;

/* ─────────────────────────── LÕI: hàm thư viện trong tiến trình ─────────────────────────── */

let _tiem = null;
let _macDinh = null;

/**
 * Tiêm lõi (bộ ca). `null` = về lõi thật. Tiêm thì CHỈ dùng bản tiêm — không nạp thư viện thật,
 * vì nạp `src/store.js`/`page-registry.js` là đọc tệp dữ liệu của máy đang chạy bộ ca.
 */
export function datLoiBot(loi) { _tiem = loi || null; boNhoSanSang(); }

async function loi() {
  if (_tiem) return _tiem;
  if (!_macDinh) {
    _macDinh = (async () => {
      const [kb, readiness, pancake, store, soLieu] = await Promise.all([
        import('../../../src/kb.js'),
        import('../../../src/readiness.js'),
        import('../../../src/pancake.js'),
        import('../../../src/store.js'),
        import('../../../src/core/so-lieu-bot-cu.js'),
      ]);
      return {
        allReadiness: readiness.allReadiness,
        canEnableAI: readiness.canEnableAI,
        getPageList: kb.getPageList,
        getPageConfig: kb.getPageConfig,
        getPageProductsRaw: kb.getPageProductsRaw,
        updatePageProducts: kb.updatePageProducts,
        updatePageConfig: kb.updatePageConfig,
        datKhoiChung: kb.datKhoiChung,
        khoiChungHienTai: kb.khoiChungHienTai,
        pancakePages: pancake.pancakePages,
        listPancakeTokens: pancake.listPancakeTokens,
        addPancakeToken: pancake.addPancakeToken,
        removePancakeToken: pancake.removePancakeToken,
        lamMoiTokenDb: pancake.lamMoiTokenDb,
        isAiEnabled: store.isAiEnabled,
        setAiEnabled: store.setAiEnabled,
        chiPhiToken: soLieu.chiPhiToken,
        donHangAi: soLieu.donHangAi,
        pheuHoiThoaiTho: soLieu.pheuHoiThoaiTho,
      };
    })();
  }
  return _macDinh;
}

/** Chạy một việc của lõi; lỗi thư viện thành `LoiCauBotHong` có tên việc — màn nói được hỏng ở đâu. */
async function lam(viec, fn) {
  const L = await loi();
  try { return await fn(L); }
  catch (e) {
    if (e instanceof LoiCauBotHong || e instanceof LoiCauBotDong) throw e;
    throw new LoiCauBotHong(`Lõi bot hỏng khi ${viec}: ${(e && e.message) || e}`, 500);
  }
}

/**
 * Cửa ghi mở hay đóng, và VÌ SAO đóng — trả về câu người đọc được, không phải một cờ trần.
 * HAI DANH SÁCH SONG SONG (GD4 · 25/09): `thieu` cho người vận hành, `thieuKyThuat` bằng tên biến.
 */
export function trangThaiCau({ kho = false } = {}) {
  const thieu = [];
  const thieuKyThuat = [];
  if (env(BIEN_KHOA) === '1') {
    thieu.push('máy này đang bị khoá, không cho ghi vào lõi bot');
    thieuKyThuat.push('`' + BIEN_KHOA + '=1` đang bật');
  }
  if (env(BIEN_CO_GHI) === '0') {
    thieu.push('có người đã tắt đường ghi bằng cấu hình cũ, và cấu hình đó vẫn được tôn trọng');
    thieuKyThuat.push('`' + BIEN_CO_GHI + '=0` đang đặt — bỏ dòng đó, hoặc dùng `'
      + BIEN_KHOA + '` nếu muốn khoá');
  }
  if (env(BIEN_CHAN_DOC) === '1' && !(kho && env(BIEN_GHI_KHO) === '1')) {
    thieu.push('máy này đang CHỈ ĐỌC với Pancake: không bật tắt bot, không thêm tài khoản được');
    thieuKyThuat.push('`' + BIEN_CHAN_DOC + '=1` đang bật');
  }
  return { mo: thieu.length === 0, thieu, thieuKyThuat, goc: gocBot() };
}

function batBuocMo({ kho = false } = {}) {
  const t = trangThaiCau({ kho });
  if (!t.mo) {
    throw new LoiCauBotDong('Cửa ghi vào lõi bot đang ĐÓNG: ' + t.thieu.join(' · ')
      + (t.thieuKyThuat.length ? ` (${t.thieuKyThuat.join(' · ')})` : ''));
  }
}

/* ─────────────────── bản chép sản phẩm sang bot (CR-28-09b · MN3) ─────────────────── */

/**
 * Đẩy danh sách sản phẩm (hình dạng `src/products/ban-chep-bot.js`) của MỘT page sang bot,
 * rồi ĐỌC LẠI xem bot đang giữ đúng bản ấy chưa.
 *
 * Vì sao đọc lại: bot v1 trả `{ok:true}` từ `updatePageProducts` — trước 28/09 ngay cả khi
 * ghi đĩa hỏng. Luật một nguồn đòi «lưu xong thì bot chạy đúng thế»; lời hứa của bên kia
 * không phải bằng chứng, bản bot đọc ra mới là. Lệch ⇒ ném, nơi gọi huỷ lượt lưu.
 *
 * So theo đúng thứ bot dùng: id · tên · mô tả · phân loại · tiền tệ · bậc (nhãn, giá) · ảnh
 * (nhãn, đường). Đường ảnh so bằng ĐUÔI: bot tự ghép gốc công khai vào đường `/uploads/…`.
 */
export async function daySanPhamLenBot(pageIdFacebook, products) {
  batBuocMo({ kho: true });
  const id = String(pageIdFacebook);
  try {
    return await lam('đẩy sản phẩm', (L) => {
      L.updatePageProducts(id, products);
      const that = L.getPageProductsRaw(id) || [];
      const lech = soBanChep(products, that);
      if (lech) throw new LoiCauBotHong(`Bot nhận bản sản phẩm của page ${id} nhưng đọc lại thấy lệch: ${lech}`, 502);
      return { pageId: id, soSanPham: that.length };
    });
  } finally { boNhoSanSang(); }   // sản phẩm đổi ⇒ tình trạng sẵn sàng đổi
}

/** Đưa kịch bản lên LIVE: ba ô cấu hình của page vào `kb-overrides.json` + RAM (cũ: POST `/kb/:id/config`). */
export async function dayKichBanLenBot(pageIdFacebook, cauHinh) {
  batBuocMo({ kho: true });
  try { return await lam('đưa kịch bản lên', (L) => L.updatePageConfig(String(pageIdFacebook), cauHinh || {}, 'v3')); }
  finally { boNhoSanSang(); }
}

/** Nạp lại kho token CSDL của tiến trình này NGAY (cũ: POST `/pancake-tokens/nap-lai`). Không phải cửa ghi. */
export async function napLaiKhoToken() {
  try { return { ok: true, soToken: await lam('nạp lại kho token', (L) => L.lamMoiTokenDb()) }; }
  finally { boNhoSanSang(); }
}

// Phép so nằm ở `src/products/ban-chep-bot.js` — lượt nạp MN2 dùng CÙNG phép so để chứng minh
// bản chép khớp bot trước khi ghi. Hai bản của một phép so là hai định nghĩa của «khớp».
export { soBanChep } from '../../../src/products/ban-chep-bot.js';
import { soBanChep } from '../../../src/products/ban-chep-bot.js';

/**
 * Đẩy ba khối dùng chung (Chính sách · FAQ · Phản đối) sang bot rồi ĐỌC LẠI tệp bot vừa ghi
 * (CR-28-09b · MN7). Lệch ⇒ ném, nơi gọi huỷ lượt lưu. Cùng đường ghi KHO (`kho: true`).
 */
export async function dayKhoiChungLenBot(noiDung) {
  batBuocMo({ kho: true });
  return lam('đẩy khối dùng chung', (L) => {
    L.datKhoiChung(noiDung);
    const d = L.khoiChungHienTai() || {};
    if (JSON.stringify(d.tep || null) !== JSON.stringify(noiDung)) {
      throw new LoiCauBotHong('Bot nhận ba khối dùng chung nhưng đọc lại thấy lệch.', 502);
    }
    return { nguon: d.nguon || '', dangDung: d.nguon === 'v3' };
  });
}

/** Ba khối dùng chung bot đang giữ (cũ: GET `/kb-chung`) — cho script đối chiếu. */
export async function khoiChungCuaBot() {
  return lam('đọc khối dùng chung', (L) => L.khoiChungHienTai());
}

/* ────────────────────────────── công tắc BOT AI (G2-B2) ────────────────────────────── */

/**
 * Bật/tắt bot AI cho MỘT page, bằng id Facebook (`page.page_id`, không phải `page.id`).
 * Trả về trạng thái SAU khi đổi, đọc lại từ lõi — không đoán theo tham số gửi đi.
 */
export async function datBotAi(pageIdFacebook, bat) {
  batBuocMo();
  const id = String(pageIdFacebook);
  try {
    return await lam('đổi công tắc bot', (L) => {
      // CỔNG BẬT AI (cũ: `admin-scripts.js` chặn trước `/pages/:id/ai`). TẮT thì luôn được.
      if (bat) {
        const g = L.canEnableAI(id);
        if (!g.ok) throw new LoiCauBotHong(`Chưa bật được AI cho page ${id} — ${g.readiness}: ${g.reason || ''}`, 409);
      }
      L.setAiEnabled(id, !!bat);
      return { pageId: id, batSauKhiDoi: !!L.isAiEnabled(id) };
    });
  } finally { boNhoSanSang(); }   // hỏng giữa chừng thì càng không được tin bản nhớ cũ
}

/* ──────────────────────────── cửa kiểm sẵn sàng (G2-F5) ──────────────────────────── */

/**
 * Sáu điều kiện sẵn sàng của MỌI page lõi nhìn thấy (`src/readiness.js#allReadiness`).
 *
 * ⚠️ TRẢ VỀ TOÀN HỆ, KHÔNG THEO TEAM — nơi gọi **bắt buộc** lọc lại theo page của team mình.
 *
 * ⚠️ NHỚ KẾT QUẢ (28/09). Hồi chạy trong tiến trình bot v1, lượt này mất 10–17 giây và làm đứng
 *    cả tiến trình (`allReadiness()` đồng bộ). Thủ phạm là `kb.js#readOverrides()` đọc lại tệp
 *    510 KB cho từng page — đã vá cùng ngày. Đo lại 02/10 trên dữ liệu thật: **33 ms lượt đầu,
 *    ~7 ms các lượt sau** cho 581 page. Bản nhớ vẫn giữ: rẻ, và mười tab mở cùng lúc chung một lượt.
 *    ≤ `TUOI_TUOI` trả bản nhớ · ≤ `TUOI_CU` trả bản nhớ NGAY và làm mới ngầm · cũ hơn thì chờ đọc.
 *    Bật/tắt bot và thêm/bỏ token xoá bản nhớ ngay (`boNhoSanSang`). Kết quả mang `docLuc`.
 */
const TUOI_TUOI = 60_000;
const TUOI_CU = 10 * 60_000;
const _nho = { kq: null, luc: 0, dang: null };

function docSanSangMoi() {
  if (!_nho.dang) {
    _nho.dang = docSanSangTho()
      .then((kq) => { _nho.kq = kq; _nho.luc = Date.now(); return kq; })
      .finally(() => { _nho.dang = null; });
  }
  return _nho.dang;
}

/** Xoá bản nhớ — gọi sau mọi lượt GHI làm đổi tình trạng page. `null` cũng dùng cho bộ ca. */
export function boNhoSanSang() { _nho.kq = null; _nho.luc = 0; }

export async function sanSangToanHe() {
  const tuoi = Date.now() - _nho.luc;
  if (_nho.kq && tuoi <= TUOI_TUOI) return _nho.kq;
  if (_nho.kq && tuoi <= TUOI_CU) {
    docSanSangMoi().catch(() => {});   // làm mới ngầm; hỏng thì lượt sau thử lại
    return _nho.kq;
  }
  return docSanSangMoi();
}

async function docSanSangTho() {
  const ds = await lam('tính bảng sẵn sàng', (L) => L.allReadiness() || []);
  return {
    pages: ds,
    // Ba con số TOÀN HỆ, cùng phép đếm handler `/readiness` cũ. Màn theo team tự đếm lại phần mình.
    toanHe: {
      chan: ds.filter((r) => !r.aiAllowed).length,
      nhac: ds.filter((r) => r.aiAllowed && (r.warnings || []).length).length,
      san: ds.filter((r) => r.readiness === 'READY').length,
      tong: ds.length,
    },
    docLuc: new Date().toISOString(),
  };
}

/* ─────────────────────────── phễu hội thoại (G2-G4) ─────────────────────────── */

/**
 * Phân bố hội thoại theo BẬC PHỄU và theo CHỦ SỞ HỮU, từ `conv-state.json` của bot cũ
 * (`src/core/so-lieu-bot-cu.js#pheuHoiThoaiTho` — đứng im từ 16/09).
 *
 * Đo 28/08: 29.557 hội thoại — GREET 20.702 · QUALIFY 5.190 · SELLING 680 · CLOSING 23 ·
 * POST_SALE 1.978 · HANDOFF 984. Chủ sở hữu: BOTCAKE 20.702 · AI 5.876 · SALE 2.979.
 *
 * ⚠️ ĐÂY LÀ ẢNH CHỤP HIỆN TẠI, KHÔNG PHẢI DÒNG CHẢY. Mỗi hội thoại đứng ở đúng một bậc lúc
 *    này; nó KHÔNG nói có bao nhiêu người đã đi qua bậc đó rồi rời đi. Lấy hiệu hai bậc rồi
 *    gọi là «tỉ lệ rơi» là đọc sai bản chất — nơi gọi phải nói rõ điều đó.
 */
export async function pheuHoiThoai() {
  const d = await lam('đọc phễu hội thoại', (L) => L.pheuHoiThoaiTho());
  const chung = (d && d.overall) || {};
  return {
    tong: Number(chung.total || 0),
    theoBac: chung.byState || {},
    theoChuSoHuu: chung.byOwner || {},
    bac: Array.isArray(d?.states) ? d.states : [],
  };
}

/* ─────────────────────────── đơn hàng (G2-G1) ─────────────────────────── */

/**
 * BA CON SỐ ĐƠN, ĐO BA CÂU HỎI KHÁC NHAU. Đừng chọn một cái rồi gọi nó là «số đơn».
 *
 * Truy 26/08 tận nơi tính:
 *
 * ① `botTuTao` — `src/stats.js#incOrder`, gọi từ `src/tools.js:202` khi CHÍNH BOT tạo đơn
 *    bằng lời gọi công cụ. Khử trùng theo (page, khách) ⇒ mỗi khách đếm một lần.
 *    Phạm vi: TOÀN THỜI GIAN. Đo 26/08: **269**.
 *
 * ② `posQuyChoAi` — `src/pancake-orders.js#aiOrderStats`. Hỏi thẳng POS Pancake lấy đơn
 *    THẬT, giữ đơn nào có `conversation_id` thuộc tập hội thoại AI, bỏ đơn huỷ/hoàn.
 *    Phạm vi: **60 NGÀY GẦN NHẤT**. Đo 26/08: **907**.
 *
 * ③ `hoiThoaiCoDon` — cùng phép quét ②, nhưng đếm số HỘI THOẠI thay vì số đơn.
 *    Đo 26/08: **893**.
 *
 * ① và ② lệch hơn ba lần và CẢ HAI ĐỀU ĐÚNG: ① là «bot tự tay chốt bao nhiêu đơn», ② là
 * «bao nhiêu đơn thật ở POS đến từ hội thoại có AI tham gia» — khách chat với bot rồi sale
 * chốt hộ, hoặc khách tự đặt sau khi chat, đều vào ② mà không vào ①.
 *
 * Cộng chúng lại, hay lấy một cái rồi gọi là «số đơn», đều là trả lời sai. Trả cả ba ra
 * kèm nhãn, và để màn nói rõ từng cái đo gì.
 */
export async function donHangToanHe() {
  // Khi đệm nguội, phép quét hỏi POS Pancake từng page (tới 12 trang × 100 đơn) — có thể mất vài
  // phút; đệm 5 phút và khoá chống quét chồng nằm ở `src/core/so-lieu-bot-cu.js#donHangAi`.
  const d = await lam('quét đơn AI ở POS', (L) => L.donHangAi({}));
  const trang = (d && d.pages) || {};
  const page = Object.entries(trang).map(([pageId, v]) => ({
    pageId: String(pageId),
    hoiThoaiCoDon: Number(v.aiOrders || 0),
    posQuyChoAi: Number(v.aiOrderCount || 0),
    // `stale: true` = lượt quét này HỎNG và đang hiện lại số của lần trước. Phải đi tiếp ra
    // màn, không nuốt: một con số cũ trông y hệt một con số mới.
    soCu: v.stale === true,
  }));
  return {
    bat: d?.enabled === true,
    // `partial` = có page quét lỗi ⇒ tổng đang THIẾU, không phải đang đúng.
    thieu: d?.partial === true,
    soPageQuetLoi: Number(d?.failedPages || 0),
    quetLuc: d?.scannedAt ? new Date(Number(d.scannedAt)).toISOString() : null,
    page,
  };
}

/* ─────────────────────────── chi phí AI (G2-G2) ─────────────────────────── */

/**
 * Chi phí token THẬT mà bot cũ đã đo (Sổ AI, đứng im từ 28/08) — tiền, số lượt, bảng theo page.
 *
 * ⚠️ ĐÂY LÀ SỐ ĐO ĐƯỢC, KHÔNG PHẢI SỐ SUY. `measured` cho biết bao nhiêu lượt có số token
 *    thật từ nhà cung cấp; phần còn lại là ước. Trả nguyên cả hai ra để màn nói được câu
 *    «bao nhiêu phần trăm con số này là đo thật».
 *
 * ⚠️ TOÀN HỆ, KHÔNG THEO TEAM. Nơi gọi phải giao với danh sách page của team.
 *
 * ⚠️ Bảng `so_ai` của CSDL v3 là sổ cái DÀI HẠN cho cùng chuyện này, và nó có **0 dòng**
 *    (đo 25/08) vì luồng sống của v3 chưa chạy. Hai chỗ chưa đồng bộ — màn phải nói ra,
 *    đừng hiện 0 của v3 như thể không ai tiêu đồng nào.
 */
export async function chiPhiToanHe() {
  const d = await lam('tính chi phí token', (L) => L.chiPhiToken({}));
  const so = (v) => (v == null ? null : Number(v));
  const dsPage = Array.isArray(d && d.pages) ? d.pages : [];
  return {
    nhaCungCap: String((d && d.provider) || ''),
    soLuotTraLoi: so(d?.replies),
    soLuotDoThat: so(d?.measured),
    soDon: so(d?.orders),
    soLoiGoi: so(d?.calls),
    tokenVao: so(d?.tin),
    tokenRa: so(d?.tout),
    tokenDocLai: so(d?.cread),
    tienUsd: so(d?.usd),
    tienVnd: so(d?.vnd),
    vndMoiTin: so(d?.vndPerReply),
    vndMoiDon: so(d?.vndPerOrder),
    tinMoiDon: so(d?.repliesPerOrder),
    bangGia: d?.prices || null,
    page: dsPage.map((p) => ({
      pageId: String(p.id),
      ten: p.name || '',
      soLuot: so(p.replies) || 0,
      soLuotDoThat: so(p.measured) || 0,
      soDon: so(p.orders) || 0,
      tienVnd: so(p.usd) != null ? Math.round(so(p.usd) * (so(d?.vnd) && so(d?.usd) ? so(d.vnd) / so(d.usd) : 26000)) : 0,
      tienUsd: so(p.usd) || 0,
      vndMoiTin: so(p.vndPerReply),
      vndMoiDon: so(p.vndPerOrder),
      tinMoiDon: so(p.repliesPerOrder),
      token: (so(p.tin) || 0) + (so(p.tout) || 0),
    })),
  };
}

/* ─────────────────────────── kho sản phẩm (G2-F6, G2-F7) ─────────────────────────── */

/**
 * Danh sách page kèm SỐ sản phẩm — một lời gọi cho toàn hệ.
 *
 * ⚠️ Nguồn là KB của lõi (`kb-overrides.json` do v3 ghi + Sheet danh bạ), **không phải bảng `san_pham`**
 *    của CSDL v3. Bảng đó có 0 dòng (đo 25/08) vì chưa ai chạy nạp từ POS. Đọc bảng rồi
 *    kết luận «chưa có sản phẩm» là đúng cái lỗi đã mắc với cột `page.bot_ai_bat`: nhìn
 *    bản sao rỗng rồi tin, trong khi nguồn thật có 71 sản phẩm trên 69 page.
 *
 * ⚠️ TOÀN HỆ, KHÔNG THEO TEAM — nơi gọi phải lọc lại theo page của team mình.
 */
export async function danhSachPageKemSanPham() {
  // Cùng phép dựng handler `/pages` cũ: danh sách từ PANCAKE; chưa nạp được Pancake thì lui về KB.
  const ds = await lam('dựng danh sách page', (L) => {
    const kbById = new Map((L.getPageList() || []).map((p) => [String(p.id), p]));
    const pk = L.pancakePages();
    const nguon = pk && pk.size ? [...pk.values()] : [...kbById.values()];
    return nguon.map((p) => {
      const id = String(p.id);
      const kb = kbById.get(id) || {};
      const cfg = L.getPageConfig(id) || {};
      return {
        id, name: p.name || kb.name || '', products: kb.products || 0,
        hasKb: (kb.products || 0) > 0 || !!(cfg.greeting || cfg.tone || cfg.salesPrompt),
        market: kb.market || '', category: kb.category || '', marketer: kb.marketer || '',
        aiEnabled: !!L.isAiEnabled(id),
      };
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  });
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
  const id = String(pageIdFacebook);
  const d = await lam('đọc sản phẩm của page', (L) => ({
    pageName: L.pancakePages()?.get(id)?.name || (L.getPageList() || []).find((p) => String(p.id) === id)?.name || '',
    products: L.getPageProductsRaw(id),
    config: L.getPageConfig(id),
  }));
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
  const ds = await lam('đọc kho token', (L) => L.listPancakeTokens());
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
  batBuocMo();
  try {
    return await lam('thêm token', async (L) => {
      const r = await L.addPancakeToken(token);
      if (!r || !r.ok) throw new LoiCauBotHong((r && r.error) || 'không thêm được token', 400);
      return r;
    });
  } finally { boNhoSanSang(); }
}

export async function boToken(thuTu) {
  batBuocMo();
  try {
    return await lam('bỏ token', (L) => {
      const r = L.removePancakeToken(thuTu);
      if (!r || !r.ok) throw new LoiCauBotHong((r && r.error) || 'không bỏ được token', 400);
      return r;
    });
  } finally { boNhoSanSang(); }
}
