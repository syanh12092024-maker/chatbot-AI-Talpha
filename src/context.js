// M07 · CONTEXT BUILDER — hồ sơ khách NÉN thay cho 20 tin thô.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M07
//
// VÌ SAO: đo thật → input 2.906 token/lượt, phần lớn là 20 tin lịch sử nạp lại MỖI LƯỢT.
// Trong đó 13,7% tin page là RÁC ("<div></div>", "...") và một phần lớn là template Botcake —
// tốn tiền để model đọc thứ không mang thông tin, rồi vẫn hỏi lại khách những thứ khách đã cho
// (thông tin nằm rải rác ở tin thứ 14 thì model bỏ sót).
//
// Thay bằng:  [HỒ SƠ KHÁCH ~150 token]  +  [6 tin gần nhất]
// Hồ sơ dựng bằng REGEX + tham số tool (0 token thêm), lưu bền ở conv-state.json nên
// restart server giữa hội thoại thì AI vẫn nhớ khách là ai — không chào lại từ đầu.

import { cleanText } from './text.js';
import { isAutomationTemplate } from './bot-registry.js';
import { hasPhone, hasAddress, scanSignals } from './lead-score.js';
import { extractMoney, allowedPrices } from './outbound-guard.js';
// DÙNG LẠI luật chào của M05, KHÔNG viết bản thứ hai: `conv-owner.js#isJustGreeting` đã
// phân biệt "chỉ chào" với "câu hỏi thật" và đã được hiệu chỉnh trên tin thật (nó cố ý
// lệch một chiều: không chắc thì coi là CÂU HỎI THẬT). Hai bản luật chào là hai sự thật.
// Không có vòng nhập: conv-owner và các phụ thuộc của nó không nhập context.js.
import { isJustGreeting } from './conv-owner.js';

