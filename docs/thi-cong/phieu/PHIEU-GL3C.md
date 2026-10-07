# PHIẾU GL3c — Pancake lỗi KÉO DÀI không được thành «bot câm im lặng»: danh sách hội thoại lỗi liên tục ⇒ ngắt page · lỗi kênh khi đọc lịch sử ở bộ nạp đếm vào GL4 · hội thoại lỗi DỮ LIỆU bền ⇒ giao sale CÓ việc

**Base:** `ff3526a` · **Làn:** 🟥 (đường bot trả lời khách + bàn giao sale; sai một chiều là khách bị bỏ không ai biết, sai chiều kia là ngập việc / ngắt oan)
**Nguồn:** README nguyên tắc 9 · 13 · nợ **N-GL3B-NAP-LOI-BEN** · **N-GL3B-CONV-NUOT-LOI** · **N-GL4-NAP-KHONG-DEM** · **N-GL3B-WEBHOOK-MAPPING** (sổ §9) ·
review (a) 07/10 TRẢ VỀ (2 CHẶN · 6 NÊN — bản này viết lại theo, mục «Sửa sau review (a)» cuối ②) · sổ §5j (GL3c trước page thứ hai)
**Con số người quyết chốt 07/10 («ok 2 phút»):** `T_NGAT_DS = 2′` (danh sách hội thoại lỗi LIÊN TỤC bao lâu thì ngắt page) · tổng đặt (hằng có tên):
`LUOT_LOI_GIAO_SALE = 3` (hội thoại lỗi DỮ LIỆU bền: lượt lỗi thứ 3 ≈ giây 90 — gần mốc ~45 s của GL3b).
**Đụng bộ não:** không.
**Đổi hợp đồng cửa đã bàn giao:** CÓ (nhẹ) — `docHoiThoai` nói được lỗi qua tham số ra (không đổi giá trị trả mảng); `LoiDocLichSu` ở tra mapping webhook mang
câu riêng. Sửa `docs/v3/ban-giao/cua-messenger-v1.md` cùng commit (sửa mã cho khớp ý đồ có sẵn — nguyên tắc 13; không CR).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

1. **Danh sách hội thoại nuốt lỗi.** `pancake.js#pkGetConversations` (`:342-345`) trả `j.conversations || []` ⇒ Pancake sập / quá hạn / 121 ⇒ bộ nạp
   (`nap.js:389` → `messenger/index.js:154-158#docHoiThoai`) thấy «0 hội thoại» như không ai nhắn; đèn GL4 không bao giờ đỏ (`kho-suc-khoe.js:519-521,536` tự khai).
2. **Lỗi KÊNH khi đọc lịch sử ở bộ nạp không đếm.** Danh sách đọc được mà `/messages` lỗi kênh ⇒ bộ nạp chỉ lùi (`nap.js:511-526`), không gọi GL4 — đo review
   RV6: page không ngắt, 3/3 hội thoại cùng leo lùi. Bộ ca GL4 chạy nạp rồi xử TUẦN TỰ nên không thấy (prod: 1 vòng nạp + 3 vòng xử xen nhau).
3. **Hội thoại lỗi DỮ LIỆU bền** («Thiếu mã khách hàng» …): bộ nạp lùi mãi (30 s·2ⁿ, trần 5′), không bao giờ thành việc. `lan` còn bị đặt lại về 1 sau mỗi quãng
   ≥ 5′ không đọc (`nap.js:519`) — page ngắt 30′ là về 1 ⇒ không bao giờ tới mốc giao.
4. **Page webhook**: tra mapping qua `docHoiThoai` (`worker.js:211`) nuốt lỗi ⇒ `LoiChoMappingPancake` ⇒ `banGiaoLoi` cũ không việc. Prod 0 page webhook (07/10).

## ② Hợp đồng vào / ra

1. **Cửa danh sách nói lỗi — KHÔNG thêm export mới** (export mới làm đỏ `gl4.sh` ④b + mock `l2-m1-nhac-truong`): `pkGetConversations(pageId, soLoi = null)` GIỮ
   NGUYÊN giá trị trả (mảng), khi có `soLoi` thì điền `soLoi.{ ok, loi, capKenh }` (lỗi = mọi trường hợp không có mảng `conversations`). `messenger/index.js#docHoiThoai`
   truyền `soLoi`; `ok:false` ⇒ ném `LoiDocHoiThoai` (khuôn `loi.js`, mang `loi`, `capKenh`). Với DANH SÁCH, MỌI `ok:false` là lỗi cấp page (`capKenh` chỉ để chọn câu).
   Tham số tiêm `getConversations` trả MẢNG = đọc được. `src/orders/legacy.js` gọi không `soLoi` ⇒ như cũ.
