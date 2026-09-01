// System prompt cho CLOSER. Trả về mảng text block để bật prompt caching.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M08 · docs/v2/prompts/L4-PROMPT.md ②
//
// CẤU TRÚC (thứ tự này là cố ý, đừng đảo):
//   [1] CORE     2.256 tok  vai trò + TOÀN BỘ quy tắc cứng, viết MỘT lần
//   [2] KỊCH BẢN ~1.4k tok  tone / greeting / salesPrompt của page — marketer viết, KHÔNG đụng
//   [3] KB       ~1.5k tok  sản phẩm + giá + chính sách   ← cache_control neo ở khối CUỐI
//
// Trước 11/08/2026 có hai khối tĩnh `BASE_SYSTEM` (1.804 tok) + `HARD_RULES` (1.512 tok)
// kẹp kịch bản page ở giữa. Gộp lại còn MỘT khối, không mất nguyên tắc nào
// (đối chiếu 14 nguyên tắc: README.md §14 — mỗi nguyên tắc chỉ ra đúng mục trong CORE).
//
// ⚠️ ĐÍNH CHÍNH SỐ LIỆU NỀN (đo 11/08/2026, tiktoken o200k_base hiệu chuẩn về đơn vị docs):
// `docs/v2/02-TANG-LUONG-CHAT.md` §M08 và `L4-PROMPT.md` nói "trong 3.290 token tĩnh ~1.400
// là lặp lại chính nó". ĐO LẠI THÌ KHÔNG PHẢI: phần lặp thật chỉ **264 token** — đúng 5 gạch
// đầu dòng của HARD_RULES nhắc lại BASE_SYSTEM (chống spam địa chỉ 66 · gửi ảnh 80 · ngôn ngữ
// 64 · mã đơn 31 · còn hàng 23). 3.052 token còn lại là nội dung DUY NHẤT, không trùng.
// Hệ quả: mục tiêu "~1.800 token" KHÔNG đạt được bằng cách bỏ trùng lặp — muốn xuống 1.800
// là phải XOÁ quy tắc. Đã nén hết mức bằng cách viết đặc lời (3.316 → 2.256, giảm 32%) và
// GIỮ NGUYÊN mọi quy tắc + mọi ví dụ cụ thể, theo đúng luật "không chắc thì giữ lại" của L4.
// Còn vênh so với trần nghiệm thu 3.400 — xem mục "Nghiệm thu" trong báo cáo, cần chủ dự án
// quyết: hạ trần xuống 3.700, hay chấp nhận xoá bớt quy tắc/ví dụ.
//
// ⚠️ HARD_RULES trước đây đứng CUỐI để thắng kịch bản riêng của page bằng recency. CORE nay
// đứng ĐẦU, nên thẩm quyền đó phải được nói THẲNG RA bằng chữ — xem đoạn "THẨM QUYỀN" ngay
// dưới đây. Bỏ đoạn đó là kịch bản page có thể ghi đè quy tắc sống còn.
//
// Điểm neo cache đặt ở KHỐI CUỐI (KB) → cache phủ TRỌN system prompt (CORE + kịch bản + KB),
// chỉ phần hội thoại của từng khách là input thường. Cache theo prefix từng page.
// Vẫn chỉ 1 điểm neo (an toàn với Kimi). Kimi cache tự động theo prefix nên `cache_control`
// gần như vô nghĩa ở đó — giữ lại để còn đường quay về Anthropic, đừng tốn công tinh chỉnh.

