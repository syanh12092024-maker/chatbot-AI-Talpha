# PHIẾU GL3b — Đọc lịch sử Pancake lỗi/chậm: KHÔNG trả lời mù, KHÔNG câm im lặng — chờ lâu rồi giao sale CÓ dòng việc

**Base:** `08ff546` · **Làn:** 🟥 (đường bot TRẢ LỜI khách — nguy cơ trả lời đè sale; và ngược lại: bot câm mà không ai biết)
**Nguồn:** đối kháng GL3 06/10 (verdict `refute-gl3.verdict.yaml`): **F1** NEN nặng nhất · **F2** NEN · **F3** GHI-NỢ · review (a) 07/10 TRẢ VỀ
(2 CHẶN · 7 NÊN — bản này đã sửa theo, mục «Sửa sau review (a)» cuối ②) · README nguyên tắc 6 · 10 · 13 · sổ §5j (GL3b thuộc nhóm TỐI THIỂU
trước pilot) · người quyết 05/10 GL4 «tin tồn giữ ở chờ».
**Đụng bộ não:** không.
**Đổi hợp đồng cửa đã bàn giao:** CÓ — `docTin` của cửa Messenger đổi từ «trả mảng, lỗi không ném» (`docs/v3/ban-giao/cua-messenger-v1.md:35,50-51`)
sang «ném `LoiDocLichSu`». Tổng ghi rõ: đây là sửa MÃ cho khớp ý đồ CÓ SẴN (README nguyên tắc 10 «đọc lịch sử trước khi trả lời», lời khai
`worker.js:123` «không trả lời mù… retry có backoff», ca `test/phase1-chat-flow.test.js:113`), không đổi ý đồ ⇒ không CR; sửa doc hợp đồng
CÙNG commit.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

**F1** — worker đọc lịch sử qua `cuaDocTin` → `src/channels/messenger/index.js:159-180#docTin` (`getMessages = pkGetMessages`, `:165`).
`src/pancake.js#pkGetMessages` (`:331-334`) NUỐT lỗi thành `[]`. Sau GL3 (hạn đọc 15 s), Pancake chậm/lỗi ⇒ «lịch sử rỗng» ⇒ worker bỏ qua
cửa nhường page (`worker.js:149` cần `lichSu.length`) ⇒ trả lời MÙ đè sale/Botcake. Repro reviewer: `<scratchpad tổng>/gl3/r2-tra-loi-mu.test.mjs`
(đọc trong hạn ⇒ 0 POST; chậm hơn hạn ⇒ 1 POST). Bộ nạp `src/queue/nap.js:488-495` cũng gọi `docTin`: lỗi ⇒ `[]` ⇒ ghi `mocDaXu` (`:494`) ⇒ tin
khách KHÔNG BAO GIỜ vào hàng. `pkDocTin` (`pancake.js:325-330`) không nuốt lỗi nhưng gộp «thân không phải JSON (502)» với «hết token» thành một câu
sai «không có token Pancake nào còn hạn» (`:328`).
**Bàn giao hiện có không tới tay sale** — `banGiaoLoi` (`worker.js:28-34`) chỉ đổi `hoi_thoai` sang `SALE/HANDOFF` + `ly_do_cuoi='loi_xu_ly_can_doi_chieu'`,
KHÔNG đẻ `viec_can_xu_ly` (chỗ duy nhất đẻ là `src/admin-v3/operations.js:155-172`, GD5). Tin chốt `loi` ⇒ «trả AI» bị chặn (`src/queue/reconcile.js:53-57`).
**Cache thẻ rỗng 10′** — `pkTagId` (`pancake.js:347-363`) đọc `/settings` lỗi/quá hạn vẫn cache bảng thẻ RỖNG 10′ (nợ N-GL3-THE-RONG-10P) ⇒ hội thoại
mang thẻ «Đã gửi» bị nạp và bot trả lời khách đã chốt — cùng lớp «đọc lỗi ⇒ bot nói».
**F2** — `pkAddNote` báo `ok:true` khi mọi token bị từ chối quyền mà thân không có `success:false` (`{error_code:105}`), và cả khi cổng ghi chặn
(`{error_code:-1}` không có `khongRo`) (`pancake.js:404-407`). **F3** — POST xét `permErr` TRƯỚC `success` ⇒ `{success:true, error_code:121}` ⇒ gửi lần hai.

