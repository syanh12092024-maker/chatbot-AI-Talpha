# PHIẾU GL4 — Ngắt cả page 30′ khi kênh Pancake lỗi 2 lần liên tiếp (gửi HOẶC đọc), tự mở; tin tồn giữ ở chờ; đèn đỏ có lý do

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (quyết định worker có phục vụ page nào — sai một chiều là bot bắn tiếp vào page đang bị Meta phạt, sai chiều kia
là page câm 30′ mà không ai biết)
**Nguồn:** người quyết 05/10 GL4 «2 lỗi → ngắt 30′, tự mở; tin tồn giữ ở chờ» (sổ §10 05/10 «ĐIỀU KIỆN GO-LIVE (GL)») · nợ **N-MB-NGAT-PAGE**
(README nguyên tắc 9; v1 ngắt cả page 30′ sau 2 lần GỬI lỗi — Meta #2022; v1 chỉ reset khi GỬI OK, kiểm ngay trước lượt gửi — `pancake-poll.js` cũ
`:212-213`, `:499-500`) · **N-GL3B-GL4-DOC-LOI** · **N-GL3B-PHA-KET-NOI** · **N-GL3B-BANGIAOLOI-PANCAKE** (phần «không việc») · review (a) 07/10 TRẢ
VỀ (3 CHẶN · 8 NÊN — bản này đã sửa theo, mục «Sửa sau review (a)» cuối ②) · sổ §5j (GL4 trước page thứ hai)
**Đụng bộ não:** không.
**Đổi hợp đồng cửa đã bàn giao:** CÓ (nhẹ) — `LoiDocLichSu` mang thêm trường phân loại kênh/dữ liệu (`docs/v3/ban-giao/cua-messenger-v1.md`) — sửa doc
cùng commit (án lệ GL3b N7: thêm dấu cho lỗi có sẵn, không đổi ý đồ ⇒ không CR).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

v3 chỉ lùi THEO TIN (`worker.js#TRAN_THU` = 3; GL3b: đọc lỗi lùi 15 s · 30 s rồi giao sale CÓ việc). Không có trạng thái «kênh của page đang hỏng»:
Pancake/Meta chặn page thì MỖI khách vẫn tốn một vòng (lượt model + POST hỏng bắn vào page đang bị phạt) rồi bị giao sale. Worker chọn page ở
`chay-worker.js#motLuot` (`:87-146`): `choPhep` lấy MỘT lần đầu vòng, dùng cho nạp và cho `chayToiKhiHet({ toiDa: 50, pageIds })` (`worker.js:336-342`);
tiến trình thật chạy 3 vòng xử + 1 vòng nạp song song (`chay-worker.js:224`). Đọc lịch sử chạy TRƯỚC gửi (`worker.js:177-183` rồi `:234`). Lỗi gửi
tới worker là `LoiGuiChuaXacNhan` một câu chung (`handler-v3.js:152-153` bọc `LoiCanDoiChieuGui` của `lan-gui.js:74,89` — nguyên nhân `result`
bị vứt); `LoiCanDoiChieuGui` trần chỉ có ở lượt rút lại sau crash (`worker.js:105`, 0 lượt gọi Pancake). Lỗi thiếu thẻ «AI back Sale» lúc bàn giao
cũng ra `LoiGuiChuaXacNhan` với 0 POST (đo review (a) RV-G3). `LoiDocLichSu` dựng duy nhất ở `messenger/index.js:191-193`; câu của 103/105/121
sau mọi token là câu riêng của Pancake — giống hệt «Thiếu mã khách hàng» (`pancake.js:365-374`). Tin gửi lỗi (`khongThuLai`) ⇒ `loi` + `banGiaoLoi`
KHÔNG dòng việc.

## ② Hợp đồng vào / ra

