# PHIẾU RP2 — Hai núm ẩn chạm pilot: khối Chính sách · FAQ · Phản đối vào đường CSDL (theo team) · chấm điểm lead cả tin khách đã nhường Botcake + ngưỡng «ấm» = 1

**Base:** `ĐẶT-LÚC-PHÁT` (SAU RP1 — cùng `src/chat/rap-prompt.js` / `src/chat/handler-v3.js`) · **Làn:** 🟥 (thứ bot nói + khi nào bot thôi trả lời khách)
**Nguồn:** người quyết 08/10 (sau soát «cấu hình ngầm» `scratchpad/cau-hinh-ngam.md` + review (a) RP2 vòng 1 `scratchpad/review-a-rp2.md`): chính sách «Nối vào trước pilot» ·
tiếp quản «GIỮ BẬT như hiện tại» (tổng trình lại sau review: đo 22/09 trên mã v3 4/56 khoá đều là sale thật; tắt ⇒ bot nói đè sale — ĐÃ BỎ khỏi phiếu) · ngân sách
«Chấm điểm cả tin đã nhường Botcake» (+ ngưỡng ấm 1) · sổ §5j (điều kiện pilot bước ③)
**Đụng bộ não:** CÓ — `src/lead-score.js` (danh sách `NAO`): CHỈ hằng `AM_THRESHOLD` 2 → 1 (+ chú thích). ④ khai phép đo chi phí (N8).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

1. **Khối Chính sách · FAQ · Phản đối** (màn `/khoi-chung`) chỉ tới bot ở đường cờ TẮT (`kb.js:391-413#sharedTuTep` đọc tệp `kb-chung.json` toàn hệ). Nhánh cờ BẬT của
   `rap-prompt.js#rapKb` không có ⇒ mất thời gian giao, đổi trả, bảo hành, gỡ phản đối (prod 4 · 3 · 4 mục). Đường CSDL có `teamId` và bảng `khoi_dung_chung` theo team
   (`src/products/khoi-chung.js:36-50#docKhoiChung`).
2. **Điểm lead** chỉ chấm trong handler trên cụm tin của lượt (`handler-v3.js:408-412`). Botcake trả lời câu giá ⇒ worker NHƯỜNG trước handler (`worker.js:299-325`), cụm sau chỉ
   gồm tin SAU tin page cuối (`nap.js:129-146`) ⇒ «how much?» không bao giờ được chấm. Mẫu 719 hội thoại: 248/282 (88%) hội thoại chạm 1 điểm là nhờ `price`. Hạ
   `AM_THRESHOLD` đơn thuần không đổi gì trên page có Botcake (review RV-N1 kịch bản A).

## ② Hợp đồng vào / ra

1. **Khối chung theo team**: `rapKb` cờ BẬT thêm khối ba mục vào `text`, đọc `docKhoiChung(pool, teamId)` (bảng `khoi_dung_chung` — cùng nguồn màn `/khoi-chung` ghi) rồi dựng
   bằng ĐÚNG hàm dựng của đường cũ (`buildShared` sau `sachKhoiChung`) ⇒ cùng nội dung ra cùng đoạn chữ từng ký tự. Team chưa có ⇒ không chèn tiêu đề trơ. Vị trí khối như
   đường cũ. KHÔNG thêm `nguon_thieu` (3 neo cũ ngoài ③ ghim mảng đó — N5).
2. **Chấm điểm cả tin đã nhường**: điểm lead tính trên MỌI tin khách kể từ mốc chấm trước (không chỉ cụm sau tin page cuối) — đề nghị: nhánh nhường của worker
   (`ketQua NHUONG_PAGE`) chấm cụm tin khách vừa được Botcake/sale trả lời rồi ghi `diem_lead` (không gọi model, không gửi); hoặc handler chấm trên `history` từ mốc. Giữ
   «mỗi tín hiệu tính một lần»; mốc chấm lưu trong `diem_lead` để không chấm lại chuỗi tin cũ. Nhường lượt vẫn KHÔNG gửi gì.
3. **`AM_THRESHOLD = 1`** (`lead-score.js:56`) + sửa chú thích (người quyết 08/10; Fast Lane giá/ship tắt từ 11/08; điểm nay tính cả tin đã nhường).
4. `docs/v3/ban-giao/bien-moi-truong-v3.md`: ghi rõ `HUMAN_TAKEOVER` chỉ có tác dụng ở mã cũ (`conv-owner.js`); v3 LUÔN bật nhận diện sale tiếp quản (`chat/human.js`) — để `.env` prod
   `HUMAN_TAKEOVER=0` thôi gây hiểu nhầm.

## ③ File được đụng

