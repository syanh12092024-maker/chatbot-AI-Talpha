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
  since: 0,
  lastTryAt: 0,
  errors: [],       // mốc thời gian các lỗi gần đây
  totalErrors: 0,
  lastOkAt: Date.now(),
};

function prune() {
  const cut = Date.now() - ERR_WINDOW_MS;
  while (state.errors.length && state.errors[0] < cut) state.errors.shift();
}

function goDown(reason) {
  if (state.down) return;
  state.down = true;
  state.reason = reason;
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
  state.errors.push(Date.now());
  prune();

  const isAccount = ACCOUNT_ERR.test(msg) || status === 401 || status === 402 || status === 403;
  if (isAccount) {
    goDown(`lỗi tài khoản (${status || '?'}): ${msg.slice(0, 160)}`);
    return true;
  }
  if (state.errors.length >= ERR_THRESHOLD) {
    goDown(`${state.errors.length} lỗi LLM trong 5 phút — lỗi cuối: ${msg.slice(0, 160)}`);
    return true;
  }
  return false;
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
  return {
    down: state.down,
    reason: state.reason,
    since: state.since,
    downMinutes: state.down ? Math.round((Date.now() - state.since) / 60000) : 0,
    errorsIn5m: state.errors.length,
    totalErrors: state.totalErrors,
    lastOkAt: state.lastOkAt,
    minutesSinceOk: Math.round((Date.now() - state.lastOkAt) / 60000),
  };
}
