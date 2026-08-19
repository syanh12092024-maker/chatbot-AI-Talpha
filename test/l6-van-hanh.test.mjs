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
import {
  pageOfConv, convStateByPage, yieldByPage, collisionsInConv, aiSessions,
  tokenTable, opsConfig, LOCK_GUIDE,
} from '../src/admin-ops.js';
import { healthReport, alertText, dailyText, inPeakHours, BOOT_AT } from '../src/health.js';
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

test('T7 · convId `pageId_psid` quy được về page (conv-state.js không lưu pageId)', () => {
  assert.equal(pageOfConv('111_222'), '111');
  assert.equal(pageOfConv(''), '');
});

test('T8 · %HANDOFF theo page + 🔴 khi vượt ngưỡng 15%', () => {
  const states = new Map();
  for (let i = 0; i < 10; i++) states.set(conv(i), { state: i < 4 ? S.HANDOFF : S.SELLING, owner: 'AI', humanAt: 0 });
  const { rows } = convStateByPage({ states });
  const p = rows.find((r) => r.page === PAGE);
  assert.equal(p.total, 10);
  assert.equal(p.handoff, 4);
  assert.equal(p.handoffPct, 40);
  assert.equal(p.level, 'red', '40% > ngưỡng 15% phải là đỏ');
  assert.equal(opsConfig.handoffPct, 15);
});

test('T9 · page ít hội thoại KHÔNG bị hú còi (1/2 = 50% nhưng mẫu quá nhỏ)', () => {
  const states = new Map([[conv('a'), { state: S.HANDOFF, owner: 'SALE' }], [conv('b'), { state: S.SELLING, owner: 'AI' }]]);
  assert.equal(convStateByPage({ states }).rows[0].level, 'green');
});

test('T10 · liệt kê ĐÚNG CÂU đã kích hoạt khoá — đây là chỗ soi oan hay không', () => {
  const now = Date.now();
  const states = new Map([
    [conv('1'), { state: S.HANDOFF, owner: 'SALE', humanAt: now - 3600e3, lastReason: 'nhân viên đã tiếp quản: "yes po available"', lastAiText: 'So ready na ba sa address mo?', aiTurns: 3 }],
    // HANDOFF vì lý do KHÁC (hết ngân sách) — không phải nghi án khoá oan, không được trộn vào
    [conv('2'), { state: S.HANDOFF, owner: 'SALE', humanAt: 0, lastReason: 'hết ngân sách lượt' }],
  ]);
  const { rows, triggers } = convStateByPage({ states, now });
  assert.equal(rows[0].handoff, 2);
  assert.equal(rows[0].humanLocked, 1, 'chỉ 1 ca là do "người thật vào chat"');
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].text, 'yes po available');
  assert.equal(triggers[0].lastAiText, 'So ready na ba sa address mo?');
  assert.equal(triggers[0].ageHours, 1);
});

test('T11 · AI nhường Botcake — 🔴 khi vượt 50% số lượt, mẫu số là tin AI TỪ LÚC KHỞI ĐỘNG', () => {
  const since = 1000;
  const rows = Array.from({ length: 4 }, (_, i) => ({ t: since + i, type: 'reply', page: PAGE, cust: 'c' + i }));
  const r = yieldByPage({ rows, since, yields: [{ page: PAGE, before: 10, send: 6, total: 16 }] });
  const p = r.rows.find((x) => x.page === PAGE);
  assert.equal(p.yields, 16);
  assert.equal(p.replies, 4);
  assert.equal(p.yieldPct, 80);         // 16 / (16 + 4)
  assert.equal(p.level, 'red');
});

test('T12 · nhường ít thì xanh, và tin AI ghi TRƯỚC lúc khởi động không được tính vào mẫu số', () => {
  const since = 1000;
  const rows = [
    { t: 500, type: 'reply', page: PAGE, cust: 'x' },              // trước khi khởi động → bỏ
    ...Array.from({ length: 20 }, (_, i) => ({ t: since + i, type: 'reply', page: PAGE, cust: 'c' + i })),
  ];
  const p = yieldByPage({ rows, since, yields: [{ page: PAGE, before: 2, send: 0, total: 2 }] }).rows[0];
  assert.equal(p.replies, 20);
  assert.equal(p.yieldPct, 9.1);        // 2 / 22
  assert.equal(p.level, 'green');
});

// ─────────────────────────────────────────────────────────────────────────────
// ③ VA CHẠM BOTCAKE — phải đối chiếu tay được
// ─────────────────────────────────────────────────────────────────────────────

const msg = (who, text) => ({ id: Math.random().toString(36).slice(2), from: { id: who === 'page' ? PAGE : 'u1' }, message: text });
const AI_TEXT = 'So ready na ba sa address mo?';

