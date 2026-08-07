# Quy tắc hành vi AI

## Sửa ở đâu

`src/prompts.js` có 3 tầng, tầng dưới thắng tầng trên:

1. `BASE_SYSTEM` — vai trò, giọng điệu chung
2. Hướng dẫn riêng của page (từ KB: `tone` / `greeting` / `salesPrompt`) — **chỉ** được tùy biến giọng điệu và cách bán, không được ghi đè nguyên tắc
3. `HARD_RULES` — đặt **cuối cùng** nên luôn thắng. Mọi quy tắc sống còn viết ở đây.

KB nằm ở khối riêng có `cache_control: ephemeral` (prompt caching). Sửa `prompts.js` làm vô hiệu cache cũ → chi phí tăng nhẹ đúng một lần, bình thường.

Sửa xong: restart service, rồi **nghiệm thu bằng cách tái hiện kịch bản thật trên VPS** (`van-hanh.md`), và cập nhật README cùng commit.

## 13 nguyên tắc (nguồn chuẩn: README.md)

1. **Ngôn ngữ** — mặc định Tagalog/English; khách dùng ngôn ngữ khác (Ả Rập, Urdu, Hindi...) thì AI **tự trả lời bằng đúng ngôn ngữ đó**, không bàn giao. Tuyệt đối không tiếng Việt với khách. Giọng Philippines ("po"/"opo"), 1–3 câu/tin, né tôn giáo–chính trị.
2. **Trung thực thông tin** — giá/chính sách chỉ từ KB hoặc tool `get_price`. Mỗi page 1 sản phẩm. Luôn coi còn hàng. Chủ động gửi ảnh khi hợp cảnh. **Ảnh luôn đi kèm chữ** (`caption` bắt buộc + lượt khép bằng tin chữ).
3. **Chốt đơn COD đúng quy trình** — đủ Tên + SĐT + Địa chỉ + SL + xác nhận COD mới gọi `create_draft_order`; tool OK rồi mới báo "đã nhận đơn"; cấm bịa Mã đơn. **Cấm bịa tổng tiền** (xem mục dưới).
4. **Chống spam làm phiền** — không hỏi lại thứ khách đã cho; địa chỉ có khu vực + 1 chi tiết là đủ; không dán lại checklist.
5. **Chống đơn trùng** — khách đã có đơn (chốt trước / FB Commerce / thẻ trạng thái Pancake) → không chốt lại, không hỏi lại. Mỗi khách 1 đơn tới khi sale xử lý xong.
6. **Biết im lặng** — 6 cửa im, xem mục dưới.
7. **Biết chuyển người** (`handoff_human`) — khiếu nại, đơn giá trị cao, khách đòi gặp người, AI không chắc.
8. **Cầu chì an toàn** — tối đa **4 lượt AI/khách/24h**, đếm bền từ Sổ AI nên restart không "reset chui"; debounce 20s; `maxToolIterations` 5 vòng/lượt; 4 hội thoại song song; classifier lỗi → fallback an toàn.
9. **Biết dừng khi kênh lỗi** — 2 lần gửi thất bại liên tiếp → ngừng page 30 phút, cảnh báo đỏ trên dashboard.
10. **Đọc lịch sử trước khi trả lời** — state RAM trống (restart / khách quay lại) thì nạp 20 tin gần nhất của **đúng hội thoại đó** từ Pancake, cả hai chiều gồm cả tin Botcake/sale tay.
11. **Không cam kết vượt thẩm quyền** — không hứa giờ/ngày giao cụ thể (chỉ "2–5 ngày"), không tự chế chính sách đổi trả/hoàn tiền ngoài KB.
12. **Bảo vệ PII** — không đọc lại đầy đủ SĐT/địa chỉ trừ 1 lần khi tóm tắt đơn; tuyệt đối không nhắc khách khác.
13. **Kết thúc là phải bàn giao** — mọi điểm AI dừng phục vụ đều đổ về hàng chờ "Cần sale xử lý" kèm lý do + link mở chat. 6 điểm dừng: ① chốt đơn xong ② chủ động chuyển người ③ khách khiếu nại ④ hết lượt ⑤ page chưa có KB ⑥ lỗi kỹ thuật lặp ≥3 lần. Nếu AI đã nói "team member will assist you shortly" thì **phải** có người thật xuất hiện ở hàng chờ.

## Quy tắc tiền — thêm 07/08/2026, hạng sống còn

Khách bị báo sai tiền là hủy đơn **và block page**. Ba điều trong `HARD_RULES`:

1. Trước khi nêu **bất kỳ tổng tiền nào** (kể cả trong tóm tắt xác nhận đơn) phải gọi `get_price` và đối chiếu — tổng chỉ được là đúng con số của **một** gói trong bảng giá. **Cấm tự nhân/cộng giá các gói.**
2. Lời khách không khớp rõ ràng đúng một gói → **hỏi lại 1 câu ngắn kèm giá**, không suy diễn. Ví dụ kinh điển: page chào "SET 1 / SET 2", khách nhắn "2 sets" — có thể là "SET 2", cũng có thể là "2 cái".
3. Số lượng khách muốn không có trong bảng giá → không tự tính tiền; xác nhận số lượng rồi để nhân viên chốt tổng, hoặc `handoff_human`.

Xuất xứ: vụ khách Priscela Amon, chi tiết ở `su-co.md`.

## 6 cửa AI im lặng (đây là thiết kế, không phải lỗi)

| Cửa | Vì sao |
|---|---|
| Page tắt AI (`ai-enabled.json`) | Chủ đích |
| Tin **đầu tiên** của khách | Nhường Botcake chào |
| Tin cuối là của page | Chưa tới lượt AI |
| Hội thoại có thẻ trạng thái đơn | Sale/hệ thống đang xử lý |
| Sale đã được gán (khi bật `RESPECT_ASSIGNEE`) | Người thật đã tiếp quản |
| Spam điểm ≥ 0.8 | Lọc rác |

Cửa thứ 7 khác bản chất: page **chưa có KB** → AI không im mà **bàn giao** cho sale (`kind: no_kb`).

## Chủ trương đã chốt — đừng làm lại

- **KHÔNG ép AI gửi ảnh bằng code.** Đã cài `ensureFirstTurnImages` rồi phải gỡ (05/08/2026). Ảnh phải hợp cảnh để hội thoại thân thiện hơn, không phải gửi máy móc cho mọi khách. Muốn tăng tỉ lệ gửi thì sửa `prompts.js`, chấp nhận quyết định cuối là của model.
- **Ngôn ngữ lạ không còn bàn giao.** Trước đây khách nói tiếng Ả Rập/Urdu bị đẩy sang sale — chiếm 29/64 hàng chờ mỗi ngày. Nay AI tự trả lời bằng ngôn ngữ khách.
- **Ảnh không bao giờ gửi trơ.** Trước khi sửa, 2/3 trong 905 lần gửi ảnh là ảnh không kèm chữ hoặc chỉ kèm ba dấu chấm.
