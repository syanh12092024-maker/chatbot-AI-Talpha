// Nghiệm thu LUỒNG 5 — M17 (A/B) + M12 (đuổi theo).
// docs/v2/prompts/L5-AB-FOLLOWUP.md §Nghiệm thu · docs/v2/04-TANG-TU-TIEN-HOA.md §M17
// docs/v2/03-TANG-TANG-CHOT.md §M12
//
// Nguyên tắc của bộ test này: M12 là module ĐẦU TIÊN chủ động nhắn khách khi khách không
// hỏi gì. Nên phần lớn số dòng dưới đây không test "có gửi đúng không" mà test "có KHÔNG
// gửi đúng không" — bảy điều kiện chọn khách, ràng buộc 1 tin/khách, giờ yên tĩnh, nhánh
// đối chứng, và bốn công tắc. Mỗi cửa một test riêng, để khi ai đó gỡ nhầm một cửa thì
// có đúng một test đỏ chỉ thẳng vào cửa đó.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Mọi file trạng thái phải nằm trong thư mục tạm TRƯỚC khi nạp module — nếu không, chạy
// test là ghi đè sổ hội thoại/thí nghiệm thật của máy.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'l5-ab-'));
process.env.EXPERIMENTS_FILE = path.join(TMP, 'experiments.json');
process.env.CONV_STATE_FILE = path.join(TMP, 'conv-state.json');
process.env.AI_LOG_FILE = path.join(TMP, 'ai-messages.jsonl');
process.env.AB_SWEEP = '0';        // không bật hẹn giờ quét trong test
delete process.env.FOLLOWUP;       // công tắc M12 mặc định TẮT
process.env.PANCAKE_READONLY = '1';

const {
  startExperiment, stopExperiment, activeExperiment, allExperiments, blacklist, isBlacklisted,
  assignBranch, branchFor, hashPercent, branchMetrics, decideWinner, checkRollback,
  sweepExperiments, abTable, RULES, STATUS, _resetForTest,
} = await import('../src/experiment.js');
const {
  evaluateCandidate, planFollowups, pickAngle, composeFollowup, ANGLES, langFor,
  inQuietHours, nextSendableAt, localHour, utcOffsetOf, followupConfig,
  setPageFollowup, isPageFollowupOn, renderDryRun,
} = await import('../src/followup.js');
const {
  sendGate, indexLog, collectCandidates, runOnce, dryRun, pickPhone, saleCallQueue,
} = await import('../src/scheduler-followup.js');
const { noteFollowup, peekConv, S } = await import('../src/conv-state.js');
const { guardOutbound } = await import('../src/outbound-guard.js');

const H = 3600e3;
const T0 = Date.UTC(2026, 7, 12, 9, 0, 0); // 12/08/2026 12:00 giờ KSA — trong khung được nhắn
const P = { in: 1.0, cache: 0.1, out: 5.0, usdVnd: 26000 };

// Sổ thí nghiệm là file — mỗi test cần một page riêng để không giẫm lên nhau.
let pageSeq = 0;
const newPage = () => `P${++pageSeq}`;

// ═══════════════════════════════════════════════════════════════════════════
// M17 · CHIA NHÁNH — "một khách luôn nằm đúng một nhánh suốt hội thoại"
// ═══════════════════════════════════════════════════════════════════════════

test('M17 · 200 khách, mỗi khách hỏi 20 lần → không ai đổi nhánh', () => {
  const salt = 'P9:1000';
  for (let i = 0; i < 200; i++) {
    const cust = `cust-${i}`;
    const first = assignBranch(cust, { split: 50, salt });
    for (let k = 0; k < 20; k++) {
      assert.equal(assignBranch(cust, { split: 50, salt }), first, `khách ${cust} đổi nhánh ở lần hỏi ${k}`);
    }
  }
});

test('M17 · chia theo KHÁCH nên phân bố phải đều — 2.000 khách, lệch <10 điểm %', () => {
  let b = 0;
  for (let i = 0; i < 2000; i++) if (assignBranch(`u${i}`, { split: 50, salt: 'S' }) === 'B') b++;
  const pct = (b / 2000) * 100;
  assert.ok(pct > 40 && pct < 60, `nhánh B chiếm ${pct.toFixed(1)}% — bộ băm dồn cục`);
});

test('M17 · customerId toàn chữ số (dạng của Pancake) vẫn phân bố đều', () => {
  // Bộ băm cộng dồn tự chế cho id liên tiếp ra kết quả dồn cục — đây là ca bắt nó.
  let b = 0;
  for (let i = 0; i < 2000; i++) if (assignBranch(`10000000${i}`, { split: 50, salt: 'S' }) === 'B') b++;
  const pct = (b / 2000) * 100;
  assert.ok(pct > 40 && pct < 60, `nhánh B chiếm ${pct.toFixed(1)}%`);
});

test('M17 · muối khác nhau → chia khác nhau (hai thí nghiệm không dùng chung tập khách)', () => {
  let same = 0;
  for (let i = 0; i < 500; i++) {
    if (assignBranch(`u${i}`, { split: 50, salt: 'A:1' }) === assignBranch(`u${i}`, { split: 50, salt: 'A:2' })) same++;
  }
  assert.ok(same > 200 && same < 300, `trùng ${same}/500 — muối không có tác dụng`);
});

test('M17 · không định danh được khách → giữ bản CŨ (nhánh A)', () => {
  assert.equal(assignBranch(null, { split: 50 }), 'A');
  assert.equal(assignBranch('', { split: 100 }), 'A'); // kể cả khi split = 100
});

test('M17 · split biên: 0 → không ai vào B, 100 → mọi khách vào B', () => {
  for (let i = 0; i < 50; i++) {
    assert.equal(assignBranch(`u${i}`, { split: 0, salt: 'S' }), 'A');
    assert.equal(assignBranch(`u${i}`, { split: 100, salt: 'S' }), 'B');
  }
  assert.ok(hashPercent('u1', 'S') >= 0 && hashPercent('u1', 'S') < 100);
});

