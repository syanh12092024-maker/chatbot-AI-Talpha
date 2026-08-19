// KIỂM TRA CHÉO SAU KHI GỘP 4 NHÁNH (docs/v2/prompts/L0-GOP-DEPLOY.md · Phần A)
// Bốn điểm này không nhánh nào tự bắt được, vì mỗi cái nằm vắt qua hai luồng khác nhau.
// Chạy: npm test
//
// PHẢI đặt env TRƯỚC khi import — kb.js/admin-scripts.js đọc đường dẫn lúc nạp module,
// và readiness bật hẹn giờ nền ngay khi được nạp.
process.env.PAGE_REGISTRY = '0';
process.env.READINESS = '0';

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'l0-gop-'));
process.env.KB_OVERRIDES_FILE = path.join(TMP, 'kb-overrides.json');
process.env.SCRIPT_VERSIONS_DIR = path.join(TMP, 'script-versions');
process.env.PAGES_REGISTRY_FILE = path.join(TMP, 'pages.json');
process.env.AI_LOG_FILE = path.join(TMP, 'ai-messages.jsonl');

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* thư mục tạm */ } });

// ─────────────────────────────────────────────────────────────────────────────
// ① L4 biến classify() thành luật thuần → L2 (handler) vẫn gọi được, không lỗi shape
// ─────────────────────────────────────────────────────────────────────────────

const { classify } = await import('../src/classifier.js');

test('① classify() giữ nguyên shape cũ — handler.js không phải đổi dòng nào', async () => {
  for (const msg of ['ang mahal naman po', 'magkano po?', '', '<div></div>', 'you are a scammer']) {
    const c = await classify(msg, 'Gluta Soap');
    for (const k of ['intent', 'lang', 'lead_quality', 'urgency', 'is_spam_conf']) {
      assert.ok(k in c, `thiếu trường "${k}" với tin: ${JSON.stringify(msg)}`);
    }
    assert.ok(['interested', 'question', 'complaint', 'spam'].includes(c.intent), `intent lạ: ${c.intent}`);
    assert.ok(['tl', 'en', 'other'].includes(c.lang), `lang lạ: ${c.lang}`);
    assert.equal(typeof c.is_spam_conf, 'number');
  }
});

test('① luật thuần KHÔNG trả __usage — handler cộng token có bọc `if` nên không cộng nhầm', async () => {
  const c = await classify('magkano po?');
  assert.equal(c.__usage, undefined, 'luật thuần không tốn token thì không được khai token');
});

