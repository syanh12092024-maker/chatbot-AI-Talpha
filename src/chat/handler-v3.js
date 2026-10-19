import { historyBeforeMessage } from './history.js';
import { templateSafety } from './template-safety.js';
// Điều phối V3: quyền hội thoại, backend nhận đơn và cửa gửi có kiểm soát.
import { ketQuaNhanDon } from "../orders/draft.js";
import { ctxHeThong } from "../db/index.js";
import {
  guiTin as cuaGuiTin,
  guiAnh as cuaGuiAnh,
  ghiNote as cuaGhiNote,
  gatThe as cuaGatThe,
  LoiCuaGuiDong,
} from "../channels/messenger/index.js";
import { classify } from "../classifier.js";
import { fastLane, noteFastLane } from "../fast-lane.js";
import { runCloser } from "../closer.js";
import { guardOutbound, canFixLocally, localFix, LUAT_BH9 } from "../outbound-guard.js";
import {
  emptyProfile,
  hydrateProfile,
  extractFromText,
  absorbToolUses,
  buildContextMessages,
  shipVuotMau,
  bocDonTuLichSu,
  laCauSauBan,
  dauHieuYTe,
  codNgam,
} from "../context.js";
import { CAU_NHAN_BAN_GIAO, CAU_Y_TE } from "../our-messages.js";
// GL8: `catChu` cho mọi chữ cắt để ghi vào `so_ai.du_lieu` (jsonb — `slice` chém đôi emoji ⇒ cả dòng bị từ chối; `so-ai.js` có lưới
// `jsonLanh` phía sau). `so_ai.ly_do` là cột text — pg tự thay nửa cặp bằng U+FFFD, không vỡ. Chữ GỬI KHÁCH không đi qua hàm này.
import { cleanText, catChu } from "../text.js";
import { config } from "../config.js";
import { layModel as layModelMacDinh } from "./model.js";
import { ghiSoAi, LOAI, KHONG_GOI_MODEL } from "./so-ai.js";
import { aiDuocTraLoi, dungState, ganTuState } from "./trang-thai.js";
import { ngonNguLech, doanNgonNgu } from "./ngon-ngu.js";
import { suaHoiThoai, docHoiThoaiTheoPageText } from "./kho.js";
import { lopTuKhoa, LANE as LANE_TU_KHOA } from "./lop-tu-khoa.js";
import { rapKb as rapKbMacDinh } from "./rap-prompt.js";
import {
  chamTheoLichSu as chamTheoLichSuMacDinh,
  conNganSach as conNganSachMacDinh,
} from "./ngan-sach-luot.js";
import { vaoHangCho as vaoHangChoMacDinh } from "../orders/hang-cho.js";
import { ghiNhanChan0Dong as ghiNhanChan0DongMacDinh } from "../db/so-lieu.js";
import { docEnvTuyetDoi } from "../queue/nap.js";
import { dangDienTap } from "../queue/lan-gui.js";

// ══ VAN GỬI + CỔNG HTTP GHI (VA-R1 · RF-1/RF-2) ══════════════════════════════════════
/**
 * VAN GỬI — CÙNG LUẬT với `cuaDangMo()` của cửa Messenger (channels/messenger/index.js:53,
 * hàm đó không export): MỞ ⇔ `V3_PANCAKE_GUI==='1'` VÀ `PANCAKE_READONLY!=='1'`, đọc
 * `process.env` TƯƠI — harness test mở van bằng cách đặt/xoá hai biến này trong tiến
 * trình (test/l2-m1-nhac-truong.test.js:314-318), nên lớp này KHÔNG được tra `.env`.
 */
export function vanGuiDangMo() {
  return (
    process.env.V3_PANCAKE_GUI === "1" && process.env.PANCAKE_READONLY !== "1"
  );
}

/**
 * VAN GỬI đọc `PANCAKE_READONLY` theo ĐƯỜNG TUYỆT ĐỐI — lớp CUỐI (cổng HTTP ghi) dùng:
 * cwd khác làm `process.env` vắng biến thì vẫn thấy `.env` của repo nói READONLY=1.
 * Chặt hơn `vanGuiDangMo()` đúng một chiều (chỉ có thể ĐÓNG thêm, không mở thêm).
 */
export function vanGuiDangMoTuyetDoi() {
  return (
    process.env.V3_PANCAKE_GUI === "1" && docEnvTuyetDoi("PANCAKE_READONLY") !== "1"
  );
}

/** Host thuộc van GỬI Pancake/FB. `pos.pages.fm` KHÔNG thuộc — POS có van riêng `V3_POS_GHI`. */
export function hostThuocVanGui(host) {
  const h = String(host || "").toLowerCase();
  if (h === "pos.pages.fm") return false;
  return h === "pages.fm" || h.endsWith(".pages.fm") || h === "graph.facebook.com";
}

/** Sổ chứng cứ của cổng: các lượt GHI đã chặn (token đã che) — test/repro đọc. */
export const congHttpGhi = { daLap: false, daChan: [], daChoQua: 0 };

/**
 * CỔNG HTTP GHI — lớp chặn CUỐI cho RF-1. Bộ não cũ (`tools.js:197/266/271`,
 * `order-bridge.js:255` — file CẤM SỬA) gọi `fetch` TOÀN CỤC trần để POST note/tag ra
 * pages.fm, KHÔNG qua cửa v3. Không sửa được file cấm ⇒ chặn ở chính `globalThis.fetch`:
 * cài ACCESSOR (get/set) thay vì gán hàm — ai gán `globalThis.fetch = ...` sau đó (bẫy
 * test, polyfill) chỉ thay được phần TRONG, cổng vẫn đứng ngoài. Luật:
 *   · chỉ xét host thuộc van GỬI (`hostThuocVanGui`) — POS, Anthropic, mạng khác đi thẳng;
 *   · KHOANH THEO VERB: GET/HEAD/OPTIONS luôn qua (đường ĐỌC không bị ghì);
 *   · POST/PUT/PATCH/DELETE khi `vanGuiDangMo()===false` ⇒ ném `LoiCuaGuiDong`, ghi
 *     `congHttpGhi.daChan` (URL che token). `tools.js` bọc `catch {}` nên ném là an toàn.
 * Cài MỘT lần khi nạp module này (worker/handler nào gọi bộ não đều import file này).
 */
export function lapCongHttpGhi() {
  if (congHttpGhi.daLap) return congHttpGhi;
  const mo = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  let trong = mo?.value ?? (mo?.get ? mo.get.call(globalThis) : undefined);
  const cong = async function fetchQuaCongGhi(dauVao, init) {
    // `pancake.js#pkFetchPage` gửi `method: false` cho GET ⇒ falsy = GET (đo ở S4:
    // bản đầu dùng `??` đọc thành "FALSE" và chặn cả đường ĐỌC — đúng cái phiếu cấm).
    const method = String(
      init?.method || (typeof dauVao === "object" && dauVao?.method) || "GET",
    ).toUpperCase();
    let host = "";
    try {
      host = new URL(typeof dauVao === "string" ? dauVao : dauVao?.url ?? String(dauVao)).host;
    } catch {
      host = "";
    }
    const laGhi = !["GET", "HEAD", "OPTIONS"].includes(method);
    if (laGhi && hostThuocVanGui(host) && !vanGuiDangMoTuyetDoi()) {
      const urlChe = String(typeof dauVao === "string" ? dauVao : dauVao?.url ?? "").replace(
        /(access_token|page_access_token|api_key)=[^&]*/g,
        "$1=<che>",
      );
      congHttpGhi.daChan.push(`${method} ${urlChe}`);
      throw new LoiCuaGuiDong(
        `CỔNG HTTP GHI chặn ${method} ${host} — van GỬI đóng (V3_PANCAKE_GUI=${JSON.stringify(
          process.env.V3_PANCAKE_GUI,
        )} · PANCAKE_READONLY=${JSON.stringify(docEnvTuyetDoi("PANCAKE_READONLY"))}). ` +
          `Lượt này phát ra NGOÀI cửa v3 (bộ não cũ) — RF-1.`,
      );
    }
    if (hostThuocVanGui(host)) congHttpGhi.daChoQua += 1;
    if (typeof trong !== "function") throw new TypeError("fetch chưa sẵn sàng");
    return trong(dauVao, init);
  };
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    enumerable: mo?.enumerable ?? true,
    get: () => cong,
    set: (v) => {
      trong = v;
    },
  });
  congHttpGhi.daLap = true;
  return congHttpGhi;
}
lapCongHttpGhi();

/** Không tìm thấy dòng `hoi_thoai` cho tin — bộ NẠP phải tạo TRƯỚC (cua-messenger §2). */
export class LoiThieuHoiThoai extends Error {
  constructor(msg) {
    super(msg);
    this.name = "LoiThieuHoiThoai";
  }
}

/** Lỗi gửi có thể là mất ACK: dừng tự thử lại để tránh gửi trùng. */
export async function guiDaXacNhan(gui) {
  try {
    const r = await gui();
    if (r?.ok !== true) throw new Error("Channel chưa xác nhận gửi thành công");
    return r;
  } catch (e) {
    if (e?.name === "LoiCuaGuiDong") throw e;
    const loi = new Error("Không xác nhận được kết quả gửi; cần kiểm tra trước khi thử lại", { cause: e });
    loi.name = "LoiGuiChuaXacNhan";
    loi.khongThuLai = true;
    throw loi;
  }
}

/** RP1 ② 2 — nghỉ trước lượt thử lại DUY NHẤT của một ảnh bị Pancake từ chối (khuôn v1 `tools.js#sendImageWithRetry`). */
const TRE_THU_LAI_ANH_MS = 1200;