## ② Hợp đồng vào / ra

1. **Cửa đọc tin** — sửa TRONG `docTin` của `src/channels/messenger/index.js` (worker và bộ nạp KHÔNG import `pancake.js` — luật một cửa L1-M2,
   `cua-messenger-v1.md` §0, `ops/bin/nghiem-thu/l1-m2.sh:124-133`). Đường mặc định gọi `pkDocTin`; `ok:false` ⇒ ném `LoiDocLichSu` (khuôn lỗi
   có tên ở `src/channels/messenger/loi.js`) mang câu lỗi đọc được. Giữ tham số tiêm `getMessages`: hàm tiêm trả MẢNG = đọc được (ca cũ
   `test/l1-m2-cua.test.js:163,299` · `test/l2-m1-nhac-truong.test.js:308`). Rỗng thật (`ok:true, messages:[]`) vẫn là rỗng hợp lệ.
   Sửa `docs/v3/ban-giao/cua-messenger-v1.md` (dòng 35, 50-51) cùng commit.
2. **`pkDocTin` nói đúng lý do**: thân không phải JSON / HTTP 5xx ⇒ câu «Pancake lỗi (HTTP …)»; quá hạn ⇒ «Pancake quá hạn …»; hết token mới là
   «không có token…». Không đổi URL, thứ tự token, `_pageTokIdx`. ⚠️ Câu quá hạn GIỮ chuỗi con `quá hạn <N> ms` (ca GL3 M1/R1/R7b so bằng regex —
   `test/gl3-han-cho-pancake.test.mjs:127,199,346`, ngoài ③). GET thân hỏng GIỮ «1 lượt, không xoay, `pkGetConversations` ⇒ []» (R7e `:372-373`):
   đánh dấu thân hỏng ở `pancake.js:238` (không phải neo); giữ nguyên neo `e.thanHong = true;⏎ throw e;` của `gl3.sh`.
