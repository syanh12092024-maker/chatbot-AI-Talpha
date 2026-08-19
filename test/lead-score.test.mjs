// Nghiệm thu M11 · Lead Scoring & Turn Budget.
// Tin khách lấy NGUYÊN VĂN từ hội thoại thật kéo từ Pancake (10/08/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scanSignals, scoreTurn, turnBudget, scoreConversation,
  hasPhone, hasAddress, isStubby, HARD_MAX_TURNS,
} from '../src/lead-score.js';

const sig = (t) => [...scanSignals(t)].sort();

// ═══════════════════════════════════════════════════════════════════════════
// Nhận tín hiệu
// ═══════════════════════════════════════════════════════════════════════════

test('L1 · SĐT thật (KSA/PH/quốc tế) → bắt đúng', () => {
  for (const t of ['0536064249', '71566943', '+966 50 123 4567', 'number ko po 09171234567']) {
    assert.equal(hasPhone(t), true, `phải thấy SĐT: ${t}`);
  }
});

test('L2 · ⚠️ GIÁ TIỀN không được nhận nhầm là SĐT (nếu sai → khách lạnh được 12 lượt)', () => {
  for (const t of ['109 SAR po', 'SET 1 99 AED', '2-5 days po', '20% off', '3 pcs 149']) {
    assert.equal(hasPhone(t), false, `không phải SĐT: ${t}`);
  }
});

test('L3 · địa chỉ = khu vực + ≥1 chi tiết', () => {
  assert.equal(hasAddress('Alrawdah Jeddah, District 1, House #118'), true);
  assert.equal(hasAddress('جدة شارع 5'), true);
  assert.equal(hasAddress('Jeddah'), false, 'chỉ tên khu — chưa đủ chi tiết');
  assert.equal(hasAddress('magkano po'), false);
});

test('L4 · tín hiệu mua / hỏi / phản đối', () => {
  assert.deepEqual(sig('magkano po'), ['price']);
  assert.deepEqual(sig('gusto ko po mag order'), ['buy']);
  assert.deepEqual(sig('mahal naman po'), ['obj_price']);
  assert.deepEqual(sig('peke ba to?'), ['obj_trust']);
  assert.deepEqual(sig('iisipin ko muna po'), ['obj_wait']);
  assert.deepEqual(sig('pakita naman po ng picture'), ['image']);
  assert.ok(sig('ilang araw ang delivery?').includes('ship'));
  assert.ok(sig('اريد اطلب').includes('buy'));
  assert.ok(sig('كم السعر').includes('price'));
});