/**
 * RP1 ② 2 · review (a) vòng 2 R2-N1 — lỗi gửi MỘT ảnh có được nuốt (bỏ ảnh, vẫn gửi chữ) không, đọc theo CẤU TRÚC:
 *   · `'tu_choi'`  — Pancake ĐÃ được gọi và trả lời KHÔNG cho ảnh này (`success:false` · `invalid_upload_fb_attachments_result`
 *                    chập chờn — tools.js:100-101) ⇒ thử lại 1;
 *   · `'khong_ro'` — đã gọi mà không biết kết quả (quá hạn / mạng / thân hỏng — `chiTiet.khongRo` của `pancake.js`) ⇒ không thử lại;
 *   · `null`       — mọi lỗi khác ⇒ NÉM như trước RP1: cửa đóng · cổng ghi chặn (`biChan`) · định tuyến team · lỗi không HTTP
 *                    («thiếu url ảnh», hết token ⇒ thân rỗng) · đụng UNIQUE sổ gửi · cửa tiêm trần không qua `bocCuaGuiBen` ·
 *                    LỖI QUYỀN cấp page (mã 103/105/121 trong `chiTiet.ma` — `pkFetchPage` đã xoay hết token; chữ gửi sau cũng
 *                    hỏng, nuốt ở ảnh chỉ thêm một lượt thử vô ích và để lỗi không-HTTP phía sau che mất lỗi kênh GL4 phải đếm —
 *                    đo: ca GL4 P3d đỏ khi nuốt cả lỗi quyền, nhật ký RP1).
 * Dấu `cause.kenh === true` do `queue/lan-gui.js#bocCuaGuiBen` gắn khi cửa ĐÃ gọi Pancake cho tin/ảnh (`daGoi` && !`biChan`) —
 * cùng dấu GL4 dùng để đếm lỗi kênh: lỗi KHÔNG nuốt ở đây vẫn đi đúng đường đếm cũ.
 */
const MA_LOI_QUYEN = new Set([103, 105, 121]);   // cùng tập `pancake.js#PERM_ERRS` (không export) — đổi ở đó thì đổi ở đây
function loaiLoiAnh(e) {
  const c = e?.name === "LoiGuiChuaXacNhan" ? e.cause : null;
  if (c?.name !== "LoiCanDoiChieuGui" || c.kenh !== true || c.loai !== "guiAnh") return null;
  if ((Array.isArray(c.chiTiet?.ma) ? c.chiTiet.ma : []).some((m) => MA_LOI_QUYEN.has(Number(m)))) return null;
  return c.chiTiet?.khongRo === true ? "khong_ro" : "tu_choi";
}

export const KET_QUA = Object.freeze({
  XONG: "xong",
  CHAN_GUARD: "chan_guard",
  LOI: "loi",
  // Page (Botcake/sale/POS) đã trả lời trong lúc tin nằm hàng đợi ⇒ worker nhường,
  // KHÔNG gọi model. Tách riêng khỏi XONG để số đo phân biệt được "bot đã trả lời"
  // với "khỏi cần bot trả lời" — hai thứ đó nói hai điều khác hẳn nhau về page.
  NHUONG_PAGE: "nhuong_page",
});

// ── LƯỢT CHỐT ĐƠN KHÔNG TRẢ BẰNG MẪU CỨNG ────────────────────────────────────────────
// Đo 23/09 trên 84 lượt khách thật của page 1220547807799752: 33 lượt do lớp 0 đồng trả.
// 28 trong số đó ĐÚNG CHỖ — hỏi giá (19), chào (5), thời gian giao (4): câu trả lời cố
// định, hỏi hai mươi lần đáp y hệt nhau, trả bằng mẫu là khôn.
//
// Bốn lượt còn lại là `muon_dat` + `tpl_howto` — khách vừa gõ "Place an order". Đó là
// KHOẢNH KHẮC CHỐT, và mẫu cứng làm hỏng nó theo ba cách đo được:
//
//   · KHÔNG GỌI ĐƯỢC TÊN KHÁCH. 0/33 lượt mẫu có tên khách, model 7/32 = 22%. Hệ không
//     có cơ chế thay biến trong mẫu (grep `{ten}`/`{name}`: 0 dòng) — chuỗi sao gửi vậy.
//   · BỎ QUA CÂU HỎI SỐ LƯỢNG. Mẫu nhảy thẳng sang xin tên/SĐT/địa chỉ; thu đủ ba thứ đó
//     rồi `missingSteps` VẪN còn "chọn gói/số lượng" ⇒ chưa tạo được đơn, phải hỏi thêm
//     một lượt. Bot của Pancake ở cùng lượt đó hỏi "1 set or 2 sets?" TRƯỚC.
//   · một chuỗi cho mọi tình huống, không bám được ngữ cảnh.
//
// Giá của việc nhường: 4 lượt × ~87đ ≈ 350đ trên 84 lượt (+7% mẻ đo). Tiết kiệm token ở
// câu hỏi giá là khôn; tiết kiệm ở câu chốt đơn là tiếc 87 đồng để mất một đơn 109 SAR.
//
// ⚠️ CHẶN Ở ĐÂY, KHÔNG SỬA `fast-lane.js` — tệp đó thuộc nhóm CẤM SỬA (luật 4 §0a). Lane
// vẫn khớp như cũ, chỉ không được quyền trả lời; nhờ vậy bộ đếm lane và mọi bộ ca của
// `fast-lane` giữ nguyên hành vi.
//
// BA CỬA CÙNG TRẢ `kb.config.fastLaneHowto` — đo bằng grep, không bằng trí nhớ:
//   lop-tu-khoa.js:287 → rule `muon_dat`   ("Place an order")          ← nhường
//   fast-lane.js:411   → lane `tpl_howto`  (ASK_HOWTO)                 ← nhường
//   lop-tu-khoa.js:256 → rule `paano_gap`  ("paano mag order")         ← CỐ Ý GIỮ MẪU
//
// `paano_gap` KHÔNG nằm trong mặc định dù nó là cùng một khoảnh khắc. Lý do: phiếu L2-M2
// đã nghiệm thu và `test/l2-m2-handler.test.js:174` chốt rằng câu đó phải trả 0 token.
// Đổi hành vi đã ký thì phải đi lối `doi-y-do` (đo tác động, người quyết gõ «áp»), không
// phải lặng lẽ sửa thước của phiếu người khác. Muốn nhường nốt thì:
//     V3_LAN_CHOT_MODEL=muon_dat,paano_gap,tpl_howto
// và sửa ca L2-M2 cho khớp — một việc CÓ CHỦ ĐÍCH, không phải hệ quả phụ.
//
// Tắt hẳn bằng `V3_LAN_CHOT_MODEL=` (rỗng).
// NGÔN NGỮ (28/09): câu mẫu lệch ngôn ngữ với khách thì NHƯỜNG cho model — cùng cửa nhường
// với hai luật trên. Lý do và luật đoán ở `ngon-ngu.js` đầu tệp.
const LAN_CHOT_MAC_DINH = "muon_dat,tpl_howto";
export function lanChotNhuongModel() {
  const v = docEnvTuyetDoi("V3_LAN_CHOT_MODEL");
  return new Set(String(v == null ? LAN_CHOT_MAC_DINH : v)
    .split(",").map((x) => x.trim()).filter(Boolean));
}
const laLanChot = (ten) => !!ten && lanChotNhuongModel().has(String(ten));

// LANE GIAO HÀNG — nhường theo NỘI DUNG CÂU KHÁCH, không theo tên lane.
//
// Khác `laLanChot` (nhường cả lane): mẫu giao hàng vẫn đúng cho câu hỏi «bao lâu / bao
// nhiêu tiền», và đó là phần lớn. Chỉ nhường khi câu khách vượt quá thứ mẫu trả lời được —
// nêu ĐỊA ĐIỂM, hoặc nói về ĐƠN ĐÃ CÓ. Xem `shipVuotMau` trong context.js để biết vì sao.
//
// Đo 25/09 trên 140 lượt khách thật: 2 lượt rơi vào mẫu giao hàng, 1 trong 2 vượt mẫu
// ("The delivery was scheduled for today") — tức luật này gần như không thêm tiền, chỉ
// đổi đúng những lượt mẫu đang trả lời trật đề.
const LANE_SHIP = new Set(["tpl_ship", "hoi_ship"]);
const shipNhuongModel = (lane, text) => LANE_SHIP.has(String(lane)) && shipVuotMau(text);

