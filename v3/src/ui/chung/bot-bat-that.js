// CÔNG TẮC BOT THẬT THEO PAGE — một chỗ cho mọi màn cần hỏi «page này bot có đang trả lời không».
//
// Vì sao có file này: audit 28/09 bắt được cùng một team mà năm màn nói hai con số — dải trạng
// thái và «Hệ còn sống không» nói 1 page đang bật (hỏi tiến trình bot), còn «Quy tắc chung»,
// «Người và team», danh sách «Kịch bản» và công tắc ở «Tất cả page» nói 2 (đếm cột
// `page.bot_ai_bat`). Cột đó là BẢN SAO và đã từng lệch 50 page (25/08). Từ 28/09 cửa kiểm của
// bot đã có bản nhớ (`noi-day/cau-bot-v1.js`), nên hỏi nguồn thật không còn tốn 10 giây mỗi lần.
//
// Luật: hỏi bot trước; bot không thấy page ⇒ giữ giá trị cột; không hỏi được ⇒ trả `null` kèm
// lý do để màn KHAI là đang đứng ở bản sao — không im lặng đổi nguồn số.

let _docSanSang = null;

/** Tiêm bộ đọc cửa kiểm (`sanSangToanHe` hoặc bản giả). CÙNG bộ đọc với dải trạng thái. */
export function datDocSanSang(fn) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datDocSanSang: cần một hàm');
  _docSanSang = fn || null;
  return _docSanSang;
}

/**
 * @returns {Promise<{theoBot: Map<string, boolean>|null, viSao: string|null}>}
 *   `theoBot`: page_id Facebook → bot có bật không. `null` = chưa hỏi được, xem `viSao`.
 */
export async function docBotBatThat() {
  if (!_docSanSang) return { theoBot: null, viSao: 'Chưa nối cầu sang tiến trình bot.' };
  try {
    const r = await _docSanSang();
    return {
      theoBot: new Map((r?.pages || []).map((x) => [String(x.pageId ?? x.page_id ?? ''), !!x.aiEnabled])),
      viSao: null,
    };
  } catch (e) {
    return { theoBot: null, viSao: `Không hỏi được tiến trình bot (${e?.message || e}).` };
  }
}

/**
 * Bot có bật trên một dòng `page` không — nguồn thật nếu bot thấy page, không thì cột bản sao.
 * @param {{page_id?: string, bot_ai_bat?: boolean}} p
 * @param {Map<string, boolean>|null} theoBot
 */
export function botBatCua(p, theoBot) {
  const k = String(p?.page_id ?? '');
  if (theoBot && theoBot.has(k)) return theoBot.get(k);
  return p?.bot_ai_bat === true;
}