2. **Ngắt theo THỜI GIAN lỗi danh sách liên tục** (thay «2 vòng»): bộ nạp giữ trong RAM theo page `dsLoiTu` (lúc bắt đầu chuỗi lỗi, đồng hồ `dongHo` của bộ nạp).
   Danh sách OK ⇒ xoá `dsLoiTu` (KHÔNG gọi `ghiDocTot` — đọc được danh sách không chứng minh đường lịch sử chạy). Lỗi liên tục ≥ `T_NGAT_DS` ⇒ hàm MỚI
   `ngat-page.js#ngatPage(pool, { teamId, pageId, kieu:'doc', lyDo })` (UPDATE có điều kiện «chưa ngắt», ghi `nhat_ky page_ngat_kenh`, cập nhật bộ nhớ chung) — KHÔNG
   đụng `ghiLoiKenh` và neo `ngat-page.js:59` (`gl4.sh` ⑤c). Chập < `T_NGAT_DS` ⇒ chỉ in log «N page lỗi danh sách» (MỘT dòng tổng mỗi vòng, `inLuot`).
3. **Bộ nạp đếm lỗi KÊNH khi đọc lịch sử**: `LoiDocLichSu` có `capKenh:true` ở bộ nạp ⇒ `ghiLoiKenh(kieu:'doc')` với khoá theo HỘI THOẠI khác nhau, không trùng không
   gian id tin (vd `tinId = -hoi_thoai.id`); chạy ngoài giao dịch (pool riêng, như GL4). Lỗi kênh KHÔNG leo tới mốc giao sale (việc của GL4).
4. **Hội thoại lỗi DỮ LIỆU bền ⇒ giao sale CÓ việc**: chỉ `capKenh:false` mới đếm `luot` trong `luiDocTin` (thêm trường `tu` = lần lỗi đầu). Lượt lỗi thứ
   `LUOT_LOI_GIAO_SALE` ⇒ (client riêng, MỘT giao dịch) `hoi_thoai` → `SALE/HANDOFF` `ly_do_cuoi='doc_lich_su_loi_ben'` CHỈ khi `AI` + GREET/QUALIFY/SELLING + page
   `bot_ai_bat`; chèn ĐÚNG 1 `viec_can_xu_ly` qua hàm chèn việc của worker (export `chenViec` tại `worker.js`, `nap.js` dùng `await import("./worker.js")` — tránh vòng
   import tĩnh, giữ neo `gl3b.sh` ⑤b); `ly_do_day` nói thời gian THẬT đã lỗi (từ `tu`), câu lỗi, và mốc THÔ «khách nhắn lần cuối» (`last_customer_interactive_at`,
   không parse); `nhat_ky`; ghi mốc, xoá khỏi `luiDocTin`. UPDATE 0 dòng ⇒ chỉ ghi mốc. **Không đặt lại `luot`/`tu` vì quãng page bị NGẮT**: chỉ đặt lại khi hội thoại
   đọc OK hoặc rời đi (thẻ chặn / page nói cuối). Dòng `nap.js:519` là neo `gl3b.sh` ⑤d/⑤o — viết điều kiện ở dòng khác; buộc phải đụng thì đổi chuỗi neo (③), giữ ý.
   `luiDocTin` trong RAM — restart đặt lại (chấp nhận, ghi rõ; mốc thô trong `ly_do_day` giúp sale nhận ra tin cũ).
5. **Worker page webhook**: khối tra mapping bắt `LoiDocHoiThoai` rồi NÉM LẠI `LoiDocLichSu` (giữ `capKenh`, câu «Pancake không trả danh sách hội thoại …») ⇒ đi nhánh
   GL3b (lùi 15/30 s, hết lượt giao sale CÓ việc, tin `xong`) + đếm GL4 theo `capKenh` như cũ — KHÔNG sửa dòng neo `worker.js:333` (`gl4.sh` ⑤q). Đọc được mà không mapping
   duy nhất ⇒ vẫn `LoiChoMappingPancake`.
6. **Đèn**: sửa câu `kho-suc-khoe.js:519-521,536` («không phủ lỗi ở bước nạp» ⇒ nói đúng phần đã phủ: danh sách lỗi liên tục ≥ T ⇒ ngắt; lỗi kênh khi đọc lịch sử ⇒ đếm).
   CHỈ đổi câu.

**Sửa sau review (a) 07/10:** C1 → ② 2 (theo thời gian liên tục, hàm `ngatPage` riêng, bỏ `ghiDocTot` ở nạp) · C2 → ② 3/4 (đếm lỗi kênh ở bộ nạp theo hội thoại; chỉ lỗi dữ
liệu leo tới giao) · N1 → `LUOT_LOI_GIAO_SALE` + `tu` · N2 → ② 4 (không đặt lại vì quãng ngắt) · N3 → ② 4 (mốc thô) · N4 → ② 1/4/5/6 + ③ · N5 → ④ · N6 → ② 1.

