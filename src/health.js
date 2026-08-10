// M19 · HEALTH WATCHDOG (bản đầy đủ) — 9 chỉ số ở docs/v2/05-TANG-VAN-HANH.md §M19.
//
// XUẤT XỨ CÓ THẬT — 09–10/08/2026: tài khoản Kimi hết tiền, log ghi 28.469 lần
// "insufficient balance", `systemctl` vẫn `active`, dashboard vẫn xanh, KHÔNG AI BIẾT
// trong 2 ngày; bot vẫn cần cù đẩy 2.652 khách vào hàng chờ sale với lý do "⚙️ Lỗi kỹ thuật".
//
// `llm-health.js` (bản rút gọn) đã lo phần PHẢN XẠ: nhận ra lỗi tầng tài khoản → DỪNG vòng
// xử lý → không spam handoff → tự dò sống lại. File này lo phần CÒN LẠI, và đó mới là phần
// đã thiếu suốt 2 ngày đó:
//
//   ① BIẾT: gom 9 chỉ số về một chỗ, có mức 🔴/🟠 và ngưỡng ghi rõ trên màn hình
//   ② BÁO: WhatsApp cho mức 🔴 — im lặng không phải tín hiệu tốt, im lặng chính là cái bẫy
//   ③ CHỦ ĐỘNG DÒ: mỗi 10 phút gọi LLM 1 tin ~20 token để biết credit còn hay hết,
//      KHÔNG chờ có khách nhắn mới phát hiện ra (2 ngày chết là 2 ngày vẫn có khách nhắn,
//      nhưng nếu hôm đó rơi vào đêm thì còn lâu hơn nữa)
//   ④ BÁO CÁO 09:00 HẰNG NGÀY KỂ CẢ KHI BÌNH THƯỜNG — một bản tin đều đặn thì người ta
//      nhận ra ngày nó KHÔNG tới; một hệ thống chỉ báo khi hỏng thì không phân biệt được
//      "hôm nay ổn" với "hôm nay bộ báo động cũng chết luôn"
//
// KHÔNG tự tắt AI, KHÔNG tự đổi cấu hình. Module này chỉ NHÌN và KÊU.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { llmHealth } from './llm-health.js';
import { readLog } from './ai-log.js';
import { economics } from './economics.js';
import { blockedStats } from './outbound-guard.js';
import { sendHealth } from './pancake-poll.js';
import { tokenHealth } from './page-registry.js';
import { listAiEnabled } from './store.js';
import { anthropic, aiExtras } from './llm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = path.join(ROOT, 'health-state.json');

const VN = 7 * 3600e3;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

// Mốc khởi động tiến trình — vài chỉ số (tin bị chặn, số lần nhường Botcake) là bộ đếm RAM
// nên chỉ có nghĩa khi so với lượng việc SINH RA TỪ LÚC KHỞI ĐỘNG, không phải so với cả sổ.
export const BOOT_AT = Date.now() - Math.round(process.uptime() * 1000);

export const healthConfig = {
  tickMs: Number(process.env.HEALTH_TICK_MS || 60e3),
  // Spec §M19 ghi "mỗi 10 phút", nhưng NGHIỆM THU của chính §M19 đòi "rút API key → cảnh
  // báo đỏ trong ≤5 phút". Hai câu đó chỏi nhau khi KHÔNG có khách nhắn: lúc đó lời gọi
  // LLM duy nhất là cú dò này, nên độ trễ phát hiện = probeMs + tickMs. 10 phút thì trượt
  // nghiệm thu; 4 phút cho đúng 5 phút ở ca xấu nhất.
  // Giá phải trả: ~360 cú/ngày × ~20 token — vẫn dưới 10.000đ/tháng, rẻ hơn 2 ngày chết
  // vô số lần. Muốn về đúng con số spec thì đặt HEALTH_PROBE_MS=600000.
  probeMs: Number(process.env.HEALTH_PROBE_MS || 4 * 60e3),
  // Đang hỏng thì dò dày hơn — để "nạp lại credit → tự chạy tiếp" xảy ra trong vài phút
  // chứ không phải chờ hết một chu kỳ 10 phút.
  probeDownMs: Number(process.env.HEALTH_PROBE_DOWN_MS || 3 * 60e3),
  reportAt: /^\d{1,2}:\d{2}$/.test(process.env.HEALTH_REPORT_AT || '') ? process.env.HEALTH_REPORT_AT : '09:00',
  alertWa: process.env.HEALTH_ALERT_WA || '',        // trống = nhóm mặc định WA_GROUP_JID
  renotifyMs: Number(process.env.HEALTH_RENOTIFY_MS || 60 * 60e3), // vẫn đỏ thì nhắc lại mỗi giờ
  peakFrom: Number(process.env.HEALTH_PEAK_FROM || 8),   // giờ VN
  peakTo: Number(process.env.HEALTH_PEAK_TO || 22),
  // Ngưỡng — để ra ngoài env vì "10 lỗi/5 phút" đúng ở nhịp poll 6s, sai ở nhịp khác.
  llmErrPer5m: Number(process.env.HEALTH_LLM_ERR_5M || 10),
  handoffErrPerHour: Number(process.env.HEALTH_HANDOFF_ERR_1H || 50),
  backoffPages: Number(process.env.HEALTH_BACKOFF_PAGES || 5),
  blockedPct: Number(process.env.HEALTH_BLOCKED_PCT || 5),
  closeDropPct: Number(process.env.HEALTH_CLOSE_DROP_PCT || 40),
  logStaleMin: Number(process.env.HEALTH_LOG_STALE_MIN || 30),
};