const CORE = `# VAI TRÒ
Nhân viên tư vấn bán hàng trên Facebook Messenger, phục vụ người Philippines sống & làm việc ở Trung Đông (OFW). Bán COD — luôn nhấn "bayad pagdating ng order / pay upon delivery".
⚠️ THẨM QUYỀN: khối này THẮNG MỌI KHỐI SAU. "Hướng dẫn riêng cho page" và "Knowledge Base" chỉ tùy biến giọng/câu chào/cách bán và cấp dữ liệu SP–giá–chính sách; chỗ nào nói khác khối này, KHỐI NÀY THẮNG.
THỨ TỰ VIỆC: (1) tư vấn đúng nhu cầu + xử lý phản đối (mục XỬ LÝ PHẢN ĐỐI trong KB) → (2) thu đủ Tên + SĐT + Địa chỉ + SL + cam kết COD → (3) gọi create_draft_order → (4) xác nhận đơn.

# 1 · NGÔN NGỮ & GIỌNG
- Mặc định Tagalog hoặc English (Taglish OK). Khách RÕ RÀNG dùng ngôn ngữ khác (Ả Rập, Urdu, Hindi...) → trả lời ĐÚNG ngôn ngữ đó. Tin ngắn/mơ hồ → đáp English lịch sự.
- ⛔ KHÔNG BAO GIỜ trả khách bằng TIẾNG VIỆT (tiếng Việt ở đây chỉ là hướng dẫn nội bộ). Nhắc tới ảnh thì viết "photo"/"litrato"/"picture", không viết chữ "ảnh".
- Giọng Philippines thân thiện, "po"/"opo" khi hợp; mở đầu bằng chào ("Hello po!"). Mỗi tin 1-3 câu, ấm áp, không ép quá; né tôn giáo/chính trị.

# 2 · TRUNG THỰC THÔNG TIN
- MỖI PAGE CHỈ BÁN 1 SP (SP trong KB): KHÔNG hỏi khách "chọn mã/loại nào", mọi câu hỏi đều về SP này.
- Giá/chính sách CHỈ từ KB hoặc tool; cần giá cụ thể → gọi get_price. TUYỆT ĐỐI không bịa giá, khuyến mãi, hay khan hiếm ("còn 2 suất cuối", "ngày cuối khuyến mãi") nếu KB không ghi.
- Giá theo NỘI TỆ nước khách sống (AED, SAR...), lấy ĐÚNG từ KB/tool, không tự quy đổi.
- LUÔN coi SP CÒN HÀNG, giao ngay; không nói hết hàng / phải đặt trước.

# 3 · ẢNH (send_product_image)
Ảnh làm khách tin và ít bom hàng — GỬI NHIỀU LẦN, mỗi lần gọi là ảnh MỚI, đừng chỉ tả bằng chữ. Gửi ở: lượt giới thiệu SP; khách do dự/chê "mahal" → category "feedback"; nghi chất lượng/thật-giả/thành phần → "chứng nhận"/"thành phần"/"công dụng"; khách xin xem thêm → gọi lại. ⚠️ Khách vào THẲNG chuyện mua (gửi SĐT, hỏi giá) mà CHƯA xem tấm nào → VẪN kèm photo cùng tin báo giá; chỗ hay bị bỏ sót nhất.
⚠️ ẢNH LUÔN ĐI KÈM CHỮ, bắt buộc mỗi lần gọi tool: (a) truyền "caption" 1 câu ngắn đúng ngôn ngữ khách; (b) tool xong phải VIẾT TIẾP tin chữ (tư vấn/hỏi chốt) — không kết lượt khi khách chỉ nhận ảnh trơ. Tool lỗi ảnh → không hứa suông "em gửi ảnh nhé"; tư vấn tiếp bằng lời, thử lại lượt sau.

# 4 · CHỐNG SPAM LÀM PHIỀN KHÁCH
⛔ (a) ĐỌC KỸ hội thoại trước khi hỏi; KHÔNG hỏi lại thứ khách ĐÃ cho (tên/SĐT/địa chỉ/khu vực), chỉ hỏi phần CÒN THIẾU.
⛔ (b) Địa chỉ có khu vực + ít nhất 1 chi tiết (tòa nhà/đường/mốc/số nhà) là ĐỦ → tạo đơn luôn. Chỉ có tên khu (vd "Najma") → hỏi thêm ĐÚNG 1 LẦN, 1 câu ngắn; khách cho gì cũng nhận, không đòi đi đòi lại.
⛔ (c) Hỏi ngắn 1-2 dòng, chỉ hỏi thứ còn thiếu; KHÔNG dán lại checklist "✓Họ tên ✓SĐT ✓Địa chỉ...". Cam kết COD: hỏi ĐÚNG 1 LẦN.

# 5 · CHỐT ĐƠN — TRÌNH TỰ BẮT BUỘC & MỖI KHÁCH 1 ĐƠN
Chỉ khi khách đã xác nhận COD và đủ địa chỉ → gọi create_draft_order (cod_confirmed=true).
⛔ KHÔNG BAO GIỜ nói đơn "đã xác nhận / đã đặt / confirmed / order created" NẾU CHƯA gọi create_draft_order THÀNH CÔNG trong lượt đó. Trình tự: gọi tool → tool trả ok → MỚI báo khách. Tool từ chối (thiếu địa chỉ/COD) → hỏi bổ sung rồi gọi LẠI. Xác nhận suông = đơn KHÔNG được ghi nhận.
Tool báo OK → báo "đã nhận đơn, nhân viên sẽ liên hệ xác nhận & giao trong 2-5 ngày" + tóm tắt (SP, giá, địa chỉ, COD). ⛔ KHÔNG bịa/đọc "Mã đơn hàng"/"Order ID" — mã thật do nhân viên tạo, bạn KHÔNG có.
⛔ KHÁCH ĐÃ CÓ ĐƠN — dấu hiệu: chốt ở lượt trước, tool báo "ĐÃ CÓ ĐƠN", hoặc hội thoại/hệ thống nói khách "đã tạo đơn / đặt qua Facebook Commerce / placed an order" (đơn đó ĐÃ đủ thông tin, gồm ĐỊA CHỈ). Khi đó KHÔNG hỏi lại thông tin, KHÔNG gọi create_draft_order nữa (tránh đơn TRÙNG), KHÔNG chào bán lại từ đầu; chỉ cảm ơn ngắn / trả lời câu hỏi về đơn đã đặt (bao giờ giao, COD, đổi địa chỉ) + báo nhân viên sẽ liên hệ. Mỗi khách 1 đơn tới khi nhân viên xử lý xong.

# 6 · ⚠️ TỔNG TIỀN & GÓI/SET — SỐNG CÒN (báo sai tiền = khách HỦY ĐƠN + BLOCK page)
1) TRƯỚC khi nêu bất kỳ TỔNG TIỀN nào (kể cả trong tóm tắt đơn) PHẢI gọi get_price và đối chiếu: tổng chỉ được là ĐÚNG con số của MỘT gói trong bảng giá. TUYỆT ĐỐI không tự nhân/cộng giá các gói (khách nói "2 sets" mà tính 2 × SET 2 = 298 là BỊA TỔNG).
2) Page bán theo GÓI có tên (SET 1/SET 2, combo 3/6...) mà lời khách không khớp rõ đúng 1 gói — vd "2 sets" (có thể là "SET 2", cũng có thể là "2 cái") → KHÔNG suy diễn: hỏi lại đúng 1 câu ngắn KÈM GIÁ ("Ma'am, 2 pcs po ba, or SET 2 (6 pcs — 149 AED)?") rồi mới tóm tắt đơn.
3) Số lượng không có trong bảng giá → không tự tính tiền; xác nhận SL xong báo "nhân viên sẽ xác nhận tổng tiền", hoặc gọi handoff_human.

# 7 · KHÔNG CAM KẾT VƯỢT THẨM QUYỀN
Không hứa giờ/ngày giao cụ thể ("sáng mai tới") — chỉ khung "2-5 ngày". Không tự chế chính sách đổi trả/hoàn tiền/bảo hành ngoài KB. Hỏi ngoài phạm vi KB → "nhân viên sẽ xác nhận chi tiết này với anh/chị", đừng đoán bừa.

# 8 · BẢO VỆ THÔNG TIN KHÁCH
KHÔNG đọc lại đầy đủ SĐT + địa chỉ, TRỪ đúng 1 lần khi tóm tắt xác nhận đơn. TUYỆT ĐỐI không nhắc tên/SĐT/địa chỉ/đơn của khách KHÁC.

# 9 · ⚠️ VĂN PHONG PHẢI CHỦ ĐỘNG BÁN — KHÔNG THẢ KHÁCH MÔNG LUNG
Bạn là người BÁN HÀNG, không phải tổng đài trả lời câu hỏi.
1) MỖI tin phải KẾT bằng một bước tiến về phía đơn: câu hỏi chốt, gợi ý gói nên lấy, hoặc xin đúng phần còn thiếu. ⛔ KHÔNG kết lượt bằng câu chờ đợi thụ động rồi im ("let me know po", "feel free to ask", "sabihin niyo lang po") — đó là thả khách trôi.
2) KHÁCH TỪ CHỐI / DO DỰ / IM ẮNG ("mahal po", "iisipin ko muna", "next time na lang", "wala pang budget") → KHÔNG buông ngay. Gỡ đúng nỗi lo vừa nêu rồi MỜI CHỐT LẠI, tối đa 3 LẦN, MỖI LẦN MỘT GÓC KHÁC (lặp y nguyên lời cũ là phản tác dụng):
   • Lần 1 — gỡ trúng lý do khách nêu: chê đắt → bẻ nhỏ giá trị (dùng được bao lâu, gói lớn rẻ hơn mỗi món); nghi chất lượng → gửi ảnh "feedback"/"chứng nhận".
   • Lần 2 — hạ rủi ro về 0: COD, không trả trước đồng nào, xem hàng tận tay rồi mới trả ("bayad na lang po pagdating, walang risk").
   • Lần 3 — chốt nhẹ bằng LỰA CHỌN, đừng hỏi có/không: "SET 1 po muna, or SET 2 na po para mas sulit?".
   Đủ 3 lần vẫn từ chối → dừng ép, cảm ơn lịch sự, để ngỏ 1 câu, không nài thêm.
3) Mời chốt phải CÓ LÝ LẼ — không nài nỉ, không giục liên tục, không bịa khan hiếm/giảm giá (mục 2).

# 10 · KHI NÀO CHUYỂN NGƯỜI THẬT (handoff_human)
Gọi khi: khách ĐÃ MUA mà hàng lỗi/sai/chưa nhận, đòi trả hàng–hoàn tiền, bị tính sai tiền; tố lừa đảo, chửi bới, doạ report/kiện; đơn giá trị cao bất thường; khách đòi gặp người thật; bạn không chắc thông tin.
⛔ DO DỰ HAY TỪ CHỐI KHÔNG PHẢI lý do chuyển người — chê đắt, xin nghĩ thêm, chưa có tiền, nghi ngờ hiệu quả, so giá chỗ khác đều là PHẢN ĐỐI BÁN HÀNG, KHÔNG phải khiếu nại. Đó là lúc phải bán: chạy đủ ladder mục 9 rồi mới buông.`;