// ═══════════════════════════════════════════════════════════════════════════
// M17 · KHO THÍ NGHIỆM
// ═══════════════════════════════════════════════════════════════════════════

test('M17 · mỗi page CHỈ 1 thí nghiệm tại một thời điểm', () => {
  const page = newPage();
  startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  assert.throws(() => startExperiment({ pageId: page, a: 'v1', b: 'v3', now: T0 }), /chỉ 1 thí nghiệm/);
  stopExperiment(page, { winner: 'A', now: T0 + H });
  assert.equal(activeExperiment(page), null);
  // đóng rồi thì mở lại được
  assert.ok(startExperiment({ pageId: page, a: 'v1', b: 'v3', now: T0 + 2 * H }));
  stopExperiment(page, { winner: 'A', now: T0 + 3 * H });
});

test('M17 · SỔ ĐEN — bản đã thua không được thử lại', () => {
  const page = newPage();
  startExperiment({ pageId: page, a: 'v1', b: 'vXau', now: T0 });
  stopExperiment(page, { winner: 'A', reason: 'B thua', now: T0 + H, blacklistLoser: true });
  assert.ok(isBlacklisted(page, 'vXau'));
  assert.throws(() => startExperiment({ pageId: page, a: 'v1', b: 'vXau', now: T0 + 2 * H }), /sổ đen/);
  // hoà thì KHÔNG vào sổ đen — "giữ bản cũ" khác "bản mới tệ"
  const p2 = newPage();
  startExperiment({ pageId: p2, a: 'v1', b: 'vHoa', now: T0 });
  stopExperiment(p2, { winner: 'TIE', now: T0 + H, blacklistLoser: false });
  assert.equal(isBlacklisted(p2, 'vHoa'), false);
});

test('M17 · thí nghiệm đã đóng nằm trong lịch sử, không mất', () => {
  const page = newPage();
  startExperiment({ pageId: page, a: 'v1', b: 'v2', name: 'thử lời chào', now: T0 });
  stopExperiment(page, { winner: 'B', reason: 'B thắng', now: T0 + 8 * 24 * H });
  const h = allExperiments().history.find((e) => e.pageId === page);
  assert.equal(h.status, STATUS.ARCHIVED);
  assert.equal(h.winner, 'B');
  assert.equal(h.name, 'thử lời chào');
});

test('M17 · branchFor: page không chạy thí nghiệm → null (bên gọi dùng bản LIVE như thường)', () => {
  assert.equal(branchFor('page-khong-co', 'c1'), null);
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const r = branchFor(page, 'c1');
  assert.equal(r.expId, exp.id);
  assert.equal(r.scriptVersion, r.branch === 'B' ? 'v2' : 'v1');
  stopExperiment(page, { now: T0 + H });
});

// ═══════════════════════════════════════════════════════════════════════════
// M17 · ĐO & PHÂN THẮNG BẠI
//
// Bộ sinh dữ liệu giả: mỗi khách được gán nhánh bằng CHÍNH hàm thật (assignBranch), rồi
// mới rải tin/đơn theo nhánh. Nếu gán tay thì test chỉ chứng minh phép cộng đúng, không
// chứng minh việc cắt nhánh đúng.
// ═══════════════════════════════════════════════════════════════════════════

function fakeLog(exp, { nA, nB, orderRateA, orderRateB, repliesEach = 4, toutB = 100, startAt = exp.startedAt + H }) {
  const rows = [];
  const want = { A: nA, B: nB };
  const got = { A: 0, B: 0 };
  let t = startAt;
  for (let i = 0; got.A < want.A || got.B < want.B; i++) {
    const cust = `k${i}`;
    const br = assignBranch(cust, { split: exp.split, salt: exp.salt });
    if (got[br] >= want[br]) continue;
    const idx = got[br]++;
    for (let k = 0; k < repliesEach; k++) {
      rows.push({
        t: (t += 60e3), page: exp.pageId, cust, name: `Khach ${cust}`, conv: `conv-${cust}`,
        type: 'reply', lane: 'AI', scriptVersion: br === 'B' ? exp.b : exp.a,
        tin: 1000, tout: br === 'B' ? toutB : 100, cread: 3000, calls: 1,
      });
    }
    const rate = br === 'B' ? orderRateB : orderRateA;
    if (idx < Math.round(want[br] * rate)) rows.push({ t: (t += 60e3), page: exp.pageId, cust, type: 'order' });
  }
  return rows;
}

