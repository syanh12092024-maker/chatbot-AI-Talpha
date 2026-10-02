// Nghiệm thu M01 (Page Registry) · M02 (Script Studio) · M03 (Readiness Gate) — chạy: npm test
// Không gọi mạng, không gửi WhatsApp. Mọi ghi file trỏ vào thư mục tạm.
//
// PHẢI đặt env TRƯỚC khi import module: `admin-scripts.js` khởi động hai hẹn giờ nền
// (quét sổ cái page + bản tin readiness) ngay khi được nạp.
process.env.PAGE_REGISTRY = '0';
process.env.READINESS = '0';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'l3-scripts-'));
process.env.KB_OVERRIDES_FILE = path.join(TMP, 'kb-overrides.json');
process.env.SCRIPT_VERSIONS_DIR = path.join(TMP, 'script-versions');
process.env.PAGES_REGISTRY_FILE = path.join(TMP, 'pages.json');

const kb = await import('../src/kb.js');
const { computeReadiness, canEnableAI, buildDigest } = await import('../src/readiness.js');

after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* thư mục tạm */ } });

// KB giả giống page thật: 1 sản phẩm, 2 gói giá.
const KB = {
  text: '# SẢN PHẨM & GIÁ\n- [P1] Gluta Soap\n    Giá — SET 1: 99 AED | SET 2: 149 AED',
  products: [{ id: 'P1', name: 'Gluta Soap', currency: 'AED', tiers: [{ label: 'SET 1', price: 99 }, { label: 'SET 2', price: 149 }] }],
  config: {},
};
const KB_NO_PRICE = { text: '', products: [], config: {} };

// Kịch bản HỢP LỆ dùng làm nền — mỗi test chỉ đổi đúng một chỗ để biết luật nào bắt.
const GOOD = {
  tone: 'Ấm áp, gọi "sis/ma\'am", tối đa 2 câu.',
  greeting: 'Hello po! 😊 Ito po ang Gluta Soap namin. Ano pong maitutulong ko?',
  salesPrompt: 'Điểm mạnh: thành phần thiên nhiên, đã bán 12.000 đơn. Khách page này thường lo hàng giả — gửi ảnh chứng nhận và nhấn COD.',
  fastLanePrice: '🎁 SET 1 — 99 AED\n🎁 SET 2 — 149 AED\nFree delivery, COD po. Ilan po ang gusto niyo?',
  fastLaneShip: '2-5 working days po, free delivery, COD.',
  fastLaneHowto: 'Send lang po ang Pangalan + Number + Address, COD na po. 😊',
};
const withField = (k, v) => ({ ...GOOD, [k]: v });
const ruleOf = (r, code) => r.errors.find((e) => e.rule === code);

// GOOD cố ý viết ngắn cho dễ đọc (~38 token) nên nó là THIN_SCRIPT thật — 37 page
// đang chạy dày 890–1.908 token. Test nào cần một page ĐỦ ĐIỀU KIỆN phải dùng bản
// dày này, không phải GOOD.
const GOOD_FULL = {
  ...GOOD,
  salesPrompt: GOOD.salesPrompt + '\n' + 'Khách hay so sánh với hàng chợ — nhấn vào chứng nhận và chính sách đổi trả. '.repeat(25),
};

// ═══════════════════════════════════════════════════════════════════════════
// M02 · VALIDATOR — 6 luật spec §M02
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// M02 · VÒNG ĐỜI PHIÊN BẢN
// ═══════════════════════════════════════════════════════════════════════════

const PID = '100000000000001';

test('S1 · lưu nháp KHÔNG đụng bản LIVE', () => {
  kb.updatePageConfig(PID, GOOD, 'ngoc@shop');                 // bản đang chạy
  const before = kb.getPageConfig(PID).greeting;
  kb.saveDraft(PID, withField('greeting', 'Kumusta po! 😊 Bagong bersyon.'), { updatedBy: 'ngoc@shop' });
  assert.equal(kb.getPageConfig(PID).greeting, before, 'lưu nháp không được ghi vào bản LIVE');
  const doc = kb.getScriptDoc(PID);
  assert.equal(doc.draft.status, 'DRAFT');
  assert.ok(doc.draft.version > doc.live.version);
});

