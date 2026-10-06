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

---

## Vòng 2 (07/10/2026 · thợ GL2 vòng 2) — N1 + N2 phần rẻ của review (b)

**Base:** HEAD lúc nhận `4b64937`. Trong lúc làm, GL3b commit `55a81d7` · `c36b80c` · `0e98ecd` (không đụng tệp vòng 2). **Commit mã:** `65120b5`.
**Môi trường đo:** MÁY DEV · hộp cát Postgres 127.0.0.1:5432 (`aicloser_v3_test_gl2_v2_*_p<pid>` + các hộp cát của cổng, tự dựng/dọn) · `.env` giữ
`PANCAKE_READONLY=1` · không gọi mạng (ca N1: `fetch` là bẫy ném; ca HTTP: `fetch` chỉ cho 127.0.0.1 của máy chủ ca) · env đặt trong tiến trình ca.
Không đo prod, không đo `aicloser_v3`.

### Đã làm
1. **Mục 1 (N1) · `v3/src/ui/suc-khoe/kho-suc-khoe.js`**: khi VƯỢT TRẦN, đèn «Page đang bật bot» nói **tổng toàn hệ** ở câu đầu («Worker đang DỪNG vì vượt
   trần: toàn hệ đang bật 2/1 page — trần …»). Câu sau kể page theo team (`keTheoTeam`):
   - team người xem **là thành viên** (`teamCuaNguoi`, đã loại team kỹ thuật, cộng thêm team của vé): kể **tên page + tên team**. Team của vé ghi
     «(team đang xem)», team khác của chính người xem ghi «(team khác của bạn — đổi team ở màn Chọn team rồi tắt ở màn Page & Bot)»;
   - team **không thuộc**: chỉ **số page + tên team**, kèm «(bạn không thuộc team này)», không tên page, không id page;
   - team **kỹ thuật**: số + tên team + đường xử. Ai có vai kéo được (`VAI_CHUYEN_DUOC` = quản trị) thì thấy thêm tên + id để gõ vào ô lọc kho (lệch V2-L1);
   - câu cảnh báo: «Tắt một page thì worker chạy lại các page còn lại — kiểm page nào là page pilot trước khi tắt; page ở team khác: báo quản trị team
     đó». Nút đi tiếp vẫn `/page-bot`, chữ đổi thành «Kiểm page pilot rồi tắt bớt…». Đèn «Máy chạy bot» khi vượt nhắc đọc đèn «Page đang bật bot» trước khi tắt;
   - cổng danh tính hỏng ⇒ chỉ coi team của vé là của mình (thu hẹp, không đoán rộng ra) và đèn **nói** «không đọc được danh sách team của bạn (…)».
2. **Nới ③ (tổng gật «A» 07/10)** · `v3/src/noi-day/van-hanh-v3.js`: dòng v3 của bộ đọc cửa kiểm thêm `teamId: String(p.team_id)` và `ten: p.ten || ""`.
   Hai trường này có sẵn trong `SELECT *`.
3. **Mục 2 (N2 phần rẻ)** · `docs/v3/ban-giao/bien-moi-truong-v3.md` dòng `V3_TRAN_PAGE_BAT` ghi thêm: «Đổi/xoá biến này phải restart CẢ HAI unit
   `aicloser-v3` và `aicloser-worker-v3`». Lý do: mỗi unit nạp `.env` một lần lúc khởi động (`deploy/setup.sh:89` `--env-file`), nên worker giữ giá trị đọc
   lúc khởi động; restart một unit thì đèn và 409 nói khác worker (ví dụ 1→2). Không sửa mã worker.
4. **Thước:** hai tệp ca mới `v3/test/b/gl2-vong2-den.test.mjs` (N1a–N1e) và `v3/test/b/gl2-vong2-http.test.mjs` (H1 K1). `gl2.sh` thêm ③b ③c ④d ⑤y1–⑤y13 ⑤0b.
   Neo vòng 1 giữ nguyên, không đổi chuỗi gốc nào của ⑤a–⑤x.

