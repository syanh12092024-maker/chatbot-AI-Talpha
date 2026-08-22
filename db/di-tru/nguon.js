// ĐỌC nguyên liệu di trú. CHỈ ĐỌC — không ghi, không sửa, không xoá file nguồn nào.
//
// Số đo thật trên cây ngày 22/08/2026 (đo lại bằng chính module này, đừng chép số):
//   pages.json        502 page   · khoá = page_id Facebook
//   ai-enabled.json    47 page_id (MẢNG PHẲNG) — CÔNG TẮC AI THẬT
//   conv-state.json 18.790 hội thoại · khoá = `<pageId>_<psid>`
//   kb-overrides.json  73 mục    · 71 mục có `config`, 70 mục trùng bản LIVE của kho phiên bản
//   script-versions/   70 tệp    · 71 bản kịch bản (một page có 2 bản: LIVE + ARCHIVED)
//
// ⛔ KHÔNG nạp: stats.json (TONG-QUAN §11.2 — Sổ AI là nguồn số duy nhất, cấm bảng
//    thống kê song song) · page-*-cache.json · health-state.json · miner-state.json
//    (cache/trạng thái tự sinh lại được). Không đẻ bảng đích cho chúng.
import fs from "node:fs";
import path from "node:path";
import { GOC } from "../ket-noi.js";

// Đúng 6 trường của một bản kịch bản — chép từ `src/kb.js` SCRIPT_FIELDS (bản đang chạy).
export const TRUONG_KICH_BAN = [
  "tone",
  "greeting",
  "salesPrompt",
  "fastLanePrice",
  "fastLaneShip",
  "fastLaneHowto",
];

const doc = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

// SURROGATE LẺ. Kịch bản marketer viết có chữ toán học đậm (𝐀𝐥𝐥 𝐃𝐚𝐲) và emoji;
// khi bị cắt ngang (vd `.slice(80)` của bản đang chạy) còn lại nửa cặp surrogate.
// JS giữ được, Postgres kiểu json/jsonb thì TỪ CHỐI cả câu INSERT — cả lượt di trú
// chết ở dòng đầu tiên gặp phải. Vá bằng ký tự thay thế U+FFFD và ĐẾM số lần vá:
// im lặng đổi chữ của marketer là sửa tài sản người khác mà không nói.
const SURROGATE_LE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function boVaSurrogate() {
  let n = 0;
  const va = (s) => {
    const t = String(s ?? "");
    const u = t.replace(SURROGATE_LE, "�");
    if (u !== t) n += 1;
    return u;
  };
  const vaSau = (v) => {
    if (typeof v === "string") return va(v);
    if (Array.isArray(v)) return v.map(vaSau);
    if (v && typeof v === "object") {
      return Object.fromEntries(
        Object.entries(v).map(([k, x]) => [k, vaSau(x)]),
      );
    }
    return v;
  };
  return { va, vaSau, dem: () => n };
}

export function duongDan(goc = GOC) {
  return {
    pages: path.join(goc, "pages.json"),
    aiEnabled: path.join(goc, "ai-enabled.json"),
    convState: path.join(goc, "conv-state.json"),
    kbOverrides: path.join(goc, "kb-overrides.json"),
    scriptVersions: path.join(goc, "script-versions"),
  };
}

export function docPages(goc = GOC) {
  const raw = doc(duongDan(goc).pages);
  const { va, vaSau } = boVaSurrogate();
  return Object.entries(raw).map(([pageId, v]) => ({
    pageId: String(pageId),
    ten: va(v.name || ""),
    thiTruong: va(v.market || ""),
    nganhHang: va(v.category || ""),
    marketer: va(v.marketer || ""),
    posShopId: v.posShopId == null ? null : String(v.posShopId),
    // ⚠️ pages.json .posApiKey ĐÃ BỊ CHE (đo 22/08: 112/112 giá trị mở đầu '***', chỉ 6 mã
    //    khác nhau = 4 ký tự cuối). Đó là VÂN TAY, không phải khoá — cố nạp vào CSDL là
    //    nhân bản một thứ không dùng được. Khoá thật nằm ở pancake-shops.json (việc của L1-M1).
    posVia: v.posVia == null ? null : String(v.posVia),
    tokenIdx: Number.isInteger(v.tokenIdx) ? v.tokenIdx : null,
    the: vaSau(v.tags && typeof v.tags === "object" ? v.tags : {}),
    matDau: v.lost === true,
    kiemLuc: v.checkedAt || null,
  }));
}