const vnHour = (t) => new Date(t + VN).getUTCHours();
const vnDayKey = (t) => new Date(t + VN).toISOString().slice(0, 10);
const vnHm = (t) => new Date(t + VN).toISOString().slice(11, 16);
export const inPeakHours = (t = Date.now()) => {
  const h = vnHour(t);
  return h >= healthConfig.peakFrom && h < healthConfig.peakTo;
};

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
const writeState = (s) => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error('[health] lưu mốc lỗi:', e.message); } };

// ─────────────────────────────────────────────────────────────────────────────
// 9 CHỈ SỐ
//
// Mỗi chỉ số trả về đúng bốn thứ: đang ở mức nào · con số đo được · ngưỡng · phải làm gì.
// Thiếu "phải làm gì" thì cảnh báo chỉ là tiếng ồn — người trực 2h sáng không có nghĩa vụ
// đoán xem cái đèn đỏ này muốn họ làm cái gì.
// ─────────────────────────────────────────────────────────────────────────────

const GREEN = 'green'; const ORANGE = 'orange'; const RED = 'red';
const worst = (a, b) => ([RED, ORANGE, GREEN].find((l) => l === a || l === b) || GREEN);

// Sổ AI đọc lại tốn công (15.970 dòng lúc 10/08/2026) mà watchdog chạy mỗi phút → cache ngắn.
let _rows = { at: 0, data: null };
function logRows(now) {
  if (_rows.data && now - _rows.at < 15e3) return _rows.data;
  _rows = { at: now, data: readLog() };
  return _rows.data;
}

function scanLog(rows, now) {
  const h1 = now - HOUR;
  let replies1h = 0; let handoffErr1h = 0; let lastAt = 0; let repliesSinceBoot = 0;
  for (const r of rows) {
    if (r.t > lastAt) lastAt = r.t;
    if (r.t >= BOOT_AT && r.type === 'reply') repliesSinceBoot++;
    if (r.t < h1) continue;
    if (r.type === 'reply') replies1h++;
    else if (r.type === 'handoff' && r.kind === 'error') handoffErr1h++;
  }
  return { replies1h, handoffErr1h, lastAt, repliesSinceBoot };
}

// Tỷ lệ chốt 7 ngày này so với 7 ngày trước. Chỉ so khi tuần trước đủ lớn — 1 đơn/3 khách
// tụt xuống 0 đơn/2 khách là "giảm 100%" về mặt số học và vô nghĩa về mặt vận hành.
function closeRateTrend(now, rows) {
  const cur = economics({ fromMs: now - 7 * DAY, toMs: now, rows }).totals;
  const prev = economics({ fromMs: now - 14 * DAY, toMs: now - 7 * DAY, rows }).totals;
  const enough = prev.leads >= 50;
  const dropPct = (enough && prev.closeRatePct > 0 && cur.closeRatePct != null)
    ? +(((prev.closeRatePct - cur.closeRatePct) / prev.closeRatePct) * 100).toFixed(1)
    : null;
  return { cur: cur.closeRatePct, prev: prev.closeRatePct, prevLeads: prev.leads, dropPct, enough };
}