function depsMacDinh(deps = {}) {
  return {
    // L2-M3 ②.1: mặc định nay là rap-prompt.js (ráp 4 khối từ DB, cờ V3_RAP_PROMPT_BAT
    // vắng = tự lùi về kb.js cũ bên trong rapKb — xem rap-prompt.js đầu file). Chữ ký đổi
    // từ layKb(pageId) đồng bộ sang layKb(pool, {teamId, pageIdText}) bất đồng bộ; các
    // bản override cũ trong test/ops đều dạng `() => kb` (bỏ qua tham số) nên KHÔNG vỡ —
    // đo lại: `grep -rn "layKb:" test/ ops/` chỉ ra toàn bộ là `() => kb`.
    layKb: deps.layKb || rapKbMacDinh,
    layModel: deps.layModel || layModelMacDinh,
    phanLoai: deps.phanLoai || classify,
    lanNhanh: deps.lanNhanh || fastLane,
    chayCloser: deps.chayCloser || runCloser,
    kiemTinRa: deps.kiemTinRa || guardOutbound,
    // BẬC SỬA TẠI CHỖ của cửa ra. Hai hàm THUẦN, KHÔNG gọi model, 0 token — xem
    // `quaCuaRa` trong `xuLyMotTin` để biết vì sao v3 thiếu bậc này là đốt tiền.
    suaDuocTaiCho: deps.suaDuocTaiCho || canFixLocally,
    suaTaiCho: deps.suaTaiCho || localFix,
    // L2-M3 ②.2: ngân sách lượt theo độ nóng, thay trần 4 lượt cứng.
    chamTheoLichSu: deps.chamTheoLichSu || chamTheoLichSuMacDinh,
    conNganSach: deps.conNganSach || conNganSachMacDinh,
    cua: {
      guiTin: deps.cua?.guiTin || cuaGuiTin,
      guiAnh: deps.cua?.guiAnh || cuaGuiAnh,
      ghiNote: deps.cua?.ghiNote || cuaGhiNote,
      gatThe: deps.cua?.gatThe || cuaGatThe,
    },
    depsPancake: deps.depsPancake || {},
    // L3-M4 ②.1: hàng chờ tạo đơn (bước 11b). Tiêm qua deps như mọi cửa ngoài khác —
    // bộ ca đếm được «vào hàng chờ mấy lượt» mà không cần dựng cả bảng.
    vaoHangCho: deps.vaoHangCho || vaoHangChoMacDinh,
    // L2-M2 · lớp 0 đồng: đếm mỗi lượt lớp từ-khoá trả lời THAY model. Không đếm ở đây thì
    // không đếm được ở đâu — lượt 0 đồng KHÔNG gọi model nên KHÔNG đẻ dòng `so_ai` nào, và
    // tiêu chí «lớp 0 đồng chặn ≥33% lưu lượng» (07-KE-HOACH-GD2 sóng 2) mãi không đo được.
    demChan0Dong: deps.demChan0Dong || ghiNhanChan0DongMacDinh,
    depsHangCho: deps.depsHangCho || {},
    lichSu: Array.isArray(deps.lichSu) ? deps.lichSu : [],
    bayGio: deps.bayGio || (() => Date.now()),
  };
}

/**
 * Xử lý ĐÚNG MỘT tin của hàng đợi. Không tự đọc/ghi bảng `tin_cho_xu_ly` — worker làm
 * việc đó (nó là chủ giao dịch + chủ khoá hội thoại).
 *
 * @param {import('pg').Pool|import('pg').PoolClient} pool
 * @param {object} tin  một dòng `tin_cho_xu_ly`
 * @returns {Promise<{ketQua: string, lyDo: string, dem: object}>}
 */