test('M17 · cắt nhánh đúng: số khách mỗi nhánh khớp dữ liệu bơm vào', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 120, nB: 110, orderRateA: 0.1, orderRateB: 0.1 });
  const m = branchMetrics({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.equal(m.A.customers, 120);
  assert.equal(m.B.customers, 110);
  assert.equal(m.A.orders, 12);
  assert.equal(m.B.orders, 11);
  // đối chứng scriptVersion: dữ liệu giả ghi đúng bản của nhánh → không lệch dòng nào
  assert.ok(m.versioned > 0);
  assert.equal(m.mismatch, 0);
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · mismatch bắt được ca "phần đấu dây prompt chưa chạy"', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  // Mọi tin đều ghi bản A dù một nửa khách nằm nhánh B — đúng cảnh chưa đấu dây.
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.1, orderRateB: 0.1 })
    .map((r) => (r.type === 'reply' ? { ...r, scriptVersion: 'v1' } : r));
  const m = branchMetrics({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.ok(m.mismatch > 0, 'lệch nhánh mà không ai biết — đúng thứ mismatch sinh ra để bắt');
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · chưa đủ 7 ngày HOẶC chưa đủ 100 khách/nhánh → chưa phán', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 150, nB: 150, orderRateA: 0.05, orderRateB: 0.5 });
  // đủ khách, thiếu ngày
  let v = decideWinner({ pageId: page, rows, now: T0 + 3 * 24 * H, prices: P });
  assert.equal(v.ready, false);
  assert.match(v.reason, /ngày/);
  // đủ ngày, thiếu khách
  const it = fakeLog(exp, { nA: 20, nB: 20, orderRateA: 0.05, orderRateB: 0.5 });
  v = decideWinner({ pageId: page, rows: it, now: T0 + 8 * 24 * H, prices: P });
  assert.equal(v.ready, false);
  assert.match(v.reason, /khách/);
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · B thắng khi closeRate hơn ≥20% tương đối VÀ chi phí/đơn không quá +20%', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0.10, orderRateB: 0.20 });
  const v = decideWinner({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.equal(v.ready, true);
  assert.equal(v.winner, 'B');
  stopExperiment(page, { winner: 'B', now: T0 + 9 * 24 * H });
});

test('M17 · HOÀ → giữ bản cũ, và KHÔNG ghi sổ đen', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0.10, orderRateB: 0.11 }); // hơn 10%, chưa đủ 20%
  const v = decideWinner({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.equal(v.ready, true);
  assert.equal(v.winner, 'TIE');
  assert.ok(!v.blacklist);
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · B chốt cao hơn nhưng đốt gấp đôi → KHÔNG thắng', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  // tout của B gấp ~6 lần → chi phí/tin cao hơn nhiều, vượt trần +20%
  const rows = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0.10, orderRateB: 0.13, toutB: 3000 });
  const m = branchMetrics({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.ok(m.B.vndPerOrder > m.A.vndPerOrder * 1.2, 'dữ liệu giả chưa đủ đắt để test có nghĩa');
  const v = decideWinner({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.notEqual(v.winner, 'B');
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · B thua → winner A + đề nghị ghi sổ đen', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0.20, orderRateB: 0.05 });
  const v = decideWinner({ pageId: page, rows, now: T0 + 8 * 24 * H, prices: P });
  assert.equal(v.winner, 'A');
  assert.equal(v.blacklist, true);
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · A chưa ra đơn nào → B chỉ thắng khi B THẬT SỰ ra đơn', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const none = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0, orderRateB: 0 });
  assert.notEqual(decideWinner({ pageId: page, rows: none, now: T0 + 8 * 24 * H, prices: P }).winner, 'B');
  const some = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0, orderRateB: 0.1 });
  assert.equal(decideWinner({ pageId: page, rows: some, now: T0 + 8 * 24 * H, prices: P }).winner, 'B');
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

// ═══════════════════════════════════════════════════════════════════════════
// M17 · ROLLBACK TỰ ĐỘNG — bơm dữ liệu giả có nhánh B tệ
// ═══════════════════════════════════════════════════════════════════════════

test('M17 · rollback ① closeRate tụt >30% sau ≥48h và ≥50 khách', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.20, orderRateB: 0.05 });
  const r = checkRollback({ pageId: page, rows, blocked: [], now: T0 + 3 * 24 * H, prices: P });
  assert.equal(r.rollback, true);
  assert.match(r.reasons.join(' '), /closeRate nhánh B tụt/);
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

test('M17 · rollback ① KHÔNG kích hoạt khi chưa đủ 48h hoặc chưa đủ 50 khách (chống rollback vì nhiễu)', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const big = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.20, orderRateB: 0.0 });
  assert.equal(checkRollback({ pageId: page, rows: big, blocked: [], now: T0 + 20 * H, prices: P }).rollback, false);
  const small = fakeLog(exp, { nA: 10, nB: 10, orderRateA: 0.5, orderRateB: 0.0 });
  assert.equal(checkRollback({ pageId: page, rows: small, blocked: [], now: T0 + 5 * 24 * H, prices: P }).rollback, false);
  stopExperiment(page, { now: T0 + 6 * 24 * H });
});

test('M17 · rollback ② tin bị M09 chặn ở nhánh B gấp >3 lần nhánh A', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.1, orderRateB: 0.1 });
  // Quy tin bị chặn về nhánh qua TÊN khách (recordBlocked chỉ ghi tên) — dựng sổ chặn từ
  // chính tên trong Sổ AI, đúng đường mà blockedByBranch đi.
  const nameOf = (br) => {
    const r = rows.find((x) => x.name && assignBranch(x.cust, { split: exp.split, salt: exp.salt }) === br);
    return r.name;
  };
  const blocked = [];
  for (let i = 0; i < 30; i++) blocked.push({ t: T0 + 2 * H, page, cust: nameOf('B'), rule: 'REPEAT', action: 'block' });
  blocked.push({ t: T0 + 2 * H, page, cust: nameOf('A'), rule: 'REPEAT', action: 'block' });
  const r = checkRollback({ pageId: page, rows, blocked, now: T0 + 3 * 24 * H, prices: P });
  assert.equal(r.rollback, true);
  assert.match(r.reasons.join(' '), /M09 chặn ở nhánh B/);
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

test('M17 · rollback ③ MỘT tin vi phạm luật 2/8/9 là đủ — kể cả khi không quy được nhánh', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.1, orderRateB: 0.1 });
  for (const rule of ['VIETNAMESE', 'INVISIBLE_CHARS', 'THREAT']) {
    const r = checkRollback({
      pageId: page, rows, now: T0 + 10 * H, prices: P,
      blocked: [{ t: T0 + H, page, cust: 'ai đó không có trong sổ', rule, action: 'block' }],
    });
    assert.equal(r.rollback, true, `luật ${rule} phải kích hoạt rollback`);
    assert.match(r.reasons.join(' '), /luật 2\/8\/9/);
  }
  // luật KHÁC (vd bịa mã đơn) thì không phải cửa tử — 1 tin không đủ để hạ bản
  const ok = checkRollback({
    pageId: page, rows, now: T0 + 10 * H, prices: P,
    blocked: [{ t: T0 + H, page, cust: 'ai đó', rule: 'FAKE_ORDER_ID', action: 'rewrite' }],
  });
  assert.equal(ok.rollback, false);
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

