# PHIẾU RP2 — Ba núm ẩn chạm pilot: khối Chính sách · FAQ · Phản đối vào đường CSDL · v3 tôn trọng `HUMAN_TAKEOVER=0` · ngưỡng «ấm» = 1

**Base:** `ĐẶT-LÚC-PHÁT` (SAU RP1 — cùng `src/chat/rap-prompt.js`) · **Làn:** 🟥 (thứ bot nói + khi nào bot im với khách)
**Nguồn:** người quyết 08/10 (AskUserQuestion, sau soát «cấu hình ngầm» `scratchpad/cau-hinh-ngam.md`): ngân sách «Hạ ngưỡng lên "ấm"» · tiếp quản «Tắt ở v3
theo biến cũ» · chính sách «Nối vào trước pilot» · sổ §5j (điều kiện pilot bước ③)
**Đụng bộ não:** CÓ — `src/lead-score.js` (trong danh sách `NAO` của `_chan1.sh`): CHỈ đổi hằng `AM_THRESHOLD` 2 → 1 (+ chú thích lý do). Không đụng tệp bộ não khác.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

1. **Khối Chính sách · FAQ · Phản đối** (màn `/khoi-chung` → `v3/src/ui/van-hanh/router-anh.js:192-203` → `src/products/khoi-chung.js` → tệp `kb-chung.json` qua
   `src/kb.js#datKhoiChung`) chỉ được đọc ở đường cờ TẮT (`kb.js:391-413#sharedTuTep` → `getKBForPage`). Nhánh cờ BẬT của `src/chat/rap-prompt.js#rapKb` không có khối
   này ⇒ bật `V3_RAP_PROMPT_BAT=1` là model mất thời gian giao hàng, đổi trả, bảo hành, kịch bản gỡ phản đối; CORE vẫn dặn «xử lý phản đối theo mục OBJECTION HANDLING
   trong KB» (`prompts.js:112`), «chỉ nêu khung giao hàng có trong KB» (`:149`). Prod `kb-chung.json`: 4 chính sách · 3 FAQ · 4 phản đối.
2. **Nhận diện sale tiếp quản** — `src/chat/human.js#nhanDienSale` (gọi ở `src/queue/worker.js:283` và `src/queue/nap.js:689`) chạy KHÔNG qua cờ nào ⇒ `HUMAN_TAKEOVER=0`
   trong `.env` prod (chú thích «🔴 TẮT — M05 nhận nhầm người thật 30,2%») vô tác dụng ở v3; tin page trông như người gõ (vd câu chào Botcake ngoài sổ mẫu 56 mẫu
   `botcake-templates.json` 11/08) ⇒ hội thoại `HANDOFF/SALE` vĩnh viễn, bot im. Đường v1 (`src/conv-owner.js:27`) đọc `!== '0'`.
3. **Ngân sách lượt** — `src/lead-score.js:56` `AM_THRESHOLD = 2` (đặt 10/08 khi giả định Fast Lane trả giá/ship 0 đồng — prod `FASTLANE_TEMPLATES=0` từ 11/08) ⇒ khách
   LẠNH (điểm < 2) chỉ 1 lượt/24h rồi bàn giao vĩnh viễn (`trang-thai.js:131-133`).

## ② Hợp đồng vào / ra

1. `rapKb` nhánh cờ BẬT thêm khối ba mục dùng chung VÀO `text`, lấy đúng hàm của đường cũ (`kb.js#sharedTuTep` — export nếu chưa; cùng một nội dung ⇒ cùng đoạn chữ
   từng ký tự với đường cũ). Đặt vị trí khối như đường cũ (sau khối sản phẩm, trước kỹ năng — đọc `kb.js` để khớp). Tệp vắng / ba khối rỗng ⇒ không chèn tiêu đề trơ.
   Thêm nguồn thiếu vào `nguon_thieu` nếu có hằng tương ứng (không bắt buộc).
2. `nhanDienSale` (`src/chat/human.js`): `process.env.HUMAN_TAKEOVER === '0'` ⇒ trả `false` ngay (không đổi hội thoại, không đọc lịch sử thêm). Vắng / khác `'0'` ⇒ hành vi
   như hiện nay (giữ luật «vắng = như cũ», cùng nghĩa với `conv-owner.js:27`). Nhường TỪNG LƯỢT khi tin cuối là của page (`gomCumTinKhach`) GIỮ NGUYÊN. Khai biến vào
   `docs/v3/ban-giao/bien-moi-truong-v3.md` (đã có ở prod: `=0`).
