# PHIẾU GL4 — Ngắt cả page 30′ khi kênh Pancake lỗi 2 lần liên tiếp (gửi HOẶC đọc), tự mở; tin tồn giữ ở chờ; đèn đỏ có lý do

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (quyết định worker có phục vụ page nào — sai một chiều là bot trả lời khi kênh đang hỏng, sai chiều kia là
page câm 30′ mà không ai biết)
**Nguồn:** người quyết 05/10 GL4 «2 lỗi → ngắt 30′, tự mở; tin tồn giữ ở chờ» (sổ §10 05/10 «ĐIỀU KIỆN GO-LIVE (GL)») · nợ **N-MB-NGAT-PAGE**
(README nguyên tắc 9 «biết dừng khi kênh lỗi»; v1 ngắt cả page 30′ sau 2 lần gửi lỗi — Meta #2022) · **N-GL3B-GL4-DOC-LOI** (phải tính lỗi ĐỌC:
đọc chạy trước gửi) · **N-GL3B-PHA-KET-NOI** (`phaLoi:'ket_noi'` KHÔNG phải bằng chứng chưa gửi — không được dựa vào để gửi lại) · báo cáo
`docs/golive-audit-2026-10-02.md` mục «Timeout và ngắt page» · sổ §5j (GL4 trước page thứ hai)
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

v3 chỉ lùi THEO TIN: `src/queue/worker.js#TRAN_THU` = 3, lùi theo `treMs` (GL3b: đọc lỗi 15 s · 30 s rồi giao sale CÓ việc). Không có trạng thái
«kênh của page đang hỏng»: Pancake/Meta chặn page thì MỖI khách mới vẫn tốn một vòng thử, và sau ~45 s mỗi khách bị giao sale — trái quyết định
«tin tồn giữ ở chờ». Worker chọn page qua `src/queue/chay-worker.js#motLuot` (`:87-146`): `choPhep` (GL2 `page-routing.js#choPhepTheoTran`) dùng
cho CẢ nạp (`napTuPoll` từng page) lẫn rút (`chayToiKhiHet({ pageIds: choPhep })` → `kho.js#moPhienRut` `:112`). Lỗi gửi: `lan-gui.js#bocCuaGuiBen`
(`:55-95`; `ok!==true` ⇒ `lan_gui='khong_ro'` + `LoiCanDoiChieuGui`). Lỗi đọc: `src/channels/messenger/loi.js#LoiDocLichSu` (GL3b; `pkDocTin` xếp
hạng lỗi quá hạn > mạng > 103 > 121 > 105). Bảng `page` (`db/schema.sql:80-101`) chưa có cột nào cho trạng thái kênh.

## ② Hợp đồng vào / ra

1. **Migration `db/migrate/034_page_ngat_kenh.{up,down}.sql`** (số đặt lúc phát; bị chiếm thì lấy số kế): thêm vào `page` — `loi_kenh_lien_tiep int
   NOT NULL DEFAULT 0`, `ngat_den timestamptz NULL`, `ngat_ly_do text NOT NULL DEFAULT ''`. Down xoá đúng ba cột. `db/schema.sql` SINH bằng
   `node db/migrate.js schema`. Reader mới chịu được cột chưa có (mo-van §5: lùi code giữ schema — và deploy migration TRƯỚC mã).
2. **Một mô-đun** `src/queue/ngat-page.js` (hàm thuần + câu SQL, hằng có tên `NGUONG_LOI_KENH = 2`, `PHUT_NGAT = 30`):
   - `ghiLoiKenh(db, { teamId, pageId, loai, thongDiep })` — trong MỘT câu `UPDATE … SET loi_kenh_lien_tiep = loi_kenh_lien_tiep + 1 … RETURNING`;
     chạm ngưỡng ⇒ CÙNG câu (hoặc cùng giao dịch) đặt `ngat_den = now() + 30′`, `ngat_ly_do` = câu đọc được (loại + thông điệp đã cắt, KHÔNG token/URL),
     đặt lại bộ đếm về 0; ghi `nhat_ky` (`hanhDong: 'page_ngat_kenh'`, team thật của page, `sau` có `ngat_den` + lý do). Đang ngắt thì không ngắt chồng.
   - `ghiKenhTot(db, { teamId, pageId })` — đọc HOẶC gửi thành công ⇒ `loi_kenh_lien_tiep = 0` (chỉ UPDATE khi khác 0 — không ghi mỗi tin).
   - `dangNgat(dongPage, bayGio)` — `ngat_den > bayGio`.
   - Page hết hạn ngắt mà trước đó đang ngắt ⇒ ghi `nhat_ky` `page_mo_lai_kenh` MỘT lần (vd khi worker thấy `ngat_den <= now()` và `ngat_ly_do <> ''` ⇒
     xoá `ngat_ly_do`, ghi nhật ký).
