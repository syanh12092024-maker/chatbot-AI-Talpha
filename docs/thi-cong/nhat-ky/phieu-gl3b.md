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

## Vòng 2 — đối kháng chặng 2: F1 (page poll, tin khách nhắn lúc chờ chặn «trả AI») · F2 (câu lỗi token khác loại) — 07/10/2026

**Môi trường đo:** máy dev, cây chung `vao-ui-v3-17-09`, hộp cát Postgres 127.0.0.1:5432 (`aicloser_v3_test_gl3b_*_p<pid>`, tự dựng/dọn), fetch GIẢ
(host ≠ pages.fm ⇒ ném), 2 token giả, van gửi mở chỉ trong tiến trình ca, `.env` giữ `PANCAKE_READONLY=1`. Base vòng 2 **`924732c`** (= `1e0f00c` + 1 commit
docs). Trong lượt, tổng nối thêm vào nhánh `4b64937 · 05e3acf` (docs GL2) và cherry-pick GSP3c `bf71c6e · 2940c00 · 98c0fe9 · c3479e7` — không tệp nào
trùng tệp mã của vòng này (đo `git diff --name-only 924732c HEAD`: chỉ trùng sổ điều hành). Commit mã: **`55a81d7`** (5 tệp, đúng pathspec vòng 2).
Verdict: `<scratchpad tổng>/refute-gl3b.verdict.yaml` (F1, F2 — NÊN, CONFIRMED); repro `<scratchpad tổng>/gl3b-refute/test/zz-refute-gl3b.test.mjs` (R1+R2 · R3 · R3b).

### ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -nE "TRA-AI|HANG-LOI|N-GL3B-RONG"     → (rỗng)
```
Nợ đề nghị của người phản biện (N-GL3B-RONG-GIA · N-GL3B-TRA-AI-KHONG-DONG-VIEC · nâng N-GL3-DOC-NHAN-TOKEN) tổng ghi ở §10 — không phải việc vòng 2.

### Bước 3 — đo lại nguyên liệu đề bài (ở `924732c`)
`git show 924732c:<tệp> | grep -n` — đúng như verdict: `worker.js:136/156 if (tin.nguon === 'webhook')` (gom cụm CHỈ webhook) · `:277` lượt 3 chỉ chốt
`batchIds` (`gom_vao_tin`) · `pancake.js:243 else { last = loi; continue; }` · `:253 last = j;` (lỗi quyền token sau đè) · `:342 lyDoDocLoi(j)` chỉ đọc `last`
· `reconcile.js:53-57` coi `chan_guard` là còn tồn. Kịch bản phá dựng lại được bằng ca mới trên base (đỏ dưới).

### Đã làm (commit `55a81d7`)
- **F1** `src/queue/worker.js` — nhánh hết lượt đọc lịch sử, SAU chốt cụm gom webhook: khi `bg.banGiao` (UPDATE hội thoại đổi đúng 1 dòng ⇒ đã có việc mở
  cho sale) chốt `xong` mọi tin `cho` cùng (team, page, psid) có id > tin chính, `ly_do = 'doc_loi:ban_giao:theo_tin:<id tin chính>'`, CÙNG giao dịch
  (`khach`); có tin bị chốt ⇒ MỘT dòng nhật ký `tin_doc_loi_chot_theo` (`sau.tin_theo = [id…]`). Nhánh `doc_loi:khong_thuoc_ai` KHÔNG chốt. SQL lỗi ⇒ catch
  lồng về đường cũ (rollback cả bàn giao) như vòng 1.
- **F2** `src/pancake.js` — `pkFetchPage(…, soLoi)` (tham số thứ tư tuỳ chọn, chỉ `pkDocTin` truyền `{ ds: [], hetToken: false }`): ghi lỗi TỪNG token của
  vòng xoay ĐỌC + cờ «cạn token» ngay trước `return last`. Giá trị trả, thứ tự token, `_pageTokIdx`, hành vi GHI không đổi. `pkDocTin`: cạn token ⇒
  `lyDoDocLoi(loiThatNhat(soLoi.ds))` theo hạng quá hạn 0 · mạng 1 · 103 2 · 121 3 · còn lại 4 (cùng hạng ⇒ lỗi SAU); vòng xoay dừng sớm (thân hỏng 502 · câu
  riêng không phải lỗi quyền của Pancake) ⇒ câu đó đứng như vòng 1. Gom mã lỗi `[error_code, …errors[].error_code]` vào MỘT helper `maLoiPancake` dùng
  chung cho `permErr` (ngữ nghĩa y hệt — ca GL3 R4 `errors:[{error_code:121}]` canh) và `hangLoiDoc`. Câu `lyDoDocLoi` không đổi chữ ⇒ chuỗi con
  `quá hạn <N> ms` giữ (GL3 M1/R1/R7b xanh), mọi neo `gl3.sh`/`gl3b.sh` vòng 1 còn khớp `count == 1`.
- Ca: `test/gl3b-vong2.test.mjs` (V2a–V2d, cửa thật cả hai đầu như repro) · thêm một cặp «A quá hạn · B 105» vào vòng lặp ca V5 (màn Vận hành qua HTTP thật)
  của `test/gl3b-pancake-van-hanh.test.mjs`. Cổng `ops/bin/nghiem-thu/gl3b.sh`: bộ ca ④c + 14 đảo-vá ⑤r–⑤x4, ⑤0 đòi pass ≥ 27.

### Quyết định · giả định (luật 11/13)
- **Q10** `ly_do` tin theo = `doc_loi:ban_giao:theo_tin:<id>` — đề vòng 2 «lý do bàn giao (như tin chính)»; tôi giữ tiền tố `doc_loi:ban_giao` của tin chính và
  nối id tin chính (như `gom_vao_tin:<id>`) để truy được tin nào kéo nó theo. Giá: bộ đếm tương lai đếm `LIKE 'doc_loi:ban_giao%'` sẽ đếm cả tin theo (hôm nay
  0 nơi đọc: `grep -rnE 'gom_vao_tin|doc_loi:' src v3/src db ops` chỉ ra worker.js + ca).
- **Q11** Nhánh `doc_loi:khong_thuoc_ai` KHÔNG chốt tin theo. Đề vòng 2 cho chốt «nếu chính vòng 1 đã làm vậy cho tin chính»: vòng 1 chốt tin chính `xong`
  và chốt cụm gom WEBHOOK (`batchIds`) ở CẢ HAI nhánh — nhưng cụm gom đã ghép vào `noi_dung` của lượt đó (là một phần nội dung tin chính), còn tin theo poll
  là hàng RIÊNG chưa ai xử. Không có việc mới ⇒ tin theo không «thuộc dòng việc sale vừa nhận» ⇒ để đi đường thường (đọc được ⇒ handler xét chủ — hôm nay ra
  `chan_guard` như mọi tin tới lúc sale giữ, có từ trước GL3b; Pancake còn lỗi ⇒ tự đi nhánh GL3b). Giữ nguyên hành vi vòng 1 cho cụm gom webhook. Giá:
  sale đã giữ sẵn + khách nhắn thêm ⇒ «trả AI» vẫn bị chặn (đúng thiết kế chung — nợ **N-GL3B-TRA-AI-CHAN-GUARD**). Ca V2b + đột biến ⑤s canh.
- **Q12** «CÓ việc» = `bg.banGiao` (UPDATE hội thoại đổi đúng 1 dòng — cùng điều kiện tin chính `doc_loi:ban_giao`), kể cả khi `NOT EXISTS` gặp việc mở CŨ
  (`viecMoi=false`, cảnh F5): sale vẫn có MỘT việc mở cho cả hội thoại.
- **Q13** F2 chọn **thứ hạng**, không gom «token 1: …; token 2: …». Lý do: giữ khuôn đầu câu «Pancake quá hạn…/Pancake lỗi mạng…» mà ca D1/P1a và chuỗi con GL3
  đang so; câu vào `ly_do` (cắt 500), nhật ký (cắt 400), `chu_thich` sổ bỏ-qua (cắt 160) — prod ~8 token gom lại sẽ bị cắt mất phần đáng đọc; số thứ tự token
  đổi theo page (`_pageTokIdx` xoay chân khởi đầu) nên «token 1» không chỉ được tài khoản nào. Giá: mất dấu «các token khác trả 105» trong câu.
- **Q14** Thứ hạng giữa các lỗi CẤP TOKEN: đề vòng 2 chỉ chốt «121 > quyền». Bản đầu tôi xếp 121 > 103; /code-review #3 chỉ ra 121 là lỗi cấp TÀI KHOẢN —
  bộ nhớ đo prod 02/10: «121 xảy ra cả khi page có `has_active_subscription=true` ⇒ tài khoản không có ghế» ⇒ tài khoản thấy page mà không ghế trả 121
  thường xuyên như 105 ⇒ che token đúng chân hết phiên (103). Đổi thành **103 > 121 > 105** (không trái thứ tự đề đã chốt). Ca «A 103 · B 121»,
  «A 121 · B 103» + đột biến ⑤x4 (thứ tự bản đầu) canh.
- **Q15** Vòng xoay dừng sớm (thân hỏng 502 sau một token quá hạn) giữ câu 502 — đó là câu trả lời của token đầu tiên không từ chối quyền, vẫn đúng lớp
  «Pancake trục trặc». Ca V2c «A quá hạn · B 502 HTML» + đột biến ⑤w canh.
- **Q16** Không đổi giá trị TRẢ của `pkFetchPage` (phương án «trả luôn lỗi xếp hạng» mà /code-review #6 gợi ý): GET nào cũng đọc `j.messages`/`j.conversations`
  — trả lỗi 121 kèm `messages: []` của token trước thay cho 105 của token cuối sẽ biến «lỗi» thành «rỗng thật» ⇒ trả lời mù (nặng thêm N-GL3B-RONG-GIA). Sổ
  lỗi riêng + cờ `hetToken` chỉ đổi CÂU, không đổi đường đi.
- **Q17** Nhật ký `tin_doc_loi_chot_theo` (sau /code-review #5) — tin khách bot không trả lời không được biến mất im lặng; MỘT dòng cho mỗi lượt chốt.

### Danh sách ca (vòng 2)
| ca | nhóm | đo gì |
|---|---|---|
| V2a | HÀNH VI trọn đường · CHO-QUA · CHẶN | page POLL, bộ nạp thật + worker thật: tin 1 502 → khách nhắn «??» lúc tin 1 lùi (bộ nạp đọc lúc lành ⇒ tin 2 hàng riêng) → lượt 2, lượt 3 ⇒ tin 2 `xong doc_loi:ban_giao:theo_tin:<id1>` · 1 việc mở · nhật ký `tin_doc_loi_chot_theo` đúng `[id2]` · khách KHÁC cùng page + CÙNG psid ở page KHÁC (id lớn hơn, hoãn 1 h) vẫn `cho` · Pancake lành ⇒ worker không rút gì (0 `chan_guard`) · `resumeConversation` THÀNH · khách nhắn tiếp ⇒ bot 1 POST |
| V2b | BIÊN (lựa chọn Q11) | sale ĐANG giữ: lượt 3 `doc_loi_khong_thuoc_ai` ⇒ tin 2 vẫn `cho`, 0 việc, 0 nhật ký chốt theo; Pancake lành ⇒ tin 2 rút riêng, 0 lượt não, 0 POST (không neo kết quả cụ thể của đường thường) |
| V2c | đơn vị · BIÊN thứ hạng | 13 cặp [tokA, tokB]: quá hạn·105 · mạng·105 · 121·105 · 103·105 · 103·121 · 121·103 · quá hạn·mạng · mạng·121 (6 cặp đầu-không-kể-103·121/121·103 đỏ ĐO ĐƯỢC ở base; hai cặp 103 thêm sau review) + CHO-QUA 105·quá hạn · 105·121 · 105·105 · quá hạn·quá hạn · quá hạn·502 HTML; mỗi cặp GET đúng [tokA, tokB]; page đã ghim tokB ⇒ lượt lỗi sau vẫn khởi đầu tokB (`_pageTokIdx` không đụng) |
| V2d | HÀNH VI trọn đường | page POLL, A treo · B 105: sổ bỏ-qua `doc_tin_loi` · `ly_do` tin lượt 1–2 · nhật ký `tin_doc_loi_ban_giao` lượt 3 đều «Pancake quá hạn — quá hạn 150 ms», không «quyền» |
| V5 (+1 cặp) | HÀNH VI qua HTTP | màn Vận hành: A treo · B 105 ⇒ `lichSuLoi` «Pancake quá hạn — quá hạn 150 ms …» |

### Bằng chứng ĐỎ trên base (ca mới, mã `924732c` chưa sửa)
```
✖ GL3b V2a   [gl3b] V2a lượt 3: doc_loi_ban_giao · tin=[["m-ps-v2a-1","xong","doc_loi:ban_giao"],["m-ps-v2a-2","cho",""]] … việc mở=1
             AssertionError: tin 2 (khách nhắn lúc tin 1 lùi) chốt theo … actual: 'cho' · expected: 'xong'
