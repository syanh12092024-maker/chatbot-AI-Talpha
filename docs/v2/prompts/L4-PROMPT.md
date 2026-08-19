Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, đang chạy production trên VPS 169.58.33.8 (39 page).

# LUỒNG 4 — PROMPT (bỏ classifier · gộp `BASE_SYSTEM` + `HARD_RULES`)

## Đọc trước khi làm
1. `docs/v2/02-TANG-LUONG-CHAT.md` § M08 — spec đầy đủ
2. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE, đọc kỹ (đặc biệt mẹo ③)
3. `.claude/skills/chatbot/references/quy-tac-ai.md` — 14 nguyên tắc, phải giữ nguyên hiệu lực
4. `README.md` §14 nguyên tắc — **sửa prompt là phải cập nhật README trong cùng commit**

## Hai số liệu làm nền
- **calls/lượt = 2,28** — mỗi tin tốn 2 lần gọi model (1 classifier + 1 closer), trong khi
  classifier trả 5 trường mà chỉ `intent` được dùng, và nó **fallback sai** mỗi khi API
  chập chờn (đợt 08/08 API 429 làm classifier fallback loạn).
- **System prompt ~4.686 token** mỗi lần gọi: `BASE_SYSTEM` 1.804 + kịch bản riêng của
  page 1.391 + `HARD_RULES` 1.486. Trong 3.290 token tĩnh, **~1.400 là lặp lại chính nó**
  — ngôn ngữ, ảnh, còn hàng, chống spam địa chỉ, tổng tiền đều viết 2 lần ở cả hai khối.

## Phạm vi

### ① Bỏ classifier — GIỮ NGUYÊN CHỮ KÝ HÀM
⚠️ **KHÔNG xoá `classifier.js`, KHÔNG sửa `handler.js`** (file của Luồng 2).

Thay vào đó biến `classify()` thành **bộ luật thuần, không gọi LLM**, trả đúng shape cũ
`{intent, lang, lead_quality, urgency, is_spam_conf}` (+ không có `__usage` vì không tốn
token). Như vậy `handler.js` không phải đổi một dòng nào và hai luồng không đụng nhau.

Luật thay thế:
- `spam` — regex chửi bới / tố lừa đảo: `scam·peke·manloloko·حرامي` + link rác
- `complaint` — **giữ định nghĩa RẤT HẸP đang có**: khách **đã mua** mà có vấn đề, hoặc
  chửi bới/tố lừa đảo. Phản đối bán hàng thông thường (`ang mahal`, `iisipin ko muna`)
  **TUYỆT ĐỐI không phải complaint** — dán nhãn này là AI ngừng bán trước khi LLM kịp chạy
- `lang` — nhận diện script Ả Rập / dấu hiệu Tagalog / mặc định `en`
  (có sẵn `detectLang()` trong `src/fast-lane.js`, dùng lại)
- còn lại → `interested` / `question`

Bù lại phần tinh tế đã mất: closer vẫn có tool `handoff_human` để tự nhận ra khiếu nại
thật. Kiểm tra kỹ điều này trong nghiệm thu.

### ② Gộp `BASE_SYSTEM` + `HARD_RULES` thành một khối CORE
- Mục tiêu ~1.800 token (từ 3.290), **không được mất một nguyên tắc nào** trong 14 nguyên tắc
- Giữ nguyên thứ tự ưu tiên: CORE → kịch bản page → KB, cache anchor ở khối CUỐI
- ⚠️ **KHÔNG động vào khối kịch bản riêng của page** (1.391 token TB). Đó là kịch bản
  marketer viết, không phải chỗ tiết kiệm token — và số liệu chưa chứng minh dài/ngắn
  cái nào tốt hơn (2 page cùng ngành, kịch bản 830 vs 829 token, chênh **12,7 lần** lượt/đơn)

### ③ Dọn nhỏ
- `max_tokens` 1024 → 400 (tin TB 182 token, chỉ 6,3% vượt 300)
- Rà tool: bỏ `score_lead` nếu không nơi nào dùng (Luồng 2 đang làm chấm điểm bằng luật)

## Sở hữu file
✅ ĐƯỢC sửa: `src/prompts.js` · `src/closer.js` · `src/classifier.js` · `src/fast-lane.js` ·
`src/tools.js` *(chỉ phần bỏ `score_lead`)* · `README.md` · `test/*.test.mjs` của mình

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/kb.js` · `src/ai-log.js` ·
`src/admin*.js` · `src/conv-*.js` · `public/*`

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l4-prompt` (nền là `fix-images`)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Sửa hành vi AI thì phải cập nhật `README.md` (14 nguyên tắc) trong cùng thay đổi** —
  đây là luật của dự án
- **Không ép hành vi AI bằng code.** Đã có tiền lệ `ensureFirstTurnImages` phải gỡ bỏ vì
  làm hội thoại máy móc. Muốn đổi hành vi thì sửa prompt
- Giữ `sanitizeMessages` / `sanitizeSystem` (lớp chặn nửa emoji) — bỏ là khách ngồi im vĩnh viễn
- Không bao giờ để closer trả `'...'` cho khách

## Nghiệm thu
- [ ] `npm test` xanh (54 test hiện có không được hỏng)
- [ ] Server boot sạch, `/health` = 200
- [ ] **calls/lượt ≤ 1,2** (hiện 2,28)
- [ ] **Token system ≤ 3.400** kể cả kịch bản page (hiện 4.686)
- [ ] **Đối chiếu 14 nguyên tắc**: liệt kê từng nguyên tắc → chỉ ra nó nằm ở dòng nào
      trong CORE mới. Không nguyên tắc nào được biến mất
- [ ] **A/B tay trên ≥30 hội thoại THẬT** kéo từ Pancake: chạy prompt cũ vs mới, chấm tay,
      chất lượng KHÔNG kém hơn
- [ ] Khiếu nại thật → vẫn `handoff_human` đúng (10/10 ca test)
- [ ] Phản đối giá (`ang mahal`, `iisipin ko muna`) → **KHÔNG** bị gán `complaint` (8/8 ca)

## Cách làm việc mong đợi
Đây là luồng rủi ro chất lượng cao nhất trong 4 luồng — gộp prompt sai là 39 page bán sai.
Đối chiếu từng nguyên tắc một, đừng gộp theo cảm tính. Nếu không chắc một câu trong
`HARD_RULES` còn cần thiết không, **giữ lại** và ghi chú, đừng cắt.
