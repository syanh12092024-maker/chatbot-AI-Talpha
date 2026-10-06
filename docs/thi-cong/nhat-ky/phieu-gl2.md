# Nhật ký phiếu GL2 — trần số page bật bot TOÀN HỆ `V3_TRAN_PAGE_BAT` (07/10/2026 · thợ GL2)

**Base:** `bb9e9ce` (cây chung, nhánh `vao-ui-v3-17-09`; HEAD lúc nhận `505939f`, tổng commit docs `4e3bad0` · `2a92ee0` trong lúc làm — không đụng tệp của phiếu).
**Môi trường đo:** MÁY DEV · hộp cát Postgres 127.0.0.1:5432 (CSDL `aicloser_v3_test_gl2*_p<pid>`, tự dựng/dọn qua `db/sandbox.js`) · `.env` giữ
`PANCAKE_READONLY=1` · không gọi mạng (bẫy `globalThis.fetch` ném + đếm trong ca worker) · env đặt TRONG tiến trình ca. Không đo prod, không đo `aicloser_v3`.
**Commit mã:** `2d0d335`.

## Đã làm (theo ② phiếu)
1. **Biến** `V3_TRAN_PAGE_BAT` — đọc ở MỘT chỗ `src/queue/page-routing.js#tranPageBat(env)` (vắng / rỗng / không phải số nguyên ≥ 0 ⇒ 0) +
   `moTaTranPageBat(env)` (in giá trị đo được: «0 — chưa đặt», «0 — giá trị "abc" không phải số nguyên ≥ 0») + `vuotTran` (luật) + `cauSoTran`
   (câu «đang bật x/y page — trần V3_TRAN_PAGE_BAT=…» dùng chung bốn nơi). Khai ở `docs/v3/ban-giao/bien-moi-truong-v3.md` cùng commit (VPS pilot `1`).
2. **Cổng bật** `operations.js#setPage` (chỉ `setPage` + hàm phụ `kiemTranPageBat`; `saveProduct` của TT1 không đụng): chiều BẬT, SAU `pageStatus`
   (N2), trong cùng giao dịch: `pg_advisory_xact_lock(hashtextextended(KHOA_TRAN_PAGE_BAT,0))` rồi đếm bằng `dsPageBotTraLoi(c)` (toàn hệ, KHÔNG kẹp
   team); `số bật không tính page này + 1 > trần` ⇒ 409 nói số THẬT đang bật. Tắt không bao giờ bị trần chặn. Trần RAM 5/10′ của `cong-tac.js` giữ nguyên.
3. **Worker** — `dsPageBotTraLoi` KHÔNG đổi (C1: nguồn của 6 màn). Hàm riêng: `trangThaiTran(pool, env)` (một lượt đọc) → `choPhepTheoTran(t)`
   (vượt ⇒ `[]`, không bao giờ `null`; cảnh báo có số đo ≤ 1 dòng / 5′, về trong trần ⇒ 1 dòng «về trong trần») · `dsPageBotTraLoiCoTran` = ghép
   hai cái. `chay-worker.js#motLuot` dùng MỘT `trangThaiTran` cho cả danh sách lẫn `ket.nap.lyDo` («DỪNG vì vượt trần …», không «chưa page nào bật»);
   dòng khởi động in trần + số bật. Không ghi `nhat_ky` (đúng phiếu).
4. **Đèn** `kho-suc-khoe.js`: đếm TOÀN HỆ (xem lệch L3) ⇒ vượt: đèn «Page đang bật bot» ĐỎ ở MỌI team, «Worker đang DỪNG vì vượt trần …», liệt kê
   page của team này + «còn N page bật ở team khác», đi tiếp `/page-bot`; trong trần: xanh/vàng như cũ + câu trần (vắng ⇒ «0 — chưa đặt»).
   Đèn «Máy chạy bot» khi vượt: VÀNG «đang dừng vì vượt trần … máy KHÔNG hỏng: khởi động lại không giúp gì» (không «đứng»), đi tiếp `/page-bot`.