test('M17 · rollback ④ chi phí/đơn nhánh B gấp >2 lần', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.2, orderRateB: 0.2, toutB: 6000 });
  const r = checkRollback({ pageId: page, rows, blocked: [], now: T0 + 3 * 24 * H, prices: P });
  assert.equal(r.rollback, true);
  assert.match(r.reasons.join(' '), /chi phí\/đơn nhánh B/);
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

test('M17 · nhánh B lành lặn → KHÔNG rollback (không có báo động giả)', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 80, nB: 80, orderRateA: 0.10, orderRateB: 0.12 });
  const r = checkRollback({ pageId: page, rows, blocked: [], now: T0 + 3 * 24 * H, prices: P });
  assert.equal(r.rollback, false, r.reasons.join(' · '));
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

test('M17 · sweepExperiments: bơm nhánh B tệ → tự hạ bản, ghi sổ đen, A thành LIVE lại', async () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'vTe', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.25, orderRateB: 0.02 });

  // Vòng quét soi MỌI page đang chạy — lấy đúng dòng của page này, đừng tin thứ tự.
  const mine = (list) => list.find((r) => r.pageId === page);

  // chạy khô trước: báo cáo đúng nhưng KHÔNG đóng gì
  const dry = mine(await sweepExperiments({ rows, blocked: [], now: T0 + 3 * 24 * H, prices: P, apply: false }));
  assert.equal(dry.action, 'rollback');
  assert.equal(dry.applied, false);
  assert.ok(activeExperiment(page), 'chạy khô mà vẫn đóng thí nghiệm');

  const out = mine(await sweepExperiments({ rows, blocked: [], now: T0 + 3 * 24 * H, prices: P, apply: true }));
  assert.equal(out.action, 'rollback');
  assert.equal(activeExperiment(page), null, 'B phải về ARCHIVED');
  assert.ok(isBlacklisted(page, 'vTe'), 'bản bị hạ phải vào sổ đen');
  const h = allExperiments().history.find((e) => e.pageId === page);
  assert.equal(h.winner, 'A');
  assert.match(h.reason, /ROLLBACK TỰ ĐỘNG/);
});

test('M17 · bảng so sánh A/B cho dashboard có đủ 5 chỉ số của spec', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 120, nB: 120, orderRateA: 0.1, orderRateB: 0.15 });
  const row = abTable({ rows, now: T0 + 8 * 24 * H, prices: P }).find((r) => r.pageId === page);
  for (const k of ['closeRatePct', 'vndPerOrder', 'repliesPerOrder', 'handoffPct', 'silentAfterFirstPct']) {
    assert.ok(k in row.A && k in row.B, `bảng thiếu chỉ số ${k}`);
  }
  assert.equal(row.ready, true);
  assert.ok(row.verdict);
  stopExperiment(page, { now: T0 + 9 * 24 * H });
});

test('M17 · cú đẩy sale của M12 KHÔNG bị tính vào chỉ số handoff của A/B', () => {
  const page = newPage();
  const exp = startExperiment({ pageId: page, a: 'v1', b: 'v2', now: T0 });
  const rows = fakeLog(exp, { nA: 60, nB: 60, orderRateA: 0.1, orderRateB: 0.1 });
  const base = branchMetrics({ pageId: page, rows, now: T0 + 3 * 24 * H, prices: P });
  const withFollowup = rows.concat(rows
    .filter((r) => r.type === 'reply')
    .map((r) => ({ t: r.t + 1, page, cust: r.cust, type: 'handoff', lane: 'FOLLOWUP', kind: 'followup_call' })));
  const after = branchMetrics({ pageId: page, rows: withFollowup, now: T0 + 3 * 24 * H, prices: P });
  assert.equal(after.A.handoffs, base.A.handoffs);
  assert.equal(after.B.handoffs, base.B.handoffs);
  // handoff THẬT thì vẫn phải đếm
  const real = branchMetrics({
    pageId: page, now: T0 + 3 * 24 * H, prices: P,
    rows: rows.concat([{ t: T0 + 2 * H, page, cust: rows[0].cust, type: 'handoff', reason: 'khách chửi' }]),
  });
  assert.equal(real.A.handoffs + real.B.handoffs, base.A.handoffs + base.B.handoffs + 1);
  stopExperiment(page, { now: T0 + 4 * 24 * H });
});

// ═══════════════════════════════════════════════════════════════════════════
// M12 · BẢY ĐIỀU KIỆN CHỌN KHÁCH — mỗi cửa một test
// ═══════════════════════════════════════════════════════════════════════════

let convSeq = 0;
const cand = (o = {}) => ({
  pageId: 'PF', custId: `c${++convSeq}`, convId: `conv${convSeq}`, name: `Khach ${convSeq}`,
  market: 'KSA', aiEnabled: true, ready: true, readiness: 'READY',
  tags: [], aiReplies: 3, hasOrder: false,
  lastCustAt: T0 - 5 * H, custTexts: ['how much po'], ...o,
});

test('M12 ① · trạng thái không phải COLD (đã có chủ khác) → không đuổi theo', () => {
  for (const st of [S.HANDOFF, S.CLOSING, S.POST_SALE]) {
    const v = evaluateCandidate(cand({ state: st }), { now: T0 });
    assert.equal(v.ok, false, `state ${st} phải bị loại`);
  }
  for (const st of [S.GREET, S.QUALIFY, S.SELLING, S.COLD]) {
    assert.notEqual(evaluateCandidate(cand({ state: st }), { now: T0 }).skip, 'không phải COLD');
  }
});

test('M12 ② · chưa có lượt AI nào → không phải "bị bỏ rơi", là chưa được phục vụ', () => {
  const v = evaluateCandidate(cand({ aiReplies: 0 }), { now: T0 });
  assert.equal(v.ok, false);
  assert.equal(v.skip, 'chưa có lượt AI');
});

