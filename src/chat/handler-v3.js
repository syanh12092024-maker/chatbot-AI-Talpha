// HANDLER v3 — NHẠC TRƯỞNG MỚI quanh bộ não CŨ (phiếu L2-M1 ②.3).
//
// ⛔ BỘ NÃO DÙNG NGUYÊN, KHÔNG SỬA MỘT DÒNG: `classifier.js` `fast-lane.js` `closer.js`
//    `tools.js` `prompts.js` `outbound-guard.js` `context.js` `kb.js` KHÔNG bị đụng một
//    dòng nào (luật 4 §0a sổ điều hành). File này chỉ thay phần ĐIỀU PHỐI mà `handler.js` +
//    `pancake-poll.js` đang làm: lấy tin ở đâu, ghi trạng thái vào đâu, và — quan trọng
//    nhất — TIN ĐI RA BẰNG ĐƯỜNG NÀO.
//    (L2-M3) `kb.js#getKBForPage` không còn import TRỰC TIẾP ở đây — mặc định `layKb` nay
//    là `rap-prompt.js#rapKb`, TỰ gọi `getKBForPage` bên trong làm đường LÙI khi cờ
//    `V3_RAP_PROMPT_BAT` vắng (xem rap-prompt.js). kb.js vẫn nguyên vẹn, chỉ đổi ai gọi nó.
//
// ══ VÌ SAO PHẢI CÓ FILE NÀY: NỢ N2 (§9 sổ điều hành, L1-M2) ═══════════════════════════
// Cửa Messenger v3 (`src/channels/messenger/`) đặt guard fail-closed cho MỌI lượt gửi —
// nhưng bộ não cũ không đi qua cửa đó. Đo lại 22/08 trên chính cây này:
//
//   ĐƯỜNG RA CỦA BẢN CŨ                                         | v3 thay bằng
//   -------------------------------------------------------------|-------------------
//   pancake-poll.js:520  pkSendReply(...)            (tin chữ)    | cửa `guiTin`
//   tools.js:132→97      pkSendImage(...)            (ảnh Pancake)| cửa `guiAnh`
//   tools.js:104         sendImage(...)  → GRAPH API (ảnh FB)     | cửa `guiAnh`
//   pancake-poll.js:465  pkTagByName(pkTags.ai)                   | cửa `gatThe`
//   -------------------------------------------------------------|-------------------
//   tools.js:197         pkTagByName(pkTags.order)   ⬅ CÒN NGUYÊN — nằm TRONG executeTool
//   tools.js:266         pkTagByName(pkTags.handoff) ⬅ CÒN NGUYÊN
//   tools.js:271         pkAddNote('🙋 AI CHUYỂN NGƯỜI…') ⬅ CÒN NGUYÊN
//   order-bridge.js:255  pkAddNote(<ghi chú đơn>)    ⬅ CÒN NGUYÊN — LỆCH ĐỀ BÀI ①
//   pancake-orders.js:25 fetch(POS pages.fm) ĐỌC     ⬅ CÒN NGUYÊN — LỆCH ĐỀ BÀI ②
//   pancake-orders.js:108  ─"─                         (không phải gửi tin, nhưng vẫn là
//                        HTTP ra ngoài, bằng KHOÁ THẬT của 7 shop)
//
// ⚠️ LỆCH ĐỀ BÀI (án lệ #4 skill tho-thi-cong — đo lại nguyên liệu): phiếu ② khai «BA
//    CHỖ GỬI NGẦM», đo ra **NĂM đường thoát**, hai đường mới đều GỌI GIÁN TIẾP nên grep
//    trong `tools.js` không thấy:
//      ① `tools.js:208 recordClosedOrder(...)` → `order-bridge.js:255 pkAddNote(...)`
//      ② `tools.js:171 ordersEnabled() && conversationHasOrder(...)` →
//         `pancake-orders.js` bắn HTTP tới POS pages.fm bằng khoá thật của
//         `pancake-shops.json`. ĐO ĐƯỢC: bẫy `fetch` trong bộ ca bắt **7 lượt** ở lượt
//         chạy đầu tiên, trong khi mock `pancake.js`+`messenger.js` vẫn báo sạch — tức
//         danh sách mock của phiếu THIẾU thì phép ④#4 xanh giả. Đường này không có một
//         dòng `PANCAKE_READONLY` nào canh (grep `pancake-orders.js` = 0) và `catch {}`
//         nuốt lỗi, nên nó hỏng trong im lặng. Đã ghi §9 sổ điều hành.
//
// Năm chỗ dưới nằm TRONG `executeTool`, chạy giữa lòng `runCloser` — không sửa được
// `tools.js`/`order-bridge.js`/`pancake-orders.js` thì không route được chúng qua cửa.
// Phiếu chặn HAI TẦNG:
//   (a) TẦNG NGUỒN — bộ NẠP từ chối enqueue khi `PANCAKE_READONLY=1` (trừ `V3_NAP_DEV=1`),
//       nên trên máy dev KHÔNG có tin thật nào vào hàng đợi ⇒ `executeTool` không bao giờ
//       chạy trên hội thoại thật ở đây. Xem `src/queue/nap.js`.
//   (b) TẦNG ĐO — bộ ca mock `pancake.js` · `messenger.js` · `pancake-orders.js` (+ bẫy
//       `globalThis.fetch` làm chốt chặn cuối) và IN BẢNG ĐẾM cho ba dân số (tin thường ·
//       ép chốt đơn · ép chuyển người), nên năm chỗ trên có bay là THẤY.
// Ở VPS (môi trường ĐƯỢC PHÉP gửi) năm chỗ đó vẫn đi thẳng — đã ghi §9 làm nợ dài hạn,
// kèm hệ quả cụ thể: nhánh chuyển người sẽ có HAI ghi chú (một của tools.js:271, một của
// cửa v3 ở đây) và thẻ được gắn hai lượt (gắn thẻ là thao tác lũy đẳng nên vô hại; ghi
// chú thì KHÔNG). Đừng "sửa" bằng cách bỏ đường cửa v3 — bỏ nó là mất luôn guard.
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
  extractFromText,
  absorbToolUses,
  buildContextMessages,
} from "../context.js";
import { cleanText } from "../text.js";
import { config } from "../config.js";
import { layModel as layModelMacDinh } from "./model.js";
import { ghiSoAi, LOAI, KHONG_GOI_MODEL } from "./so-ai.js";
import { dungState, ganTuState } from "./trang-thai.js";
import { suaHoiThoai, docHoiThoaiTheoPageText } from "./kho.js";
import { lopTuKhoa, LANE as LANE_TU_KHOA } from "./lop-tu-khoa.js";
import { rapKb as rapKbMacDinh } from "./rap-prompt.js";
import {
  chamVaTinhNganSach as chamVaTinhNganSachMacDinh,
  conNganSach as conNganSachMacDinh,
} from "./ngan-sach-luot.js";