export async function xuLyMotTin(pool, tin, deps = {}) {
  // Mốc đầu lượt — dùng cho `tre_luot_ms` trong sổ AI. Đặt ở dòng đầu để nó bao trọn cả
  // phần đọc lịch sử và nạp hồ sơ, không chỉ phần gọi model: khách đo bằng thời gian CHỜ.
  const mocLuot = Date.now();
  const d = depsMacDinh(deps);
  const ctx = ctxHeThong();
  const teamId = tin.team_id;
  const bayGio = d.bayGio();
  const dem = {
    guiTin: 0,
    guiAnh: 0,
    ghiNote: 0,
    gatThe: 0,
    goiModel: 0,
    soAi: {},
  };
  // `kb` (khai ở bước 2, dưới đây) được closure này đọc TRỄ — mọi lượt gọi `ghi(...)`
  // thật sự chạy đều SAU khi `kb` đã gán, dù `ghi` khai TRƯỚC nó trong văn bản (thứ tự
  // hàm ≠ thứ tự thực thi trong JS). L2-M3 ②.3: đóng dấu cờ page trọng điểm + khối rỗng
  // vào MỌI dòng so_ai của lượt này (mù-có-nói-ra, không im — cùng khuôn án lệ #7).
  let traceState;
  const ghi = async (loai, phan) => {
    const { duLieu, ...con } = phan || {};
    const r = await ghiSoAi(pool, {
      teamId,
      tinId: tin.id,
      loai,
      pageId: tin.page_id,
      psid: tin.psid,
      ...con,
      duLieu: {
        ...(duLieu || {}),
        ...(traceState?.promptVersion ? { prompt_version: traceState.promptVersion,
          provider: traceState.providerUsed, llm_ms: traceState.lastUsage?.ms || 0,
          tools: traceState.toolTrace || [] } : {}),
        trong_diem: kb.trongDiem === true,
        ...(kb.nguon_thieu?.length ? { kb_nguon_thieu: kb.nguon_thieu } : {}),
      },
    });
    if (r.ghi) dem.soAi[loai] = (dem.soAi[loai] || 0) + 1;
    return r;
  };

  // ── CỬA RA · THANG HAI BẬC (M09) ─────────────────────────────────────────────────
  // `guardOutbound` trả HAI loại phán quyết khác hẳn nhau: `block` (cấm hẳn — bịa doạ
  // khách, lọt tiếng Việt, ký tự vô hình) và `rewrite` (câu SAI HÌNH THỨC, sửa xong là
  // gửi được). Bản trước gộp cả hai vào một dòng `if (!v.ok) guarded = ""` ⇒ mọi lượt
  // `rewrite` đều bị vứt trắng.
  //
  // v3 KHÔNG xin model viết lại (một lượt = một lượt model — thang bậc 3 của v1
  // `src/handler.js:467-475` cố tình không mang sang). Nhưng bậc 2 — `localFix` — là
  // hàm THUẦN, không chạm mạng, KHÔNG TỐN MỘT TOKEN NÀO. Bỏ nó đi là trả tiền cho một
  // câu rồi đem vứt.
  //
  // ĐO 21/09/2026, phát lại 48 tin thật của page 1220547807799752: 5 lượt chết ở cửa ra
  // = 498đ trên tổng 1.735đ (28,7% tiền của cả lần chạy), trong đó 3 lượt là CHECKLIST —
  // `collapseChecklist` gộp được, 0 đồng. Chạy lại sau bản vá (14 tin, 22/09): 2 lượt
  // CHECKLIST được cứu và GỬI ĐI, 0 lượt `khong_gui` còn lại.
  //
  // Trả `{ text, v, daSua }`: `text` rỗng ⇒ KHÔNG gửi được, `v` là phán quyết cuối cùng
  // (để ghi sổ đúng luật đã chặn), `daSua` là mã luật đã sửa tại chỗ (rỗng nếu không sửa).
  const quaCuaRa = (text, ctxGuard) => {
    const v = d.kiemTinRa(text, ctxGuard);
    if (v.ok) return { text, v, daSua: "" };
    // BH9 ② 6: luật mới KHÔNG sửa tại chỗ (không trong FIXABLE) — nói thẳng ở đây, đừng trông vào nội dung tập FIXABLE.
    if (LUAT_BH9.has(v.rule)) return { text: "", v, daSua: "" };
    if (v.action === "block" || !d.suaDuocTaiCho(v.rule)) return { text: "", v, daSua: "" };
    const sua = d.suaTaiCho(text, v.rule);
    if (!sua) return { text: "", v, daSua: "" };
    // Chỉ nhận bản sửa khi nó QUA ĐƯỢC chính cửa đó lần nữa — cắt xong vẫn phạm thì thà
    // im (cùng khuôn v1 handler.js:457-464).
    const v2 = d.kiemTinRa(sua, ctxGuard);
    if (!v2.ok) return { text: "", v: v2, daSua: "" };
    return { text: sua, v: v2, daSua: v.rule };
  };

  // KHÁCH NHẮN MÀ KHÔNG NHẬN ĐƯỢC CHỮ NÀO thì SALE PHẢI BIẾT. Trước bản này, cửa ra chặn
  // xong là lượt kết thúc im lặng: không thẻ, không ghi chú, không ai hay. `ngan_sach_het`
  // có bàn giao, `guard_noi_dung` thì không — cùng một cảnh khách bị bỏ rơi.
  const banGiaoViCuaRa = async (rule, maModel, lane, dung) => {
    state.handoff = true;
    state.handoffReason = `cửa ra chặn: ${rule}`;
    if (!state.handoffNotified) await banGiaoSale(state.handoffReason);
    await ghi(LOAI.HANDOFF, { maModel, lane, lyDo: state.handoffReason, ...(dung ? { dung } : {}) });
  };

  // ── 1 · HỘI THOẠI ────────────────────────────────────────────────────────────────
  const hoiThoai = await docHoiThoaiTheoPageText(pool, {
    teamId,
    pageIdText: tin.page_id,
    psid: tin.psid,
  });
  if (!hoiThoai) {
    throw new LoiThieuHoiThoai(
      `Không có dòng hoi_thoai cho page_id=${tin.page_id} · psid=${tin.psid} (team ${teamId}). ` +
        `Bộ NẠP phải tạo TRƯỚC khi xếp tin — xem docs/v3/ban-giao/cua-messenger-v1.md §2.`,
    );
  }

  // MỘT BẢN (CR-02-10 · MB2): công tắc duy nhất là `page.bot_ai_bat` — tắt giữa chừng thì tin đang xếp dừng.
  if (hoiThoai.bot_ai_bat !== true || !aiDuocTraLoi(hoiThoai) || (tin.nguon && hoiThoai.nguon_tin !== tin.nguon)) {
    return { ketQua: KET_QUA.CHAN_GUARD, lyDo: "hoi_thoai_khong_thuoc_ai", dem };
  }
  const assertCanAct = async () => {
    const moi = await docHoiThoaiTheoPageText(pool, {
      teamId, pageIdText: tin.page_id, psid: tin.psid,
    });
    if (moi?.bot_ai_bat !== true || moi?.phien_ban !== hoiThoai.phien_ban || !aiDuocTraLoi(moi) || (tin.nguon && moi.nguon_tin !== tin.nguon)) {
      const e = new Error("Hội thoại đã chuyển khỏi AI");
      e.name = "LoiQuyenHoiThoai";
      throw e;
    }
  };

  // ── 2 · KB + MODEL ───────────────────────────────────────────────────────────────
  const kb = (await d.layKb(pool, { teamId, pageIdText: tin.page_id })) || {};
  let model; // Chỉ resolve model khi thật sự cần gọi LLM.

  // ── 3 · STATE + HỒ SƠ ────────────────────────────────────────────────────────────
  const state = dungState({ tin, hoiThoai, bayGio });
  traceState = state;
  const prof =
    hoiThoai.ho_so && Object.keys(hoiThoai.ho_so).length
      ? { ...emptyProfile(), ...hoiThoai.ho_so }
      : emptyProfile();
  const text = String(tin.noi_dung || "");
  const history = historyBeforeMessage(d.lichSu, tin);
  if (!prof.hydratedAt && history.length) hydrateProfile(history, tin.page_id, prof);
  // BH9 ② 9b: truyền câu bot vừa nói — «yes» đáp câu bot HỎI COD là đồng ý COD.
  extractFromText(text, prof, { lastAi: state.lastAiText });
  // BH9 ② 2c: «đơn đang trong cuộc» bóc từ lịch sử page MỌI lượt (cùng một luật với `cleanHistory`), để cổng sau bán 4a thấy
  // `donDaCo` TRƯỚC mọi cửa 0 đồng — trước BH9 tin page chỉ được dò ở bước 7 (dựng ngữ cảnh), sau lớp từ khoá/Fast Lane.
  bocDonTuLichSu(history, tin.page_id, prof);
  // BH9 ② 9c: COD NGẦM (người quyết 15/10) — khách gửi SĐT/địa chỉ sau khi bot/page đã nêu điều kiện COD ⇒ không hỏi lại COD.
  if (codNgam({ prof, text, msgs: history, pageId: tin.page_id, lastAi: state.lastAiText })) {
    prof.cod = true;
    prof.codNgam = true;
  }
  // BH9 ② 7: dấu hiệu y tế của TIN LƯỢT NÀY — lớp 0 đồng nhường model, cửa ra bật luật Y_TE, lượt luôn bàn giao.
  const yTe = dauHieuYTe(text);

  // ── 3b · M11 v3 · CHẤM ĐIỂM LEAD (L2-M3 ②.2) ─────────────────────────────────────
  // SỚM — TRƯỚC lớp từ-khoá/Fast Lane (bước 4b/5), đúng vị trí `updateLead` của
  // handler.js cũ (dòng 223-225: "Chấm trước Fast Lane để chuỗi tin cụt vẫn bị trừ điểm
  // đúng như spec"). `lead` được `luuLai` bên dưới đóng gói vào patch qua closure —
  // MỌI đường thoát của hàm này (kể cả kb.noData/lớp từ khoá/Fast Lane/spam/complaint)
  // đều ghi lại điểm mới, không chỉ nhánh gọi model.
  const prevLead =
    hoiThoai.diem_lead && Object.keys(hoiThoai.diem_lead).length
      ? hoiThoai.diem_lead
      : {};
  // RP2 ② 2: chấm cụm CỘNG tin KHÁCH của lịch sử kể từ mốc chấm trước (cả câu Botcake đã trả lời — câu đó không bao giờ thành cụm
  // của một lượt bot), MỘT lần `scoreTurn`, mốc gắn lại vào `lead.moc` (`ngan-sach-luot.js#chamTheoLichSu`). Lịch sử rỗng ⇒ như cũ.
  const { lead, budget } = d.chamTheoLichSu(text, prevLead, { lichSu: d.lichSu, tin });

  // Tham số cửa dùng lại nguyên bộ cho mọi lượt gửi — `convId` để gọi API, `psid` để
  // cửa tra quyền sở hữu (hai giá trị KHÁC NHAU, xem cua-messenger-v1.md §2).
  const diaChi = {
    pageId: String(tin.page_id),
    psid: String(tin.psid),
    convId: String(tin.conv_id),
    custId: String(tin.cust_id || ""),
  };

  const luuLai = async ({ daGoiModel, daGuiText, textDaGui }) => {
    await assertCanAct();
    const patch = ganTuState({
      hoiThoai,
      state,
      prof,
      daGoiModel,
      daGuiText,
      textDaGui,
      bayGio,
    });
    // L2-M3 ②.2: điểm lead của LƯỢT NÀY (đóng qua closure từ bước 3b) — ghi lại ở MỌI
    // đường thoát, kể cả lượt bị lớp từ khoá/Fast Lane trả lời trọn (điểm vẫn phải cộng
    // dồn đúng cho lượt sau, xem ghi chú "3b" phía trên).
    patch.diem_lead = lead;
    patch.diem_nong = Number(lead.score || 0);
    // ⚠️ KHÔNG dùng `suaTheoId` của tầng truy vấn — nó không nhận `ctxHeThong()`, và
    // 100% dữ liệu di trú đậu ở team KỸ THUẬT nên ctx người dùng bị từ chối (nợ N3 của
    // L1-M1, §9 sổ điều hành). Đi qua cửa hẹp `src/chat/kho.js` — cùng khuôn src/pos/kho.js.
    const saved = await suaHoiThoai(pool, {
      teamId, id: hoiThoai.id, giaTri: patch,
      neu: { chu_so_huu: hoiThoai.chu_so_huu, trang_thai: hoiThoai.trang_thai, xmin: hoiThoai.phien_ban },
    });
    if (!saved) {
      const e = new Error("Quyền hoặc trạng thái hội thoại đã thay đổi; bỏ snapshot cũ");
      e.name = "LoiQuyenHoiThoai";
      throw e;
    }
  };

  // Gửi tin chữ QUA CỬA. `LoiCuaGuiDong` KHÔNG bắt ở đây — nó nổi lên tới đáy hàm để
  // worker đặt tin sang `chan_guard` (một chỗ quyết định, án lệ #31 "cửa RA đúng một cái").
  const guiChu = async (noiDung) => {
    await assertCanAct();
    const r = await guiDaXacNhan(() => d.cua.guiTin(
      pool,
      ctx,
      { ...diaChi, text: noiDung },
      d.depsPancake,
    ));
    dem.guiTin += 1;
    return r;
  };

  // Xả hàng đợi ảnh QUA CỬA — KHÔNG dùng `flushPendingImages` của tools.js (nó gọi thẳng
  // pkSendImage/sendImage, tức là chính đường mà phiếu này đi bịt). Ảnh đi TRƯỚC tin chữ,
  // đúng nguyên tắc #2 của bản cũ ("khách không bao giờ nhận ảnh trơ").
  //
  // RP1 ② 2 — ẢNH HỎNG KHÔNG CHẶN CHỮ. Trước RP1 mọi ảnh hỏng ném cả lượt: ảnh 2 bị Pancake từ chối (`invalid_upload_fb_
  // attachments_result`, chập chờn — tools.js:100-101) ⇒ 0 POST chữ, khách nhận ảnh trơ, hội thoại sang sale, GL4 đếm 1.
  // Nay nuốt lỗi của MỘT ảnh, phân loại theo CẤU TRÚC lỗi cửa gửi đã gắn (`loaiLoiAnh`), không dò chuỗi. Ảnh bị bỏ ⇒ chữ vẫn
  // đi; caption dời sang tấm gửi được đầu tiên; không tấm nào được ⇒ BỎ caption (như v1 — chữ đã qua cửa ra + đã ghi sổ, không
  // ghép thêm). Số ảnh hỏng vào sổ AI dòng `image` (`duLieuAnh`). GL4: lượt gửi được chữ ⇒ worker xoá chuỗi (README:95).
  //
  // RP1 vòng 2 (đối kháng F6) — CAPTION QUA CÙNG CỬA RA VỚI CHỮ. Caption tới khách y như chữ (model tự viết qua send_product_image,
  // hoặc câu móc của fast-lane) nhưng trước đây không qua `quaCuaRa` ⇒ chữ bị giết vì giá bịa mà caption giá bịa vẫn đi. Nay caption
  // qua `quaCuaRa` với CÙNG ngữ cảnh lượt chữ (sửa tại chỗ được thì gửi bản sửa). Caption bị chặn ⇒ bỏ caption; ảnh vẫn đi KHÔNG
  // caption khi còn chữ đi kèm (`coChu`). Caption bị chặn VÀ chữ cũng không đi (cửa ra giết / model câm) ⇒ KHÔNG gửi tấm nào — theo
  // luật v1 «ảnh không bao giờ gửi trơ»: v1 vẫn xả ảnh khi chữ rỗng vì «caption đã đi kèm ảnh nên khách vẫn có lời» (`pancake-poll.js`
  // trước MB4); caption sạch thì giữ đúng hành vi đó, caption bị chặn thì không còn lời nào đi kèm — và khách không nhận được gì nên
  // bàn giao sale (cùng luật chữ bị cửa ra giết — /code-review vòng 2 #1). KHÔNG đổi: model không truyền caption mà chữ không đi ⇒ ảnh
  // vẫn đi trơ như trước (v1 cũng vậy — nợ N-RP1-ANH-TRON-KHONG-CAPTION). Sổ ảnh: `caption_bi_chan` (luật) + `anh_hong_loai` «bo_cua_ra».
  const anhHong = [];
  let captionChan = "";
  const xaAnh = async (coChu = true) => {
    const hang = state.pendingImages || [];
    if (!hang.length) return 0;
    state.pendingImages = [];
    let caption = String(state.pendingCaption || "").trim();
    state.pendingCaption = "";
    if (caption) {
      const cua = quaCuaRa(caption, { kb, pageId: state.pageId, custName: state.custName, lastAiText: state.lastAiText,
        orderCreated: !!state.orderResult?.pos_created, isOrderSummary: !!state.orderCreatedThisTurn,
        // BH9 ② 5 [S7]: bốn luật mới chỉ cho chữ MODEL — caption Fast Lane (lượt 0 model) không bật.
        ...ctxBH9() });
      caption = cua.text;
      if (!caption) {
        captionChan = cua.v.rule || "?";
        // BH9: caption của MODEL phạm luật mới (chào giá với khách có đơn / khách báo y tế…) ⇒ KHÔNG gửi tấm nào (ảnh bán hàng
        // cũng là chào hàng) + bàn giao. Chữ model (đã qua cửa riêng) vẫn đi — mỗi lượt một tin.
        if (LUAT_BH9.has(captionChan)) {
          anhHong.push(...hang.map(() => "bo_cau_co_dinh"));
          if (!state.handoff) { state.handoff = true; state.handoffReason = `cửa ra chặn: ${captionChan}`; }
          return 0;
        }
        if (!coChu) {
          anhHong.push(...hang.map(() => "bo_cua_ra"));
          if (!state.handoff) { state.handoff = true; state.handoffReason = `cửa ra chặn: ${captionChan}`; }
          return 0;
        }
      }
    }
    let gui = 0;
    for (const [i, im] of hang.entries()) {
      const kq = await guiMotAnh(im.url, caption);
      // Bị từ chối dứt khoát ⇒ tấm đó chắc chắn chưa tới ⇒ caption dời sang tấm gửi được kế tiếp.
      if (kq === "tu_choi") continue;
      if (kq === "khong_ro") {
        // KHÔNG RÕ (quá hạn / mạng) ⇒ kênh đang chập và tấm đó CÓ THỂ đã tới khách kèm caption (/code-review #3 #4): bỏ luôn các tấm
        // còn lại — mỗi tấm sẽ lại chờ trọn hạn gửi trong giao dịch tin đang mở, và dời caption sang tấm sau là lặp lời dẫn — rồi đi chữ.
        for (let k = i + 1; k < hang.length; k += 1) anhHong.push("bo_sau_khong_ro");
        break;
      }
      state.sentImages.add(im.url);
      const cat = String(im.cat || "sản phẩm");
      if (!prof.imagesSent.includes(cat)) prof.imagesSent.push(cat);
      dem.guiAnh += 1;
      gui += 1;
      caption = ""; // lời dẫn chỉ kèm tấm ĐẦU — lặp dưới mỗi tấm trông như spam
    }
    return gui;
  };
  // Một ảnh: `'ok'` = tới khách · `'tu_choi'` / `'khong_ro'` = đã bỏ (ghi `anhHong`) · NÉM = lỗi không phải của kênh (như trước RP1).
  // Bị từ chối dứt khoát ⇒ thử lại ĐÚNG 1 lần sau `TRE_THU_LAI_ANH_MS` (khuôn v1 `tools.js#sendImageWithRetry`: IMG_RETRY=1,
  // nghỉ 1200 ms); KHÔNG RÕ (quá hạn / mạng — có thể đã tới khách) ⇒ không thử lại (luật GL3: không gửi đúp).
  const guiMotAnh = async (url, caption) => {
    for (let lan = 0; ; lan += 1) {
      await assertCanAct();
      try {
        await guiDaXacNhan(() => d.cua.guiAnh(
          pool,
          ctx,
          { ...diaChi, url, caption },
          d.depsPancake,
        ));
        return "ok";
      } catch (e) {
        const loai = loaiLoiAnh(e);
        if (!loai) throw e;
        if (loai === "tu_choi" && lan === 0) {
          await new Promise((r) => setTimeout(r, TRE_THU_LAI_ANH_MS));
          continue;
        }
        anhHong.push(loai);
        return loai;
      }
    }
  };
  // Phần `du_lieu` của dòng sổ `image`: số ảnh tới khách + số ảnh đã bỏ (chỉ khi có — dòng cũ giữ đúng hình `{n}`).
  const duLieuAnh = (n) => ({ n, ...(anhHong.length ? { anh_hong: anhHong.length, anh_hong_loai: [...anhHong] } : {}),
    ...(captionChan ? { caption_bi_chan: captionChan } : {}) });

  // Bàn giao sale QUA CỬA: thẻ + ghi chú. Xem khối đầu file về ghi chú TRÙNG ở VPS.
  const banGiaoSale = async (lyDo) => {
    if (config.pkTags.handoff) {
      await guiDaXacNhan(() => d.cua.gatThe(
        pool,
        ctx,
        { ...diaChi, name: config.pkTags.handoff, on: true },
        d.depsPancake,
      ));
      dem.gatThe += 1;
    }
    await guiDaXacNhan(() => d.cua.ghiNote(
      pool,
      ctx,
      {
        pageId: diaChi.pageId,
        custId: diaChi.custId,
        message: `🙋 AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ\nLý do: ${lyDo || "không rõ"}`,
      },
      d.depsPancake,
    ));
    dem.ghiNote += 1;
  };

  // ── BH9 · CÂU CỐ ĐỊNH + BÀN GIAO (người quyết 15/10: khi bot KHÔNG được tự trả lời) ─────────────────────────────────────────
  // Ngữ cảnh bốn luật cửa ra mới — [S7] `luatBH9` CHỈ khi lượt đã gọi model (chữ model / caption model); lớp từ khoá + Fast Lane
  // (0 model) giữ phán quyết y hệt base.
  const ctxBH9 = () => ({ luatBH9: dem.goiModel > 0, donDaCo: !!prof.donDaCo, daBanGiao: !!state.handoff, dauHieuYTe: yTe });
  const cauCoDinh = (bo) => (doanNgonNgu(text) === "ar" ? bo.ar : bo.en);
  // [S5] Ảnh model đã xếp cho câu bị thay KHÔNG được đi: BỎ HÀNG (không dùng `xaAnh(false)` — hàm đó chỉ bỏ ảnh khi CAPTION bị chặn;
  // ảnh không caption / caption sạch vẫn đi). Số tấm bỏ vào dòng sổ `image` (`anh_hong_loai: bo_cau_co_dinh`).
  const boHangAnh = () => {
    for (const _ of state.pendingImages || []) anhHong.push("bo_cau_co_dinh");
    state.pendingImages = [];
    state.pendingCaption = "";
  };
  // Gửi MỘT câu cố định qua cửa (không qua model). `state.handoff` đặt NGAY SAU khi `guiChu` thành công, TRƯỚC `banGiaoSale`: lỗi ở
  // `banGiaoSale` vẫn lưu HANDOFF qua `luuLai` của nhánh `catch` (đúng mục đích phiếu ② 1). LỆCH CHỮ phiếu («đặt TRƯỚC guiChu») có chủ
  // ý — /code-review BH9 #4: van GỬI đóng ⇒ `guiChu` ném `LoiCuaGuiDong` TRƯỚC khi gửi được gì; đặt trước thì nhánh catch vẫn ghi
  // HANDOFF/SALE cho hội thoại mà KHÔNG câu nào tới khách và KHÔNG thẻ/ghi chú nào tới sale (mất ACK ⇒ worker `banGiaoLoi` lo).
  // Dòng sổ `reply` lane `cau_co_dinh` KHÔNG mang `dung` ([S6]); `text` không cắt — câu cố định là hằng < 200 ký tự (ca GK).
  const guiCauCoDinh = async ({ cau, lyDo, ma }) => {
    boHangAnh();
    await guiChu(cau);
    state.handoff = true;
    state.handoffReason = lyDo;
    await ghi(LOAI.REPLY, {
      maModel: KHONG_GOI_MODEL, lane: "cau_co_dinh", trangThai: hoiThoai.trang_thai, lyDo,
      duLieu: { text: cau, cau_co_dinh: ma },
    });
    state.lastAiText = cau;
  };

  try {
    // ── 4 · PAGE CHƯA CÓ KB → bàn giao, không bịa ────────────────────────────────
    if (kb.noData) {
      state.handoff = true;
      state.handoffReason = "page_no_kb";
      await banGiaoSale("Page chưa có kịch bản/KB — AI không thể tư vấn");
      await ghi(LOAI.HANDOFF, {
        maModel: KHONG_GOI_MODEL,
        lyDo: "page_no_kb",
        duLieu: { nguon: "kb.noData" },
      });
      await luuLai({ daGoiModel: false, daGuiText: false });
      return { ketQua: KET_QUA.XONG, lyDo: "page_no_kb", dem };
    }

    // ── 4a · CỔNG SAU BÁN (BH9 ② 3 — 0 token) ───────────────────────────────────────────────────────────
    // Khách đã mua mà hỏi giờ giao / báo đã nhận / báo huỷ: bot KHÔNG có dữ liệu đơn (`tools.js` không có tool tra đơn), nên mọi
    // câu trả lời là đoán — giả lập 09/10: «no active order was placed under your name yet» · «Your order is on its way» · «6 PM
    // delivery noted» · chào gói lại. Đứng TRƯỚC lớp từ khoá/Fast Lane: mẫu giao hàng cũng là đoán. Y tế thì để model khuyên trước
    // (cửa ra Y_TE canh) — lượt y tế luôn bàn giao.
    const sauBan = laCauSauBan(text, prof);
    if (sauBan.la && !yTe) {
      const don = prof.donDaCo;
      const lyDo = `SAU BÁN · khách: «${catChu(text.replace(/\s+/g, " ").trim(), 120)}» · đơn: `
        + (don ? `${don.trangThai} (${don.nguon})` : `${sauBan.lyDo} (bot)`);
      await guiCauCoDinh({ cau: cauCoDinh(CAU_NHAN_BAN_GIAO), lyDo, ma: "sau_ban" });
      if (!state.handoffNotified) await banGiaoSale(lyDo);
      await ghi(LOAI.HANDOFF, { maModel: KHONG_GOI_MODEL, lane: "cau_co_dinh", lyDo, duLieu: { nguon: "sau_ban" } });
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: state.lastAiText });
      return { ketQua: KET_QUA.XONG, lyDo: "sau_ban", dem };
    }

    // ── 4b · LỚP TỪ-KHOÁ v3 — 2 luật Botcake chưa phủ + vá `paano mag order` (L2-M2) ──
    // Đứng TRƯỚC Fast Lane/classify (đề bài ① phiếu L2-M2). `lopTuKhoa` là hàm THUẦN,
    // không đọc DB — xem src/chat/lop-tu-khoa.js đầu file để biết vì sao NHƯỜNG (không
    // bịa) khi KB trang chưa có `fastLaneAuth`/`fastLaneSize`. Cùng cửa `d.kiemTinRa`
    // (M09) với Fast Lane/AI — câu trả lời của lớp này KHÔNG được miễn kiểm nội dung.
    const tkTho = lopTuKhoa({ text, kb, profile: prof });
    // Lượt chốt ⇒ coi như lớp từ khoá KHÔNG nhận, tin đi tiếp xuống Fast Lane rồi model.
    // BH9 ② 7 [S9]: khách báo y tế ⇒ NHƯỜNG model (câu mẫu giá với người chảy máu = 0 lời khuyên, 0 bàn giao).
    const tk = yTe
      ? { handled: false, rule: tkTho.rule, reply: "", lyDo: "nhuong_model:y_te" }
      : (laLanChot(tkTho.rule) || shipNhuongModel(tkTho.rule, text))
      ? { handled: false, rule: tkTho.rule, reply: "", lyDo: `nhuong_model:${tkTho.rule}` }
      : (tkTho.handled && ngonNguLech(text, tkTho.reply))
      ? { handled: false, rule: tkTho.rule, reply: "", lyDo: `nhuong_model:ngon_ngu:${tkTho.rule}` }
      : tkTho;
    if (tk.handled && !state.fastLanesUsed.has(`keyword:${tk.rule}`)) {
      const cua = quaCuaRa(tk.reply, {
        kb,
        pageId: state.pageId,
        custName: state.custName,
        lastAiText: state.lastAiText,
      });
      if (!cua.text) {
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: KHONG_GOI_MODEL,
          lane: LANE_TU_KHOA,
          lyDo: `guard_noi_dung:${cua.v.rule}`,
          // GIỮ CÂU BỊ CHẶN. Không giữ thì không ai phán được cửa bắt ĐÚNG hay bắt NHẦM —
          // đo 21/09: 5 dòng `spent_no_send` chỉ có `llm_ms`/`provider`, câu chữ mất sạch.
          duLieu: { text_bi_chan: catChu(tk.reply, 600), guard_ly_do: cua.v.reason || "" },
        });
        await banGiaoViCuaRa(cua.v.rule, KHONG_GOI_MODEL, LANE_TU_KHOA);
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `guard_noi_dung:${cua.v.rule}`, dem };
      }
      await guiChu(cua.text);
      // Đếm ở `mau_0_dong.so_lan_chan`. Lỗi bộ đếm KHÔNG được làm hỏng lượt chat (khách đã
      // nhận trả lời rồi) — nhưng cũng KHÔNG nuốt im: `null` nghĩa là chưa có mẫu nào mang
      // mã này hoặc mẫu đang tắt, và con số đó đi vào `so_ai` để người sau đọc được.
      let dem0Dong = null;
      try {
        dem0Dong = await d.demChan0Dong(pool, { teamId, ma: tk.rule });
      } catch (e) {
        dem0Dong = catChu(`loi:${e?.message || e}`, 120);
      }
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, // lớp từ khoá KHÔNG gọi model — xem so-ai.js
        lane: LANE_TU_KHOA,
        trangThai: hoiThoai.trang_thai,
        lyDo: tk.lyDo,
        duLieu: { text: catChu(cua.text, 200), rule: tk.rule, dem_0_dong: dem0Dong,
          ...(cua.daSua ? { sua_tai_cho: cua.daSua } : {}) },
      });
      state.fastLanesUsed.add(`keyword:${tk.rule}`);
      state.lastAiText = cua.text;
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: cua.text });
      return { ketQua: KET_QUA.XONG, lyDo: `tu_khoa_v3:${tk.rule}`, dem };
    }

    // ── 5 · FAST LANE — chặn TRƯỚC mọi lượt gọi model (0 token) ──────────────────
    const safety = templateSafety(text, prof);
    const flTho = safety.safe ? d.lanNhanh({
      text,
      kb,
      aiTurns: Math.max(state.aiTurns, state.botTurns || 0),
      lastAiText: state.lastAiText,
      idleMs: state.idleMs,
      usedLanes: state.fastLanesUsed,
      pageId: state.pageId,
      hasOrder: state.daChotTruoc,
    }) : { handled: false, reason: safety.reason };
    // Nhường TRƯỚC khi đếm: đếm rồi mới nhường thì bộ đếm lớp 0 đồng báo «đã chặn» trong
    // khi lượt này thực tế vẫn đi lên model — số liệu tự dối.
    const fl = yTe
      ? { handled: false, lane: flTho.lane, reason: "nhuong_model:y_te" }
      : (laLanChot(flTho.lane) || shipNhuongModel(flTho.lane, text))
      ? { handled: false, lane: flTho.lane, reason: `nhuong_model:${flTho.lane}` }
      // Câu mẫu KHÁC ngôn ngữ khách ⇒ nhường, để model trả lời bằng đúng ngôn ngữ khách dùng.
      // Lane IM LẶNG (không có `reply`) không bị đụng tới: không có chữ thì không có gì lệch.
      : (flTho.handled && flTho.reply && ngonNguLech(text, flTho.reply))
      ? { handled: false, lane: flTho.lane, reason: `nhuong_model:ngon_ngu:${flTho.lane}` }
      : flTho;
    noteFastLane(fl);
    if (fl.handled) {
      if (!fl.reply) {
        // Lane IM LẶNG (sticker/"ok"): không gửi gì, không tiêu gì, không ghi sổ AI —
        // ghi một dòng cho mỗi sticker là làm ngập sổ mà không thêm thông tin nào.
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `fastlane_im:${fl.lane}`, dem };
      }
      const cua = quaCuaRa(fl.reply, {
        kb,
        pageId: state.pageId,
        custName: state.custName,
        lastAiText: state.lastAiText,
      });
      if (!cua.text) {
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: KHONG_GOI_MODEL,
          lane: fl.lane,
          lyDo: `guard_noi_dung:${cua.v.rule}`,
          duLieu: { text_bi_chan: catChu(fl.reply, 600), guard_ly_do: cua.v.reason || "" },
        });
        await banGiaoViCuaRa(cua.v.rule, KHONG_GOI_MODEL, fl.lane);
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `guard_noi_dung:${cua.v.rule}`, dem };
      }
      if (Array.isArray(fl.images) && fl.images.length) {
        state.pendingImages = fl.images.map((im) => ({
          url: im.url,
          cat: im.label || "sản phẩm",
        }));
        state.pendingCaption = fl.caption || "";
      }
      const nAnh = await xaAnh();
      if (nAnh || anhHong.length) {
        await ghi(LOAI.IMAGE, {
          maModel: KHONG_GOI_MODEL,
          lane: fl.lane,
          duLieu: duLieuAnh(nAnh),
        });
      }
      await guiChu(cua.text);
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, // Fast Lane KHÔNG gọi model — xem so-ai.js
        lane: fl.lane,
        trangThai: hoiThoai.trang_thai,
        lyDo: fl.reason || "",
        duLieu: { text: catChu(cua.text, 200), ...(cua.daSua ? { sua_tai_cho: cua.daSua } : {}) },
      });
      state.lastAiText = cua.text;
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: cua.text });
      return { ketQua: KET_QUA.XONG, lyDo: `fastlane:${fl.lane}`, dem };
    }

    // ── 6 · PHÂN LOẠI (0 token ở bản hiện tại — classifier.js đã bỏ lời gọi model) ──
    const cls = await d.phanLoai(text, kb.products?.[0]?.name);
    if (cls.intent === "spam" && cls.is_spam_conf >= 0.8) {
      await luuLai({ daGoiModel: false, daGuiText: false });
      return { ketQua: KET_QUA.XONG, lyDo: "spam", dem };
    }
    if (cls.intent === "complaint") {
      state.handoff = true;
      state.handoffReason = "complaint";
      await banGiaoSale("Khách KHIẾU NẠI — cần người xử lý gấp");
      await ghi(LOAI.HANDOFF, { maModel: KHONG_GOI_MODEL, lyDo: "complaint" });
      await luuLai({ daGoiModel: false, daGuiText: false });
      return { ketQua: KET_QUA.XONG, lyDo: "complaint", dem };
    }

    // ── 6b · NGÂN SÁCH LƯỢT THEO ĐỘ NÓNG — thay trần 4 lượt cứng (L2-M3 ②.2) ─────
    // MUỘN — sau lớp từ khoá/Fast Lane/classify (đều 0 token, không có lý do chặn),
    // NGAY TRƯỚC khi tốn tiền gọi model thật. `used` = state.aiTurns (lượt GỌI MODEL
    // trong 24h, không phải luot_ai/botTurns — xem ngan-sach-luot.js đầu file).
    const nganSach = d.conNganSach(budget, state.aiTurns);
    if (!nganSach.ok) {
      state.handoff = true;
      state.handoffReason = nganSach.lyDo;
      await banGiaoSale(nganSach.lyDo);
      await ghi(LOAI.HANDOFF, {
        maModel: KHONG_GOI_MODEL,
        lyDo: `ngan_sach_het:${budget.tier}`,
        duLieu: {
          diem: lead.score,
          tier: budget.tier,
          max: budget.max,
          used: state.aiTurns,
        },
      });
      await luuLai({ daGoiModel: false, daGuiText: false });
      return {
        ketQua: KET_QUA.XONG,
        lyDo: `ngan_sach_het:${budget.tier}`,
        dem,
      };
    }

    // ── 7 · DỰNG NGỮ CẢNH + GỌI BỘ NÃO (runCloser NGUYÊN VĂN) ────────────────────
    // VA-R1 · RF-1: van GỬI đóng ⇒ KHÔNG chạy tool-loop. Bộ não chứa 5 lượt HTTP ghi
    // thẳng (đầu file) và tiêu token thật; chạy nó rồi mới để cửa chặn là vừa đốt tiền
    // vừa để note/tag bay ra trước khi cửa kịp nói «đóng» (refute S1). Ném cùng lỗi
    // `LoiCuaGuiDong` ⇒ rơi vào nhánh `chan_guard` dưới đáy, worker KHÔNG thử lại (N6).
    // Chỉ áp khi dùng CỬA THẬT: cửa được TIÊM (test/harness) tự gánh van của nó.
    // Diễn tập được chạy bộ não (xem chú thích cùng chốt ở `worker.js`): tiền token là
    // thứ phép đo mua, và không lượt gửi nào bay ra — cửa gửi ghi sổ rồi dừng, cổng HTTP
    // ghi vẫn chặn POST tới pages.fm.
    if (!deps.cua && !vanGuiDangMo() && !dangDienTap()) {
      throw new LoiCuaGuiDong(
        `Van GỬI đóng (V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} · ` +
          `PANCAKE_READONLY=${JSON.stringify(process.env.PANCAKE_READONLY)}) — ` +
          `KHÔNG gọi bộ não (0 token, 0 HTTP ghi). Mở van rồi UPDATE tay tin chan_guard về cho.`,
      );
    }
    model = await d.layModel(pool, { teamId }, { vaiTro: "chinh" });
    const { messages } = buildContextMessages({
      prof,
      msgs: history,
      keepTrailingUser: tin.nguon === 'webhook',
      pageId: state.pageId,
      meta: {
        state: hoiThoai.trang_thai,
        used: state.aiTurns,
        // L2-M3 ②.2: ngân sách THEO ĐỘ NÓNG thay hằng cào bằng config.maxAiTurnsBeforeHandoff
        // (context.js#buildProfileBlock đọc {used,max,tier} y nguyên — không đổi hàm đó).
        max: budget.max,
        tier: budget.tier,
        // MẠCH TƯ VẤN (context.js): câu AI nói gần nhất + khách im bao lâu. Cả hai ĐÃ có
        // sẵn trong `state` (trang-thai.js:85-86 nạp từ `hoi_thoai.ai_noi_gi`/`ai_noi_luc`)
        // — trước lượt này chỉ cửa chống-lặp dùng, prompt không hề thấy.
        lastAi: state.lastAiText,
        idleMs: state.idleMs,
        // KB để `buildProfileBlock` đối chiếu giá mà KÊNH KHÁC đã báo cho khách với bảng
        // giá đang chạy. Không có nó thì khối hồ sơ chỉ nói "đã báo giá", không nói SAI.
        kb,
        // BH9 ② 7: dòng ⚕️ «câu ĐẦU: khuyên ngừng dùng và đi khám…» (rỗng ⇒ không dòng).
        yTe,
      },
    });
    state.messages = messages;
    state.profile = prof;
    state.customerText = text;
    state.messages.push({
      role: "user",
      content: cleanText(text).trim() || "(khách gửi ảnh/sticker)",
    });

    // Model đã resolve được truyền thẳng vào closer.
    await assertCanAct();
    const business = {
      captureOrder: async order => {
        await assertCanAct();
        // BH9 ② 4 — thi hành CORE §5 («confirmed by the backend, or placed via Facebook Commerce»): khách đang có đơn do PAGE nói
        // (POS/sale/vận đơn) ⇒ không đẻ đơn thứ hai. [S1] CHỈ nguồn page — nguồn `khach` là suy từ lời khách, bắt nhầm thì khoá tạo
        // đơn vĩnh viễn (`donDaCo` không hết hạn); nháp nguồn khách vẫn vào hàng chờ, sale + cửa ③ chống trùng canh.
        if (prof.donDaCo?.nguon === "page") {
          throw new Error(`Khách đang có đơn (${prof.donDaCo.trangThai}) — không tạo đơn mới; gọi handoff_human`);
        }
        const saved = await d.vaoHangCho(pool, ctx, {
          hoiThoaiId: hoiThoai.id, teamId, convId: tin.conv_id, tinId: tin.id,
          // BH9 ② 10: cờ đơn nháp — tên khách TỰ cho (để biết `name` của model có phải tên Facebook) + COD ngầm.
          hoSo: { ...order, san_pham_ma: String(order.product_id).includes(':') ? order.product_id : '',
            tenKhach: prof.name, tenFb: prof.tenFb, codNgam: !!(prof.cod && prof.codNgam) },
        }, d.depsHangCho);
        if (!saved?.id) throw new Error('Hàng chờ chưa xác nhận lưu đơn');
        if (saved.daCo && saved.trang_thai !== 'cho_duyet') throw new Error('Thông tin đơn này đã được nhân viên xử lý');
        state.orderDraftId = saved.id;
        return ketQuaNhanDon(order, saved.id);
      },
      handoff: async reason => {
        await assertCanAct();
        state.handoff = true;
        state.handoffReason = reason;
        await banGiaoSale(reason);
        return { ok: true };
      },
    };
    // ĐO ĐỘ TRỄ của lượt gọi bộ não. Không có cột riêng và không cần: `so_ai.du_lieu` là
    // jsonb. «Trả lời nhanh không» là một trong ba thứ phép đo diễn tập phải trả lời được,
    // mà trước lượt này không chỗ nào trong hệ ghi lại thời gian một lượt.
    const mocNao = Date.now();
    const text2 = await d.chayCloser({ kb, state, model, assertCanAct, business });
    const treNaoMs = Date.now() - mocNao;
    dem.goiModel += 1;

    // ── 8 · HÚT HỒ SƠ (M07) ──────────────────────────────────────────────────────
    absorbToolUses(state.messages, prof);
    extractFromText(text, prof, { lastAi: state.lastAiText });
    if (state.closed) prof.ordered = true;

    const dung = state.lastUsage || {};

    // ── 9 · CỬA CUỐI TRƯỚC KHÁCH (outbound-guard, M09) ───────────────────────────
    // BH9 ② 7: lượt khách báo y tế LUÔN bàn giao — đặt cờ TRƯỚC cửa ra (/code-review BH9 #1) để `daBanGiao` đúng sự thật lúc soi:
    // «…see a doctor. Our team will message you shortly» là lời thật (sale sẽ nhắn), không phải tự hứa.
    if (yTe && !state.handoff) {
      state.handoff = true;
      state.handoffReason = `Y TẾ · khách báo ${yTe}`;
    }
    const guarded0 = String(text2 || ""); // bản GỐC của model, giữ để ghi sổ khi bị chặn
    let guarded = guarded0;
    let cuaRaChan = null;   // phán quyết đã GIẾT câu — để ghi lý do đúng ở đường thoát
    let cuaRaSua = "";      // mã luật đã sửa tại chỗ (0 token) — để đếm được bậc 2 cứu mấy lượt
    if (guarded) {
      const cua = quaCuaRa(guarded, {
        kb,
        pageId: state.pageId,
        custName: state.custName,
        lastAiText: state.lastAiText,
        // VA-R1 · RF-3: khuôn v2 `src/handler.js:436-437` — lượt bot vừa chốt đơn là lượt
        // TÓM TẮT xác nhận (tên/SĐT/địa chỉ) + có thể nhắc «order number»; thiếu hai cờ
        // này guard chặn nhầm PII_ECHO/FAKE_ORDER_ID ⇒ khách câm đúng lượt xác nhận đơn
        // trong khi hệ đã ghi so_ai ORDER + đẩy hàng chờ.
        orderCreated: !!state.orderResult?.pos_created,
        isOrderSummary: !!state.orderCreatedThisTurn,
        // BH9 ② 6: bốn luật mới (lượt này đã gọi model) + ngữ cảnh của chúng.
        ...ctxBH9(),
      });
      guarded = cua.text;   // rỗng ⇒ cửa giết thật; v3 KHÔNG xin model viết lại (bậc 3)
      cuaRaSua = cua.daSua;
      if (!guarded) {
        cuaRaChan = cua.v;
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: model.maModel,
          lane: "AI",
          lyDo: `guard_noi_dung:${cua.v.rule}`,
          dung,
          // Câu model đã viết — ĐÃ TRẢ TIỀN cho nó, phải giữ lại mới soi được cửa bắt
          // đúng hay nhầm. Cắt 200 ký tự như nhánh REPLY.
          duLieu: { text_bi_chan: catChu(guarded0, 600), guard_ly_do: cua.v.reason || "" },
        });
      }
    }

    // ── 9b · BH9 ② 6 — LUẬT MỚI chặn ⇒ CÂU CỐ ĐỊNH + bàn giao (không im). Luật CŨ chặn ⇒ đường cũ y nguyên (im + bàn giao, dưới).
    // `spent_no_send` phía trên đã giữ câu model + `dung` (tiền của lượt); dòng `reply` của câu cố định KHÔNG mang `dung` [S6].
    const cauCoDinhMa = !guarded && cuaRaChan && LUAT_BH9.has(cuaRaChan.rule) ? `cua_ra:${cuaRaChan.rule}` : "";
    if (cauCoDinhMa) {
      // Lượt Y TẾ ⇒ luôn câu y tế (lời khuyên đi khám), bất kể luật mới nào bắn — /code-review BH9 #1.
      guarded = cauCoDinh(yTe ? CAU_Y_TE : CAU_NHAN_BAN_GIAO);
      state.handoff = true;
      state.handoffReason = `cửa ra chặn: ${cuaRaChan.rule}${yTe ? ` · Y TẾ (${yTe})` : ""}`;
      boHangAnh();   // [S5] — trước `xaAnh(!!guarded)`: `guarded` giờ khác rỗng nên ảnh sẽ ĐI nếu còn trong hàng
    }

    // ── 11 · CỜ BỘ NÃO ĐỂ LẠI → sổ AI (N5) ──────────────────────────────────────
    // `executeTool` ghi `logAi` vào JSONL cũ, KHÔNG vào bảng `so_ai` (đo: grep so_ai
    // trong src/*.js = 0 dòng) — nên nhạc trưởng phải tự ghi, nếu không 4 cửa chống
    // trùng §7.3 và L3-M2/M4 không có nguồn nào để tra.
    if (state.orderCreatedThisTurn || state.closed) {
      await ghi(LOAI.ORDER, {
        maModel: model.maModel,
        lane: "AI",
        lyDo: state.orderCreatedThisTurn
          ? "bot_chot_luot_nay"
          : "hoi_thoai_da_chot",
        duLieu: {
          ho_so: {
            name: prof.name,
            phone: prof.phone,
            city: prof.city,
            qty: prof.qty,
          },
          auto_create_order: false, // GIỮ TẮT — hàng chờ tạo đơn là L3-M4
        },
      });
      // ── 11b · L3-M4 · VÀO HÀNG CHỜ SALE DUYỆT ─────────────────────────────
      // 01 §1: bot chốt xong thì đơn KHÔNG tự vào POS (`autoCreateOrder` vẫn TẮT, đúng
      // §7.3 «THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM») — nó vào `hang_cho_tao_don` kèm kết quả
      // năm cửa, sale duyệt mới tạo đơn thật. Đặt NGAY SAU dòng `so_ai(order)` là cố ý:
      // nguồn (a) của cửa chống trùng tra chính bảng đó và phải TRỪ sự kiện của lượt
      // này ra (`tinId`), nếu không mọi dòng đều tự báo mình trùng.
      // Lỗi KHÔNG bị nuốt: cùng khuôn `ghi(...)`/`luuLai(...)` quanh nó — nuốt ở đây là
      // đánh rơi một đơn đã chốt mà không ai biết.
      if (!state.orderDraftId) await d.vaoHangCho(
        pool,
        ctx,
        {
          hoiThoaiId: hoiThoai.id,
          teamId,
          // BH9 ② 10: cùng ba khoá cờ với `captureOrder` (tên khách tự cho · tên Facebook · COD ngầm).
          hoSo: { ...prof, tenKhach: prof.name, tenFb: prof.tenFb, codNgam: !!(prof.cod && prof.codNgam) },
          convId: tin.conv_id,
          tinId: tin.id,
        },
        d.depsHangCho,
      );
    }

    // ── 10 · ẢNH TRƯỚC, CHỮ SAU — cả hai QUA CỬA ─────────────────────────────────
    const nAnh = await xaAnh(!!guarded);
    if (nAnh || anhHong.length) {
      await ghi(LOAI.IMAGE, {
        maModel: model.maModel,
        lane: "AI",
        duLieu: duLieuAnh(nAnh),
      });
    }
    if (guarded && cauCoDinhMa) {
      // Câu cố định (không phải chữ model): lane riêng, KHÔNG `dung`, `maModel` vắng mặt — chi phí của lượt ở dòng `spent_no_send`.
      await guiChu(guarded);
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, lane: "cau_co_dinh", trangThai: hoiThoai.trang_thai, lyDo: state.handoffReason,
        duLieu: { text: guarded, cau_co_dinh: cauCoDinhMa, tre_luot_ms: Date.now() - mocLuot },
      });
      state.lastAiText = guarded;
    } else if (guarded) {
      await guiChu(guarded);
      await ghi(LOAI.REPLY, {
        maModel: model.maModel,
        lane: "AI",
        trangThai: hoiThoai.trang_thai,
        dung,
        duLieu: {
          text: catChu(guarded, 200), nguon_model: model.nguon,
          ...(cuaRaSua ? { sua_tai_cho: cuaRaSua } : {}),
          tre_nao_ms: treNaoMs,                 // riêng lượt bộ não (model + vòng tool)
          tre_luot_ms: Date.now() - mocLuot,    // cả lượt: đọc lịch sử → soạn → qua cửa
        },
      });
      state.lastAiText = guarded;
    } else if (!nAnh && dung.calls) {
      // ĐÃ TIÊU TOKEN MÀ KHÔNG GỬI GÌ — khoản chi tàng hình của §11.2. Đã ghi ở nhánh
      // guard phía trên thì thôi (neo idempotent của so_ai tự chặn dòng thứ hai).
      await ghi(LOAI.SPENT_NO_SEND, {
        maModel: model.maModel,
        lane: "AI",
        lyDo: "model không viết được chữ",
        dung,
      });
    }

    // Cửa ra giết câu ⇒ khách không nhận được gì. Nâng cờ TRƯỚC khối bàn giao dưới đây
    // để đi chung một đường (thẻ + ghi chú + dòng HANDOFF + `ganTuState` đẩy hội thoại
    // sang HANDOFF, nên lượt sau sale giữ quyền chứ bot không nhắc lại lỗi cũ).
    if (!guarded && cuaRaChan && !state.handoff) {
      state.handoff = true;
      state.handoffReason = `cửa ra chặn: ${cuaRaChan.rule}`;
    }

    if (state.handoff) {
      if (!state.handoffNotified) await banGiaoSale(state.handoffReason || "AI yêu cầu chuyển người");
      await ghi(LOAI.HANDOFF, {
        maModel: model.maModel,
        lane: "AI",
        lyDo: String(state.handoffReason || ""),
      });
    }

    await luuLai({
      daGoiModel: true,
      daGuiText: !!guarded,
      textDaGui: guarded,
    });
    return {
      ketQua: KET_QUA.XONG,
      // `khong_gui` chỉ còn nghĩa "model không viết được chữ". Cửa ra chặn thì NÓI RÕ
      // luật nào — đo 21/09: cả 5 lượt `khong_gui` đều là cửa ra, không lượt nào là model câm.
      lyDo: cauCoDinhMa ? `cau_co_dinh:${cuaRaChan.rule}` : guarded ? "tra_loi" : cuaRaChan ? `guard_noi_dung:${cuaRaChan.rule}` : "khong_gui",
      dem,
    };
  } catch (e) {
    if (e?.name === "LoiQuyenHoiThoai") {
      // Không lưu snapshot cũ đè lên việc nhân viên vừa tiếp quản.
      return { ketQua: KET_QUA.CHAN_GUARD, lyDo: e.message, dem };
    }
    if (e instanceof LoiCuaGuiDong || e?.name === "LoiCuaGuiDong") {
      // CỬA GỬI ĐÓNG. Token có thể đã tiêu (model chạy trước lượt gửi) ⇒ ghi
      // `spent_no_send` để khoản chi không tàng hình, rồi trả về `chan_guard` để worker
      // KHÔNG thử lại: thử lại một lượt guard-đóng là đốt thêm một lượt model cho một
      // tin chắc chắn không gửi được (N6).
      await ghi(LOAI.SPENT_NO_SEND, {
        maModel: KHONG_GOI_MODEL,
        lane: dem.goiModel ? "AI" : "cua",
        lyDo: `cua_dong: ${e.message}`.slice(0, 400),
        dung: state.lastUsage || {},
      }).catch(() => {});
      await luuLai({ daGoiModel: dem.goiModel > 0, daGuiText: false }).catch(
        () => {},
      );
      return { ketQua: KET_QUA.CHAN_GUARD, lyDo: e.message, dem };
    }
    // Lỗi LLM/kênh không được làm mất dữ kiện đã thu thập hoặc quyền bàn giao.
    // Nếu SQL đã abort thì worker rollback và sổ gửi độc lập vẫn chặn phát lại.
    await luuLai({ daGoiModel: (state.lastUsage?.calls || 0) > 0, daGuiText: false }).catch(() => {});
    if ((state.lastUsage?.calls || 0) > 0) {
      await ghi(LOAI.SPENT_NO_SEND, { maModel: state.modelUsed || model?.maModel || KHONG_GOI_MODEL,
        lane: 'AI', lyDo: `loi:${e.name || 'Error'}`, dung: state.lastUsage }).catch(() => {});
    }
    throw e;
  }
}