export function docAiEnabled(goc = GOC) {
  const raw = doc(duongDan(goc).aiEnabled);
  if (!Array.isArray(raw))
    throw new Error("ai-enabled.json phải là MẢNG PHẲNG page_id");
  return [...new Set(raw.map(String))];
}

// BẢN ĐỒ TRƯỜNG của conv-state.json → cột `hoi_thoai`. Đây là HỢP ĐỒNG, không phải
// chú thích: ca test `l0-m1-di-tru` đối chiếu tập khoá THẬT trong tệp với bản đồ này,
// khoá lạ xuất hiện là ĐỎ. Không có nó thì một trường mới của bản đang chạy sẽ rơi
// khỏi di trú trong im lặng (đo 22/08: đúng 16 khoá).
export const BAN_DO_CONV_STATE = {
  state: "trang_thai",
  owner: "chu_so_huu",
  prevState: "trang_thai_truoc",
  lastReason: "ly_do_cuoi",
  since: "bat_dau_luc",
  touchedAt: "cham_luc",
  humanAt: "nguoi_that_luc",
  orderAt: "chot_don_luc",
  lastAiAt: "ai_noi_luc",
  lastAiText: "ai_noi_gi",
  llmTurns: "luot_llm + moc_luot_llm",
  aiTurns: "luot_ai",
  oppTurns: "luot_doi_thu",
  followupSent: "nhac_da_gui",
  lead: "diem_nong + diem_lead",
  profile: "ho_so",
};

export function docConvState(goc = GOC) {
  const raw = doc(duongDan(goc).convState);
  const { va, vaSau, dem } = boVaSurrogate();
  const out = [];
  const khoaLa = [];
  for (const [khoa, v] of Object.entries(raw)) {
    const m = khoa.match(/^(\d+)_(\d+)$/);
    if (!m) {
      khoaLa.push(khoa);
      continue;
    }
    out.push({
      pageId: m[1],
      psid: m[2],
      trangThai: String(v.state || "GREET"),
      chuSoHuu: String(v.owner || "AI"),
      trangThaiTruoc: v.prevState ? String(v.prevState) : null,
      lyDoCuoi: va(v.lastReason || ""),
      batDauLuc: v.since || null,
      chamLuc: v.touchedAt || null,
      nguoiThatLuc: v.humanAt || null,
      chotDonLuc: v.orderAt || null,
      aiNoiLuc: v.lastAiAt || null,
      aiNoiGi: va(v.lastAiText || ""),
      // ⚠️ `llmTurns` là MẢNG MỐC THỜI GIAN (sổ ngân sách lượt/24h của M11), KHÔNG phải
      //    một con số. `Number([1786413515147])` ra đúng cái mốc đó — đây là chỗ một giả
      //    định «chắc là số đếm» ghi thẳng epoch vào cột đếm mà chẳng ai thấy.
      mocLuotLlm: Array.isArray(v.llmTurns) ? v.llmTurns : [],
      luotLlm: Array.isArray(v.llmTurns) ? v.llmTurns.length : 0,
      luotAi: Number(v.aiTurns || 0),
      luotDoiThu: Number(v.oppTurns || 0),
      nhacDaGui: Number(v.followupSent || 0),
      diemNong: Number(v.lead?.score || 0),
      diemLead: vaSau(v.lead && typeof v.lead === "object" ? v.lead : {}),
      hoSo: vaSau(v.profile && typeof v.profile === "object" ? v.profile : {}),
    });
  }
  const khoaThat = new Set();
  for (const v of Object.values(raw))
    for (const k of Object.keys(v)) khoaThat.add(k);
  return {
    hoiThoai: out,
    khoaLa,
    khoaThat: [...khoaThat].sort(),
    soVaSurrogate: dem(),
  };
}

function lamSach(cfg, va = (s) => String(s ?? "")) {
  const o = {};
  for (const k of TRUONG_KICH_BAN) o[k] = va(cfg?.[k] || "").trim();
  return o;
}

// BẢN CHO MÁY: khối chữ thật sự nạp vào system prompt. Ghép đúng như
// `src/prompts.js:99-101` của bản đang chạy — ba trường tone/greeting/salesPrompt,
// fastLane* KHÔNG vào prompt (chúng là câu mẫu bắn thẳng cho khách).
export function dungBanChoMay(cfg, va) {
  const c = lamSach(cfg, va);
  const d = [];
  if (c.tone) d.push(`- Giọng điệu / phong cách: ${c.tone}`);
  if (c.greeting)
    d.push(`- Câu chào mở đầu (dùng khi khách mới nhắn): "${c.greeting}"`);
  if (c.salesPrompt)
    d.push(`- Cách bán / điểm mạnh riêng của sản phẩm:\n${c.salesPrompt}`);
  return d.join("\n");
}

