# PHIẾU GL2 — Trần số page bật bot TOÀN HỆ (pilot = 1): vắng biến = 0 page · vượt trần = worker dừng hẳn

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟨 (cổng bật bot + nguồn page của worker — quyết định bot trả lời page nào; nghiêng 🟥 khi nghi)
**Nguồn:** người quyết 05/10 — GL2 «Vắng = 0 · vượt = dừng» (sổ §10 05/10 «ĐIỀU KIỆN GO-LIVE (GL)») · báo cáo `docs/golive-audit-2026-10-02.md` mục 4
«Pilot không giới hạn một page» · sổ §5j
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

Hôm nay không có trần TỔNG: `src/queue/page-routing.js:28-33#dsPageBotTraLoi` lấy MỌI page `bot_ai_bat=true` toàn hệ (không lọc team, không
LIMIT) và `src/queue/chay-worker.js:74,93,105,134` dùng thẳng. Cửa bật duy nhất `v3/src/ui/page-bot/cong-tac.js:136-173#datCongTacBot` →
`v3/src/noi-day/van-hanh-v3.js:40-60` → `src/admin-v3/operations.js:82-130#setPage` (khoá đúng một dòng page `:97`; cổng `pageStatus` `:39-81`
không xét số page đang bật). Trần hiện có `TRAN_BAT_MOT_DOT=5`/`CUA_SO_TRAN_MS=10′` (`cong-tac.js:109-134`) là MẢNG TRONG RAM chỉ hãm tốc độ,
restart về 0. `deploy/setup.sh:22-29` chế độ pilot chỉ kiểm ba cờ; `deploy/preflight.mjs` có đếm `pagesBotBat` nhưng không dùng.

## ② Hợp đồng vào / ra

**Ra:**
1. **Biến mới** `V3_TRAN_PAGE_BAT` (số nguyên ≥ 0). **Vắng / rỗng / không phải số = 0** (luật «vắng = đóng», người quyết 05/10). Khai ở
   `docs/v3/ban-giao/bien-moi-truong-v3.md` CÙNG commit với mã đọc nó (cột VPS v3: pilot đặt `1`). Đọc ở MỘT chỗ (hàm thuần xuất ra, vd
   `tranPageBat(env)`), lỗi in GIÁ TRỊ ĐO ĐƯỢC.
2. **Cổng bật** — `setPage` khi `enabled: true`: trong cùng giao dịch, lấy khoá tư vấn TOÀN HỆ (`pg_advisory_xact_lock(<hằng có tên>)`) rồi đếm
   `count(*) FROM page WHERE bot_ai_bat` **KHÔNG kẹp team**; `số đang bật (không tính page này nếu nó đã bật) + 1 > trần` ⇒ từ chối 409 với câu
   có số đo («đang bật x/y page — trần `V3_TRAN_PAGE_BAT`=y»). Tắt (`enabled:false`) KHÔNG bị trần chặn. Trần RAM 5/10′ của `cong-tac.js` giữ nguyên
   (hãm tốc độ, khác việc).
3. **Worker** — ⚠️ sửa sau review (a) 06/10 CHẶN C1: `dsPageBotTraLoi` CÒN được `v3/src/noi-day/van-hanh-v3.js:72` dùng dựng `docSanSangV3` cho 6
   màn (`kho-page.js:245` ghi đè `bot_ai_bat`) ⇒ KHÔNG đổi hàm đó. Thêm HÀM RIÊNG cho worker (vd `dsPageBotTraLoiCoTran`) gọi ở
   `src/queue/chay-worker.js`; màn vẫn thấy ĐÚNG page đang bật khi vượt trần (để người tắt bớt). Hàm worker: số page bật > trần ⇒ trả `[]`
   (TUYỆT ĐỐI không `null` — `pageIds=null` nghĩa là MỌI page) (KHÔNG trả lời page nào — fail-closed, người quyết «vượt = dừng hẳn») và ghi
   cảnh báo có số đo — log KHÔNG quá một lần mỗi 5 phút (worker lặp ~12 lần/giây — không được ngập), nói ĐÚNG lý do «vượt trần», không «lỗi máy».
   `nhat_ky.team_id` bắt buộc mà sự kiện này toàn hệ ⇒ KHÔNG ghi `nhat_ky` (đèn + log là đủ). Số ≤ trần ⇒ như cũ.
4. **Đèn** màn Sức khoẻ (`v3/src/ui/suc-khoe/kho-suc-khoe.js` đèn «số page bật bot») — ⚠️ CHẶN C2: đèn hiện đếm qua cổng truy vấn KẸP TEAM, trần là
   TOÀN HỆ ⇒ đèn PHẢI đọc CÙNG hàm/đếm toàn hệ với worker (hai page ở hai team ⇒ đèn đỏ ở cả hai team); đỏ khi số bật > trần, nói rõ «worker đang DỪNG vì vượt trần»;
   xám/xanh như cũ khi trong trần; hiện giá trị trần đọc được (vắng ⇒ «0 — chưa đặt»). Đèn «Máy chạy bot» KHÔNG được đỏ «máy đứng» vì vượt trần
   (dẫn người đi restart vô ích) — nói «dừng vì vượt trần».
