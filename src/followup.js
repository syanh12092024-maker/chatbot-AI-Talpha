// M12 · FOLLOW-UP ENGINE — chạm vào 3.991 khách (52%) được AI trả lời rồi bỏ rơi.
// Spec: docs/v2/03-TANG-TANG-CHOT.md § M12 · vòng 2: docs/v2/prompts/L5-AB-FOLLOWUP.md
//
// ⚠️ ĐÂY LÀ MODULE ĐẦU TIÊN CHỦ ĐỘNG NHẮN KHÁCH KHI KHÁCH KHÔNG HỎI GÌ.
// Sai là spam người thật, trên page thật, ở thị trường mà một lần bị report là mất page
// và mất luôn traffic ads. Vì vậy toàn bộ file này là hàm THUẦN: nó chỉ QUYẾT ĐỊNH và
// SOẠN, không gửi gì cả. Việc gửi nằm ở `scheduler-followup.js`, sau ba cái công tắc.
// Khi không chắc → mặc định KHÔNG GỬI, và luôn trả về LÝ DO bỏ qua để tra ngược được.
//
// Ca thật đẻ ra nhóm ưu tiên cao nhất — khách *SilentBoo Yeaahmute* tự nhắn
// "Interesado poh akong umorder pero mukhang kayo poh ang hindi interesado magpa order…
//  3 days na akong nakikipag negotiate… ok lang kung cancel nalang",
// ĐÃ đưa tên Celieta Boca + số 71566943. AI đáp "thanks madam" rồi mất trắng.
// Nhóm đó KHÔNG được nhắn thêm cái tin nữa — phải đẩy thẳng sale gọi.

import { S, peekConv } from './conv-state.js';
import { scanSignals } from './lead-score.js';
import { assignBranch, activeExperiment } from './experiment.js';

// ─────────────────────────────────────────────────────────────────────────────
// Cấu hình & công tắc
// ─────────────────────────────────────────────────────────────────────────────

export const followupConfig = {
  // MẶC ĐỊNH TẮT. Bật bằng FOLLOWUP=1 sau khi đã chạy khô và chủ dự án duyệt danh sách.
  enabled: process.env.FOLLOWUP === '1',
  minSilentH: Number(process.env.FOLLOWUP_MIN_SILENT_H || 2),
  maxSilentH: Number(process.env.FOLLOWUP_MAX_SILENT_H || 24),
  // Cửa sổ nhắn tin của kênh (Meta 24h). Trừ 1h biên: hàng chờ có thể nằm vài phút giữa
  // lúc chọn và lúc gửi, đụng đúng mép 24h là tin rơi và ta không biết vì sao.
  windowH: Number(process.env.FOLLOWUP_WINDOW_H || 24),
  windowMarginH: Number(process.env.FOLLOWUP_WINDOW_MARGIN_H || 1),
  quietFrom: Number(process.env.FOLLOWUP_QUIET_FROM || 22), // 22:00 giờ địa phương
  quietTo: Number(process.env.FOLLOWUP_QUIET_TO || 8),      // 08:00 giờ địa phương
  maxPerRun: Number(process.env.FOLLOWUP_MAX_PER_RUN || 50), // trần MỖI PAGE mỗi lượt quét
  // readiness = READY nghiêm ngặt sẽ loại 37/38 page (đo 11/08/2026: chúng đều dính
  // THIN_SCRIPT — mức NHẮC, không phải mức chặn, xem readiness.js). Mặc định dùng
  // "không có blocker nào" = đúng cái cổng mà M03 dùng để cho bật AI. Bật
  // FOLLOWUP_STRICT_READY=1 nếu muốn đúng chữ READY.
  strictReady: process.env.FOLLOWUP_STRICT_READY === '1',
  // Nhánh đối chứng: khách nhánh A KHÔNG nhận tin. Đây là ràng buộc của spec, không
  // phải tuỳ chọn — không có nhóm đối chứng thì mãi mãi không biết M12 có tác dụng gì.
  split: Number(process.env.FOLLOWUP_SPLIT || 50),
  salt: process.env.FOLLOWUP_SALT || 'm12-followup',
};

