# Nhật ký phiếu GL3 — hạn chờ cho mọi lượt gọi Pancake + gửi lỗi mạng KHÔNG gửi lại bằng token khác (06/10/2026 · thợ GL3)

**Môi trường đo:** máy dev (Node v24.19.0), `fetch` GIẢ trong mọi ca (host ≠ `pages.fm` ⇒ ném), hộp cát Postgres 127.0.0.1:5432
(`aicloser_v3_test_gl3_p<pid>`, tự dựng/dọn qua `db/sandbox.js`). Không một lượt mạng thật, không đo prod. `.env` giữ `PANCAKE_READONLY=1`
(cổng `gl3.sh` ⓪ đọc lại mỗi lượt); ca đầu-cuối mở van trong `process.env` của tiến trình ca, SAU khi đã cài fetch giả + 2 token giả.
Làn 🟥. Commit mã: **`908c439`**.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n -i "timeout\|hạn chờ\|pkFetchPage\|N-MB-NGAT-PAGE\|tin đúp"
(rỗng — N-MB-NGAT-PAGE nay nằm SAU tiêu đề §9b, lệnh của phiếu không còn thấy)
$ grep -n -i "N-MB-NGAT-PAGE\|pkFetchPage\|tin đúp" SO-DIEU-HANH-THI-CONG.md
395:| GL3 | Hạn chờ request Pancake ... (đang có nguy cơ tin đúp) | — | 🟥 | 🔨 phát 06/10 ...
2119:- 02/10 · **N-MB-NGAT-PAGE** (CR-02-10 · MB4) — ... v1 ngắt CẢ PAGE 30′ sau 2 lần gửi lỗi liên tiếp ...
```
Quan hệ: mới; N-MB-NGAT-PAGE là việc GL4 (ngoài phạm vi). Không trùng phán cũ. `ops/bin/tra_no.py`, `docs/thi-cong/SO-NO.md` không tồn tại.

## Bước 3 — đo lại nguyên liệu đề bài (base `195d9c9` = HEAD lúc nhận về mã)
- `src/pancake.js:129` `fetch(buildUrl(tok), init)` không `signal`; `:131` lỗi mạng ⇒ `continue` (cả POST) — ĐÚNG như phiếu. Các dòng gọi
  `:212 :219 :225 :231 :245 :266 :278 :290` và bốn fetch trần `:91 :166 :185 :202` — ĐÚNG.
- `grep PANCAKE_READONLY src/pancake.js` = 0 dòng: «van ghi chặn POST» của ④7 là (1) cửa Messenger `channels/messenger/index.js#cuaDangMo`
  và (2) cổng HTTP ghi `chat/handler-v3.js#lapCongHttpGhi` (accessor trên `globalThis.fetch`, đọc `PANCAKE_READONLY` tuyệt đối: process.env
  trước, vắng mới tra `.env`). Ca E0–E2 đi qua CẢ HAI lớp thật, mở bằng `process.env` (`V3_PANCAKE_GUI=1`, `PANCAKE_READONLY=0`).
- `src/queue/lan-gui.js#bocCuaGuiBen` chuyển mọi `ok!==true` thành `lan_gui='khong_ro'` + `LoiCanDoiChieuGui` — ĐÚNG ⇒ KHÔNG cần sửa
  `lan-gui.js` (dấu mới chỉ để GL4 đọc).
- Thêm phát hiện: `pkAddNote` cũ coi `{error_code:-1}` (lỗi mạng) là `ok:true` — đúng như ②6(d) đã khai.

