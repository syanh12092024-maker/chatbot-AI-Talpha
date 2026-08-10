// L8 · BOTCAKE — CLIENT **CHỈ ĐỌC**.
// Spec: docs/v2/09-VONG-2-CAP-NHAT.md §1② · docs/v2/prompts/L8-BOTCAKE-KICH-BAN.md
//
// ⛔ ĐIỀU QUAN TRỌNG NHẤT: API Botcake KHÔNG CHO GHI. Đã test thật trên page nháp
//    1194048433791745 (11/08/2026, kiểm lại 10/08/2026 khi viết file này):
//      GET  /pages/{id}/keywords → 200  [{id, flow_id, is_activated}]
//      GET  /pages/{id}/flows    → 200  {data:{flows:[{id,name,parent_id,is_removed}], folders:[]}}
//      POST/PUT/PATCH/DELETE /keywords → 404 toàn bộ (kể cả v2)
//      POST /flows/send_flow          → 400 "your params wrong" — chỉ KÍCH HOẠT flow có sẵn
//    ⇒ Ý "hệ thống tự soạn kịch bản rồi cài vào Botcake" là KHÔNG LÀM ĐƯỢC. Đừng cố.
//    File này VÌ THẾ không có một hàm ghi nào, kể cả send_flow. Thêm vào là phá cam kết
//    an toàn của cả luồng: Botcake đang chạy trên 277 page khách thật.
//
// BA SỰ THẬT KÈM THEO (đo, không phải đoán):
//  · Auth = header `access-token`. Query `?access_token=` → 400.
//  · Key là PAGE-SCOPED (JWT payload `{id:<pageId>}`, KHÔNG có `exp`) → 277 page = 277 key.
//    Vì vậy kho key ở đây là MAP theo page, không phải danh sách failover như `pancake.js`
//    (token Pancake dùng chung nhiều page nên mới cần thử vòng; key Botcake thử vòng là vô nghĩa).
//  · Gọi từ LOCAL được, HTTP 200 — khác Pancake (lỗi 121, phải chạy trên VPS).
//
// KHÔNG ĐỌC ĐƯỢC NỘI DUNG TRẢ LỜI của flow (không endpoint nào trả về). Thứ duy nhất
// lấy được là TỪ KHOÁ, bóc từ tiền tố "Có chứa " mà Botcake tự đặt vào TÊN flow.
// Mong manh có chủ đích: ai đổi tên flow là mất. Trên page nháp 5/11 flow không đọc được
// từ khoá ("LẦN 1", "Private Replies #1"…) — đó là VÙNG MÙ, phải báo ra chứ không được giấu.

const BC_BASE = process.env.BOTCAKE_BASE || 'https://botcake.io/api/public_api/v1';
const CACHE_TTL = Number(process.env.BOTCAKE_CACHE_MS || 10 * 60e3);
const TIMEOUT_MS = Number(process.env.BOTCAKE_TIMEOUT_MS || 8000);

// ─────────────────────────────────────────────────────────────────────────────
// KHO KEY — `BOTCAKE_TOKENS = <pageId>:<key>,<pageId>:<key>` (giống PANCAKE_TOKENS_EXTRA)
//
// Key là CREDENTIAL: không log, không trả ra API, không nhét vào HTML. Mọi hàm "liệt kê"
// dưới đây chỉ trả pageId + 6 ký tự đuôi để người vận hành đối chiếu được key nào là key nào.
// ─────────────────────────────────────────────────────────────────────────────

function parseTokens(raw) {
  const m = new Map();
  for (const part of String(raw || '').split(',')) {
    const s = part.trim();
    if (!s) continue;
    const i = s.indexOf(':');
    // Không có dấu ':' → không biết key thuộc page nào. Bỏ qua ÊM (kèm cảnh báo không
    // chứa nội dung key) thay vì ném — cấu hình sai không được làm sập luồng chat.
    if (i <= 0) { console.warn('[botcake] bỏ qua 1 mục BOTCAKE_TOKENS sai định dạng (cần <pageId>:<key>)'); continue; }
    const pageId = s.slice(0, i).trim();
    const key = s.slice(i + 1).trim();
    if (!/^\d+$/.test(pageId) || !key) { console.warn('[botcake] bỏ qua 1 mục BOTCAKE_TOKENS sai định dạng (pageId phải là số)'); continue; }
    m.set(pageId, key);
  }
  return m;
}