// Page tắt riêng (sale ngập là tắt ngay) — .env + kho bật/tắt lúc chạy.
const offPagesEnv = new Set((process.env.FOLLOWUP_OFF_PAGES || '').split(',').map((s) => s.trim()).filter(Boolean));
const offPagesRuntime = new Set();
export function setPageFollowup(pageId, on) {
  const id = String(pageId);
  if (on) offPagesRuntime.delete(id); else offPagesRuntime.add(id);
  return !offPagesRuntime.has(id) && !offPagesEnv.has(id);
}
export function isPageFollowupOn(pageId) {
  const id = String(pageId);
  return !offPagesEnv.has(id) && !offPagesRuntime.has(id);
}
export function offPages() { return [...new Set([...offPagesEnv, ...offPagesRuntime])]; }

// ─────────────────────────────────────────────────────────────────────────────
// Giờ địa phương của THỊ TRƯỜNG page (không phải giờ VN của máy chủ)
//
// Không có `Intl` timezone ở đây vì thị trường trong Sheet ghi bằng tên nước ("KSA",
// "UAE"), không phải IANA id — map thẳng sang chênh lệch giờ là đủ đúng: không nước nào
// trong danh sách này dùng giờ mùa hè.
// ─────────────────────────────────────────────────────────────────────────────
export const MARKET_UTC_OFFSET = {
  ksa: 3, sa: 3, 'saudi arabia': 3, saudi: 3,
  kuwait: 3, kw: 3, qatar: 3, qa: 3, bahrain: 3, bh: 3,
  uae: 4, ae: 4, dubai: 4, oman: 4, om: 4,
  ph: 8, philippines: 8, 'ph - ksa': 3,
};
export const DEFAULT_UTC_OFFSET = 3; // phần lớn page là KSA/Kuwait/Qatar/Bahrain

export function utcOffsetOf(market) {
  const m = String(market || '').trim().toLowerCase();
  if (!m) return DEFAULT_UTC_OFFSET;
  if (MARKET_UTC_OFFSET[m] != null) return MARKET_UTC_OFFSET[m];
  for (const [k, v] of Object.entries(MARKET_UTC_OFFSET)) if (m.includes(k)) return v;
  return DEFAULT_UTC_OFFSET;
}

export function localHour(now, market) {
  return new Date(now + utcOffsetOf(market) * 3600e3).getUTCHours();
}

/** 22:00–08:00 giờ địa phương = KHÔNG nhắn. */
export function inQuietHours(now, market, cfg = followupConfig) {
  const h = localHour(now, market);
  return cfg.quietFrom > cfg.quietTo ? (h >= cfg.quietFrom || h < cfg.quietTo) : (h >= cfg.quietFrom && h < cfg.quietTo);
}

/** Mốc ms của lần tiếp theo ra khỏi giờ yên tĩnh — để hàng chờ biết khi nào thử lại. */
export function nextSendableAt(now, market, cfg = followupConfig) {
  if (!inQuietHours(now, market, cfg)) return now;
  const off = utcOffsetOf(market) * 3600e3;
  const d = new Date(now + off);
  const target = new Date(d);
  target.setUTCHours(cfg.quietTo, 0, 0, 0);
  if (target <= d) target.setUTCDate(target.getUTCDate() + 1);
  return target.getTime() - off;
}

// ─────────────────────────────────────────────────────────────────────────────
// GÓC ĐUỔI THEO — bảng ở spec §M12
//
// Ngôn ngữ: page thị trường PH dùng Taglish (đúng giọng khách đang nói), còn lại dùng
// tiếng Anh. CỐ Ý không tự sinh tiếng Ả Rập: câu chủ động nhắn khách mà sai sắc thái thì
// hại hơn là không nhắn, và ở đây chưa có ai duyệt được bản Ả Rập.
//
// Mọi câu dưới đây đều phải QUA ĐƯỢC M09 (Outbound Guard) — không số tiền, không hứa
// ngày giao cụ thể, không khan hiếm bịa, không checklist, 1–2 câu. Test có chạy thẳng
// `guardOutbound()` lên từng câu để chuyện đó không trôi thành lời hứa suông.
// ─────────────────────────────────────────────────────────────────────────────