test('L5 · gật đầu / chào / sticker = 0 điểm', () => {
  for (const t of ['ok', 'hi', 'salamat po', '👍', '']) {
    assert.equal(scanSignals(t).size, 0, `không được có tín hiệu: ${t}`);
  }
  assert.equal(isStubby('sige po'), true);
  assert.equal(isStubby('ilang araw bago dumating ang order'), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// Cộng điểm
// ═══════════════════════════════════════════════════════════════════════════

test('L6 · mỗi tín hiệu chỉ tính MỘT lần dù khách hỏi lại', () => {
  let lead = scoreTurn('magkano po', {});
  assert.equal(lead.score, 1);
  lead = scoreTurn('magkano po ulit', lead);
  assert.equal(lead.score, 1, 'hỏi giá lần 2 không cộng thêm điểm');
});

test('L7 · tin cụt không tín hiệu ≥2 lượt liên tiếp → −1 mỗi lượt', () => {
  let lead = scoreTurn('ok', {});
  assert.equal(lead.score, 0, 'lượt cụt đầu tiên chưa bị trừ — khách có thể đang gõ tiếp');
  lead = scoreTurn('hm', lead);
  assert.equal(lead.score, -1);
  lead = scoreTurn('sige', lead);
  assert.equal(lead.score, -2);
  lead = scoreTurn('magkano po ang set 2?', lead);
  assert.equal(lead.stubStreak, 0, 'có tín hiệu → chuỗi tin cụt đứt');
});

test('L8 · khách quay lại sau khi nguội → +2', () => {
  const lead = scoreTurn('hello po', {}, { backFromCold: true });
  assert.equal(lead.score, 2);
});

// ═══════════════════════════════════════════════════════════════════════════
// Ngân sách lượt
// ═══════════════════════════════════════════════════════════════════════════

// ⚠️ NGƯỠNG RA KHỎI NHÓM LẠNH ĐỔI 1 → 2 (10/08/2026, sau khi chạy lại trên 562 hội thoại thật).
// Đây là ĐỔI SPEC theo quyết định của chủ dự án, không phải nới test cho vừa code: bảng gốc
// của spec chỉ giảm 14,8% tổng lượt AI trong khi nghiệm thu đòi ≥30%. Xem lý do đầy đủ ở
// hằng số AM_THRESHOLD trong src/lead-score.js.
test('B1 · bảng ngân sách (1 / 3 / 6 / 10 / 12, ngưỡng ẤM = 2 điểm)', () => {
  assert.equal(turnBudget({ score: 0, signals: [] }).max, 1);
  assert.equal(turnBudget({ score: -3, signals: [] }).max, 1);
  // Chỉ hỏi giá (+1) → VẪN LẠNH: đúng câu Fast Lane trả lời sẵn bằng template 0 token.
  assert.equal(turnBudget({ score: 1, signals: ['price'] }).max, 1);
  assert.equal(turnBudget({ score: 1, signals: ['price'] }).tier, 'LANH');
  // Hai tín hiệu nhỏ (hỏi giá + hỏi ship) mới đủ lên ẤM.
  assert.equal(turnBudget({ score: 2, signals: ['price', 'ship'] }).max, 3);
  assert.equal(turnBudget({ score: 4, signals: ['buy', 'price'] }).max, 6);
  assert.equal(turnBudget({ score: 7, signals: ['phone', 'buy'] }).max, 10);
  const satDon = turnBudget({ score: 7, signals: ['phone', 'address'] });
  assert.equal(satDon.max, 12);
  assert.equal(satDon.priority, true, 'có SĐT + địa chỉ → ưu tiên hàng chờ sale');
});

test('B2 · ⭐ khách nêu phản đối → +3 lượt để chạy trọn ladder 3 bước (nguyên tắc 14)', () => {
  const plain = turnBudget({ score: 2, signals: ['price', 'ship'] });
  const objected = turnBudget({ score: 3, signals: ['price', 'obj_price'] });
  assert.equal(plain.max, 3);
  assert.equal(objected.bonus, 3);
  assert.equal(objected.max, 9, '6 (nóng) + 3 (ladder)');
  // nghi hàng giả / "để nghĩ đã" cũng là phản đối — cũng phải được ladder
  assert.equal(turnBudget({ score: 1, signals: ['price', 'obj_trust'] }).bonus, 3);
  assert.equal(turnBudget({ score: 1, signals: ['price', 'obj_wait'] }).bonus, 3);
});

test('B3 · ⛔ KHÔNG khách nào vượt 12 lượt/24h (chống lỗi vòng lặp)', () => {
  const worst = turnBudget({ score: 99, signals: ['phone', 'address', 'obj_price', 'buy'] });
  assert.equal(worst.max, HARD_MAX_TURNS);
  assert.ok(worst.max <= 12);
});

// ═══════════════════════════════════════════════════════════════════════════
// Chạy lại trên hội thoại thật
// ═══════════════════════════════════════════════════════════════════════════

test('B4 · ⭐ ca SilentBoo (đã cho tên + SĐT mà AI bỏ rơi) → nhóm sát đơn, 12 lượt', () => {
  // Khách tự nói "3 ngày rồi tôi thương lượng mà các anh không thèm bán" — v1 cho 4 lượt.
  const r = scoreConversation([
    'hello',
    'how much po',
    'mahal naman',
    'Celieta Boca 71566943 Salmiya block 5 street 12',
  ]);
  assert.equal(r.budget.tier, 'SAT_DON');
  assert.equal(r.budget.max, 12);
  assert.equal(r.budget.priority, true);
});

test('B5 · ⭐ khách lạnh (sticker + "ok") → 1 lượt, KHÔNG còn tiêu 4 lượt như v1', () => {
  const r = scoreConversation(['hi', 'ok', 'hm', '👍']);
  assert.equal(r.budget.tier, 'LANH');
  assert.equal(r.budget.max, 1);
});

test('B6 · khách hỏi giá rồi chê đắt → 6+3 lượt (v1 chỉ có 4)', () => {
  const r = scoreConversation(['magkano po ang set 2?', 'sobrang mahal po nyan', 'pwede pa bang tawad?']);
  assert.ok(r.budget.max >= 6, `phải ≥6, đang là ${r.budget.max}`);
  assert.equal(r.budget.bonus, 3);
});
