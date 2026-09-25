// Adapter cho handler cũ. Không tự dựng payload hoặc POST đơn POS.
import { config } from '../config.js';
import { peekConv } from '../conv-state.js';
import { markClosing, markHandoff } from '../conv-owner.js';
import { recordClosedOrder } from '../order-bridge.js';
import { createPancakeOrder, markConversationOrdered } from '../pancake-orders.js';
import { pkTagByName, pkAddNote } from '../pancake.js';
import { vanGuiDangMo } from '../core/van-gui.js';
import { logAi } from '../ai-log.js';
import { incOrder } from '../stats.js';
import { ketQuaNhanDon } from './draft.js';

export async function nhanDonLegacy(order, { kb, state }) {
  if (state.closed || (state.pkConvId && peekConv(state.pkConvId)?.orderAt)) {
    state.closed = true;
    throw new Error('Hội thoại ĐÃ CHỐT ĐƠN; không tạo lại, chuyển nhân viên xử lý đơn hiện có');
  }
  let created = false;
  if (config.autoCreateOrder) {
    const result = await createPancakeOrder(state.pageId, order, state.pkConvId);
    if (!result.ok) throw new Error(result.error || 'Backend chưa xác nhận tạo đơn');
    created = true;
  }
  // Bản lưu legacy chỉ là adapter hiển thị. Khi tạo POS, luôn qua duyệt V3.
  const item = await recordClosedOrder(state.pageId, state.pkCustId, order, state.pkConvId,
    { kb, created, skipNote: true });
  if (state.pkConvId) {
    markClosing(state.pkConvId, 'Đã nhận thông tin đơn, chờ nhân viên');
    markConversationOrdered(state.pkConvId);
  }
  try { incOrder(state.pageId, state.pkCustId); } catch {}
  try { logAi(state.pageId, state.pkCustId, 'order', { conv: state.pkConvId || '', qty: order.qty }); } catch {}
  const result = ketQuaNhanDon(order, item.id);
  if (created) result.note = 'Backend đã tạo đơn POS. Chỉ xác nhận đã nhận đơn, không hứa lịch giao hoặc đọc draft_id thành mã đơn.';
  return result;
}

export async function banGiaoLegacy(reason, { state }) {
  // Quyền đã chuyển bền trước khi thông báo ra kênh; retry không được vào bán tiếp.
  if (state.pkConvId) markHandoff(state.pkConvId, reason);
  state.handoff = true;
  state.handoffReason = reason;
  logAi(state.pageId, state.pkCustId, 'handoff', { reason, kind: 'ai', conv: state.pkConvId || '' });
  if (vanGuiDangMo() && state.pkConvId && state.pkCustId) {
    try {
      if (config.pkTags.handoff) {
        const tag = await pkTagByName(state.pageId, state.pkConvId, config.pkTags.handoff);
        if (tag?.ok !== true) throw new Error('Không xác nhận gắn thẻ');
      }
      const note = await pkAddNote(state.pageId, state.pkCustId, `AI chuyển nhân viên: ${reason}`);
      if (note?.ok !== true) throw new Error('Không xác nhận ghi chú');
    } catch (cause) {
      const error = new Error('Đã dừng AI; thông báo bàn giao chưa được kênh xác nhận', { cause });
      error.khongThuLai = true;
      throw error;
    }
  }
  return { ok: true };
}