test('S2 · xuất bản đổi bản LIVE ngay, bản LIVE cũ thành ARCHIVED', () => {
  const d = kb.getScriptDoc(PID);
  const r = kb.publishVersion(PID, d.draft.version, { updatedBy: 'ngoc@shop', validated: true });
  assert.equal(r.ok, true);
  assert.match(kb.getPageConfig(PID).greeting, /Bagong bersyon/); // có hiệu lực ngay, không restart
  const after = kb.getScriptDoc(PID);
  assert.equal(after.live.version, d.draft.version);
  assert.equal(after.versions.find((v) => v.version === d.live.version).status, 'ARCHIVED');
});

test('S3 · publishVersion KHÔNG chạy được nếu validator chưa pass', () => {
  const v = kb.saveDraft(PID, withField('greeting', 'x'), { updatedBy: 't' });
  const r = kb.publishVersion(PID, v.version, { updatedBy: 't' }); // thiếu validated
  assert.equal(r.ok, false);
  assert.match(kb.getPageConfig(PID).greeting, /Bagong bersyon/, 'bản LIVE không được đổi');
});

test('S4 · khôi phục = clone thành bản MỚI, bản cũ giữ nguyên (spec: v6 → v8)', () => {
  const before = kb.getScriptDoc(PID);
  const target = before.versions.find((v) => v.status === 'ARCHIVED');
  const src = kb.getScriptVersion(PID, target.version);
  const r = kb.restoreVersion(PID, target.version, { updatedBy: 'ngoc@shop', validated: true });
  assert.equal(r.ok, true);
  assert.ok(r.version.version > before.versions[0].version, 'phải là version MỚI, không ghi đè');
  assert.equal(kb.getPageConfig(PID).greeting, src.config.greeting, 'tin tiếp theo phải dùng đúng bản khôi phục');
  assert.ok(kb.getScriptVersion(PID, target.version), 'bản cũ không được xoá');
});

test('S5 · sửa qua form cũ vẫn để lại phiên bản (không mất dấu bản trước)', () => {
  const n = kb.getScriptDoc(PID).versions.length;
  kb.updatePageConfig(PID, withField('tone', 'Vui vẻ, ngắn gọn.'), 'form-cu');
  const doc = kb.getScriptDoc(PID);
  assert.equal(doc.versions.length, n + 1);
  assert.equal(doc.live.updatedBy, 'form-cu');
  assert.equal(doc.live.status, 'LIVE');
});

test('S6 · lưu lại y nguyên nội dung thì không đẻ thêm phiên bản', () => {
  const cur = kb.getPageConfig(PID);
  const n = kb.getScriptDoc(PID).versions.length;
  kb.updatePageConfig(PID, cur, 'form-cu');
  assert.equal(kb.getScriptDoc(PID).versions.length, n);
});

test('S7 · fastLane* được giữ lại (trước đây updatePageConfig cắt mất)', () => {
  const c = kb.getPageConfig(PID);
  assert.match(c.fastLanePrice, /149 AED/);
  assert.ok(c.fastLaneShip && c.fastLaneHowto);
});

// ═══════════════════════════════════════════════════════════════════════════
// M03 · READINESS GATE
// ═══════════════════════════════════════════════════════════════════════════

const REC_OK = { tokenIdx: 0, tagsVerified: true, tagsMissing: [], posShopId: '123' };

test('R1 · thiếu salesPrompt → MISSING_SCRIPT, CHẶN bật AI', () => {
  const r = computeReadiness('p1', { config: { greeting: 'Hello po!', salesPrompt: '', tone: '' }, record: REC_OK, products: 2 });
  assert.equal(r.readiness, 'MISSING_SCRIPT');
  assert.equal(r.aiAllowed, false);
  assert.deepEqual(r.missing, ['cách bán']);
});