/**
 * Toàn bộ 9 chỉ số + mức tổng.
 * KHÔNG gây tác dụng phụ (không gửi tin, không dò LLM) — gọi bao nhiêu lần cũng được,
 * dashboard tự do refresh.
 */
export function healthReport({ now = Date.now(), rows } = {}) {
  const R = rows || logRows(now);
  const L = llmHealth();
  const s = scanLog(R, now);
  const peak = inPeakHours(now);
  const aiPages = listAiEnabled().length;
  const backoff = sendHealth().filter((p) => (p.pausedUntil || 0) > now);
  const deadTokens = tokenHealth().filter((t) => t.dead);
  const blocked = blockedStats();
  const trend = closeRateTrend(now, R);

  const checks = [];
  const add = (c) => checks.push(c);

  // ① Lỗi 401/402/429 từ LLM — >10 lần/5 phút → 🔴 DỪNG HỆ THỐNG + WhatsApp
  add({
    id: 'llm_errors', label: 'Lỗi 401/402/429 từ LLM',
    level: L.billingErrorsIn5m > healthConfig.llmErrPer5m ? RED : GREEN,
    value: `${L.billingErrorsIn5m} lỗi / 5 phút`,
    threshold: `>${healthConfig.llmErrPer5m} / 5 phút`,
    detail: L.lastError ? `lỗi cuối: ${L.lastError.slice(0, 120)}` : '',
    action: 'Kiểm tra credit / API key của nhà cung cấp AI.',
  });

  // ② Chuỗi `insufficient balance` — ≥1 lần là báo ngay. Đây chính là chỉ số đáng lẽ
  //    phải tồn tại từ 08/08/2026.
  add({
    id: 'llm_account', label: 'Tầng LLM hỏng vì tài khoản (hết tiền / sai key)',
    level: L.down ? RED : GREEN,
    value: L.down ? `ĐANG DỪNG ${L.downMinutes} phút` : 'bình thường',
    threshold: '≥1 lần',
    detail: L.down ? L.reason : `lần gọi thành công gần nhất: ${L.minutesSinceOk} phút trước`,
    action: 'NẠP TIỀN / đổi key. Hội thoại đang được GIỮ NGUYÊN — nạp xong bot tự chạy tiếp, không cần restart.',
  });

  // ③ Tin AI gửi trong 1h qua = 0 trong khung 08:00–22:00 → 🔴
  add({
    id: 'ai_silent', label: 'Tin AI gửi trong 1 giờ qua',
    level: (peak && aiPages > 0 && s.replies1h === 0) ? RED : GREEN,
    value: `${s.replies1h} tin`,
    threshold: `=0 trong khung ${healthConfig.peakFrom}:00–${healthConfig.peakTo}:00`,
    detail: peak ? `${aiPages} page đang bật AI` : 'ngoài giờ cao điểm — không xét',
    action: 'Xem log polling: token Pancake, page backoff, hay tầng LLM đang dừng.',
  });

  // ④ Handoff kind=error >50/giờ → 🔴. v1 đẻ 2.652 cái trong 2 ngày vì thiếu đúng cái ngưỡng này.
  add({
    id: 'handoff_error', label: 'Handoff "⚙️ Lỗi kỹ thuật" trong 1 giờ',
    level: s.handoffErr1h > healthConfig.handoffErrPerHour ? RED : GREEN,
    value: `${s.handoffErr1h} cái`,
    threshold: `>${healthConfig.handoffErrPerHour}/giờ`,
    detail: 'Hàng chờ sale đang bị làm ngập bằng rác — đúng cảnh 09/08/2026 (1.213 cái/ngày).',
    action: 'Xem lỗi lặp trong log; nếu do LLM thì cửa dừng ở llm-health đang KHÔNG chặn được.',
  });

  // ⑤ Page đang backoff >5 → 🟠
  add({
    id: 'pages_backoff', label: 'Page đang tạm ngừng gửi (backoff)',
    level: backoff.length > healthConfig.backoffPages ? ORANGE : GREEN,
    value: `${backoff.length} page`,
    threshold: `>${healthConfig.backoffPages} page cùng lúc`,
    detail: backoff.slice(0, 5).map((p) => `${p.page}: ${p.lastError}`).join(' · '),
    action: 'Thường là Meta chặn (#2022) hoặc token page hỏng — xem tab Token.',
  });

  // ⑥ Token Pancake chết ≥1 → 🟠
  add({
    id: 'pancake_token', label: 'Token Pancake chết',
    level: deadTokens.length >= 1 ? ORANGE : GREEN,
    value: `${deadTokens.length}/${tokenHealth().length} token`,
    threshold: '≥1',
    detail: deadTokens.map((t) => `#${t.idx + 1} (${t.source}): ${t.error}`).join(' · '),
    action: 'Thay token trong .env. Thứ tự trong .env = thứ tự failover.',
  });

  // ⑦ Tỷ lệ tin bị M09 chặn >5% → 🟠
  //    Sổ tin bị chặn là RAM (trần 500) nên mẫu số phải là số tin TỪ LÚC KHỞI ĐỘNG.
  const blockedPct = s.repliesSinceBoot > 0 ? +((blocked.total / (blocked.total + s.repliesSinceBoot)) * 100).toFixed(1) : null;
  add({
    id: 'blocked_rate', label: 'Tin bị Outbound Guard chặn',
    level: blockedPct != null && blockedPct > healthConfig.blockedPct ? ORANGE : GREEN,
    value: blockedPct == null ? '—' : `${blockedPct}%`,
    threshold: `>${healthConfig.blockedPct}%`,
    detail: `${blocked.total} tin bị chặn / ${s.repliesSinceBoot} tin đã gửi (tính từ lúc khởi động; sổ chặn giữ trong RAM, trần 500)`,
    action: 'Mở tab "Tin bị chặn" xem luật nào bắt nhiều — kịch bản mới có thể đang sinh hành vi xấu.',
  });

  // ⑧ closeRate toàn hệ thống tụt >40% so với 7 ngày trước → 🟠
  add({
    id: 'close_rate', label: 'Tỷ lệ chốt 7 ngày so với 7 ngày trước',
    level: trend.dropPct != null && trend.dropPct > healthConfig.closeDropPct ? ORANGE : GREEN,
    value: trend.cur == null ? '—' : `${trend.cur}%`,
    threshold: `tụt >${healthConfig.closeDropPct}%`,
    detail: trend.enough
      ? `tuần trước ${trend.prev}% (${trend.prevLeads} khách)${trend.dropPct == null ? '' : ` → ${trend.dropPct > 0 ? 'tụt' : 'tăng'} ${Math.abs(trend.dropPct)}%`}`
      : `tuần trước chỉ ${trend.prevLeads} khách — chưa đủ mẫu để so`,
    action: 'Mở Unit Economics cắt theo page × kịch bản để biết bản nào làm tụt.',
  });

  // ⑨ Sổ AI không có bản ghi mới >30 phút trong giờ cao điểm → 🔴
  const staleMin = s.lastAt ? Math.round((now - s.lastAt) / 60000) : null;
  add({
    id: 'log_stale', label: 'Sổ AI có bản ghi mới gần nhất',
    level: (peak && aiPages > 0 && (staleMin == null || staleMin > healthConfig.logStaleMin)) ? RED : GREEN,
    value: staleMin == null ? 'sổ rỗng' : `${staleMin} phút trước`,
    threshold: `>${healthConfig.logStaleMin} phút trong giờ cao điểm`,
    detail: peak ? '' : 'ngoài giờ cao điểm — không xét',
    action: 'Sổ AI đứng nghĩa là cả vòng xử lý đứng, không riêng gì việc trả lời.',
  });

  const level = checks.reduce((acc, c) => worst(acc, c.level), GREEN);
  return {
    at: now, level,
    red: checks.filter((c) => c.level === RED).map((c) => c.id),
    orange: checks.filter((c) => c.level === ORANGE).map((c) => c.id),
    checks,
    llm: L,
    probe: { ...lastProbe },
    context: {
      aiPages, peak, bootAt: BOOT_AT,
      replies1h: s.replies1h, repliesSinceBoot: s.repliesSinceBoot,
      lastLogAt: s.lastAt, closeRate: trend,
      provider: config.aiProvider, model: config.modelClassifier,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KIỂM TRA SỐNG ĐỊNH KỲ
//
// Vì sao phải CHỦ ĐỘNG gọi: mọi chỉ số khác đều là hệ quả của việc CÓ KHÁCH NHẮN. Đêm
// không có khách thì mọi đèn đều xanh dù tài khoản đã hết tiền từ tối, và 08:00 sáng hôm
// sau là ngày làm việc đầu tiên mất trắng.
// Lời gọi này đi qua `anthropic` bọc trong llm.js → tự động báo noteLlmOk/noteLlmError,
// nên nó vừa là phép đo vừa là cửa TỰ HỒI PHỤC.
// ─────────────────────────────────────────────────────────────────────────────
export const lastProbe = { at: 0, ok: null, ms: 0, error: '', tokens: 0 };

export async function probeLlm() {
  const t0 = Date.now();
  try {
    const r = await anthropic.messages.create({
      model: config.modelClassifier,
      max_tokens: 8,
      system: 'Reply with the single word: ok',
      messages: [{ role: 'user', content: 'ping' }],
      ...aiExtras,
    });
    const u = r?.usage || {};
    Object.assign(lastProbe, {
      at: Date.now(), ok: true, ms: Date.now() - t0, error: '',
      tokens: (u.input_tokens || 0) + (u.output_tokens || 0),
    });
  } catch (e) {
    // Không nuốt lỗi im lặng, cũng không ném lên: người gọi là bộ hẹn giờ.
    Object.assign(lastProbe, { at: Date.now(), ok: false, ms: Date.now() - t0, error: String(e?.message || e).slice(0, 200), tokens: 0 });
    console.warn(`[health] dò LLM THẤT BẠI (${lastProbe.ms}ms): ${lastProbe.error.slice(0, 140)}`);
  }
  return { ...lastProbe };
}

// ─────────────────────────────────────────────────────────────────────────────
// BẢN TIN
// ─────────────────────────────────────────────────────────────────────────────

const ICON = { red: '🔴', orange: '🟠', green: '🟢' };

/** Bản tin cảnh báo — chỉ những dòng KHÔNG xanh, kèm việc phải làm. */
export function alertText(rep = healthReport()) {
  const bad = rep.checks.filter((c) => c.level !== GREEN);
  const lines = [`${ICON[rep.level]} AI CLOSER — ${bad.length} chỉ số bất thường (${vnHm(rep.at)} giờ VN)`, ''];
  for (const c of bad) {
    lines.push(`${ICON[c.level]} ${c.label}: ${c.value}  (ngưỡng ${c.threshold})`);
    if (c.detail) lines.push(`   ${c.detail}`);
    lines.push(`   → ${c.action}`);
  }
  const link = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (link) lines.push('', `👉 ${link}/admin/api/ops/ui`);
  return lines.join('\n');
}

/** Báo cáo sức khoẻ hằng ngày — GỬI KỂ CẢ KHI MỌI THỨ BÌNH THƯỜNG (spec §M19). */
export function dailyText(rep = healthReport()) {
  const c = rep.context;
  const lines = [
    `${ICON[rep.level]} SỨC KHOẺ AI CLOSER — ${vnDayKey(rep.at)} ${vnHm(rep.at)}`,
    '',
    `${c.aiPages} page bật AI · ${c.replies1h} tin AI trong 1 giờ qua`,
    `Nhà cung cấp: ${c.provider} · tầng LLM: ${rep.llm.down ? `🔴 ĐANG DỪNG ${rep.llm.downMinutes} phút` : '🟢 sống'}`,
    `Dò sống gần nhất: ${lastProbe.at ? `${lastProbe.ok ? '✓' : '✗'} ${vnHm(lastProbe.at)} (${lastProbe.ms}ms)` : 'chưa dò lần nào'}`,
    `Tỷ lệ chốt 7 ngày: ${c.closeRate.cur == null ? '—' : c.closeRate.cur + '%'} (tuần trước ${c.closeRate.prev == null ? '—' : c.closeRate.prev + '%'})`,
    '',
  ];
  const bad = rep.checks.filter((x) => x.level !== GREEN);
  if (!bad.length) lines.push('Cả 9 chỉ số đều xanh.');
  else for (const x of bad) lines.push(`${ICON[x.level]} ${x.label}: ${x.value} (ngưỡng ${x.threshold})`, `   → ${x.action}`);
  const link = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  if (link) lines.push('', `👉 ${link}/admin/api/ops/ui`);
  return lines.join('\n');
}

// Nạp baileys ĐỘNG: nạp tĩnh sẽ kéo cả thư viện WhatsApp vào mọi tiến trình import
// admin.js, kể cả `npm test` (cùng lý do với admin-economics.js).
async function sendWa(text) {
  const { sendToGroup } = await import('./wa.js');
  return sendToGroup(text, healthConfig.alertWa || undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
// BỘ HẸN GIỜ
// ─────────────────────────────────────────────────────────────────────────────

let timer = null;
const alertState = { level: GREEN, keys: '', sentAt: 0 };

/** Một nhịp canh: dò LLM khi tới hạn → chấm điểm → báo nếu cần → bản tin 09:00. */
export async function tick(now = Date.now()) {
  // ① dò sống. Khi đang hỏng thì dò dày hơn để bắt được lúc credit vừa được nạp.
  const gap = llmHealth().down ? healthConfig.probeDownMs : healthConfig.probeMs;
  if (now - lastProbe.at >= gap) await probeLlm();

  let rep = healthReport({ now });

  // ② "0 tin AI trong 1 giờ giờ cao điểm" là NGHI NGỜ, không phải kết luận — có thể chỉ là
  //    vắng khách. Dò thêm một phát để biến nghi ngờ thành câu trả lời trước khi hú còi.
  if (rep.red.includes('ai_silent') && now - lastProbe.at > 2 * 60e3) {
    await probeLlm();
    rep = healthReport({ now });
  }

  // ③ báo động. Chỉ bắn khi TẬP chỉ số đỏ đổi, hoặc đã quá renotifyMs mà vẫn đỏ —
  //    còi kêu mỗi phút thì sau 10 phút không ai còn nghe nữa.
  const keys = rep.red.join(',');
  if (rep.level === RED) {
    if (keys !== alertState.keys || now - alertState.sentAt >= healthConfig.renotifyMs) {
      const out = await sendWa(alertText(rep));
      alertState.sentAt = now;
      console.error(`[health] 🔴 ${keys} — WhatsApp: ${out.ok ? 'đã gửi' : 'LỖI ' + out.error}`);
    }
  } else if (alertState.level === RED) {
    await sendWa(`🟢 AI CLOSER đã trở lại bình thường (${vnHm(now)} giờ VN)\nChỉ số vừa xanh lại: ${alertState.keys}`);
    console.log('[health] 🟢 hết đỏ — đã báo xanh lại.');
    alertState.sentAt = 0;
  }
  alertState.level = rep.level;
  alertState.keys = keys;

  // ④ bản tin hằng ngày.
  const st = readState();
  const [hh, mm] = healthConfig.reportAt.split(':').map(Number);
  const d = new Date(now + VN);
  const dueDay = vnDayKey(now);
  if (st.dailyDay !== dueDay && (d.getUTCHours() > hh || (d.getUTCHours() === hh && d.getUTCMinutes() >= mm))) {
    const out = await sendWa(dailyText(rep));
    // Ghi mốc kể cả khi gửi lỗi: phiên WhatsApp rớt mà cứ thử lại mỗi phút suốt ngày là
    // tự spam log chứ không chữa được lỗi. Lỗi hiện ở log để người xử lý.
    writeState({ ...st, dailyDay: dueDay, dailyAt: now, dailyOk: !!out.ok, dailyError: out.error || '' });
    console.log(out.ok ? `[health] ✓ đã gửi báo cáo sức khoẻ ${healthConfig.reportAt}` : `[health] ✗ gửi báo cáo lỗi: ${out.error}`);
  }

  return rep;
}

export function startHealthWatchdog() {
  if (timer) return { started: true, why: 'đã chạy' };
  // Máy local TUYỆT ĐỐI không được bắn tin vào nhóm thật, cũng không đốt token dò LLM
  // (cùng lá chắn với báo cáo tuần của M20).
  if (process.env.PANCAKE_READONLY === '1') return { started: false, why: 'PANCAKE_READONLY=1 (máy local)' };
  if (process.env.HEALTH === '0') return { started: false, why: 'HEALTH=0' };

  timer = setInterval(() => { tick().catch((e) => console.error('[health] nhịp canh lỗi:', e.message)); }, healthConfig.tickMs);
  timer.unref?.(); // đừng giữ tiến trình sống chỉ vì cái hẹn giờ này
  console.log(`[health] canh mỗi ${Math.round(healthConfig.tickMs / 1000)}s · dò LLM mỗi ${Math.round(healthConfig.probeMs / 60000)} phút · báo cáo ${healthConfig.reportAt} · WhatsApp: ${process.env.WA_GROUP_JID || healthConfig.alertWa ? 'BẬT' : 'chưa đặt WA_GROUP_JID'}`);
  return { started: true, timer };
}

export function stopHealthWatchdog() { if (timer) { clearInterval(timer); timer = null; } }
