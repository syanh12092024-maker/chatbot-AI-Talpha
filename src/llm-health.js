// M19 (rút gọn) · LLM HEALTH WATCHDOG
// Spec: docs/v2/05-TANG-VAN-HANH.md § M19
//
// XUẤT XỨ CÓ THẬT: 08–10/08/2026 tài khoản Kimi bị khoá vì hết tiền.
//   · log ghi 28.469 lần "insufficient balance, please recharge"
//   · systemctl vẫn 'active', dashboard vẫn xanh → KHÔNG AI BIẾT trong 2 ngày
//   · bot không trả lời được ai, nhưng vẫn cần cù đẩy 2.652 khách vào hàng chờ sale
//     với lý do "⚙️ Lỗi kỹ thuật" — làm ngập hàng chờ bằng rác
//
// Module này làm 3 việc:
//   ① nhận ra lỗi "không tự hồi phục ở tầng tài khoản" (hết tiền / sai key / khoá)
//   ② DỪNG vòng xử lý thay vì spam handoff — giữ nguyên hội thoại để nạp tiền xong chạy tiếp
//   ③ tự thử lại định kỳ, sống lại thì tự chạy tiếp

const RETRY_MS = 5 * 60 * 1000;   // thử lại mỗi 5 phút
const ERR_WINDOW_MS = 5 * 60 * 1000;
const ERR_THRESHOLD = 10;          // >10 lỗi/5 phút = coi như tầng LLM hỏng

// Lỗi TÀI KHOẢN — sửa bằng cách nạp tiền / đổi key, không phải bằng thử lại.
const ACCOUNT_ERR = /(insufficient balance|insufficient_quota|suspended|recharge your account|billing|exceeded your current quota|invalid api key|authentication_error|invalid_api_key|permission_error)/i;

const state = {
  down: false,
  reason: '',
  accountError: false, // hỏng vì TÀI KHOẢN (nạp tiền/đổi key) chứ không phải lỗi thoáng qua
  since: 0,
  lastTryAt: 0,
  // Các lỗi gần đây: { at, status, msg }. M19 (health.js) cần TÁCH được 401/402/429 khỏi
  // lỗi mạng lặt vặt — ngưỡng ">10 lỗi 401/402/429 trong 5 phút" của spec là về tầng tài
  // khoản/hạn mức, không phải về một cú rớt mạng.
  errors: [],
  totalErrors: 0,
  lastError: '',
  lastErrorAt: 0,
  lastOkAt: Date.now(),
};

function prune() {
  const cut = Date.now() - ERR_WINDOW_MS;
  while (state.errors.length && state.errors[0].at < cut) state.errors.shift();
}

function goDown(reason, isAccount = false) {
  if (state.down) return;
  state.down = true;
  state.reason = reason;
  state.accountError = isAccount;
  state.since = Date.now();
  state.lastTryAt = Date.now();
  console.error(`[llm-health] 🔴 TẦNG LLM HỎNG — DỪNG XỬ LÝ. Lý do: ${reason}`);
  console.error('[llm-health] 🔴 Hội thoại được GIỮ NGUYÊN, không đẩy hàng chờ sale. Sửa xong bot tự chạy tiếp.');
}

function goUp() {
  if (!state.down) return;
  const mins = Math.round((Date.now() - state.since) / 60000);
  state.down = false;
  state.reason = '';
  state.accountError = false;
  state.errors = [];
  console.log(`[llm-health] 🟢 TẦNG LLM SỐNG LẠI sau ${mins} phút — tiếp tục xử lý.`);
}

/** Gọi khi một lời gọi LLM THÀNH CÔNG. */
export function noteLlmOk() {
  state.lastOkAt = Date.now();
  state.errors = [];
  goUp();
}

/** Gọi khi một lời gọi LLM LỖI. Trả về true nếu đây là lỗi tầng tài khoản. */
export function noteLlmError(err) {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.statusCode || 0);
  state.totalErrors++;
  state.lastError = msg.slice(0, 200);
  state.lastErrorAt = Date.now();
  state.errors.push({ at: Date.now(), status, msg: msg.slice(0, 200) });
  prune();

  const isAccount = ACCOUNT_ERR.test(msg) || status === 401 || status === 402 || status === 403;
  if (isAccount) {
    goDown(`lỗi tài khoản (${status || '?'}): ${msg.slice(0, 160)}`, true);
    return true;
  }
  if (state.errors.length >= ERR_THRESHOLD) {
    goDown(`${state.errors.length} lỗi LLM trong 5 phút — lỗi cuối: ${msg.slice(0, 160)}`);
    return true;
  }
  return false;
}

// Lỗi TẦNG TÀI KHOẢN/HẠN MỨC trong 5 phút — đúng chỉ số đầu bảng §M19.
// Tách khỏi tổng số lỗi: 10 lần rớt mạng ≠ 10 lần bị từ chối vì hết tiền, mà hai thứ đó
// cần hai cách xử lý khác hẳn nhau (một cái chờ, một cái phải nạp tiền).
const BILLING_STATUS = new Set([401, 402, 403, 429]);
export function llmErrorBreakdown() {
  prune();
  const byStatus = {};
  let billing = 0;
  for (const e of state.errors) {
    const k = e.status || 0;
    byStatus[k] = (byStatus[k] || 0) + 1;
    if (BILLING_STATUS.has(e.status)) billing++;
  }
  return { total: state.errors.length, billing, byStatus };
}

/**
 * Tầng LLM có đang hỏng không.
 * Sau mỗi RETRY_MS cho phép ĐÚNG MỘT lời gọi đi qua để dò xem đã sống lại chưa
 * (lời gọi đó thành công thì noteLlmOk() sẽ mở cổng trở lại).
 */
export function isLlmDown() {
  if (!state.down) return false;
  if (Date.now() - state.lastTryAt >= RETRY_MS) {
    state.lastTryAt = Date.now();
    console.warn('[llm-health] thử lại một lời gọi để dò xem tầng LLM sống chưa…');
    return false;
  }
  return true;
}

export function llmHealth() {
  prune();
  const br = llmErrorBreakdown();
  return {
    down: state.down,
    reason: state.reason,
    accountError: state.accountError,
    since: state.since,
    downMinutes: state.down ? Math.round((Date.now() - state.since) / 60000) : 0,
    errorsIn5m: state.errors.length,
    billingErrorsIn5m: br.billing,   // 401/402/403/429 — ngưỡng >10/5 phút của §M19
    errorsByStatus: br.byStatus,
    totalErrors: state.totalErrors,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt,
    lastOkAt: state.lastOkAt,
    minutesSinceOk: Math.round((Date.now() - state.lastOkAt) / 60000),
    threshold: ERR_THRESHOLD,
  };
}
