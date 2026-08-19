// M15 · CONVERSATION MINER — mỗi đêm mổ hội thoại thật, trả về BẰNG CHỨNG CÓ CẤU TRÚC.
// Spec: docs/v2/04-TANG-TU-TIEN-HOA.md § M15 · prompt luồng: docs/v2/prompts/L7-MINER-ORDER.md
//
// Câu hỏi module này sinh ra để trả lời: hai page CÙNG NGÀNH, kịch bản dài gần bằng nhau
// (830 vs 829 token) mà chênh 12,7 lần lượt/đơn — Royal Gold Boutique 34,8 · Royal
// Birthstone 443. Không ai biết vì sao. Đọc tay 39 page mỗi đêm là bất khả thi.
//
// BA RÀNG BUỘC CỨNG, cả ba đều nằm trong code chứ không nằm trong lời hứa:
//   ① KHÔNG PII vào prompt. maskPII() che trước, hasPII() soi lại; còn sót → HUỶ lượt gọi
//     model (fail-closed) chứ không "gửi tạm rồi sửa sau". Hai hàm là ĐÔI ĐỐI NGẪU:
//     mọi thứ hasPII bắt được thì maskPII phải xoá được, nếu không sẽ tự khoá chính mình.
//   ② ĐÚNG 1 lời gọi model/page/đêm (~110đ). Bộ đếm `calls` chặn cứng, không phải ước lệ.
//   ③ Mẫu nhỏ thì kết luận là nhiễu: <20 hội thoại/24h → gộp 7 ngày; <5/tuần → bỏ qua.
//
// M15 CHỈ MỔ VÀ BÁO CÁO. Sinh đề xuất sửa kịch bản là M16 (vòng 3) — đừng làm lấn.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { anthropic, aiExtras } from './llm.js';
import { pkGetConversations, pkGetMessages, pancakePages } from './pancake.js';
import { readLog, scriptVersionOf } from './ai-log.js';
import { getPageConfig, approxTokens } from './kb.js';
import { ORDER_STOP_TAGS } from './conv-owner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORT_FILE = () => path.resolve(ROOT, process.env.MINER_REPORT_FILE || 'miner-reports.jsonl');

const DAY_MS = 86400e3;
export const LOST_SAMPLE = 15;   // spec: 15 ca KHÔNG chốt nhiều lượt AI nhất
export const WON_SAMPLE_MAX = 10; // "toàn bộ ca chốt" — thực tế 1–5; trần để prompt không phình
export const MIN_CONVS_24H = 20;  // dưới ngưỡng này thì gộp 7 ngày
export const MIN_CONVS_7D = 5;    // dưới ngưỡng này thì bỏ qua, báo "chưa đủ dữ liệu"
export const PROMPT_CHAR_BUDGET = 12000; // ~3,7k token — spec chốt ~4k token vào

// ═══════════════════════════════════════════════════════════════════════════
// ① CHE PII — rào chắn cao nhất của module này
// ═══════════════════════════════════════════════════════════════════════════
//
// Hội thoại thật chứa SĐT, địa chỉ giao hàng, tên khách. Đây là module đầu tiên đọc
// hội thoại ở quy mô lớn và đẩy sang bên thứ ba (Anthropic/Moonshot). Thà che nhầm
// một câu còn hơn để lọt một số điện thoại.