export const ANGLES = {
  // Nhóm ƯU TIÊN CAO NHẤT — KHÔNG nhắn, đẩy thẳng sale gọi.
  gave_contact: {
    group: 'SALE_CALL',
    why: 'khách đã cho SĐT/tên mà chưa chốt',
    saleNote: '🔴 GỌI NGAY — khách đã cho SĐT/tên nhưng chưa chốt đơn. Đừng nhắn thêm tin, gọi điện.',
  },
  obj_price: {
    group: 'MESSAGE', why: 'chê đắt → bẻ nhỏ giá trị + COD không trả trước đồng nào',
    wantImage: 'feedback',
    text: {
      tl: 'Naiintindihan ko po. COD po ito — wala pong bayad muna, titingnan niyo po muna ang item bago magbayad. Gusto niyo po bang makita ang feedback ng mga nakabili na?',
      en: 'I understand. This is COD — nothing upfront, you check the item first before paying. Would you like to see feedback from customers who already bought?',
    },
  },
  obj_trust: {
    group: 'MESSAGE', why: 'nghi chất lượng → đưa bằng chứng',
    wantImage: 'certificate',
    text: {
      tl: 'Para po panatag kayo: may certificate po kami, at COD po — bayad lang po kapag nasa kamay niyo na. Ipapakita ko po ba ang proof?',
      en: 'So you feel safe: we have the certificate, and it is COD — you pay only once it is already in your hands. Shall I send you the proof?',
    },
  },
  asked_ship: {
    group: 'MESSAGE', why: 'hỏi ship rồi im → nhấn free delivery + 2–5 ngày',
    text: {
      tl: 'Free delivery po sa inyo, at karaniwan pong 2-5 days ang dating. Ipapareserve ko na po ba ang sa inyo?',
      en: 'Free delivery for you, and it usually takes 2-5 days. Shall I reserve one for you?',
    },
  },
  after_quote: {
    group: 'MESSAGE', why: 'sau báo giá, im → chốt bằng lựa chọn',
    text: {
      tl: 'Hi po! Sa dalawang set po, alin po ang mas bet ninyo — SET 1 or SET 2 po?',
      en: 'Hi! Between the two sets, which one works better for you — SET 1 or SET 2?',
    },
  },
};

/** PH → Taglish, còn lại → tiếng Anh. */
export function langFor(market) {
  return /ph|philip/i.test(String(market || '')) ? 'tl' : 'en';
}

/**
 * Khách dừng ở đâu → góc nào. Thứ tự CÓ Ý NGHĨA: nhóm "đã cho SĐT/tên" luôn thắng,
 * vì nó là nhóm KHÔNG ĐƯỢC nhắn.
 */
export function pickAngle(custTexts = []) {
  const sig = new Set();
  for (const t of custTexts) for (const k of scanSignals(t)) sig.add(k);
  if (sig.has('phone') || sig.has('name')) return { key: 'gave_contact', signals: [...sig] };
  if (sig.has('obj_price')) return { key: 'obj_price', signals: [...sig] };
  if (sig.has('obj_trust')) return { key: 'obj_trust', signals: [...sig] };
  if (sig.has('ship')) return { key: 'asked_ship', signals: [...sig] };
  return { key: 'after_quote', signals: [...sig] };
}

/** Soạn tin cho một góc. Trả '' cho nhóm SALE_CALL — nhóm đó KHÔNG có tin nào. */
export function composeFollowup(angleKey, market) {
  const a = ANGLES[angleKey];
  if (!a || a.group !== 'MESSAGE') return '';
  const lang = langFor(market);
  return a.text[lang] || a.text.en;
}

// ─────────────────────────────────────────────────────────────────────────────
// A/B — M12 CHẠY DƯỚI M17 NGAY TỪ NGÀY ĐẦU
//
// Nếu page đang có thí nghiệm M17 thì dùng chính nhánh đó (một khách một nhánh, không
// được nằm hai bảng khác nhau). Không có thí nghiệm nào thì vẫn chia 50/50 bằng muối
// riêng của M12 — nghĩa là KHÔNG BAO GIỜ có chuyện 100% khách đủ điều kiện được nhắn.
// ─────────────────────────────────────────────────────────────────────────────
export function followupBranch(pageId, custId, cfg = followupConfig) {
  const exp = activeExperiment(pageId);
  if (exp) {
    return { branch: assignBranch(custId, { split: exp.split, salt: exp.salt }), via: `M17 · ${exp.name}` };
  }
  return { branch: assignBranch(custId, { split: cfg.split, salt: cfg.salt }), via: 'M12 · 50/50 mặc định' };
}