1. **Migration `034_page_ngat_kenh.{up,down}.sql`** (số đặt lúc phát): `page` thêm `loi_doc_lien_tiep int NOT NULL DEFAULT 0`, `loi_gui_lien_tiep int NOT
   NULL DEFAULT 0`, `loi_doc_tin_cuoi bigint NULL`, `loi_gui_tin_cuoi bigint NULL`, `ngat_den timestamptz NULL`, `ngat_vi text NOT NULL DEFAULT ''`
   (`''`·`doc`·`gui`), `ngat_ly_do text NOT NULL DEFAULT ''`. Down xoá đúng các cột. `db/schema.sql` SINH bằng `node db/migrate.js schema`.
2. **Mô-đun `src/queue/ngat-page.js`** (hằng `NGUONG_LOI_KENH = 2`, `PHUT_NGAT = 30`). MỌI hàm ghi nhận `pool` RIÊNG (như `poolGui`), chạy NGOÀI giao
   dịch tin, nuốt lỗi + cảnh báo MỘT lần (CSDL chưa có cột 034 ⇒ «không ngắt», không làm hỏng lượt xử):
   - `ghiLoiKenh(pool, { teamId, pageId, tinId, kieu: 'doc'|'gui', lyDo })` — một câu `UPDATE … RETURNING` nguyên tử: chỉ tăng bộ đếm của `kieu` khi
     `tinId` ≠ `loi_<kieu>_tin_cuoi` (đếm theo TIN KHÁC NHAU — hai lượt thử của cùng một tin là MỘT lỗi); chạm ngưỡng ⇒ đặt `ngat_den = now() + 30′`,
     `ngat_vi`, `ngat_ly_do` (câu đọc được, KHÔNG token/URL), đặt hai bộ đếm về 0; ghi `nhat_ky` `page_ngat_kenh` (team thật của page). Đang ngắt thì
     không ngắt chồng. Cập nhật ngay bộ nhớ chung của tiến trình (② 4).
   - `ghiDocTot(pool, …)` — đọc OK ⇒ CHỈ `loi_doc_lien_tiep = 0` (WHERE ≠ 0 — không sinh lượt ghi khi đã 0).
   - `ghiGuiTot(pool, …)` — gửi OK ⇒ CẢ HAI bộ đếm = 0. Gọi SAU `phien.ketThuc(XONG)`.
   - `dsPageDangNgat(pool)` — câu riêng, tính `ngat_den > now()` TRONG SQL (đồng hồ CSDL — án lệ lệch giờ `kho.js:226-228`), trả `{ pageId, vi, den, lyDo }`;
     bắt 42703 ⇒ `[]` + cảnh báo một lần. KHÔNG sửa `page-routing.js` (nguồn của 6 màn + preflight).
   - Mở lại ĐÚNG MỘT lần: `UPDATE page SET ngat_ly_do='', ngat_vi='' WHERE … AND ngat_ly_do<>'' AND ngat_den<=now() RETURNING …`; chỉ ghi `nhat_ky
     page_mo_lai_kenh` khi `rowCount=1`. Sau khi mở: phải đủ 2 lỗi (tin khác nhau) mới ngắt lại.