const EMAIL_RE = /[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
// Chuỗi số có thể là SĐT — bắt rộng rồi ĐẾM CHỮ SỐ mới quyết định, để "109 SAR",
// "2-5 days", "18K" không bị che (giá và khung giao hàng là dữ liệu mổ cần giữ).
const DIGIT_RUN_RE = /\+?\d[\d\s()+.-]{4,20}\d/g;
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

// Từ khoá ĐỊA CHỈ MẠNH — thấy là che cả đoạn, không cần thêm dấu hiệu nào.
const ADDR_STRONG = /(\bstreets?\b|\bst\.\b|\broads?\b|\brd\.?\b|\bavenue\b|\bave\.?\b|\bvillas?\b|\bbuildings?\b|\bbldg\.?\b|\bapartments?\b|\bapt\.?\b|\bflat\b|\bfloor\b|\bblocks?\b|\bblk\.?\b|\bbarangays?\b|\bbrgy\.?\b|\bpurok\b|\bsubdivision\b|\bsubd\.?\b|\bcompound\b|\bdistricts?\b|\bsectors?\b|\bp\.?\s?o\.?\s?box\b|\bzip\b|\bpostal\b|\bhouse\s*(?:no|number|#)\b|\btirahan\b|\bbahay\b|شارع|حي\b|مبنى|شقة|بناية|طريق|منطقة|ص\.?ب)/i;
// Từ khoá YẾU — chỉ che khi đi kèm chữ số (địa chỉ thật gần như luôn có số nhà/khu).
const ADDR_WEAK = /(\bcity\b|\bprovince\b|\bemirate\b|\bnear\b|\bbehind\b|\bopposite\b|\bbeside\b|\blandmark\b|\bstate\b|\bzone\b|\blot\b|\bunit\b|مدينة|بجانب|خلف)/i;

// "my name is X" / "ako si X" / "الاسم: X" — che phần TÊN, giữ lại lời dẫn để mổ vẫn
// đọc được ngữ cảnh ("khách tự giới thiệu ở bước nào").
const NAME_LEAD_RE = /\b(my name is|name\s*[:=]|full name\s*[:=]?|ako(?:\s+po)?\s+si|pangalan ko(?:\s+ay)?|i am|i'?m|اسمي|الاسم\s*[:=]?)\s+([\p{Lu}\p{Lo}][\p{L}]{1,20}(?:\s+[\p{Lu}\p{Lo}][\p{L}]{1,20}){0,2})/giu;

const SPLIT_SEG = /([,،|;\n]|\s[-–—]\s)/; // giữ dấu tách khi split để ghép lại nguyên dạng
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const digitsOf = (s) => String(s).replace(/\D/g, '').length;

function nameVariants(names) {
  const out = new Set();
  for (const n of names || []) {
    const raw = String(n || '').trim();
    if (raw.length < 2) continue;
    out.add(raw);
    // Họ và tên rời: khách hay được gọi bằng đúng tên riêng ("Hi Amy").
    for (const part of raw.split(/\s+/)) if (part.length >= 3) out.add(part);
  }
  return [...out].sort((a, b) => b.length - a.length); // dài trước, tránh che nửa vời
}

/** Đoạn văn này là ĐỊA CHỈ? (dùng chung cho cả che lẫn soi lại) */
function isAddressSegment(seg) {
  const s = String(seg || '');
  if (!s.trim()) return false;
  if (ADDR_STRONG.test(s)) return true;
  return ADDR_WEAK.test(s) && /\d/.test(s);
}

/** Tên khách của các hội thoại KHÁC trong cùng lô — chỉ khớp NGUYÊN CỤM, không xé lẻ.
 *  Vì sao không xé: tên riêng của người khác mà tách ra từng chữ thì "Mahal", "Gold", "Set"
 *  của khách nào đó sẽ ăn mất chính những từ M15 sinh ra để đếm (phản đối giá, tên gói). */
const fullNames = (list) => [...new Set((list || []).map((s) => String(s || '').trim()).filter((s) => s.length >= 5))]
  .sort((a, b) => b.length - a.length);

/**
 * Che PII trước khi đưa vào prompt.
 * @param {string} text
 * @param {{names?:string[], otherNames?:string[], extras?:string[]}} opt
 *        names = tên khách CỦA HỘI THOẠI NÀY (che cả họ, cả tên riêng tách rời),
 *        otherNames = tên khách của hội thoại khác trong lô (chỉ che nguyên cụm),
 *        extras = chuỗi PII đã biết khác (địa chỉ trong đơn cũ...)
 */
export function maskPII(text, opt = {}) {
  let t = String(text == null ? '' : text);
  if (!t) return t;

  // ① Chuỗi PII ĐÃ BIẾT (chắc chắn nhất) — che trước để không bị các bước sau xé lẻ.
  for (const e of (opt.extras || [])) {
    const v = String(e || '').trim();
    if (v.length >= 4) t = t.replace(new RegExp(esc(v), 'gi'), '[ĐỊA CHỈ]');
  }
  // ② Email & mã định danh nội bộ (chứa chữ số → phải xử lý trước bước SĐT).
  t = t.replace(EMAIL_RE, '[EMAIL]').replace(UUID_RE, '[ID]');

  // ③ Địa chỉ — cắt theo ĐOẠN chứ không theo dòng. Xoá cả dòng thì một câu phản đối
  //    có chữ "city" cũng bay mất, mà objections chính là đầu ra quan trọng nhất.
  t = t.split('\n').map((line) => {
    const parts = line.split(SPLIT_SEG);
    let hit = false;
    const masked = parts.map((p, i) => {
      if (i % 2 === 1) return p;                    // dấu tách, giữ nguyên
      if (!isAddressSegment(p)) return p;
      hit = true;
      return p.match(/^\s*/)[0] + '[ĐỊA CHỈ]';
    });
    return hit ? masked.join('') : line;
  }).join('\n');

  // ④ Tên khách đã biết + mẫu tự giới thiệu.
  for (const n of [...nameVariants(opt.names), ...fullNames(opt.otherNames)]) {
    t = t.replace(new RegExp(`(^|[^\\p{L}])${esc(n)}(?=$|[^\\p{L}])`, 'giu'), '$1[TÊN]');
  }
  t = t.replace(NAME_LEAD_RE, (_m, lead) => `${lead} [TÊN]`);

  // ⑤ SĐT — sau cùng, vì địa chỉ đã che xong nên số còn lại phần lớn là SĐT/giá.
  t = t.replace(DIGIT_RUN_RE, (m) => {
    const n = digitsOf(m);
    if (n < PHONE_MIN_DIGITS) return m;                  // giá tiền, số ngày, số lượng
    return (m.match(/^\s*/) ? '' : '') + (n > PHONE_MAX_DIGITS ? '[SỐ]' : '[SĐT]');
  });

  return t;
}

/**
 * Soi lại: còn PII nào lọt không? Trả về DANH SÁCH loại lọt (rỗng = sạch).
 * Đối ngẫu với maskPII — dùng ở nghiệm thu (100 mẫu) và làm cầu dao trước khi gọi model.
 */
export function findPII(text, opt = {}) {
  const t = String(text == null ? '' : text);
  const hits = [];
  if (EMAIL_RE.test(t)) hits.push('email');
  EMAIL_RE.lastIndex = 0;
  if (UUID_RE.test(t)) hits.push('id');
  UUID_RE.lastIndex = 0;
  for (const m of t.matchAll(DIGIT_RUN_RE)) {
    if (digitsOf(m[0]) >= PHONE_MIN_DIGITS) { hits.push('sđt'); break; }
  }
  for (const line of t.split('\n')) {
    const parts = line.split(SPLIT_SEG);
    if (parts.some((p, i) => i % 2 === 0 && isAddressSegment(p))) { hits.push('địa chỉ'); break; }
  }
  for (const n of [...nameVariants(opt.names), ...fullNames(opt.otherNames)]) {
    if (new RegExp(`(^|[^\\p{L}])${esc(n)}($|[^\\p{L}])`, 'iu').test(t)) { hits.push('tên'); break; }
  }
  if (NAME_LEAD_RE.test(t)) hits.push('tên');
  NAME_LEAD_RE.lastIndex = 0;
  return [...new Set(hits)];
}

export const hasPII = (text, opt) => findPII(text, opt).length > 0;

// ═══════════════════════════════════════════════════════════════════════════
// ② ĐƯỜNG ỐNG ĐỌC HỘI THOẠI — dùng chung với template-learner (đừng gọi Pancake hai lần)
// ═══════════════════════════════════════════════════════════════════════════

const tsOf = (v) => {
  if (!v) return 0;
  const n = typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(n) ? n : 0;
};
const convMark = (c) => tsOf(c.last_customer_interactive_at || c.updated_at || c.inserted_at);
const msgText = (m) => String(m?.original_message || m?.message || '')
  .replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').trim();

/**
 * Chỉ mục Sổ AI cho 1 page trong khoảng thời gian: convId → lượt AI, đã chốt chưa, tên khách.
 * Nhờ chỉ mục này mà việc CHỌN MẪU không cần tải tin — chỉ tải tin cho ~25 hội thoại được chọn.
 */
export function aiLogIndex(pageId, { since = 0, rows } = {}) {
  const idx = new Map(); // convId -> {aiTurns, hasOrder, custId, name, lastAt}
  const byCust = new Map(); // custId -> convId (bản ghi cũ không phải dòng nào cũng có conv)
  const all = rows || readLog();
  for (const r of all) {
    if (String(r.page) !== String(pageId)) continue;
    if (r.t < since) continue;
    const conv = r.conv || byCust.get(String(r.cust)) || '';
    if (r.conv) byCust.set(String(r.cust), r.conv);
    if (!conv) continue;
    let e = idx.get(conv);
    if (!e) { e = { convId: conv, aiTurns: 0, hasOrder: false, custId: String(r.cust || ''), name: '', lastAt: 0 }; idx.set(conv, e); }
    if (r.name && !e.name) e.name = r.name;
    if (r.cust && !e.custId) e.custId = String(r.cust);
    if (r.t > e.lastAt) e.lastAt = r.t;
    if (r.type === 'reply') e.aiTurns++;
    else if (r.type === 'order') e.hasOrder = true;
  }
  return idx;
}

/** Rổ THẮNG / rổ MẤT theo spec: toàn bộ ca chốt + N ca không chốt nhiều lượt AI nhất. */
export function pickSamples(convs, { lost = LOST_SAMPLE, wonMax = WON_SAMPLE_MAX } = {}) {
  const won = convs.filter((c) => c.hasOrder).sort((a, b) => b.aiTurns - a.aiTurns).slice(0, wonMax);
  const rest = convs.filter((c) => !c.hasOrder).sort((a, b) => (b.aiTurns - a.aiTurns) || (b.lastAt - a.lastAt));
  return { won, lost: rest.slice(0, lost), wonTotal: convs.filter((c) => c.hasOrder).length, lostTotal: rest.length };
}

/**
 * Kéo hội thoại của 1 page về dạng chuẩn. MỘT lượt gọi danh sách + 1 lượt tải tin/hội thoại
 * ĐƯỢC CHỌN. Kết quả dùng chung cho M15 (mổ) và template-learner (học sổ template).
 *
 * ⚠️ `pkGetMessages` trả TỐI ĐA 25 tin/hội thoại (đo 11/08/2026) — hội thoại dài sẽ chỉ có
 * khúc đuôi. Đúng khúc cần cho "câu nào làm khách im", nhưng dropStage giai đoạn sớm có thể thiếu.
 */
export async function collectPageConvs(pageId, opt = {}) {
  const {
    now = Date.now(), rows, fetchConvs = pkGetConversations, fetchMsgs = pkGetMessages,
    lost = LOST_SAMPLE, wonMax = WON_SAMPLE_MAX,
  } = opt;

  const list = await fetchConvs(pageId) || [];
  const idx = aiLogIndex(pageId, { since: now - 7 * DAY_MS, rows });

  const norm = (c) => {
    const e = idx.get(c.id) || {};
    const stopTag = (c.tags || []).find((t) => ORDER_STOP_TAGS.has(Number(t)));
    return {
      convId: c.id,
      custId: (c.customers || [])[0]?.id || e.custId || '',
      custName: c.from?.name || e.name || '',
      psid: c.from_psid || '',
      tags: c.tags || [],
      mark: convMark(c) || e.lastAt || 0,
      aiTurns: e.aiTurns || 0,
      hasOrder: !!e.hasOrder || stopTag !== undefined,
      lastAt: Math.max(convMark(c), e.lastAt || 0),
      msgs: [],
    };
  };

  const all = list.map(norm).filter((c) => c.convId);
  const within = (d) => all.filter((c) => c.mark >= now - d * DAY_MS);
  const in24 = within(1);
  const in7 = within(7);

  // Mẫu nhỏ thì kết luận là nhiễu — spec §M15 ràng buộc 2 & 3.
  let pool; let windowDays;
  if (in24.length >= MIN_CONVS_24H) { pool = in24; windowDays = 1; }
  else if (in7.length >= MIN_CONVS_7D) { pool = in7; windowDays = 7; }
  else return { pageId: String(pageId), enough: false, windowDays: 7, seen: in7.length, convs: [], sample: { won: 0, lost: 0 } };

  const pick = pickSamples(pool, { lost, wonMax });
  const chosen = [...pick.won, ...pick.lost];
  for (const c of chosen) {
    try {
      const msgs = await fetchMsgs(pageId, c.convId, c.custId) || [];
      c.msgs = msgs.map((m) => ({
        who: String(m?.from?.id) === String(pageId) ? 'page' : 'cust',
        text: msgText(m),
        at: tsOf(m.inserted_at || m.created_time || m.updated_at),
      })).filter((m) => m.text);
    } catch (e) {
      c.msgs = []; c.fetchError = e.message;
    }
  }
  return {
    pageId: String(pageId), enough: true, windowDays,
    seen: pool.length, convs: chosen,
    sample: { won: pick.won.length, lost: pick.lost.length, wonTotal: pick.wonTotal, lostTotal: pick.lostTotal },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ③ DỰNG PROMPT (đã che PII) + ĐỌC KẾT QUẢ
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM = `Bạn là chuyên viên phân tích hội thoại bán hàng. Đầu vào là các hội thoại THẬT
(đã che thông tin cá nhân thành [TÊN] [SĐT] [ĐỊA CHỈ] — đó là dữ liệu bị che, KHÔNG phải lỗi).
Nhiệm vụ: chỉ ra BẰNG CHỨNG vì sao khách mua hoặc bỏ đi. Không đề xuất sửa kịch bản.

Trả DUY NHẤT một khối JSON, không lời dẫn, đúng khoá sau:
{
  "objections": [{"text": "<nguyên văn phản đối của khách, rút gọn ≤80 ký tự>", "count": <số ca>, "wonAfter": <số ca vẫn chốt sau phản đối này>, "lostAfter": <số ca mất>}],
  "killers":    [{"quote": "<nguyên văn câu PAGE nói mà sau đó khách im luôn>", "count": <số ca>}],
  "winners":    [{"quote": "<nguyên văn câu PAGE nói xuất hiện ngay trước khi chốt>", "count": <số ca>}],
  "dropStage":  {"sau_bao_gia": <n>, "sau_hoi_dia_chi": <n>, "sau_gui_anh": <n>, "sau_chao": <n>, "khac": <n>},
  "gaps":       [{"question": "<câu khách hỏi mà page KHÔNG trả lời được>", "count": <n>}],
  "langMix":    {"<mã ngôn ngữ>": <tỷ lệ 0..1>}
}
Luật: trích NGUYÊN VĂN, không dịch, không bịa. Chỉ nêu mục xuất hiện ≥2 lần trừ khi mẫu quá nhỏ.
objections/killers/winners/gaps tối đa 8 mục, xếp theo count giảm dần. Tổng langMix ≈ 1.`;

function renderConv(c, i, budget, otherNames = []) {
  const head = `### ${c.hasOrder ? 'CHỐT ĐƯỢC' : 'KHÔNG CHỐT'} · hội thoại ${i + 1} · ${c.aiTurns} lượt AI`;
  const names = [c.custName].filter(Boolean);
  const lines = [];
  let used = 0;
  // Lấy từ CUỐI lên: khúc đuôi là nơi đơn được chốt hoặc khách bỏ đi.
  for (let k = c.msgs.length - 1; k >= 0; k--) {
    const m = c.msgs[k];
    const safe = maskPII(m.text, { names, otherNames }).replace(/\s+/g, ' ').trim().slice(0, 220);
    if (!safe) continue;
    const line = `${m.who === 'page' ? 'PAGE' : 'KHÁCH'}: ${safe}`;
    if (used + line.length > budget) break;
    used += line.length + 1;
    lines.unshift(line);
  }
  return `${head}\n${lines.join('\n')}`;
}

/**
 * Phần THÂN prompt — toàn bộ hội thoại đã che PII. Tách riêng khỏi khối META vì cầu dao PII
 * chỉ được soi phần này: META là số của chính mình (chi phí/đơn 7 chữ số trông y hệt một số
 * điện thoại), soi cả META thì page nào đắt tiền là bị huỷ lượt mổ vĩnh viễn.
 */
export function renderBody(collected) {
  const convs = collected.convs || [];
  const perConv = Math.max(400, Math.floor(PROMPT_CHAR_BUDGET / Math.max(1, convs.length)));
  // Khách hay nhắc tên khách khác ("bạn tôi [TÊN] đã mua"). Che theo từng hội thoại thì tên
  // đó lọt; nên mỗi hội thoại còn được che thêm bằng tên NGUYÊN CỤM của cả lô.
  const otherNames = convs.map((c) => c.custName).filter(Boolean);
  return convs.map((c, i) => renderConv(c, i, perConv, otherNames)).join('\n\n');
}

/** Dựng prompt người dùng cho 1 page. Đã che PII ở từng tin. */
export function buildMinePrompt(collected, ctx = {}) {
  const body = ctx.body ?? renderBody(collected);
  const m = ctx.metrics || {};
  // Khối META cũng đi qua bộ che: kịch bản page thỉnh thoảng có số hotline/địa chỉ kho.
  // Không che thì cầu dao PII nổ mỗi đêm và page đó vĩnh viễn không được mổ.
  const meta = [
    `Page: ${maskPII(ctx.pageName || collected.pageId)}`,
    `Cửa sổ dữ liệu: ${collected.windowDays} ngày · ${collected.sample.won} ca chốt / ${collected.sample.lost} ca không chốt`,
    m.closeRate != null ? `Tỷ lệ chốt: ${m.closeRate}% · lượt/đơn: ${m.repliesPerOrder ?? '?'} · chi phí/đơn: ${m.vndPerOrder ?? '?'}đ` : '',
    ctx.scriptSummary ? `Kịch bản đang LIVE (${ctx.scriptVersion || '?'}): ${maskPII(ctx.scriptSummary)}` : '',
  ].filter(Boolean).join('\n');
  return `${meta}\n\n${body}`;
}

const clampNum = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0);
const clampStr = (v, n = 120) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n);

/** Đọc JSON model trả về — chịu được rào ``` và chữ thừa hai đầu. */
export function parseMineResult(raw) {
  const s = String(raw || '');
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : s;
  const i = body.indexOf('{'); const j = body.lastIndexOf('}');
  if (i === -1 || j <= i) throw new Error('model không trả về JSON');
  const j0 = JSON.parse(body.slice(i, j + 1));

  const arr = (v, keyName) => (Array.isArray(v) ? v : []).slice(0, 8).map((x) => ({
    [keyName]: clampStr(x?.[keyName] ?? x?.text ?? x?.quote ?? x?.question, 160),
    count: clampNum(x?.count),
    ...(keyName === 'text' ? { wonAfter: clampNum(x?.wonAfter), lostAfter: clampNum(x?.lostAfter) } : {}),
  })).filter((x) => x[keyName]);

  const obj = (v) => {
    const out = {};
    for (const [k, n] of Object.entries(v && typeof v === 'object' ? v : {})) {
      const key = clampStr(k, 40); if (key) out[key] = clampNum(n);
    }
    return out;
  };
  const lang = {};
  for (const [k, n] of Object.entries(j0.langMix && typeof j0.langMix === 'object' ? j0.langMix : {})) {
    const v = Number(n); if (Number.isFinite(v) && v > 0) lang[clampStr(k, 8)] = Math.min(1, +v.toFixed(2));
  }
  return {
    objections: arr(j0.objections, 'text'),
    killers: arr(j0.killers, 'quote'),
    winners: arr(j0.winners, 'quote'),
    dropStage: obj(j0.dropStage),
    gaps: arr(j0.gaps, 'question'),
    langMix: lang,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ④ MỔ 1 PAGE — đúng MỘT lời gọi model
// ═══════════════════════════════════════════════════════════════════════════

async function defaultCallModel(system, user) {
  const r = await anthropic.messages.create({
    model: config.modelClassifier,       // model RẺ — spec chốt ~110đ/page/đêm
    max_tokens: 1200,
    system,
    messages: [{ role: 'user', content: user }],
    ...aiExtras,
  });
  return {
    text: r.content?.find((b) => b.type === 'text')?.text || '',
    usage: {
      tin: r.usage?.input_tokens || 0,
      tout: r.usage?.output_tokens || 0,
      cread: r.usage?.cache_read_input_tokens || 0,
    },
  };
}

function scriptSummaryOf(pageId) {
  try {
    const cfg = getPageConfig(pageId) || {};
    const s = [cfg.greeting, cfg.tone, cfg.salesPrompt].filter(Boolean).join(' · ');
    return clampStr(s, 400);
  } catch { return ''; }
}

/**
 * Mổ 1 page. Trả về báo cáo theo schema §M15 (hoặc {skipped:true} khi chưa đủ dữ liệu).
 * @param {string} pageId
 * @param {object} opt  { now, rows, fetchConvs, fetchMsgs, callModel, metrics, pageName, collected }
 */
export async function minePage(pageId, opt = {}) {
  const now = opt.now || Date.now();
  const date = new Date(now).toISOString().slice(0, 10);
  const collected = opt.collected || await collectPageConvs(pageId, opt);

  if (!collected.enough) {
    return {
      pageId: String(pageId), date, skipped: true,
      reason: `chưa đủ dữ liệu (${collected.seen} hội thoại/7 ngày, cần ≥${MIN_CONVS_7D})`,
      seen: collected.seen, calls: 0, collected,
    };
  }

  const names = collected.convs.map((c) => c.custName).filter(Boolean);
  const pageName = opt.pageName || pancakeName(pageId);
  const scriptSummary = opt.scriptSummary ?? scriptSummaryOf(pageId);
  const body = renderBody(collected);
  const prompt = buildMinePrompt(collected, {
    pageName, scriptSummary, body,
    metrics: opt.metrics,
    scriptVersion: opt.scriptVersion ?? safeScriptVersion(pageId),
  });

  // ⛔ CẦU DAO PII — sót là HUỶ lượt, không "gửi rồi rút kinh nghiệm".
  // Soi phần DỮ LIỆU NGƯỜI KHÁC (hội thoại + kịch bản page), bằng tên NGUYÊN CỤM của mọi
  // khách trong lô — đúng luật mà bước che vừa dùng, nên hai bên không đá nhau.
  // `opt.scanPII` chỉ để test diễn tập cầu dao; mặc định luôn là findPII thật.
  const scan = opt.scanPII || findPII;
  const leak = scan([body, maskPII(scriptSummary), maskPII(pageName)].join('\n'), { otherNames: names });
  if (leak.length) {
    console.error(`[miner] 🔴 page ${pageId}: PII còn sót trong prompt (${leak.join(', ')}) → HUỶ lượt mổ`);
    return { pageId: String(pageId), date, skipped: true, reason: `PII còn sót: ${leak.join(', ')}`, piiLeak: leak, calls: 0, collected };
  }

  const callModel = opt.callModel || defaultCallModel;
  let out;
  try {
    out = await callModel(SYSTEM, prompt); // ĐÚNG 1 lời gọi — không retry, không vòng lặp
  } catch (e) {
    return { pageId: String(pageId), date, skipped: true, reason: `gọi model lỗi: ${e.message}`, calls: 1, collected };
  }

  let parsed;
  try { parsed = parseMineResult(out.text); }
  catch (e) { return { pageId: String(pageId), date, skipped: true, reason: `đọc kết quả lỗi: ${e.message}`, calls: 1, raw: String(out.text || '').slice(0, 400), collected }; }

  return {
    pageId: String(pageId), date,
    scriptVersion: opt.scriptVersion ?? safeScriptVersion(pageId),
    windowDays: collected.windowDays,
    sample: { won: collected.sample.won, lost: collected.sample.lost },
    ...parsed,
    calls: 1,
    promptTokens: approxTokens(prompt),
    usage: out.usage || {},
    collected, // đường ống dùng chung — template-learner ăn lại, không gọi Pancake lần hai
  };
}

function pancakeName(pageId) {
  try { return pancakePages().get(String(pageId))?.name || String(pageId); } catch { return String(pageId); }
}
function safeScriptVersion(pageId) {
  try { return scriptVersionOf(pageId); } catch { return 'unknown'; }
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ MỔ CẢ ĐÀN — tuần tự, giãn 30s/page
// ═══════════════════════════════════════════════════════════════════════════

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Mổ nhiều page tuần tự. onPage(report) chạy sau mỗi page — template-learner cắm vào đây
 * để dùng lại đúng dữ liệu vừa kéo.
 */
export async function mineAll(pageIds, opt = {}) {
  const { gapMs = 30e3, onPage, save = true } = opt;
  const ids = pageIds && pageIds.length ? pageIds : [...pancakePages().keys()];
  const t0 = Date.now();
  const reports = [];
  for (const [i, id] of ids.entries()) {
    if (i) await sleep(gapMs); // giãn 30s/page để không dồn tải Pancake
    let rep;
    try { rep = await minePage(id, opt); }
    catch (e) { rep = { pageId: String(id), date: new Date().toISOString().slice(0, 10), skipped: true, reason: `lỗi: ${e.message}`, calls: 0 }; }
    reports.push(rep);
    if (save) saveReport(rep);
    if (onPage) { try { await onPage(rep); } catch (e) { console.warn(`[miner] onPage lỗi (page ${id}):`, e.message); } }
    const tag = rep.skipped ? `bỏ qua — ${rep.reason}` : `${rep.objections.length} phản đối · ${rep.killers.length} câu giết · ${rep.winners.length} câu ăn`;
    console.log(`[miner] ${i + 1}/${ids.length} page ${id}: ${tag}`);
  }
  const mins = (Date.now() - t0) / 60000;
  console.log(`[miner] xong ${ids.length} page trong ${mins.toFixed(1)} phút · ${reports.filter((r) => !r.skipped).length} page có báo cáo · ${reports.reduce((a, r) => a + (r.calls || 0), 0)} lượt gọi model`);
  return { reports, minutes: +mins.toFixed(1), calls: reports.reduce((a, r) => a + (r.calls || 0), 0) };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ KHO BÁO CÁO (JSON Lines, append-only — cùng lối với Sổ AI)
// ═══════════════════════════════════════════════════════════════════════════

/** Bản ghi lưu xuống KHÔNG kèm `collected` (chứa hội thoại thô — không để PII nằm trên đĩa báo cáo). */
export function saveReport(rep) {
  try {
    const { collected, raw, ...clean } = rep;
    fs.appendFileSync(REPORT_FILE(), JSON.stringify({ ...clean, savedAt: Date.now() }) + '\n');
    return true;
  } catch (e) { console.error('[miner] lưu báo cáo lỗi:', e.message); return false; }
}

export function readReports({ pageId, from, to, limit = 500 } = {}) {
  let rows = [];
  try {
    const f = REPORT_FILE();
    if (!fs.existsSync(f)) return [];
    rows = fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
  return rows.filter((r) => (!pageId || String(r.pageId) === String(pageId))
    && (!from || r.date >= from) && (!to || r.date <= to)).slice(-limit).reverse();
}

/** Báo cáo mới nhất của mỗi page — nguồn cho dashboard. */
export function latestReports() {
  const m = new Map();
  for (const r of readReports({ limit: 5000 }).reverse()) m.set(String(r.pageId), r);
  return [...m.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