### Nới ③ — điều kiện của tổng
**(1) Mọi nơi tiêu thụ bộ đọc.** Lệnh tổng: `grep -rnE "noiVanHanhV3|docSanSangV3|_docSanSang" v3/src src`. Dò thêm tên nối `docCuaKiem`/`cuaKiemMotPage` ở `vai-b.js`, vì grep của tổng không bắt được hai tên này.
Máy thật tiêm `noiVanHanhV3(pool)` (`v3/chay-that.js:169-170,299`) → `vai-b.js:293` `docCuaKiem` → sáu chỗ nối `:294 :333 :335 :336 :337 :408`:

| Nơi dùng | Dùng dòng thế nào | Có đưa dòng team khác ra trình duyệt? |
| --- | --- | --- |
| `san-sang/kho-san-sang.js:236,247-249` | `Map` theo pageId, rồi duyệt `pageTeam` (cổng kẹp team) và chỉ lấy trường của page team mình | KHÔNG |
| `trang-chu/kho-trang-chu.js:239,250` | lọc theo `cuaTeam` (page của team), rồi chỉ đếm | KHÔNG |
| `len-chay/kho-len-chay.js:122-123` | page team khác bị chặn 404 ở `:108-109` trước khi đọc; `find` đúng một pageId; c5/c6 chỉ đọc `blockers`/`aiEnabled` | KHÔNG |
| `page-bot/kho-page.js:162,179,249` | `Map`; `danhSachPage` chỉ `doc.get(page team mình)` → `gonCuaKiem` (gọn mức); `cuaKiemMotPage` trả MỘT dòng cho `kho-mot-page.js:147`, mà page ở đó đã qua `motPage` kẹp team và chỉ đọc `blockers/warnings/aiAllowed/readiness` | KHÔNG |
| `chung/trang-thai.js:101-105` | chỉ đếm `aiBat`/`tong` (đường lui khi chưa có team; có team thì `_demTeam` → `manSanSang` kẹp team, `vai-b.js:341-344`) | KHÔNG |
| `suc-khoe/kho-suc-khoe.js` (`docTranToanHe` → `keTheoTeam`) | nhóm theo team; chỉ in tên page của team mình là thành viên | KHÔNG (ca N1 + H1) |
| `v3/xem-thu.js:347` | bộ đọc GIẢ của máy xem thử, dòng không có `teamId` ⇒ đèn tự lùi về page của team | — |

Không nơi nào gửi nguyên mảng ra client.
**(2) Ca HTTP H1.** Người CHỈ thuộc team X (quản trị) đăng nhập thật rồi gọi `/api/suc-khoe` `/api/trang-chu` `/api/page-bot/danh-sach` `/api/len-chay`
`/api/len-chay/<A|B|K>` `/api/san-sang` `/api/trang-thai-bot` `/api/page-ds` `/api/page/<A|B|K>`. Chạy với ba cách bật: A+B+K, A+B, chỉ B. Thân phản hồi không được chứa
tên hay id Facebook của page team Y. Id nằm sẵn trong đường dẫn người gọi gõ thì câu 404 được phép nhắc lại. Page team kỹ thuật cũng vậy, trừ ở `/api/suc-khoe`,
nơi chủ ý hiện cho quản trị (V2-L1, đo cả hai vai ở N1c). Kèm phần CHO-QUA: lúc vượt, đèn qua HTTP có page A, có tên team Y, có «toàn hệ đang bật 2/1».
**(3) Đảo-vá «đèn lộ tên page team B».** ⑤y1 (coi mọi team là của mình) và ⑤y10 (trả nguyên dòng toàn hệ ra thân) đều làm H1 + N1a đỏ.