3. **Lỗi được đếm** (phân loại theo CẤU TRÚC, không theo câu chữ):
   - **ĐỌC** — `LoiDocLichSu` mang `capKenh: true` khi: hết token / `soLoi.hetToken` (103/105/121 ở MỌI token) · quá hạn · lỗi mạng · thân hỏng / HTTP 5xx ·
     `error_code === -1` · dạng 121 KHÔNG mã «Không tìm thấy gói cước» (`pancake.js:337-338`). Còn lại (thân không danh sách, câu riêng một hội thoại
     như «Thiếu mã khách hàng») ⇒ `capKenh: false`, KHÔNG đếm. Trường dựng ở `pkDocTin` (đầu ra phụ, vd tham số `soLoi` để nơi gọi tự phân loại) và
     mang qua `messenger/index.js` → `loi.js#LoiDocLichSu`. ⚠️ Neo `gl3b.sh` ⑤v/⑤v2/⑤w (`gl3b.sh:154-161`) nằm đúng dòng `pancake.js:347` — ưu tiên
     KHÔNG sửa dòng đó; không tránh được thì đổi chuỗi neo trong `gl3b.sh` (③), GIỮ ý đột biến (V2c/V2d phải còn đỏ). Giữ chuỗi `quá hạn <N> ms`.
   - **GỬI** — `lan-gui.js#bocCuaGuiBen`: `LoiCanDoiChieuGui` ném SAU KHI đã gọi cửa mang `{ loai, kenh: true, chiTiet: { error, khongRo, phaLoi, quaHan,
     ma } }` lấy từ `result` (hoặc `cause` khi cửa ném); lỗi ném ở `:68` (đụng UNIQUE) KHÔNG mang dấu. Worker đọc `e.cause?.kenh`. ĐẾM: `loai ∈ {guiTin,
     guiAnh}` và cửa ĐÃ gọi Pancake — `khongRo` (mạng/quá hạn/thân hỏng) · quyền 103/105/121 ở mọi token · `success:false` của POST `/messages`.
     KHÔNG ĐẾM: `ghiNote` / `gatThe` · lỗi không có HTTP (thiếu thẻ, thiếu `cust_id`, `biChan` cổng ghi chặn) · lượt rút lại sau crash · `LoiChoMappingPancake`.
   - `ngat_ly_do` lấy từ `chiTiet` / `capKenh` (vd «Pancake từ chối gửi (mã 105)», «quá hạn 30000 ms chờ Pancake (gửi)», «Pancake quá hạn 15000 ms (đọc)»).
4. **Worker lọc page ngắt NGAY TRƯỚC MỖI LƯỢT RÚT**: `chayMotVong` lọc `deps.pageIds` theo bộ nhớ chung của tiến trình trong `ngat-page.js` (đọc lại CSDL
   mỗi vòng `motLuot`; `ghiLoiKenh` cập nhật ngay khi ngắt) ⇒ cả 3 vòng xử thấy ngay; tin 3..50 của cùng vòng KHÔNG bị rút. Bộ lọc áp CẢ khi `deps.dsChoPhep`
   được tiêm. **Nạp khi ngắt**: ngắt vì GỬI ⇒ vẫn NẠP (đọc còn tốt; tránh mất tin rơi khỏi cửa sổ 60 hội thoại của Pancake v1), chỉ không rút; ngắt vì ĐỌC
   ⇒ bỏ nạp page đó. Tin của page ngắt giữ `cho`. GL2: page ngắt vẫn tính là «bật» khi đếm trần. Log vòng (`inLuot`) in số page đang ngắt — MỘT dòng tổng,
   KHÔNG cảnh báo mỗi vòng (ca GL2 W4e đếm `console.warn` ≤ 1/100 lượt).
5. **Ngân sách thử khi ngắt**: KHÔNG hoàn `so_lan_thu` (giữ trần GL3b). Hai tin làm ngắt đã đốt lượt của chúng. Pilot 1 khách: đọc lỗi lượt 1, 2 của CÙNG
   tin = 1 lỗi ⇒ không ngắt ⇒ lượt 3 ở +45 s giao sale CÓ việc (như GL3b). Pancake sập với ≥2 khách ⇒ ngắt; mỗi chu kỳ 30′ tối đa 2 tin thăm dò; khách đọc
   lỗi lần 3 giao sale CÓ việc (chờ ≤ ~60′).
6. **Tin gửi lỗi cũng đẻ việc** (nâng N-GL3B-BANGIAOLOI-PANCAKE phần việc — GL4 biến nó thành lặp 2 khách/30′): nhánh `banGiaoLoi` của lỗi GỬI (tin `loi`,
   `lan_gui='khong_ro'`) chèn MỘT dòng `viec_can_xu_ly` theo khuôn GL3b (`NOT EXISTS` việc mở; `ly_do_day` «Gửi không rõ đã tới khách — đối chiếu ở
   Vận hành trước khi trả AI»), chỉ khi UPDATE `hoi_thoai` đổi đúng 1 dòng. Dùng chung hàm chèn việc của GL3b (gộp N-GL3B-KHUON-VIEC-HAI-BAN nếu gọn).