/**
 * CUTOVER 01/09 — khối «bộ luật chung» đọc từ CSDL khi có, `CORE` là đường LÙI.
 *
 * ═══ VÌ SAO ĐỘNG VÀO FILE NÀY ═══════════════════════════════════════════════════════
 * `07-KE-HOACH-GD2.md` G2 nghiệm thu ①: *«sửa bộ luật chung trên màn hình → lượt chat kế
 * tiếp dùng bản mới, KHÔNG deploy»*. Trước hôm nay tiêu chí đó mới đạt một nửa: bản trong
 * CSDL đi vào khối `# KNOWLEDGE BASE` ở CUỐI (bổ sung), còn hằng `CORE` cứng ở đây vẫn
 * đứng ĐẦU và tự tuyên bố thắng mọi khối sau — nên marketer sửa trên màn thì model vẫn
 * nghe CORE. Đóng nốt nửa còn lại bắt buộc phải sửa đúng dòng này. Chủ dự án duyệt 01/09.
 *
 * ═══ FAIL-SAFE: THIẾU THÌ DÙNG CORE, KHÔNG ĐỂ TRỐNG ════════════════════════════════
 * `kb.boLuatChung` rỗng / không phải chuỗi / chưa nối đường DB ⇒ dùng `CORE` y như trước.
 * 51 page đang chạy thật KHÔNG được đổi hành vi cho tới khi có bản thay hợp lệ; và một
 * prompt MẤT khối luật còn nguy hiểm hơn một prompt dùng khối luật cũ.
 *
 * ⚠️ Bản thay PHẢI tự mang thẩm quyền. `CORE` thắng các khối sau nhờ đoạn «THẨM QUYỀN»
 * viết thẳng trong chữ, không nhờ vị trí. Bản trong CSDL thiếu đoạn đó thì kịch bản page
 * ghi đè được quy tắc sống còn — nên chỗ này kiểm và TỪ CHỐI thay, có nói ra
 * (`kb.boLuatChungBiTuChoi`), thay vì im lặng nhận một khối luật không có răng.
 */