**Sửa sau review (a) VÒNG 2 07/10 (kết luận PHÁT — 4 NÊN, chép bắt buộc):**
- R2-N1: page vào ngắt (bất kỳ nguồn nào) ⇒ XOÁ `dsLoiTu` của page đó; mở lại phải đủ `T_NGAT_DS` lỗi liên tục mới ngắt lại (luật GL4 «mở rồi phải đủ ngưỡng»). `quenMoc` xoá cả `dsLoiTu`.
- R2-N2: «một khách, hai khoá» (worker đếm theo `tinId`, bộ nạp theo `-hoi_thoai.id`) ⇒ khách đang nhắn dở + Pancake chập 15–30 s là page ngắt. ƯU TIÊN: lỗi ĐỌC đếm theo
  HỘI THOẠI ở CẢ worker lẫn bộ nạp (khoá `-hoi_thoai.id`; lỗi GỬI giữ theo tin) — nếu đụng neo `gl4.sh` thì DỪNG báo tổng; cách thay thế: giữ hai khoá, ghi rõ chấp nhận +
  phép ④1e đo đúng cảnh đó. Bộ nạp đọc lịch sử OK ⇒ gọi `ghiDocTot` (đọc lịch sử thật chạy) — ghi rõ trong nhật ký.
- R2-N3: KHÔNG chép nguyên văn khuôn `ghiLoiKenh` / `pkDocTin` (làm neo `gl4.sh` ⑤b/⑤n trong `ngat-page.js` và `gl3b.sh` ⑤v/⑤w trong `pancake.js` xuất hiện 2 lần ⇒ cổng đỏ).
  `docHoiThoai` chỉ ném khi `soLoi.ok === false` (mock trả `[]` không điền `soLoi` vẫn là đọc được).
- R2-N4: ④ «qua 30′» làm bằng đồng hồ CSDL (`UPDATE page SET ngat_den = now() - interval '1 second'`) rồi chạy mở lại THẬT (phép 3b); mỗi lần gọi `napTuPoll` trực tiếp
  khẳng định `r.mo === true` (chống xanh giả khi van/nguồn đóng). Thêm ④1d (mở lại + 1 vòng lỗi ⇒ KHÔNG ngắt lại).

## ③ File được đụng

```
src/pancake.js
src/channels/messenger/index.js
src/channels/messenger/loi.js
docs/v3/ban-giao/cua-messenger-v1.md
src/queue/nap.js
src/queue/chay-worker.js
src/queue/worker.js
src/queue/ngat-page.js
v3/src/ui/suc-khoe/kho-suc-khoe.js
ops/bin/nghiem-thu/gl3b.sh
test/gl3c-*.test.mjs
ops/bin/nghiem-thu/gl3c.sh
```
`kho-suc-khoe.js`: CHỈ câu ② 6. `gl3b.sh`: CHỈ đổi chuỗi neo nếu buộc phải sửa dòng neo, giữ ý đột biến. Neo `gl4.sh` (⑤c `ngat-page.js:59`, ⑤q `worker.js:333`,
④b danh sách export) KHÔNG được đụng — buộc phải ⇒ DỪNG báo tổng. Ca cũ đỏ ngoài ③ ⇒ DỪNG, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl3c.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_gl3c_p$$"`; fetch giả, KHÔNG mạng; ≥2 token; mở van gửi CHỈ trong env tiến trình ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

⚠️ Cửa thật (`napTuPoll` → `docHoiThoai` → `pkGetConversations` → `pkFetchPage` → fetch giả; worker `chayMotVong` thật). Cấm tiêm `docHoiThoai`/`docTin`. Phải có phép
CHẠY XEN (gọi `chayMotVong` và `napTuPoll` đan nhau như prod), không chỉ `motLuot` tuần tự. Mọi phép phủ định kèm «đã chạm»: đếm đúng số GET `…/conversations` /
`…/messages` cho đúng page/hội thoại; `ket.nap.mo === true`. Đối chứng dương: page Q (danh sách OK) được fetch trong CÙNG vòng P bị bỏ.