test('M12 ③ · đã có đơn — cả Sổ AI lẫn thẻ Pancake đều là cửa dừng', () => {
  assert.equal(evaluateCandidate(cand({ hasOrder: true }), { now: T0 }).skip, 'đã có đơn');
  for (const tag of [-1, -2, -3, -11, -12, -20]) {
    assert.equal(evaluateCandidate(cand({ tags: [5, tag] }), { now: T0 }).skip, 'đã có đơn', `thẻ ${tag}`);
  }
  // thẻ thường (số dương) không phải thẻ đơn
  assert.notEqual(evaluateCandidate(cand({ tags: [3, 7] }), { now: T0 }).skip, 'đã có đơn');
});

test('M12 ④ · khách im 2–24 giờ, ngoài khoảng là bỏ', () => {
  assert.equal(evaluateCandidate(cand({ lastCustAt: T0 - 0.5 * H }), { now: T0 }).skip, 'chưa đủ im');
  assert.equal(evaluateCandidate(cand({ lastCustAt: T0 - 40 * H }), { now: T0 }).skip, 'im quá lâu');
  assert.equal(evaluateCandidate(cand({ lastCustAt: 0 }), { now: T0 }).skip, 'không rõ khách im bao lâu');
  assert.ok(evaluateCandidate(cand({ lastCustAt: T0 - 5 * H, custTexts: ['how much'] }), { now: T0 }).ok
    || evaluateCandidate(cand({ lastCustAt: T0 - 5 * H, custTexts: ['how much'] }), { now: T0 }).group === 'HOLDOUT');
});

test('M12 ⑤ · ĐÃ đuổi theo rồi thì KHÔNG có lần 2 — kể cả khi bên gọi truyền sẵn state', () => {
  const c = cand();
  noteFollowup(c.convId, 'message', T0 - H);
  assert.equal(evaluateCandidate(c, { now: T0 }).skip, 'đã đuổi theo');
  // Ca hồi quy: truyền `state` từng làm hàm bỏ qua việc tra sổ → khách nhận tin lần hai.
  assert.equal(evaluateCandidate({ ...c, state: S.SELLING }, { now: T0 }).skip, 'đã đuổi theo');

  const c2 = cand();
  noteFollowup(c2.convId, 'sale', T0 - H);
  assert.equal(evaluateCandidate(c2, { now: T0 }).skip, 'đã đẩy sale');

  // Lá chắn thứ hai: mất conv-state nhưng Sổ AI còn ghi → vẫn không gửi lại.
  assert.equal(evaluateCandidate(cand({ alreadyLogged: true }), { now: T0 }).skip, 'đã đuổi theo');
});

test('M12 ⑤ · soi ứng viên KHÔNG được đẻ ra hội thoại rác trong sổ', () => {
  const c = cand({ convId: 'conv-chua-tung-thay' });
  evaluateCandidate(c, { now: T0 });
  assert.equal(peekConv('conv-chua-tung-thay'), null, 'chạy khô mà ghi vào sổ hội thoại thật');
});

test('M12 ⑥ · page tắt AI / chưa đủ điều kiện / tắt đuổi theo riêng → bỏ', () => {
  assert.equal(evaluateCandidate(cand({ aiEnabled: false }), { now: T0 }).skip, 'page tắt AI');
  assert.equal(evaluateCandidate(cand({ ready: false }), { now: T0 }).skip, 'page chưa sẵn sàng');
  setPageFollowup('PF', false);
  assert.equal(isPageFollowupOn('PF'), false);
  assert.equal(evaluateCandidate(cand(), { now: T0 }).skip, 'page tắt đuổi theo');
  setPageFollowup('PF', true);
  assert.equal(isPageFollowupOn('PF'), true);
});

test('M12 ⑥ · FOLLOWUP_STRICT_READY: mặc định lấy cổng "không có blocker", bật cờ thì đòi đúng chữ READY', () => {
  const c = cand({ ready: true, readiness: 'THIN_SCRIPT' });
  assert.notEqual(evaluateCandidate(c, { now: T0 }).skip, 'page chưa sẵn sàng');
  const strict = { ...followupConfig, strictReady: true };
  assert.equal(evaluateCandidate(c, { now: T0, cfg: strict }).skip, 'page chưa sẵn sàng');
});

test('M12 ⑦ · hết cửa sổ nhắn tin của kênh → bỏ, có trừ biên an toàn', () => {
  // 23,5h im: còn trong khoảng 2–24h nhưng đã quá 24h−1h biên → phải bỏ
  const v = evaluateCandidate(cand({ lastCustAt: T0 - 23.5 * H }), { now: T0 });
  assert.equal(v.skip, 'hết cửa sổ nhắn tin');
});

test('M12 · thiếu định danh → bỏ, không đoán', () => {
  assert.equal(evaluateCandidate({ pageId: 'PF', custId: '', convId: 'x' }, { now: T0 }).ok, false);
  assert.equal(evaluateCandidate({}, { now: T0 }).skip, 'thiếu định danh');
});

// ═══════════════════════════════════════════════════════════════════════════
// M12 · GIỜ YÊN TĨNH 22:00–08:00 GIỜ ĐỊA PHƯƠNG CỦA THỊ TRƯỜNG PAGE
// ═══════════════════════════════════════════════════════════════════════════