test('T13 · template Botcake ngay SAU tin AI = va chạm, kèm mẫu đã bắt', () => {
  const r = collisionsInConv({
    pageId: PAGE,
    aiTexts: [AI_TEXT],
    msgs: [
      msg('cust', 'magkano po'),
      msg('page', AI_TEXT),
      msg('cust', 'hindi pa'),
      msg('page', 'Please provide the information below for the shipping'),
    ],
  });
  assert.equal(r.aiSeen, true);
  assert.equal(r.hits.length, 1);
  assert.equal(r.hits[0].pattern, 'please provide the information below for the shipping');
});

test('T14 · template TRƯỚC khi AI nhập cuộc KHÔNG tính — "trong phiên AI" mới là va chạm', () => {
  const r = collisionsInConv({
    pageId: PAGE,
    aiTexts: [AI_TEXT],
    msgs: [
      msg('page', 'How can we help you today?'),   // Botcake chào, AI chưa nói → không phải va chạm
      msg('cust', 'magkano'),
      msg('page', AI_TEXT),
    ],
  });
  assert.equal(r.aiSeen, true);
  assert.equal(r.hits.length, 0);
});

test('T15 · tin của CHÍNH BOT MÌNH không bị đếm thành va chạm', () => {
  const OURS = 'Your order has been created, thank you!';
  const r = collisionsInConv({
    pageId: PAGE,
    aiTexts: [AI_TEXT, OURS],
    msgs: [msg('cust', 'ok'), msg('page', AI_TEXT), msg('cust', 'sige'), msg('page', OURS)],
  });
  assert.equal(r.hits.length, 0, 'khớp mẫu nhưng là tin mình gửi → không phải Botcake chen ngang');
});

test('T16 · không thấy tin AI trong cửa sổ 25 tin → KHÔNG đếm và phải báo ra (aiSeen=false)', () => {
  const r = collisionsInConv({
    pageId: PAGE,
    aiTexts: ['một câu AI không có trong cửa sổ này'],
    msgs: [msg('cust', 'hi'), msg('page', 'Please provide the information below for the shipping')],
  });
  assert.equal(r.aiSeen, false);
  assert.equal(r.hits.length, 0, 'thà không đếm còn hơn đếm sai rồi báo cáo là "đã soi hết"');
});

test('T17 · aiSessions chỉ lấy hội thoại AI đã nói trong cửa sổ giờ, gom theo (page,khách)', () => {
  const now = 1_000_000_000;
  const rows = [
    { t: now - 1e3, type: 'reply', page: PAGE, cust: 'c1', conv: conv('1'), name: 'Ana', text: AI_TEXT },
    { t: now - 2e3, type: 'reply', page: PAGE, cust: 'c1', conv: conv('1'), text: 'hello' },
    { t: now - 48 * 3600e3, type: 'reply', page: PAGE, cust: 'c2', conv: conv('2') },  // ngoài 24h
    { t: now - 1e3, type: 'handoff', page: PAGE, cust: 'c3', conv: conv('3') },         // không phải tin AI
  ];
  const s = aiSessions({ rows, hours: 24, now });
  assert.equal(s.length, 1);
  assert.equal(s[0].replies, 2);
  assert.equal(s[0].name, 'Ana');
  assert.deepEqual(s[0].aiTexts.sort(), [AI_TEXT, 'hello'].sort());
});

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

test('T18 · cảnh báo khi token CHÍNH không phải con phủ nhiều page bật AI nhất', () => {
  const t = tokenTable({ health: HEALTH3, reg: REG3, aiPages: ['p1', 'p2', 'p3'] });
  assert.equal(t.rows[0].aiPages, 1);
  assert.equal(t.rows[1].aiPages, 3);
  assert.ok(t.warnings.some((w) => /thứ tự failover/i.test(w)), 'phải nói rõ vì sao thứ tự quan trọng');
});

test('T19 · token chết → cảnh báo kèm số page bật AI đang phụ thuộc nó', () => {
  const health = [HEALTH3[0], { ...HEALTH3[1], dead: true, error: 'Pancake từ chối token (HTTP 401)' }];
  const t = tokenTable({ health, reg: REG3, aiPages: ['p1', 'p2', 'p3'] });
  assert.ok(t.warnings.some((w) => /CHẾT/.test(w) && /3 page bật AI/.test(w)));
  assert.ok(t.warnings.some((w) => /không còn token sống nào phủ/.test(w)), 'p2, p3 mất token phải được nêu');
});