const coNoiDung = (cfg) => TRUONG_KICH_BAN.some((k) => lamSach(cfg)[k]);

// Gom kịch bản từ HAI nguồn về một danh sách bản (page_id, phiên bản, trạng thái…).
//   · script-versions/<pageId>.json  → lịch sử phiên bản, mỗi phần tử `versions` là MỘT bản
//   · kb-overrides.json[pageId].config → bản LIVE đang chạy; page nào đã có tệp lịch sử thì
//     bản LIVE ở đó CHÍNH LÀ nó (đo 22/08: 70/70 khớp từng trường sau khi lấy 6 trường chuẩn),
//     nên không đẻ dòng thứ hai. Page có config mà CHƯA có tệp lịch sử thì nhận làm v1 LIVE
//     (đúng cách backfill của `src/kb.js:readScriptDoc`).
export function docKichBan(goc = GOC) {
  const d = duongDan(goc);
  const { va, dem } = boVaSurrogate();
  const kb = doc(d.kbOverrides);
  const tep = fs.existsSync(d.scriptVersions)
    ? fs
        .readdirSync(d.scriptVersions)
        .filter((f) => f.endsWith(".json"))
        .sort()
    : [];

  const ban = [];
  const coTepLichSu = new Set();
  for (const f of tep) {
    const j = doc(path.join(d.scriptVersions, f));
    const pageId = String(j.pageId || f.slice(0, -5));
    coTepLichSu.add(pageId);
    for (const v of j.versions || []) {
      ban.push({
        pageId,
        phienBan: Number(v.version),
        trangThai: String(v.status || "DRAFT"),
        nguoiSua: String(v.updatedBy || ""),
        ghiChu: String(v.note || ""),
        suaLuc: v.updatedAt || null,
        nguoi: lamSach(v.config, va),
        may: dungBanChoMay(v.config, va),
        nguon: "script-versions",
      });
    }
  }

  const kbRieng = []; // mục kb có kịch bản mà KHÔNG có tệp lịch sử
  const kbKhongCfg = []; // mục kb chỉ có sản phẩm, không có kịch bản
  for (const [pageId, v] of Object.entries(kb)) {
    if (coTepLichSu.has(String(pageId))) continue;
    if (coNoiDung(v.config)) {
      kbRieng.push(String(pageId));
      ban.push({
        pageId: String(pageId),
        phienBan: 1,
        trangThai: "LIVE",
        nguoiSua: "kb-overrides (bản đang chạy trước M02)",
        ghiChu: "tự nhận diện từ kb-overrides.json",
        suaLuc: null,
        nguoi: lamSach(v.config, va),
        may: dungBanChoMay(v.config, va),
        nguon: "kb-overrides",
      });
    } else kbKhongCfg.push(String(pageId));
  }

  return {
    ban,
    soTepLichSu: tep.length,
    soMucKb: Object.keys(kb).length,
    kbRieng,
    kbKhongCfg,
    soVaSurrogate: dem(),
  };
}

// Mọi page_id được nhắc bởi các nguồn khác NHƯNG không có trong pages.json (sổ cái).
// Trả về bản đồ page_id → những nguồn nhắc tới nó, để LIỆT KÊ RA — cấm nuốt im.
export function pageLac(goc = GOC) {
  const trongSoCai = new Set(docPages(goc).map((p) => p.pageId));
  const map = new Map();
  const them = (id, nguon) => {
    if (trongSoCai.has(id)) return;
    if (!map.has(id)) map.set(id, []);
    if (!map.get(id).includes(nguon)) map.get(id).push(nguon);
  };
  for (const id of docAiEnabled(goc)) them(id, "ai-enabled.json");
  for (const c of docConvState(goc).hoiThoai) them(c.pageId, "conv-state.json");
  const kb = doc(duongDan(goc).kbOverrides);
  for (const id of Object.keys(kb)) them(String(id), "kb-overrides.json");
  for (const b of docKichBan(goc).ban)
    them(b.pageId, `${b.nguon} (v${b.phienBan} ${b.trangThai})`);
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pageId, nguon]) => ({ pageId, nguon }));
}