7. **Đèn + màn**: đèn MỚI `ngat_kenh` ở Sức khoẻ (`kho-suc-khoe.js`) — ĐỎ khi có page ngắt: «Page <tên> ngắt <đọc|gửi> tới HH:MM (giờ VN) — <lý do>; bot
   tự thử lại lúc đó; N tin đang giữ ở chờ; M tin gửi lỗi cần đối chiếu — màn Vận hành». Cách ly team theo GL2 vòng 2 (team khác chỉ số + tên team).
   Đèn «Máy chạy bot» (`denMayChayBot`) có nhánh «đang giữ tin vì page X ngắt kênh tới HH:MM — máy KHÔNG hỏng, đừng khởi động lại» (cùng kiểu nhánh
   vượt trần GL2; GIỮ nguyên dòng neo `if (tran?.vuot) {` và `ma: 'bot_bat', … muc: MUC.DO,` của `gl2.sh` ⑤p/⑤q). Màn Page & Bot: nhãn «Ngắt kênh tới HH:MM».
8. **Không làm**: nút «mở lại ngay» · cảnh báo Telegram (GL6 đọc `nhat_ky page_ngat_kenh`) · dải trạng thái mọi trang (`v3/src/ui/chung/trang-thai.js` —
   nối N-GL2-DAI-TRANG-THAI) · page webhook · lỗi ở bước NẠP (`pkGetConversations` nuốt lỗi — GL3c/GL6).

**Sửa sau review (a) 07/10:** C1 → ② 1/2 (hai bộ đếm; đọc OK chỉ xoá chuỗi đọc) · C2 → ② 4 (lọc trước MỖI lượt rút, bộ nhớ chung) · C3 → ② 3 (`lan-gui.js`
mang `cause.kenh` + `chiTiet`; không đếm ghi chú/thẻ/không-HTTP/rút lại) · N1 → ③ · N2 → ② 2 (pool riêng, ngoài giao dịch) · N3 → ② 5 (đếm theo tin khác
nhau, không hoàn lượt) · N4 → ② 4 (gửi: vẫn nạp; đọc: bỏ nạp) · N5 → ② 3 (cấu trúc + 121 không mã) · N6 → ② 7 · N7 → ④ · N8 → ② 2 · G3 (nửa mở) → tổng chốt
«đủ 2 lỗi mới ngắt lại» (đúng chữ người quyết) · G5 → ② 6.

## ③ File được đụng

```
db/migrate/034_page_ngat_kenh.up.sql
db/migrate/034_page_ngat_kenh.down.sql
db/schema.sql
src/queue/ngat-page.js
src/queue/worker.js
src/queue/chay-worker.js
src/queue/lan-gui.js
src/pancake.js
src/channels/messenger/index.js
src/channels/messenger/loi.js
docs/v3/ban-giao/cua-messenger-v1.md
v3/src/ui/suc-khoe/kho-suc-khoe.js
v3/src/ui/page-bot/kho-page.js
v3/src/ui/page-bot/trang/page-bot.html
v3/test/b/suc-khoe.test.mjs
ops/bin/nghiem-thu/gl3b.sh
test/gl4-*.test.mjs
v3/test/b/gl4-*.test.mjs
ops/bin/nghiem-thu/gl4.sh
```
`suc-khoe.test.mjs`: CHỈ đổi số đèn 11 → 12 (`:173-174`). `gl3b.sh`: CHỈ đổi chuỗi neo nếu buộc phải sửa dòng `pancake.js:347`, giữ ý đột biến. `pancake.js` /
`index.js` / `loi.js`: CHỈ phần phân loại lỗi đọc. Ca cũ đỏ ngoài danh sách ⇒ DỪNG, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl4.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_gl4_p$$"`; fetch giả, KHÔNG mạng; ≥2 token; mở van gửi CHỈ trong env tiến trình ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