1. Danh sách lỗi liên tục ≥ `T_NGAT_DS` (đồng hồ `dongHo`) ⇒ page ngắt `doc`, đèn `ngat_kenh` ĐỎ, vòng sau 0 fetch cho P, Q vẫn fetch; không mốc nào ghi.
1b. Danh sách lỗi 2 vòng liền (12 s) rồi lành ⇒ KHÔNG ngắt; tin vào hàng bình thường; log có «1 page lỗi danh sách».
1c. Xen: worker tin T lỗi kênh → `napTuPoll` danh sách lỗi → worker T lỗi lần nữa (cùng tin) ⇒ KHÔNG ngắt (cùng tin = 1 lỗi; danh sách lỗi không đếm theo vòng).
2. `/conversations` OK + `/messages` lỗi KÊNH ở 2 hội thoại ⇒ ngắt `doc`, 0 việc, không hội thoại nào leo lượt giao.
2b. Xen: worker A lỗi kênh → `napTuPoll` (danh sách OK) → worker B lỗi kênh ⇒ NGẮT (danh sách OK không xoá chuỗi lỗi đọc).
3. Hội thoại X lỗi DỮ LIỆU liên tục, hội thoại khác OK ⇒ page KHÔNG ngắt; lượt 1–2 chưa giao; lượt 3 ⇒ X `SALE/HANDOFF` `doc_lich_su_loi_ben`, ĐÚNG 1 việc, `ly_do_day`
   nói đúng thời gian đã lỗi + mốc thô khách nhắn lần cuối; `nhat_ky` 1 dòng; mốc ghi; không đọc X nữa (GET `/messages` của X dừng đúng ở lượt 3); «trả AI» THÀNH.
3b. X lỗi dữ liệu tới lượt 2 → page ngắt 30′ (bởi hội thoại khác) → mở → X lỗi tiếp ⇒ được giao ở lượt 3 (đếm gộp qua quãng ngắt).
4. Như 3 nhưng X do SALE giữ ⇒ không việc mới, mốc ghi.
5. Webhook: `docHoiThoai` lỗi ở tra mapping ⇒ lùi 15/30 s, hết lượt giao sale CÓ việc, «trả AI» THÀNH, không `banGiaoLoi`; đọc được mà không mapping duy nhất ⇒ `LoiChoMappingPancake`.
6. `pkGetConversations` gọi không `soLoi` (đường `legacy.js`) ⇒ hành vi cũ.
7. Đảo-vá: cửa nuốt lỗi ⇒ 1 đỏ · đếm mỗi vòng ⇒ 1b/1c đỏ · danh sách OK gọi `ghiDocTot` ⇒ 2b đỏ · không đếm lỗi kênh ở nạp ⇒ 2 đỏ · giao cả lỗi kênh ⇒ 2 đỏ · bỏ giao lỗi bền ⇒
   3 đỏ · giao ở lượt 1 ⇒ 3 (vế chưa giao) đỏ · đặt lại `luot` sau quãng ngắt ⇒ 3b đỏ · giao khi sale giữ ⇒ 4 đỏ · webhook về `banGiaoLoi` ⇒ 5 đỏ.
8. Cổng cũ xanh (rc tách dòng): `gl4.sh` · `gl3b.sh` (đảo-vá ⑤d/⑤o/⑤b còn đỏ đúng) · `gl3.sh` · bộ ca `test/l1-m2-cua.test.js` · `test/l2-m1-hang-doi.test.js` ·
   `test/l2-m1-nhac-truong.test.js` · `test/va-p7-chay-worker.test.js` · `test/phase1-chat-flow.test.js` · `test/gl3b-*.test.mjs` · `test/gl4-*.test.mjs` ·
   `v3/test/b/suc-khoe.test.mjs`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl3c-*.test.mjs` (danh sách lỗi theo thời gian · xen nạp/xử · lỗi kênh ở nạp đếm GL4 · lỗi dữ liệu bền giao ở lượt 3 + qua quãng ngắt · sale đã giữ · webhook · legacy).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Page ngắt lặp mãi (Pancake sập dài / ghim token thiếu ghế 121) ⇒ không khách nào được giao — GL6 cảnh báo + người quyết · webhook «đọc được mà không mapping duy nhất» vẫn
`banGiaoLoi` không việc (0 page webhook) · lỗi dữ liệu toàn hệ (Pancake đổi hình dữ liệu) ⇒ mọi khách ra việc, không tín hiệu cấp page · tin tới sau khi bộ nạp đã giao chặn
«trả AI» (N-GL3B-TRA-AI-CHAN-GUARD) · «Thiếu mã khách hàng» đi cùng `custId` rỗng thì giao ngay lượt 1 (đo khi mở van) · `luiDocTin` trong RAM.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GL3B-NAP-LOI-BEN\|N-GL3B-CONV-NUOT-LOI\|N-GL4-NAP-KHONG-DEM\|N-GL3B-WEBHOOK-MAPPING"
(4 nợ — GL3b 07/10 · GL4 07/10)
```
Quan hệ: **trả nợ N-GL3B-NAP-LOI-BEN · N-GL3B-CONV-NUOT-LOI · N-GL4-NAP-KHONG-DEM · N-GL3B-WEBHOOK-MAPPING**.
