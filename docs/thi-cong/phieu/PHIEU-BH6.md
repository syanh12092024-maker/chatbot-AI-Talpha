# PHIẾU BH6 — Cắt chi phí KHÔNG cắt chất lượng: bỏ `get_price`, hai điểm neo cache

**Base:** `<sha sau khi BH1 + BH3 xong>` · **Làn:** 🟨 (đổi cấu trúc prompt + bỏ một tool)
· thợ **sonnet**
**Đụng bộ não:** `src/prompts.js` `src/tools.js` — điểm neo cache và danh sách tool nằm ở
hai file này.

> ⛔ **PHỤ THUỘC: BH1 ✅ (server đã tự tính giá) và BH3 ✅ (CORE đã rút gọn).** Bỏ
> `get_price` TRƯỚC khi server biết tính giá là tháo cầu chì trước khi lắp cầu chì mới.
> Thợ nạp `tho-thi-cong` + `viet-thuoc`.

## ① Thi hành

- Số đo nền (`docs/v3/01-QUYET-DINH.md`, VPS 22/08): **vào 3.053 · đọc cache 8.390 ·
  ra 167** token/lượt · trúng cache 73,3% · **127đ/tin** · 6.696đ/đơn.
- `CORE §6` mục 1 bắt model **gọi `get_price` trước khi nêu bất kỳ tổng tiền nào**. Sau
  BH1, giá là do server tính và tool `create_draft_order` **từ chối** số sai — tức luật ấy
  đang bắt model đi một vòng API để lấy thứ **đã nằm sẵn trong khối KNOWLEDGE BASE của
  chính prompt đó**.
- `prompts.js:144` — **một** điểm neo `cache_control`, đặt ở khối cuối (KB) ⇒ cache phủ
  trọn system prompt nhưng **theo từng page**: mỗi page trả tiền cache-write riêng cho cả
  phần dùng chung.

## ② Vào/ra

**Vào (ĐO LẠI):**

- `tools.js#toolDefs` — 4 tool. `get_price` mô tả ~90 token, schema ~40.
- `prompts.js#buildSystem(kb)` — 3 khối: `CORE` → hướng dẫn riêng page → KB (neo cache).
- `kb.js#buildShared()` — Chính sách · FAQ · Xử lý phản đối, **dùng chung mọi page**, hiện
  bị nối vào `kb.text` của TỪNG page ⇒ cùng một nội dung nằm trong 51 tiền tố cache khác nhau.
- ⚠️ `prompts.js:30-31` tự khai: **Kimi cache tự động theo prefix**, `cache_control` gần
  như vô nghĩa ở đó. VPS đang chạy Kimi ⇒ phần «hai điểm neo» chỉ có tác dụng thật khi
  quay về Anthropic. **Phải đo, không được hứa.**

**Ra:**

1. **Bỏ tool `get_price`.**
   - xoá khỏi `toolDefs`; `executeTool` giữ nhánh cũ trả `isError` hướng dẫn model đọc
     bảng giá trong KB (model cũ đang chạy vẫn có thể gọi tên tool này ở lượt dở dang).
   - `CORE §6` mục 1 sửa: «tổng tiền chỉ được là đúng một dòng trong bảng giá ở khối
     KNOWLEDGE BASE» — bỏ câu bắt gọi tool.
   - ⚠️ Cầu chì thật sau BH1 nằm ở `tools.js#create_draft_order` (từ chối số sai) +
     `outbound-guard#PRICE_MISMATCH` (chặn chiều ra). Ca G3 khoá đúng hai cửa đó.
2. **Hai điểm neo cache** (`buildSystem`):
   ```
   [tools] [CORE]                          ──cache① dùng chung MỌI page
   [FAQ/chính sách/phản đối dùng chung]
   [hướng dẫn riêng page] [bảng giá page]  ──cache② theo page
   ```
   - tách phần dùng chung khỏi `kb.text` bằng **khoá sẵn có** — `kb.js` nằm trong 57 file
     cấm nên BH6 **không sửa `kb.js`**; nếu không tách được ở nguồn thì cắt theo mốc chuỗi
     mà `buildShared` đã sinh, và **nói rõ trong nhật ký** là cắt theo mốc, không phải theo
     cấu trúc. Cắt hụt ⇒ giữ nguyên một điểm neo, KHÔNG đoán.