### Danh sách ca (viết trước mã; chạy trên base `4b64937`: 7 ca · 5 đỏ)
`gl2-vong2-den`: N1a vượt, người xem chỉ thuộc một team (chạy hai chiều u1@X, u3@Y): có tổng, có tên page + tên team của mình, có «1 page bật ở team khác» + TÊN
team kia, đủ 3 vế cảnh báo, thân `bangDen` không chứa tên/id page team kia · N1b người xem thuộc cả hai team: thấy cả hai tên, không có «team khác», có
«team khác của bạn — đổi team…» · N1c page bật ở team kỹ thuật: số + tên team + đường xử; quản trị thấy tên + id, marketer chỉ thấy số · N1d cổng danh tính
hỏng: nói mù, không lộ, đèn vẫn đỏ · N1e trong trần: xanh như cũ, không có cảnh báo.
`gl2-vong2-http`: H1 (như trên) · K1 phép đo page team kỹ thuật (dưới).
Trên base: N1a N1b N1c N1d ĐỎ. H1 đỏ ở phần CHO-QUA («đèn phải kể page A + tên team Y»); phần không-lộ XANH trên base, đúng vì base chưa lộ gì, và phần này canh
chính bản nới. N1e XANH (hồi quy). K1 XANH (đo hành vi CÓ SẴN). Lượt base đầu, H1 đỏ oan ở `/api/len-chay/<id B>` vì câu 404 nhắc lại id do người gọi gõ.
Đó là thước sai, không phải lộ, nên đã sửa thước (bỏ kiểm id nằm trong đường dẫn).
Sau sửa: 7/7 xanh, ở cả hai múi giờ `PGTZ=TZ=UTC` và `Pacific/Kiritimati`.

### Kết quả đo — page bật ở team kỹ thuật «chưa phân» (đọc mã + hộp cát, MÁY DEV)
- Đọc mã: công tắc có ĐÚNG MỘT cửa, `POST /api/page-bot/:id/bot` (`van-hanh/router.js:174-189` trả 409 `sai_cua` cho `enabled`). Cửa này đi
  `motPage` kẹp team → `noiVanHanhV3` công tắc (`SELECT … WHERE team_id=$1 AND id=$2`) → `setPage` (`operations.js:121` cũng kẹp team), tức ba lớp kẹp.
  Không vé nào mang team kỹ thuật: `teamCuaNguoi` loại team ấy (`kho-nguoi-dung.js:169`), lược đồ cấm gán thành viên (trigger `chan_tv_team_ky_thuat`),
  tầng truy vấn ném khi gặp ctx kỹ thuật. `chuyen-team.js` cấm ctx kỹ thuật và cấm đích kỹ thuật, nhưng cho ctx đứng ở team ĐÍCH kéo page về.
- Hộp cát (ca K1, `[gl2] K1 …`): `công tắc=404` (cột giữ `{team: K, bật}`) · màn Page & Bot của X không thấy page · `chọn team=403` · kho «chưa
  phân» (`GET /api/team/gan-page?nguon=chua-phan`) thấy page với `botAiBat=true`, lọc theo id ra đúng một dòng · `kéo về soXong=1` (bot VẪN bật sau kéo)
  · `tắt sau kéo=200`, cột thành `{team: X, tắt}`.