3. **Loại lỗi được đếm** (lỗi «kênh», không phải lỗi «dữ liệu một hội thoại»):
   - GỬI: `LoiCanDoiChieuGui` (gửi không rõ: lỗi mạng / quá hạn / thân hỏng) và gửi bị Pancake TỪ CHỐI sau mọi token (`ok:false` có mã quyền/gói).
   - ĐỌC: `LoiDocLichSu` loại quá hạn · mạng · HTTP 5xx · 103/105/121 ở mọi token. `LoiDocLichSu` mang thông điệp dữ liệu RIÊNG một hội thoại (vd
     «Thiếu mã khách hàng») KHÔNG đếm. Cần trường phân loại trên lỗi (vd `e.loai` / `e.capKenh === true`) — thêm ở `pancake.js#pkDocTin` +
     `loi.js#LoiDocLichSu`, GIỮ chuỗi con `quá hạn <N> ms` và mọi neo đảo-vá của `gl3.sh` / `gl3b.sh`.
   - KHÔNG đếm: `LoiChoMappingPancake` (page webhook — 582/582 prod là poll; ghi nợ), lỗi model, lỗi SQL, lỗi guard.
4. **Worker**: `motLuot` loại page `dangNgat` khỏi `choPhep` cho CẢ nạp lẫn rút (đọc trạng thái ngắt MỘT lần mỗi vòng cùng lượt đọc trần). Tin của page
   đang ngắt GIỮ NGUYÊN `cho` (không rút ⇒ không tăng `so_lan_thu`, không giao sale). Hết 30′ ⇒ page tự vào lại `choPhep`. `worker.js`: nhánh lỗi gọi
   `ghiLoiKenh` theo ② 3; nhánh đọc lịch sử thành công + gửi thành công gọi `ghiKenhTot`. GL2: page đang ngắt VẪN tính là «bật» khi đếm trần (không
   đổi `dsPageBotTraLoi`). Log vòng (`inLuot`) in số page đang ngắt — MỘT dòng tổng.
5. **Đèn + màn**: đèn Sức khoẻ (`v3/src/ui/suc-khoe/kho-suc-khoe.js`) ĐỎ khi có page đang ngắt kênh của team người xem: «Page <tên> ngắt tới HH:MM
   (giờ VN) — <lý do>; bot tự thử lại lúc đó; tin của khách đang giữ ở chờ». Màn Page & Bot (`v3/src/ui/page-bot/kho-page.js` + trang) hiện nhãn
   «Ngắt kênh tới HH:MM» trên dòng page. Giữ cách ly team (theo GL2 vòng 2: page team khác không lộ tên).
6. **Không làm ở phiếu này**: nút «mở lại ngay» · cảnh báo Telegram (GL6 đọc `nhat_ky page_ngat_kenh`) · ngắt theo lỗi model · page webhook.

## ③ File được đụng

```
db/migrate/034_page_ngat_kenh.up.sql
db/migrate/034_page_ngat_kenh.down.sql
db/schema.sql
src/queue/ngat-page.js
src/queue/worker.js
src/queue/chay-worker.js
src/pancake.js
src/channels/messenger/loi.js
v3/src/ui/suc-khoe/kho-suc-khoe.js
v3/src/ui/page-bot/kho-page.js
v3/src/ui/page-bot/trang/page-bot.html
test/gl4-*.test.mjs
v3/test/b/gl4-*.test.mjs
ops/bin/nghiem-thu/gl4.sh
```
`pancake.js` / `loi.js`: CHỈ thêm trường phân loại lỗi đọc (② 3). Trang Page & Bot: thợ đo tên tệp thật trước khi sửa (nếu khác ⇒ báo tổng). Ca cũ
đỏ vì cột mới / vòng worker đổi mà nằm ngoài ③ ⇒ DỪNG, báo tổng kèm danh sách.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl4.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_gl4_p$$"` (migration 034 áp trong hộp cát); fetch giả, KHÔNG mạng; ≥2 token; mở van gửi CHỈ trong env tiến trình ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