3. `AM_THRESHOLD = 1` (`lead-score.js:56`), sửa chú thích ngay trên (nêu: người quyết 08/10, lý do Fast Lane giá/ship tắt từ 11/08). Không đổi bảng điểm, trần các nhóm.

## ③ File được đụng

```
src/chat/rap-prompt.js
src/kb.js
src/chat/human.js
src/lead-score.js
docs/v3/ban-giao/bien-moi-truong-v3.md
test/rp2-*.test.mjs
ops/bin/nghiem-thu/rp2.sh
```
`kb.js`: CHỈ export hàm khối chung (không đổi hành vi). Ca cũ ghim ngưỡng 2 (vd `test/*lead*`, `test/l2-m2-*`) hoặc ghim `rapKb` không có khối chung mà nằm ngoài ③ ⇒ DỪNG,
báo tổng kèm danh sách (đừng nới luật).

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/rp2.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_rp2_p$$"`; `V3_RAP_PROMPT_BAT=1` / `HUMAN_TAKEOVER` CHỈ trong env tiến trình ca; `kb-chung.json` dựng trong thư mục tạm (đường tệp tiêm qua env/biến có sẵn — không ghi đè tệp thật); `grep -E` không `rg`; đảo-vá trên BẢN SAO tạm)

1. `kb-chung` có 2 chính sách · 1 FAQ · 1 phản đối ⇒ `rapKb` cờ bật: `text` chứa đúng đoạn chữ mà `getKBForPage` (cờ tắt) dựng cho cùng nội dung (so từng ký tự đoạn khối);
   tệp vắng ⇒ không có tiêu đề trơ.
2. `HUMAN_TAKEOVER=0`: lịch sử có tin page «ok dear» sau lượt AI (trông như người) ⇒ `nhanDienSale` trả `false`, hội thoại vẫn `AI`; đi worker thật ⇒ bot trả lời (1 POST).
   Vắng biến ⇒ như cũ (hội thoại `HANDOFF/SALE`). Tin cuối là của page ⇒ worker vẫn nhường lượt đó (0 POST) ở cả hai trạng thái biến.
3. `turnBudget`: khách điểm 1 (hỏi giá) ⇒ nhóm ẤM (3 lượt); điểm 0 ⇒ LẠNH 1 lượt; các nhóm khác không đổi.
4. Đảo-vá: bỏ khối chung ⇒ 1 đỏ · bỏ cổng biến ⇒ 2 (vế `=0`) đỏ · cổng đảo nghĩa (vắng = tắt) ⇒ 2 (vế vắng) đỏ · ngưỡng về 2 ⇒ 3 đỏ.
5. Cổng / bộ ca cũ xanh (rc tách dòng): `rp1.sh` · `gl3b.sh` · bộ ca có `rapKb`/`lead-score`/`nhanDienSale` (`grep -rlE "rapKb|lead-score|turnBudget|nhanDienSale|AM_THRESHOLD" test v3/test`) ·
   `test/bh1-gia-va-cua-chot.test.js` · `test/phase1-chat-flow.test.js`. `npm test -- --test-force-exit` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/rp2-*.test.mjs` (khối chung ở đường CSDL · cổng `HUMAN_TAKEOVER` hai chiều · ngưỡng ấm).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Công tắc nhận diện sale / nhường Botcake THEO PAGE trên giao diện (cột `botcake_tat` chưa được đọc) · màn sửa sổ mẫu máy Botcake · hiện «khách lạnh có N lượt» trên màn Page & Bot ·
dòng «Thị trường · Ngành hàng» + tách vai «OFW / Tagalog / AED-SAR» khỏi CORE (bắt buộc trước page ngoài GCC hoặc khách không phải người Philippines) · cổng bật page đòi kịch bản
LIVE + thẻ «AI back Sale» + kiến thức sản phẩm (`operations.js:41-80`) · lớp 0 đồng «Câu bot sẽ trả lời» không được gửi · kỹ năng sửa nội dung trên màn.

## ⑦ ĐÃ TRA CHƯA

```
$ grep -n "sharedTuTep\|kb-chung" src/chat/rap-prompt.js   → 0 dòng
$ grep -n "HUMAN_TAKEOVER" src/chat/human.js src/queue/*.js  → 0 dòng
```
Quan hệ: **mới** (soát cấu hình ngầm 08/10 A1 · A3 · B4/C1).
