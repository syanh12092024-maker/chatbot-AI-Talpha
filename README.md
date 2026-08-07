# AI Messenger Closer (pilot — thị trường ME / COD)

Bot AI đứng tuyến đầu trên Facebook Messenger: phân loại tin (Haiku) → tư vấn & chốt đơn bằng tiếng Ả Rập (Sonnet, có tool use) → lọc đơn COD chống bom hàng → tạo đơn vào Pancake. Giữ Pancake làm nơi đóng đơn.

## Kiến trúc

```
FB Messenger ──webhook──> Express (server.js)
                              │
                 classify (Haiku 4.5)  ── spam → im · complaint → chuyển người
                              │            (ngôn ngữ lạ: AI TỰ trả lời, không chuyển)
                              │
                 closer (Sonnet 4.6) + tool use + KB(cache)
                   tools: get_price · check_stock · score_lead
                          create_draft_order · handoff_human
                              │
                 Pancake (tạo đơn)   +   store (state theo PSID)
```

KB đọc từ file Excel `../KB_AI_Chatbot_Mau.xlsx` (team điền sản phẩm/giá/chính sách/FAQ/phản đối).

## Cài đặt

```bash
cd messenger-closer
npm install
cp .env.example .env      # rồi điền ANTHROPIC_API_KEY (và Messenger token khi đấu nối thật)
```

## Test ngay trong terminal (chỉ cần ANTHROPIC_API_KEY)

```bash
npm run chat
```

Gõ tin như khách (tiếng Ả Rập/Anh/Việt) để xem AI tư vấn, gỡ chê giá, xin địa chỉ + xác nhận COD rồi "tạo đơn". Không cần Facebook.

## Chạy server webhook

```bash
npm start          # hoặc: npm run dev (tự reload)
```

Sau đó cấu hình trên Meta App → Messenger → Webhooks:
- Callback URL: `https://<domain-công-khai>/webhook` (dùng ngrok khi dev: `ngrok http 3000`)
- Verify Token: trùng `VERIFY_TOKEN` trong `.env`
- Subscribe các field: `messages`, `messaging_postbacks`
- Cấp `PAGE_ACCESS_TOKEN` của page pilot vào `.env`

Cập nhật KB xong gọi `POST /reload-kb` để nạp lại không cần restart.

## Việc cần làm khi lên thật (TODO)

- `src/pancake.js`: thay STUB bằng API tạo đơn Pancake thật.
- `src/store.js`: chuyển state sang Redis/DB để bền & scale.
- Cửa sổ 24h của Messenger: tin `RESPONSE` chỉ gửi được trong 24h kể từ tin cuối của khách. Để follow-up khách đi lạnh (quan trọng với COD), xin quyền **Human Agent** và gửi bằng `messaging_type: MESSAGE_TAG`, tag `HUMAN_AGENT` (được 7 ngày). Sửa trong `src/messenger.js`.
- BigQuery logging (lead_journey + RTO) để đo Order→Delivered.
- `APP_SECRET`: bật để xác thực chữ ký webhook (bắt buộc khi production).

## 14 nguyên tắc khi AI chat với khách

