Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 8 — BOTCAKE (chỉ đọc) + BẢNG KỊCH BẢN 2 CỘT
### Vòng 2 · chạy sau khi L0 deploy xong
### ⚠️ Bản này THAY THẾ `L8-BANG-KICH-BAN.md` — đọc bản cũ sẽ làm sai

## Đọc trước khi làm
1. `docs/v2/09-VONG-2-CAP-NHAT.md` §1② — **kết quả test API Botcake thật, đọc kỹ nhất**
2. `docs/v2/07-KICH-BAN-TU-DONG.md` — spec bảng kịch bản 2 cột
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
4. `src/fast-lane.js` (M06) và `src/pancake.js` (khuôn mẫu fetch + failover token)

---

## ⛔ ĐIỀU QUAN TRỌNG NHẤT: API Botcake CHỈ ĐỌC

Đã test thật trên page nháp `1194048433791745` ngày 11/08/2026:

```
GET    /api/public_api/v1/pages/{id}/keywords   → 200  {id, is_activated, flow_id}
GET    /api/public_api/v1/pages/{id}/flows      → 200  {id, name, is_removed, parent_id}
POST   /keywords    → 404      PUT   /keywords    → 404
PATCH  /keywords    → 404      DELETE /keywords   → 404      (v2 cũng 404)
POST   /flows/send_flow → 400 "your params wrong"  ← chỉ KÍCH HOẠT flow có sẵn
```

**Ý tưởng "hệ thống tự sinh kịch bản rồi cài vào Botcake" — KHÔNG LÀM ĐƯỢC.** Đừng cố.

Ba sự thật kèm theo:
- **Auth**: header `access-token`. Query `?access_token=` → 400.
- **Key là PAGE-SCOPED**: JWT payload `{id: <pageId>, timestamp}`, không có `exp`.
  → 277 page = 277 key. Kho key phải theo page, giống `PANCAKE_TOKENS_EXTRA`.
- **Gọi từ local ĐƯỢC** (HTTP 200) — khác Pancake (lỗi 121 phải qua VPS).

**Không đọc được nội dung trả lời của flow.** Nhưng Botcake tự đặt tên flow theo từ khoá:
```
"Có chứa how much,  Magkano,  Mgkanu,  magkno,  price"
"Có chứa pawnable,  real,  original,  legit,  pure gold,  saudi gold"
```
→ Bóc từ khoá từ **tiền tố `"Có chứa "` trong `name`**. Mong manh: ai đổi tên flow là mất.
Trên page nháp, **5/11 flow không đọc được từ khoá** (`"LẦN 1"`, `"Private Replies #1"`…).

---

## Phạm vi

### ① `src/botcake.js` (mới) — client CHỈ ĐỌC
Dựng theo khuôn `src/pancake.js`: fetch + kho key theo page + cache + xử lý lỗi êm.
- `BOTCAKE_TOKENS` trong `.env` dạng `<pageId>:<key>,<pageId>:<key>` (giống `PANCAKE_TOKENS_EXTRA`)
- `getKeywords(pageId)` · `getFlows(pageId)` · `getKeywordMap(pageId)` (ghép theo `flow_id`,
  bóc từ khoá từ tên, kèm `is_activated`)
- Page không có key → trả rỗng **êm**, không ném lỗi, không chặn luồng chat
- **KHÔNG viết hàm ghi.** Kể cả `send_flow`

### ② Báo cáo trùng lặp Botcake ↔ Fast Lane
Với mỗi từ khoá đọc được, chạy thử qua `fastLane()` rồi phân loại:

| Kết quả | Nghĩa | Đề xuất |
|---|---|---|
| Fast Lane trả câu mẫu | **TRÙNG** — hai bên cùng trả lời | tắt luật Botcake |
| Fast Lane leo lên AI | **BỔ SUNG** — Botcake phủ chỗ mình thiếu | giữ, và cân nhắc đưa vào bảng kịch bản |
| Từ khoá không đọc được | vùng mù | báo để người vào Botcake xem |

Đã đo trên page nháp: **3/5 luật đang bật là TRÙNG** (giá, số ngày giao, free delivery).
Xuất ra JSON + màn hình, **không tự tắt gì cả** — người quyết.

### ③ Bảng kịch bản 2 cột (bước 1–4 của `07-KICH-BAN-TU-DONG.md`)
Tab `Kịch bản tự động` trên Google Sheet · khớp luật trong `fast-lane.js` ·
validator luật CẤM (§2) · đo 3 chỉ số/dòng (`Lượt dùng` · `Hỏi lại ngay` · `Chốt sau đó`).

⚠️ **KHÔNG làm bước 5 (vòng học đêm)** — đó là L9 vòng 3.