- **Kết luận (máy dev):** KHÔNG màn nào tắt thẳng được page bật ở team kỹ thuật. Đường xử có sẵn, không mở quyền mới: quản trị một team vào Cài đặt ›
  Người và team (`/cau-hinh-team`) › «Chuyển page sang team khác» › nút «Kho chưa phân team», kéo page về team mình, rồi tắt ở Page & Bot. Đèn nói đúng câu này.
  Kho cắt ở 200 dòng xếp theo tên (`pageChuaPhan` `gioiHan=200`, route không truyền) ⇒ quản trị cần id để lọc (/code-review #2 → V2-L1).

### Cổng `ops/bin/nghiem-thu/gl2.sh` — output máy, bản SAU /code-review (cây chung, trước commit `65120b5` cùng nội dung; rc=0)
```
── môi trường: máy dev · hộp cát Postgres trên 127.0.0.1:5432 (aicloser_v3_test_gl2*_p<pid>, tự dựng tự dọn) · cây …/AI Chatbot · 0e98ecd
✅ ⓪ · ①16/16 · ②3/3 · ③7/7 (vòng 1, như cũ)
✅ ③b-vòng-2-N1-đèn-vượt-kể-page-theo-team-(cách-ly-team) pass=5 fail=0 · xanh: N1a N1b N1c N1d N1e
✅ ③c-vòng-2-H1-không-lộ-qua-HTTP-6-màn-+-K1-page-team-kỹ-thuật pass=2 fail=0 · xanh: H1 K1
✅ ④a ④b ④c (như cũ) · ④d-vòng-2-N2-dòng-biến-dặn-restart-CẢ-HAI-unit khớp 4/4 cụm
✅ ⑤a…⑤x 24/24 đỏ đúng (neo vòng 1 không đổi)
✅ ⑤y1-đèn-coi-MỌI-team-là-của-mình-⇒-lộ-tên-page-team-khác đỏ: H1 N1a N1c N1d  (đòi đỏ: N1a N1c H1)
✅ ⑤y2-cổng-danh-tính-hỏng-⇒-nới-RỘNG-(coi-mọi-team-là-của-mình) đỏ: N1d
✅ ⑤y3-không-đọc-thành-viên-(chỉ-team-của-vé) đỏ: N1b
✅ ⑤y4-bỏ-câu-cảnh-báo-tắt-nhầm đỏ: N1a N1b
✅ ⑤y5-team-khác-không-nói-TÊN-team đỏ: H1 N1a
✅ ⑤y6-team-kỹ-thuật-không-nói-đường-xử đỏ: N1c
✅ ⑤y7-đèn-nói-số-của-TEAM-thay-TỔNG-toàn-hệ đỏ: H1 N1a N1c  (đòi đỏ: N1a)
✅ ⑤y8-bộ-đọc-bỏ-teamId-(nới-③-hỏng)-⇒-không-biết-team đỏ: H1 N1a N1b N1c
✅ ⑤y9-bộ-đọc-bỏ-ten-⇒-kể-id-thay-tên đỏ: H1 N1a N1b N1c N1d
✅ ⑤y10-màn-Sức-khoẻ-trả-nguyên-dòng-toàn-hệ-ra-thân-⇒-lộ đỏ: H1 N1a N1c N1d
✅ ⑤y11-page-ở-team-khác-CỦA-người-xem-không-dặn-đổi-team đỏ: N1b
✅ ⑤y12-tên/id-page-kho-tạm-hiện-cho-MỌI-vai đỏ: N1c
✅ ⑤y13-quản-trị-không-được-id-page-kho-tạm-(không-lọc-được-kho-200-dòng) đỏ: N1c
✅ ⑤0-bản-sao-nguyên-vẹn-xanh-(thước-không-tự-đỏ) pass=26 fail=0
✅ ⑤0b-bản-sao-nguyên-vẹn-vòng-2-xanh pass=7 fail=0
✅ ⑥mb.sh rc=0 · ═══ 18/18 phép đạt ═══
✅ ⑥ll3.sh rc=0 · == ĐỎ 0 / XANH 7
✅ ⑥gl1.sh rc=0 · == ĐỎ 0 / XANH 7
⏸ ⑦npm-test hoãn (CHAY_NPM_TEST=1)
== ĐỎ 0 / XANH 52        (vòng 1: 35)
```
Lượt cổng trước /code-review: ĐỎ 0 / XANH 49, rc=0 (⑤y1–⑤y10).
**Đột biến nào KHÔNG đỏ / không đo:** K1 là phép đo hành vi có sẵn, chặn bằng ba lớp kẹp team. Không đặt đột biến một lớp nào, vì đột biến một lớp sẽ không làm K1 đỏ:
hai lớp còn lại vẫn chặn. Đó là chủ ý phòng thủ nhiều lớp, không phải thước hỏng. H1 chỉ canh danh sách API hôm nay (nợ N-GL2-BO-DOC-MANG-TEN). Nhánh `id === ''`
(dòng không có `teamId` và không thuộc team này ⇒ «N page chưa rõ team») và nhánh vé máy (`nguoiDungId` rỗng) chưa có ca.

### Bộ ca cũ · npm test
- `v3/test/b/suc-khoe.test.mjs` + `test/frontend-v3-e2e.test.js` + `v3/test/b/gd1-mot-nguon.test.mjs`: 44/44 xanh. `gl2-den-suc-khoe` 7/7 xanh, D5a không đổi assert.
- `npm test` (cây chung): **trước** (lúc nhận, `4b64937` + việc GL3b chưa commit) tests 2542 · pass 2538 · fail 0 · skip 4. **Sau** (HEAD `0e98ecd` + vòng 2,
  bản sau /code-review) tests 2563 · pass 2559 · **fail 0** · skip 4. Phần chênh +21 = +14 ca GSP3c cherry-pick (GL3b commit giữa chừng) + **7 ca vòng 2**.
  Bản sao sạch `git archive 0e98ecd`: tests 2556 · fail 0 · skip 22. Bản sao skip nhiều hơn vì thiếu các tệp ngoài git; số tests 2556 + 7 = 2563 khớp.

### /code-review (high, 10 phát hiện) — xử lý (mỗi claim dựng lại hoặc bác bằng lệnh)
1. Người xem thuộc cả X lẫn Y đang đứng ở X: page B (Y) bị xếp «của mình», nút dẫn về /page-bot X ⇒ tắt nhầm A, đúng kịch bản N1 — **SỬA**: nhãn «(team khác của
   bạn — đổi team ở màn Chọn team rồi tắt ở màn Page & Bot)». Có ca N1b, đảo ⑤y11.
2. Đường xử team kỹ thuật không làm theo được khi kho > 200 page, vì danh sách cắt 200 dòng xếp theo tên mà đèn giấu tên/id (đo: `pageChuaPhan` `gioiHan=200`,
   route không truyền; kho từng có 305 page) — **SỬA**: vai kéo được thấy tên + id kèm «gõ id vào ô lọc của kho», vai khác chỉ thấy số. Có ca N1c (hai vai),
   K1 (lọc theo id ra đúng 1 dòng), đảo ⑤y12 ⑤y13 (→ V2-L1).
3. Dòng cũ `old.pages` có `aiEnabled=true` làm đếm dư hoặc ghi «chưa rõ team» — **KHÔNG SỬA, không dựng lại được**: `src/readiness.js:100` luôn trả `aiEnabled: false`
   (CR-02-10), nên dòng cũ không bao giờ vào `dsBat`. Phép đếm dòng cũ đã có đảo ⑤t canh.
4. Nới bộ đọc chung (thêm `teamId`/`ten`) ⇒ cách ly dựa vào từng màn tự lọc — **NỢ** N-GL2-BO-DOC-MANG-TEN. Đây là phương án A tổng đã chọn; H1 canh các API
   hôm nay. Trước vòng 2, một màn trả nguyên mảng thì đã lộ id Facebook rồi; nay lộ thêm tên.
5. Kể tên page của mọi team có dòng thành viên, bất kể vai — **KHÔNG SỬA**: đề vòng 2 ghi «team NGƯỜI XEM LÀ THÀNH VIÊN». Thành viên team (kể cả sale)
   vốn làm việc trên hội thoại của page team mình.
6. N+1 đọc tên team — **KHÔNG SỬA**: chỉ chạy khi VƯỢT. Số lượt đọc = `teamCuaNguoi` (3 câu) + một `teamTheoId` cho mỗi team không thuộc; team của vé lấy tên
   từ `teamCuaNguoi`.
7. Lọc `aiEnabled` hai lần — **KHÔNG SỬA**: cố ý giữ nguyên dòng `toanHe = …` để neo đảo-vá ⑤t của vòng 1 không đổi (tổng dặn giữ neo cũ). Giá: hai phép lọc
   có thể lệch nhau nếu sau này sửa một bên.
8. `teamCuaNguoi` trả `tenTeam = teamId` khi thiếu dòng team — **KHÔNG SỬA, không dựng lại được**: `thanh_vien_team.team_id REFERENCES team(id) ON DELETE CASCADE`
   (`001_nen.up.sql:45`).
9. `teamId` dòng cũ là slug — **KHÔNG SỬA, không dựng lại được**: dòng `readiness.js` không có trường `teamId` (`:96-102`).
10. Đèn nói số toàn hệ hai lần, hai mức chắc chắn — **SỬA**: chỉ còn một con số ở câu đầu, «toàn hệ (ít nhất — <lý do>) đang bật x/y». Câu kể đổi thành «Page
    đang bật theo team — …». Đảo ⑤y7 đổi neo theo.
Bẫy 26: mọi chỗ vừa vá đều có đột biến chạy trên bản SAU vá (⑤y7 ⑤y11 ⑤y12 ⑤y13) và đều đỏ đúng.

### Lệch (nói thẳng)
- **V2-L1 · page team kỹ thuật: người kéo được thấy tên + id** (chữ đề: team khác «chỉ SỐ + TÊN team»). Chọn vậy vì đường xử phải làm theo được (kho cắt 200
  dòng). Không lộ thêm gì: kho «chưa phân» là kho dùng chung, không phải dữ liệu của team nào (`gan-page.js:67-83`), và `GET /api/team/gan-page?nguon=chua-phan`
  đã trả tên + id cho vai `quan-tri`/`quan-ly`. Đèn chỉ hiện cho `VAI_CHUYEN_DUOC` = `quan-tri`, là tập con. Giá phải trả: lệch chữ đề. Tổng không nhận thì
  đổi `keTen` thành `''` (đảo ⑤y13 đỏ đúng chỗ ấy; ca N1c phải đổi theo).
- **V2-L2 · import, không sửa tệp**: `teamCuaNguoi`/`teamTheoId` (`auth/kho-nguoi-dung.js`, có tiền lệ ở `chung/router-dieu-huong.js:16` và `bao-cao/kho-don-pos.js:6`,
  dù đầu tệp ấy ghi «chỉ tầng đăng nhập gọi») và `VAI_CHUYEN_DUOC` (`team/gan-page.js`, để giữ một nguồn với cửa ghi).
- **V2-L3 · câu đầu của đèn đổi** «Worker đang DỪNG vì vượt trần: **toàn hệ** đang bật …» (/code-review #10). D5a không đổi assert, vẫn xanh.
- **V2-L4 · `gl2.sh` thêm tệp ca và đảo-vá** vào bản sao tạm. Không đổi chuỗi gốc nào của ⑤a–⑤x.

### ⑦ ĐÃ TRA CHƯA
`awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n -i "team kỹ thuật\|chua-phan\|chưa phân"` ⇒ 5 dòng, đều về di trú/kéo danh mục/POS
(N-MN8a, N-GSP-TEAM-KT, nợ B-Y3). Không dòng nào về đèn kể page theo team. Nợ GL2 hiện có: `N-GL2-DAI-TRANG-THAI DEN-QUA-CUA-KIEM HAI-UNIT-DOC-TRAN
INLUOT-LY-DO MAY-KET-KHI-VUOT PILOT-TRAN-1 TIN-TON-SAU-DUNG TRAN-THEO-TEAM`. Vòng 2 làm phần rẻ của N-GL2-HAI-UNIT-DOC-TRAN (dòng biến). Phần bền
(worker tự báo trần, GL6) còn nguyên.

### Nợ mới (§9)
N-GL2-BO-DOC-MANG-TEN (chi tiết ở §9 sổ).

### Ghi cho tổng
- `.claude/skills/mo-van/SKILL.md` §5 («xoá dòng biến khỏi `.env` rồi restart», review (b) N2 trỏ dòng 91) **chưa** ghi «restart CẢ HAI unit». Tệp ngoài
  pathspec, tôi không sửa. Nên ghép vào lượt tổng chưng cất skill, hoặc vào sổ phát hành pilot.
- Câu đèn khi vượt nay dài (một câu cho mỗi team). Ở pilot trần 1 thì vượt nghĩa là ≥ 2 page, nên chịu được. Chưa kiểm hiển thị trên trình duyệt (trang dùng
  `text(d.vi)`, không đổi tệp html).
