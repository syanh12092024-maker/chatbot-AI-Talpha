// LỊCH ĐÊM CHO M15 — 02:00 mỗi đêm mổ toàn bộ page, rồi HỌC SỔ TEMPLATE trên đúng dữ liệu đó.
// Spec: docs/v2/04-TANG-TU-TIEN-HOA.md § M15 · docs/v2/09-VONG-2-CAP-NHAT.md §1④
//
// Vì sao gộp hai việc vào MỘT lượt chạy: cả M15 lẫn template-learner đều cần "hội thoại đầy
// đủ của page". Kéo hai lần là gấp đôi tải lên Pancake mà chẳng thêm thông tin gì.
//
// BA CÁI CHỐT AN TOÀN:
//   ① `PANCAKE_READONLY=1` (máy local) → KHÔNG chạy. Mổ tốn tiền model thật.
//   ② Đúng 1 lượt/đêm: mốc `lastDate` ghi xuống đĩa, restart giữa chừng không chạy lại từ đầu.
//   ③ Mẫu template học được chỉ vào SỔ CHỜ DUYỆT — không tự bật (xem template-learner.js §⑤).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mineAll } from './miner.js';
import { learnReport, mergeCandidates, filterDecided } from './template-learner.js';
import { pancakePages } from './pancake.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATE_FILE = () => path.resolve(ROOT, process.env.MINER_STATE_FILE || 'miner-state.json');
const LEARN_FILE = () => path.resolve(ROOT, process.env.TEMPLATE_REPORT_FILE || 'template-learn-reports.jsonl');

const VN = 7 * 3600e3;                                    // giờ VN, khớp với các lịch khác của hệ
const HOUR = Number(process.env.MINER_HOUR ?? 2);         // 02:00 theo spec

const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch { return {}; } };
const writeState = (s) => { try { fs.writeFileSync(STATE_FILE(), JSON.stringify(s, null, 2)); } catch (e) { console.error('[miner] lưu mốc lỗi:', e.message); } };

const vnDate = (ms) => new Date(ms + VN).toISOString().slice(0, 10);

/** Tới giờ mổ chưa? Đúng 1 lần/ngày (giờ VN), tính theo NGÀY chứ không theo khoảng cách. */
export function dueNow(now, lastDate) {
  const d = new Date(now + VN);
  if (d.getUTCHours() < HOUR) return false;
  return lastDate !== vnDate(now);
}

/**
 * Một lượt chạy đêm: mổ từng page (1 lời gọi model/page) → học sổ template trên chính
 * dữ liệu vừa kéo → ghi báo cáo + sổ chờ duyệt.
 */
export async function runNightly(opt = {}) {
  const now = opt.now || Date.now();
  const ids = opt.pageIds && opt.pageIds.length ? opt.pageIds : [...pancakePages().keys()];
  if (!ids.length) return { skipped: true, why: 'chưa nạp được danh sách page Pancake' };

  const bundles = [];
  const mined = await mineAll(ids, {
    ...opt,
    now,
    onPage: async (rep) => {
      // `collected` chỉ sống trong RAM của lượt chạy này — saveReport() đã cố ý không ghi
      // hội thoại thô xuống đĩa (PII). Học xong là bỏ.
      if (rep?.collected?.convs?.length) bundles.push(rep.collected);
      if (opt.onPage) await opt.onPage(rep);
    },
  });

  let learn = null;
  try {
    learn = learnReport(bundles, { now, rows: opt.rows });
    const fresh = filterDecided(learn.candidates);       // người đã bỏ mẫu nào thì đừng dựng lại
    const merged = mergeCandidates(fresh, { now });
    learn.merged = merged;
    const { candidates, ...slim } = learn;               // file lịch sử giữ SỐ, không giữ toàn văn mẫu
    try { fs.appendFileSync(LEARN_FILE(), JSON.stringify({ ...slim, found: candidates.length, savedAt: now }) + '\n'); }
    catch (e) { console.warn('[miner] ghi báo cáo học template lỗi:', e.message); }
    console.log(`[tpl] học xong: ${candidates.length} mẫu mới (${merged.added} thêm vào sổ chờ duyệt) · độ phủ ${learn.before.coverage.pct}% → ${learn.after.coverage.pct}% · khoá oan ${learn.before.lock.pct}% → ${learn.after.lock.pct}%`);
  } catch (e) {
    console.error('[tpl] học sổ template lỗi:', e.message);
  }

  const st = readState();
  writeState({
    ...st, lastRunAt: now, lastDate: vnDate(now),
    lastMinutes: mined.minutes, lastCalls: mined.calls,
    lastPages: ids.length, lastReported: mined.reports.filter((r) => !r.skipped).length,
    lastLearn: learn ? { found: learn.candidates.length, ...learn.merged, coverage: learn.after.coverage.pct, lock: learn.after.lock.pct } : null,
  });
  return { ...mined, learn };
}

/** Khởi động lịch. Trả {started:false, why} khi cố ý không chạy — server.js in ra để người biết. */
export function startMinerScheduler({ intervalMs = 10 * 60e3 } = {}) {
  if (process.env.PANCAKE_READONLY === '1') return { started: false, why: 'PANCAKE_READONLY=1 (máy local)' };
  if (process.env.MINER_NIGHTLY === '0') return { started: false, why: 'MINER_NIGHTLY=0' };

  let running = false;
  const tick = async () => {
    if (running) return;
    const st = readState();
    if (!dueNow(Date.now(), st.lastDate)) return;
    running = true;
    // Ghi mốc NGAY: lượt mổ chạy 30 phút, tick 10 phút — không ghi trước thì hai lượt chồng nhau.
    writeState({ ...st, lastDate: vnDate(Date.now()), startedAt: Date.now() });
    try { await runNightly(); }
    catch (e) { console.error('[miner] lượt mổ đêm lỗi:', e.message); }
    finally { running = false; }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return { started: true, timer, hour: HOUR };
}

export function minerState() { return readState(); }