## Đã làm
- `src/pancake.js`
  - `goiPancake(url, init, hanMs)` — MỘT cửa có hạn: `AbortController` + `setTimeout` (như `src/pos/api.js#goi`) + `Promise.race` với lời huỷ,
    hạn phủ cả lúc chờ header LẪN lúc đọc thân. Ném: lỗi mạng gốc · `LoiQuaHanPancake{quaHan}` · `LoiThanPancake{thanHong}` (thân không phải
    JSON). Thông điệp lỗi chỉ mang `pathname` (không token).
  - Hằng `HAN_DOC_MAC_DINH_MS=15000` · `HAN_GUI_MAC_DINH_MS=30000` · `HAN_TRAN_MS=120000`; `V3_PANCAKE_HAN_DOC_MS` / `V3_PANCAKE_HAN_GUI_MS`
    đọc TƯƠI mỗi lượt; ngoài `1..120000` (chỉ số nguyên dương) ⇒ mặc định + `console.warn` MỘT lần cho mỗi cặp tên=giá trị.
  - `pkFetchPage`: GET/HEAD/OPTIONS ⇒ hạn đọc, còn lại ⇒ hạn gửi. GHI lỗi mạng / quá hạn / thân hỏng ⇒ trả NGAY
    `{error_code:-1, message, phaLoi, quaHan?, khongRo:true}`, KHÔNG xoay token. Cổng HTTP ghi chặn (`LoiCuaGuiDong`) ⇒ `phaLoi:'ket_noi'`,
    không `khongRo` (chắc chắn chưa gửi), không xoay. ĐỌC lỗi mạng/quá hạn ⇒ xoay như cũ; ĐỌC thân hỏng ⇒ `{}` như cũ. URL · thân · thứ tự
    token · `_pageTokIdx` không đổi.
  - `phaLoi`: `'ket_noi'` khi chuỗi `cause` có ECONNREFUSED · ENOTFOUND · EAI_AGAIN · EAI_NONAME · EHOSTUNREACH · ENETUNREACH · EHOSTDOWN ·
    ENETDOWN · UND_ERR_CONNECT_TIMEOUT (hoặc bị cổng chặn); còn lại (đứt, quá hạn, lỗi lạ) `'sau_gui'`.
  - `pkSendReply` · `pkSendImage` · `pkToggleTag` · `pkAddNote` mang `khongRo` / `phaLoi` / `quaHan` lên kết quả lỗi (`dauLoiMang`).
  - `pkAddNote`: `success:false` · `khongRo` · thân RỖNG ⇒ thất bại (trước: chỉ `success:false`).
  - Bốn fetch trần qua `goiPancake` với hạn ĐỌC (15 s). `pkMarkUnread` một lượt, lỗi ⇒ `{ok:false}`, không thử lại.
- `docs/v3/ban-giao/bien-moi-truong-v3.md`: hai dòng biến mới (cùng commit).
- `test/gl3-han-cho-pancake.test.mjs` (18 ca, nạp BẢN SAO TẠM của `pancake.js`+`config.js` để hai đường ghi tệp token rơi vào thư mục tạm) ·
  `test/gl3-dau-cuoi-worker.test.mjs` (4 ca, worker thật + cửa Messenger thật + cổng HTTP ghi thật + hộp cát).
- `ops/bin/nghiem-thu/gl3.sh` — 25 phép: ⓪ READONLY · ①② bộ ca · ③ đọc mã · ④ 13 đảo-vá trên bản sao tạm (src · db · v3/src, mỗi đột biến
  một tiến trình, `--test-force-exit`) + bản sao nguyên vẹn xanh · ⑤ bốn bộ ca cũ chạm gửi · ⑥ npm test khi `CHAY_NPM_TEST=1`.

## Quyết định · giả định (luật 11/13)
- **Hai cơ chế huỷ (signal + race), chọn cả hai thay vì chỉ signal:** signal để undici đóng socket thật; race để hạn đúng cả khi fetch lờ signal
  (bẫy test, polyfill, cổng accessor). Giá: đảo-vá «bỏ signal» của phiếu ④8 không đỏ vì QUÁ THỜI GIAN mà đỏ vì khẳng định «signal tới tay
  fetch và ĐÃ huỷ» (R0 R1 R2) — R1b (fetch điếc) vẫn xanh dưới đột biến đó, đúng thiết kế.