// ─────────────────────────────────────────────────────────────────────────────
// BẢY ĐIỀU KIỆN CHỌN KHÁCH (spec §M12) — không bỏ cái nào
//
// Về điều kiện "trạng thái = COLD": tới hôm nay KHÔNG MODULE NÀO đặt `S.COLD` — nó được
// khai báo trong `conv-state.js` cho đúng M12 này, và `handler.js` (file của luồng khác)
// chỉ ĐỌC nó để cộng +2 điểm khi khách quay lại. Nên COLD được SUY RA ở đây từ hành vi:
// hội thoại còn đang bán (GREET/QUALIFY/SELLING/COLD) mà khách im quá ngưỡng. Hội thoại
// đã HANDOFF / CLOSING / POST_SALE thì KHÔNG phải nguội — nó đã có chủ khác.
// ─────────────────────────────────────────────────────────────────────────────

export const COLD_STATES = new Set([S.GREET, S.QUALIFY, S.SELLING, S.COLD]);
// Thẻ hệ thống Pancake = -(mã trạng thái đơn) — có thẻ này là ĐÃ CÓ ĐƠN.
export const ORDER_TAGS = new Set([-1, -2, -3, -11, -12, -20]);

/**
 * Soi MỘT khách. Thuần hàm, không đọc file, không gọi mạng — mọi thứ cần biết đều nằm
 * trong `cand`, nên chạy khô trên dữ liệu thật và chạy thật dùng CHUNG một đường.
 *
 * @param {object} cand
 *   pageId · custId · convId · name · market
 *   lastCustAt   mốc ms lần cuối KHÁCH nhắn
 *   aiReplies    số tin bot đã gửi trong hội thoại này
 *   hasOrder     Sổ AI có type='order' cho khách này chưa
 *   tags         thẻ Pancake của hội thoại
 *   state        trạng thái conv-state (thiếu thì tự tra)
 *   followupSent · followupCallAt   (thiếu thì tự tra conv-state)
 *   aiEnabled · ready               trạng thái page
 *   custTexts    vài tin gần nhất của khách — để chọn góc
 *   lastAiText   tin bot vừa gửi (M09 luật 7 chống lặp)
 * @returns {{ok:boolean, skip?:string, reason:string, ...}}
 */