3. **Worker — nhánh RIÊNG cho `LoiDocLichSu`**, tách khỏi `banGiaoLoi` (vốn dành cho «có thể đã gửi»):
   (a) `LoiDocLichSu.treMs` lùi DÀI theo tiền lệ `LoiChoMappingPancake.treMs` (`worker.js:101`): lượt 1 → 15 s, lượt 2 → 30 s (ba lượt phủ ≥ 45 s
   + thời gian đọc) — cùng chiều GL4 «tin tồn giữ ở chờ». Hằng có tên.
   (b) Chưa hết lượt ⇒ tin về `cho` (thử lại), KHÔNG gọi model, KHÔNG gửi, KHÔNG đụng `hoi_thoai`.
   (c) Hết lượt (`so_lan_thu >= TRAN_THU`) ⇒ trong CÙNG giao dịch: `hoi_thoai` → `SALE/HANDOFF`, `ly_do_cuoi='doc_lich_su_loi'` (điều kiện như
   `banGiaoLoi`: chỉ khi đang `AI` + GREET/QUALIFY/SELLING) **+ một dòng `viec_can_xu_ly`** chèn có điều kiện theo đúng khuôn `operations.js:162-172`
   (`NOT EXISTS` việc chưa đóng cùng hội thoại; `ly_do_day` «Pancake không trả lịch sử — bot CHƯA trả lời, CHƯA gửi gì»; `han_luc` như
   `PHUT_HAN_VIEC`). Tin chốt ở trạng thái KHÔNG chặn «trả AI»: `xong` với `ly_do='doc_loi:ban_giao'` (`lan_gui` rỗng ⇒ không cần đối chiếu).
   **Chỉ chèn việc khi UPDATE `hoi_thoai` đổi được ĐÚNG 1 dòng** (bot đang giữ, lẽ ra phải trả lời). UPDATE đổi 0 dòng (sale đang giữ · CLOSING ·
   POST_SALE — worker đọc lịch sử TRƯỚC khi xét chủ, `worker.js:128`) ⇒ tin `xong` `ly_do='doc_loi:khong_thuoc_ai'`, KHÔNG đẻ việc.
   Không gọi `banGiaoLoi` cho nhánh này. Sửa câu chú thích `worker.js:123` cho đúng.
   (c') **Lỗi SQL trong nhánh này** ⇒ về ĐƯỜNG CŨ (`loi` + `banGiaoLoi` qua catch lồng `worker.js:210-223`, hiện ở «tin lỗi» Vận hành). KHÔNG BAO GIỜ
   chốt `xong` khi chưa chèn được việc (đặt `trangThai` sau khi chèn thành, không đặt trước).
   (d) Các lỗi khác giữ nguyên đường cũ.
4. **Bộ nạp** (`nap.js:488-495`) — bắt `LoiDocLichSu` TỪNG hội thoại: bỏ hội thoại đó ở vòng này, `boQuaDs` lý do `doc_tin_loi`, KHÔNG ghi `mocDaXu`;
   một hội thoại lỗi KHÔNG làm bỏ cả page. **Lùi theo hội thoại**: `Map khoaMoc → {lan, toi}`, 30 s·2ⁿ, trần 5′, xoá khi đọc được; chưa tới `toi` thì
   không đọc lại (ghi `doc_tin_loi` vẫn được). Đếm `docTinLoi` vào kết quả nạp; `src/queue/chay-worker.js` cộng và IN trường này trong log vòng
   (`:116-123`, `:140-154`) — MỘT dòng tổng mỗi vòng, không một dòng mỗi hội thoại.
5. **Sổ bỏ-qua nhận `doc_tin_loi`** — migration mới `db/migrate/033_nap_bo_qua_doc_tin_loi.{up,down}.sql` (số đặt lúc phát; bị chiếm thì lấy số kế)
   nới CHECK `nap_bo_qua.ly_do` (`db/schema.sql:1578`, `023_nap_bo_qua.up.sql:36`); bản down `DELETE FROM nap_bo_qua WHERE ly_do='doc_tin_loi'` TRƯỚC
   khi dựng lại CHECK cũ (đường lùi không gãy); `db/schema.sql` SINH lại bằng `node db/migrate.js schema` (sửa tay ⇒ đỏ S11
   `test/l0-m1-luoc-do.test.js:398-404`); thêm nhãn vào `LY_DO`
   (`src/admin-v3/nap-bo-qua.js:11-36`, `ngo:true`, câu «Pancake không trả lịch sử — bot chưa trả lời khách này»). Lý do: `ghiBoQua` ghi cả vòng
   bằng MỘT câu INSERT rồi nuốt lỗi (`nap.js:341-354`) — một dòng sai CHECK xoá trắng dấu vết bỏ-qua của cả page trong vòng đó.
6. **Màn vận hành** (`v3/src/ui/van-hanh/router.js:359-382`) dùng `pkDocTin`: lỗi ⇒ `lichSuLoi` mang câu lỗi Pancake, không hiện «0 tin».
7. **`pkTagId`** — CHỈ cache khi đọc được bảng thẻ; đọc lỗi ⇒ không cache (vòng sau đọc lại). Giữ nguyên hành vi mỗi-vòng của `nap.js:266-275`
   (fail-open «thà quét thừa» là chủ ý cũ — đổi sang fail-closed cần người quyết ⇒ §9 nợ).
8. **F2** (`pkAddNote`) — chép nguyên công thức (vòng 2 sửa — bản vòng 1 làm phép đột biến ④8 của `gl3.sh` hết đỏ):
   ```
   thatBai = j?.success !== true && (j?.success === false || j?.khongRo || rong || permErr(j) || j?.biChan
             || (j?.error_code != null && Number(j.error_code) !== -1))
   ```
   kèm thêm `...(laBiCongChan(e) ? { biChan: true } : {})` vào dòng dựng `const loi = {…}` trong `pkFetchPage` (`src/pancake.js:231`, không phải neo).
   KHÔNG sửa dòng `return laBiCongChan(e) ? loi : …` (neo ④3 · ④10 của `gl3.sh`).
   **F3** (`pkFetchPage`, POST) — `if (!doc && j?.success === true) { ghi _pageTokIdx; return j; }` đặt TRƯỚC xét `permErr`.
   ⚠️ `ops/bin/nghiem-thu/gl3.sh:66,83-86,96-99` neo đảo-vá bằng chuỗi NGUYÊN VĂN + `count == 1`: giữ nguyên chuỗi `j?.success === false || j?.khongRo || rong`
   (chỉ NỐI THÊM phía sau) và dòng `if (!doc) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };`. Ca GL3 R7d
   (`test/gl3-han-cho-pancake.test.mjs:440-441`, `{data:{id:1}} ⇒ ok:true`) phải còn xanh.
9. `pkGetMessages` giữ nguyên chữ ký (công cụ `ops/bin/gia-lap-mot-minh.mjs:125`, `do-duong-ban.mjs:106` còn dùng); đường trả lời khách và màn vận hành
   không dùng nó nữa.

**Sửa sau review (a) 07/10:** C1 → ② 5 (migration nới CHECK) · C2 → ② 3 (nhánh riêng, lùi dài, dòng việc, không chặn «trả AI») · N1 → ③ · N2 → ② 8
· N3 → ② 2 + ② 3a · N4 → ② 4 · N5 → ② 7 · N6 → ④ · N7 → dòng «Đổi hợp đồng cửa» + ② 1. **Vòng 2:** R2-C1 → ② 8 (công thức F2 + `biChan`) ·
R2-C2 → ④10 (cổng cũ so với base) · R2-N1/N2 → ② 3c/c' · R2-N3 → ② 5 · R2-N4 → ② 2 · `inLuot` export → ③.

## ③ File được đụng

```
src/channels/messenger/index.js
src/channels/messenger/loi.js
src/pancake.js
src/queue/worker.js
src/queue/nap.js
src/queue/chay-worker.js
src/admin-v3/nap-bo-qua.js
v3/src/ui/van-hanh/router.js
db/migrate/033_nap_bo_qua_doc_tin_loi.up.sql
db/migrate/033_nap_bo_qua_doc_tin_loi.down.sql
db/schema.sql
docs/v3/ban-giao/cua-messenger-v1.md
test/l2-m1-nhac-truong.test.js
test/gl3b-*.test.mjs
ops/bin/nghiem-thu/gl3b.sh
```
`test/l2-m1-nhac-truong.test.js`: CHỈ thêm `pkDocTin` vào danh sách export của `mock.module` (`:119-138`) — đo 07/10: cửa import `pkDocTin` ⇒ 12/12 ca
đỏ vì mock thiếu export. `src/queue/chay-worker.js`: export `inLuot` (`:140`) để ④4b đo dòng log. Ca cũ khác phải sửa mà nằm ngoài ③ ⇒ dừng, báo tổng
kèm danh sách.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl3b.sh`, rc=0 khi đạt; fetch giả, KHÔNG mạng thật; ≥2 token; mở van gửi CHỈ trong tiến trình ca — không sửa `.env`; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; hộp cát `DB="aicloser_v3_nt_gl3b_p$$"` (migration 033 áp trong hộp cát); đảo-vá trên BẢN SAO tạm)

⚠️ Phép 1–4 đi **CỬA THẬT**: `chayMotVong` → `docTin` thật → `pkDocTin` → `pkFetchPage` → fetch giả (như repro r2). CẤM tiêm `docTin` / `getMessages` /
`cua` ở các phép này (tiêm `docTin` ném chỉ đo lại ca `phase1-chat-flow:113` đã có). Khẳng định `congHttpGhi.daChan` rỗng ở mọi phép có POST.

1. Đọc lịch sử QUÁ HẠN (hạn rút ngắn qua biến) và đọc 502 HTML: lượt 1 ⇒ `thu_lai`, `thu_lai_luc` ≥ now+~15 s; lượt 2 ⇒ ~30 s; 0 POST gửi khách, 0 lượt
   gọi model, fetch giả nhận ≥1 `GET …/messages` mỗi lượt. Lượt 3 (hết) ⇒ `hoi_thoai` `SALE/HANDOFF` `ly_do_cuoi='doc_lich_su_loi'`; `viec_can_xu_ly`
   ĐÚNG 1 dòng mở; tin `xong` `ly_do='doc_loi:ban_giao'`; `resumeConversation` (trả AI) THÀNH; Pancake lành, khách nhắn tiếp ⇒ bot trả lời (1 POST).
   Lý do ghi trên tin nói đúng «Pancake lỗi/quá hạn», KHÔNG «không có token». Đọc trong hạn ⇒ hành vi như cũ.
   Cảnh phụ: hội thoại SALE đang giữ (hoặc CLOSING) + đọc lỗi hết lượt ⇒ tin `xong` `doc_loi:khong_thuoc_ai`, `viec_can_xu_ly` KHÔNG thêm dòng.
   Cảnh phụ: ép câu SQL chèn việc lỗi ⇒ tin `loi` + `banGiaoLoi` (không `xong`).
2. Lịch sử có tin page/sale vừa gõ (đọc được) ⇒ `ketQua === KET_QUA.NHUONG_PAGE`, fetch giả nhận ≥1 `GET …/messages`, 0 POST.
3. Lỗi quyền mọi token / thân không có danh sách ⇒ như phép 1 (lượt 1).
4. Rỗng THẬT (`messages: []`) ⇒ worker trả lời bình thường (1 POST).
4b. Bộ nạp (hộp cát): page 3 hội thoại cùng vòng — `c-the` mang thẻ chặn · `c-loi` đọc lỗi · `c-ok` đọc được. ⇒ `c-ok` vào hàng; `c-loi` KHÔNG vào hàng,
   KHÔNG ghi mốc; `nap_bo_qua` có dòng `c-loi` `ly_do='doc_tin_loi'` VÀ dòng `c-the` `the_chan` cùng vòng vẫn còn; kết quả nạp `docTinLoi=1` và log
   vòng in trường đó. Vòng sau trong thời gian lùi ⇒ KHÔNG gọi `docTin` cho `c-loi`; quá `toi` + đọc được ⇒ `c-loi` vào hàng (tin không mất).
   Migration: hộp cát có một dòng `doc_tin_loi` ⇒ `down` 033 chạy THÀNH ⇒ `up` lại THÀNH.
5. Màn vận hành: dựng sẵn `tin_cho_xu_ly` có `conv_id/cust_id` (KHÔNG đi nhánh `!moc` `router.js:369`); fetch giả lỗi ⇒ `lichSuLoi` chứa đúng câu lỗi
   Pancake và fetch giả đã được gọi.
6. `pkTagId`: `/settings` lỗi ⇒ không cache; lần gọi sau (trong 10′) gọi fetch lại và đọc được ⇒ trả đúng id thẻ.
7. F2: `{error_code:105}` ở MỌI token ⇒ `pkAddNote` thất bại, fetch giả gọi ĐÚNG bằng số token (≥2); cổng ghi chặn ⇒ thất bại; `{data:{id:1}}` ⇒ `ok:true`
   (R7d giữ). F3: `{success:true, error_code:121}` ⇒ thành, fetch gọi ĐÚNG 1 lần (≠0).
8. `grep -nE "pkGetMessages" src/channels/messenger/index.js src/queue/*.js v3/src/ui/van-hanh/router.js` (bỏ dòng chú thích) = 0.
9. Đảo-vá: cửa trả về `pkGetMessages` ⇒ phép 1 đỏ (1 POST); bỏ chèn `viec_can_xu_ly` ⇒ phép 1 đỏ; bỏ migration 033 ⇒ phép 4b (dòng `doc_tin_loi` + `the_chan`)
   đỏ; bộ nạp ghi mốc khi đọc lỗi ⇒ 4b đỏ; bỏ lùi theo hội thoại ⇒ 4b đỏ; bỏ nhánh nhường page ⇒ phép 2 đỏ; router về `pkGetMessages` ⇒ phép 5 đỏ;
   `pkTagId` cache khi lỗi ⇒ phép 6 đỏ; bỏ vế mới của F2 ⇒ phép 7-F2 đỏ; bỏ xét `success` trước ⇒ phép 7-F3 đỏ (2 POST).
10. XANH TUYỆT ĐỐI (rc tách dòng): `gl3.sh` · bộ ca `test/l1-m2-cua.test.js` · `test/va-r1-van-gui.test.js` · `test/phase0-webhook-delivery.test.js` ·
    `test/l2-m1-nhac-truong.test.js` · `test/phase1-chat-flow.test.js` · `test/l2-m1-hang-doi.test.js` · `test/va-p7-chay-worker.test.js` ·
    `test/gl3-han-cho-pancake.test.mjs` · `test/l0-m1-luoc-do.test.js`. **So với base** (chạy ở base rồi sau sửa, in HAI danh sách phép đỏ, không thêm
    phép đỏ): `l1-m2.sh` (phép ①b đã đỏ từ base — `src/orders/legacy*.js` import `pancake.js`, ngoài ③) · `gsp3b.sh` · `ll2.sh`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl3b-*.test.mjs` (cửa thật + fetch giả: quá hạn · 502 · lỗi quyền · rỗng thật · có tin sale; hết lượt ⇒ việc + trả AI; bộ nạp đọc lỗi + lùi + sổ
bỏ-qua; màn vận hành; `pkTagId`; `pkAddNote`; POST success + error_code).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

`banGiaoLoi` không thẻ/ghi chú Pancake, không trần 24h (README 13 ⑥ — GL6) · `pkGetConversations` nuốt lỗi ⇒ vòng nạp «0 hội thoại» như không ai nhắn
(cần bộ đếm — GL6) · F4 nặng lên: ghim nhầm token ⇒ mọi lượt đọc của page lỗi ⇒ bàn giao ≤5′ (nâng N-GL3-DOC-NHAN-TOKEN) · F5 thân thật POST `/notes` ·
F6 `phaLoi:'ket_noi'` không phải bằng chứng «chưa gửi byte nào» · F7 hạn 30 s cắt gửi ảnh lớn · `pkTagId` đọc lỗi trong vòng vẫn fail-open (chọn
fail-closed cần người quyết) · **GL4 phải tính cả `LoiDocLichSu`** (đọc chạy trước gửi — Pancake sập thì tin chết ở bước đọc trước khi GL4 thấy lỗi gửi) ·
migration 033 áp trên VPS TRƯỚC mã mới (mo-van §5) · tin đọc lỗi chốt `xong` ⇒ không còn trong đếm «tin lỗi» Vận hành (`tom-tat.js:17-23`) — bộ đếm «đọc lỗi» cho đèn: GL6.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GL3"
(5 nợ N-GL3-* do thợ GL3 ghi 06/10 — gồm N-GL3-DOC-NHAN-TOKEN · N-GL3-THE-RONG-10P)
```
Quan hệ: **mới** (đối kháng GL3 F1 · F2 · F3) + **trả nợ N-GL3-THE-RONG-10P** (phần cache).