⚠️ Đi CỬA THẬT (`motLuot`/`chayMotVong` → `docTin` thật → `pkDocTin` → `pkFetchPage` → fetch giả; gửi qua `bocCuaGuiBen` thật). CẤM tiêm `docTin`/`cua`/
`docLichSu:false`; cấm tiêm `dsChoPhep` ở phép 1–5 (đi `trangThaiTran` thật, đặt `V3_TRAN_PAGE_BAT` trong env ca). «Qua 30′» = `UPDATE page SET ngat_den =
now() - interval '1 second'` (+ `thu_lai_luc` của tin) — đồng hồ CSDL, cấm tiêm đồng hồ JS. Mọi phép PHỦ ĐỊNH («KHÔNG ngắt») phải kèm vế «đã chạm»: fetch giả
nhận ≥1 lượt đúng URL cho đúng tin, `ly_do` tin chứa `LoiDocLichSu`/`LoiGuiChuaXacNhan`, `ket.nap.mo === true`, `congHttpGhi.daChan` không tăng.

1. Đọc quá hạn ở 2 tin KHÁC NHAU (khách A, B) ⇒ `ngat_vi='doc'`, `ngat_den≈now+30′`, lý do «quá hạn»; `nhat_ky page_ngat_kenh` 1 dòng; vòng sau (trong 30′):
   0 lượt fetch cho P (cả nạp lẫn rút), page Q cùng vòng ĐƯỢC fetch; tin vẫn `cho`. Qua 30′ + Pancake lành ⇒ A, B được trả lời, `page_mo_lai_kenh` 1 dòng.
1b. 4 tin tồn của P, tin 1 và 2 lỗi đọc (khác khách) trong CÙNG một lượt `chayToiKhiHet` ⇒ tin 3, 4 vẫn `cho`, `so_lan_thu = 0`, fetch giả 0 lượt cho chúng,
   0 lượt model.
1c. Cùng MỘT tin đọc lỗi lượt 1 rồi lượt 2 ⇒ KHÔNG ngắt (đếm theo tin); lượt 3 ⇒ giao sale CÓ việc (GL3b).
2. ĐỌC OK THẬT (fetch giả trả `messages`) + GỬI hỏng (105 mọi token · `(#10)` · lỗi mạng) ở 2 hội thoại ⇒ NGẮT `ngat_vi='gui'`; lý do chứa «mã 105» / «quá hạn …
   (gửi)»; mỗi tin `lan_gui='khong_ro'`, KHÔNG gửi lại; mỗi hội thoại đẻ ĐÚNG 1 dòng việc. Trong lúc ngắt vì gửi: nạp VẪN chạy (tin mới vào `cho`), không rút.
2c. Rút lại sau crash (`LoiCanDoiChieuGui` trần, 0 lượt Pancake) ×2 ⇒ KHÔNG ngắt.
2d. Thiếu thẻ «AI back Sale» lúc bàn giao ×2 (0 POST) ⇒ KHÔNG ngắt. `ghiNote` lỗi ⇒ KHÔNG đếm.
3. Gửi lỗi → gửi OK → gửi lỗi ⇒ KHÔNG ngắt. Đọc lỗi → đọc OK → đọc lỗi ⇒ KHÔNG ngắt. Gửi lỗi → ĐỌC OK → gửi lỗi (khác tin) ⇒ NGẮT (đọc OK không xoá chuỗi gửi).
4. Phân loại đọc: «Thiếu mã khách hàng» ×2 ⇒ KHÔNG ngắt; 105 mọi token ×2 ⇒ NGẮT; 121 không mã «Không tìm thấy gói cước» ×2 ⇒ NGẮT; thân không danh sách ×2 ⇒ KHÔNG.
5. GL2: P đang ngắt vẫn đếm vào trần (bật page thứ hai, trần 1 ⇒ 409). Page Q chạy bình thường.
6. Đèn `ngat_kenh` ĐỎ, câu có giờ VN + lý do + số tin giữ + số tin cần đối chiếu; người team khác không thấy tên P; đèn «Máy chạy bot» nói «máy KHÔNG hỏng» (không
   «khởi động lại»). Màn Page & Bot: nhãn «Ngắt kênh tới …».
