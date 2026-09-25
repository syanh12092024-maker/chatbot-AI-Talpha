#!/usr/bin/env node
// Chỉ chạy bởi quản trị có quyền DB. Không gửi tin/POS, không tự bật lại AI.
import { taoPool } from '../../db/ket-noi.js';
import { handoffFailedMessage, resumeConversation } from '../../src/queue/reconcile.js';
const [action, teamId, id, ...rest] = process.argv.slice(2);
const operations = { handoff: handoffFailedMessage, resume: resumeConversation };
if (!operations[action] || !teamId || !id || !rest.length) {
  console.error('Usage: node ops/bin/doi-chieu-chat.mjs handoff|resume TEAM_ID TIN_ID|HOI_THOAI_ID lý-do-không-chứa-PII');
  process.exitCode = 1;
} else {
  const pool = taoPool();
  try { console.log(JSON.stringify(await operations[action](pool, { teamId, id, reason: rest.join(' ') }))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
  finally { await pool.end(); }
}
