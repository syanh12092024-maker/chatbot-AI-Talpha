# Nhật ký phiếu GL3b — đọc lịch sử Pancake lỗi/chậm: KHÔNG trả lời mù, KHÔNG câm im — lùi dài rồi giao sale CÓ dòng việc (07/10/2026 · thợ GL3b)

**Môi trường đo:** máy dev (Node v24), `fetch` GIẢ trong mọi ca (host ≠ `pages.fm` ⇒ ném), 2 token giả, hộp cát Postgres
127.0.0.1:5432 (`aicloser_v3_test_gl3b_{w,nap,vh}_p<pid>`, tự dựng/dọn qua `db/sandbox.js`, migration 033 áp trong hộp cát). Không một lượt
mạng thật, không đo prod. `.env` giữ `PANCAKE_READONLY=1` (cổng ⓪ đọc lại mỗi lượt); ca mở van trong `process.env` của tiến trình ca SAU khi
cài fetch giả, và khẳng định `congHttpGhi.daChan` không tăng. Làn 🟥. Base `08ff546` (phiếu `2c72688`). Commit mã: **`7065e41`**.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GL3"
1237:  - **N-GL3-DOC-NHAN-TOKEN** (/code-review GL3 #4 #5) hạn tính theo TỪNG token: ĐỌC quá hạn ⇒ xoay ⇒ một page treo chặn vòng poll tuần tự tới
1240:  - **N-GL3-THE-RONG-10P** (/code-review GL3 #6, có từ trước GL3) `pkTagId` cache bảng thẻ RỖNG 10′ khi đọc `/settings` lỗi (nay gồm quá hạn
1242:  - **N-GL3-SINH-TOKEN-XOAY** …   1244: **N-GL3-AN-TOAN-TOKEN-FILE** …   1246: **N-GL3-ANH-THU-LAI** …
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md   → cả hai không tồn tại
```
Quan hệ: mới (đối kháng GL3 F1 · F2 · F3) + **trả nợ N-GL3-THE-RONG-10P** (phần cache). Không trùng phán cũ.

## Bước 3 — đo lại nguyên liệu đề bài (ở `08ff546`)
`git show 08ff546:<tệp> | grep -n` — mọi chỗ phiếu dẫn đều đúng, chỉ lệch ±1 dòng:
- `channels/messenger/index.js:159 docTin` · `:165 getMessages = pkGetMessages` ✔ · `pancake.js:325 pkDocTin` · `:329` câu «không có token…» (phiếu ghi
  :328) · `:331 pkGetMessages` · `:238 if (e?.thanHong) j = {}` · `:231 const loi = {…}` · `:346 pkTagId` (phiếu :347) · `:394 pkAddNote` ✔
- `queue/worker.js:28 banGiaoLoi` · `:101 treMs = 5000` · `:123` lời khai «không trả lời mù» · `:149` cửa nhường cần `lichSu.length` · `:216` catch lồng ✔
- `queue/nap.js:489 docT` · `:494 if (moc) mocDaXu.set` (ghi mốc khi `[]`) · `:332 ghiBoQua` (một INSERT nhiều dòng, nuốt lỗi) ✔
- `db/schema.sql:1578` CHECK 6 mã · `van-hanh/router.js:372-373 pkGetMessages` ✔ · tên ràng buộc thật `nap_bo_qua_ly_do_check` (ca N5 đọc `e.constraint`).
- Repro r2 của reviewer chạy lại được bằng ca P1a (dữ liệu = page đã trả lời, Pancake chậm hơn hạn đọc).

## Đã làm (commit `7065e41`, 17 tệp — đúng ③)
- `src/channels/messenger/loi.js` + `index.js` — `LoiDocLichSu` (khuôn lỗi có tên của cửa, export từ cửa). `docTin` đi `pkDocTin`: `ok:true` ⇒ mảng
  (rỗng thật hợp lệ); `ok:false` ⇒ NÉM `LoiDocLichSu("Pancake không trả lịch sử: <câu lỗi>")`. Tiêm `getMessages` giữ hợp đồng cũ (trả mảng = đọc được).
  Bỏ import `pkGetMessages` khỏi cửa.
- `src/pancake.js` — `pkDocTin` nói đúng lý do (`lyDoDocLoi`): «Pancake lỗi (HTTP 502) — thân trả về không phải JSON» · «Pancake quá hạn — quá hạn
  150 ms chờ Pancake (GET …)» (giữ chuỗi con GL3) · «Pancake lỗi mạng — … (ECONNREFUSED)» · câu của chính Pancake · «Pancake từ chối (mã 105)» ·
  «Pancake trả thân rỗng…» (còn token) · «không có token Pancake nào còn hạn» (chỉ khi thật sự hết token). Thân hỏng ĐỌC: `j = {thanHong, message}`
  thay `{}` (vẫn 1 lượt, không xoay; nơi đọc `j.conversations` thấy rỗng như cũ; neo `e.thanHong = true;⏎ throw e;` của gl3.sh không đụng).
  `biChan` vào khung lỗi khi cổng ghi chặn. F3: `if (!doc && j?.success === true) { ghi _pageTokIdx; return j; }` TRƯỚC `permErr`. F2: chép nguyên công
  thức ② 8 (chuỗi neo `j?.success === false || j?.khongRo || rong` giữ, chỉ nối sau). `pkTagId`: chỉ cache khi có `settings`; đọc lỗi ⇒ không cache
  10′, giữ lỗi 5 s cho lượt dồn dập (sau /code-review #2). `pkGetMessages` giữ chữ ký, chú thích «đường trả lời không dùng nữa».
- `src/queue/worker.js` — nhánh RIÊNG trong `catch` cho `LoiDocLichSu` (`!daGui`): lượt < `TRAN_THU` ⇒ `cho`, lùi `TRE_DOC_LICH_SU_MS = [15 000, 30 000]`,
  0 model 0 gửi 0 đụng `hoi_thoai`; hết lượt ⇒ `banGiaoDocLoi` trong CÙNG giao dịch: UPDATE `hoi_thoai` → SALE/HANDOFF `doc_lich_su_loi` chỉ khi
  `chu_so_huu='AI'` + GREET/QUALIFY/SELLING + `page.bot_ai_bat` + nguồn khớp (cửa đầu handler-v3) ⇒ đổi ĐÚNG 1 dòng mới chèn `viec_can_xu_ly`
  (khuôn `operations.js#handoffConversation`, `NOT EXISTS` việc mở, hạn `PHUT_HAN_VIEC`) + nhật ký `tin_doc_loi_ban_giao`; tin `xong`
  `doc_loi:ban_giao` (UPDATE 0 dòng ⇒ `doc_loi:khong_thuoc_ai`, không việc); cụm gom theo chốt `gom_vao_tin:<id>`. SQL lỗi trong nhánh ⇒ catch lồng
  đường cũ (`loi` + `banGiaoLoi`), `xong` chỉ đặt sau khi chèn thành. Sửa lời khai `:123` và lời khai cửa nhường (`:146-148`), bảng đầu tệp.
- `src/queue/nap.js` — bắt `LoiDocLichSu` TỪNG hội thoại: không ghi mốc, sổ bỏ-qua `doc_tin_loi` (câu lỗi), `docTinLoi++`, vòng đi tiếp. Lùi theo hội
  thoại `luiDocTin: khoaMoc → {lan, toi, loi}`, 30 s·2ⁿ trần 5′, đứng TRƯỚC chờ-gõ-xong, xoá khi đọc được; đọc lỗi trả lại mục chờ-gõ đã qua (hết lùi đọc
  ngay); lần lùi trước hết quá 5′ ⇒ sự cố mới, lan=1 (hai điều sau /code-review #5 #6). `quenMoc()` xoá cả sổ lùi; `donMoc()` dọn cả sổ lùi.
- `src/queue/chay-worker.js` — cộng `docTinLoi`, in `N đọc-tin-lỗi` trong MỘT dòng log vòng; export `inLuot`.
- `db/migrate/033_nap_bo_qua_doc_tin_loi.{up,down}.sql` — nới CHECK (+`doc_tin_loi`); down XOÁ dòng `doc_tin_loi` trước khi dựng CHECK cũ.
  `db/schema.sql` SINH lại (`node db/migrate.js schema`, S11 xanh).
- `src/admin-v3/nap-bo-qua.js` — `LY_DO.doc_tin_loi` (`ngo:true`, «Pancake không trả lịch sử — bot chưa trả lời khách này…»).
- `v3/src/ui/van-hanh/router.js` — `pkDocTin`; `ok:false` ⇒ `lichSuLoi` = câu lỗi Pancake.
- `docs/v3/ban-giao/cua-messenger-v1.md` — `docTin` NÉM `LoiDocLichSu` (dòng 35 · khối import · mục lỗi), CÙNG commit.
- `test/l2-m1-nhac-truong.test.js` — CHỈ thêm `pkDocTin` vào mock.
- Ca: `test/gl3b-worker-doc-loi.test.mjs` (P0 P1a–f P2 P3a P3b P4) · `test/gl3b-nap-doc-loi.test.mjs` (N1–N7) · `test/gl3b-pancake-van-hanh.test.mjs`
  (D1 T6 F2 F3 V5). Cổng `ops/bin/nghiem-thu/gl3b.sh`.

## Quyết định · giả định (luật 11/13)
- **Q1** `ketQua` lượt cuối: chuỗi mới `doc_loi_ban_giao` / `doc_loi_khong_thuoc_ai` (không thêm vào `KET_QUA` của handler-v3 — ngoài ③). `chayToiKhiHet`
  đếm theo khoá động nên log vòng in được `"doc_loi_ban_giao":1` — tín hiệu một phần cho đèn (nợ N-GL3B-DEM-DOC-LOI).
- **Q2** cụm gom theo (webhook) chốt `xong` `gom_vao_tin:<id>` khi hết lượt — phiếu không ghi. Lý do: để `cho` thì tới lượt gặp SALE ⇒ `chan_guard` ⇒
  chặn «trả AI» (`reconcile.js:53-57`) — đúng cái C2 sửa. Giá: các tin đó không xử riêng (sale đã có việc cho cả hội thoại).
- **Q3** HTTP 5xx mà thân LÀ JSON: `goiPancake` không mang status ⇒ câu lỗi là câu của Pancake. «Pancake lỗi (HTTP …)» áp cho thân KHÔNG phải JSON
  (502/504 HTML của cổng) — không đổi hình dạng trả của `goiPancake` (6 nơi gọi, neo gl3.sh).
- **Q4** `docTinLoi` đếm CẢ hội thoại vừa lỗi LẪN đang lùi (vẫn chưa được phục vụ) — một trường.
- **Q5** lùi đứng TRƯỚC chờ-gõ-xong (sau mốc cũ): đứng sau thì dòng sổ nhảy `cho_go_xong` ↔ `doc_tin_loi` mỗi vòng. (Giá «hết lùi phải chờ gõ lại» đã
  bỏ bằng bản vá /code-review #5.)
- **Q6** `pkTagId` «đọc được» = có `settings` (object), kể cả không có `tags` — page không thẻ vẫn cache.
- **Q7 — LỆCH CHỮ PHIẾU ② 7:** phiếu ghi «đọc lỗi ⇒ không cache». Tôi GIỮ lỗi 5 s/page (lượt dồn dập trả null, không gọi lại). Lý do (đo đọc mã,
  /code-review #2): `page-registry.js#verifyTags` (dùng ở `core/khoi-dong-loi.js` + màn sẵn sàng v3) hỏi 3 tên liền nhau và quy ước «cả 3 null = CHƯA
  BIẾT»; không giữ thì tên 1 lỗi · tên 2 đọc được ⇒ «thiếu tên 1» ⇒ CHẶN AI oan. 5 s < nhịp vòng nạp 6 s ⇒ «vòng sau đọc lại» vẫn đúng. Giá: trong
  5 s sau lỗi, lượt gọi khác (vd `pkTagByName` khi gửi) cũng nhận null.
- **Q8** `PHUT_HAN_VIEC` import từ `admin-v3/operations.js` (một nguồn hằng; operations chỉ import `queue/page-routing.js` — không vòng). Giá: worker kéo
  thêm catalog/pos vào đồ thị module (/code-review #8 — nợ).
- **Q9 — VƯỢT CHỮ PHIẾU ② 3c:** điều kiện bàn giao thêm `page.bot_ai_bat` + nguồn khớp (phiếu: «điều kiện như banGiaoLoi»). Lý do (/code-review #7):
  page đã tắt bot gặp Pancake lỗi bị lật SALE + đẻ việc nhiễu; điều kiện mới = cửa đầu `handler-v3.js:372`. Thêm nhật ký `tin_doc_loi_ban_giao`.

## Danh sách ca (④ phiếu → ca)
| ④ | ca | đo gì |
|---|---|---|
| 1 | P0 · P1a · P1b | đọc trong hạn ⇒ 1 POST · quá hạn / 502: lượt 1 lùi ≈15 s, lượt 2 ≈30 s (đồng hồ CSDL), 0 POST · 0 GHI · 0 lượt não · GET≥1/lượt, ly_do «Pancake quá hạn/lỗi (HTTP 502)» không «token»; lượt 3: SALE/HANDOFF `doc_lich_su_loi` + ĐÚNG 1 việc mở + tin `xong doc_loi:ban_giao` + 0 `lan_gui`; trả AI THÀNH; Pancake lành + khách nhắn ⇒ 1 POST |
| 1 (phụ) | P1c · P1d · P1f | SALE/HANDOFF · AI/CLOSING · page tắt bot ⇒ `xong doc_loi:khong_thuoc_ai`, 0 việc thêm, hội thoại không đổi |
| 1 (phụ) | P1e | trigger ép INSERT việc lỗi ⇒ tin `loi` + `banGiaoLoi` (`loi_xu_ly_can_doi_chieu`), 0 việc, KHÔNG `xong` |
| 2 | P2 | lịch sử có tin page ⇒ `nhuong_page`, GET≥1, 0 POST, 0 lượt não |
| 3 | P3a · P3b | 105 ở mọi token (GET=2) · thân không danh sách ⇒ như lượt 1 |
| 4 | P4 | `messages: []` ⇒ 1 POST |
| 4b | N1–N4 · N6 · N7 | 3 hội thoại cùng vòng: c-ok vào hàng · c-loi không hàng, sổ `doc_tin_loi` + dòng `the_chan` cùng vòng còn · `docTinLoi=1` · dòng log in `1 đọc-tin-lỗi`; t+10 s 0 GET; t+31 s đọc lại, lùi 60 s; t+92 s lành ⇒ vào hàng (tin không mất); N6 hết lùi đọc ngay (chờ gõ 5 s thật); N7 sự cố mới lùi 30 s |
| 4b | N5 | có dòng `doc_tin_loi` ⇒ down 033 THÀNH (dòng xoá, CHECK cũ chặn) ⇒ up THÀNH (CHECK vẫn chặn mã lạ) |
| ② 2 | D1 | câu lỗi pkDocTin: quá hạn (GET=2) · 502 (GET=1, pkGetConversations [] như cũ) · mạng · 105 · `{}` có token · hết token (0 fetch) · rỗng thật |
| 5 | V5 | HTTP thật (express + router thật + hộp cát), tin có conv/cust: lỗi Pancake / 502 ⇒ `lichSuLoi` đúng câu, fetch ≥1; đọc được ⇒ null |
| 6 | T6 | 502 / mạng / quá hạn: lỗi ⇒ null; lượt dồn dập trong 5 s ⇒ null, 0 fetch; +5 s ⇒ gọi lại, đúng id; +9′ ⇒ cache |
| 7 | F2 · F3 | `{error_code:105}` ×2 token ⇒ thất bại, fetch=2, cổng 0 chặn; cổng chặn ⇒ thất bại, fetch 0, cổng +1, không `khongRo`; `{data:{id:1}}` ⇒ ok; `{success:true,error_code:121}` ⇒ ok, fetch=1 (gửi chữ + ghi chú) |
| 8 | gl3b.sh ④ | `grep pkGetMessages` (bỏ chú thích) trên cửa + queue + router = 0 |

## Bằng chứng ĐỎ trên base (ca đã có, mã chưa sửa — cây chung lúc `2c72688`)
```
gl3b-worker-doc-loi   pass 3 fail 7   ✔ P0 P2 P4 (hành vi cũ giữ) · ✖ P1a P1b P1c P1d P1e P3a P3b
   [gl3b] P1a lượt 1: ketQua=xong · GET +2 · POST +1 · não +2 · ly_do=fastlane:test      ← trả lời MÙ (repro r2)
   [gl3b] P1b lượt 1: ketQua=xong · GET +1 · POST +1 …   P3a/P3b: POST +1
gl3b-nap-doc-loi      pass 0 fail 5   N1: c-loi = 'page_noi_cuoi' (chờ 'doc_tin_loi') · N2: 'moc_cu' · N3/N4: GET +0 ⇒ tin MẤT · N5: gỡ 032 thay vì 033
gl3b-pancake-van-hanh pass 0 fail 5   F2 105×2 → {"ok":true} · F3 fetch=2 (gửi lần hai) · D1 · T6 · V5 đỏ
```
(Lượt đầu tệp nạp đỏ vì `import { inLuot }` thiếu export — đổi sang nhập namespace để mỗi ca đỏ đúng lý do nghiệp vụ, kết quả trên.)

## Đảo-vá (`gl3b.sh` ⑤, đo bản SAU /code-review) — 18/18 đỏ đúng
| đột biến | ca phải đỏ | đỏ thật |
|---|---|---|
| ⑤a cửa về `pkGetMessages` (lỗi ⇒ `[]`) | P1a P1b P3a P3b | P1a P1b P3a P3b |
| ⑤b bỏ chèn `viec_can_xu_ly` | P1a P1b | P1a P1b |
| ⑤c bỏ migration 033 | N1 N5 | N1 N2 N3 N5 |
| ⑤d nạp ghi mốc khi đọc lỗi | N2 N3 N4 | N2 N3 N4 N6 N7 |
| ⑤e bỏ lùi theo hội thoại | N2 N3 | N2 N3 |
| ⑤f bỏ nhánh nhường page | P2 | P2 |
| ⑤g router về `pkGetMessages` | V5 | V5 |
| ⑤h `pkTagId` cache khi lỗi | T6 | T6 |
| ⑤i bỏ vế mới F2 | F2 | F2 |
| ⑤j bỏ xét `success` trước `permErr` (F3) | F3 | F3 |
| ⑤k lùi ngắn 1 s·2ⁿ | P1a P1b P3a P3b | P1a P1b P3a P3b |
| ⑤l bỏ điều kiện bot đang giữ | P1c P1d | P1c P1d |
| ⑤m / ⑤m2 câu quá hạn khai «hết token» | P1a / D1 | P1a / D1 |
| ⑤n bỏ trả lại mục chờ-gõ | N6 | N6 |
| ⑤o mang lần lùi của sự cố cũ | N7 | N7 |
| ⑤p bỏ giữ lỗi 5 s của `pkTagId` | T6 | T6 |
| ⑤q bỏ điều kiện page bật bot/nguồn | P1f | P1f |
| ⑤0 bản sao nguyên vẹn | (xanh) | pass=23 fail=0 |
**Đột biến nào KHÔNG đỏ:** «đặt `xong` trước khi chèn việc» (nuốt lỗi `banGiaoDocLoi`) — không viết được thành đột biến sống: giao dịch đã abort nên
`ketThuc(XONG)` cũng ném ⇒ vẫn rơi về `loi` (CSDL tự giữ bất biến; ca P1e đo đường đó). Gl3.sh ④8/④8b/④10/④11 vẫn đỏ đúng trên mã mới (`gl3.sh` 25/25).

## /code-review (high) — 8 phát hiện, kiểm chứng trước khi sửa
| # | phát hiện | kiểm chứng | xử lý |
|---|---|---|---|
| 1 | webhook: `docHoiThoai`→`pkGetConversations` nuốt lỗi ⇒ `LoiChoMappingPancake` (5 s×3) ⇒ `banGiaoLoi` + tin `loi`, không việc, «trả AI» chặn — nhánh GL3b không chạy khi Pancake sập thật | ĐÚNG (đọc mã `worker.js:134-142`, `reconcile.js:54`) | NGOÀI hợp đồng (đổi hợp đồng `docHoiThoai`; phiếu ⑥ để `pkGetConversations` cho GL6) ⇒ nợ **N-GL3B-WEBHOOK-MAPPING** (nặng nếu page pilot là webhook) |
| 2 | `pkTagId` bỏ cache ⇒ `verifyTags` gãy bất biến «3 null = chưa biết» ⇒ chặn AI oan | ĐÚNG (`page-registry.js:133-150`) | SỬA: giữ lỗi 5 s (Q7) · ca T6 · đột biến ⑤p |
| 3 | poll: đọc lỗi bền ⇒ lùi mãi, không bao giờ thành việc | ĐÚNG | thiết kế ② 4 của phiếu ⇒ nợ **N-GL3B-NAP-LOI-BEN** (cần người quyết) |
| 4 | không cache âm /settings ⇒ tải mỗi vòng | MỘT PHẦN | bản vá #2 giảm còn ≤1 lượt/5 s/page; phần còn lại gộp **N-GL3-DOC-NHAN-TOKEN** |
| 5 | `choGoXong.delete` trước đọc ⇒ hết lùi phải chờ gõ lại | ĐÚNG | SỬA · ca N6 · ⑤n |
| 6 | `luiDocTin` giữ `lan` cũ khi hội thoại rời đi rồi quay lại | ĐÚNG | SỬA (hết lùi quá 5′ ⇒ lan=1) · ca N7 · ⑤o |
| 7 | `banGiaoDocLoi` không xét `bot_ai_bat`/nguồn, không nhật ký | ĐÚNG | SỬA (Q9) · ca P1f · ⑤q |
| 8 | import `PHUT_HAN_VIEC` từ admin-v3; INSERT việc hai bản; UPDATE `gom_vao_tin` ba bản | ĐÚNG | GIỮ (tách helper phải sửa `operations.js`, ngoài ③) ⇒ nợ **N-GL3B-KHUON-VIEC-HAI-BAN** |

## Mốc số ca
- `npm test` BASE (`2c72688`, chưa chép tệp nào): **tests 2489 · pass 2485 · fail 0** (skip 4), 26 s.
- `npm test` sau sửa (trước review, 20 ca GL3b): **2509 · 2505 · 0**. Sau review (23 ca GL3b, ⑧ của lượt đầy đủ): **tests 2512 · fail 0**.

## Cổng `gl3b.sh`
Lần 2 (sau review, không cờ) — `ĐỎ 0 / XANH 35`, rc=0, 81 s:
```
✅ ①phép-1–4-worker-cửa-thật pass=11 fail=0 · xanh: P0 P1a P1b P1c P1d P1e P1f P2 P3a P3b P4
✅ ②phép-4b-bộ-nạp-+-migration-033 pass=7 fail=0 · xanh: N1 N2 N3 N4 N5 N6 N7
✅ ③phép-②2·5·6·7-pancake-+-màn-Vận-hành pass=5 fail=0 · xanh: D1 F2 F3 T6 V5
✅ ④phép-8-không-còn-pkGetMessages-trên-đường-trả-lời dòng mã=0 (đòi 0)
✅ ④b-pancake.js-vẫn-một-cửa-fetch fetch( mã=1 (đòi 1) · goiPancake( =6 (đòi 6)
✅ ⑤a … ⑤q (18 đảo-vá, bảng trên) · ✅ ⑤0-bản-sao-nguyên-vẹn-xanh pass=23 fail=0
✅ ⑥gl3.sh rc=0 · == ĐỎ 0 / XANH 25
✅ ⑥l1-m2-cua rc=0 17/0 · va-r1-van-gui 6/0 · phase0-webhook-delivery 15/0 · l2-m1-nhac-truong 12/0 · phase1-chat-flow 12/0
✅ ⑥l2-m1-hang-doi 28/0 · va-p7-chay-worker 7/0 · gl3-han-cho-pancake 18/0 · l0-m1-luoc-do 13/0
⏸ ⑦ / ⑧ hoãn (cờ)
```
Lượt đầy đủ `CHAY_SO_BASE=1 CHAY_NPM_TEST=1` (02:16→03:27) — `ĐỎ 1 / XANH 38`, rc=1: mọi phép ①–⑥ như trên; ⑧ npm test 2512/0;
⑦ — ba cổng «so với base» (worktree tạm ở `08ff546`, chuẩn hoá số id/pid), HAI danh sách dòng đỏ:
```
── l1-m2 · BASE 08ff546 rc=1 · 1 dòng đỏ:
   base │ ✘ danh sách file import pancake.js trong src/{db,pos,channels,chat,orders,queue}: thật=src/channels/messenger/index.js
          src/orders/legacy-capture.js src/orders/legacy.js · chờ=src/channels/messenger/index.js
── l1-m2 · SAU SỬA rc=1 · 1 dòng đỏ:   (y hệt — ①b đỏ SẴN từ base, src/orders/* ngoài ③)
✅ ⑦so-base-l1-m2 rc base=1 · sau=1 · dòng đỏ MỚI=0
── ll2 · BASE rc=0 · 0 dòng đỏ   ── ll2 · SAU SỬA rc=0 · 0 dòng đỏ
✅ ⑦so-base-ll2 rc base=0 · sau=0 · dòng đỏ MỚI=0
── gsp3b · BASE 08ff546 rc=0 · 0 dòng đỏ
── gsp3b · SAU SỬA rc=1 · 5 dòng đỏ:
   sau │ 🔴 ③thước v3/test/b/ll18-khung.test.mjs fail=1          ← trong ve6c, lan lên:
   sau │ 🔴 ⑤cổng-trước ve6c.sh · 🔴 ④cổng-trước ve2b.sh · 🔴 ⑥cổng-cũ-ll15d rc=1 · 🔴 ⑥cổng-cũ-gs… (so với aa43268)
🔴 ⑦so-base-gsp3b rc base=0 · sau=1 · dòng đỏ MỚI=5 (đòi 0)
✅ ⑧npm-test tests=2512 fail=0
== ĐỎ 1 / XANH 38   (rc=1)
```
**Lượt này chạy CHỒNG** hai lượt đo khác khởi động sau nó (`gsp3c.sh` worktree GSP3c · `_chan1.sh tt1` — tổng đã dừng tt1). Năm dòng đỏ là MỘT gốc: `ll18-khung`
đỏ 1 lần bên trong `ve6c.sh` rồi lan lên chuỗi lồng. Chạy riêng để phân biệt (cây GL3b, GSP3c vẫn chạy song song):
- `v3/test/b/ll18-khung.test.mjs` riêng: **16/0** (không tham chiếu tệp nào của GL3b) · `ve6c.sh` riêng: **ĐỎ 0 / XANH 11** · `ll15d.sh` riêng: **ĐỎ 0 / XANH 21**.
- `gsp3b.sh` chạy riêng lại (03:30→04:09): **ĐỎ 1 / XANH 54** — lần này ll15d/gsp1/gsp2/ve2/ve2b/ve8b XANH; đỏ duy nhất `⑥cổng-cũ-gsp3` với gốc MỘT ca khác:
  `v3/test/b/vai-b-noi-day.test.mjs fail=1` trong ve7b, lan lên ve7c → ve7d → ve7e → gsp3 — đúng nợ chập chờn đã có **N-VAI-B-NOI-DAY-CHAP-CHON** (§9
  dòng 1598 · 1621). `vai-b-noi-day` riêng: **5/0 · 5/0**; `gsp3.sh` riêng: **ĐỎ 0 / XANH 43**. `va-r2` đỏ SẴN ở aa43268 (gsp3b tự đối chứng: 0 dòng mới).
- Kết luận (máy dev, buổi 07/10 không lúc nào yên): hai lượt gsp3b đỏ ở hai chỗ KHÁC nhau, mỗi chỗ là một ca chập chờn xanh khi chạy riêng, không ca
  nào chạm tệp GL3b ⇒ không dòng đỏ nào do GL3b. NHƯNG ⑦ của `gl3b.sh` chưa in được rc=0 trong MỘT lượt sạch — nói thẳng: cần chạy lại
  `CHAY_SO_BASE=1 gl3b.sh` lúc cây yên (0 lượt đo khác) để có bằng chứng một-lượt.

## Nợ (ngoài phạm vi — mã nợ)
Đã APPEND §9 sổ (khối «07/10 · GL3b (thợ)»), nguyên văn:
  - **N-GL3B-WEBHOOK-MAPPING** (/code-review GL3b #1, đọc mã) page WEBHOOK: worker tra mapping qua `docHoiThoai` → `pkGetConversations` (nuốt lỗi ⇒ [])
    TRƯỚC khi đọc lịch sử ⇒ Pancake sập thật thì ném `LoiChoMappingPancake` (lùi 5 s × 3, `worker.js:134-142`) ⇒ `banGiaoLoi` cũ: tin `loi`,
    `loi_xu_ly_can_doi_chieu`, KHÔNG dòng việc, «trả AI» bị chặn (`reconcile.js:54`). Nhánh GL3b chỉ chạy khi mapping đọc được mà lịch sử lỗi. Sửa cần
    `docHoiThoai` nói lỗi (đổi hợp đồng cửa). NẶNG nếu page pilot nhận tin qua webhook.
  - **N-GL3B-NAP-LOI-BEN** (/code-review #3) page POLL: đọc lịch sử lỗi BỀN (121 không ghế gói · «Thiếu mã khách hàng» · Pancake sập lâu) ⇒ bộ nạp lùi
    mãi (trần 5′), không xếp tin ⇒ worker không thấy ⇒ KHÔNG dòng việc; chỉ có dòng `doc_tin_loi` (đáng ngờ) ở «Tin bị lọc». Cần người quyết: trần số
    lần lùi rồi xếp tin (worker giao sale như nhánh GL3b) hay bộ nạp tự đẻ việc.
  - **N-GL3B-CONV-NUOT-LOI** (phiếu ⑥ · review (a) G2) `pkGetConversations` nuốt lỗi ⇒ vòng nạp «0 hội thoại» y như không ai nhắn — cần bộ đếm (GL6).
  - **N-GL3B-BANGIAOLOI-PANCAKE** (phiếu ⑥ · review (a) G1) `banGiaoLoi` (và `banGiaoDocLoi`) không thẻ/ghi chú Pancake, không trần 1 lần/24h (README 13
    ⑥ — GL6); đường `banGiaoLoi` không có việc ⇒ màn hội thoại hiện mã thô `ly_do_cuoi` (`ban-hoi-thoai.html:234`; có việc thì hiện câu của việc).
  - **N-GL3-DOC-NHAN-TOKEN** NÂNG (phiếu ⑥ F4 + /code-review #4): ghim nhầm token ⇒ mọi lượt đọc của page lỗi ⇒ nay mọi tin của page giao sale sau ~45 s;
    Pancake quá hạn ⇒ `/settings` (thẻ chặn) tốn 15 s × số token MỖI vòng nạp (giữ lỗi 5 s chỉ gộp các lượt trong một vòng).
  - **N-GL3B-THAN-NOTES** (phiếu ⑥ F5) thân thật `POST /notes` chưa đo — công thức F2 coi `{error_code:0}` không `success` là THẤT BẠI; nếu Pancake trả
    kiểu đó cho ghi thành công thì mọi ghi chú bàn giao v3 thành `khong_ro`. Đo một lượt thật khi mở van.
  - **N-GL3B-PHA-KET-NOI** (phiếu ⑥ F6) `phaLoi:'ket_noi'` không phải bằng chứng «chưa gửi byte nào» (GL4 đừng dựa vào nó để gửi lại).
  - **N-GL3B-HAN-ANH** (phiếu ⑥ F7) hạn gửi 30 s có thể cắt lượt gửi ảnh lớn (Pancake tải `content_url` đồng bộ).
  - **N-GL3B-THE-FAIL-OPEN** (phiếu ② 7 · ⑥) `pkTagId` đọc lỗi trong vòng ⇒ bộ nạp chỉ còn thẻ hệ thống (fail-open «thà quét thừa», `nap.js#idTheChan`)
    ⇒ hội thoại «Đã gửi» có thể được nạp trong lúc Pancake lỗi (nay chỉ trong lúc lỗi, không còn 10′). Đổi fail-closed cần người quyết.
  - **N-GL3B-GL4-DOC-LOI** (phiếu ⑥ · review (a) N3) GL4 «2 lỗi gửi liên tiếp ⇒ ngắt page 30′, tin tồn giữ ở chờ» phải tính cả `LoiDocLichSu`: đọc chạy
    TRƯỚC gửi — Pancake sập thì tin chết ở bước đọc (giao sale sau ~45 s) trước khi GL4 thấy lỗi gửi nào.
  - **N-GL3B-033-TRUOC-MA** (phiếu ⑥ · review (a) G5) migration 033 phải áp trên VPS TRƯỚC khi chạy mã GL3b (mo-van §5) — không thì CHECK cũ từ chối cả
    câu INSERT gộp của `ghiBoQua` ⇒ dấu vết bỏ-qua của page mất âm thầm mỗi vòng có đọc lỗi.
  - **N-GL3B-DEM-DOC-LOI** (phiếu ⑥ · review (a) R2-G1) tin đọc lỗi chốt `xong` ⇒ không còn trong đếm «tin lỗi» Vận hành (`tom-tat.js:17-23` chỉ `loi` /
    `chan_guard`); log vòng worker có `"doc_loi_ban_giao":N` + bộ nạp in `N đọc-tin-lỗi` nhưng chưa màn/đèn nào đọc — GL6.
  - **N-GL3B-KHUON-VIEC-HAI-BAN** (/code-review #8) câu chèn `viec_can_xu_ly` có hai bản (`operations.js#handoffConversation` · `worker.js#banGiaoDocLoi`),
    UPDATE `gom_vao_tin` ba bản trong `chayMotVong`, worker import hằng từ `admin-v3/` — gộp helper trung lập khi có phiếu được đụng `operations.js`.

## 🧭 Bài học cho thước
- **Ca nạp module đỏ vì thiếu export là đỏ THẬT nhưng che đỏ HÀNH VI** — trên base `import { inLuot }` làm cả tệp ca chết lúc nạp (1 fail không tên).
  Nhập kiểu namespace thì base đỏ từng ca đúng lý do nghiệp vụ (N4 «tin mất»). Hợp đồng «phải export» vẫn đo được bằng ca đòi dòng log.
- **Chuỗi cổng lồng khuếch đại MỘT ca chập chờn thành năm dòng đỏ** (`ll18-khung` 1 fail ⇒ ve6c ⇒ ve2b ⇒ … ⇒ ll15d ⇒ gsp3b ⑥). So danh sách đỏ với
  base phải lần tới GỐC chung trước khi đếm «5 dòng mới»; chạy riêng gốc (16/0) và cổng con (11/0 · 21/0) mới kết luận.
- **Bản vá review cũng là code mới (bẫy 26):** bốn chỗ vá sau /code-review đều có ca + đột biến riêng (⑤n–⑤q) — không dựa đảo-vá của lượt trước.
