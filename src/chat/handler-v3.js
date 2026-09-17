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
import { guardOutbound } from "../outbound-guard.js";
import {
  emptyProfile,
  hydrateProfile,
  extractFromText,
  absorbToolUses,
  buildContextMessages,
} from "../context.js";
import { cleanText } from "../text.js";
import { config } from "../config.js";
import { layModel as layModelMacDinh } from "./model.js";
import { ghiSoAi, LOAI, KHONG_GOI_MODEL } from "./so-ai.js";
import { aiDuocTraLoi, dungState, ganTuState } from "./trang-thai.js";
import { suaHoiThoai, docHoiThoaiTheoPageText } from "./kho.js";
import { lopTuKhoa, LANE as LANE_TU_KHOA } from "./lop-tu-khoa.js";
import { rapKb as rapKbMacDinh } from "./rap-prompt.js";
import {
  chamVaTinhNganSach as chamVaTinhNganSachMacDinh,
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

export const KET_QUA = Object.freeze({
  XONG: "xong",
  CHAN_GUARD: "chan_guard",
  LOI: "loi",
});

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
    // L2-M3 ②.2: ngân sách lượt theo độ nóng, thay trần 4 lượt cứng.
    chamVaTinhNganSach: deps.chamVaTinhNganSach || chamVaTinhNganSachMacDinh,
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

  if (hoiThoai.v3_ai_bat === false || !aiDuocTraLoi(hoiThoai) || (tin.nguon && hoiThoai.nguon_tin !== tin.nguon)) {
    return { ketQua: KET_QUA.CHAN_GUARD, lyDo: "hoi_thoai_khong_thuoc_ai", dem };
  }
  const assertCanAct = async () => {
    const moi = await docHoiThoaiTheoPageText(pool, {
      teamId, pageIdText: tin.page_id, psid: tin.psid,
    });
    if (moi?.v3_ai_bat === false || moi?.phien_ban !== hoiThoai.phien_ban || !aiDuocTraLoi(moi) || (tin.nguon && moi.nguon_tin !== tin.nguon)) {
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
  extractFromText(text, prof);

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
  const { lead, budget } = d.chamVaTinhNganSach(text, prevLead);

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
  const xaAnh = async () => {
    const hang = state.pendingImages || [];
    if (!hang.length) return 0;
    state.pendingImages = [];
    let caption = String(state.pendingCaption || "").trim();
    state.pendingCaption = "";
    let gui = 0;
    for (const im of hang) {
      await assertCanAct();
      await guiDaXacNhan(() => d.cua.guiAnh(
        pool,
        ctx,
        { ...diaChi, url: im.url, caption },
        d.depsPancake,
      ));
      state.sentImages.add(im.url);
      const cat = String(im.cat || "sản phẩm");
      if (!prof.imagesSent.includes(cat)) prof.imagesSent.push(cat);
      dem.guiAnh += 1;
      gui += 1;
      caption = ""; // lời dẫn chỉ kèm tấm ĐẦU — lặp dưới mỗi tấm trông như spam
    }
    return gui;
  };

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

    // ── 4b · LỚP TỪ-KHOÁ v3 — 2 luật Botcake chưa phủ + vá `paano mag order` (L2-M2) ──
    // Đứng TRƯỚC Fast Lane/classify (đề bài ① phiếu L2-M2). `lopTuKhoa` là hàm THUẦN,
    // không đọc DB — xem src/chat/lop-tu-khoa.js đầu file để biết vì sao NHƯỜNG (không
    // bịa) khi KB trang chưa có `fastLaneAuth`/`fastLaneSize`. Cùng cửa `d.kiemTinRa`
    // (M09) với Fast Lane/AI — câu trả lời của lớp này KHÔNG được miễn kiểm nội dung.
    const tk = lopTuKhoa({ text, kb, profile: prof });
    if (tk.handled && !state.fastLanesUsed.has(`keyword:${tk.rule}`)) {
      const v = d.kiemTinRa(tk.reply, {
        kb,
        pageId: state.pageId,
        custName: state.custName,
        lastAiText: state.lastAiText,
      });
      if (!v.ok) {
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: KHONG_GOI_MODEL,
          lane: LANE_TU_KHOA,
          lyDo: `guard_noi_dung:${v.rule}`,
        });
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `guard_noi_dung:${v.rule}`, dem };
      }
      await guiChu(tk.reply);
      // Đếm ở `mau_0_dong.so_lan_chan`. Lỗi bộ đếm KHÔNG được làm hỏng lượt chat (khách đã
      // nhận trả lời rồi) — nhưng cũng KHÔNG nuốt im: `null` nghĩa là chưa có mẫu nào mang
      // mã này hoặc mẫu đang tắt, và con số đó đi vào `so_ai` để người sau đọc được.
      let dem0Dong = null;
      try {
        dem0Dong = await d.demChan0Dong(pool, { teamId, ma: tk.rule });
      } catch (e) {
        dem0Dong = `loi:${e?.message || e}`.slice(0, 120);
      }
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, // lớp từ khoá KHÔNG gọi model — xem so-ai.js
        lane: LANE_TU_KHOA,
        trangThai: hoiThoai.trang_thai,
        lyDo: tk.lyDo,
        duLieu: { text: tk.reply.slice(0, 200), rule: tk.rule, dem_0_dong: dem0Dong },
      });
      state.fastLanesUsed.add(`keyword:${tk.rule}`);
      state.lastAiText = tk.reply;
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: tk.reply });
      return { ketQua: KET_QUA.XONG, lyDo: `tu_khoa_v3:${tk.rule}`, dem };
    }

    // ── 5 · FAST LANE — chặn TRƯỚC mọi lượt gọi model (0 token) ──────────────────
    const safety = templateSafety(text, prof);
    const fl = safety.safe ? d.lanNhanh({
      text,
      kb,
      aiTurns: Math.max(state.aiTurns, state.botTurns || 0),
      lastAiText: state.lastAiText,
      idleMs: state.idleMs,
      usedLanes: state.fastLanesUsed,
      pageId: state.pageId,
      hasOrder: state.daChotTruoc,
    }) : { handled: false, reason: safety.reason };
    noteFastLane(fl);
    if (fl.handled) {
      if (!fl.reply) {
        // Lane IM LẶNG (sticker/"ok"): không gửi gì, không tiêu gì, không ghi sổ AI —
        // ghi một dòng cho mỗi sticker là làm ngập sổ mà không thêm thông tin nào.
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `fastlane_im:${fl.lane}`, dem };
      }
      const v = d.kiemTinRa(fl.reply, {
        kb,
        pageId: state.pageId,
        custName: state.custName,
        lastAiText: state.lastAiText,
      });
      if (!v.ok) {
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: KHONG_GOI_MODEL,
          lane: fl.lane,
          lyDo: `guard_noi_dung:${v.rule}`,
        });
        await luuLai({ daGoiModel: false, daGuiText: false });
        return { ketQua: KET_QUA.XONG, lyDo: `guard_noi_dung:${v.rule}`, dem };
      }
      if (Array.isArray(fl.images) && fl.images.length) {
        state.pendingImages = fl.images.map((im) => ({
          url: im.url,
          cat: im.label || "sản phẩm",
        }));
        state.pendingCaption = fl.caption || "";
      }
      const nAnh = await xaAnh();
      if (nAnh) {
        await ghi(LOAI.IMAGE, {
          maModel: KHONG_GOI_MODEL,
          lane: fl.lane,
          duLieu: { n: nAnh },
        });
      }
      await guiChu(fl.reply);
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, // Fast Lane KHÔNG gọi model — xem so-ai.js
        lane: fl.lane,
        trangThai: hoiThoai.trang_thai,
        lyDo: fl.reason || "",
        duLieu: { text: fl.reply.slice(0, 200) },
      });
      state.lastAiText = fl.reply;
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: fl.reply });
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
        const saved = await d.vaoHangCho(pool, ctx, {
          hoiThoaiId: hoiThoai.id, teamId, convId: tin.conv_id, tinId: tin.id,
          hoSo: { ...order, san_pham_ma: String(order.product_id).includes(':') ? order.product_id : '' },
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
    extractFromText(text, prof);
    if (state.closed) prof.ordered = true;

    const dung = state.lastUsage || {};

    // ── 9 · CỬA CUỐI TRƯỚC KHÁCH (outbound-guard, M09) ───────────────────────────
    let guarded = String(text2 || "");
    if (guarded) {
      const v = d.kiemTinRa(guarded, {
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
      });
      if (!v.ok) guarded = ""; // v3 KHÔNG xin model viết lại (một lượt = một lượt model)
      if (!v.ok) {
        await ghi(LOAI.SPENT_NO_SEND, {
          maModel: model.maModel,
          lane: "AI",
          lyDo: `guard_noi_dung:${v.rule}`,
          dung,
        });
      }
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
          hoSo: prof,
          convId: tin.conv_id,
          tinId: tin.id,
        },
        d.depsHangCho,
      );
    }

    // ── 10 · ẢNH TRƯỚC, CHỮ SAU — cả hai QUA CỬA ─────────────────────────────────
    const nAnh = await xaAnh();
    if (nAnh) {
      await ghi(LOAI.IMAGE, {
        maModel: model.maModel,
        lane: "AI",
        duLieu: { n: nAnh },
      });
    }
    if (guarded) {
      await guiChu(guarded);
      await ghi(LOAI.REPLY, {
        maModel: model.maModel,
        lane: "AI",
        trangThai: hoiThoai.trang_thai,
        dung,
        duLieu: {
          text: guarded.slice(0, 200), nguon_model: model.nguon,
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
      lyDo: guarded ? "tra_loi" : "khong_gui",
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