/** Không tìm thấy dòng `hoi_thoai` cho tin — bộ NẠP phải tạo TRƯỚC (cua-messenger §2). */
export class LoiThieuHoiThoai extends Error {
  constructor(msg) {
    super(msg);
    this.name = "LoiThieuHoiThoai";
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

  // ── 2 · KB + MODEL ───────────────────────────────────────────────────────────────
  const kb = (await d.layKb(pool, { teamId, pageIdText: tin.page_id })) || {};
  const model = await d.layModel(pool, { teamId }, { vaiTro: "chinh" });

  // ── 3 · STATE + HỒ SƠ ────────────────────────────────────────────────────────────
  const state = dungState({ tin, hoiThoai, bayGio });
  const prof =
    hoiThoai.ho_so && Object.keys(hoiThoai.ho_so).length
      ? { ...emptyProfile(), ...hoiThoai.ho_so }
      : emptyProfile();
  const text = String(tin.noi_dung || "");

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
    await suaHoiThoai(pool, { teamId, id: hoiThoai.id, giaTri: patch });
  };

  // Gửi tin chữ QUA CỬA. `LoiCuaGuiDong` KHÔNG bắt ở đây — nó nổi lên tới đáy hàm để
  // worker đặt tin sang `chan_guard` (một chỗ quyết định, án lệ #31 "cửa RA đúng một cái").
  const guiChu = async (noiDung) => {
    const r = await d.cua.guiTin(
      pool,
      ctx,
      { ...diaChi, text: noiDung },
      d.depsPancake,
    );
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
      await d.cua.guiAnh(
        pool,
        ctx,
        { ...diaChi, url: im.url, caption },
        d.depsPancake,
      );
      dem.guiAnh += 1;
      gui += 1;
      caption = ""; // lời dẫn chỉ kèm tấm ĐẦU — lặp dưới mỗi tấm trông như spam
    }
    return gui;
  };

  // Bàn giao sale QUA CỬA: thẻ + ghi chú. Xem khối đầu file về ghi chú TRÙNG ở VPS.
  const banGiaoSale = async (lyDo) => {
    if (config.pkTags.handoff) {
      await d.cua.gatThe(
        pool,
        ctx,
        { ...diaChi, name: config.pkTags.handoff, on: true },
        d.depsPancake,
      );
      dem.gatThe += 1;
    }
    await d.cua.ghiNote(
      pool,
      ctx,
      {
        pageId: diaChi.pageId,
        custId: diaChi.custId,
        message: `🙋 AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ\nLý do: ${lyDo || "không rõ"}`,
      },
      d.depsPancake,
    );
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
    const tk = lopTuKhoa({ text, kb });
    if (tk.handled) {
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
      await ghi(LOAI.REPLY, {
        maModel: KHONG_GOI_MODEL, // lớp từ khoá KHÔNG gọi model — xem so-ai.js
        lane: LANE_TU_KHOA,
        trangThai: hoiThoai.trang_thai,
        lyDo: tk.lyDo,
        duLieu: { text: tk.reply.slice(0, 200), rule: tk.rule },
      });
      state.lastAiText = tk.reply;
      await luuLai({ daGoiModel: false, daGuiText: true, textDaGui: tk.reply });
      return { ketQua: KET_QUA.XONG, lyDo: `tu_khoa_v3:${tk.rule}`, dem };
    }

    // ── 5 · FAST LANE — chặn TRƯỚC mọi lượt gọi model (0 token) ──────────────────
    const fl = d.lanNhanh({
      text,
      kb,
      aiTurns: Math.max(state.aiTurns, state.botTurns || 0),
      lastAiText: state.lastAiText,
      idleMs: state.idleMs,
      usedLanes: state.fastLanesUsed,
      pageId: state.pageId,
    });
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
    const { messages } = buildContextMessages({
      prof,
      msgs: d.lichSu,
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
    state.messages.push({
      role: "user",
      content: cleanText(text).trim() || "(khách gửi ảnh/sticker)",
    });

    // `model` đi xuống closer qua `ctx.model`. ⚠️ `src/closer.js` (CẤM SỬA) hardcode
    // `import { anthropic } from './llm.js'` nên nó CHƯA đọc trường này — đây là CHỖ CẮM
    // cho L1-M4 của người B, khai trong `duong-tin-v1.md`. Đừng đọc thành "đã cắm xong".
    const text2 = await d.chayCloser({ kb, state, model });
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
        duLieu: { text: guarded.slice(0, 200), nguon_model: model.nguon },
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
          auto_create_order: config.autoCreateOrder, // GIỮ TẮT — hàng chờ tạo đơn là L3-M4
        },
      });
    }
    if (state.handoff) {
      await banGiaoSale(state.handoffReason || "AI yêu cầu chuyển người");
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
    throw e;
  }
}
