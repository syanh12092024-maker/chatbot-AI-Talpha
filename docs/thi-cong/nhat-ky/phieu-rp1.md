# Nhật ký phiếu RP1 — đường đọc CSDL (`V3_RAP_PROMPT_BAT=1`) đủ cho pilot

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-a614903a5ab44f1a6`, nhánh `worktree-agent-a614903a5ab44f1a6`) · base phiếu
`9f2755c` (nhánh dựng từ `83f5f6f`, chỉ thêm commit doc của tổng) · làn 🟥 · skill: `tho-thi-cong` + `viet-thuoc`, xong chạy `/code-review high`.
Môi trường mọi số đo dưới đây: **máy dev**, Postgres hộp cát `aicloser_v3_test_rp1_p<pid>` (dẫn từ `DATABASE_URL_V3` của `.env` worktree =
`127.0.0.1:5432`), Pancake **GIẢ** (fetch giả, host khác `pages.fm` ⇒ ném), cây = worktree trên (ca in `import.meta.url` của tệp đo + cwd).
Không đo `aicloser_v3` dev, không prod, không gửi tin; `PANCAKE_READONLY=1` · `HUMAN_TAKEOVER=0` giữ nguyên trong `.env`; van gửi +
`V3_RAP_PROMPT_BAT=1` chỉ mở trong env tiến trình ca. Không đụng repo chính (thợ GL3c đang sửa `src/queue/*` · `src/pancake.js` ·
`src/channels/messenger/*` ở đó).

## Dựng worktree
- HEAD lúc nhận `ff3526a`, cây sạch ⇒ `git reset --hard 83f5f6f` (chứa base `9f2755c`; `git diff 9f2755c 83f5f6f` chỉ sổ + phiếu).
- `node_modules` = symlink sang repo chính · `.env` chép từ repo chính (gitignore — không in, không commit) · PATH có shim `rg` của scratchpad.
- Lệnh của thợ chạy qua script bọc trong scratchpad (`rp1-env.sh` · `rp1-chay-ca.sh` · `rp1-ca-cu.sh` · `rp1-npm.sh` · `rp1-cong*.sh`) vì
  hộp cát tác tử từ chối lệnh `export …$(…)` lồng. Lượt «trước» chạy trên worktree tạm `scratchpad/rp1-base` @ `83f5f6f`.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ grep -n "images" src/chat/rap-prompt.js            (base)
(0 dòng)
$ grep -nE "xaAnh|invalid_upload|N-GL3B-HAN-ANH|nhanGoiGia|caption|tachSoHieu|V3_LUAT_CHUNG" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
405:| RP1 | Đường đọc CSDL đủ cho pilot …            (dòng bảng của chính phiếu)
489:  MẢNG-2 (psid-kiểm ≠ convId-dùng; `xaAnh` mất ảnh giữa vòng).
1446:  - **N-SOHIEU-CUOI** `src/pos/ten-goc.js#tachSoHieu` chỉ đọc số hiệu ĐẦU tên; POS có món ghi số ở CUỐI tên («Tummiva Gel - 176» ·
1727:  - **N-GL3B-HAN-ANH** (phiếu ⑥ F7) hạn gửi 30 s có thể cắt lượt gửi ảnh lớn (Pancake tải `content_url` đồng bộ).
1977:    `recordBlocked` (M18 mù). GHI-NỢ: RF-7 kiểm quyền psid ≠ lệnh convId · RF-8 xaAnh trước
```
Không phán cũ trùng việc RP1. Liên quan: **N-SOHIEU-CUOI** — RP1 bỏ số hiệu bằng đúng `tachSoHieu` (phiếu ② 4) nên số hiệu ở CUỐI tên vẫn tới
khách ở page gắn gốc (nâng nợ, §9). **N-GL3B-HAN-ANH** — ảnh quá hạn 30 s nay rơi vào nhánh «không rõ»: bỏ ảnh đó + các tấm sau, chữ vẫn đi.
RF-8 (xaAnh trước vòng gửi) không đổi. `ops/bin/tra_no.py` và `docs/thi-cong/SO-NO.md` không có trong repo. Quan hệ: **mới** (soát env P2) +
review (a) C1/C2.

## Bước 3 — đo lại nguyên liệu đề bài (bẫy #4)
- ① 1 ảnh: `catalog.js:23,40` đọc `anh_san_pham` vào `s.anh` ✔ · `products` không có `images` ✔ (base R1c: tool trả «Sản phẩm 111:a0 chưa có
  ảnh dùng được» — và đó là MÓN HẾT HÀNG đứng đầu, đúng ① 5). Dòng «Ảnh có sẵn» ở `kb.js:367-372` ✔.
- ① 2 ảnh hỏng chặn chữ: `handler-v3.js#guiDaXacNhan` (`:145-157`) + `xaAnh` (`:470-494`) ✔; lỗi tới `xaAnh` qua `bocCuaGuiBen` là
  `LoiGuiChuaXacNhan{cause: LoiCanDoiChieuGui{loai, kenh, chiTiet{khongRo, ma, …}}}` (`lan-gui.js:22-31`) ✔.
- ① 3 tên bậc: `goi_gia.nhan` lưu ở `operations.js:300,349,368`, ô «Tên bậc» ở `san-pham.html:426,451` ✔; `draft.js:31-32` so `qty` ✔.
- ① 6 luật lõi: `prompts.js#khoiBoLuat` đọc `kb.boLuatChung`, đòi «THẨM QUYỀN» ✔.
- **Đề bài khai SAI một chỗ (review (a) vòng 2 R2-N1):** «theo cấu trúc lỗi thì ca P3d KHÔNG đổi». Đo: làm đúng chữ ② 2 (nuốt MỌI lỗi ảnh
  `cause.kenh===true`) ⇒ `test/gl4-ngat-page.test.mjs` P3d ĐỎ (`loi_gui_lien_tiep` 0 ≠ 1, `:491`). Review chỉ xét khách s2; P3d đưa 2 ảnh cho
  CẢ s1/s3 mà POST của s1/s3 trả mã 105 ⇒ ảnh 1 bị nuốt, ảnh 2 (url rỗng, không HTTP) ném `kenh:false` ⇒ GL4 không đếm s1/s3. ⇒ lệch phiếu
  (a) dưới — báo tổng qua SendMessage, **tổng NHẬN** («lỗi quyền cấp page ⇒ ném như cũ … giữ P3d/⑤aa»).

## Danh sách ca (viết trước — CHO-QUA · CHẶN · BIÊN · HÀNH VI)
- Tầng thuần `test/rp1-nhan-qty.test.mjs` (nhãn qua `goiGiaChoChat` THẬT từ hàng `goi_gia` · đơn qua `chuanBiDon` THẬT): N1 nhãn trống ⇒
  «Buy N» · N2 nhãn tự do + «(N items)» (+ «(1 item)») · N3 có «Total N» ⇒ không nối (cả Total ≠ so_luong) · N4 nhãn chính là «Buy N»
  (hoa/thường · chữ đậm · khoảng trắng) · N5 qty bậc = so_luong · Q1 BOGO qty=1 ⇒ đơn 2 · Q2 qty = so_luong · **ÂM** Q3 qty=3 bậc 2 món ·
  Q4 có bậc so_luong 1 riêng ⇒ không ép · Q5 hai gói nhét giá một gói · Q6 giá lệch bậc · Q7 «2» chọn nhầm bậc 4 món khi BOGO so_luong 2 ·
  Q8 nhãn trống như cũ · Q9 (sau /code-review) model không nêu gói ⇒ chọn bậc theo qty.
- Postgres hộp cát `test/rp1-duong-csdl.test.mjs` — ĐI ĐƯỜNG THẬT: danh mục POS → `gopMonThanhGoc` → `ganPageVaoGoc` → bản sao `kb` (như MN2) →
  **đối soát «chép» THẬT** (`doiSoatDonVi` + `saveProduct` chỉ-giá, nối khuôn `v3/chay-that.js`) ⇒ ảnh + «Tên bậc» vào MÓN POS (không INSERT
  ảnh/giá tay lên món) → `chay-worker#motLuot` → worker → handler-v3 (`rapKb` cờ bật, `fast-lane.js` thật, cửa ra mặc định) → `bocCuaGuiBen` →
  cửa Messenger thật → `pkSendImage`/`pkSendReply` → fetch giả; thứ tự POST + `content_url` khẳng định từng lượt.
  R1a ảnh đúng thứ tự · R1b dòng «Ảnh có sẵn» (+ thiếu PUBLIC_URL) · R1c tool (tuyệt đối trước · tương đối ghép PUBLIC_URL) · R1d `buildIntro` ·
  R1e trọn đường fast-lane · R1f trọn đường model (tool thật) · R2a từ chối ×2 ⇒ thử lại 1, chữ đúng nội dung, xong, 0 việc, GL4 không đếm,
  sổ `anh_hong` · R2b chập chờn · R2c không rõ ⇒ không POST lại · **CHẶN** R2d cổng ghi chặn ⇒ ném · R2e không url ⇒ ném · R2f caption dời ·
  R2g mọi ảnh hỏng ⇒ bỏ caption, chữ y nguyên · R2h nhánh model · R2i lỗi quyền 105 ⇒ ném, GL4 đếm (lệch (a)) · R2j không rõ ⇒ bỏ các tấm còn
  lại (sau /code-review) · R3a prompt đọc «Tên bậc» · R3b trọn đường ĐƠN: model chốt BOGO qty=1 ⇒ hàng chờ so_luong 2, 10900 SAR, cửa ② QUA;
  qty=3 ⇒ tool TỪ CHỐI, 0 dòng · R4a tên bỏ số hiệu giữ đuôi, hai món khác tên · R4b page chưa gắn giữ tên · R5a hết hàng lọc · R5b mọi món hết
  ⇒ noData · R6a biến luật vắng ⇒ CORE, =1 ⇒ CSDL (+ câu khai khối KB) · R6b =1 mà bản thiếu THẨM QUYỀN ⇒ CORE và câu khai nói CORE ·
  R7a cờ tắt ⇒ so trọn đối tượng với đường cũ.
- Nhánh KHÔNG chạm: Pancake thật · ảnh lớn quá hạn 30 s (dáng «không rõ» đo bằng lỗi mạng giả) · nhãn tiếng Việt bị cửa ra chặn · màn «Prompt
  của page» / màn «Bộ luật» (nợ) · HTTP 5xx kèm JSON (nợ N-RP1-ANH-5XX-JSON) · cổng ghi chặn THẬT (van đóng thì cửa Messenger ném trước —
  dáng cổng dựng bằng fetch giả ném `LoiCuaGuiDong` đúng như cổng ném).
- Múi giờ: không ca nào đụng ngày/giờ; vẫn chạy UTC + UTC+14 (cổng ①).

## Đỏ trên base → xanh sau (bằng chứng máy)
```
# base 83f5f6f (worktree tạm), cùng hai tệp ca bản cuối — scratchpad/rp1-base-run3.log
ℹ tests 39 · ℹ pass 8 · ℹ fail 31
✔ (lưới «như cũ»): N1 N5 Q6 Q8 R2e R4b R6b R7a
✖ còn lại 31 ca — đỏ đúng lý do: products[0]=111:a0 (hết hàng) · không images · «Buy 2: 109 SAR» · tên «125 - …» · 0 POST ảnh ·
  boLuatChung từ CSDL khi biến vắng · Q3/Q4/Q5/Q7 base từ chối SAI lý do («chưa xác định được gói giá» — không đọc được nhãn)
# sau (b666da9) — cổng ①
TZ=UTC pass=39 fail=0 · TZ=Pacific/Kiritimati pass=39 fail=0 · ca xanh 39/39
```
Ca âm qty (Q3 Q4 Q5 Q7, R3b phần âm) xanh sau; base đỏ vì base không đọc được «Tên bậc» (nhãn «Buy N») nên từ chối với lý do khác — ca đòi
đúng mã «số lượng không khớp gói giá». Đột biến «ép qty vô điều kiện» làm đỏ đúng 4 ca âm (bảng đảo-vá).

## Cổng `ops/bin/nghiem-thu/rp1.sh` — lượt nghiệm thu (b666da9, `CHAY_NPM_TEST=1`)
```
① bộ ca RP1 UTC pass=39 fail=0 · Pacific/Kiritimati pass=39 fail=0 (sàn ≥39)
② ca xanh thấy / đòi 39/39
③ biến V3_LUAT_CHUNG_CSDL: dòng bảng khai · chỗ đọc 1 · 1 · commit RP1: 1 · chạm bộ não 0 · chạm neo cổng cũ 0 · tệp ngoài ③ 0 · sửa dở 0 ·
  l4-prompt dòng đổi ngoài boLuatChung 0 · handler-v3 dòng mã XOÁ ngoài xaAnh/ghi sổ ảnh 0
④ lượt CHỨNG pass=39 fail=0 · 24/24 đột biến đỏ đúng tập khai · khôi phục fail=0 · băm 3 tệp đột biến trước = sau
⑤ 18 bộ ca cũ rc tách dòng — tất cả fail=0 (bh1 28 · gl4-ngat-page 23 · l4-prompt 24 · tt1b-te-thi-truong 22 · mn3 10 · l3-m4 19+25 …)
⑥ gl4.sh rc=0 (366s) · gl3b.sh rc=0 (180s) · gl3.sh rc=0 (100s) · npm test tests=2745 fail=0
PHÉP=55 LỖI=0 · rc=0
```

## Đảo-vá — bảng «đột biến nào KHÔNG đỏ» (bản sao tạm, mỗi đột biến một tiến trình node)
| Đột biến | Đỏ thật (lượt nghiệm thu b666da9) | Đòi |
| --- | --- | --- |
| bỏ `images` (④8) | R1a R1c R1d R1e R1f R2a R2b R2c R2d R2f R2g R2h R2i R2j | R1a R1c R1d R1e R1f |
| bỏ catch ảnh (④8) | R2a R2b R2c R2f R2g R2h R2i R2j R3b | R2a R2c |
| bỏ thử lại (④8) | R2a R2b R2f R2g R2h | R2a R2b |
| nuốt cả lỗi không-HTTP (④8) | R2d R2e | R2d R2e |
| label về «Buy N» (④8) | N2 N3 N4 Q1 Q2 Q3 Q4 Q5 Q7 Q9 R1d R1e R3a R3b | N2 N3 R3a |
| draft.js so qty cũ (④8) | Q1 R3b | Q1 R3b |
| draft.js ép qty vô điều kiện (④8) | Q3 Q4 Q5 Q7 Q8 R3b | Q3 Q4 Q5 Q7 |
| name giữ số hiệu (④8) | R1d R1e R2f R4a | R4a |
| bỏ đuôi biến thể (④8) | R1d R1e R2f R4a | R4a |
| bỏ lọc hết hàng (④8) | R5a R5b + 16 ca đường thật (products[0] thành món hết) | R5a R5b |
| luật CSDL khi vắng biến (④8) | R6a | R6a |
| nuốt lỗi quyền (lệch (a)) | R2i | R2i |
| «không rõ» vẫn thử lại | R2c R2j | R2c |
| caption không dời | R2f | R2f |
| bỏ sổ ảnh hỏng | R2a R2c R2g R2h R2j | R2a R2c R2g |
| nhánh model không ghi ảnh hỏng | R2h | R2h |
| bỏ dòng «Ảnh có sẵn» | R1b | R1b |
| nối «items» cả khi có Total | N3 R1d R1e R3a | N3 R3a |
| draft bỏ điều kiện «không bậc khác» | Q4 Q7 | Q4 Q7 |
| page chưa gắn cũng bỏ số hiệu | R4b | R4b |
| (sau /code-review) bỏ chọn bậc theo qty | Q9 | Q9 |
| (sau /code-review) «không rõ» vẫn gửi tiếp | R2j | R2j |
| (sau /code-review) câu khai luật chỉ theo biến | R6b | R6b |
| (sau /code-review) «Ảnh có sẵn» kể cả ảnh không gửi được | R1b | R1b |

**Đột biến KHÔNG đỏ: không có** trong 24 đột biến đã khai. Giới hạn đã biết: (i) chưa có đột biến «câu khai bộ luật sai khi =1 và bản hợp lệ»
riêng — R6a khẳng định câu `bản này ĐANG ÁP DỤNG` nên nó đỏ nếu câu sai; (ii) độ trễ 1200 ms trước lượt thử lại không có ca đo (đổi số không đỏ).

## Bộ ca cũ + cổng cũ ④9 (rc tách dòng)
- ⑤ của cổng (mỗi tệp một tiến trình): bh1 28/0 · gia-goc-duoc-nhac 4/0 · gl4-ngat-page 23/0 (P3d ✔) · gp1-xem-ap 14/0 · kien-thuc-va-uu-dai 5/0 ·
  l0-m2-boi-canh 22/0 · l0-m2-kich-ban 20/0 · l0-m2-noi-dung 18/0 · l2-m3-ngan-sach-luot 8/0 · l2-m3-rap-prompt 6/0 · l3-m4-duyet 19/0 ·
  l3-m4-hang-cho 25/0 · l4-prompt 24/0 · ll11-kien-thuc 3/0 · mn3-ban-chep-bot 10/0 · phase0-chat-safety 9/0 · tt1-tien-te-ngoai-gcc 11/0 ·
  tt1b-te-thi-truong 22/0.
- ⑥: `gl4.sh` rc=0 · `gl3b.sh` rc=0 · `gl3.sh` rc=0 (lượt cổng rp1 ở b666da9). Lượt gl4.sh riêng trước commit (bản trước /code-review) cũng rc=0.
- `tt1b.sh` (chạy riêng một lượt ở b666da9, 4307 s): rc=1 · PHÉP=41 LỖI=4 — ①–⑥ của TT1b 27/27 ✔ · ⑦ bộ ca TT1b 22/0 + 8 lưới gần (gồm
  `gsp3-doi-soat` 28/0 · `l3-m4-duyet` 19/0 · `mn3` 10/0) ✔ · cổng con: `ll2` rc=0; 4 dòng đỏ đều KHÔNG do RP1:
  - `tt1` TREO quá 2700 s (chuỗi lồng tt1 → gsp3 → gsp1 → ll15d → ve8a: `v3/test/b/ve8a-gop.test.mjs` đứng 20′18″ ở 0% CPU, 0,88 s CPU, KHÔNG
    phiên Postgres nào trên CSDL ca — thợ dừng đúng tiến trình node đó theo luật «treo > 20′ ở 0% CPU»); `gsp3` rc=1 vì chính lượt dừng đó
    (ll15d đỏ) + `ve2b-page-gop` fail=1 lồng. Chạy RIÊNG `ve8a-gop` + `ve2b-page-gop`: 24/0. Khớp án lệ N-THUOC-CHAP-CHON (GP1: «tt1b 40/41 chỉ
    tt1 TREO lồng»). Không chạy lại `tt1.sh`/`gsp3.sh` riêng (chuỗi lồng sâu ~45′, không tệp nào RP1 sửa nằm trên đường của chúng).
  - `l3-m4` rc=1 «33 dòng đỏ MỚI so với b04d0dc» và `va-r2` rc=1 «12 dòng đỏ MỚI so với b04d0dc» — tt1b so với base CỦA NÓ (b04d0dc). Chạy riêng
    hai cổng trên base RP1 `83f5f6f` và trên `b666da9`, so danh sách dòng đỏ (chuẩn hoá id/pid): l3-m4 33 = 33, 0 mới · 0 hết; va-r2 12 = 12,
    0 mới · 0 hết ⇒ đỏ SẴN trước RP1 (l3-m4 ⑤ dựng kịch bản 3 s rồi «thật=0/0»; va-r2 thước neo «pass=8» trong khi bộ ca có 11 — neo số tuyệt
    đối). Ca của hai cổng xanh: l3-m4 «⑦a ca xanh / đỏ 178 / 0».
  - Phiếu ④9 cho phép đo bằng bộ ca `test/tt1b-*` thay cổng — bộ ca xanh ở mọi lượt (22/0).
- `npm test -- --test-force-exit`: TRƯỚC (base 83f5f6f) tests 2706 · pass 2684 · fail 0 → SAU (b666da9) tests 2745 · fail 0 (+39 ca RP1;
  lượt sau trước /code-review: 2742 · pass 2720 · fail 0).

## /code-review high — 10 phát hiện: sửa 5 · bác 5 (4 kèm nợ)
1. **SỬA** (#1, dựng lại bằng `scratchpad/rp1-cr1.mjs`: nhãn «Special Offer»/«Best Value» + qty=3 không nêu gói ⇒ «chưa xác định được gói giá»;
   nhãn trống ⇒ nhận) — hồi quy do RP1 đổi nhãn: `draft.js` chọn bậc có so_luong = qty khi model không nêu gói (so_luong UNIQUE trong sản phẩm);
   kèm lợi: BOGO «2 cái» không còn bị bước ③ chọn nhầm bậc «Buy 2 Get 2». Ca Q9 + đột biến. Gốc (chonGoi đọc qty) → nợ N-RP1-CHON-GOI-THEO-QTY.
2. **BÁC + nợ** (#2) HTTP 5xx kèm JSON `success:false` ⇒ coi «từ chối», thử lại ⇒ có thể đúp ảnh: đúng chữ phiếu («success:false dứt khoát ⇒ thử
   lại 1») + ngang v1; không phân biệt được mã HTTP mà không sửa `pancake.js` (tệp GL3c đang sửa) ⇒ N-RP1-ANH-5XX-JSON.
3. **SỬA** (#3) «không rõ» rồi vẫn gửi tiếp các tấm sau (mỗi tấm chờ trọn hạn 30 s trong giao dịch tin) ⇒ gặp «không rõ» là bỏ các tấm còn lại
   (`bo_sau_khong_ro` vào sổ), đi chữ. Ca R2j + đột biến.
4. **SỬA** (#4) caption dời sang tấm sau cả khi tấm «không rõ» có thể đã tới khách kèm caption ⇒ hết đường đó nhờ #3 (dừng sau «không rõ»);
   caption chỉ dời sau «từ chối» (chắc chắn chưa tới).
5. **BÁC + nợ** (#5) ảnh hỏng có hệ thống (PUBLIC_URL sai) không tới GL4/người, chỉ ở `so_ai.du_lieu.anh_hong`: phiếu ② 2 + review R2-N2 chốt «chữ
   OK ⇒ không đếm GL4»; handler không có kênh log ⇒ N-RP1-ANH-HONG-HE-THONG (đèn tỉ lệ ảnh hỏng — GL6).
6. **SỬA** (#6) câu khai ở mẩu bộ luật trong khối KB nói «bản này ĐANG ÁP DỤNG» chỉ theo biến, trong khi `khoiBoLuat` lùi về CORE nếu bản thiếu
   THẨM QUYỀN ⇒ câu khai tính bằng chính `prompts.js#khoiBoLuat` (import CHỈ ĐỌC). Ca R6b + đột biến.
7. **SỬA** (#7) dòng «Ảnh có sẵn» hứa cả ảnh tương đối khi thiếu PUBLIC_URL ⇒ lọc bằng đúng phép của tool (`productImages` + http(s)). Ca R1b
   mở rộng + đột biến. (Đường cũ `kb.js:367-372` có cùng lỗ — không sửa, ngoài ③.)
8. **BÁC + nợ** (#8) `soMuaDauNhan` (NFKC) ≠ `chuan` của `core/gia.js` — chỉ quyết nhận/loại qty trên bậc ĐÃ chọn, không mở chọn gói; sửa câu
   chú thích cho đúng tầm; helper chung phải export từ `core/gia.js` (ngoài ③) ⇒ N-RP1-CHUAN-NHAN-HAI-BAN.
9. **BÁC + nợ** (#9) `MA_LOI_QUYEN` chép tay `pancake.js#PERM_ERRS` (không export; tệp GL3c đang sửa) ⇒ N-RP1-PERM-ERRS-HAI-BAN.
10. **BÁC** (#10) nhánh `het_hang` trong `xayVanBanSanPham` chết trên đường `rapKb` nhưng hàm export, ca khác gọi thẳng — giữ; lệch tên
    text/products ở page CHƯA gắn là hành vi cũ, phiếu ② 4 «giữ như cũ».
Bản vá sau review có đảo-vá đo bản SAU vá (4 đột biến cuối bảng — luật 26). Không chạy vòng /code-review thứ hai.

## Lệch phiếu (nói thẳng)
(a) **Lỗi QUYỀN cấp page (mã 103/105/121 trong `chiTiet.ma`) của ảnh ⇒ NÉM như cũ**, không nuốt (② 2 viết «success:false dứt khoát ⇒ thử lại
    1 rồi bỏ»). Lý do: giữ P3d + neo `gl4.sh` ⑤aa (phiếu bắt giữ nguyên) — đề bài R2-N1 khai sai (xem Bước 3). Tổng nhận qua SendMessage. Ca R2i.
(b) `so_luong` 1 ⇒ «(1 item)» số ít (phiếu ghi « (<so_luong> items)»).
(c) Ảnh «không rõ» ⇒ bỏ ảnh đó VÀ các tấm còn lại (phiếu: «bỏ ảnh đó») — /code-review #3 #4.
(d) `draft.js` thêm chọn bậc theo qty khi model không nêu gói (ngoài chữ ② 3) — vá hồi quy do chính RP1 (/code-review #1). Luật qty có điều kiện
    của ② 3 giữ nguyên chữ.
(e) `handler-v3.js`: ngoài `xaAnh` + hàm phụ (`guiMotAnh` · `loaiLoiAnh` · `duLieuAnh` · `TRE_THU_LAI_ANH_MS` · `MA_LOI_QUYEN`) còn sửa HAI chỗ gọi
    ghi sổ `image` (`if (nAnh || anhHong.length)` + `duLieuAnh(nAnh)`) — cần cho «Sổ ghi số ảnh hỏng» của ② 2. Cổng ③ đo dòng XOÁ chỉ thuộc hai vùng đó.
(f) `rap-prompt.js` import `khoiBoLuat` từ `src/prompts.js` (bộ não — CHỈ ĐỌC, không sửa) cho câu khai ở mẩu bộ luật; câu cũ giữ nguyên chữ khi
    biến vắng (prompt pilot không đổi chữ ở khối đó). Chú thích đầu tệp «GIỚI HẠN THẬT … buildSystem không đọc kb.*» lỗi thời từ cutover 01/09 —
    viết lại cho đúng.
(g) Mọi món hết hàng ⇒ `noData` ⇒ handler bàn giao «page_no_kb» (như đường cũ: bản chép rỗng). Trước RP1 đường CSDL vẫn chào món hết rồi draft từ
    chối. `nguon_thieu` · kỹ năng · `blocks` vẫn tính trên CẢ danh sách (không coi «hết hàng» là «thiếu nguồn»).
(h) Hộp cát: bộ ca dùng `dungSandbox` ⇒ `aicloser_v3_test_rp1_p<pid>`; ④ ghi `aicloser_v3_nt_rp1_p$$` — cổng không dựng CSDL riêng (khuôn `gp1.sh`).
(i) ④9 `tt1b.sh` (hoặc bộ ca `test/tt1b-*`): bộ ca chạy trong ⑤ mỗi lượt; cổng `tt1b.sh` chạy riêng một lượt (kết quả ở trên); cổng rp1 chỉ gọi nó
    khi `CHAY_TT1B_SH=1`.
(j) Tên khối KB của page gắn gốc dùng cùng luật bỏ số hiệu (R2-N5) qua tham số `{ ganGoc }` của `xayVanBanSanPham` (mặc định false — ca cũ gọi
    thẳng không đổi).

## Nợ (§9)
N-RP1-MAN-BO-LUAT · N-RP1-MAN-PROMPT-SAN-PHAM · N-RP1-DOC-DUONG-TIN · N-RP1-CHON-GOI-THEO-QTY · N-RP1-ANH-5XX-JSON · N-RP1-ANH-HONG-HE-THONG ·
N-RP1-ANH-KHONG-RO-KHONG-VIEC · N-RP1-CHUAN-NHAN-HAI-BAN · N-RP1-PERM-ERRS-HAI-BAN · phiếu ⑥ (variant · Thị trường/Ngành hàng · introImages
PUBLIC_URL · N-GL3B-HAN-ANH · 5 ảnh trycloudflare) · N-SOHIEU-CUOI (nâng). Chi tiết ở §9 sổ.

## Ghi cho bước ③ pilot (⑦b — tổng đo prod, chỉ đọc)
- Món của page pilot phải có ảnh SAU H-GSP «chép»/«giữ giá món» (ảnh chép từ bản sao sang món), URL sống; món đầu danh sách (theo `ma`, sau lọc
  hết hàng) là món mang ảnh — tool/fast-lane chỉ lấy `products[0]`.
- «Tên bậc» các bậc của page pilot: nhãn có «Total N» khác so_luong (6/72 bản chụp 28/09) ⇒ bot đọc nhãn y nguyên — soát trước khi bật.
- `V3_LUAT_CHUNG_CSDL` để VẮNG (CORE trong mã) — màn «Bộ luật» sẽ nói «bản đang áp»: dặn người trực (N-RP1-MAN-BO-LUAT).
- `FASTLANE_TEMPLATES`/`FASTLANE_INTRO` prod = 0 (người quyết giữ Botcake chào) ⇒ ảnh đi qua tool `send_product_image` của model, không qua tin chào.