7. CSDL CHƯA áp 034: một lượt GỬI THÀNH CÔNG ⇒ tin `xong`, hội thoại giữ trạng thái mới, `lan_gui` đã gửi (ghi* không làm hỏng giao dịch); vòng không sập; cảnh
   báo một lần. Migration up → down → up thành trên hộp cát có dữ liệu.
8. 4 vòng cùng thấy hết hạn ⇒ đúng 1 dòng `page_mo_lai_kenh`. Sau mở: 1 lỗi ⇒ chưa ngắt; lỗi thứ 2 (tin khác) ⇒ ngắt lại.
9. Đảo-vá (mỗi cái đỏ đúng phép): đọc OK xoá bộ đếm gửi ⇒ 2/3 đỏ · kiểm theo vòng ⇒ 1b đỏ · đếm theo lượt (không theo tin) ⇒ 1c đỏ · đếm lượt rút lại sau crash
   ⇒ 2c đỏ · đếm `gatThe`/không-HTTP ⇒ 2d đỏ · phân loại theo câu chữ ⇒ 4 (105 / 121 không mã) đỏ · ghi* dùng client giao dịch ⇒ 7 đỏ · mở lại không điều kiện ⇒ 8 đỏ ·
   bỏ lọc page ngắt ⇒ 1 đỏ · ngắt vì gửi mà bỏ nạp ⇒ 2 (vế nạp) đỏ · `denMayChayBot` không nhánh ngắt ⇒ 6 đỏ · đèn lộ tên page team khác ⇒ 6 đỏ · không đẻ việc
   cho tin gửi lỗi ⇒ 2 đỏ.
10. Cổng cũ xanh (rc tách dòng): `gl3b.sh` (đảo-vá V2c/V2d còn đỏ đúng) · `gl3.sh` · `gl2.sh` · bộ ca `test/va-p7-chay-worker.test.js` ·
    `test/phase1-chat-flow.test.js` · `test/l2-m1-hang-doi.test.js` · `test/l0-m1-luoc-do.test.js` · `test/gl2-tran-page-bat.test.mjs` · `test/gl3b-*.test.mjs` ·
    `v3/test/b/suc-khoe.test.mjs`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl4-*.test.mjs` (đọc/gửi ngắt · lọc trước mỗi lượt rút · đếm theo tin · phân loại cấu trúc · không đếm ghi chú/thẻ/rút lại · nạp khi ngắt theo loại · việc cho tin gửi lỗi ·
mở lại một lần · chưa có cột) · `v3/test/b/gl4-*.test.mjs` (đèn `ngat_kenh` · nhánh «máy không hỏng» · màn Page & Bot · cách ly team).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Đèn GL4 KHÔNG phủ Pancake sập ở bước NẠP (`pkGetConversations` nuốt lỗi — N-GL3B-CONV-NUOT-LOI, GL3c/GL6): đèn xanh ≠ kênh lành · lỗi Meta theo NGƯỜI NHẬN (#551,
#10 ngoài 24h) vẫn đếm như v1 — đo dạng `original_error` thật khi mở van · nút «mở lại ngay» · Telegram (GL6) · dải trạng thái mọi trang · `README.md:95` câu «chưa có
ngắt cả page» (GL7) · migration 034 áp trên VPS TRƯỚC mã mới.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-MB-NGAT-PAGE\|N-GL3B-GL4-DOC-LOI\|N-GL3B-PHA-KET-NOI\|N-GL3B-BANGIAOLOI-PANCAKE"
N-MB-NGAT-PAGE (02/10) … v3 chỉ lùi THEO TIN … Neo: trước khi bật page thứ 2.
N-GL3B-GL4-DOC-LOI … GL4 phải tính cả LoiDocLichSu …
N-GL3B-PHA-KET-NOI … GL4 đừng dựa vào nó để gửi lại.
N-GL3B-BANGIAOLOI-PANCAKE … banGiaoLoi không thẻ/ghi chú, không việc …
```
Quan hệ: **trả nợ N-MB-NGAT-PAGE + N-GL3B-GL4-DOC-LOI + phần «không việc» của N-GL3B-BANGIAOLOI-PANCAKE**.
