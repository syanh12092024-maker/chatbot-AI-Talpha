// L5 · Router riêng cho M17 (A/B) và M12 (đuổi theo) — gắn vào admin.js bằng ĐÚNG 1 DÒNG
// (luật §3 của docs/v2/08-SONG-SONG.md: 4 luồng v2 sửa song song, chạm chung một file là
// xung đột chắc chắn).
//
// CỐ Ý KHÔNG CÓ TRANG HTML. `public/admin.html` nằm trong danh sách CẤM của luồng này, và
// L6 (Ops Console) là chỗ đúng để vẽ. Ở đây chỉ mở SỐ ra dạng JSON để L6 nạp thẳng.
//
// Đường dẫn: /admin/api/ab/*  → đã nằm sau adminAuth của server.js.
//
// MỌI ENDPOINT ĐỀU CHỈ ĐỌC, TRỪ HAI CÁI CÓ ĐÁNH DẤU. Không có endpoint nào gửi tin cho
// khách: `/followup/dry-run` chạy đúng đường quyết định của lượt quét thật nhưng dừng
// trước lúc gọi API gửi.
import express from 'express';
import {
  allExperiments, activeExperiment, startExperiment, stopExperiment,
  blacklist, abTable, branchFor, sweepExperiments,
} from './experiment.js';
import { followupConfig, offPages, setPageFollowup, isPageFollowupOn } from './followup.js';
import { dryRun, sendGate, saleCallQueue, lastFollowupRun } from './scheduler-followup.js';

export const experimentsRouter = express.Router();

const fail = (res, e, code = 400) => res.status(code).json({ ok: false, error: e.message || String(e) });

// ── M17 ─────────────────────────────────────────────────────────────────────

/** Bảng so sánh A/B cho dashboard — mỗi thí nghiệm đang chạy 1 dòng. */
experimentsRouter.get('/table', (_req, res) => {
  try { res.json({ ok: true, rows: abTable() }); } catch (e) { fail(res, e, 500); }
});

experimentsRouter.get('/experiments', (_req, res) => {
  try { res.json({ ok: true, ...allExperiments(), blacklist: blacklist() }); } catch (e) { fail(res, e, 500); }
});

/** Khách này đang ở nhánh nào — để tra một ca cụ thể khi số liệu trông lạ. */
experimentsRouter.get('/branch/:pageId/:custId', (req, res) => {
  try { res.json({ ok: true, branch: branchFor(req.params.pageId, req.params.custId) }); } catch (e) { fail(res, e); }
});

/** GHI · mở thí nghiệm. Mỗi page chỉ 1 — experiment.js tự chặn cái thứ hai. */
experimentsRouter.post('/experiments', (req, res) => {
  try { res.json({ ok: true, exp: startExperiment(req.body || {}) }); } catch (e) { fail(res, e); }
});

/** GHI · đóng thí nghiệm bằng tay. */
experimentsRouter.post('/experiments/:pageId/stop', (req, res) => {
  try {
    const exp = stopExperiment(req.params.pageId, req.body || {});
    if (!exp) return res.status(404).json({ ok: false, error: `page ${req.params.pageId} không có thí nghiệm đang chạy` });
    res.json({ ok: true, exp });
  } catch (e) { fail(res, e); }
});

/** Chạy khô vòng quét A/B: phán thắng bại + rollback SẼ xảy ra, nhưng không đóng gì cả. */
experimentsRouter.get('/sweep-dry', async (_req, res) => {
  try { res.json({ ok: true, result: await sweepExperiments({ apply: false }) }); } catch (e) { fail(res, e, 500); }
});

// ── M12 ─────────────────────────────────────────────────────────────────────

experimentsRouter.get('/followup/status', (_req, res) => {
  res.json({
    ok: true,
    gate: sendGate(),
    config: { ...followupConfig },
    offPages: offPages(),
    lastRun: lastFollowupRun()?.summary || null,
    lastRunAt: lastFollowupRun()?.now || 0,
  });
});

/**
 * DANH SÁCH SẼ NHẮN + nội dung từng tin — bản đưa chủ dự án duyệt trước khi bật.
 * ?format=text để đọc bằng mắt, mặc định JSON.
 */
experimentsRouter.get('/followup/dry-run', async (req, res) => {
  try {
    const r = await dryRun();
    if (req.query.format === 'text') return res.type('text/plain; charset=utf-8').send(r.text);
    res.json({ ok: true, gate: r.gate, summary: r.plan.summary, saleQueue: r.plan.saleQueue, send: r.plan.send, holdout: r.plan.holdout, errors: r.errors });
  } catch (e) { fail(res, e, 500); }
});

/** Hàng chờ SALE GỌI của M12 — nhóm khách đã cho SĐT/tên mà chưa chốt. */
experimentsRouter.get('/followup/sale-queue', (req, res) => {
  try { res.json({ ok: true, rows: saleCallQueue({ hours: Number(req.query.hours) || 48 }) }); } catch (e) { fail(res, e, 500); }
});

/** GHI · tắt/bật đuổi theo cho 1 page (sale ngập là tắt ngay). */
experimentsRouter.post('/followup/pages/:pageId', (req, res) => {
  const on = req.body?.on !== false && req.body?.on !== 'false';
  setPageFollowup(req.params.pageId, on);
  res.json({ ok: true, pageId: req.params.pageId, on: isPageFollowupOn(req.params.pageId) });
});