let _keys = parseTokens(process.env.BOTCAKE_TOKENS);

/** Nạp lại kho key (dùng trong test; production đọc 1 lần lúc boot). */
export function reloadBotcakeKeys(raw = process.env.BOTCAKE_TOKENS) {
  _keys = parseTokens(raw);
  _cache.clear(); _inflight.clear(); _warned.clear();
  return _keys.size;
}

export function hasBotcakeKey(pageId) { return _keys.has(String(pageId)); }
export function botcakeKeyCount() { return _keys.size; }

/** Danh sách page CÓ key — KHÔNG kèm key, chỉ 6 ký tự đuôi để đối chiếu. */
export function listBotcakePages() {
  return [...(_keys)].map(([pageId, k]) => ({ pageId, tail: String(k).slice(-6) }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tầng fetch — CHỈ GET. Lỗi = trả rỗng ÊM.
//
// "Êm" là yêu cầu cứng của spec, không phải sự lười: hàm này bị gọi trên đường đi của
// tin khách. Botcake sập / hết hạn key / mất mạng mà làm ném lỗi thì mất luôn lượt chat.
// ─────────────────────────────────────────────────────────────────────────────

const _cache = new Map();     // `${pageId}|${path}` -> { t, data }
const _inflight = new Map();  // chống hai tin cùng lúc gọi trùng một endpoint
const _warned = new Set();    // mỗi page chỉ kêu 1 lần, không làm ngập log
// ⚠️ PHẢI TÁCH "đọc lỗi" khỏi "đọc được, không có luật nào".
// Cả hai đều cho ra mảng rỗng, nhưng kết luận NGƯỢC NHAU ở cửa bỏ chờ: rỗng-vì-đọc-được
// nghĩa là BỎ CHỜ AN TOÀN, rỗng-vì-lỗi nghĩa là KHÔNG BIẾT GÌ nên phải chờ. Gộp hai ca
// này lại thì mỗi lần Botcake sập là bot mở cửa nói chồng lên Botcake trên mọi hội thoại.
const _readOk = new Map();    // `${pageId}|${path}` -> boolean

async function bcGet(pageId, path) {
  const id = String(pageId);
  const key = _keys.get(id);
  if (!key) return null; // page không có key → rỗng êm, KHÔNG cảnh báo (277 page, phần lớn sẽ không có)

  const ck = `${id}|${path}`;
  const hit = _cache.get(ck);
  if (hit && Date.now() - hit.t < CACHE_TTL) return hit.data;
  if (_inflight.has(ck)) return _inflight.get(ck);

  const run = (async () => {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
      let j;
      try {
        const res = await fetch(`${BC_BASE}/pages/${encodeURIComponent(id)}${path}`, {
          // Auth ĐÚNG CÁCH: header. `?access_token=` trả 400 — đã test.
          headers: { 'access-token': key, Accept: 'application/json' },
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        j = await res.json();
      } finally { clearTimeout(timer); }
      _cache.set(ck, { t: Date.now(), data: j });
      _readOk.set(ck, true);
      return j;
    } catch (e) {
      _readOk.set(ck, !!hit); // còn cache cũ thì vẫn coi là "biết"; không có thì là mù
      // ⚠️ e.message có thể chứa URL nhưng KHÔNG chứa key (key nằm ở header) — an toàn để log.
      if (!_warned.has(ck)) { _warned.add(ck); console.warn(`[botcake] page ${id}${path} đọc lỗi (${e.message}) — coi như không có luật Botcake`); }
      // Có bản cache cũ thì thà dùng bản cũ còn hơn tụt về rỗng: rỗng nghĩa là
      // "Botcake không trả lời gì", mà kết luận đó dùng để BỎ CHỜ — đoán sai là nói chồng.
      return hit ? hit.data : null;
    } finally { _inflight.delete(ck); }
  })();

  _inflight.set(ck, run);
  return run;
}

export function clearBotcakeCache() { _cache.clear(); _inflight.clear(); _warned.clear(); _readOk.clear(); }

/** Lần đọc gần nhất của page có thành công không (dùng để phân biệt "rỗng" với "mù"). */
function readOk(pageId, ...paths) {
  return paths.every((p) => _readOk.get(`${String(pageId)}|${p}`) === true);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ba hàm đọc
// ─────────────────────────────────────────────────────────────────────────────

/** Luật từ khoá của page: [{id, flowId, isActivated}]. Không key/lỗi → []. */
export async function getKeywords(pageId) {
  const j = await bcGet(pageId, '/keywords');
  const arr = Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []);
  return arr.map((k) => ({
    id: k?.id ?? null,
    flowId: k?.flow_id == null ? null : String(k.flow_id),
    isActivated: !!k?.is_activated,
  })).filter((k) => k.flowId);
}

/** Cây flow của page: [{id, name, parentId, removed}]. Không key/lỗi → []. */
export async function getFlows(pageId) {
  const j = await bcGet(pageId, '/flows');
  // Hình dạng THẬT: {data:{flows:[…], folders:[…]}, success:true}. Nhận cả dạng mảng
  // trần phòng khi Botcake đổi — hai dòng phòng thủ rẻ hơn một lần bot đứng hình.
  const arr = Array.isArray(j?.data?.flows) ? j.data.flows
    : Array.isArray(j?.data) ? j.data
      : Array.isArray(j) ? j : [];
  return arr.map((f) => ({
    id: f?.id == null ? null : String(f.id),
    name: String(f?.name || ''),
    parentId: f?.parent_id == null ? null : String(f.parent_id),
    removed: !!f?.is_removed,
  })).filter((f) => f.id);
}

// Botcake tự đặt tên flow theo từ khoá: `Có chứa how much,  Magkano,  Mgkanu,  price`.
// Chấp nhận cả biến thể có/không dấu hai chấm và chữ hoa/thường.
const CONTAINS_PREFIX = /^\s*có\s+chứa\s*:?\s*/i;

/**
 * Bóc từ khoá từ TÊN flow. Trả [] khi tên không theo mẫu "Có chứa …" (vùng mù).
 * Dedupe không phân biệt hoa/thường — dữ liệu thật có "not faded, not faded" lặp hai lần.
 */
export function keywordsFromFlowName(name) {
  const s = String(name || '');
  if (!CONTAINS_PREFIX.test(s)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of s.replace(CONTAINS_PREFIX, '').split(',')) {
    const k = raw.trim().replace(/\s+/g, ' ');
    if (!k) continue;
    const lk = k.toLowerCase();
    if (seen.has(lk)) continue;
    seen.add(lk);
    out.push(k);
  }
  return out;
}

/**
 * Ghép keywords ↔ flows theo `flow_id` → bảng luật đọc được của một page.
 *
 * @returns {Promise<{pageId, hasKey, rules:Array, flows:Array, blind:number, activeBlind:number}>}
 *   rules[i] = { keywordId, flowId, isActivated, flowName, keywords:[], readable:boolean }
 *   `blind`       = số luật không bóc được từ khoá (tên flow bị đổi / flow đã xoá)
 *   `activeBlind` = trong số đó, bao nhiêu luật ĐANG BẬT — đây mới là con số đáng lo,
 *                   vì luật bật mà mình không biết từ khoá thì không thể bỏ chờ an toàn.
 */
export async function getKeywordMap(pageId) {
  const id = String(pageId);
  if (!hasBotcakeKey(id)) return { pageId: id, hasKey: false, read: false, rules: [], flows: [], blind: 0, activeBlind: 0 };

  const [keywords, flows] = await Promise.all([getKeywords(id), getFlows(id)]);
  const byId = new Map(flows.map((f) => [f.id, f]));

  const rules = keywords.map((k) => {
    const f = byId.get(k.flowId);
    const kws = keywordsFromFlowName(f?.name);
    return {
      keywordId: k.id,
      flowId: k.flowId,
      isActivated: k.isActivated,
      flowName: f?.name || '',
      flowRemoved: !!f?.removed,
      keywords: kws,
      readable: kws.length > 0,
    };
  });

  return {
    pageId: id, hasKey: true,
    read: readOk(id, '/keywords', '/flows'), // false = Botcake sập / key hỏng → "không biết"
    rules, flows,
    blind: rules.filter((r) => !r.readable).length,
    activeBlind: rules.filter((r) => !r.readable && r.isActivated).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BỎ CHỜ CÓ CHỌN LỌC — hàm để `pancake-poll.js` gọi (L0 nối, xem báo cáo)
//
// `pancake-poll.js` đang chờ BOTCAKE_GRACE_MS = 6s cho MỌI hội thoại để nhường Botcake.
// Có danh sách từ khoá rồi thì tin KHÔNG khớp từ khoá nào → không cần chờ.
//
// ⚠️ HAI ĐIỀU KHÔNG ĐƯỢC QUÊN:
//   ① Hàm này LỆCH VỀ PHÍA CHỜ. Không có key, đọc lỗi, có luật bật mà mù từ khoá →
//      trả `true` (=cứ chờ). Sai theo hướng "chờ thừa 6s" chỉ tốn thời gian; sai theo
//      hướng "bỏ chờ nhầm" là hai bên cùng nói với khách.
//   ② CỬA ② của pancake-poll (soi lại NGAY TRƯỚC KHI GỬI) PHẢI GIỮ NGUYÊN MÃI MÃI.
//      Danh sách từ khoá KHÔNG cho biết flow có điều kiện phụ, đã chạy cho khách này
//      chưa, và **chào tự động / auto-reply comment / broadcast KHÔNG đi qua keywords**.
//      Bỏ cửa ② là mở lại đúng cái va chạm mà cả cửa ① lẫn ② sinh ra để chặn.
// ─────────────────────────────────────────────────────────────────────────────

/** Botcake dùng luật "CÓ CHỨA" — so khớp chuỗi con, không phân biệt hoa/thường. */
function containsKeyword(text, kw) {
  return String(text).toLowerCase().includes(String(kw).toLowerCase());
}

/**
 * Botcake CÓ THỂ trả lời tin này không?
 * @returns {Promise<boolean>} true = có thể (hoặc KHÔNG BIẾT) → giữ nguyên thời gian chờ.
 *                             false = chắc chắn không khớp luật nào → bỏ chờ được.
 */
export async function willBotcakeAnswer(pageId, text) {
  const t = String(text || '');
  if (!t.trim()) return true;                       // ảnh/sticker: không suy được gì → chờ
  if (!hasBotcakeKey(pageId)) return true;          // không key → không biết → chờ
  let map;
  try { map = await getKeywordMap(pageId); } catch { return true; }
  return matchesBotcakeMap(map, t);
}

/** Bản đồng bộ dùng cho báo cáo/test khi đã có sẵn `getKeywordMap()`. */
export function matchesBotcakeMap(map, text) {
  const t = String(text || '');
  if (!map?.hasKey) return true;                     // không key → không biết → chờ
  if (map.read === false) return true;               // đọc lỗi → không biết → chờ
  const active = (map.rules || []).filter((r) => r.isActivated);
  if (!active.length) return false;                  // đọc được, không luật nào bật → bỏ chờ
  if (active.some((r) => !r.readable)) return true;   // có luật bật mà mù từ khoá → không dám kết luận
  return active.some((r) => r.keywords.some((kw) => containsKeyword(t, kw)));
}

// ─────────────────────────────────────────────────────────────────────────────
// BÁO CÁO TRÙNG LẶP Botcake ↔ Fast Lane
//
// Với mỗi từ khoá đọc được, chạy thử qua `fastLane()` rồi phân loại:
//   Fast Lane trả câu mẫu  → TRÙNG    (hai bên cùng trả lời) → đề xuất TẮT luật Botcake
//   Fast Lane leo lên AI   → BỔ SUNG  (Botcake phủ chỗ mình thiếu) → giữ
//   Không bóc được từ khoá → VÙNG MÙ  (báo để người vào Botcake xem)
//
// **KHÔNG TỰ TẮT GÌ CẢ.** Xuất JSON + màn hình, người quyết. API cũng không cho tắt.
//
// Sắc thái phải giữ, đừng gộp mất: Fast Lane leo lên AI vì HAI lý do khác hẳn nhau —
//   (a) "cần AI thật sự" → Botcake phủ vào là ĐƯỢC VIỆC;
//   (b) CỐ Ý đẩy lên AI vì nguy hiểm (phản đối giá / có SĐT / ý định mua rõ) → Botcake
//       bắn câu mẫu vào đúng chỗ đó là **bắn vào chân mình**.
// Cả hai đều là BỔ SUNG về mặt phân loại, nhưng (b) được gắn cờ `risky` để người đọc thấy.
// ─────────────────────────────────────────────────────────────────────────────

const RISKY_ESCALATE = /số điện thoại|phản đối|ý định mua/i;
// Fast Lane CÓ mẫu cho tình huống này nhưng KB của page chưa đủ dữ liệu để dựng câu
// (thường là chưa có bảng giá). Đây KHÔNG phải "Botcake bổ sung chỗ mình thiếu" — mình
// có đủ luật, chỉ thiếu dữ liệu. Gộp vào BỔ SUNG sẽ khiến người đọc giữ một luật Botcake
// mà lẽ ra chỉ cần điền KB là hết trùng. Đã gặp thật: page nháp không nằm trong KB nên
// `tpl_price` không dựng được câu, "how much" hiện ra BỔ SUNG thay vì TRÙNG.
const KB_GAP = /KB chưa đủ dữ liệu/i;

/**
 * @param {string} pageId
 * @param {object} kb        KB của page (để Fast Lane dựng được câu mẫu)
 * @param {function} fastLaneFn  Tiêm `fastLane` từ ngoài — tránh vòng import
 *                               (`fast-lane.js` đã import module này cho bảng kịch bản).
 */
export async function compareWithFastLane(pageId, kb, fastLaneFn) {
  const map = await getKeywordMap(pageId);
  const items = [];

  for (const r of map.rules) {
    if (!r.readable) {
      items.push({
        verdict: 'VÙNG MÙ', flowId: r.flowId, flowName: r.flowName,
        isActivated: r.isActivated, keywords: [],
        suggestion: 'Mở Botcake xem luật này trả lời gì — tên flow đã bị đổi nên API không đọc được từ khoá',
      });
      continue;
    }
    // Chạy thử TỪNG từ khoá. `aiTurns: 0` + `usedLanes` mới mỗi lượt = mô phỏng lượt đầu
    // của một khách mới, đúng chỗ Botcake hay chen vào nhất.
    const probes = r.keywords.map((kw) => {
      const res = fastLaneFn({ text: kw, kb, aiTurns: 0, lastAiText: '', usedLanes: new Set() });
      return { keyword: kw, handled: !!res.handled && !!res.reply, lane: res.lane || '', reason: res.reason || '' };
    });
    const covered = probes.filter((p) => p.handled);
    const dup = covered.length > 0;
    const kbGap = !dup && probes.some((p) => KB_GAP.test(p.reason));
    items.push({
      verdict: dup ? 'TRÙNG' : 'BỔ SUNG',
      flowId: r.flowId, flowName: r.flowName, isActivated: r.isActivated,
      keywords: r.keywords,
      lanes: [...new Set(covered.map((p) => p.lane))],
      coverage: `${covered.length}/${probes.length} từ khoá`,
      risky: !dup && probes.some((p) => RISKY_ESCALATE.test(p.reason)),
      kbGap,
      probes,
      suggestion: dup
        ? 'TẮT luật Botcake này — Fast Lane đã trả lời (trả lời hai lần làm khách rối và đội tin gửi)'
        : kbGap
          ? 'ĐIỀN KB TRƯỚC — Fast Lane có sẵn mẫu cho tình huống này nhưng page chưa đủ dữ liệu (thường là thiếu bảng giá). Điền xong thì luật này thành TRÙNG và tắt được.'
          : 'GIỮ — Fast Lane không phủ. Cân nhắc đưa thành một dòng trong bảng Kịch bản tự động',
    });
  }

  const on = items.filter((i) => i.isActivated);
  return {
    pageId: String(pageId), hasKey: map.hasKey,
    total: items.length, activated: on.length, off: items.length - on.length,
    // Chỉ đếm trên luật ĐANG BẬT — luật tắt không gây va chạm nên không nằm trong kết luận.
    duplicate: on.filter((i) => i.verdict === 'TRÙNG').length,
    complement: on.filter((i) => i.verdict === 'BỔ SUNG').length,
    blind: on.filter((i) => i.verdict === 'VÙNG MÙ').length,
    // Nằm trong `complement` nhưng phải đếm riêng: đây là việc của KB, không phải của Botcake.
    kbGap: on.filter((i) => i.kbGap).length,
    items,
    note: 'Chỉ đọc & đề xuất. API Botcake không cho ghi — muốn tắt luật phải vào Botcake làm tay.',
  };
}

// Tiện ích cho báo cáo: page nào đang bật AI mà CHƯA có key Botcake.
export function missingKeyPages(pageIds) {
  return [...new Set((pageIds || []).map(String))].filter((id) => !hasBotcakeKey(id));
}

export const botcakeConfig = {
  base: BC_BASE,
  cacheMs: CACHE_TTL,
  // Cờ chỉ để tài liệu hoá cam kết — không có hàm ghi nào trong file này để bật/tắt.
  readOnly: true,
};