✔ GL3b V2b   (canh lựa chọn Q11 — base vốn không chốt)
✖ GL3b V2c   ✗ A quá hạn · B 105 → «Bạn không có quyền với trang này» · ✗ A lỗi mạng · B 105 → «Bạn không có quyền…» · ✗ A 121 · B 105 → «Bạn không có
             quyền…» · ✗ A 103 · B 105 → «Bạn không có quyền…» · ✗ A quá hạn · B mạng → «Pancake lỗi mạng…» · ✗ A mạng · B 121 → «Tài khoản không có ghế…»
             · ✓ 5 cặp CHO-QUA · ghim tokB · A 105 · B quá hạn → «Bạn không có quyền…» [tokB,tokA]
✖ GL3b V2d   nap_bo_qua={"ly_do":"doc_tin_loi","chu_thich":"Pancake không trả lịch sử: Bạn không có quyền với trang này"}
ℹ tests 4 · pass 1 · fail 3
```
(Hai cặp 103·121 / 121·103 thêm sau /code-review #3 — đỏ dưới đột biến ⑤x4 = thứ hạng của bản đầu; cặp V5 đỏ dưới ⑤v2 = câu token cuối của base.)

### Đảo-vá (`gl3b.sh` ⑤, đo bản SAU /code-review) — 14/14 vòng 2 đỏ đúng + 18/18 vòng 1 vẫn đỏ đúng
| đột biến | ca phải đỏ | đỏ thật |
|---|---|---|
| ⑤r bỏ chốt tin theo (`bg.banGiao ?` → `false ?`) | V2a | V2a |
| ⑤r2 bỏ nhật ký tin chốt theo | V2a | V2a |
| ⑤s chốt cả nhánh `khong_thuoc_ai` (`→ true ?`) | V2b | V2b |
| ⑤t bỏ điều kiện psid | V2a | V2a |
| ⑤u bỏ điều kiện page | V2a | V2a |
| ⑤v / ⑤v2 `pkDocTin` về `lyDoDocLoi(j)` (câu token cuối) | V2c V2d / V5 | V2c V2d / V5 |
| ⑤v3 `pkFetchPage` không dựng cờ cạn token | V2c V2d | V2c V2d |
| ⑤w dừng sớm (thân hỏng) cũng chọn theo hạng | V2c | V2c |
| ⑤x1 quá hạn ngang hạng mạng · ⑤x2 mạng ngang 105 · ⑤x3 103/121 ngang 105 · ⑤x4 121 trên 103 | V2c | V2c ×4 |
| ⑤0 bản sao nguyên vẹn | (xanh) | pass=27 fail=0 |
**Đột biến nào KHÔNG đỏ** (đo riêng trên bản sao tạm, mỗi đột biến một tiến trình): (1) bỏ `AND trang_thai='cho'` và (2) bỏ `id>$4` trong câu chốt tin theo —
pass 15/0: vô hại theo bất biến FIFO của câu rút (`kho.js:88` `truoc.id<c.id AND truoc.trang_thai IN ('cho','dang_xu')` ⇒ khi tin chính đang `dang_xu`, tin
id lớn hơn của cùng khách chỉ có thể là `cho`, tin id nhỏ hơn không thể là `cho`). (3) hoà hạng lấy lỗi ĐẦU thay lỗi SAU — pass 9/0: hai lỗi cùng hạng
cho cùng loại câu (cùng đường dẫn, cùng hạn). (4) `permErr` bỏ `errors[]` — không đỏ ở ca vòng 2 nhưng ĐỎ GL3 R4 (`gl3.sh` ⑥ canh).

### /code-review (high) vòng 2 — 9 phát hiện, kiểm chứng trước khi sửa
| # | phát hiện | kiểm chứng | xử lý |
|---|---|---|---|
| 1 | nhánh `khong_thuoc_ai` không chốt ⇒ sale đã giữ + khách nhắn ⇒ `chan_guard` chặn «trả AI»; V2b neo `chan_guard` | ĐÚNG (đọc mã) | GIỮ lựa chọn Q11 (đề vòng 2 «KHÔNG chốt khi khong_thuoc_ai») · SỬA ca V2b: bỏ neo `chan_guard` của đường thường, chỉ đòi rút riêng + 0 não + 0 POST · nợ **N-GL3B-TRA-AI-CHAN-GUARD** |
| 2 | chỉ quét tin có tại lúc bàn giao; tin tới SAU commit vẫn `chan_guard` (gốc ở `reconcile.js:54`) | ĐÚNG | ngoài pathspec (`reconcile.js` + luật «trả AI») ⇒ cùng nợ **N-GL3B-TRA-AI-CHAN-GUARD** |
| 3 | 121 (cấp tài khoản) trên 103 che token hết phiên | ĐÚNG (bộ nhớ đo prod 02/10) | SỬA (Q14) · 2 cặp ca · ⑤x4 |
| 4 | lỗi tạm thời (quá hạn/mạng) của token chưa rõ chân che lỗi bền 103/121 | ĐÚNG về mặt lý | GIỮ — đề vòng 2 chốt «quá hạn > mạng > …» (chặn đúng cảnh ② 2 sinh ra) · nợ **N-GL3B-HANG-LOI-TAM-THOI** |
| 5 | tin theo chốt `xong` im lặng, không nhật ký | ĐÚNG | SỬA (Q17) · ca V2a đòi nhật ký · ⑤r2 |
| 6 | so danh tính `cacLoi.at(-1) === j` dễ gãy khi ai bọc `last` | ĐÚNG | SỬA: sổ `{ds, hetToken}` + cờ đặt ngay trước `return last` · ⑤v3; KHÔNG theo gợi ý «trả lỗi xếp hạng» (Q16) |
| 7 | thứ hạng chỉ ở `pkDocTin`; `pkGetConversations`/`pkTagId` vẫn lỗi token cuối | ĐÚNG — nhưng hai đường đó không hiện câu lỗi nào (nuốt ⇒ `[]`/`null`) | GIỮ (ngoài đề F2) · nợ **N-GL3B-HANG-LOI-CHUNG** |
| 8 | `hangLoiDoc` chép lại cách đọc mã lỗi của `permErr` | ĐÚNG | SỬA: helper `maLoiPancake` dùng chung (ngữ nghĩa y hệt, GL3 R4 canh) |
| 9 | hoà hạng phụ thuộc chân ghim ⇒ câu đổi theo thời gian | ĐÚNG về lý; cùng hạng = cùng loại câu | GIỮ (đảo-vá «không đỏ» (3) ghi trên) |

### Cổng · bộ ca · npm test (bản SAU /code-review)
```
$ bash ops/bin/nghiem-thu/gl3b.sh            (không cờ — 1:39)
✅ ④c-vòng-2-F1-poll-tin-theo-·-F2-câu-lỗi-token-khác-loại pass=4 fail=0 · xanh: V2a V2b V2c V2d
✅ ①②③ 11/0 · 7/0 · 5/0 (vòng 1 giữ) · ④ ④b · ⑤a–⑤q 18/18 · ⑤r–⑤x4 14/14 · ⑤0 pass=27 fail=0
✅ ⑥gl3.sh rc=0 · == ĐỎ 0 / XANH 25
✅ ⑥l1-m2-cua 17/0 · va-r1-van-gui 6/0 · phase0-webhook-delivery 15/0 · l2-m1-nhac-truong 12/0 · phase1-chat-flow 12/0
✅ ⑥l2-m1-hang-doi 28/0 · va-p7-chay-worker 7/0 · gl3-han-cho-pancake 18/0 · l0-m1-luoc-do 13/0
⏸ ⑦ / ⑧ hoãn (cờ)
== ĐỎ 0 / XANH 49   rc=0
$ bash ops/bin/nghiem-thu/gl3.sh             (riêng)  == ĐỎ 0 / XANH 25   rc=0
$ TZ=$tz PGTZ=$tz node --test test/gl3b-vong2.test.mjs   (tz = UTC · Pacific/Kiritimati · America/Adak) → 4/0 · 4/0 · 4/0
$ npm test   BASE 924732c (trước khi chép tệp nào):  tests 2538 · pass 2534 · fail 0 · skipped 4
$ npm test   SAU (cây có thêm GSP3c tổng cherry-pick, +14 ca gsp3c-doi-mon):  tests 2556 · pass 2552 · fail 0 · skipped 4   (2538 + 4 vòng 2 + 14 GSP3c)
```
⑦ «so với base» (l1-m2 · ll2 · gsp3b) KHÔNG chạy ở vòng 2 — máy có lượt đo khác chạy song song (gsp3b/gsp3/ve7b của cây GSP3c), luật 6; vòng 2 không
đụng tệp nào ngoài đường đọc Pancake + worker (gl3.sh + chín bộ ca ⑥ xanh).

### Lệch
- Đề vòng 2 «tổng là thợ duy nhất trong cây chung»: giữa lượt, `v3/test/b/gl2-vong2-den.test.mjs` (chưa theo dõi, của GL2 vòng 2) xuất hiện trong cây — tôi
  không đụng; `npm test` SAU chạy lúc tệp này chưa góp ca (2556 = 2538 + 4 + 14).

### Nợ (vòng 2) — đã APPEND §9 sổ
  - **N-GL3B-TRA-AI-CHAN-GUARD** · **N-GL3B-HANG-LOI-TAM-THOI** · **N-GL3B-HANG-LOI-CHUNG** (nguyên văn ở §9, khối «07/10 · GL3b vòng 2 (thợ)»).

### 🧭 Bài học cho thước
- **Ca đối kháng KHẲNG ĐỊNH điều phá được thì đổi chiều khi chép vào bộ ca**: repro R1+R2 của người phản biện `assert.equal(ds[1].trang_thai, "chan_guard")`
  — chép nguyên là neo đúng cái lỗi. Ca V2a viết lại theo hợp đồng mới (đỏ trên base đúng chỗ đó).
- **Đừng neo kết quả của một luật KHÁC trong ca biên** (/code-review #1): V2b bản đầu neo `chan_guard` của «đường thường» — phiếu nào sửa nợ
  N-GL3B-TRA-AI-CHAN-GUARD sẽ thấy V2b đỏ y như code sai. Ca biên chỉ đòi bất biến của CHÍNH luật mình (không chốt) + bất biến an toàn (0 não, 0 gửi).
- **Ca nối tiếp trong một tệp**: ca trước đỏ giữa chừng để lại tin `cho` rút được ⇒ ca sau rút nhầm và đỏ giả (lượt đầu trên base: V2b đỏ vì rút tin của V2a).
  Thêm `donCaTruoc(psid)` ở đầu mỗi ca trọn đường để mỗi ca đỏ đúng lý do của nó.