1. **Ngôn ngữ & giọng điệu** — mặc định Tagalog/English (Taglish OK); khách dùng ngôn ngữ khác (Ả Rập, Urdu, Hindi...) → AI **trả lời bằng đúng ngôn ngữ của khách**; tuyệt đối không tiếng Việt với khách; giọng thân thiện kiểu Philippines ("po"/"opo"), mỗi tin 1-3 câu, né tôn giáo/chính trị. (`prompts.js`)
2. **Trung thực thông tin** — giá/chính sách chỉ lấy từ KB hoặc tool `get_price`, không bịa; mỗi page 1 sản phẩm; luôn coi còn hàng; chủ động gửi ảnh thật (`send_product_image`) khi hợp cảnh — kể cả khi khách vào thẳng chuyện mua (gửi SĐT, hỏi giá) mà chưa xem tấm nào. Quyết định gửi hay không là của AI, KHÔNG ép bằng code: ảnh để hội thoại thân thiện hơn, không phải gửi máy móc cho mọi khách. **ẢNH LUÔN ĐI KÈM CHỮ** — tool bắt buộc tham số `caption` (gửi ngay dưới tấm đầu) và lượt phải khép bằng tin chữ; closer không bao giờ trả `'...'` nữa mà xin model viết lại, cùng lắm thì im (`closer.js`). Trước khi sửa: 2/3 trong 905 lần gửi ảnh là ảnh trơ hoặc chỉ kèm ba dấu chấm. (`prompts.js`, `tools.js`)
3. **Chốt đơn COD đúng quy trình** — đủ Tên + SĐT + Địa chỉ + SL + xác nhận COD mới gọi `create_draft_order`; tool OK rồi mới báo "đã nhận đơn"; cấm bịa Mã đơn. **CẤM BỊA TỔNG TIỀN** (thêm 07/08/2026 sau vụ khách hủy đơn + block page vì bị báo gấp đôi giá): trước khi nêu bất kỳ tổng tiền nào phải gọi `get_price`, tổng chỉ được là đúng giá MỘT gói trong bảng — không tự nhân/cộng giá các gói; lời khách không khớp rõ 1 gói (page chào "SET 1/SET 2", khách nói "2 sets") → hỏi lại 1 câu kèm giá, không suy diễn; số lượng ngoài bảng giá → để nhân viên xác nhận tổng. (`prompts.js → HARD_RULES`)
4. **Chống spam làm phiền khách** — không hỏi lại thứ khách đã cho; địa chỉ có khu vực + 1 chi tiết là đủ; hỏi ngắn 1-2 dòng, không dán lại checklist.
5. **Chống đơn trùng** — khách đã có đơn (chốt trước đó / FB Commerce / thẻ trạng thái đơn Pancake) → không chốt lại, không hỏi lại; mỗi khách 1 đơn tới khi sale xử lý xong.
6. **Biết im lặng** — page tắt AI / chưa có KB / tin đầu (nhường Botcake chào) / tin cuối là của page / spam ≥0.8 / sale đã tiếp quản → AI không nói.
7. **Biết chuyển người** (`handoff_human`) — khiếu nại, đơn giá trị cao, khách đòi gặp người, AI không chắc → chuyển kèm lý do, hiện ở hàng chờ "Cần sale xử lý" + ghi chú vào Pancake. (Ngôn ngữ lạ KHÔNG còn chuyển người — AI tự trả lời bằng ngôn ngữ của khách. **Khách do dự / từ chối cũng KHÔNG còn là lý do chuyển người** — sửa 07/08/2026 theo phản hồi sale: đó là lúc phải bán, xem nguyên tắc 14.)
8. **Cầu chì an toàn — chống spam khách** — tối đa **4 lượt AI/khách trong 24h** (`MAX_AI_TURNS`, hạ từ 5 xuống 4 ngày 06/08/2026 để tiết kiệm token), đếm BỀN từ Sổ AI nên restart server không "reset chui" thêm lượt; khách nhắn dồn nhiều tin liên tiếp → AI **đợi khách gõ xong ~20s** (`REPLY_DEBOUNCE_MS`) rồi trả lời **1 lần cho cả cụm**, không đáp riêng từng tin; `maxToolIterations` (5) vòng tool/lượt; xử lý **song song tối đa 4 khách** cùng lúc (`CONV_CONCURRENCY`) để giờ cao điểm không dồn đuôi; classifier lỗi → fallback an toàn. (`config.js`, `ai-log.js → recentReplyCount`, `pancake-poll.js`)
9. **Biết dừng khi kênh đang lỗi (backoff)** — page gửi tin thất bại 2 lần LIÊN TIẾP (vd Meta chặn #2022) → tạm ngừng gửi trên page đó 30 phút rồi tự thử lại; cảnh báo đỏ hiện trên dashboard (pill ⚠ trên topbar + banner ở Tổng quan) để sale biết khách đang không được trả lời. Gửi OK là reset đếm. (`pancake-poll.js → noteSendResult/sendHealth`)
10. **Đọc lịch sử trước khi trả lời** — nếu bộ nhớ phiên trống (server mới restart / khách quay lại sau nhiều ngày), AI nạp 20 tin gần nhất của ĐÚNG hội thoại đó từ Pancake (2 chiều, gồm cả Botcake/sale tay) rồi mới soạn tin — không chào lại từ đầu, không hỏi lại thông tin cũ, biết khách đã đặt đơn. (`handler.js → hydrateHistory`)
11. **Không cam kết vượt thẩm quyền** — không hứa giờ/ngày giao cụ thể, không tự chế chính sách đổi trả/hoàn tiền/bảo hành ngoài KB; ngoài phạm vi → "nhân viên sẽ xác nhận chi tiết này với anh/chị". (`prompts.js → HARD_RULES`)
12. **Bảo vệ thông tin khách (PII)** — không đọc lại đầy đủ SĐT/địa chỉ trong tin nhắn trừ 1 lần lúc tóm tắt xác nhận đơn; tuyệt đối không nhắc thông tin/đơn hàng của khách khác trong hội thoại. (`prompts.js → HARD_RULES`)
13. **Kết thúc là phải bàn giao** — MỌI điểm AI dừng phục vụ đều đổ về hàng chờ "Cần sale xử lý" kèm LÝ DO + link mở chat + tên khách, không khách nào rơi vào khoảng trống "AI im mà người chưa biết". Các điểm dừng: ① AI chốt đơn xong (`order`), ② AI chủ động chuyển người (`handoff_human`), ③ khách khiếu nại, ④ AI hết lượt (`maxAiTurnsBeforeHandoff`), ⑤ page chưa có KB, ⑥ lỗi kỹ thuật lặp ≥3 lần trên 1 hội thoại (đẩy tối đa 1 lần/24h, kèm thẻ 'AI back Sale'). Khách nói câu giữ chân "team member will assist you shortly" thì PHẢI có người thật xuất hiện ở hàng chờ. **Mỗi lần bàn giao đều để lại 3 dấu vết trong Pancake** (sửa 07/08/2026 — trước đó chỉ ①② mới có ghi chú): thẻ `AI back Sale` trên hội thoại + **ghi chú vào hồ sơ khách nêu rõ lý do AI dừng** + dòng trong hàng chờ dashboard. Sale trực Pancake mở chat ra là biết chuyện gì đã xảy ra, không phải đoán. (`handler.js → toSaleQueue`, `tools.js`)
14. **Văn phong phải chủ động bán — không thả khách mông lung** (thêm 07/08/2026 theo phản hồi sale) — AI là người BÁN HÀNG, không phải tổng đài trả lời câu hỏi. Mỗi tin gửi khách phải kết bằng một bước tiến về phía đơn (câu hỏi chốt / gợi ý gói / xin phần thông tin còn thiếu); cấm kết lượt bằng câu chờ đợi thụ động kiểu "let me know po", "feel free to ask" rồi im. Khách **từ chối hoặc do dự** ("mahal", "iisipin ko muna", "next time na lang") thì không được buông ngay: mời chốt lại tối đa **3 lần, mỗi lần một góc khác** — ① gỡ đúng nỗi lo khách nêu (chê đắt → bẻ nhỏ giá trị; nghi chất lượng → gửi ảnh feedback/chứng nhận), ② hạ rủi ro về 0 bằng COD "xem hàng rồi mới trả tiền", ③ chốt nhẹ bằng lựa chọn ("SET 1 or SET 2 po?") thay vì hỏi có/không. Đủ 3 lần vẫn từ chối → dừng ép, cảm ơn lịch sự. Ép mua = mời chốt CÓ LÝ LẼ, cấm nài nỉ và cấm bịa khan hiếm/khuyến mãi không có trong KB. ⚠️ Ràng buộc thực tế: trần **4 lượt AI/khách/24h** (nguyên tắc 8) thường tiêu 2 lượt cho chào + báo giá, nên khách từ chối muộn sẽ không đủ chỗ cho đủ 3 lần — muốn chạy trọn ladder phải nâng `MAX_AI_TURNS` (đánh đổi token). (`prompts.js → HARD_RULES`)

> Ghi chú vận hành: mọi hành động AI vẫn được ghi vào Sổ AI (`ai-messages.jsonl`), tự ghi chú vào Pancake khi chốt đơn/chuyển người, và TỰ GẮN THẺ Pancake (`AI Chăm` khi đang phục vụ, `AI Chốt` khi chốt đơn, `AI back Sale` khi cần người can thiệp — đổi qua env `PK_TAG_*`, thẻ phải tồn tại trên page) — dashboard có nút "Đối chiếu Sổ AI" để kiểm chứng số liệu.
>
> **Không để hội thoại "trôi" khỏi hàng chờ sale** (thêm 07/08/2026 theo yêu cầu sale — cơ chế giống Botcake "đánh dấu chưa đọc khi rep khách"): sau MỖI tin AI gửi thành công, bot gọi API chính thức `POST .../conversations/{id}/unread` để hội thoại quay lại trạng thái **chưa đọc** — sale lướt inbox vẫn thấy chấm đỏ, mở ra check được AI chat đúng chưa, khách không hỏi thêm thì thả trôi. Mặc định BẬT; tắt bằng `PK_MARK_UNREAD=0`. Endpoint này đòi `page_access_token` riêng từng page (base `public_api/v1`) — bot tự sinh 1 lần/page bằng `generate_page_access_token` và lưu bền vào `pancake-page-tokens.json` (gitignore). ⚠️ Việc sinh làm token cũ của page đó (nếu ai từng tự tạo trong Cài đặt → Công cụ) hết hiệu lực.

> Model dùng: chọn theo `AI_PROVIDER` trong `.env`. **VPS đang chạy `kimi` — `kimi-k2.6` cho cả closer lẫn phân loại** (đổi từ 06/08/2026 khi tài khoản Anthropic hết credit). Đổi về `AI_PROVIDER=anthropic` thì mặc định là `claude-haiku-4-5`; model lệch nhà cung cấp bị bỏ qua kèm cảnh báo `[config]`. Prompt caching bật trên khối KB trong `src/prompts.js`.
