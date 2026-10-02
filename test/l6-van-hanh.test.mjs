// Nghiệm thu LUỒNG 6 — VẬN HÀNH (M18 Ops Console · M19 Health Watchdog).
//
// Ba thứ được soi kỹ nhất ở đây, vì cả ba đều là loại lỗi KHÔNG kêu khi hỏng:
//   ① Giám sát M05 khoá oan — % HANDOFF theo page + đúng CÂU đã kích hoạt khoá.
//      45% hội thoại từng bị khoá vì đoán nhầm "người thật vào chat"; nếu màn hình này
//      đếm sai thì cái sai đó im lặng y như cũ.
//   ② Va chạm Botcake — phải đối chiếu tay được, nên mốc "trong phiên AI" tính theo VỊ TRÍ
//      tin (timestamp Pancake không kèm múi giờ), và hội thoại không soi được phải được
//      BÁO RA chứ không âm thầm tính là 0.
//   ③ Không lộ token — dashboard chạy trên IP công khai.

process.env.HEALTH = '0';        // không bật bộ hẹn giờ khi chạy test
process.env.PAGE_REGISTRY = '0';

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { matchTemplate, isAutomationTemplate, listTemplates, removeTemplate } from '../src/bot-registry.js';
import { llmHealth, noteLlmError, noteLlmOk } from '../src/llm-health.js';
import { S } from '../src/conv-state.js';

const PAGE = '111';
const conv = (psid) => `${PAGE}_${psid}`;

// ─────────────────────────────────────────────────────────────────────────────
// ① SỔ NHẬN DIỆN TEMPLATE — nói được MẪU NÀO đã bắt, không chỉ có/không
// ─────────────────────────────────────────────────────────────────────────────

test('T1 · matchTemplate trả về đúng mẫu đã bắt (để người vận hành gỡ được mẫu quét quá rộng)', () => {
  const r = matchTemplate('Please provide the information below for the shipping');
  assert.equal(r.hit, true);
  assert.equal(r.kind, 'pattern');
  assert.equal(r.pattern, 'please provide the information below for the shipping');
  assert.equal(r.builtin, true);
});

test('T2 · ký tự ẩn và chữ kiểu cách được gọi tên riêng, không lẫn vào mẫu regex', () => {
  assert.equal(matchTemplate('hello\u{E0101}').kind, 'invisible');
  assert.equal(matchTemplate('𝗢𝗙𝗙 today').kind, 'styled');
});

test('T3 · câu sale gõ tay KHÔNG bị bắt — bắt nhầm ở đây là AI tự khoá chính mình', () => {
  for (const t of ['ok dear', 'thanks madam', 'pls wait po', '']) {
    assert.equal(matchTemplate(t).hit, false, `"${t}" không được coi là template`);
  }
});

test('T4 · isAutomationTemplate giữ nguyên hành vi cũ (M05/M07 đang dùng)', () => {
  assert.equal(isAutomationTemplate('your order has been created'), true);
  assert.equal(isAutomationTemplate('ok dear'), false);
});

test('T5 · KHÔNG gỡ được mẫu dựng sẵn bằng một cú bấm', () => {
  const before = listTemplates().builtin;
  const r = removeTemplate('your order has been created');
  assert.equal(r.ok, false);
  assert.match(r.error, /dựng sẵn/);
  assert.equal(listTemplates().builtin, before);
  assert.equal(isAutomationTemplate('your order has been created'), true);
});

test('T6 · listTemplates kèm cờ builtin cho từng mẫu (UI cần biết cái nào gỡ được)', () => {
  const l = listTemplates();
  assert.equal(l.items.length, l.builtin + l.extra);
  assert.ok(l.items.every((x) => typeof x.pattern === 'string' && typeof x.builtin === 'boolean'));
});

// ─────────────────────────────────────────────────────────────────────────────
// ② GIÁM SÁT M05 KHOÁ OAN — việc BẮT BUỘC của vòng 2
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ③ VA CHẠM BOTCAKE — phải đối chiếu tay được
// ─────────────────────────────────────────────────────────────────────────────

const msg = (who, text) => ({ id: Math.random().toString(36).slice(2), from: { id: who === 'page' ? PAGE : 'u1' }, message: text });
const AI_TEXT = 'So ready na ba sa address mo?';

// ─────────────────────────────────────────────────────────────────────────────
// ④ TAB TOKEN — thứ tự .env = thứ tự failover, và KHÔNG lộ token
// ─────────────────────────────────────────────────────────────────────────────

const HEALTH3 = [
  { idx: 0, source: 'chính (.env)', name: 'A', tail: '12345678', dead: false, pages: 40, error: '' },
  { idx: 1, source: 'phụ (.env)', name: 'B', tail: '87654321', dead: false, pages: 200, error: '' },
];
const REG3 = {
  p1: { tokensAll: [0, 1] }, p2: { tokensAll: [1] }, p3: { tokensAll: [1] }, p4: { tokensAll: [0] },
};

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ M19 · 9 CHỈ SỐ + BẢN TIN
// ─────────────────────────────────────────────────────────────────────────────

test('T26 · llm-health TÁCH lỗi tài khoản/hạn mức khỏi lỗi mạng lặt vặt', () => {
  noteLlmOk();
  const before = llmHealth().billingErrorsIn5m;
  noteLlmError({ message: 'socket hang up' });          // lỗi mạng
  noteLlmError({ message: 'rate limit', status: 429 }); // hạn mức
  const h = llmHealth();
  assert.equal(h.billingErrorsIn5m, before + 1, '10 lần rớt mạng ≠ 10 lần bị từ chối vì hết tiền');
  assert.ok(h.errorsIn5m >= before + 2);
  noteLlmOk();
});