5. **Deploy** — `preflight.mjs`: JSON đầu in `tranPageBat`; `pagesBotBat` đếm bằng `dsPageBotTraLoi`; `--ready` **hoặc `--tran`** + vượt ⇒ exit 1 có
   số đo. `setup.sh`: bước đọc-thuần đầu gọi `preflight.mjs --tran` (chặn TRƯỚC khi dừng dịch vụ — /code-review #4); pilot đòi `tranPageBat === 1`
   (đọc qua hàm chung từ cây được deploy), câu dừng «Pilot cần V3_TRAN_PAGE_BAT=1 … đọc được: <giá trị>».

## Danh sách ca (viết trước mã, thấy ĐỎ trên base: `gl2.sh` ĐỎ 5/XANH 5 rc=1; bộ ca 23 ca · 18 đỏ — 5 ca xanh trên base là ca CHO-QUA/hồi quy)
`test/gl2-tran-page-bat.test.mjs` T1 hàm đọc trần · B2a CHO-QUA bật A · B2b bật B team KHÁC ⇒ 409 số đo, B vẫn tắt · B2c tắt không bị chặn kể cả đang
vượt · B2d tắt A rồi bật B · B2e vắng/''/'abc' ⇒ 409 «0 — chưa đặt» · B2f biên trần 2 + gạt lại page đã bật · B2h đang vượt gạt lại ⇒ 409 nói đúng 3/1 ·
B2g thứ tự (van gửi đóng nói trước trần) · S3a song song ×10 vòng ⇒ đúng 1 thành · S3b ca GIỮ khoá ⇒ pg_locks thấy 2 lượt chờ, thả ⇒ 1 thành ·
W4a hàm worker `[]` + 1 cảnh báo, nguồn màn vẫn 2 · W4b cả vòng motLuot khi vượt: 0 lượt hỏi Pancake, xu.vong 0, tin vẫn `cho`/so_lan_thu 0, lyDo
vượt trần · W4c CHO-QUA thật: 1 page bật ⇒ nạp + rút tin (tin rời `cho`, 0 lượt bộ não, 0 fetch) · W4d 100 lượt đồng hồ ép ⇒ 1 dòng, +5′ ⇒ 2, về
trần ⇒ 3 · W4e 100 lượt motLuot thật ⇒ đúng 1 dòng console.warn.
`test/gl2-deploy.test.mjs` P6a preflight CLI thật (--ready/--tran, trần 1/2/vắng) · P6b setup.sh pilot thiếu/=2/=abc/=0 dừng, =1 đạt, configure không
đòi · P6c setup.sh --apply vượt ⇒ dừng trước `systemctl stop`/`npm ci`.
`v3/test/b/gl2-den-suc-khoe.test.mjs` (chuỗi THẬT: `taoTruyVanThat` + `noiVanHanhV3` + `nhipMayBot`) D5a hai team ⇒ ĐỎ cả hai · D5b máy chạy bot không
«đứng» khi vượt (tiền đề: luật nhịp tự nói đỏ «đứng») · D5c trong trần xanh + máy «đứng» thật không bị che · D5d vắng «0 — chưa đặt» · D5e page
`page_id=''` bật không tính · C5e cửa công tắc `datCongTacBot → noiVanHanhV3 → setPage` 409/thành · M4f màn Page thấy page bật khi vượt (C1).
Ba múi giờ (UTC · Pacific/Kiritimati · Pacific/Pago_Pago, TZ+PGTZ): 26/26 mỗi múi (W4d ép đồng hồ máy; D5b/D5c đồng hồ CSDL `thoi_diem = now()-3′`).

## Cổng `ops/bin/nghiem-thu/gl2.sh` — output máy trên commit `2d0d335` (rc=0)
```
── môi trường: máy dev · hộp cát Postgres trên 127.0.0.1:5432 (aicloser_v3_test_gl2*_p<pid>, tự dựng tự dọn) · cây /Users/macminim416256/Downloads/Work/AI Chatbot · 2d0d335
✅ ⓪.env-PANCAKE_READONLY=1 đọc được: '1'
✅ ①phép-1·2·3·4·4b-trần·setPage·song-song·worker pass=16 fail=0 · xanh: B2a B2b B2c B2d B2e B2f B2g B2h S3a S3b T1 W4a W4b W4c W4d W4e (đòi: T1 B2a B2b B2c B2d B2e B2f B2g B2h S3a S3b W4a W4b W4c W4d W4e)
   · [gl2] hộp cát aicloser_v3_test_gl2_p43416 · tệp đo /Users/macminim416256/Downloads/Work/AI Chatbot/src/queue/page-routing.js
✅ ②phép-6-preflight-+-setup.sh-pilot pass=3 fail=0 · xanh: P6a P6b P6c (đòi: P6a P6b P6c)
✅ ③phép-5-đèn-Sức-khoẻ-+-cửa-công-tắc-+-màn-Page pass=7 fail=0 · xanh: C5e D5a D5b D5c D5d D5e M4f (đòi: D5a D5b D5c D5d D5e C5e M4f)
✅ ④a-mb.sh:65-vẫn-đếm-đúng-1 grep -c 'WHERE bot_ai_bat = true' page-routing.js = 1 (đòi 1)
✅ ④b-biến-khai-ở-bien-moi-truong-v3.md dòng bảng = 1 (đòi 1)
✅ ④c-đọc-biến-một-chỗ-(tranPageBat) đọc thẳng env ngoài hàm = 0 (đòi 0) · hằng tên biến = 1 (đòi 1)
✅ ⑤a-setPage-đếm-KẸP-TEAM-⇒-phép-2-(B-team-khác)-đỏ đỏ: B2b B2f B2h C5e S3a S3b  (đòi đỏ: B2b C5e)
✅ ⑤b-bỏ-khoá-tư-vấn-⇒-phép-3-đỏ đỏ: S3a S3b  (đòi đỏ: S3b)
✅ ⑤c-REPEATABLE-READ-(G3)-⇒-phép-3-đỏ đỏ: S3a S3b  (đòi đỏ: S3b)
✅ ⑤d-worker-bỏ-chặn-⇒-phép-4-đỏ đỏ: W4a W4b  (đòi đỏ: W4a W4b)
✅ ⑤e-worker-trả-null-(=-MỌI-page)-⇒-phép-4-đỏ đỏ: W4a W4b W4e  (đòi đỏ: W4a W4b)
✅ ⑤f-vắng-=-1-⇒-phép-1/2-đỏ đỏ: B2e T1  (đòi đỏ: T1 B2e)
✅ ⑤g-trần-hằng-số-(câu-đo-trả-hằng)-⇒-phép-1/2-đỏ đỏ: B2e B2f T1  (đòi đỏ: T1 B2f)
✅ ⑤h-đảo-dấu-(>-thành->=)-⇒-cho-qua-đỏ đỏ: B2a B2d B2f C5e D5c D5d D5e S3a S3b W4c W4d  (đòi đỏ: B2a W4c D5c)
✅ ⑤i-chặn-đặt-vào-dsPageBotTraLoi-(C1)-⇒-màn-mất-page-đỏ đỏ: B2b B2f B2h C5e D5a D5b M4f S3a S3b W4a W4b W4c W4d W4e  (đòi đỏ: W4a M4f)
✅ ⑤j-bỏ-nhịp-cảnh-báo-(log-mọi-lượt)-⇒-phép-4b-đỏ đỏ: W4d W4e  (đòi đỏ: W4d W4e)
✅ ⑤k-lý-do-cũ-«chưa-page-nào-bật»-khi-vượt-⇒-phép-4-đỏ đỏ: W4b  (đòi đỏ: W4b)
✅ ⑤l-trần-chặn-cả-chiều-TẮT-⇒-phép-2-đỏ đỏ: B2c  (đòi đỏ: B2c)
✅ ⑤m-trần-kiểm-TRƯỚC-pageStatus-(N2)-⇒-thứ-tự-đỏ đỏ: B2g  (đòi đỏ: B2g)
✅ ⑤n-tính-cả-chính-page-đã-bật-⇒-biên-đỏ đỏ: B2f  (đòi đỏ: B2f)
✅ ⑤o-đèn-đếm-KẸP-TEAM-(C2)-⇒-phép-5-đỏ đỏ: D5a D5b  (đòi đỏ: D5a)
✅ ⑤p-đèn-vượt-mà-không-đỏ-⇒-phép-5-đỏ đỏ: D5a  (đòi đỏ: D5a)
✅ ⑤q-bỏ-vế-vượt-trần-của-đèn-Máy-chạy-bot-⇒-phép-5-đỏ đỏ: D5b  (đòi đỏ: D5b)
✅ ⑤r-preflight-bỏ-chặn---ready-⇒-phép-6-đỏ đỏ: P6a  (đòi đỏ: P6a)
✅ ⑤s-setup.sh-pilot-bỏ-đòi-trần-⇒-phép-6-đỏ đỏ: P6b  (đòi đỏ: P6b)
✅ ⑤t-đèn-đếm-cả-dòng-bảng-sẵn-sàng-cũ-⇒-trong-trần-đỏ-oan đỏ: D5a D5c D5d D5e  (đòi đỏ: D5c)
✅ ⑤u-setup.sh-bỏ---tran-ở-bước-đọc-thuần-⇒-dừng-dịch-vụ-rồi-mới-chặn đỏ: P6c  (đòi đỏ: P6c)
✅ ⑤v-đèn-đếm-cả-page-không-id-Facebook-⇒-D5e-đỏ đỏ: D5e  (đòi đỏ: D5e)
✅ ⑤w-409-nói-số-thiếu-chính-page-⇒-B2h-đỏ đỏ: B2h  (đòi đỏ: B2h)
✅ ⑤x-preflight-bỏ-qua---tran-⇒-P6a-đỏ đỏ: P6a  (đòi đỏ: P6a)
✅ ⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ) pass=26 fail=0
✅ ⑥mb.sh rc=0 · ═══ 18/18 phép đạt ═══
✅ ⑥ll3.sh rc=0 · == ĐỎ 0 / XANH 7
✅ ⑥gl1.sh rc=0 · == ĐỎ 0 / XANH 7
⏸ ⑦npm-test hoãn (CHAY_NPM_TEST=1)
== ĐỎ 0 / XANH 35
```
**Đảo-vá — đột biến nào KHÔNG đỏ:** (a) đổi mặc định `env` của `bangDen` (process.env → {}) — ca D5 truyền env tường minh nên không đỏ; chỉ
`frontend-v3-e2e` (đọc `/api/suc-khoe` bằng process.env) bắt được · (b) preflight đếm `count(*)` không lọc `page_id=''` — không ca nào dựng dòng đó cho
preflight · (c) dòng khởi động `main()` của worker và `inLuot` — không ca nào chạy `main()` · (d) nhánh đèn khi `_docSanSang` NÉM («đọc toàn hệ lỗi»)
— chỉ nhánh «chưa nối» được đi qua (bộ ca cũ suc-khoe).

## Nới ③ (thợ xin, tổng GẬT 07/10 — chỉ đặt trần trong fixture, KHÔNG đổi assert)
Lý do chung: «vắng = 0» là luật mới ⇒ mọi ca cũ dựng page bật bot mà không đặt trần đúng ra phải thấy worker DỪNG / cổng 409 / đèn đỏ.
| Tệp | Sửa | Sau mã, trước nới | Sau nới |
| --- | --- | --- | --- |
| `test/va-p7-chay-worker.test.js` (③ ghi nhầm `.mjs` — tổng sửa phiếu `2a92ee0`) | `V3_TRAN_PAGE_BAT:"2"` vào `voiEnv` của P7-1c · P7-3 · P7-4 | 7 ca · 3 đỏ («actual 0 expected 1», log «đang bật 1/0 page») | 7/7 |
| `test/frontend-v3-e2e.test.js` | `process.env.V3_TRAN_PAGE_BAT="1"` + `V3_TRAN_PAGE_BAT:"1"` trong env fixture (2 dòng) | 8 ca · 4 đỏ (bật bot qua cửa 409; đèn máy chạy bot «dừng vì vượt trần») | 8/8 |
| `v3/test/b/suc-khoe.test.mjs` | 1 dòng `process.env.V3_TRAN_PAGE_BAT \|\|= '5'` đầu tệp | 25 ca · 8 đỏ (7 «máy chạy bot · …» + «mức tổng thể») | 25/25 |
| `ops/bin/nghiem-thu/gl1.sh` | chép `src/queue/page-routing.js` vào bản sao `$T` (tệp không import tĩnh gì — `grep -c ^import` = 0) | ĐỎ 3 / XANH 4 (②a ②b ②c: ERR_MODULE_NOT_FOUND) | ĐỎ 0 / XANH 7 |
Trong ③: `test/mb2-mot-cong-tac.test.mjs` ① đặt `V3_TRAN_PAGE_BAT='2'` (khôi phục sau ca) + sửa câu chú thích đầu tệp «không cần biến môi trường nào».

## Cổng cũ ④8 (rc tách dòng, trên `2d0d335`) · npm test
- `mb.sh` rc=0 (18/18) · `ll3.sh` rc=0 (ĐỎ 0/XANH 7) · `gl1.sh` rc=0 (ĐỎ 0/XANH 7). Mốc base: cả ba rc=0. `mb.sh:65` vẫn đếm đúng 1 (④a của gl2.sh).
- Trong lúc chưa gật: `ll3.sh` đỏ ⑤ vì `ll2.sh` ⑤ chạy `frontend-v3-e2e` (fail=4) — không phải chập chờn, hết đỏ sau nới.
- `npm test`: trước (base) tests 2512 · pass 2508 · fail 0 · skip 4 → sau mã chưa nới 2535 · 2515 · **16 đỏ** (đúng 4 tệp trên + mb2 ①) → **sau
  2538 · pass 2534 · fail 0 · skip 4** (+26 ca GL2).

## /code-review (high, 10 phát hiện) — xử lý
1–3. va-p7 · suc-khoe/e2e · gl1.sh (bản sao thiếu page-routing) — ĐÃ báo tổng trước review; tổng gật nới ③ ⇒ sửa fixture (bảng trên).
4. Trần chỉ kiểm ở `preflight --ready` SAU khi dừng dịch vụ ⇒ deploy hỏng giữ UI tắt, không ai tắt bớt page được — **SỬA**: `--tran` ở bước đọc-thuần
   đầu `setup.sh` (ca P6c, đảo ⑤u ⑤x). Dựng lại claim: đọc `setup.sh` (dòng preflight không cờ ở đầu, `--ready` sau `systemctl stop`).
5. Vượt trần lâu ⇒ tin tồn (webhook) trả lời muộn sau khi chạy lại; page tắt giữ tin `cho` — **NỢ** N-GL2-TIN-TON-SAU-DUNG (= review (a) G2).
6. `motLuot` đọc trạng thái trần hai lần (lý do có thể lệch danh sách; prod 0 page bật ⇒ mỗi vòng 6 s hai SELECT) — **SỬA**: `choPhepTheoTran` trên MỘT
   `trangThaiTran` (đảo ⑤d ⑤e ⑤k đo bản sau vá).
7. Chặn dưới của đèn đếm cả page `page_id=''` (worker không đếm) ⇒ đèn đỏ oan — **SỬA** (ca D5e, đảo ⑤v). Lược đồ: `page_id NOT NULL UNIQUE`, không
   CHECK `<> ''` ⇒ tối đa một dòng như vậy, có thật được.
8. Đèn chờ cả `_docSanSang` (bảng sẵn sàng cũ + `pageStatus` mỗi page bật) chỉ để đếm — **NỢ** N-GL2-DEN-QUA-CUA-KIEM (cửa tiêm một câu đếm cần
   `vai-b.js`/`chay-that.js`, ngoài ③; các màn Trang chủ/Page/dải trạng thái đã trả cùng giá đó).
9. 409 khi gạt lại page đã bật lúc đang vượt nói số thiếu chính page — **SỬA** câu nói số thật `dangBat.length` (ca B2h, đảo ⑤w). GIỮ luật phiếu: gạt lại
   khi đang vượt vẫn 409 (`không tính page này + 1 > trần`).
10. Đếm bằng lấy `page_id` vào JS thay `count(*)` — **KHÔNG SỬA**: cố ý MỘT phép đếm (`dsPageBotTraLoi`) cho setPage · worker · đèn · preflight; ≤ 582
    dòng text ngắn dưới khoá — giá nhỏ hơn «hai định nghĩa của đếm» (đúng bệnh mb.sh/MB2 đã trả giá).
Bẫy 26: mọi chỗ vừa vá đều có đột biến riêng (⑤t–⑤x) chạy trên bản SAU vá — đỏ đúng.

## Lệch phiếu (nói thẳng)
- L1 · ③ ghi `test/va-p7-chay-worker.test.mjs` — tệp thật `.js` (tổng sửa phiếu). · L2 · nới ③ 4 tệp thước (gật, bảng trên).
- L3 · Đèn đếm toàn hệ qua cửa tiêm CÓ SẴN `_docSanSang` (= `noiVanHanhV3(pool)` ở `v3/chay-that.js:170,299` → dựng từ `dsPageBotTraLoi(pool)`) thay
  vì cửa tiêm mới như review C2 gợi ý (③ không có `vai-b.js`/`chay-that.js`) — **tổng chấp nhận**. Giá: đèn phụ thuộc bộ đọc ấy là toàn hệ (ca D5a đo
  trên chuỗi thật nên ai đổi nó sang kẹp team là đỏ); số toàn hệ = max(đếm bộ đọc, số bật có id của team) — chặn dưới chắc chắn.
- L4 · `preflight --tran` + `setup.sh` gọi ở bước đọc-thuần — ngoài chữ ②5 (phiếu chỉ nói `--ready`), thêm từ /code-review #4, trong ③.
- L5 · Đèn «Máy chạy bot» khi vượt chọn VÀNG (phiếu không định màu): một nguyên nhân, một đèn đỏ (đèn «Page đang bật bot»); giá: tin kẹt `dang_xu` thật bị
  che tới khi về trần (nợ N-GL2-MAY-KET-KHI-VUOT).
- L6 · `setPage` đếm bằng `dsPageBotTraLoi` (lọc `page_id <> ''`) thay vì chữ phiếu `count(*) WHERE bot_ai_bat`; `preflight.pagesBotBat` đổi sang cùng hàm
  (trước: `count(*)` không lọc) — một định nghĩa với worker.
- L7 · `setup.sh` pilot đọc trần qua `tranPageBat` (import `src/queue/page-routing.js` từ APP_DIR) thay vì so chuỗi — `'01'`/`' 1 '` cũng là 1.

## Nhánh test không chạm
`main()` của worker (dòng khởi động) · `setup.sh --apply` trọn đường với dịch vụ thật · nhánh đèn khi `_docSanSang` ném · deadlock khoá dòng + khoá tư
vấn (lý luận: khoá dòng page trước, khoá tư vấn chỉ một; S3a/S3b không treo).

## ⑦ ĐÃ TRA CHƯA
`awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n -i "pilot\|trần\|TRAN_BAT\|TRAN_PAGE"` ⇒ không nợ nào về trần page toàn hệ (các dòng «trần»
khác là trần kiểm kê/trang/token); `grep -n "N-MB-HAI-BO\|V3_TRAN_PAGE_BAT"` ⇒ chỉ N-MB-HAI-BO-DIEU-KIEN (hai bộ điều kiện sẵn sàng — GL8, không trùng).

## Nợ mới (§9)
N-GL2-DAI-TRANG-THAI · N-GL2-DEN-QUA-CUA-KIEM · N-GL2-TIN-TON-SAU-DUNG · N-GL2-PILOT-TRAN-1 · N-GL2-TRAN-THEO-TEAM · N-GL2-INLUOT-LY-DO ·
N-GL2-MAY-KET-KHI-VUOT (chi tiết ở §9 sổ). Phiếu ⑥ «hai mẫu unit worker khác tên» đã thuộc GL7; «tắt ai_sale trên page pilot» là H-GL.

## Ghi cho người quyết
«Dừng» = worker chạy không tải và TỰ chạy lại khi số page bật ≤ trần (tiến trình không thoát). Page poll không được nạp trong lúc dừng — Pancake v1 chỉ
trả 60 hội thoại mới nhất (bộ nhớ dự án), dừng lâu có thể sót khách.
