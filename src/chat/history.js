export function messageTime(message) {
  const raw = message.inserted_at || message.created_time || message.created_at || message.timestamp;
  const n = typeof raw === 'number' ? raw : /^\d+$/.test(String(raw || '')) ? Number(raw) : NaN;
  return Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : Date.parse(raw || '') || 0;
}
/** Chỉ lấy lịch sử trước event đang xử lý; không nạp nhầm các tin đến sau. */
export function historyBeforeMessage(messages, tin) {
  const rows = Array.isArray(messages) ? [...messages] : [];
  const time = messageTime;
  if (rows.length && rows.every(m => time(m))) rows.sort((a, b) => time(a) - time(b));
  const at = rows.findIndex(m => String(m.id ?? m.message_id ?? '') === String(tin.msg_id));
  if (at >= 0) return rows.slice(0, at);
  const cutoff = new Date(tin.tao_luc || '').getTime();
  const before = rows.filter(m => !cutoff || !time(m) || time(m) <= cutoff);
  // Một số kênh trả id khác Meta. Chỉ bỏ bản sao cuối đúng nội dung event.
  const last = before.at(-1);
  if (last && String(last.from?.id) !== String(tin.page_id) &&
      String(last.original_message || last.message || '').trim() === String(tin.noi_dung || '').trim()) before.pop();
  return before;
}