```
src/chat/rap-prompt.js
src/products/khoi-chung.js
src/kb.js
src/queue/worker.js
src/chat/handler-v3.js
src/chat/ngan-sach-luot.js
src/lead-score.js
docs/v3/ban-giao/bien-moi-truong-v3.md
test/lead-score.test.mjs
test/phase1-chat-flow.test.js
test/rp2-*.test.mjs
ops/bin/nghiem-thu/rp2.sh
ops/bin/nghiem-thu/bh7.sh
```
`khoi-chung.js` / `kb.js`: CHỈ export hàm đọc/dựng (không đổi hành vi). `worker.js` / `handler-v3.js` / `ngan-sach-luot.js`: CHỈ phần chấm điểm (thợ chọn một chỗ, ghi lý do).
`test/lead-score.test.mjs:90-96` · `test/phase1-chat-flow.test.js:102-110` · `bh7.sh`: CHỈ đổi kỳ vọng theo ngưỡng 1 (đo review N1 — 4 ca + cổng bh7 đỏ khi vá). Neo đảo-vá
`gl3*.sh`/`gl4.sh`/`rp1.sh` không được đụng — buộc phải ⇒ DỪNG báo tổng. Ca cũ đỏ ngoài danh sách ⇒ DỪNG, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/rp2.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_rp2_p$$"`; `V3_RAP_PROMPT_BAT=1` CHỈ trong env tiến trình ca; fetch giả, KHÔNG mạng; mở van gửi CHỈ trong env ca; chạy qua `test/_an-toan.mjs`; `grep -E` không `rg`; đảo-vá trên BẢN SAO tạm)

1. `khoi_dung_chung` team T có «Giao hàng: 2–4 ngày» · FAQ · phản đối ⇒ `rapKb` cờ bật (page team T) chứa ĐÚNG chữ cụ thể đó (đòi chuỗi cụ thể, không `includes('')`) và trùng
   từng ký tự với đoạn đường cũ dựng cho cùng nội dung; page team khác (T2 chưa có khối) ⇒ KHÔNG có khối của T; T chưa có ⇒ không tiêu đề trơ.
2. Ghi khối qua cửa màn (`luuKhoiChung`) rồi gọi `rapKb` lượt sau trong CÙNG tiến trình khác (mô phỏng giao diện ghi, worker đọc) ⇒ thấy ngay, không khởi động lại.
3. **Kịch bản A đi worker thật** (review RV-N1): page có Botcake; khách «how much po?» (Botcake trả giá ⇒ nhường) → «what is it for?» → «ok and for my mother?» ⇒ lượt 3 VẪN được bot
   trả lời (không `ngan_sach_het:LANH`), hội thoại còn `AI`; điểm có tín hiệu `price`. Kịch bản B (bot tự thấy câu giá) như cũ. Mỗi tín hiệu chỉ tính một lần (chạy lại cùng
   lịch sử ⇒ điểm không tăng).
4. `turnBudget`: điểm 1 ⇒ ẤM 3 lượt; điểm 0 ⇒ LẠNH 1; nhóm khác không đổi.
5. **Đo chi phí (N8 — bắt buộc vì đụng bộ não)**: chạy mô phỏng ngân sách trên mẫu 719 hội thoại có sẵn (công cụ/mẫu review đã dùng: `scratchpad/rp2-tools/`) trước/sau ⇒ in
   số lượt gọi model và số bàn giao vì hết ngân sách; ghi vào nhật ký (không có ngưỡng đạt — để người quyết thấy số).
6. Đảo-vá: bỏ khối chung ⇒ 1 đỏ · đọc tệp toàn hệ thay vì theo team ⇒ 1 (team khác) đỏ · chỉ chấm cụm ⇒ 3 đỏ · chấm lặp tín hiệu ⇒ 3 (một lần) đỏ · ngưỡng về 2 ⇒ 4 đỏ.
7. Cổng / bộ ca cũ xanh (rc tách dòng): `rp1.sh` · `gl3b.sh` · `gl4.sh` · `bh7.sh` (kỳ vọng mới) · bộ ca có `rapKb` / `turnBudget` / `lead-score` / `khoi-chung` (`grep -rlE "rapKb|turnBudget|lead-score|khoi-chung|AM_THRESHOLD" test v3/test`) ·
   `test/phase1-chat-flow.test.js` · `test/bh1-gia-va-cua-chot.test.js`. `npm test -- --test-force-exit` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/rp2-*.test.mjs` (khối chung theo team + liên tiến trình · kịch bản A/B worker thật · một lần mỗi tín hiệu · ngưỡng ấm · đo chi phí).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Công tắc nhận diện sale / nhường Botcake THEO PAGE (cột `botcake_tat` chưa được đọc) · màn sửa sổ mẫu máy Botcake · «khách lạnh có N lượt» trên màn Page & Bot · dòng «Thị trường ·
Ngành hàng» + tách vai OFW/Tagalog khỏi CORE (trước page ngoài GCC) · cổng bật page đòi kịch bản LIVE + thẻ «AI back Sale» + kiến thức sản phẩm · lớp 0 đồng không gửi · kỹ năng sửa
nội dung · `V3_SHEET_CHI_DANH_BA` có thể vắng trên worker ⇒ đường lùi cờ RAP lấy ba khối từ Google Sheet (đo trước mở van — ⑦b).

## ⑦ ĐÃ TRA CHƯA · ⑦b đo trước mở van (tổng)

```
$ grep -n "khoi_dung_chung\|docKhoiChung" src/chat/rap-prompt.js → 0 dòng
```
⑦b: `V3_SHEET_CHI_DANH_BA` trên worker v3 (G1) · H-GL đọc lại 11 mục `/khoi-chung` trước mở van (lời hứa «2–4 ngày», «hoàn tiền 30 ngày», «đổi trả 7 ngày» thành lời bot nói — N7).
Quan hệ: **mới** (soát cấu hình ngầm A1 · B4/C1) · review (a) vòng 1 C1 (bỏ khối tắt tiếp quản theo người quyết) · C2 (chấm cả tin nhường).