⚠️ Đi CỬA THẬT (`chayMotVong`/`motLuot` → `docTin` thật → `pkDocTin` → `pkFetchPage` → fetch giả) — cấm tiêm `docTin`/`cua` ở phép 1–4.

1. Page P, hai khách A, B. Pancake quá hạn khi ĐỌC: tin A lỗi (đếm 1), tin B lỗi (đếm 2) ⇒ `page.ngat_den ≈ now+30′`, `ngat_ly_do` nói «quá hạn», `nhat_ky`
   `page_ngat_kenh` 1 dòng; tin A, B vẫn `cho`; vòng sau (trong 30′) worker KHÔNG nạp, KHÔNG rút P (fetch giả 0 lượt cho P), 0 việc sale, 0 POST.
   Đồng hồ giả qua 30′ + Pancake lành ⇒ P vào lại, A và B được trả lời (2 POST), `nhat_ky page_mo_lai_kenh` 1 dòng, bộ đếm 0.
2. Gửi không rõ (POST treo / lỗi mạng) 2 lần liên tiếp ở hai hội thoại ⇒ ngắt như phép 1; mỗi tin đó `lan_gui='khong_ro'` như GL3 (không gửi lại).
3. Xen kẽ: lỗi 1 → thành công → lỗi 1 ⇒ KHÔNG ngắt (bộ đếm về 0 khi thành công).
4. `LoiDocLichSu` dữ liệu riêng hội thoại («Thiếu mã khách hàng») ×2 ⇒ KHÔNG ngắt; nhánh GL3b giữ nguyên.
5. Page Q (khác) vẫn chạy bình thường khi P đang ngắt. GL2: P đang ngắt vẫn đếm vào trần (bật page thứ hai khi trần 1 ⇒ vẫn 409).
6. Đèn Sức khoẻ: P ngắt ⇒ ĐỎ, câu có giờ VN + lý do + «tin đang giữ ở chờ»; người team khác không thấy tên P. Màn Page & Bot: nhãn «Ngắt kênh tới …».
7. Migration 034: up → down → up thành trên hộp cát có dữ liệu; mã mới chạy trên CSDL CHƯA có cột (chưa áp 034) ⇒ không sập vòng, coi như «không ngắt»
   và in cảnh báo một lần.
8. Đảo-vá: bỏ loại page ngắt khỏi `choPhep` ⇒ phép 1 đỏ (fetch cho P >0 / giao sale); bỏ đặt lại bộ đếm khi thành công ⇒ phép 3 đỏ; đếm cả lỗi dữ liệu
   hội thoại ⇒ phép 4 đỏ; ngưỡng 1 ⇒ phép 3 đỏ; không tự mở ⇒ phép 1 (vế sau) đỏ; đèn lộ tên page team khác ⇒ phép 6 đỏ.
9. Cổng cũ xanh (rc tách dòng): `gl3b.sh` · `gl3.sh` · `gl2.sh` · bộ ca `test/va-p7-chay-worker.test.js` · `test/phase1-chat-flow.test.js` ·
   `test/l2-m1-hang-doi.test.js` · `test/l0-m1-luoc-do.test.js`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl4-*.test.mjs` (ngắt do đọc · do gửi · xen kẽ · lỗi dữ liệu hội thoại · page khác · trần GL2 · migration) · `v3/test/b/gl4-*.test.mjs` (đèn · màn Page & Bot · cách ly team).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Nút «mở lại ngay» cho quản trị · cảnh báo Telegram khi ngắt (GL6) · ngắt theo lỗi model / lỗi guard · page webhook (`LoiChoMappingPancake`, N-GL3B-WEBHOOK-MAPPING
— GL3c) · lỗi đọc bền một hội thoại (N-GL3B-NAP-LOI-BEN — GL3c) · migration 034 áp trên VPS TRƯỚC mã mới.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-MB-NGAT-PAGE\|N-GL3B-GL4-DOC-LOI\|N-GL3B-PHA-KET-NOI"
N-MB-NGAT-PAGE (02/10) … v3 chỉ lùi THEO TIN … Neo: trước khi bật page thứ 2.
N-GL3B-GL4-DOC-LOI … GL4 phải tính cả LoiDocLichSu …
N-GL3B-PHA-KET-NOI … GL4 đừng dựa vào nó để gửi lại.
```
Quan hệ: **trả nợ N-MB-NGAT-PAGE + N-GL3B-GL4-DOC-LOI**.
