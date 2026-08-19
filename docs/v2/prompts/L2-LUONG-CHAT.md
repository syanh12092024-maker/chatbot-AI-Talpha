Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, đang chạy production trên VPS 169.58.33.8 (39 page).

# LUỒNG 2 — LUỒNG CHAT (M11 ngân sách lượt · M13 hậu bán · M07 nén ngữ cảnh)

## Đọc trước khi làm
1. `docs/v2/00-TONG-QUAN.md` — kiến trúc v2, máy trạng thái §4, mô hình dữ liệu §6
2. `docs/v2/03-TANG-TANG-CHOT.md` § M11, § M13 — spec đầy đủ
3. `docs/v2/02-TANG-LUONG-CHAT.md` § M07 — spec nén ngữ cảnh
4. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE, đọc kỹ
5. `src/conv-owner.js` + `src/conv-state.js` — M05 vừa xong, bạn xây tiếp trên đó

## Ba số liệu thật làm nền
- **Trần lượt đang cắt đúng chỗ sinh lời.** Tỷ lệ chốt theo số lượt AI:
  1 lượt→0,3% · 2→3,0% · 3→5,4% · **4→11,2%** (trần hiện tại) · 5→16,7% · 6→18,9%
- **7% hội thoại có AI là khách ĐÃ NHẬN HÀNG.** Ca thật: khách Matess Valdez, **13 lượt
  AI, 0 đơn** — khách báo hàng vỡ ("Kuya damage po yong Isa"), AI đáp "thank you so much"
  rồi dội nguyên bài quảng cáo sản phẩm khách vừa mua.
- **Input 2.906 token/lượt** vì mỗi lượt nạp lại 20 tin thô; trong đó **13,7% tin page là
  rác** (`<div></div>`, `...`).

## Phạm vi
### M11 · `src/lead-score.js` (mới) — chấm điểm bằng LUẬT, 0 token
Bảng điểm + bảng ngân sách lượt ở spec §M11. Thay `config.maxAiTurnsBeforeHandoff` cố
định bằng trần theo độ nóng (1 / 3 / 6 / 10 / 12), cộng **+3 lượt khi khách nêu phản đối**
để chạy trọn ladder 3 bước của nguyên tắc 14 (hiện chưa bao giờ chạy hết vì hết lượt).

### M13 · `src/post-sale.js` (mới) — nhận diện hậu bán bằng NỘI DUNG
Thẻ Pancake không phủ hết (nhiều đơn không qua POS). Bắt theo từ khoá 4 nhóm ở spec §M13,
ba nhánh xử lý: có vấn đề → handoff ngay · chưa nhận → luồng vận chuyển · hài lòng →
nhánh CƠ HỘI mời mua lại (ngân sách riêng, tối đa 2 lượt).

### M07 · `src/context.js` (mới) — hồ sơ khách nén
Thay 20 tin thô bằng `[HỒ SƠ KHÁCH ~150 token] + [6 tin gần nhất]`. Trích SĐT/địa
chỉ/tên bằng **regex**, gói quan tâm từ tham số tool, ảnh đã gửi từ `send_product_image`.
Lọc bỏ tin page rỗng và template Botcake (dùng `isAutomationTemplate` trong
`src/bot-registry.js` — đã có sẵn).

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/handler.js` · `src/lead-score.js` · `src/post-sale.js` ·
`src/context.js` · `src/conv-owner.js` · `src/conv-state.js` · `src/bot-registry.js` ·
`test/*.test.mjs` của mình

⛔ CẤM đụng: `src/prompts.js` · `src/closer.js` · `src/classifier.js` · `src/fast-lane.js` ·
`src/kb.js` · `src/ai-log.js` · `src/admin*.js` · `public/*`
(các luồng khác đang sửa song song — đụng vào là xung đột)

> ⚠️ Luồng 4 đang biến `classify()` thành bộ luật thuần **giữ nguyên chữ ký hàm**, nên
> `handler.js` KHÔNG cần đổi gì cho việc đó. Cứ gọi `classify()` như hiện tại.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l2-luong-chat` (nền là `fix-images`)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1` — kiểm tra trước khi chạy gì
- **Không xoá đơn Pancake** ở bất kỳ trạng thái nào
- Giữ nguyên mọi cửa an toàn đang có: debounce, backoff 2 lỗi→30 phút,
  `maxToolIterations=5`, không bao giờ trả `'...'` cho khách
- VPS chỉ ĐỌC (ssh root@169.58.33.8), không ghi, không restart service

## Nghiệm thu
- [ ] `npm test` xanh (hiện có 54 test, không được làm hỏng cái nào)
- [ ] Server boot sạch, `/health` = 200
- [ ] **M11:** tổng lượt AI/ngày giảm ≥30% · số khách đạt ≥6 lượt tăng ≥3 lần ·
      không khách nào >12 lượt/24h
- [ ] **M13:** khách báo hàng lỗi → AI không gửi quảng cáo, chuyển sale trong 1 lượt
- [ ] **M07:** input/lượt ≤1.400 token (đo trên ≥200 lượt thật kéo từ VPS);
      restart giữa hội thoại → AI không chào lại từ đầu
- [ ] **Chạy lại trên hội thoại THẬT** kéo từ Pancake, không chỉ test tự chế

## Cách làm việc mong đợi
Chạy lại trên dữ liệu thật trước khi tin kết quả. Nếu phát hiện luật mình viết bắt nhầm
tin hợp lệ, sửa luật chứ đừng sửa test cho vừa. Lệch một chiều có chủ ý: nghi ngờ thì
**cho AI chạy tiếp** (tốn ~130đ) chứ đừng im (mất một đơn).