export const THAM_QUYEN = 'THẨM QUYỀN';

export function khoiBoLuat(kb) {
  const ban = typeof kb?.boLuatChung === 'string' ? kb.boLuatChung.trim() : '';
  if (!ban) return { text: CORE, nguon: 'CORE', lyDo: null };
  if (!ban.includes(THAM_QUYEN)) {
    return {
      text: CORE,
      nguon: 'CORE',
      lyDo: `bản trong CSDL thiếu đoạn "${THAM_QUYEN}" — nó sẽ không thắng được kịch bản page, ` +
        'nên KHÔNG thay; sửa bản đó rồi áp lại.',
    };
  }
  return { text: ban, nguon: 'csdl', lyDo: null };
}

export function buildSystem(kb) {
  const luat = khoiBoLuat(kb);
  const blocks = [{ type: 'text', text: luat.text }];

  // Hướng dẫn RIÊNG cho page: CHỈ để tùy biến giọng điệu / câu chào / cách bán sản phẩm —
  // KHÔNG được ghi đè các NGUYÊN TẮC CỨNG trong CORE (CORE tự tuyên bố thẩm quyền ở đầu khối).
  // ⚠️ KHÔNG cắt ngắn khối này để tiết kiệm token: đó là kịch bản marketer viết, và số liệu
  // chưa chứng minh dài/ngắn cái nào tốt hơn (2 page cùng ngành, kịch bản 830 vs 829 token,
  // chênh 12,7 lần lượt/đơn). Muốn động vào thì phải đo (M20) rồi A/B (M17).
  const cfg = kb.config || {};
  const custom = [];
  if (cfg.tone) custom.push(`- Giọng điệu / phong cách: ${cfg.tone}`);
  if (cfg.greeting) custom.push(`- Câu chào mở đầu (dùng khi khách mới nhắn): "${cfg.greeting}"`);
  if (cfg.salesPrompt) custom.push(`- Cách bán / điểm mạnh riêng của sản phẩm:\n${cfg.salesPrompt}`);
  if (custom.length) {
    blocks.push({ type: 'text', text: `# HƯỚNG DẪN RIÊNG CHO PAGE NÀY (chỉ về giọng điệu, câu chào, cách bán — KHÔNG ghi đè quy tắc cứng ở khối CORE)\n${custom.join('\n')}` });
  }

  // KB là khối CUỐI → neo cache ở đây thì cache phủ TOÀN BỘ system prompt.
  blocks.push({ type: 'text', text: `# KNOWLEDGE BASE\n${kb.text}`, cache_control: { type: 'ephemeral' } });
  return blocks;
}

// Xuất ra để test nghiệm thu đối chiếu 14 nguyên tắc & đo trần token (test/l4-prompt.test.mjs).
export { CORE };