### ④ Dùng danh sách từ khoá để BỎ CHỜ có chọn lọc
`pancake-poll.js` đang chờ `BOTCAKE_GRACE_MS = 6s` cho **mọi** hội thoại để nhường Botcake.
Có danh sách rồi thì: tin **không khớp** từ khoá Botcake nào → **bỏ chờ**.

⚠️ **`pancake-poll.js` KHÔNG thuộc quyền của bạn.** Chỉ **export một hàm** từ `botcake.js`
(vd `willBotcakeAnswer(pageId, text)`) + ghi rõ trong báo cáo cách nối. Người gộp (L0) nối.

⚠️ **Cửa ② (soi lại trước khi gửi) PHẢI GIỮ NGUYÊN MÃI MÃI.** Danh sách từ khoá chỉ là
suy đoán — không cho biết flow có điều kiện phụ, đã chạy cho khách này chưa, và **chào tự
động / auto-reply comment / broadcast KHÔNG đi qua keywords**. Bỏ cửa ② là mở lại va chạm.

---

## ⚠️ Kỳ vọng phải đúng — đừng thổi phồng
Đo trên 6.001 tin khách thật: Fast Lane đang xử lý **36,2%**. 3.827 tin còn lại chứa
**3.259 tình huống KHÁC NHAU** — đuôi cực dài. Chỉ 70 tình huống lặp ≥3 lần.
Và ~216 trong số đó là `ok`/`yes`/`1`/`2` — **câu trả lời cho câu hỏi của AI**, biến thành
mẫu cứng là **mất đơn**.

👉 **Trần thực tế ~50%, không phải 80%.** Đo ra >60% thì gần như chắc chắn đang bắt nhầm
tin cần AI — dừng lại và soi.

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/botcake.js` · `src/rule-store.js` · `src/admin-rules.js` ·
`public/rules.html` · `src/fast-lane.js` · `src/kb.js` *(chỉ THÊM hàm đọc tab mới)* ·
`test/*.test.mjs` của mình · 1 dòng mount trong `admin.js` · 1 dòng link trong `admin.html`

⛔ CẤM đụng: `src/handler.js` · **`src/pancake-poll.js`** · `src/prompts.js` · `src/closer.js` ·
`src/outbound-guard.js` · `src/turn-complete.js` · `src/economics.js` · `src/miner.js` ·
`src/admin-ops.js` · `src/conv-*.js`

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l8-botcake` (nền `fix-images` **sau khi L0 gộp xong**)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Không xoá đơn Pancake**
- **TUYỆT ĐỐI không gọi phương thức GHI nào lên Botcake**, kể cả `send_flow`
- Key Botcake là **credential** — không log ra, không đưa vào HTML, không commit.
  Key thử nghiệm hiện nằm ở `../file.txt` (ngoài repo); khi làm thật phải chuyển vào `.env`
- **HARD_RULES luôn thắng** — dòng kịch bản chỉ thêm cách trả lời tình huống, không được
  ghi đè quy tắc tiền / PII / không-bịa / ngôn ngữ
- Câu trả lời tự động có số tiền → phải khớp **đúng một** gói trong bảng giá KB
  (dùng lại `allowedPrices` / `extractMoney` đã export ở `outbound-guard.js`)

## Nghiệm thu
- [ ] `npm test` xanh (196 test hiện có, đặc biệt nhóm Fast Lane, không được hỏng)
- [ ] Server boot sạch, `/health` = 200
- [ ] `botcake.js` chạy được với key page nháp — đọc đúng 6 keyword + 11 flow
- [ ] Page **không có key** → trả rỗng êm, luồng chat vẫn chạy bình thường
- [ ] Báo cáo trùng lặp chạy đúng trên page nháp: ra **3 TRÙNG / 2 BỔ SUNG / 1 tắt**
- [ ] **Chạy lại trên ≥5.000 tin khách THẬT:** Fast Lane từ 36,2% lên **45–50%**.
      >60% → dừng, soi lại
- [ ] Validator chặn 100% từ khoá thuộc 6 nhóm CẤM
- [ ] Không có key nào lộ trong log / HTML / commit

## Cách làm việc mong đợi
Luật càng rộng càng nguy hiểm — mỗi tin bắt nhầm là một khách nhận câu máy móc lạc đề.
Phân vân một từ khoá có nên tự động không → **để nó lên AI**. Tốn ~130đ còn hơn mất một đơn.

Và kiểm tra thực tế trước khi tin tài liệu: bộ tài liệu này đã sai hai lần ở đúng vùng bạn
đang làm (một lần về số page có kịch bản, một lần về khả năng ghi của API Botcake).