export function evaluateCandidate(cand = {}, { now = Date.now(), cfg = followupConfig } = {}) {
  const base = {
    pageId: String(cand.pageId || ''), custId: String(cand.custId || ''),
    convId: String(cand.convId || ''), name: cand.name || '', market: cand.market || '',
  };
  const no = (skip, reason) => ({ ok: false, skip, reason, ...base });

  if (!base.pageId || !base.custId || !base.convId) return no('thiếu định danh', 'thiếu pageId/custId/convId');

  // ⑥ page đang bật AI và đủ điều kiện chạy
  if (!cand.aiEnabled) return no('page tắt AI', 'page đang tắt AI');
  if (cfg.strictReady ? cand.readiness !== 'READY' : cand.ready === false) {
    return no('page chưa sẵn sàng', `readiness = ${cand.readiness || 'chưa đủ điều kiện'}`);
  }
  if (!isPageFollowupOn(base.pageId)) return no('page tắt đuổi theo', 'công tắc đuổi theo của page đang TẮT');

  // ③ chưa có đơn — ba nguồn, dương một nguồn là dừng
  if (cand.hasOrder) return no('đã có đơn', 'Sổ AI đã ghi đơn cho khách này');
  const stopTag = (cand.tags || []).map(Number).find((t) => ORDER_TAGS.has(t));
  if (stopTag !== undefined) return no('đã có đơn', `hội thoại có thẻ đơn Pancake (${stopTag})`);

  // ① trạng thái = COLD (suy ra từ hành vi — xem ghi chú khối trên)
  // LUÔN tra sổ hội thoại, kể cả khi bên gọi đã đưa sẵn `state`: sổ này là chỗ DUY NHẤT
  // giữ "đã đuổi theo chưa" qua restart. Tra có điều kiện thì chỉ cần bên gọi truyền
  // `state` là điều kiện ⑤ im lặng biến mất và khách nhận tin lần hai.
  const conv = peekConv(base.convId);
  const state = cand.state || conv?.state || S.GREET;
  if (state === S.CLOSING || state === S.POST_SALE) return no('đã có đơn', `trạng thái ${state}`);
  if (!COLD_STATES.has(state)) return no('không phải COLD', `trạng thái ${state} — hội thoại đã có chủ khác`);

  // ② đã có ≥1 lượt AI — khách chưa từng được bot trả lời thì không phải "bị bỏ rơi",
  //    đó là khách chưa được phục vụ lần nào, và việc cần làm là trả lời chứ không phải đuổi theo.
  // Đếm MỌI tin bot đã gửi, kể cả Fast Lane: câu hỏi ở đây là "khách đã được phục vụ
  // rồi bị bỏ rơi chưa", không phải "đã tiêu bao nhiêu token". `llmTurns` của conv-state
  // chỉ đếm lượt gọi model nên là CẬN DƯỚI — bên gọi nên đưa số thật từ Sổ AI.
  const aiReplies = Number(cand.aiReplies ?? (conv?.llmTurns?.length || 0));
  if (aiReplies < 1) return no('chưa có lượt AI', 'hội thoại chưa có tin nào của bot');

  // ⑤ chưa từng được đuổi theo trong hội thoại này — RÀNG BUỘC CỨNG, không có lần 2
  const fSent = Number(cand.followupSent ?? conv?.followupSent ?? 0);
  const fCall = Number(cand.followupCallAt ?? conv?.followupCallAt ?? 0);
  if (fSent > 0) return no('đã đuổi theo', 'hội thoại này đã nhận 1 tin đuổi theo — không có lần 2');
  if (fCall > 0) return no('đã đẩy sale', 'hội thoại này đã được đẩy hàng chờ sale');
  // Lá chắn thứ hai, nguồn KHÁC: Sổ AI. `conv-state.json` là file trạng thái có thể mất
  // (xoá tay, đổi máy, hết TTL 30 ngày) — mất nó mà chỉ dựa vào nó là cả hệ thống nhắn
  // lại lượt hai cho vài nghìn người. Sổ AI thì append-only và không bao giờ bị dọn.
  if (cand.alreadyLogged) return no('đã đuổi theo', 'Sổ AI đã ghi tin/cú đẩy đuổi theo cho khách này');

  // ④ khách im 2–24 giờ
  const lastCustAt = Number(cand.lastCustAt || 0);
  if (!lastCustAt) return no('không rõ khách im bao lâu', 'thiếu mốc tin cuối của khách');
  const silentH = (now - lastCustAt) / 3600e3;
  if (silentH < cfg.minSilentH) return no('chưa đủ im', `mới im ${silentH.toFixed(1)}h (< ${cfg.minSilentH}h)`);
  if (silentH > cfg.maxSilentH) return no('im quá lâu', `im ${silentH.toFixed(1)}h (> ${cfg.maxSilentH}h)`);

  // ⑦ còn trong cửa sổ nhắn tin của kênh
  const windowLeftH = cfg.windowH - cfg.windowMarginH - silentH;
  if (windowLeftH <= 0) return no('hết cửa sổ nhắn tin', `im ${silentH.toFixed(1)}h — quá cửa sổ ${cfg.windowH}h (trừ ${cfg.windowMarginH}h biên)`);

  // Giờ yên tĩnh 22:00–08:00 giờ địa phương của THỊ TRƯỜNG page.
  if (inQuietHours(now, base.market, cfg)) {
    return { ...no('giờ yên tĩnh', `${localHour(now, base.market)}h giờ địa phương — không nhắn 22:00–08:00`), retryAt: nextSendableAt(now, base.market, cfg) };
  }

  // Chọn góc
  const angle = pickAngle(cand.custTexts || []);
  const a = ANGLES[angle.key];
  const { branch, via } = followupBranch(base.pageId, base.custId, cfg);

  const common = {
    ...base, ok: true, angle: angle.key, why: a.why, signals: angle.signals,
    silentH: +silentH.toFixed(1), windowLeftH: +windowLeftH.toFixed(1),
    branch, branchVia: via, aiReplies, state,
  };

  // Nhóm ƯU TIÊN CAO NHẤT — không nhắn, đẩy sale gọi. KHÔNG chia A/B: đây không phải tin
  // nhắn nên không có gì để đo A/B, và giữ một nửa số khách sát đơn lại làm đối chứng là
  // vứt tiền thật để lấy một con số.
  if (a.group === 'SALE_CALL') {
    return { ...common, group: 'SALE_CALL', text: '', saleNote: a.saleNote, reason: a.why };
  }

  // Nhánh A = ĐỐI CHỨNG, không nhận tin.
  if (branch === 'A') {
    return { ...common, ok: false, group: 'HOLDOUT', skip: 'nhánh đối chứng', reason: `nhánh A (${via}) — giữ làm đối chứng, không nhắn` };
  }

  return { ...common, group: 'MESSAGE', text: composeFollowup(angle.key, base.market), wantImage: a.wantImage || null, reason: a.why };
}