test('T20 · page CHƯA có trong sổ cái không bị báo "mất token" (chưa biết ≠ không có)', () => {
  const t = tokenTable({ health: HEALTH3, reg: {}, aiPages: ['pX', 'pY'] });
  assert.equal(t.warnings.filter((w) => /không còn token sống nào phủ/.test(w)).length, 0);
});

test('T21 · ⛔ chỉ lộ 4 ký tự cuối của token — dashboard chạy trên IP công khai', () => {
  const t = tokenTable({ health: HEALTH3, reg: REG3, aiPages: [] });
  assert.equal(t.rows[0].tail, '5678');   // page-registry trả 8 ký tự — phải bị cắt lại còn 4
  assert.equal(t.rows[1].tail, '4321');
  const dump = JSON.stringify(t);
  for (const secret of ['12345678', '87654321', 'access_token']) {
    assert.equal(dump.includes(secret), false, `rò "${secret}" ra dữ liệu đi thẳng vào HTML`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ⑤ M19 · 9 CHỈ SỐ + BẢN TIN
// ─────────────────────────────────────────────────────────────────────────────

test('T22 · healthReport trả đủ 9 chỉ số, mỗi chỉ số có ngưỡng và việc phải làm', () => {
  const rep = healthReport({ rows: [] });
  assert.equal(rep.checks.length, 9);
  for (const c of rep.checks) {
    assert.ok(c.label && c.threshold && c.action, `chỉ số ${c.id} thiếu nhãn/ngưỡng/hành động`);
    assert.ok(['red', 'orange', 'green'].includes(c.level));
  }
});

test('T23 · >50 handoff "lỗi kỹ thuật"/giờ → 🔴 (v1 đẻ 2.652 cái trong 2 ngày vì thiếu ngưỡng này)', () => {
  const now = Date.now();
  const rows = Array.from({ length: 60 }, (_, i) => ({ t: now - i * 1000, type: 'handoff', kind: 'error', page: PAGE, cust: 'c' + i }));
  const rep = healthReport({ now, rows });
  const c = rep.checks.find((x) => x.id === 'handoff_error');
  assert.equal(c.level, 'red');
  assert.equal(rep.level, 'red');
  assert.ok(rep.red.includes('handoff_error'));
});

test('T24 · 49 cái/giờ vẫn xanh — ngưỡng là ">50", không phải "≥50"', () => {
  const now = Date.now();
  const rows = Array.from({ length: 49 }, (_, i) => ({ t: now - i * 1000, type: 'handoff', kind: 'error', page: PAGE, cust: 'c' + i }));
  assert.equal(healthReport({ now, rows }).checks.find((x) => x.id === 'handoff_error').level, 'green');
});

test('T25 · ngoài giờ cao điểm thì "0 tin AI trong 1 giờ" KHÔNG hú còi', () => {
  // 03:00 giờ VN = 20:00 UTC hôm trước
  const night = Date.parse('2026-08-11T20:00:00Z');
  assert.equal(inPeakHours(night), false);
  const rep = healthReport({ now: night, rows: [] });
  assert.equal(rep.checks.find((x) => x.id === 'ai_silent').level, 'green');
  assert.equal(rep.checks.find((x) => x.id === 'log_stale').level, 'green');
});

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

test('T27 · "insufficient balance" → dừng tầng LLM ngay, và nói rõ nạp xong không cần restart', () => {
  noteLlmError({ message: 'insufficient balance', status: 402 });
  const h = llmHealth();
  assert.equal(h.down, true);
  assert.equal(h.accountError, true);
  const rep = healthReport({ rows: [] });
  const c = rep.checks.find((x) => x.id === 'llm_account');
  assert.equal(c.level, 'red');
  assert.match(c.action, /không cần restart/i);
  const txt = alertText(rep);
  assert.match(txt, /NẠP TIỀN/);
  noteLlmOk();                                          // trả trạng thái về sạch cho test sau
  assert.equal(llmHealth().down, false);
});

test('T28 · bản tin 09:00 vẫn có nội dung KHI MỌI THỨ BÌNH THƯỜNG — im lặng chính là cái bẫy', () => {
  const txt = dailyText(healthReport({ rows: [] }));
  assert.match(txt, /SỨC KHOẺ AI CLOSER/);
  assert.ok(txt.length > 80);
});

test('T29 · hướng dẫn đặt điều kiện khoá Botcake nói rõ ba thẻ phải kiểm', () => {
  const g = LOCK_GUIDE.join(' ');
  for (const tag of ['AI Chăm', 'AI Chốt', 'AI back Sale']) assert.ok(g.includes(tag), `thiếu thẻ ${tag}`);
});

test('T30 · BOOT_AT là mốc khởi động tiến trình, không phải "bây giờ"', () => {
  assert.ok(BOOT_AT > 0 && BOOT_AT <= Date.now());
});