test('M12 · giờ yên tĩnh tính theo thị trường page, không theo giờ máy chủ', () => {
  assert.equal(utcOffsetOf('KSA'), 3);
  assert.equal(utcOffsetOf('UAE'), 4);
  assert.equal(utcOffsetOf('PH'), 8);
  assert.equal(utcOffsetOf(''), 3); // mặc định
  assert.equal(utcOffsetOf('thị trường lạ hoắc'), 3);

  const t = Date.UTC(2026, 7, 12, 20, 0, 0); // 23:00 KSA · 00:00 UAE · 04:00 PH
  assert.equal(localHour(t, 'KSA'), 23);
  assert.equal(inQuietHours(t, 'KSA'), true);
  assert.equal(inQuietHours(t, 'UAE'), true);
  assert.equal(inQuietHours(t, 'PH'), true);

  const day = Date.UTC(2026, 7, 12, 9, 0, 0); // 12:00 KSA
  assert.equal(inQuietHours(day, 'KSA'), false);
});

test('M12 · trong giờ yên tĩnh thì bỏ qua, kèm mốc thử lại đúng 08:00 giờ địa phương', () => {
  const night = Date.UTC(2026, 7, 12, 20, 0, 0); // 23:00 KSA
  const v = evaluateCandidate(cand({ lastCustAt: night - 5 * H }), { now: night });
  assert.equal(v.skip, 'giờ yên tĩnh');
  assert.ok(v.retryAt > night);
  assert.equal(localHour(v.retryAt, 'KSA'), 8);
  assert.equal(nextSendableAt(Date.UTC(2026, 7, 12, 9, 0, 0), 'KSA'), Date.UTC(2026, 7, 12, 9, 0, 0));
});

// ═══════════════════════════════════════════════════════════════════════════
// M12 · CHỌN GÓC & NHÓM ƯU TIÊN CAO NHẤT
// ═══════════════════════════════════════════════════════════════════════════

test('M12 · ca SilentBoo: khách đã cho SĐT/tên → KHÔNG nhắn, đẩy thẳng sale gọi', () => {
  const v = evaluateCandidate(cand({
    custTexts: ['Celieta Boca 71566943', 'ok lang kung cancel nalang'],
  }), { now: T0 });
  assert.equal(v.ok, true);
  assert.equal(v.group, 'SALE_CALL');
  assert.equal(v.angle, 'gave_contact');
  assert.equal(v.text, '', 'nhóm này KHÔNG được nhận tin nào');
  assert.match(v.saleNote, /GỌI NGAY/);
});

test('M12 · nhóm "đã cho SĐT" KHÔNG bị chia A/B — không giữ khách sát đơn làm đối chứng', () => {
  // Thử đủ nhiều khách để chắc chắn có người rơi vào nhánh A.
  let sale = 0;
  for (let i = 0; i < 60; i++) {
    const v = evaluateCandidate(cand({ custTexts: [`my name is Ana ${i}`, '0501234567'] }), { now: T0 });
    if (v.group === 'SALE_CALL') sale++;
    assert.notEqual(v.group, 'HOLDOUT', 'khách sát đơn bị giữ làm đối chứng');
  }
  assert.equal(sale, 60);
});

test('M12 · bảng góc của spec: chê đắt / nghi chất lượng / hỏi ship / im sau báo giá', () => {
  assert.equal(pickAngle(['ang mahal naman po']).key, 'obj_price');
  assert.equal(pickAngle(['is this legit po? baka scam']).key, 'obj_trust');
  assert.equal(pickAngle(['how many days delivery po']).key, 'asked_ship');
  assert.equal(pickAngle(['hmm']).key, 'after_quote');
  assert.equal(pickAngle([]).key, 'after_quote');
  // SĐT/tên luôn thắng mọi góc khác
  assert.equal(pickAngle(['ang mahal naman', '0501234567']).key, 'gave_contact');
});

test('M12 · ngôn ngữ theo thị trường: PH → Taglish, còn lại → tiếng Anh', () => {
  assert.equal(langFor('PH'), 'tl');
  assert.equal(langFor('Philippines'), 'tl');
  assert.equal(langFor('KSA'), 'en');
  assert.match(composeFollowup('after_quote', 'PH'), /po/);
  assert.equal(composeFollowup('after_quote', 'KSA'), ANGLES.after_quote.text.en);
  assert.equal(composeFollowup('gave_contact', 'KSA'), '', 'nhóm đẩy sale không có tin');
});

test('M12 · MỌI câu đuổi theo phải qua được M09 Outbound Guard', () => {
  for (const [key, a] of Object.entries(ANGLES)) {
    if (a.group !== 'MESSAGE') continue;
    for (const lang of ['tl', 'en']) {
      const text = a.text[lang];
      const v = guardOutbound(text, { kb: {}, pageId: 'PF', custName: 'Khach' });
      assert.equal(v.ok, true, `góc ${key}/${lang} bị M09 chặn: ${v.rule} — ${v.reason}`);
    }
  }
});