test('R2 · đủ greeting+salesPrompt nhưng thiếu tone → THIN_SCRIPT, VẪN cho bật AI', () => {
  const r = computeReadiness('p2', { config: { greeting: 'Hello po!', salesPrompt: 'x'.repeat(3000), tone: '' }, record: REC_OK, products: 2 });
  assert.equal(r.readiness, 'THIN_SCRIPT');
  assert.equal(r.aiAllowed, true, 'THIN_SCRIPT chỉ nhắc, không được chặn — nếu chặn là tắt 37 page');
  assert.equal(r.blockers.length, 0);
});

test('R3 · salesPrompt quá ngắn → THIN_SCRIPT (không phải MISSING_SCRIPT)', () => {
  const r = computeReadiness('p3', { config: { greeting: 'Hi po!', salesPrompt: 'Bán tốt.', tone: 'Ấm áp' }, record: REC_OK, products: 2 });
  assert.equal(r.readiness, 'THIN_SCRIPT');
  assert.equal(r.aiAllowed, true);
});

test('R4 · chưa map POS → chỉ nhắc, KHÔNG chặn (AI vẫn tư vấn được)', () => {
  const r = computeReadiness('p4', { config: GOOD, record: { ...REC_OK, posShopId: null }, products: 2 });
  assert.equal(r.aiAllowed, true);
  assert.equal(r.readiness, 'MISSING_POS');
});

test('R5 · thiếu thẻ Pancake → CHẶN; nhưng "chưa đọc được bảng thẻ" thì KHÔNG chặn', () => {
  const miss = computeReadiness('p5', { config: GOOD, record: { ...REC_OK, tagsVerified: false, tagsMissing: ['AI Chốt'] }, products: 2 });
  assert.equal(miss.aiAllowed, false);
  assert.equal(miss.readiness, 'MISSING_TAGS');
  // null = gọi API hỏng. Một lần rớt mạng không được phép tắt bot toàn hệ thống.
  const unknown = computeReadiness('p5', { config: GOOD, record: { ...REC_OK, tagsVerified: null }, products: 2 });
  assert.equal(unknown.aiAllowed, true);
});

test('R6 · chưa có sản phẩm/giá → CHẶN', () => {
  const r = computeReadiness('p6', { config: GOOD, record: REC_OK, products: 0 });
  assert.equal(r.aiAllowed, false);
  assert.equal(r.readiness, 'MISSING_PRODUCT');
});

test('R7 · mọi token phủ page đều chết → NO_TOKEN, chặn', () => {
  const r = computeReadiness('p7', { config: GOOD, record: { ...REC_OK, tokenIdx: null }, products: 2 });
  assert.equal(r.aiAllowed, false);
  assert.equal(r.readiness, 'NO_TOKEN');
});

test('R8 · page đủ điều kiện → READY và cổng bật AI cho qua', () => {
  // Xuất bản một bản DÀY cho page thật rồi mới đo — đi đúng đường kb-overrides →
  // getPageConfig như production, thay vì nhét config thẳng vào hàm.
  const v = kb.saveDraft(PID, GOOD_FULL, { updatedBy: 'ngoc@shop' });
  assert.equal(kb.publishVersion(PID, v.version, { updatedBy: 'ngoc@shop', validated: true }).ok, true);

  const r = computeReadiness(PID, { config: kb.getPageConfig(PID), record: REC_OK, products: 2 });
  assert.equal(r.readiness, 'READY', 'còn vướng: ' + JSON.stringify([...r.blockers, ...r.warnings]));
  assert.equal(r.aiAllowed, true);
});

// ═══════════════════════════════════════════════════════════════════════════
// M03 · BẢN TIN — tách bạch hai mức, gộp theo marketer
// ═══════════════════════════════════════════════════════════════════════════