5. **Deploy** — `deploy/preflight.mjs`: in `tranPageBat`; chế độ `--ready` + số page bật > trần ⇒ exit 1. `deploy/setup.sh` chế độ pilot: đòi
   `V3_TRAN_PAGE_BAT=1` (khác ⇒ dừng với câu rõ).

## ③ File được đụng

```
src/admin-v3/operations.js
src/queue/page-routing.js
src/queue/chay-worker.js
test/va-p7-chay-worker.test.mjs
test/mb2-mot-cong-tac.test.mjs
v3/src/ui/suc-khoe/kho-suc-khoe.js
deploy/preflight.mjs
deploy/setup.sh
docs/v3/ban-giao/bien-moi-truong-v3.md
test/gl2-*.test.mjs
v3/test/b/gl2-*.test.mjs
ops/bin/nghiem-thu/gl2.sh
```
`operations.js`: CHỈ `setPage` (+ hàm phụ đọc trần). Ca cũ dựng page bật bot (`test/mb2-mot-cong-tac.test.mjs`, ca handler, cổng dựng page bật
công tắc) sẽ cần trần ≥ số page chúng bật — đặt biến trong ca/fixture, KHÔNG nới luật; nếu tệp ca nằm ngoài ③ ⇒ dừng, báo tổng kèm danh sách.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl2.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_gl2_p$$"`; `grep -E` không `rg`; nạp `.env` nếu thiếu; đảo-vá trên BẢN SAO tạm)

1. `tranPageBat`: vắng · `''` · `'abc'` · `'-1'` ⇒ 0; `'1'` ⇒ 1; `'3'` ⇒ 3.
2. Trần 1: bật page A ⇒ thành; bật page B (team KHÁC) ⇒ 409 có số đo, B vẫn tắt; tắt A ⇒ thành; bật B ⇒ thành. Vắng biến: bật A ⇒ 409.
3. Hai lượt bật A, B SONG SONG với trần 1 ⇒ đúng một thành (khoá tư vấn).
4. Worker: CSDL có 2 page bật (dựng thẳng, vượt trần 1) ⇒ hàm worker trả `[]` + một dòng cảnh báo; đo CẢ VÒNG `motLuot` (không gọi model, không
   nạp tin); 1 page bật ⇒ trả đúng page đó. Đồng thời `dsPageBotTraLoi` (màn) VẪN trả 2 page; màn /page-bot thấy 2 page bật.
4b. Gọi worker 100 lần khi vượt trần ⇒ log cảnh báo ≤ 1 dòng (trong 5 phút).
5. Đèn Sức khoẻ: 2 page bật ở HAI team, trần 1 ⇒ đèn ĐỎ ở cả hai team, câu «DỪNG vì vượt trần»; đèn «Máy chạy bot» không đỏ «máy đứng».
6. `preflight --ready` với 2 page bật, trần 1 ⇒ exit 1; trần 2 ⇒ exit 0. `setup.sh` pilot thiếu `V3_TRAN_PAGE_BAT=1` ⇒ dừng.
7. Đảo-vá: đếm kẹp team ⇒ phép 2 (B team khác) đỏ; bỏ khoá tư vấn ⇒ phép 3 đỏ; worker bỏ chặn ⇒ phép 4 đỏ; vắng = 1 ⇒ phép 1/2 đỏ.
8. Cổng cũ xanh (rc tách dòng): `mb.sh` (⚠️ `mb.sh:65` đếm grep phải đúng 1 — tên hàm mới đừng làm lệch phép đếm) · `ll3.sh` (chuỗi con chập chờn đã biết — đỏ lạ chạy riêng) · `gl1.sh`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl2-*.test.mjs` (hàm đọc trần · `setPage` trên hộp cát · song song · worker) · `v3/test/b/gl2-*.test.mjs` (đèn Sức khoẻ · cửa bật qua công tắc).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Tắt bot `ai_sale` ngoài repo trên page pilot (việc người H-GL) · hai mẫu unit worker khác tên (`ops/systemd/aicloser-v3-worker.service` vs
`aicloser-worker-v3`) — GL7 · trần theo team.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n -i "pilot\|trần\|TRAN_BAT\|N-MB-HAI-BO"
(N-MB-HAI-BO-DIEU-KIEN) hai bộ điều kiện sẵn sàng ... · trần bật 5/10′ (cong-tac.js) chỉ hãm tốc độ
```
Quan hệ: **mới** (báo cáo go-live mục 4; người quyết chốt luật 05/10).