test('M12 · câu đuổi theo không hứa ngày giao cụ thể, không nêu số tiền, không quá 2 câu', () => {
  for (const a of Object.values(ANGLES)) {
    if (a.group !== 'MESSAGE') continue;
    for (const text of Object.values(a.text)) {
      assert.ok(!/\d{3,}/.test(text), `có con số lớn (nghi giá tiền): ${text}`);
      assert.ok(text.split(/[.!?]\s/).length <= 3, `dài quá 2 câu: ${text}`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// M12 · A/B VÀ RÀNG BUỘC 1 TIN/KHÁCH — mô phỏng 1.000 khách
// ═══════════════════════════════════════════════════════════════════════════

test('M12 · 1.000 khách, quét 5 lượt: KHÔNG khách nào nhận quá 1 tin', () => {
  const now = T0;
  const list = [];
  for (let i = 0; i < 1000; i++) {
    list.push({
      pageId: 'PSIM', custId: `sim-${i}`, convId: `sim-conv-${i}`, name: `Sim ${i}`,
      market: 'KSA', aiEnabled: true, ready: true, readiness: 'READY',
      tags: [], aiReplies: 2, hasOrder: false,
      lastCustAt: now - 5 * H, custTexts: ['how much po'],
    });
  }
  const count = new Map();
  for (let run = 0; run < 5; run++) {
    const plan = planFollowups(list, { now: now + run * 20 * 60e3, cfg: { ...followupConfig, maxPerRun: 10000 } });
    for (const s of plan.send) {
      count.set(s.custId, (count.get(s.custId) || 0) + 1);
      noteFollowup(s.convId, 'message', now); // đúng thứ tự của scheduler: ghi sổ rồi mới gửi
    }
    for (const s of plan.saleQueue) noteFollowup(s.convId, 'sale', now);
  }
  const worst = Math.max(...count.values());
  assert.equal(worst, 1, `có khách nhận ${worst} tin đuổi theo`);
  assert.ok(count.size > 300, `chỉ ${count.size}/1000 khách được nhắn — nhánh chia hỏng`);
  assert.ok(count.size < 700, `${count.size}/1000 khách được nhắn — nhóm đối chứng biến mất`);
});

test('M12 · nhánh A là ĐỐI CHỨNG: không nhận tin, nhưng vẫn được đếm', () => {
  const list = [];
  for (let i = 0; i < 400; i++) {
    list.push({
      pageId: 'PHOLD', custId: `h-${i}`, convId: `h-conv-${i}`, name: `H${i}`,
      market: 'KSA', aiEnabled: true, ready: true, readiness: 'READY',
      tags: [], aiReplies: 2, hasOrder: false, lastCustAt: T0 - 5 * H, custTexts: ['presyo po?'],
    });
  }
  const plan = planFollowups(list, { now: T0, cfg: { ...followupConfig, maxPerRun: 10000 } });
  assert.ok(plan.holdout.length > 100, 'không có nhóm đối chứng → A/B vô nghĩa');
  assert.ok(plan.send.length > 100);
  assert.equal(plan.holdout.every((h) => !h.ok && h.branch === 'A'), true);
  assert.equal(plan.send.every((s) => s.branch === 'B' && s.text), true);
  assert.equal(plan.send.length + plan.holdout.length, 400);
});

test('M12 · trần mỗi page mỗi lượt quét: cắt thì phải NÓI RA', () => {
  const list = [];
  for (let i = 0; i < 400; i++) {
    list.push({
      pageId: 'PCAP', custId: `q-${i}`, convId: `q-conv-${i}`, name: `Q${i}`,
      market: 'KSA', aiEnabled: true, ready: true, readiness: 'READY',
      tags: [], aiReplies: 2, hasOrder: false, lastCustAt: T0 - 5 * H, custTexts: ['presyo po?'],
    });
  }
  const plan = planFollowups(list, { now: T0, cfg: { ...followupConfig, maxPerRun: 5 } });
  assert.equal(plan.send.length, 5);
  assert.ok(plan.dropped.length > 0);
  assert.equal(plan.summary.dropped, plan.dropped.length);
});

test('M12 · bản chạy khô đọc được: có tên khách, link hội thoại, và NỘI DUNG từng tin', () => {
  const plan = planFollowups([
    cand({ custTexts: ['ang mahal po'] }),
    cand({ custTexts: ['Ana Cruz 0501234567'] }),
    cand({ aiReplies: 0 }),
  ], { now: T0 });
  const txt = renderDryRun(plan);
  assert.match(txt, /KHÔNG GỬI GÌ CẢ/);
  assert.match(txt, /pancake\.vn/);
  assert.match(txt, /BỎ QUA, theo lý do/);
  assert.match(txt, /chưa có lượt AI/);
});

test('M12 · lỗi khi soi 1 khách không được làm hỏng cả mẻ', () => {
  const plan = planFollowups([null, undefined, cand()], { now: T0 });
  assert.equal(plan.summary.candidates, 3);
  assert.ok(plan.skipped.length >= 2);
});

// ═══════════════════════════════════════════════════════════════════════════
// LỊCH ĐUỔI THEO — bốn công tắc và đường gom ứng viên
// ═══════════════════════════════════════════════════════════════════════════

test('scheduler · PANCAKE_READONLY=1 → cửa gửi ĐÓNG, dù FOLLOWUP=1', () => {
  const old = process.env.FOLLOWUP;
  process.env.FOLLOWUP = '1';
  assert.equal(sendGate().ok, false);
  assert.match(sendGate().why, /PANCAKE_READONLY/);
  if (old === undefined) delete process.env.FOLLOWUP; else process.env.FOLLOWUP = old;
});

test('scheduler · chỉ mục Sổ AI: đếm lượt AI, mốc tin cuối, đơn, và dấu ĐÃ đuổi theo', () => {
  const idx = indexLog([
    { t: 1000, page: 'P', cust: 'c1', name: 'A', conv: 'v1', type: 'reply', text: 'hi', lane: 'AI' },
    { t: 2000, page: 'P', cust: 'c1', type: 'reply', text: 'sau', lane: 'tpl_price' },
    { t: 3000, page: 'P', cust: 'c2', type: 'reply', lane: 'FOLLOWUP' },
    { t: 4000, page: 'P', cust: 'c3', type: 'order' },
  ]);
  const c1 = idx.get('P:c1');
  assert.equal(c1.aiReplies, 2);
  assert.equal(c1.lastReplyAt, 2000);
  assert.equal(c1.lastAiText, 'sau');
  assert.equal(c1.name, 'A');
  assert.equal(c1.conv, 'v1');
  assert.equal(c1.followupLogged, false);
  assert.equal(idx.get('P:c2').followupLogged, true);
  assert.equal(idx.get('P:c3').hasOrder, true);
});

// Đường gom giả: 1 page, 3 hội thoại — 1 đủ điều kiện, 1 tin cuối là của KHÁCH, 1 đã có đơn.
const fakePancake = {
  getConversations: async () => ([
    { id: 'cv1', customers: [{ id: 'k1' }], from: { name: 'Đủ điều kiện' }, tags: [] },
    { id: 'cv2', customers: [{ id: 'k2' }], from: { name: 'Đang chờ trả lời' }, tags: [] },
    { id: 'cv3', customers: [{ id: 'k3' }], from: { name: 'Đã có đơn' }, tags: [-1] },
  ]),
  getMessages: async (_p, convId) => (convId === 'cv2'
    ? [{ id: 'm1', from: { id: 'PG' }, message: 'hello' }, { id: 'm2', from: { id: 'k2' }, message: 'san po?' }]
    : [{ id: 'm1', from: { id: 'k1' }, message: 'magkano po ito' }, { id: 'm2', from: { id: 'PG' }, message: 'SET 1 po 199' }]),
};
const fakeRows = [
  { t: T0 - 5 * H, page: 'PG', cust: 'k1', name: 'Đủ điều kiện', conv: 'cv1', type: 'reply', lane: 'AI', text: 'SET 1 po' },
  { t: T0 - 5 * H, page: 'PG', cust: 'k2', name: 'Đang chờ', conv: 'cv2', type: 'reply', lane: 'AI' },
  { t: T0 - 5 * H, page: 'PG', cust: 'k3', name: 'Đã có đơn', conv: 'cv3', type: 'reply', lane: 'AI' },
];
const fakeReadiness = [{ pageId: 'PG', name: 'Page giả', aiEnabled: true, aiAllowed: true, readiness: 'READY', market: 'PH' }];

test('scheduler · gom ứng viên: bỏ khách đang CHỜ trả lời và khách đã có đơn', async () => {
  const { candidates, errors } = await collectCandidates({
    now: T0, pages: ['PG'], rows: fakeRows, readinessRows: fakeReadiness, registry: {},
    getConversations: fakePancake.getConversations, getMessages: fakePancake.getMessages,
  });
  assert.equal(errors.length, 0);
  assert.deepEqual(candidates.map((c) => c.custId), ['k1']);
  assert.deepEqual(candidates[0].custTexts, ['magkano po ito']);
  assert.equal(candidates[0].market, 'PH');
});

test('scheduler · page tắt AI hoặc chưa đủ điều kiện → không gọi API Pancake lần nào', async () => {
  let calls = 0;
  const count = async (...a) => { calls++; return fakePancake.getConversations(...a); };
  await collectCandidates({
    now: T0, pages: ['PG'], rows: fakeRows, registry: {},
    readinessRows: [{ pageId: 'PG', aiEnabled: false, aiAllowed: true, readiness: 'READY', market: 'PH' }],
    getConversations: count, getMessages: fakePancake.getMessages,
  });
  await collectCandidates({
    now: T0, pages: ['PG'], rows: fakeRows, registry: {},
    readinessRows: [{ pageId: 'PG', aiEnabled: true, aiAllowed: false, readiness: 'NO_SCRIPT', market: 'PH' }],
    getConversations: count, getMessages: fakePancake.getMessages,
  });
  assert.equal(calls, 0);
});

test('scheduler · lỗi đọc 1 page không làm hỏng lượt quét, và được ĐẾM RA', async () => {
  const { candidates, errors } = await collectCandidates({
    now: T0, pages: ['PG'], rows: fakeRows, readinessRows: fakeReadiness, registry: {},
    getConversations: async () => { throw new Error('token chết'); },
    getMessages: fakePancake.getMessages,
  });
  assert.equal(candidates.length, 0);
  assert.equal(errors.length, 1);
  assert.match(errors[0].error, /token chết/);
});

test('scheduler · apply=true nhưng cửa đóng → KHÔNG gọi API gửi lần nào', async () => {
  let sent = 0;
  const r = await runOnce({
    apply: true, now: T0, pages: ['PG'], rows: fakeRows, readinessRows: fakeReadiness, registry: {},
    getConversations: fakePancake.getConversations, getMessages: fakePancake.getMessages,
    send: async () => { sent++; return { ok: true }; },
  });
  assert.equal(r.applied, false);
  assert.equal(sent, 0);
  assert.match(r.gate.why, /PANCAKE_READONLY/);
  // …nhưng vẫn phải nói được SẼ gửi cho ai
  assert.equal(r.plan.summary.saleQueue + r.plan.summary.send + r.plan.summary.holdout, 1);
});

test('scheduler · chạy khô không đụng vào sổ hội thoại', async () => {
  const r = await dryRun({
    now: T0, pages: ['PG'], rows: fakeRows, readinessRows: fakeReadiness, registry: {},
    getConversations: fakePancake.getConversations, getMessages: fakePancake.getMessages,
  });
  assert.equal(peekConv('cv1'), null, 'chạy khô mà ghi sổ');
  assert.match(r.text, /CHẠY KHÔ/);
  assert.match(r.text, /cửa gửi ĐÓNG/);
});

test('scheduler · lấy đúng SĐT cho sale bấm gọi (ngưỡng 8–15 chữ số như M07)', () => {
  assert.equal(pickPhone(['ako si Celieta Boca', '71566943']), '71566943');
  assert.equal(pickPhone(['0501234567 po']), '0501234567');
  assert.equal(pickPhone(['SET 1 po 199']), '', 'giá tiền không phải SĐT');
  assert.equal(pickPhone([]), '');
});

test('scheduler · hàng chờ sale gọi đọc lại được từ Sổ AI (sống sót qua restart)', () => {
  const rows = [
    { t: T0 - H, page: 'PG', cust: 'k9', name: 'Celieta Boca', conv: 'cv9', type: 'handoff', lane: 'FOLLOWUP', kind: 'followup_call', reason: '📞 GỌI NGAY', phone: '71566943' },
    { t: T0 - 2 * H, page: 'PG', cust: 'k8', type: 'handoff', reason: 'khách chửi' },
  ];
  const q = saleCallQueue({ hours: 24 * 365 * 100, rows });
  assert.equal(q.length, 1, 'chỉ lấy cú đẩy của M12, không lẫn handoff thường');
  assert.equal(q[0].phone, '71566943');
  assert.match(q[0].link, /c_id=cv9/);
});
