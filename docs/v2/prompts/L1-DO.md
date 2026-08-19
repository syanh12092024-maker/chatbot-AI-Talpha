Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, đang chạy production trên VPS 169.58.33.8 (39 page).

# LUỒNG 1 — ĐO LƯỜNG (M20 Unit Economics)

## Đọc trước khi làm
1. `docs/v2/00-TONG-QUAN.md` — kiến trúc v2 + mô hình dữ liệu §6
2. `docs/v2/05-TANG-VAN-HANH.md` § M20 — spec đầy đủ của việc bạn phải làm
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE, đọc kỹ
4. `.claude/skills/chatbot/references/chi-phi-token.md` — cách tính tiền hiện tại

## Vì sao luồng này quan trọng nhất
Đây là mắt xích chặn cả trục tự tiến hoá. Số liệu thật: hai page **cùng ngành trang sức,
kịch bản dài gần bằng nhau** (830 vs 829 token) mà chênh **12,7 lần** về lượt/đơn
(Royal Gold Boutique 34,8 vs Royal Birthstone 443). Hiện **không ai biết vì sao** — vì
không có gì đo được kịch bản nào ăn tiền. M20 sinh ra để trả lời câu đó.

## Phạm vi
1. **Sổ AI đủ trường.** `src/ai-log.js` — mọi bản ghi `reply` phải có `lane` (đã có),
   `state` (đã có), và **thêm `scriptVersion`** (băm nội dung kịch bản page nếu M02 chưa
   có bản số — dùng hash 8 ký tự của `greeting+tone+salesPrompt`).
2. **`src/economics.js` (mới)** — tính từ Sổ AI, cắt được theo `page × scriptVersion × lane`:
   - `chi phí/đơn`, `lượt/đơn`, `tỷ lệ chốt`, `% tin xử lý ở Fast Lane`
   - **`% ngân sách vào lượt AI đầu tiên`** ← chỉ số sức khoẻ v2 (hiện 69,3%, mục tiêu ≤20%)
   - Mọi con số phải tra ngược được về Sổ AI bằng `recount()`
3. **Ngưỡng cảnh báo tự động** (spec §M20): >20.000đ/đơn · ≥150 lượt & 0 đơn ·
   %lượt-1 >40% · >100 lượt/đơn
4. **`src/admin-economics.js` (mới)** — Express router, mount bằng ĐÚNG 1 DÒNG trong `admin.js`
5. **`public/economics.html` (mới)** — trang riêng. **KHÔNG sửa `public/admin.html`** trừ
   đúng 1 dòng thêm link vào topbar
6. **Báo cáo tuần** gửi WhatsApp (dùng `src/wa.js` sẵn có)

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/economics.js` · `src/ai-log.js` · `src/admin-economics.js` ·
`public/economics.html` · `test/economics.test.mjs` · 1 dòng trong `admin.js` · 1 dòng trong `admin.html`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/kb.js` · `src/fast-lane.js` · `src/conv-*.js`
(các luồng khác đang sửa song song — đụng vào là xung đột)

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l1-do` (nền là `fix-images`)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1` — kiểm tra trước khi chạy gì
- **Không xoá đơn Pancake** ở bất kỳ trạng thái nào
- Chỉ thao tác trên repo này + VPS 169.58.33.8, không đụng host khác
- Đọc VPS được (ssh root@169.58.33.8, Sổ AI ở `/opt/aicloser/ai-messages.jsonl`) —
  **chỉ đọc, không ghi, không restart service**

## Nghiệm thu
- [ ] `npm test` xanh, có test riêng cho economics
- [ ] Server boot sạch, `/health` = 200
- [ ] **Chạy lại trên Sổ AI THẬT kéo từ VPS** và đối chiếu: tổng chi phí khớp với
      `/admin/api/token-cost` hiện có (sai lệch <1%)
- [ ] Cắt được theo page × scriptVersion × lane
- [ ] 4 ngưỡng cảnh báo bắn đúng khi bơm dữ liệu giả

## Cách làm việc mong đợi
Đo trên dữ liệu thật trước khi kết luận. Nếu phát hiện tài liệu spec sai so với code
thật, **nói ra và sửa tài liệu**, đừng lặng lẽ làm theo spec sai — đã có tiền lệ: tài
liệu từng ghi "0/39 page có kịch bản" trong khi thực tế là 37/38.