3. **Đo lại chi phí thật** — xem ④. Không có số thì phiếu không đóng.

## ③ Pathspec

```
src/prompts.js                     ← đã khai «Đụng bộ não»
src/tools.js                       ← đã khai «Đụng bộ não»
ops/bin/do-chi-phi-luot.mjs        ← MỚI: đo token/tiền một lượt, trước vs sau
test/bh6-chi-phi.test.js
test/l4-prompt.test.mjs            ← CHỈ số kỳ vọng (số tool 4→3)
ops/bin/nghiem-thu/bh6.sh
docs/thi-cong/nhat-ky/phieu-bh6.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không sửa `kb.js` `closer.js` `context.js` `economics.js`.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh6.sh`

```bash
node --test test/bh6-chi-phi.test.js        # kỳ vọng: 0 fail, ≥12 ca
node --test test/l4-prompt.test.mjs         # kỳ vọng: 0 fail

# G1 · toolDefs còn 3 tool, KHÔNG còn 'get_price'
# G2 · model gọi 'get_price' (lượt dở dang) → isError có hướng dẫn, KHÔNG ném
# G3 · CẦU CHÌ CÒN NGUYÊN: create_draft_order với tổng sai → vẫn từ chối (BH1)
#      và guard PRICE_MISMATCH vẫn bắt → bỏ tool KHÔNG mở đường bịa giá
# G4 · buildSystem trả ĐÚNG 2 khối mang cache_control (hoặc 1 + khai rõ vì sao)
# G5 · khối cache① giống hệt nhau giữa 2 page khác nhau (byte-for-byte)
# G6 · tổng token system prompt giảm ≥15% so với HEAD trước phiếu

# ═══ ĐO TIỀN THẬT — phiếu không đóng nếu thiếu bảng này ═══
node --env-file=.env ops/bin/do-chi-phi-luot.mjs --n 20 --lan 2
#   in: token vào / đọc cache / ghi cache / ra · số lời gọi/lượt · đ/tin
#   kỳ vọng so nền (127đ/tin · 1,4 call/lượt):
#     · lời gọi/lượt ≤ 1,1   (bỏ get_price = bớt 1 vòng ở mọi lượt báo giá)
#     · đ/tin ≤ 90đ          (cộng dồn BH3 rút CORE + tin ngắn)
#   ⚠️ chạy trên Kimi thì phần cache② có thể KHÔNG đổi gì — ghi số thật, cấm làm tròn
#     theo hướng mình muốn (án lệ #5: cổng lỏng mà log nói dối là HAI lỗi).
```

## ⑤ Test chạm nhánh thật

- `buildSystem` chạy với `kb` thật của **2 page khác thị trường** (SAR và AED) → so khối
  cache① byte-for-byte.
- `do-chi-phi-luot.mjs` gọi model thật 20 tin khách thật × 2 lượt.
- Nhánh KHÔNG chạm được: hoá đơn thật của nhà cung cấp — `config.aiPrices.cacheWrite` vẫn
  là số **chưa đối chiếu hoá đơn** (`config.js:98-102` tự khai). Ghi lại trong nhật ký,
  đừng trình con số tiền như thể đã kiểm.

## ⑥ Ngoài phạm vi

- `admin.js#/token-cost` bỏ sót `cwrite` ⇒ lệch với `economics.js` — nợ đã phát hiện ở
  lượt audit 16/09, ghi §9, không sửa ở đây (`admin.js` là file cấm).
- Đổi model rẻ hơn (DeepSeek/GPT — bảng 01 §7 chênh tới 28×) — **hoãn theo lệnh người
  quyết**: phải có lớp model cắm vào `closer` trước (nợ H3 của audit).

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "get_price" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(0 dòng)
$ grep -n "cache_control\|điểm neo" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(0 dòng)
$ grep -n "cache" docs/v3/01-QUYET-DINH.md | head -3
23:| Hồ sơ token mỗi lượt | vào 3.053 · đọc cache 8.390 · ra 167 |
24:| Tỉ lệ trúng cache | 73,3% |
```

**Quan hệ: mới.** Hai neo chính (`get_price`, điểm neo cache) chưa từng vào sổ nợ; số nền
lấy từ `01-QUYET-DINH.md` §số-đo-nền, là số ĐO chứ không phải phán quyết đang treo.
