// Trạng thái hội thoại theo PSID + transcript để dashboard hiển thị (in-memory cho pilot).
// TODO production: chuyển sang Redis/DB để bền & scale nhiều instance.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sessions = new Map();

// AI MẶC ĐỊNH TẮT: chỉ page nào nằm trong set này mới cho AI tự trả.
// Lưu ra file để restart không mất trạng thái bật.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AI_FILE = path.resolve(__dirname, '..', 'ai-enabled.json');
const aiEnabledPages = new Set();
(function loadAiEnabled() {
  try {
    if (fs.existsSync(AI_FILE)) {
      const arr = JSON.parse(fs.readFileSync(AI_FILE, 'utf8'));
      if (Array.isArray(arr)) arr.forEach((id) => aiEnabledPages.add(String(id)));
    }
  } catch { /* để trống = tất cả tắt */ }
})();
function saveAiEnabled() {
  try { fs.writeFileSync(AI_FILE, JSON.stringify([...aiEnabledPages], null, 2)); }
  catch (e) { console.error('[ai] lưu trạng thái lỗi:', e.message); }
}

function ts() { try { return Date.now(); } catch { return 0; } }

export function getState(psid) {
  let s = sessions.get(psid);
  if (!s) {
    s = {
      psid, pageId: '', pageName: '',
      messages: [],     // lịch sử gửi cho Claude
      transcript: [],   // {who:'customer'|'ai'|'system', text, at} — cho dashboard
      aiTurns: 0, handoff: false, handoffReason: '',
      leadScore: null, orderId: null,
      lastText: '', lastAt: 0, createdAt: ts(),
    };
    sessions.set(psid, s);
  }
  return s;
}

export function resetState(psid) { sessions.delete(psid); }

export function recordInbound(psid, { pageId, pageName, text }) {
  const s = getState(psid);
  if (pageId) s.pageId = pageId;
  if (pageName) s.pageName = pageName;
  s.lastText = text; s.lastAt = ts();
  s.transcript.push({ who: 'customer', text, at: ts() });
}

export function recordOutbound(psid, text, who = 'ai') {
  if (!text) return;
  const s = getState(psid);
  s.transcript.push({ who, text, at: ts() });
}

export function listConversations({ pageId } = {}) {
  const arr = [...sessions.values()]
    .filter((s) => !pageId || String(s.pageId) === String(pageId))
    .map((s) => ({
      psid: s.psid, pageId: s.pageId, pageName: s.pageName,
      lastText: s.lastText, lastAt: s.lastAt, handoff: s.handoff, handoffReason: s.handoffReason,
      aiTurns: s.aiTurns, orderId: s.orderId, msgs: s.transcript.length,
    }))
    .sort((a, b) => b.lastAt - a.lastAt);
  return arr;
}

export function getConversation(psid) {
  const s = sessions.get(psid);
  if (!s) return null;
  return {
    psid: s.psid, pageId: s.pageId, pageName: s.pageName,
    handoff: s.handoff, handoffReason: s.handoffReason, orderId: s.orderId,
    transcript: s.transcript,
  };
}

export function setHandoff(psid, on = true, reason = 'manual') {
  const s = getState(psid);
  s.handoff = on; s.handoffReason = on ? reason : '';
  return s;
}

// Bật/tắt AI theo page — MẶC ĐỊNH TẮT (chỉ bật thủ công khi cần).
export function isAiEnabled(pageId) { return aiEnabledPages.has(String(pageId)); }
export function setAiEnabled(pageId, on) {
  if (on) aiEnabledPages.add(String(pageId)); else aiEnabledPages.delete(String(pageId));
  saveAiEnabled();
}
export function listAiEnabled() { return [...aiEnabledPages]; }