/**
 * Lập kế hoạch cho CẢ MẺ. Trả ba rổ tách bạch — hàng chờ sale đứng ĐẦU vì nhóm đó là
 * khách sát đơn nhất trong toàn hệ thống.
 *
 * @returns {{saleQueue:[], send:[], holdout:[], skipped:[], dropped:[], byPage:object}}
 */
export function planFollowups(candidates = [], { now = Date.now(), cfg = followupConfig } = {}) {
  const saleQueue = []; const send = []; const holdout = []; const skipped = [];
  for (const c of candidates) {
    let v;
    try { v = evaluateCandidate(c, { now, cfg }); }
    catch (e) { skipped.push({ pageId: c?.pageId, custId: c?.custId, skip: 'lỗi', reason: e.message }); continue; }
    if (v.ok && v.group === 'SALE_CALL') saleQueue.push(v);
    else if (v.ok) send.push(v);
    else if (v.group === 'HOLDOUT') holdout.push(v);
    else skipped.push(v);
  }

  // Trần MỖI PAGE mỗi lượt quét. Cắt thì phải NÓI RA — im lặng cắt bớt là cách chắc chắn
  // nhất để tưởng mình đã phủ hết trong khi không.
  const byPage = {};
  const kept = []; const dropped = [];
  for (const s of send) {
    const n = (byPage[s.pageId] = (byPage[s.pageId] || 0) + 1);
    if (n <= cfg.maxPerRun) kept.push(s);
    else dropped.push({ ...s, skip: 'quá trần lượt quét', reason: `page ${s.pageId} đã đạt trần ${cfg.maxPerRun} tin/lượt quét` });
  }
  if (dropped.length) console.warn(`[followup] cắt ${dropped.length} tin vì trần ${cfg.maxPerRun}/page/lượt — sẽ xét lại ở lượt sau`);

  return {
    now, saleQueue, send: kept, holdout, skipped, dropped,
    byPage,
    summary: {
      candidates: candidates.length,
      saleQueue: saleQueue.length, send: kept.length, holdout: holdout.length,
      skipped: skipped.length, dropped: dropped.length,
      skipReasons: skipped.reduce((m, s) => { m[s.skip] = (m[s.skip] || 0) + 1; return m; }, {}),
    },
  };
}

/** Bản in cho người đọc — dùng cho lượt CHẠY KHÔ đưa chủ dự án duyệt trước khi bật. */
export function renderDryRun(plan) {
  const L = [];
  const t = plan.summary;
  L.push('═══ M12 · CHẠY KHÔ — KHÔNG GỬI GÌ CẢ ═══', '');
  L.push(`Soi ${t.candidates} khách → ĐẨY SALE GỌI ${t.saleQueue} · GỬI TIN ${t.send} · đối chứng ${t.holdout} · bỏ qua ${t.skipped}${t.dropped ? ` · cắt vì trần ${t.dropped}` : ''}`, '');

  if (plan.saleQueue.length) {
    L.push('🔴 ĐẨY THẲNG SALE GỌI — KHÔNG NHẮN TIN (khách đã cho SĐT/tên mà chưa chốt)');
    plan.saleQueue.forEach((s, i) => L.push(`  ${i + 1}. page ${s.pageId} · ${s.name || s.custId} · im ${s.silentH}h · https://pancake.vn/${s.pageId}?c_id=${s.convId}`));
    L.push('');
  }
  if (plan.send.length) {
    L.push('✉️ SẼ NHẮN (mỗi khách ĐÚNG 1 tin, không có lần 2)');
    plan.send.forEach((s, i) => {
      L.push(`  ${i + 1}. page ${s.pageId} · ${s.name || s.custId} · im ${s.silentH}h · góc: ${s.angle} (${s.why}) · nhánh ${s.branch}`);
      L.push(`     "${s.text}"`);
    });
    L.push('');
  }
  if (Object.keys(t.skipReasons).length) {
    L.push('⏭ BỎ QUA, theo lý do');
    for (const [k, n] of Object.entries(t.skipReasons).sort((a, b) => b[1] - a[1])) L.push(`   ${n.toString().padStart(5)} × ${k}`);
  }
  return L.join('\n');
}