test('① chê đắt / nghi ngờ dạng câu hỏi KHÔNG bị dán complaint (cửa bàn giao)', async () => {
  for (const msg of ['ang mahal po naman', 'iisipin ko muna', 'wala pang budget', 'peke ba ito?', 'scam ba to?', 'effective ba talaga?']) {
    const c = await classify(msg);
    assert.notEqual(c.intent, 'complaint', `"${msg}" bị đẩy sang sale oan`);
    assert.notEqual(c.intent, 'spam', `"${msg}" bị im lặng oan`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ② L2 (M11 lead-score) và L4 (bỏ score_lead) không cùng chấm điểm hai nơi
// ─────────────────────────────────────────────────────────────────────────────

const { toolDefs } = await import('../src/tools.js');

test('② chỉ còn MỘT nơi chấm điểm lead — tool score_lead đã bỏ hẳn', () => {
  assert.equal(toolDefs.find((t) => t.name === 'score_lead'), undefined,
    'score_lead còn sống thì model vừa tốn một vòng tool vừa chấm điểm song song với M11');
});

// ─────────────────────────────────────────────────────────────────────────────
// ③ L1 (scriptVersion trong Sổ AI) và L3 (phiên bản kịch bản M02) cùng một cách đánh số
// ─────────────────────────────────────────────────────────────────────────────

const kb = await import('../src/kb.js');
const { scriptVersionOf, scriptVersionOfConfig, logAi, readLog } = await import('../src/ai-log.js');

const SCRIPT = {
  tone: 'Ấm áp, tối đa 2 câu.',
  greeting: 'Hello po! 😊 Ano pong maitutulong ko?',
  salesPrompt: 'Khách page này hay lo hàng giả — gửi ảnh chứng nhận, nhấn COD.',
};

test('③ Sổ AI ghi ĐÚNG bản số của Script Studio, không phải mã băm riêng', () => {
  kb.updatePageConfig('900001', SCRIPT, 'test');
  const live = kb.getScriptDoc('900001').live;
  assert.ok(live, 'M02 phải có bản LIVE sau khi lưu kịch bản');

  const v = scriptVersionOf('900001', Date.now() + 1);
  assert.equal(v, `v${live.version}`,
    `Sổ AI ghi "${v}" còn Script Studio gọi là "v${live.version}" — hai tên cho cùng một kịch bản thì M17 A/B không đối chiếu được`);
});

test('③ page chưa có kịch bản vẫn là "none" — không bịa ra bản số', () => {
  assert.equal(scriptVersionOfConfig({}), 'none');
  assert.equal(scriptVersionOfConfig({ greeting: '', tone: '', salesPrompt: '' }), 'none');
});

test('③ logAi tự gắn scriptVersion cho mọi tin reply', () => {
  kb.updatePageConfig('900002', SCRIPT, 'test');
  logAi('900002', 'cust-a', 'reply', { text: 'xin chào', lane: 'AI' });
  const rec = readLog().filter((r) => r.page === '900002').pop();
  assert.ok(rec.scriptVersion, 'thiếu scriptVersion thì M20 không cắt được chi phí theo kịch bản');
  assert.match(rec.scriptVersion, /^v\d+$/);
});

// ─────────────────────────────────────────────────────────────────────────────
// ④ Fast Lane (L4 sửa) + ngân sách lượt (L2) không đá nhau:
//    tin Fast Lane xử lý KHÔNG được trừ ngân sách lượt AI
// ─────────────────────────────────────────────────────────────────────────────

const { recentReplyCount, recentBotTurns } = await import('../src/ai-log.js');

test('④ tin Fast Lane KHÔNG bị tính vào ngân sách lượt AI', () => {
  const P = '900010', C = 'cust-fl';
  logAi(P, C, 'reply', { text: 'bảng giá', lane: 'tpl_price' });
  logAi(P, C, 'reply', { text: 'ship 2-5 ngày', lane: 'tpl_ship' });
  assert.equal(recentReplyCount(P, C), 0,
    'câu mẫu 0 token mà vẫn trừ ngân sách thì khách bấm START + hỏi giá đã mất 2/4 lượt');

  logAi(P, C, 'reply', { text: 'AI trả lời thật', lane: 'AI' });
  assert.equal(recentReplyCount(P, C), 1, 'lượt gọi model phải được đếm');
});

test('④ bản ghi CŨ không có trường lane vẫn được đếm — thời đó chưa có Fast Lane', () => {
  const P = '900011', C = 'cust-old';
  logAi(P, C, 'reply', { text: 'tin cũ' }); // không có lane
  assert.equal(recentReplyCount(P, C), 1,
    'bỏ đếm bản ghi cũ là reset chui bộ đếm lượt của mọi khách đang dở hội thoại');
});

test('④ "bot đã nói chưa" là bộ đếm RIÊNG — Fast Lane CÓ tính ở đây', () => {
  const P = '900012', C = 'cust-two-counters';
  logAi(P, C, 'reply', { text: 'bảng giá', lane: 'tpl_price' });
  assert.equal(recentReplyCount(P, C), 0, 'ngân sách: câu mẫu 0 token không được trừ');
  assert.equal(recentBotTurns(P, C), 1,
    'cửa im lặng Fast Lane: câu mẫu VẪN là "bot đã nói" — nếu không, hội thoại do Fast Lane '
    + 'lo trọn vẹn sẽ mãi đứng ở 0 và không lane im nào mở được (đo thật: 42,0% → 25,5%)');

  logAi(P, C, 'reply', { text: 'AI trả lời', lane: 'AI' });
  assert.equal(recentReplyCount(P, C), 1);
  assert.equal(recentBotTurns(P, C), 2);
});

// Ngân sách M11 đếm bằng sổ RIÊNG (conv-state.llmTurns24h) chứ không mượn Sổ AI — phần đó
// đã có bài của L2. Ở đây cố tình KHÔNG viết thêm test cho nó: conv-state.js ghi thẳng vào
// conv-state.json thật (không có env đổi đường dẫn như AI_LOG_FILE), test mà gọi vào là
// bẩn dữ liệu máy đang chạy và lần chạy sau sẽ đọc phải rác của lần trước.