// ─────────────────────────────────────────────────────────────────────────────
// PING RỖNG — tin của khách KHÔNG mang tin mới, đừng để nó chiếm chỗ trong cửa sổ
//
// Cửa sổ 6 tin trước đây chọn theo VỊ TRÍ: sáu dòng cuối, bất kể chúng nói gì. Khách im
// mấy ngày rồi gõ "hello" · "?" · "are you there" là ba slot bay mất, đẩy đúng đoạn tư
// vấn đang dở ra ngoài — trong khi ba dòng đó không thêm một dữ kiện nào cho model.
//
// ⚠️ TẬP NÀY CỐ Ý HẸP. "ok" · "yes" · "sige" · "opo" KHÔNG phải ping: sau một câu báo giá
// chúng là TÍN HIỆU MUA, bỏ đi là bỏ đúng lượt chốt. Chỉ bỏ lời chào và tiếng gọi suông.
//
// Chỉ áp cho dòng của KHÁCH. Lời chào của chính bot thường kèm luôn câu chào hàng, cắt
// theo cùng một thước là cắt mất nội dung.
const GOI_SUONG = /^(?:\?+|po+|sir+|ma'?am|maam|boss|hello+|helo+|hi+|are\s+you\s+there|you\s+there|still\s+there|any\s*one|anybody|reply|answer|up|nasaan\s+ka|hoy)[\s\p{P}]*$/iu;

/** Dòng này của khách có phải PING rỗng không (chào suông / gọi suông / chỉ dấu câu)? */
export function laPingKhach(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  // CHỈ dấu câu mới là ping. KHÔNG dùng "không có chữ cái nào": "1" là SỐ LƯỢNG khách
  // trả lời cho câu "ilan po?", và "👍" là đồng ý — bỏ hai thứ đó là bỏ đúng lượt chốt.
  if (/^[\s\p{P}]+$/u.test(t)) return true;      // "???" · "..." · "—"
  if (isJustGreeting(t)) return true;
  return GOI_SUONG.test(t);
}

/**
 * Chọn cửa sổ tin đưa vào prompt theo NỘI DUNG, không theo vị trí.
 * Giữ nguyên thứ tự thời gian và giữ nguyên trần `recent` — cùng số token, đúng tin hơn.
 */
export function chonCuaSo(rows, recent = RECENT_MSGS) {
  const dac = rows.filter((r) => !(r.role === 'user' && laPingKhach(r.text)));
  // Cả cửa sổ toàn ping (khách mới chỉ chào) ⇒ giữ phép cũ. Thà thừa còn hơn trống rỗng:
  // model không có ngữ cảnh nào còn tệ hơn model đọc một câu chào.
  return (dac.length ? dac : rows).slice(-recent);
}

export const RECENT_MSGS = 6;       // số tin nguyên văn giữ lại
export const MSG_MAX_CHARS = 300;   // cắt mỗi tin (spec §M07)
export const HYDRATE_MAX_MSGS = 20; // chỉ dùng ĐÚNG MỘT LẦN lúc dựng hồ sơ lần đầu

// ─────────────────────────────────────────────────────────────────────────────
// Hồ sơ khách
// ─────────────────────────────────────────────────────────────────────────────

export function emptyProfile() {
  return {
    name: '', phone: '', address: '', city: '',
    // TÊN FACEBOOK — CHỈ để xưng hô, TUYỆT ĐỐI không phải `name` của đơn.
    //
    // Đo 25/09: 8/8 tin khách mang sẵn `from.name`, nên lấy được miễn phí ngay trong lịch
    // sử — không cần đụng bộ nạp, CSDL hay migration. Nhưng KHÔNG được đổ vào `prof.name`:
    // `name` đi thẳng vào `create_draft_order` (tên người nhận hàng) và vào `missingSteps`.
    // Tên Facebook thật trên page này gồm "Napagod Na Ako" · "Alas Uno" · "Rich Chie" —
    // đổ vào `name` là bot thôi hỏi tên thật RỒI đẩy chuỗi đó xuống POS làm tên nhận hàng.
    // Hai trường, hai việc: `tenFb` để gọi khách, `name` để ghi đơn.
    tenFb: '',
    tier: '',            // gói/combo khách đang nhắm
    qty: 0,
    total: '',           // tổng tiền đã chốt (chỉ từ tham số tool — không bịa)
    cod: false,          // khách đã xác nhận COD
    imagesSent: [],      // loại ảnh đã gửi (feedback, chứng nhận...)
    objections: [],      // phản đối đã nêu
    ordered: false,      // đã gọi create_draft_order thành công
    // ── VIỆC 2 · BOT KHÁC ĐÃ NÓI GÌ ─────────────────────────────────────────
    // Botcake/RTO nói cùng một khách nhưng hệ thống mình KHÔNG ghi nhận → AI chào
    // lại, báo giá lại, gửi ảnh trùng. `cleanHistory` cố ý VỨT template khỏi ngữ
    // cảnh (đúng: đưa nguyên văn vào prompt là dạy model bắt chước đúng thứ
    // HARD_RULES cấm) — nên phải bóc thành DỮ KIỆN trước khi vứt.
    otherBot: {
      greeted: false,      // đã có bot khác chào
      quotedPrice: false,  // đã có bot khác báo giá
      sentImages: false,   // đã có bot khác gửi ảnh
      askedAddress: false, // đã có bot khác xin tên/SĐT/địa chỉ
      orderNoted: false,   // đã có bot khác báo "đơn đã tạo"
      // CON SỐ, không chỉ cái cờ. `quotedPrice: true` nói "đã báo giá" mà không nói BÁO
      // GIÁ NÀO — vô dụng đúng lúc cần nhất. Đo 22/09 trên 99 hội thoại thật: chiến dịch
      // cũ của page vẫn phát 99 SAR (73 lần) và 149 SAR (71 lần), NHIỀU HƠN giá đang chạy
      // 109/159 (46 và 35 lần). Model đọc 99 trong ngữ cảnh rồi nhắc lại ⇒ 7 lượt bị cửa
      // ra chặn PRICE_MISMATCH. Giữ lại con số thì mới đính chính được cho khách.
      giaDaBao: [],
    },
    // ── TRẠNG THÁI KHÁCH — thứ hồ sơ cũ không có chỗ để ghi ─────────────────
    // Ca thật (Siti Labangin, 22/09): khách nói ở Philippines rồi chào tạm biệt HAI lần,
    // lượt sau bot vẫn "Hello po! Welcome back 😊 … are you in Saudi Arabia now?" rồi dội
    // lại checklist địa chỉ. Ngữ cảnh CÓ trong prompt — nhưng khối hồ sơ vẫn đều đặn in
    // "Bước còn thiếu: … địa chỉ …" nên model đi xin địa chỉ của người không giao được.
    ngoaiVung: '',       // nơi khách nói đang ở, khi nơi đó KHÔNG thuộc vùng giao
    daTuChoi: false,     // khách đã chào tạm biệt / từ chối mua
    // CÓ MỘT ĐƠN ĐANG TRONG CUỘC — `{trangThai, cau, nguon}` hoặc null.
    //
    // Ca thật Rosalinda Ballesteros 24/09. Sale gõ "Your order has been cancelled.", khách
    // hỏi "Bkit po cancelled po sir", bot đáp "Wala pa po akong natatanggap na order
    // details from you" — nói với một người vừa bị huỷ đơn rằng chưa hề có đơn nào.
    //
    // Dựng lại ngữ cảnh thì thấy bot ĐỌC ĐƯỢC câu huỷ đơn: nó nằm ngay trong cửa sổ 6 tin.
    // Nhưng khối hồ sơ lại in "Tên (chưa có) · SĐT (chưa có) · Bước còn thiếu: tên, SĐT,
    // địa chỉ…" như một sự thật nội bộ, và model tin khối hồ sơ hơn tin hội thoại.
    //
    // `otherBot.orderNoted` đã có sẵn và `OB_ORDER` KHỚP câu đó — nhưng `absorbOtherBot`
    // chỉ được gọi cho tin bị nhận là MẪU MÁY, mà câu này do sale thật gõ. Dữ kiện rơi
    // đúng khe đó. Nay bóc cho MỌI tin của page, và giữ cả TRẠNG THÁI chứ không chỉ cờ.
    // `nguon`: 'page' (sale/bot khác nói) hoặc 'khach' (chính khách nói). Một trường, hai
    // nguồn — vì thứ đổi hành vi là «có đơn đang trong cuộc», không phải «ai nói ra».
    //
    // Ca thật Tara Singh 24/09 cho thấy vì sao phải có cả phía KHÁCH: sale chỉ viết "We
    // will notify the shipping company to re-deliver your order" — không khớp mẫu trạng
    // thái nào. Tín hiệu rõ nhất lại nằm ở câu của khách: "The delivery was scheduled for
    // today", "I do not want this order", "fifteen days". Bắt một phía là hụt ca này.
    donDaCo: null,
    hydratedAt: 0,
  };
}

const PHONE_CAND = /\+?\d[\d\s().-]{5,18}\d/;
const NAME_LABEL = /(?:my name is|my name's|i am|i'?m|this is|ako si|ako po si|pangalan ko(?: po)?(?: ay)?|name\s*[:=-]|pangalan\s*[:=-]|اسمي|الاسم\s*[:=-])\s*([\p{L}][\p{L}\s.'-]{1,40})/iu;
const NAME_LINE = /^[\p{L}][\p{L}.'-]+(?:\s+[\p{L}][\p{L}.'-]+){1,3}$/u;
const TIER_TEXT = /\b(set\s*\d+|combo\s*\d+|buy\s*\d+\s*get\s*\d+|package\s*\d+|\d+\s*(?:pcs|pieces|bottles|boxes))\b/i;
const COD_OK = /\b(cod|cash on delivery)\b[^.\n]{0,30}\b(ok|okay|sige|yes|opo|oo|sure|fine|deal|go)\b|\b(ok|okay|sige|yes|opo|oo|sure|fine|deal|go)\b[^.\n]{0,30}\b(cod|cash on delivery)\b|bayad (?:na lang )?pagdating|pay upon delivery|الدفع عند الاستلام/i;

function firstPhone(text) {
  const m = String(text || '').match(PHONE_CAND);
  if (!m) return '';
  const d = m[0].replace(/\D/g, '');
  return d.length >= 8 && d.length <= 15 ? m[0].trim() : '';
}

// Địa chỉ: giữ NGUYÊN VĂN câu/dòng chứa địa chỉ (model cần chi tiết để điền tool), cắt 90 ký tự.
function firstAddress(text) {
  const parts = String(text || '').split(/[\n;]+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) if (hasAddress(p)) return p.slice(0, 1000);
  return hasAddress(text) ? String(text).trim().slice(0, 1000) : '';
}

function firstName(text) {
  const s = String(text || '');
  const m = s.match(NAME_LABEL);
  if (m) return m[1].trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!hasPhone(s)) return '';
  for (const line of s.split(/[\n,·|]+/)) {
    const l = line.trim();
    if (l.length >= 4 && l.length <= 40 && !/\d/.test(l) && NAME_LINE.test(l)) return l;
  }
  return '';
}

/**
 * Rút thông tin từ MỘT tin khách vào hồ sơ (regex, 0 token).
 * Chỉ GHI ĐÈ khi trước đó chưa có — thông tin khách cho lần đầu là thông tin đúng;
 * tin sau nhắc lại lem nhem không được phép xoá nó.
 */
export function extractFromText(text, prof = emptyProfile()) {
  const s = String(text || '');
  if (!s.trim()) return prof;

  if (!prof.phone) { const p = firstPhone(s); if (p) prof.phone = p; }
  if (!prof.address) { const a = firstAddress(s); if (a) prof.address = a; }
  if (!prof.name) { const n = firstName(s); if (n) prof.name = n; }
  if (!prof.tier) { const t = s.match(TIER_TEXT); if (t) prof.tier = t[0].trim(); }
  const codDenied = /(?:no|not|don't|dont|hindi|ayaw|không).{0,35}\bcod\b|\bcod\b.{0,25}(?:not|cancel|không)/i.test(s);
  if (codDenied) prof.cod = false;
  else if (!prof.cod && COD_OK.test(s)) prof.cod = true;

  for (const k of scanSignals(s)) {
    if (k.startsWith('obj_') && !prof.objections.includes(k)) prof.objections.push(k);
  }
  // Hai dữ kiện ĐỔI HẲN việc phải làm ở lượt sau — xem khối ghi chú ở `noiNgoaiVung`.
  // `ngoaiVung` chỉ GHI ĐÈ khi chưa có: khách nói "I'm in Philippines" một lần là đủ,
  // câu sau nhắc lại "Saudi" không được xoá nó (cùng luật với tên/SĐT/địa chỉ).
  if (!prof.ngoaiVung) { const n = noiNgoaiVung(s); if (n) prof.ngoaiVung = n; }
  // `daTuChoi` thì NGƯỢC LẠI — bật/tắt theo lượt mới nhất: khách chào tạm biệt rồi quay
  // lại hỏi giá là đã đổi ý, giữ cờ cũ thì bot câm với một người đang muốn mua.
  if (!prof.donDaCo) { const d = donTuTinKhach(s); if (d) prof.donDaCo = d; }
  if (khachTuChoi(s)) prof.daTuChoi = true;
  else if (prof.daTuChoi && (TIER_TEXT.test(s) || hasPhone(s) || hasAddress(s))) prof.daTuChoi = false;
  return prof;
}

/** Chỉ ghi nhớ dữ liệu đơn đã được backend xác nhận, không tin tham số model. */
export function absorbToolUses(messages = [], prof = emptyProfile()) {
  const orders = new Set();
  for (const m of messages) {
    if (m?.role !== 'assistant' || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b?.type === 'tool_use' && b.name === 'create_draft_order' && b.id) orders.add(b.id);
    }
  }
  for (const m of messages) {
    if (m?.role !== 'user' || !Array.isArray(m.content)) continue;
    for (const b of m.content) {
      if (b?.type !== 'tool_result' || b.is_error || !orders.has(b.tool_use_id)) continue;
      let result;
      try { result = JSON.parse(b.content); } catch { continue; }
      if (result?.ok !== true || !result.order || typeof result.order !== 'object') continue;
      const inp = result.order;
      if (inp.name) prof.name = String(inp.name).slice(0, 40);
      if (inp.phone) prof.phone = String(inp.phone).slice(0, 20);
      if (inp.address) prof.address = [inp.address, inp.city].filter(Boolean).join(', ').slice(0, 1000);
      if (inp.city) prof.city = String(inp.city).slice(0, 40);
      if (inp.variant) prof.tier = String(inp.variant).slice(0, 40);
      if (inp.qty) prof.qty = Number(inp.qty) || 0;
      if (inp.total_price) prof.total = String(inp.total_price);
      if (inp.cod_confirmed === true) prof.cod = true;
    }
  }
  // send_product_image chỉ xếp hàng, chưa xác nhận giao ảnh thành công.
  return prof;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dọn rác lịch sử — spec §M07 "Dọn rác trước khi nạp"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @returns {Array<{role:'user'|'assistant', text:string}>} cũ → mới, đã bỏ rác
 */
// Bóc DỮ KIỆN từ một tin của bot khác. Không giữ chữ, chỉ giữ "chuyện gì đã xảy ra".
const OB_PRICE  = /(\d[\d.,]*\s*(sar|aed|kwd|qar|omr|bhd)|price|presyo|magkano|السعر)/i;
const OB_GREET  = /(how can (we|i).{0,30}help|hi\b|hello|kumusta|welcome|interested in our)/i;
const OB_ADDR   = /(full name|contact number|complete address|provide the information|pangalan|tirahan|العنوان)/i;
const OB_ORDER  = /(your order (is|has been)|order number|đơn hàng|placed an order)/i;
export function absorbOtherBot(text, hasAttach, prof) {
  if (!prof || !prof.otherBot) return prof;
  const o = prof.otherBot;
  const t = String(text || '');
  if (hasAttach) o.sentImages = true;
  if (OB_ORDER.test(t)) o.orderNoted = true;
  else if (OB_ADDR.test(t)) o.askedAddress = true;
  else if (OB_PRICE.test(t)) o.quotedPrice = true;
  else if (OB_GREET.test(t)) o.greeted = true;
  // GIỮ CON SỐ trước khi vứt câu. Dùng lại `extractMoney` của cửa ra — cùng một phép đọc
  // tiền cho cả chiều vào và chiều ra, không đẻ bản thứ hai.
  if (!Array.isArray(o.giaDaBao)) o.giaDaBao = [];
  for (const n of extractMoney(t)) {
    if (o.giaDaBao.length >= 6) break;
    if (!o.giaDaBao.includes(n)) { o.giaDaBao.push(n); o.quotedPrice = true; }
  }
  return prof;
}

// ── TRẠNG THÁI KHÁCH ────────────────────────────────────────────────────────
// Cả hai đều LỆCH MỘT CHIỀU có chủ ý: bắt hụt thì hệ chạy y như cũ, bắt nhầm thì bot im
// với một người đang muốn mua. Nên chỉ bắt câu nói THẲNG, không suy diễn.
//
// `NOI_KHAC` không phải "mọi nước trên đời" mà là những nơi KHÁCH CỦA PAGE NÀY hay nói —
// lao động Philippines/Nam Á ở vùng Vịnh nhắn về quê hoặc về nước bên cạnh. Page nào giao
// vùng khác thì sửa danh sách, đừng sửa luật.
const NOI_KHAC = /\b(philippines?|pilipinas|pinas|manila|cebu|davao|bangladesh|india|pakistan|nepal|indonesia|vietnam|egypt|sudan|yemen|jordan|lebanon)\b/i;

// PHẢI có dấu hiệu «chính khách ở đó» hoặc «giao tới đó» ngay trước tên nơi. Nhắc tên
// nước bâng quơ thì không tính.
const TRUOC_NOI = /\b(?:i\s*(?:a|')?m|im|i\s+live|i\s+stay|i\s+work|ako|nasa|dito|sa|deliver(?:y|ing)?|ship(?:ping)?|send|from|to)\b[^.\n]{0,22}$/i;
// …và KHÔNG phải nói về người khác. Đo lần đầu bắt nhầm "my friend in india bought it" —
// bắt nhầm ở đây là bot từ chối một người ĐANG MUỐN MUA, tệ hơn hẳn bắt hụt.
const NGUOI_KHAC = /\b(?:friend|kaibigan|sister|brother|cousin|tita|tito|someone|colleague|officemate|kapatid)\b[^.\n]{0,22}$/i;

/** Khách có nói đang ở NƠI KHÁC (ngoài vùng giao) không? Trả tên nơi, hoặc ''. */
export function noiNgoaiVung(text) {
  const t = String(text || '');
  const m = NOI_KHAC.exec(t);
  if (!m) return '';
  const truoc = t.slice(0, m.index);
  if (NGUOI_KHAC.test(truoc)) return '';
  return TRUOC_NOI.test(truoc) ? m[0] : '';
}

// Chỉ bắt câu nói THẲNG lời chia tay hoặc từ chối. "ok" · "yes" · "hm" KHÔNG tính — đó là
// tiếng ừ hữ giữa cuộc, bắt nhầm là bot câm với một người đang muốn mua.
// Đo 24/09 ca Rosalinda: ba câu từ chối LỌT HẾT vì tập này chỉ có tiếng Anh và hai chữ
// Tagalog. Khách Philippines từ chối bằng lời lịch sự — "salamat na lang" (thôi cảm ơn),
// "hwag na" (thôi khỏi), "di na po". Viết tắt kiểu nhắn tin: nlng · wag · dpo.
const TU_CHOI = /\b(?:bye+|goodbye|good\s*bye|no\s*thanks?|not\s+interested|maybe\s+next\s+time|next\s+time|ayaw|hindi\s+na|cancel\s+(?:na|it|my\s+order))\b|\b(?:h?wag\s*(?:na|n?lng|na\s*lang)|salamat\s*(?:na\s*lang|n?lng)|d[ie]?\s*na\s*(?:po|lang)|hindi\s*n?a?\s*po\s*salamat)\b/i;

// ── CÂU HỎI GIAO HÀNG MÀ MẪU CỨNG KHÔNG TRẢ LỜI ĐƯỢC ────────────────────────────────
//
// Mẫu `fastLaneShip` trả lời đúng MỘT câu: «bao lâu, bao nhiêu tiền». Nó không biết khách
// đang ở đâu và không biết khách đã có đơn hay chưa, nên hai loại câu dưới đây lọt vào mẫu
// là trả lời trật đề:
//
//   ① KHÁCH NÊU ĐỊA ĐIỂM — "Deliver riyadh" là hỏi CÓ GIAO TỚI ĐÓ KHÔNG. Mẫu đáp "Your
//      order is free delivery dear / It take 2-5 days" — không hề xác nhận Riyadh. Bot của
//      Pancake cùng lượt đó đáp "Yes Faisal, we deliver to Riyadh 😊 … How many sets would
//      you like — and may I have your contact number and complete address?": gọi tên, xác
//      nhận đúng nơi, rồi đẩy sang bước sau.
//   ② KHÁCH NÓI VỀ ĐƠN ĐÃ CÓ — "The delivery was scheduled for today" là hỏi về một đơn
//      đang chờ, không phải hỏi chính sách giao hàng. Đáp bảng thời gian là vô nghĩa.
//
// Danh sách địa danh là của TỪNG THỊ TRƯỜNG, giống `NOI_KHAC` ở trên: page này giao nội địa
// Ả Rập Xê Út. Page bán ở nơi khác thì sửa danh sách, đừng sửa luật.
const NOI_TRONG_VUNG = /\b(riyadh|riyad|riaydh|jeddah|jedah|jiddah|dammam|khobar|dhahran|makkah|mecca|madinah|medina|taif|tabuk|abha|jubail|yanbu|hail|qassim|buraidah|najran|jazan|al\s*ahsa|hofuf|ksa|saudi(?:\s*arabia)?)\b/i;
// Dấu hiệu khách đang nói về MỘT ĐƠN ĐÃ CÓ, không phải hỏi chính sách.
const DON_DA_CO = /\b(?:my\s+order|the\s+(?:order|delivery|parcel|package)|scheduled|already\s+(?:order|paid)|na\s+order|hasn'?t\s+(?:arrived|come)|not\s+(?:yet\s+)?(?:arrived|received|delivered)|wala\s+pa|hindi\s+pa\s+dumating|tracking)\b/i;

/**
 * Câu hỏi giao hàng này có VƯỢT QUÁ thứ mẫu cứng trả lời được không?
 * Lệch một chiều: nghi ngờ thì cho lên model — trả lời trật đề tốn nhiều hơn 87 đồng.
 */
export function shipVuotMau(text) {
  const t = String(text || '');
  if (!t.trim()) return false;
  return NOI_TRONG_VUNG.test(t) || DON_DA_CO.test(t) || !!noiNgoaiVung(t);
}

// ── ĐƠN MÀ KÊNH KHÁC ĐÃ XỬ LÝ ───────────────────────────────────────────────────────
// Thứ tự xét là thứ tự ƯU TIÊN: trạng thái nặng nhất thắng. Lệch một chiều — bắt hụt thì
// hệ chạy như cũ, bắt nhầm thì bot tưởng khách đã có đơn và thôi bán.
const DON_TRANG_THAI = [
  ['đã huỷ', /\b(?:order|đơn)[^.\n]{0,24}\b(?:cancel(?:led|ed)?|huỷ|huy)\b|\bcancel(?:led|ed)\b[^.\n]{0,16}\b(?:order|đơn)\b/i],
  ['khách CHƯA nhận được hàng', /\b(?:haven'?t|hasn'?t|not)\s+(?:yet\s+)?receiv\w*[^.\n]{0,16}\border\b|\border\b[^.\n]{0,24}\b(?:not|haven'?t|hasn'?t)\s+(?:yet\s+)?(?:arriv|receiv|deliver)\w*/i],
  ['đang giao', /\byour order (?:is|has been)\s+(?:being\s+)?(?:ship|dispatch|on its way|out for delivery)\w*/i],
  ['đã tạo', /\byour order (?:has been|is)\s+(?:creat|confirm|receiv|plac)\w*|\border number\b|\bplaced an order\b/i],
];

/** Tin của PAGE có nói về một ĐƠN đã tồn tại không? Trả `{trangThai, cau, nguon}` hoặc null. */
export function donTuTinPage(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  for (const [trangThai, re] of DON_TRANG_THAI) {
    if (re.test(t)) return { trangThai, cau: t.replace(/\s+/g, ' ').trim().slice(0, 120), nguon: 'page' };
  }
  return null;
}

// Phía KHÁCH. Hẹp hơn phía page: chỉ bắt câu nói THẲNG về một đơn/chuyến giao ĐANG CÓ,
// không bắt câu hỏi mua hàng. Bắt nhầm ở đây là bot thôi bán với người đang muốn mua.
const KHACH_NOI_VE_DON = [
  ['khách KHÔNG muốn nhận nữa', /\b(?:i\s+d(?:o\s+not|on'?t)\s+want|don'?t\s+want)\b[^.\n]{0,24}\b(?:this\s+)?(?:order|item|product|delivery|parcel)\b|\bcancel\s+(?:my|the)\s+order\b|\bhindi\s+ko\s+na\s+kukunin\b/i],
  ['khách đang hỏi về chuyến giao', /\bthe\s+(?:delivery|order|parcel|package|courier|rider)\b[^.\n]{0,40}\b(?:was|is|has|scheduled|today|tomorrow|call(?:ed)?|came|arriv\w*)\b|\bdelivery\s+(?:boy|guy|man|person|staff)\b/i],
  ['khách nói ĐƠN CŨ chưa xong', /\b(?:my|the)\s+order\b[^.\n]{0,30}\b(?:not|haven'?t|hasn'?t|still|delay\w*|late)\b|\bwala\s+pa\b[^.\n]{0,20}\border\b|\b(?:fifteen|[0-9]{1,2})\s+days?\b[^.\n]{0,24}\b(?:order|deliver\w*|waiting)\b/i],
];

/** Câu của KHÁCH có nói về một ĐƠN đã tồn tại không? Trả `{trangThai, cau, nguon}` hoặc null. */
export function donTuTinKhach(text) {
  const t = String(text || '');
  if (!t.trim()) return null;
  for (const [trangThai, re] of KHACH_NOI_VE_DON) {
    if (re.test(t)) return { trangThai, cau: t.replace(/\s+/g, ' ').trim().slice(0, 120), nguon: 'khach' };
  }
  return null;
}

/** Khách đã chào tạm biệt / từ chối chưa? */
export const khachTuChoi = (text) => TU_CHOI.test(String(text || ''));

export function cleanHistory(msgs = [], pageId, prof = null) {
  const out = [];
  for (const m of msgs) {
    const isPage = String(m?.from?.id) === String(pageId);
    const raw = (m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const hasAttach = (m?.attachments || []).length > 0;
    if (isPage) {
      // Tin page RỖNG (sticker/ảnh/"...") = 13,7% tin page — không mang thông tin, bỏ.
      if (!raw || /^\.{2,}$/.test(raw)) continue;
      // BÓC TRẠNG THÁI ĐƠN TRƯỚC MỌI NHÁNH KHÁC. `absorbOtherBot` phía dưới chỉ chạy cho
      // tin bị nhận là MẪU MÁY; câu quyết định nhất lại thường do SALE THẬT gõ ("Your
      // order has been cancelled."), nên nó rơi khỏi mọi đường bóc. Xem `donKenhKhac`.
      if (prof) { const d = donTuTinPage(raw); if (d) prof.donDaCo = d; }
      // Template Botcake/RTO — KHÔNG đưa nguyên văn vào prompt (dạy model bắt chước
      // đúng thứ HARD_RULES cấm), nhưng phải BÓC DỮ KIỆN trước khi bỏ (việc 2).
      if (isAutomationTemplate(raw)) { absorbOtherBot(raw, hasAttach, prof); continue; }
      const t = cleanText(raw, MSG_MAX_CHARS);
      if (t) out.push({ role: 'assistant', text: t });
    } else {
      const t = raw ? cleanText(raw, MSG_MAX_CHARS) : (hasAttach ? '(khách gửi ảnh/đính kèm)' : '');
      if (t) out.push({ role: 'user', text: t });
    }
  }
  return out;
}

/**
 * Tên Facebook của khách, lấy từ tin ĐẦU TIÊN không phải của page.
 * Rẻ tuyệt đối: payload đã có sẵn, không thêm một lời gọi nào.
 */
export function tenFbTu(msgs = [], pageId) {
  for (const m of msgs) {
    if (String(m?.from?.id) === String(pageId)) continue;
    const t = String(m?.from?.name || '').trim();
    if (t) return t.slice(0, 60);
  }
  return '';
}

/** Dựng hồ sơ lần đầu từ tối đa 20 tin Pancake — CHỈ CHẠY MỘT LẦN cho mỗi hội thoại. */
export function hydrateProfile(msgs = [], pageId, prof = emptyProfile()) {
  for (const m of msgs.slice(-HYDRATE_MAX_MSGS)) {
    const raw = (m?.original_message || m?.message || '').replace(/<[^>]*>/g, ' ').trim();
    if (String(m?.from?.id) === String(pageId)) {
      // VIỆC 2 — tin của PAGE: không mang thông tin đơn, nhưng nói cho biết
      // Botcake/sale đã chào/báo giá/gửi ảnh/xin địa chỉ chưa. Đây là lần DUY NHẤT
      // hệ thống đọc 20 tin thô, nên phải bóc ở đây, không thì mất luôn.
      if (isAutomationTemplate(raw)) absorbOtherBot(raw, (m?.attachments || []).length > 0, prof);
      continue;
    }
    if (raw) extractFromText(raw, prof);
  }
  prof.hydratedAt = Date.now();
  return prof;
}

// ─────────────────────────────────────────────────────────────────────────────
// Khối hồ sơ đưa vào LLM (~150 token)
// ─────────────────────────────────────────────────────────────────────────────

const OBJ_LABEL = { obj_price: 'chê đắt', obj_trust: 'nghi hàng giả', obj_wait: 'để nghĩ thêm' };

// ─────────────────────────────────────────────────────────────────────────────
// MẠCH TƯ VẤN — thứ hồ sơ KHÔNG giữ được, và cửa sổ 6 tin làm rơi mất
//
// Hồ sơ nén giữ DỮ KIỆN (tên, SĐT, gói, phản đối, bước còn thiếu) nên khách quay lại sau
// mấy ngày thì bot vẫn không hỏi lại thứ khách đã cho. Nhưng nó KHÔNG giữ LẬP LUẬN: "lượt
// trước tôi đang thuyết phục khách lên gói 159 vì rẻ hơn theo tuýp" không nằm ở đâu cả.
//
// Mà `hoi_thoai.ai_noi_gi` — câu AI nói gần nhất — ĐÃ có sẵn trong CSDL và đã được
// `trang-thai.js:85` nạp vào `state.lastAiText`. Trước lượt này nó chỉ phục vụ cửa chống
// lặp (`DUPLICATE` của outbound-guard) và fast-lane, KHÔNG hề đi vào prompt. Bot tự quên
// chính câu mình vừa nói, trong khi câu đó nằm cách prompt đúng một dòng.
//
// Cửa sổ 6 tin cũng không cứu được: khách im ba ngày rồi gõ "hello / are you there / ?" là
// ba tin rỗng đó đẩy đúng đoạn tư vấn ra khỏi cửa sổ.
//
// Hai dòng dưới đây tốn ~60 token, KHÔNG thêm một lời gọi model nào, và KHÔNG đẻ cột mới:
// mọi thứ suy ra tại chỗ từ dữ kiện đã có. Giữ một bản tóm tắt trong CSDL là giữ hai sự
// thật, và bản thứ hai bao giờ cũng là bản trôi.

/** Khoảng thời gian đọc được bằng tiếng người. */
export function khoangCach(ms) {
  const s = Math.max(0, Math.round(Number(ms) || 0) / 1000);
  if (s < 90) return `${Math.round(s)} giây`;
  const ph = s / 60;
  if (ph < 90) return `${Math.round(ph)} phút`;
  const gi = ph / 60;
  if (gi < 36) return `${Math.round(gi)} giờ`;
  return `${Math.round(gi / 24)} ngày`;
}

// Im bao lâu thì coi là ĐỨT MẠCH và phải nói thẳng cho model biết. 30 phút: dưới ngưỡng đó
// là cùng một phiên chat, model nhìn 6 tin gần nhất là đủ; trên ngưỡng đó khách đã đi làm,
// đi ngủ, hoặc đã quên — và đó đúng là lúc bot hay chào lại từ đầu.
export const NGAT_MACH_MS = 30 * 60e3;

/** Bước còn thiếu để chốt đơn COD — suy ra từ checklist, không hỏi model. */
export function missingSteps(prof) {
  const miss = [];
  if (!prof.name) miss.push('tên');
  if (!prof.phone) miss.push('SĐT');
  if (!prof.address) miss.push('địa chỉ');
  if (!prof.tier && !prof.qty) miss.push('chọn gói/số lượng');
  if (!prof.cod) miss.push('xác nhận COD');
  return miss;
}

/**
 * @param {object} prof
 * @param {{state?:string, used?:number, max?:number, tier?:string, lane?:string}} meta
 * @returns {string} khối hồ sơ (tiếng Việt — hướng dẫn nội bộ, model KHÔNG được nói với khách)
 */
export function buildProfileBlock(prof = emptyProfile(), meta = {}) {
  const L = [];
  L.push('[HỒ SƠ KHÁCH — dữ liệu nội bộ, ĐỌC để không hỏi lại thứ khách đã cho]');
  // Xưng hô ĐỨNG RIÊNG, cách xa khối dữ liệu đơn, và nói rõ nó không phải tên người nhận.
  if (prof.tenFb) {
    L.push(`Khách tên Facebook là "${prof.tenFb}" — GỌI TÊN khách cho thân mật (tên riêng thôi). `
      + `Đây KHÔNG phải tên người nhận hàng: vẫn phải hỏi tên thật để ghi đơn.`);
  }
  const idLine = [
    `Tên: ${prof.name || '(chưa có)'}`,
    `SĐT: ${prof.phone || '(chưa có)'}`,
    `Địa chỉ: ${prof.address || '(chưa có)'}`,
  ].join(' · ');
  L.push(idLine);
  if (prof.tier || prof.qty) L.push(`Gói quan tâm: ${[prof.tier, prof.qty ? `SL ${prof.qty}` : '', prof.total ? `tổng ${prof.total}` : ''].filter(Boolean).join(' · ')}`);
  if (prof.imagesSent.length) L.push(`Đã xem ảnh: ${prof.imagesSent.join(', ')} (đừng gửi lại loại cũ)`);
  if (prof.objections.length) L.push(`Phản đối đã nêu: ${prof.objections.map((k) => OBJ_LABEL[k] || k).join(', ')}`);
  // VIỆC 2 — AI phải biết bot khác đã nói gì, nếu không sẽ chào lại / báo giá lại.
  const ob = prof.otherBot || {};
  const obL = [
    ob.greeted && 'đã chào',
    ob.quotedPrice && 'ĐÃ BÁO GIÁ',
    ob.sentImages && 'đã gửi ảnh',
    ob.askedAddress && 'đã xin tên/SĐT/địa chỉ',
    ob.orderNoted && 'đã báo đơn đã tạo',
  ].filter(Boolean);
  if (obL.length) L.push(`Kênh khác (Botcake/sale) đã làm: ${obL.join(', ')} — ĐỪNG lặp lại.`);
  L.push(`COD: ${prof.cod ? 'khách đã xác nhận' : 'chưa xác nhận'}`);
  // GIÁ MÁY KHÁC ĐÃ BÁO — chỉ nói khi nó LỆCH bảng giá. Khớp thì im, đừng làm loãng khối.
  const giaOk = allowedPrices(meta.kb || {});
  const giaLech = (prof.otherBot?.giaDaBao || []).filter((n) => giaOk.size && !giaOk.has(n));
  if (giaLech.length) {
    L.push(`⚠️ Kênh khác ĐÃ BÁO SAI GIÁ ${giaLech.join(', ')} cho khách này (giá đúng: ${[...giaOk].sort((a, b) => a - b).join(', ')}). `
      + `Khách nhắc con số cũ thì ĐÍNH CHÍNH nhẹ nhàng rồi báo giá đúng — TUYỆT ĐỐI không nhắc lại con số sai.`);
  }
  if (prof.ngoaiVung) {
    L.push(`⛔ KHÁCH Ở "${prof.ngoaiVung}" — NGOÀI vùng giao. KHÔNG xin địa chỉ, KHÔNG chốt đơn. `
      + `Nói thẳng là chưa giao tới đó, cảm ơn, kết thúc lịch sự.`);
  }
  if (prof.donDaCo) {
    const ai = prof.donDaCo.nguon === 'khach' ? 'CHÍNH KHÁCH nói' : 'Kênh khác (sale/bot) nói';
    L.push(`📦 ĐANG CÓ MỘT ĐƠN TRONG CUỘC — ${prof.donDaCo.trangThai} (${ai}: "${prof.donDaCo.cau}"). `
      + `TUYỆT ĐỐI không nói "chưa nhận được thông tin đơn"/"chưa có đơn nào", KHÔNG xin lại tên/SĐT/địa chỉ, `
      + `KHÔNG dán bảng giá. Bot không tra được đơn và không hứa được thay bộ phận giao hàng ⇒ CHUYỂN NGƯỜI.`);
  }
  if (prof.daTuChoi) {
    L.push(`🙅 Khách đã chào tạm biệt / từ chối. ĐỪNG chào lại từ đầu, đừng dán lại bảng giá, `
      + `đừng hỏi lại thông tin. Chỉ đáp ngắn và để ngỏ cửa.`);
  }
  const miss = missingSteps(prof);
  L.push(prof.ngoaiVung
    ? 'Bước còn thiếu: KHÔNG CÓ — không phục vụ được khách này.'
    : prof.donDaCo
      // Dòng "Bước còn thiếu: tên, SĐT, địa chỉ…" đọc như một mệnh lệnh đi thu thông tin.
      // Với khách đã có đơn ở kênh khác, nó chính là thứ đẩy model đi chào hàng lại.
      ? 'Bước còn thiếu: KHÔNG phải lượt thu thông tin — khách đang nói về ĐƠN ĐÃ CÓ ở trên.'
      : `Bước còn thiếu: ${miss.length ? miss.join(', ') : 'đủ thông tin — chốt đơn được'}`);
  if (meta.max) L.push(`Lượt đã dùng: ${meta.used || 0}/${meta.max}${meta.tier ? ` (khách ${meta.tier})` : ''} · Trạng thái: ${meta.state || 'SELLING'}`);
  // ① CÂU AI NÓI GẦN NHẤT — xem khối ghi chú "MẠCH TƯ VẤN" phía trên.
  // Cắt 200 ký tự và ép về một dòng: đây là gợi nhớ, không phải chép lại cả tin.
  // SĐT/địa chỉ nếu có trong câu cũ vẫn do dòng ⚠️ cuối khối và luật PII_ECHO của
  // outbound-guard canh — không nới lỏng gì thêm ở đây.
  const cuoi = String(meta.lastAi || '').replace(/\s*\n+\s*/g, ' / ').trim();
  if (cuoi) L.push(`AI nói gần nhất${meta.idleMs ? ` (${khoangCach(meta.idleMs)} trước)` : ''}: "${cuoi.slice(0, 200)}"`);
  // ③ KHÁCH GIỤC — dữ kiện bóc ra từ những ping vừa bị loại khỏi cửa sổ (xem `chonCuaSo`).
  // Một lời "hello" là bình thường; hai lần trở lên là khách đang sốt ruột, và lượt này
  // phải vào thẳng việc chứ không chào hỏi vòng vo.
  if (Number(meta.giuc) >= 2) L.push(`Khách đã gọi ${meta.giuc} lần mà chưa được trả lời — vào THẲNG việc, đừng chào hỏi vòng vo.`);
  // ② ĐỨT MẠCH — nói thẳng "tiếp nối", vì đây đúng chỗ bot hay chào lại từ đầu.
  //
  // CHỮ NGHĨA CHÍNH XÁC: `idleMs` đo từ lúc **AI** nói gần nhất (trang-thai.js:86 —
  // `bayGio - ai_noi_luc`), KHÔNG phải từ lúc khách nói gần nhất. Trong khoảng đó sale
  // hoặc Botcake có thể đã nói. Viết "khách im 3 ngày" là suy diễn có thể sai; viết "kể
  // từ lượt AI nói gần nhất" là đúng thứ đang đo, mà vẫn ra đúng một chỉ thị cho model.
  if (Number(meta.idleMs) >= NGAT_MACH_MS) {
    L.push(`⏸ Đã ${khoangCach(meta.idleMs)} kể từ lượt AI nói gần nhất — TIẾP NỐI đúng chỗ đang dở: đừng chào lại từ đầu, đừng báo giá lại nếu đã báo, đừng hỏi lại thứ đã có ở trên.`);
  }
  // Nhắc lại đúng hai điều dễ sai nhất khi model có sẵn SĐT/địa chỉ trong tay.
  L.push('⚠️ SĐT/địa chỉ ở trên CHỈ để điền tool — TUYỆT ĐỐI không đọc lại cho khách (trừ lượt tóm tắt đơn) và không hỏi lại.');
  return L.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Dựng mảng messages cho closer
// ─────────────────────────────────────────────────────────────────────────────

/** Gộp các lượt liên tiếp cùng vai — Claude cần mảng xen kẽ user/assistant. */
function mergeTurns(rows) {
  const out = [];
  for (const r of rows) {
    const prev = out[out.length - 1];
    if (prev && prev.role === r.role) prev.content += '\n' + r.content;
    else out.push({ role: r.role, content: r.content });
  }
  return out;
}

/**
 * Ngữ cảnh đưa vào LLM: [hồ sơ nén] + [N tin gần nhất], KHÔNG nạp lại 20 tin thô.
 *
 * Tin khách ở CUỐI hội thoại (cụm đang xử lý) bị bỏ ra — handler đẩy nó vào riêng ngay sau đó.
 *
 * @returns {{messages:Array, kept:number, dropped:number}}
 */
export function buildContextMessages({ prof, msgs = [], pageId, meta = {}, recent = RECENT_MSGS, keepTrailingUser = false }) {
  // Vá Ở ĐÂY chứ không chỉ trong `hydrateProfile`: hội thoại đã hydrate TRƯỚC lượt vá này
  // sẽ không bao giờ chạy lại hydrate (`hydratedAt` chặn vĩnh viễn), nên tên sẽ rỗng mãi.
  // Đặt ở đây thì hội thoại cũ tự có tên ngay lượt kế tiếp, không cần chạy lại gì.
  if (!prof.tenFb) { const t = tenFbTu(msgs, pageId); if (t) prof.tenFb = t; }
  const rows = cleanHistory(msgs, pageId, prof); // truyền prof để bóc dữ kiện bot khác (việc 2)
  const dropped = msgs.length - rows.length;
  // bỏ cụm tin khách đang xử lý ở cuối
  if (!keepTrailingUser) while (rows.length && rows[rows.length - 1].role === 'user') rows.pop();
  // ĐẾM TRƯỚC KHI VỨT — cùng khuôn `cleanHistory` bóc dữ kiện bot khác rồi mới bỏ template.
  // Khách giục hai lần trở lên là một dữ kiện bán hàng thật, không phải rác.
  let giuc = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].role !== 'user') { if (giuc) break; else continue; }
    if (laPingKhach(rows[i].text)) giuc += 1; else break;
  }
  const tail = chonCuaSo(rows, recent);
  // Claude yêu cầu mở đầu bằng user; ta chèn khối hồ sơ làm lượt user đầu tiên nên luôn đúng.
  const turns = [
    { role: 'user', content: buildProfileBlock(prof, giuc >= 2 ? { ...meta, giuc } : meta) },
    { role: 'assistant', content: 'Đã nắm hồ sơ khách, tiếp tục hội thoại.' },
    ...tail.map((r) => ({ role: r.role, content: r.text })),
  ];
  const messages = mergeTurns(turns);
  // Phải kết bằng assistant vì handler sẽ đẩy tin khách (user) vào ngay sau.
  if (!keepTrailingUser) while (messages.length && messages[messages.length - 1].role !== 'assistant') messages.pop();
  return { messages, kept: tail.length, dropped };
}

/**
 * Ước lượng token (không gọi API). Dùng để theo dõi ngưỡng ≤1.400 token/lượt trong log
 * và trong script đo offline; con số CHÍNH XÁC vẫn lấy từ `usage` thật của nhà cung cấp.
 * Hệ số 3,3 ký tự/token đo trên chính tin thật của hệ thống (Taglish + emoji + Ả Rập).
 */
export function estimateTokens(input) {
  const s = typeof input === 'string' ? input : JSON.stringify(input || '');
  return Math.ceil(s.length / 3.3);
}
