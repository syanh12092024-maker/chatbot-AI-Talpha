# PHIẾU BH5 — Soi LỖ HỔNG kiến thức của page: câu khách hỏi mà KB không trả lời được

**Base:** `22561be` · **Làn:** 🟩 (chỉ ĐỌC + sinh báo cáo, không đụng đường chat) · thợ **sonnet**
**Đụng bộ não:** không.

> Thợ nạp `tho-thi-cong`. Phụ thuộc: KHÔNG. Chạy song song mọi phiếu khác.
> ⚠️ Phiếu này đẻ ra **việc cho NGƯỜI** (marketer), không tự sửa nội dung page. Cấm bịa
> nội dung tư vấn thay marketer — sai một câu về «vàng 18K có cầm đồ được không» là mất
> khách và mất uy tín page.

## ① Thi hành

- `docs/v3/01-QUYET-DINH.md` §6 — tầng **kỹ năng**: «khối tư vấn dùng lại được, bật cho
  đúng sản phẩm cần». Đo được ngay ở đó: hai sản phẩm có size đang hoàn **26,8%** và
  **19,2%** (sản phẩm không size: 9,3%) và **cả hai chưa bật kỹ năng hỏi size**.
- Đo 16/09 trên 3.027 tin khách thật: `authenticity_quality` **1,5%** · `size_variant`
  **1,1%** · `location_availability` **1,2%** · `usage_ingredients` 0,1%. Nhỏ về số lượng,
  nhưng rơi đúng lúc khách do dự — và `obj_trust` là tín hiệu khách hay nêu thứ 7/12
  (31 lần, gấp 5 lần chê đắt).
- `docs/v2/09-DO-THAT-TRUOC-DEPLOY.md` — tiền lệ: bộ luật đối chiếu Botcake ↔ Fast Lane
  đã cho ra bảng «TRÙNG / BỔ SUNG / VÙNG MÙ». BH5 làm đúng việc đó cho **KIẾN THỨC**.

## ② Vào/ra

**Vào (ĐO LẠI):**

- `mau-duong-ban.json` — 719 hội thoại thật đã che PII (`ops/bin/do-duong-ban.mjs --keo`).
- `src/kb.js#getKBForPage(pageId)` → `{products, text, config}`; `text` gồm khối sản phẩm
  + **khối dùng chung** (`buildShared`: Chính sách · FAQ · Xử lý phản đối, đọc từ Google
  Sheet/Excel). **Đo trước khi code:** `kb-overrides.json` chỉ có `products` + `config`
  (2 khoá) — tức khối dùng chung KHÔNG nằm trong file override, nó tới từ Sheet. Phải đo
  xem trên máy chủ nó có nội dung gì, đừng suy từ file local.
- 77 page: 74 có `greeting`+`salesPrompt`, **67 page nhét giá vào `salesPrompt`**,
  **2 page** có `tone`.

**Ra:** `ops/bin/do-lo-hong-kb.mjs` — với mỗi page:

1. gom câu hỏi THẬT của khách trong mẫu, phân 8 nhóm (giá · ship · thật-giả · size ·
   vùng giao · cách dùng · thanh toán · khác);
2. soi KB của page đó xem **có chữ nào trả lời được nhóm ấy không** (khớp từ khoá trong
   `kb.text` + `config.salesPrompt`);
3. xếp ba kết luận, cùng khuôn báo cáo Botcake đã dùng:
   - **CÓ** — KB trả lời được;
   - **THIẾU** — khách có hỏi, KB không có chữ nào ⇒ **việc cho marketer**;
   - **KHÔNG AI HỎI** — đừng bắt marketer viết thừa;
4. in bảng xếp theo «số lần khách hỏi × page đang bật AI», để marketer làm từ trên xuống;
5. `--json` cho cổng đọc.

⛔ **Không** thêm trường mới vào `kb.js` (`SCRIPT_FIELDS`) — `kb.js` vẫn nằm trong 57 file
cấm, và nội dung tư vấn có chỗ để viết rồi (`salesPrompt` + khối dùng chung). Thêm trường
là đẻ nguồn sự thật thứ hai cho cùng một việc.

## ③ Pathspec

```
ops/bin/do-lo-hong-kb.mjs
test/bh5-lo-hong-kb.test.js
ops/bin/nghiem-thu/bh5.sh
docs/thi-cong/nhat-ky/phieu-bh5.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §8 việc người + §9 + §10
```

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh5.sh`

```bash
node --test test/bh5-lo-hong-kb.test.js     # kỳ vọng: 0 fail, ≥8 ca
node ops/bin/do-lo-hong-kb.mjs --json > /tmp/bh5.json

# G1 · page có "pawnable/18K/certificate" trong salesPrompt + khách hỏi thật-giả → CÓ
# G2 · page KHÔNG có chữ nào về size + khách hỏi size → THIẾU (đây là ca đẻ việc người)
# G3 · nhóm không ai hỏi → KHÔNG AI HỎI, không vào danh sách việc
# G4 · page không có trong mẫu → bỏ qua, KHÔNG báo THIẾU (không đủ bằng chứng thì im)
# G5 · chạy 2 lần trên cùng mẫu → kết quả GIỐNG HỆT (tất định, không random)

# Kết quả phải TRẢ LỜI ĐƯỢC câu này, in ra để tổng đọc:
#   "page nào đang bật AI, khách hỏi nhóm X ≥5 lần, mà KB không có chữ nào?"
```

## ⑤ Test chạm nhánh thật

- Chạy trên `mau-duong-ban.json` thật + `kb-overrides.json` thật (77 page).
- Nhánh KHÔNG chạm được: khối dùng chung từ Google Sheet (máy này không có `sheet.json`)
  ⇒ công cụ phải **nói ra** là đang thiếu nguồn đó, không âm thầm báo THIẾU cho mọi page.
  Ca G6 khoá đúng hành vi này.

## ⑥ Ngoài phạm vi

- Viết nội dung tư vấn — **việc người**, đẩy §8.
- Bật kỹ năng theo nhóm sản phẩm trong CSDL v3 (`ky_nang`, `rap-prompt.js`) — chờ C5
  (khối sản phẩm v3 rỗng vì `san_pham.page_id` NULL). Ghi §9, trỏ RF-15 đã có.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "RF-15\|goi_gia" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | head -3
1148:  - NÊN RF-15: `doc-danh-muc` không ghi `san_pham.page_id` ⇒ mọi `goi_gia` POS vô hình
1639:  RF-21 advisory lock hội thoại (đảo-vá 3/3 ra 2 đơn) · RF-15 san_pham.page_id; cổng
1977:  khai cùng một sự thật ở hai chỗ, vì `san_pham.page_id` đã nối rồi». Tiền đề sai
```

**Quan hệ: trùng-nợ** với RF-15 ở đúng một điểm — cả hai chạm câu hỏi «kiến thức của page
tới từ đâu». BH5 **né** nợ đó bằng cách đọc KB v2 (`kb.js`) thay vì bảng `ky_nang` của v3,
nên không chặn nhau và không sửa cùng file. Trỏ ngược lại RF-15 trong §6.