- **Bốn fetch trần dùng biến hạn ĐỌC** (phiếu ②4 «15 s đọc / đánh dấu»), kể cả hai POST `generate_page_access_token` và `/unread`.
- **`getPageAccessToken` giữ xoay token khi lỗi** (phiếu chỉ đòi gắn hạn; ②5 cấm đổi thứ tự token) ⇒ nợ N-GL3-SINH-TOKEN-XOAY.
- **Thân không phải JSON (sau review #3 #8):** ném `LoiThanPancake` thay vì nuốt `{}`: GHI ⇒ «không rõ» (502/504 HTML của cổng = có thể tin đã đi);
  ĐỌC ⇒ `{}` như cũ; `addPancakeToken` / `refreshPancakePages` lấy lại lời báo cũ («Lỗi mạng khi kiểm tra token…» / «nạp page lỗi»).
  KHÔNG kiểm `res.status` khi thân là JSON (Pancake trả lỗi nghiệp vụ trong thân JSON, kể cả HTTP 200) — chưa đo được mã HTTP thật của Pancake.
- **Thêm trường `quaHan`** (ngoài ví dụ của phiếu) để GL4 «lưu nguyên nhân lỗi» phân biệt quá hạn với đứt.
- **`'1.5'` là sai** (chỉ nhận số nguyên dương) — chuỗi rỗng = vắng (không cảnh báo).
- Không sửa `lan-gui.js` (không cần đọc dấu mới).

## Danh sách ca (④ phiếu → ca)
| ④ | Ca | Đo |
| --- | --- | --- |
| 0 | mọi ca 2 token giả `tokA`,`tokB`; M3 | `'0' 'abc' '-5' '120001' '1.5'` ⇒ 15 000 (đồng hồ giả: tick 14 999 chưa xoay, +1 xoay) + cảnh báo 1 lần/giá trị; GỬI `'0'` ⇒ 30 000 |
| 1 | M1 · R1 · R1b | GET treo: mặc định 15 000/token (đồng hồ giả); hạn 150 ⇒ khe token1→2 ≈152 ms, tổng ≈304 ms, signal đã huỷ; fetch điếc vẫn cắt |
| 2 | M2 · R2 · R2b | POST treo: mặc định 30 000; hạn 300 ⇒ ≈303 ms, `khongRo`/`quaHan`/`sau_gui`, fetch **1** lần; ảnh · thẻ · ghi chú cũng 1 lần |
| 3 | R3 | POST ném ECONNRESET (bất đồng bộ + đồng bộ) ⇒ ngay, 1 lần |
| 4 | R4 | 105 ở token 1 ⇒ token 2 thành; lượt sau bắt đầu ở token 2; 121 trong `errors[]` cũng xoay |
| 5 | R5 | GET lỗi mạng token 1 ⇒ token 2 |
| 6 | R6 | addPancakeToken 153 ms/1 lượt · refreshPancakePages 305 ms/2 · getPageAccessToken 304 ms/2 · pkMarkUnread 152 ms/1 lượt `/unread` |
| 7 | E1 · E2 | worker thật: gửi treo ⇒ 314 ms, `lan_gui=khong_ro`, tin `loi`, hội thoại `SALE`, POST **1** lần; vòng sau + tin mới: vẫn 1; ECONNRESET ⇒ như trên |
| 7b | R7b | thân treo sau header: GET xoay (≈240 ms) · POST 1 lượt `quaHan` |
| 7c | R7c | ECONNREFUSED · ENOTFOUND · EAI_AGAIN lồng 2 tầng · UND_ERR_CONNECT_TIMEOUT ⇒ `ket_noi`; ECONNRESET · UND_ERR_SOCKET · lỗi lạ · quá hạn ⇒ `sau_gui`; POST luôn 1 lượt |
| 7d | R7d | pkAddNote ném/treo/`{}`/hết token ⇒ thất bại; `success:true` và thân không có `success` ⇒ ok |
| sau review | R7e · R7f · E3 | thân HTML 502: GHI «không rõ», ĐỌC `{}` không xoay, lời báo cũ của hai fetch trần · cổng chặn: `ket_noi`, không `khongRo`, 1 lượt · cổng THẬT van đóng: fetch 0 lượt, `daChan` +1 |
| CHO-QUA | R0 · E0 | POST thành ⇒ ok 1 lượt; worker thật ⇒ `lan_gui=da_gui`, provider `m-ok` |

**Nhánh KHÔNG chạm:** `getPageAccessToken` thành công ở token 2; `addPancakeToken` thành công (đường ghi tệp — cố ý không chạy); `res` thiếu
`.json` (TypeError ⇒ lỗi mạng, giữ như cũ); hẹn giờ nổ đúng lúc thân vừa về (trả dữ liệu, không ném).

**Chạy bộ ca GL3 trên `pancake.js` của BASE** (bản sao tạm): 16 đỏ / 3 xanh — xanh đúng là R4 · R5 · E0 (hành vi GIỮ NGUYÊN); E1 đỏ quá thời
gian ca 20 s (không hạn), E2 đỏ (2 POST — tin đúp), R3 đỏ (2 lượt), R7d đỏ (`ok:true` giả).

## Đảo-vá (`gl3.sh` ④, đo bản SAU review) — tất cả đỏ đúng
| Đột biến | Đỏ |
| --- | --- |
| ④1 huỷ hẹn giờ ngay (không hạn) | R1 R2 |
| ④2 bỏ `signal` | R0 R1 R2 |
| ④3 trả `continue` cho POST lỗi mạng | R2 R3 · đầu-cuối E1 E2 |
| ④4 hạn không phủ thân | R7b |
| ④5 `'0'` thành «huỷ ngay» | M3 |
| ④6 GHI dùng hạn ĐỌC | M2 R2 |
| ④7 `phaLoi` luôn `sau_gui` | R7c |
| ④8 / ④8b pkAddNote bỏ vế `khongRo` / vế rỗng | R7d / R7d |
| ④9 addPancakeToken về fetch trần | R6 |
| ④10 / ④10b cổng chặn bị gắn `khongRo` | R7f / E3 (cổng thật) |
| ④11 thân hỏng nuốt thành `{}` | R7e |
| bản sao nguyên vẹn | 22/22 xanh |

**Đột biến nào KHÔNG đỏ:** (1) bỏ `signal` không làm R1b đỏ — đúng thiết kế (race giữ hạn). (2) Bỏ vòng xoay của `getPageAccessToken` — không
ca nào khẳng định số lượt ở đó (cố ý: hành vi cũ, nợ riêng). (3) Đổi cảnh báo một lần thành mỗi lượt cảnh báo — M3 ĐỎ (đo tay, mục _chan1 cuối tệp); không đưa vào cổng.
Lượt chạy đầu (mẫu tên đặt SAU tệp nên node chạy CẢ tệp) cho bảng rộng hơn: ④3 làm đỏ thêm M2 M3 M4 R2b R7b R7c R7d; ④1 làm đỏ mọi ca treo.

## /code-review (high, nền) — 10 phát hiện, kiểm chứng từng cái trên mã trước khi sửa
| # | Phát hiện | Kiểm | Xử lý |
| --- | --- | --- | --- |
| 1 | pkAddNote `ok:true` khi `{}` (hết token / thân không JSON) | đúng (`:210 return {}`) | SỬA — thân rỗng ⇒ thất bại; ca R7d · ④8b |
| 2 | `LoiCuaGuiDong` của cổng ghi bị gắn `khongRo`/`sau_gui` | đúng (cổng ném trước fetch) | SỬA — `ket_noi`, không `khongRo`; ca R7f · E3 · ④10 |
| 3 | 5xx HTML với GHI không mang dấu «không rõ» | đúng | SỬA — `LoiThanPancake`; ca R7e · ④11 |
| 4 | hạn theo từng token ⇒ ĐỌC treo × N token | đúng | NỢ N-GL3-DOC-NHAN-TOKEN (② giữ xoay khi ĐỌC) |
| 5 | token chậm một nhịp ⇒ `_pageTokIdx` ghim sang token kế | đúng (có từ trước, timeout là thêm cửa vào) | gộp N-GL3-DOC-NHAN-TOKEN (②5 cấm đổi) |
| 6 | pkTagId cache bảng thẻ rỗng 10′ | đúng (có từ trước) | NỢ N-GL3-THE-RONG-10P |
| 7 | getPageAccessToken xoay khi quá hạn | đúng | NỢ N-GL3-SINH-TOKEN-XOAY |
| 8 | thân không JSON đổi lời báo của 2 fetch trần | đúng | SỬA cùng #3 (ca R7e) |
| 9 | tài liệu biến khai sai lượt nào là POST | đúng | SỬA câu chữ |
| 10 | ba bản fetch có hạn (pos/api · pancake-orders · pancake) | đúng | ngoài pathspec — không gộp |
Sửa sau review đã có đảo-vá đo bản SAU vá (bẫy 26): ④8b ④10 ④10b ④11.

## Mốc số ca
- `npm test` TRƯỚC (cây chung lúc nhận, gồm thay đổi dở của TT1): **tests 2467 · pass 2463 · fail 0 · skip 4**.
- `npm test` SAU (HEAD `908c439`, TT1 đã commit `bc190f5`): **tests 2489 · pass 2485 · fail 0 · skip 4** (+22 = đúng 22 ca GL3). Không ca đỏ
  nào (kể cả ca của TT1). Lúc chạy, cổng `tt1.sh` của phiên TT1 đang chạy (không chạy `npm test`; đột biến của nó trên bản sao tạm, hộp cát hậu
  tố pid) ⇒ chỉ một lượt `npm test`, không đụng CSDL nhau.
- Bộ ca cũ chạm gửi: `l1-m2-cua` 17/0 · `va-r1-van-gui` 6/0 · `l2-m1-nhac-truong` 12/0 · `phase0-webhook-delivery` 15/0.

## Cổng `gl3.sh` (rc=0) — `ĐỎ 0 / XANH 25`, 58 s
```
✅ ⓪.env-PANCAKE_READONLY=1 đọc được: '1'
✅ ①bộ-ca-đơn-vị pass=18 fail=0 (đòi fail=0, pass≥18)
✅ ①b-đủ-phép-④0–6·7b–7d-+-sau-review-xanh 18 phép
✅ ②đầu-cuối-worker pass=4 fail=0 · xanh: E0 E1 E2 E3 (đòi E0 E1 E2 E3)
✅ ③fetch-chỉ-trong-goiPancake fetch( mã=1 (đòi 1) · goiPancake( =6 (đòi 6: khai + pkFetchPage + 4 trần)
✅ ③b-biến-khai-ở-bien-moi-truong-v3.md dòng=2
✅ ④1 … ④11 (13 đảo-vá đỏ đúng, bảng trên) · ✅ ④0-bản-sao-nguyên-vẹn-xanh pass=22 fail=0
✅ ⑤l1-m2-cua 17/0 · ⑤va-r1-van-gui 6/0 · ⑤l2-m1-nhac-truong 12/0 · ⑤phase0-webhook-delivery 15/0
⏸ ⑥npm-test hoãn (CHAY_NPM_TEST=1; luật 6 — không chạy song song)
== ĐỎ 0 / XANH 25
```

## Rào cũ (việc của GL7 — KHÔNG sửa ở phiếu này)
- `_chan1.sh` phép ⑤ báo ĐỎ cho `src/pancake.js` (rào cũ coi mọi file phẳng `src/*.js` ngoài 7 file não là vùng cấm; sổ §0a sau CR-02-10
  đã mở 31 file dùng chung) — đỏ ĐÚNG như phiếu dự báo, không phải lỗi của mã.
- Hook `.claude/hooks/canh-file-cam.sh`: chỉ CẢNH BÁO (`exit 0`, không chặn) — đọc mã; lời nhắc còn nói «57 file phẳng… KHÔNG nằm trong nhóm
  được mở», lỗi thời theo CR-02-10.

## Nợ (đã APPEND §9 sổ, 5 mục N-GL3-*)
- **N-GL3-DOC-NHAN-TOKEN** — kịch bản: prod ~8 token, Pancake treo một page ⇒ `pkGetConversations` 8×15 s = 120 s, vòng poll tuần tự trễ theo;
  token đúng chân chậm 16 s một nhịp, token kế trả `{success:false, message:'Không tìm thấy gói cước'}` không mã ⇒ `_pageTokIdx` ghim sai tới
  lượt `lamMoiTokenDb` kế (5′).
- **N-GL3-THE-RONG-10P** — `/settings` quá hạn trên mọi token ⇒ map thẻ rỗng cache 10′.
- **N-GL3-SINH-TOKEN-XOAY** — `AICLOSER_SINH_TOKEN=1`: token A sinh xong phía Pancake mà phản hồi > 15 s ⇒ huỷ, token pancake-tool đã chết, thử B.
- **N-GL3-AN-TOAN-TOKEN-FILE** — hai đường ghi tệp token theo vị trí module, `_an-toan.mjs` không đổi hướng được.
- **N-GL3-ANH-THU-LAI** — `tools.js#sendImageWithRetry` gửi lại với mọi `ok:false` (mã chết hôm nay).

## 🧭 Bài học cho thước
- `node --test <tệp> --test-name-pattern=…` — cờ đặt SAU tệp bị bỏ qua, node chạy cả tệp: đặt cờ TRƯỚC tệp.
- Chú thích cuối dòng `# …; lệnh` nuốt luôn lệnh phía sau dấu `;` (lượt 2 của cổng: 10 phép đảo-vá «đỏ: không» vì `r=$(do_ten …)` nằm trong chú thích).
- Đột biến «hẹn giờ không bao giờ nổ» bằng `setTimeout(…, 2**31-1)` giữ event loop ⇒ tiến trình ca KHÔNG thoát dù ca đã quá thời gian:
  đột biến bằng `clearTimeout` ngay + `--test-force-exit`. Ca đầu-cuối treo thì `after()` kẹt ở `pool.end()` (client còn bị giữ) — cổng chỉ
  dùng đột biến không treo cho tệp đầu-cuối.

## _chan1.sh gl3 (sau commit mã 908c439; nhật ký + §10 đã có trong cây) — `ĐỎ 2 / XANH 6`, cả hai đỏ KHÔNG do GL3
```
✅ ①phiếu-tồn-tại docs/thi-cong/phieu/PHIEU-GL3.md
✅ ②có-Base base=195d9c9
— file đổi (19): … (gồm 11 tệp của commit TT1 bc190f5)
🔴 ④pathspec-⊆-③ NGOÀI PHẠM VI: ops/bin/nghiem-thu/gsp3.sh ops/bin/nghiem-thu/gsp3b.sh ops/bin/nghiem-thu/tt1.sh src/admin-v3/operations.js
   src/orders/hang-cho.js src/pos/index.js src/pos/tao-don.js src/products/chuyen-ban-sao.js test/gsp3-doi-soat.test.mjs
   test/he-so-te-doi-chieu-don-that.test.js test/tt1-tien-te-ngoai-gcc.test.mjs
🔴 ⑤vùng-cấm-src-phẳng ĐỤNG (chưa khai «Đụng bộ não» trong phiếu): src/pancake.js
✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/gl3.sh rc=0 (… == ĐỎ 0 / XANH 25)
✅ ⑧a-nhật-ký docs/thi-cong/nhat-ky/phieu-gl3.md
✅ ⑧b-§10-sổ
== ĐỎ 2 / XANH 6
```
- **④ đỏ vì commit TT1 `bc190f5` nằm TRONG `195d9c9..HEAD`** (TT1 commit sau base của phiếu). Đo riêng commit GL3:
  `git diff --name-only 908c439~1 908c439` = `docs/v3/ban-giao/bien-moi-truong-v3.md · ops/bin/nghiem-thu/gl3.sh · src/pancake.js ·
  test/gl3-dau-cuoi-worker.test.mjs · test/gl3-han-cho-pancake.test.mjs` — 5/5 ⊆ ③. Commit nhật ký sau đó chỉ thêm `docs/thi-cong/*` (đất điều hành).
- **⑤ đỏ = rào cũ** (mục «Rào cũ» trên) — GL7.
- Đảo-vá bổ sung đo tay trên bản sao tạm (đột biến «cảnh báo mỗi lượt» thay vì một lần): M3 ĐỎ «cảnh báo cho 0» — ý (3) của «đột biến nào
  KHÔNG đỏ» ở trên là đã đo, không suy luận.
