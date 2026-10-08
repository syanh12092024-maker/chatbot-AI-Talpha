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
# sau (1392b57) — cổng ①
TZ=UTC pass=39 fail=0 · TZ=Pacific/Kiritimati pass=39 fail=0 · ca xanh 39/39
```
Ca âm qty (Q3 Q4 Q5 Q7, R3b phần âm) xanh sau; base đỏ vì base không đọc được «Tên bậc» (nhãn «Buy N») nên từ chối với lý do khác — ca đòi
đúng mã «số lượng không khớp gói giá». Đột biến «ép qty vô điều kiện» làm đỏ đúng 4 ca âm (bảng đảo-vá).

## Cổng `ops/bin/nghiem-thu/rp1.sh` — lượt nghiệm thu (1392b57, `CHAY_NPM_TEST=1`)
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
| Đột biến | Đỏ thật (lượt nghiệm thu 1392b57) | Đòi |
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
- ⑥: `gl4.sh` rc=0 · `gl3b.sh` rc=0 · `gl3.sh` rc=0 (lượt cổng rp1 ở 1392b57). Lượt gl4.sh riêng trước commit (bản trước /code-review) cũng rc=0.
- `tt1b.sh` (chạy riêng một lượt ở 1392b57, 4307 s): rc=1 · PHÉP=41 LỖI=4 — ①–⑥ của TT1b 27/27 ✔ · ⑦ bộ ca TT1b 22/0 + 8 lưới gần (gồm
  `gsp3-doi-soat` 28/0 · `l3-m4-duyet` 19/0 · `mn3` 10/0) ✔ · cổng con: `ll2` rc=0; 4 dòng đỏ đều KHÔNG do RP1:
  - `tt1` TREO quá 2700 s (chuỗi lồng tt1 → gsp3 → gsp1 → ll15d → ve8a: `v3/test/b/ve8a-gop.test.mjs` đứng 20′18″ ở 0% CPU, 0,88 s CPU, KHÔNG
    phiên Postgres nào trên CSDL ca — thợ dừng đúng tiến trình node đó theo luật «treo > 20′ ở 0% CPU»); `gsp3` rc=1 vì chính lượt dừng đó
    (ll15d đỏ) + `ve2b-page-gop` fail=1 lồng. Chạy RIÊNG `ve8a-gop` + `ve2b-page-gop`: 24/0. Khớp án lệ N-THUOC-CHAP-CHON (GP1: «tt1b 40/41 chỉ
    tt1 TREO lồng»). Không chạy lại `tt1.sh`/`gsp3.sh` riêng (chuỗi lồng sâu ~45′, không tệp nào RP1 sửa nằm trên đường của chúng).
  - `l3-m4` rc=1 «33 dòng đỏ MỚI so với b04d0dc» và `va-r2` rc=1 «12 dòng đỏ MỚI so với b04d0dc» — tt1b so với base CỦA NÓ (b04d0dc). Chạy riêng
    hai cổng trên base RP1 `83f5f6f` và trên `1392b57`, so danh sách dòng đỏ (chuẩn hoá id/pid): l3-m4 33 = 33, 0 mới · 0 hết; va-r2 12 = 12,
    0 mới · 0 hết ⇒ đỏ SẴN trước RP1 (l3-m4 ⑤ dựng kịch bản 3 s rồi «thật=0/0»; va-r2 thước neo «pass=8» trong khi bộ ca có 11 — neo số tuyệt
    đối). Ca của hai cổng xanh: l3-m4 «⑦a ca xanh / đỏ 178 / 0».
  - Phiếu ④9 cho phép đo bằng bộ ca `test/tt1b-*` thay cổng — bộ ca xanh ở mọi lượt (22/0).
- `npm test -- --test-force-exit`: TRƯỚC (base 83f5f6f) tests 2706 · pass 2684 · fail 0 → SAU (1392b57) tests 2745 · fail 0 (+39 ca RP1;
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

---

# Vòng 2 — trả về của đối kháng (refute-rp1 · TRA_VE: F3 CHẶN · F1 NÊN nặng · F6 NÊN · F2 đưa lên trước pilot)

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-a7aa205476c2a8fd6`, nhánh `worktree-agent-a7aa205476c2a8fd6`) · base vòng 2
`5ff70a7` (= mã `1392b57` + doc của tổng; HEAD lúc nhận `ff3526a`, cây sạch ⇒ `git reset --hard 5ff70a7`) · skill `tho-thi-cong` + `viet-thuoc`,
xong `/code-review high`. Môi trường mọi số đo: **máy dev**, Postgres hộp cát `aicloser_v3_test_rp1_p<pid>` / `aicloser_v3_test_rf1_p<pid>`
trên `127.0.0.1:5432` (từ `DATABASE_URL_V3` của `.env` chép sang worktree), Pancake **GIẢ**; ca in tệp đo + cwd = worktree. Không đụng repo chính
(thợ RP2 đang sửa `rap-prompt.js` khối chung + `handler-v3.js` chấm điểm lead ở đó) — sửa của vòng 2 chỉ trong `nhanGoiGia` (+ hằng
`NHAN_TU_NOI_SO_MON` ngay dưới), `xaAnh` (+ `duLieuAnh`, chỗ gọi nhánh model), `pkSendImage`, `chuanBiDon`. Lượt «base vòng 2» chạy trên bản
sao `scratchpad/rp1v2/base` (`git archive 5ff70a7`).

## Đề bài vòng 2 — đo lại trước khi code (bẫy #4)
Ca tái lập của đối kháng (`scratchpad/rp1-refute-ca/zz-refute-rp1.test.mjs`) chạy lại trên base vòng 2 (`rp1v2/refute-base-v2.log`): 9/9
khẳng định lỗi ĐÚNG — F1 «Buy 1 Get 1 – lamang (1 item) — 99 SAR» tới khách · F2 Pancake nhận A1 hai lần, cả hai kèm caption · F3 hàng chờ
`{so_luong:5, tong_tien:15900, cua2:true}` · F6 ảnh + caption «Promo today only 55 SAR» đi khi chữ bị giết · F6b caption «2 sets = 198 SAR» đi.
Quét bản chụp 28/09 trên base vòng 2 (`rp1v2/quet-base.log`): F1 26/156 bậc · 14 page · F3 17 ca «nói N ⇒ đơn khác N» · 14 page — khớp verdict.
Đọc mã: `goiPancake` đã gắn `maHttp` (GL3c vòng 2, `0c65380` có trong base) · `flushPendingImages`/`sendImageWithRetry` của `tools.js` không còn
nơi nào trong `src/` gọi (grep) · v1 cũ (`git show 357795a^:src/pancake-poll.js:500-520`) xả ảnh cả khi chữ rỗng «vì caption đã đi kèm ảnh».

## Danh sách ca vòng 2 (viết trước — CHO-QUA · CHẶN · BIÊN · HÀNH VI)
- F3 (tầng thuần `rp1-nhan-qty`): **Q10** CHẶN — bậc nạp THẬT (`keHoachPage`) «Total 3/Total 5», qty 2 không gói không tổng ⇒ TỪ CHỐI «chưa xác
  định được gói giá»; cùng lớp BOGO qty 1 · **Q10b** CHẶN — variant LẠ («2 pieces» / «promo po») vẫn là server đoán ⇒ TỪ CHỐI · **Q10c** CHO-QUA —
  variant khớp nhãn ⇒ đơn 5 @159 · **Q10d** CHO-QUA — nêu tổng 159 ⇒ nhận; tổng 109 lệch gói đoán ⇒ TỪ CHỐI. Đường thật (hộp cát): **R3d** —
  page nạp bằng BỘ NẠP MN2 THẬT (`ghiKeHoach`) + «chép»; tool TỪ CHỐI, 0 hàng chờ; nêu gói ⇒ hàng chờ 5 · 15900 · cửa ② QUA.
- F1: **N6** nhãn tự nói số món (Buy X Get/Take Y · Take N · N FREE «1+1 FREE» · N pcs) không nối, mọi so_luong · **N7** bộ nạp MN2 THẬT
  (`keHoachPage` — tiền đề so_luong = số đầu nhãn được khẳng định trong ca) ⇒ «Buy 1 Get 1 – lamang» không «(1 item)»; nhãn thường vẫn nối ·
  **N2** (sửa) nhãn không tự nói số món vẫn nối, kể cả «Family Pack - Free Delivery» / «Take Home Pack» (CHO-QUA) · **N3** (thêm) «Family Set
  (Total 4 Products)» — luật Total tự đứng. Đường thật: **R3c** page nạp MN2 THẬT ⇒ khối KB + tin fast-lane tới khách không «(N item)».
- F2: **R2k** đường thật — Pancake nhận A1 rồi trả 502 JSON ⇒ [ảnh A1, chữ], caption tới Pancake đúng 1 lần, sổ `["khong_ro","bo_sau_khong_ro"]` ·
  **R2l** BIÊN `pkSendImage` — 500/502/504 ⇒ khongRo · 499 / 200 ⇒ không · 502 kèm `success:true` ⇒ ok · `daGoi` mọi lượt.
- F6 (hộp cát, nhánh model + fast-lane): **R8a** caption «218 SAR» + chữ đúng ⇒ ảnh không caption + chữ, sổ `caption_bi_chan` · **R8b** chữ + caption
  cùng giá bịa ⇒ 0 POST, HANDOFF, sổ `bo_cua_ra` ×2 · **R8c** CHO-QUA (luật v1) chữ bị giết, caption sạch ⇒ ảnh + caption vẫn đi · **R8d** chữ rỗng
  + caption bịa ⇒ 0 POST + HANDOFF (sau /code-review #1) · **R8f** caption fast-lane bịa ⇒ ảnh không caption + chữ.
- Nhánh KHÔNG chạm: Pancake thật (5xx kèm JSON chỉ đo trên Pancake giả — Pancake thật có nhận rồi trả 5xx không thì chưa ai đo) · caption sửa tại
  chỗ (TOO_LONG/CHECKLIST — `quaCuaRa` dùng chung, không ca riêng) · caption DUPLICATE với tin trước · nhãn khuyến mãi tiếng Tagalog/Ả Rập.
- Múi giờ: không logic ngày/giờ; cổng ① vẫn chạy UTC + UTC+14.

## Quyết định + giả định (nói thẳng)
(a) **F3 — «model đã nêu gói»** = nêu `total_price`, HOẶC `variant` mà `chonGoi` bước ①/② (KHÔNG đưa qty) trả đúng bậc đó. Rộng hơn đề nghị
    của đối kháng (`!order.variant && total == null`): variant lạ («2 pieces») rơi xuống bước ③ = server đoán ⇒ không tính (ca Q10b — đề nghị
    gốc để lọt). Giá phải trả: sản phẩm MỘT bậc ⇒ bước ① nhận mọi variant khác rỗng (chỉ một gói để chọn). Mã từ chối khi chưa nêu gói: «chưa
    xác định được gói giá; hỏi lại khách…» (như base `9f2755c`), không phải «số lượng không khớp gói giá» — để model hỏi lại gói.
(b) **F1 — rộng hơn bản vá thử** (đối kháng: chỉ khi X = so_luong): KHÔNG nối cho MỌI nhãn tự nói số món, kể cả khi so_luong khớp — «Buy 1 Get 1
    FREE» so_luong 2 nay đọc «Buy 1 Get 1 FREE», không «(2 items)» (chữ marketer đã nói gói; đường cũ `kb_cu` cũng nói vậy). Thêm «N pcs» (lớp
    «1 Set (4 pcs) (1 item)» đối kháng nêu). «Take»/«FREE» chỉ tính khi liền MỘT SỐ (sau /code-review #4). Luật «Total N» giữ riêng (dòng cũ).
    Đổi thước theo luật mới: R1d R1e R3a N2 Q1 Q2 Q4 Q9 (nhãn khuyến mãi không còn «(2 items)»). Quét: 26 → 0; còn nối 57 bậc / 23 dạng — mọi
    «(N items)» còn lại BẰNG số đầu nhãn («2 Sets (2 items)», «Combo 2 (2 items)») — không mâu thuẫn (`rp1v2/f1b-sau.log`).
(c) **F6 — chọn theo luật v1**: caption qua `quaCuaRa` cùng ngữ cảnh lượt chữ (sửa tại chỗ được thì gửi bản sửa) · caption bị chặn ⇒ ảnh đi
    KHÔNG caption khi còn chữ · caption bị chặn VÀ chữ không đi (cửa ra giết / model câm) ⇒ không gửi tấm nào + bàn giao · caption SẠCH mà chữ bị
    giết ⇒ ảnh + caption vẫn đi (v1 `pancake-poll.js` xả ảnh khi chữ rỗng «vì caption là lời đi kèm» — giữ đúng hành vi đó). Không chọn «chữ bị
    giết ⇒ bỏ mọi ảnh» (đề nghị verdict) vì v1 không làm vậy và caption sạch không phải ảnh trơ. Áp mọi đường (đường cũ `kb_cu` dùng chung
    `xaAnh`): F6c của đối kháng (cờ TẮT) nay 0 POST.
(d) `handler-v3.js`: ngoài thân `xaAnh` còn sửa `duLieuAnh` (hàm phụ — thêm `caption_bi_chan`) và chỗ gọi nhánh model `xaAnh(!!guarded)`; `xaAnh`
    tự nâng `state.handoff` khi bỏ ảnh vì caption + không chữ (khối bàn giao cuối nhánh model đọc cờ đó). Cổng ③ cho phép đúng ba dòng xoá đó.
(e) Sổ ảnh: `anh_hong_loai` thêm «bo_cua_ra» — nghĩa của `anh_hong` rộng thành «ảnh không tới khách» (không chỉ ảnh hỏng kênh).
(f) F2 đúng một chỗ: dòng `return` của `pkSendImage` (`Number(j?.maHttp) >= 500 ⇒ khongRo`); `pkSendReply`/`dauLoiGui` không đổi (lệnh: «sửa một
    dòng»). Neo `gl3.sh`/`gl3b.sh`/`gl4.sh`/`gl3c.sh` không chuỗi nào trỏ dòng này (grep) — bốn cổng rc=0.

## Đỏ trên base vòng 2 → xanh sau (bằng chứng máy)
```
# base vòng 2 (bản sao 5ff70a7), hai tệp ca BẢN CUỐI (sau /code-review) — rp1v2/ca-base-cuoi.log (lượt trước code: ca-base.log, cùng 19 đỏ)
ℹ tests 54 · ℹ pass 35 · ℹ fail 19
✖ mới đỏ đúng lý do: Q10 Q10b (NHẬN qty 5 / qty 2 BOGO) · R3d (tool NHẬN) · N6 N7 R3c («(1 item)») · R2k (A1 POST 2 lần) · R2l (khongRo
  undefined) · R8a R8b R8d R8f (caption giá bịa được POST / ảnh trơ)
✖ thước đổi theo luật mới: N2 Q1 Q4 Q9 R1d R1e R3a (nhãn còn «(2 items)»)
✔ lưới «như cũ» xanh cả base: Q10c Q10d R8c + 32 ca vòng 1
# sau (f0f28c6 ≡ e56b1fb, cùng cây) — cổng ①
TZ=UTC pass=54 fail=0 · TZ=Pacific/Kiritimati pass=54 fail=0 · ca xanh 54/54
```

## Ca tái lập của đối kháng — chạy lại trên mã mới (`rp1v2/refute-cuoi.log`, cây e56b1fb)
Ca của đối kháng KHẲNG ĐỊNH lỗi ⇒ trên mã mới 3 khẳng định ĐỎ = lỗi không còn tái lập:
- F1 ✖: khối KB «Giá — Buy 1 Get 1 – lamang: 99 SAR | Buy 2 Get 2 – lamang: 149 SAR» · tin tới khách «🎁 Buy 1 Get 1 – lamang — 99 SAR…».
- F2 ✖: POST [ảnh a1, chữ] · Pancake nhận `["a1.png+caption"]` (một lần) · `lan_gui` [1 guiAnh khong_ro, 2 guiTin da_gui].
- F3 ✖: tool «TỪ CHỐI tạo đơn: chưa xác định được gói giá…» · hàng chờ null.
- F6 (chỉ in): 0 POST, bàn giao «cửa ra chặn: PRICE_MISMATCH» · F6b: [ảnh(), ảnh(), chữ 99 SAR] · F6c (cờ TẮT): 0 POST.
- F4 · F5 không đổi (F4 ngoài phạm vi ⇒ nợ N-RP1-ANH-TU-CHOI-SO-KHONG-RO).
Quét bản chụp 28/09 (`rp1v2/quet-sau.log`): F1 26 → **0** bậc · F3 17 → **0** ca · qty-biên: «nói 2, chỉ có bậc 1 & Buy 2 Get 1 (3), không gói
không tổng» NHẬN qty 3 → TỪ CHỐI; sáu dòng còn lại như cũ (nêu gói/tổng ⇒ nhận đúng; 2 gói nhét giá 1 gói ⇒ TỪ CHỐI).

## Cổng `rp1.sh` — lượt nghiệm thu vòng 2 (cây f0f28c6 ≡ e56b1fb, `CHAY_NPM_TEST=1`, `rp1v2/cong-nghiem-thu.log`)
```
① UTC pass=54 fail=0 · Pacific/Kiritimati pass=54 fail=0 (sàn ≥54)
② ca xanh thấy / đòi 54/54
③ biến khai 1·1 · commit RP1: 3 · chạm bộ não 0 · chạm neo cổng cũ 0 · tệp ngoài ③ 0 · sửa dở 0 ·
  l4-prompt 0 · handler-v3 dòng XOÁ ngoài xaAnh/ghi sổ ảnh 0 · pancake.js dòng mã ngoài return pkSendImage 0
④ lượt CHỨNG 54/0 · 40/40 đột biến đỏ đúng tập khai (24 cũ + 16 vòng 2) · khôi phục fail=0 · băm 4 tệp trước = sau
⑤ 18 bộ ca cũ rc tách dòng, tất cả fail=0 (bh1 28 · gl4-ngat-page 23 · l3-m4-duyet 19 · l3-m4-hang-cho 25 · l4-prompt 24 · mn3 10 ·
  tt1b-te-thi-truong 22 …)
⑥ gl4.sh rc=0 (361s) · gl3b.sh rc=0 (171s) · gl3.sh rc=0 (95s) · gl3c.sh rc=0 (291s) · npm test tests=2773 fail=0
PHÉP=72 LỖI=0 · rc=0
```
Lượt nháp (trước /code-review, `BO_CONG_CU=1`, `rp1v2/cong-nhap1.log`): PHÉP=64 LỖI=1 — đột biến cũ `noi_ca_khi_co_total` SỐNG: luật khuyến
mãi mới phủ luôn mọi ca «Total» cũ (nhãn nào có Total cũng có «Buy X Get» / «Take») ⇒ luật Total không còn ca riêng đo. Sửa THƯỚC (luật 27):
thêm vào N3 «Family Set (Total 4 Products)» (Total không kèm chữ khuyến mãi), tập đòi đỏ N3 R3a → N3. Lượt nghiệm thu: đỏ đúng N3.

## Đảo-vá vòng 2 — bảng «đột biến nào KHÔNG đỏ» (luật 26: đo bản SAU vá, kể cả chỗ /code-review vừa vá)
| Đột biến | Đỏ thật | Đòi |
| --- | --- | --- |
| draft: bỏ điều kiện «model đã chọn gói» | Q10 Q10b R3d | Q10 Q10b R3d |
| draft: variant khác rỗng là đủ (đề nghị gốc) | Q10b | Q10b |
| draft: bỏ vế «nêu tổng» | Q1 Q10d | Q1 Q10d |
| nhãn: nối cả khi khuyến mãi | N2 N6 N7 Q1 Q4 Q9 R1d R1e R3a R3c | N6 N7 R1d R3a R3c |
| nhãn: bỏ vế «N pcs» | N6 | N6 |
| nhãn: «Free»/«Take» trơ không cần số (bản trước /code-review #4) | N2 | N2 |
| nhãn: bỏ vế «N FREE» («1+1 FREE») | N6 | N6 |
| xaAnh: bỏ bàn giao khi bỏ ảnh (bản trước /code-review #1) | R8d | R8d |
| xaAnh: caption không qua cửa ra | R8a R8b R8d R8f | R8a R8b R8d R8f |
| xaAnh: caption chặn + không chữ vẫn gửi ảnh trơ | R8b R8d | R8b R8d |
| xaAnh: bỏ ảnh cả khi caption sạch (đề nghị verdict) | R8b R8c R8d | R8c |
| chỗ gọi nhánh model không truyền `coChu` | R8b R8d | R8b R8d |
| caption chặn không ghi sổ | R8a R8b R8d R8f | R8a R8b R8f |
| pkSendImage: 5xx vẫn «từ chối» | R2k R2l | R2k R2l |
| pkSendImage: ngưỡng > 500 | R2l | R2l |
| pkSendImage: ngưỡng ≥ 499 | R2l | R2l |
| (cũ, sửa thước) nối «items» cả khi có Total | N3 | N3 |

**Đột biến KHÔNG đỏ: không có** trong 40 đột biến. Giới hạn đã biết: (i) caption sửa tại chỗ (TOO_LONG) không có ca riêng — đột biến «bỏ bản
sửa, chỉ nhận caption qua ngay» sẽ không đỏ; (ii) ngữ cảnh `orderCreated`/`isOrderSummary` của caption không có ca (caption kèm mã đơn ở lượt
chốt) — đổi thành `false` không đỏ.

## /code-review high (vòng 2) — 8 phát hiện: sửa 3 · bác 5 (kèm nợ)
1. **SỬA** (#1) chữ model rỗng + caption bị chặn ⇒ bỏ ảnh mà không bàn giao: khách nhắn không nhận gì, sale không biết (trái luật «KHÁCH NHẮN
   MÀ KHÔNG NHẬN ĐƯỢC CHỮ NÀO thì SALE PHẢI BIẾT» cùng tệp). Dựng lại: R8d bản trước sửa — hội thoại không HANDOFF. Vá: `xaAnh` nâng
   `state.handoff` («cửa ra chặn: <luật caption>») khi bỏ ảnh. R8d khẳng định HANDOFF + đột biến «bỏ bàn giao» đỏ R8d. Giá: chữ bị giết với
   luật KHÁC luật caption ⇒ lý do bàn giao ghi luật của caption (`ly_do` của tin vẫn ghi luật chữ).
2. **SỬA câu + nợ** (#2) caption RỖNG + chữ không đi ⇒ ảnh trơ vẫn đi, trái câu chú thích mới. Đúng: hành vi có sẵn (v1 cũng vậy), ngoài F6 ⇒ sửa
   chú thích cho đúng tầm («caption bị chặn VÀ chữ không đi»), ghi «KHÔNG đổi …», nợ N-RP1-ANH-TRON-KHONG-CAPTION.
3. **BÁC + nợ** (#3) model nêu `total_price` đúng giá bậc server đoán theo số đầu nhãn ⇒ vẫn nhận (đơn 5 @159). Đúng chữ lệnh tổng («ngoại lệ CHỈ
   khi model đã nêu gói HOẶC nêu tổng») + đề nghị của verdict; tổng là lời model cam kết một giá gói (cửa ra chỉ cho giá bậc tới khách, sale
   duyệt thấy tổng). Nợ N-RP1-TONG-LA-NEU-GOI để tổng phán + đo ở pilot.
4. **SỬA** (#4) `\bfree\b`/`\btake\b` bắt cả «Family Pack - Free Delivery» ⇒ mất «(4 items)». Dựng lại bằng N2 bản mới (đỏ trước sửa). Vá: chỉ
   tính khi liền một số. Bản chụp 28/09 không đổi (26 → 0 giữ nguyên — mọi nhãn khuyến mãi có «Buy N Get/Take»).
5. **BÁC + nợ** (#5) nhãn khuyến mãi Tagalog/Ả Rập («Bili 1 Libre 1») vẫn «(1 item)». Biên dữ liệu: bản chụp 28/09 0/156 bậc khuyến mãi không
   phải tiếng Anh (f1b liệt kê đủ nhãn còn nối) — luật 23: kết luận chỉ đúng trong biên đó. Nợ N-RP1-NHAN-KHUYEN-MAI-DA-NGU.
6. **BÁC + nợ** (#6) `pkSendReply` cùng dáng 5xx JSON; v1 `sendImageWithRetry` vẫn thử lại. Lệnh vòng 2: sửa MỘT dòng ở `pkSendImage`; v3 không
   thử lại chữ (`guiDaXacNhan` ⇒ `khongThuLai`) nên chữ không đúp; `flushPendingImages`/`sendImageWithRetry` không còn ai gọi trong `src/` (grep).
   Nợ N-RP1-5XX-REPLY-PHAN-LOAI (dời luật vào `dauLoiGui` khi cần một chỗ).
7. **BÁC** (#7) `ngat-page.js#cauLyDoGui` gọi 502 là «lỗi mạng khi gửi». Đọc mã: lỗi ảnh `khongRo` bị `xaAnh` nuốt (`loaiLoiAnh` ⇒ 'khong_ro'),
   không ném, không tới đếm GL4 ⇒ câu đó không hiện cho lỗi ảnh 5xx; ghép vào nợ #6.
8. **BÁC** (#8) 5xx kèm mã quyền 103/105/121 ⇒ `pkFetchPage` xoay token gửi lại. Hành vi có sẵn (GL3b F3 — chỉ `success:true` mới dừng xoay),
   ngoài phạm vi; thân «5xx kèm mã quyền» chưa từng đo. Ghép vào nợ N-RP1-5XX-REPLY-PHAN-LOAI (ý phụ).
Bản vá sau review có đảo-vá đo bản SAU vá (hai dòng «bản trước /code-review» trong bảng). Không chạy vòng /code-review thứ hai.

## npm test (trước/sau)
- TRƯỚC (base vòng 2 `5ff70a7`, bản sao): tests 2758 · pass 2736 · fail 0 · skipped 22 (`rp1v2/npm-truoc.log`).
- SAU (f0f28c6 ≡ e56b1fb, trong cổng ⑥): tests 2773 · fail 0 (+15 ca vòng 2).

## Nợ vòng 2 (§9)
N-RP1-ANH-TU-CHOI-SO-KHONG-RO (F4, lệnh: ngoài phạm vi) · N-RP1-ANH-TRON-KHONG-CAPTION · N-RP1-TONG-LA-NEU-GOI · N-RP1-NHAN-KHUYEN-MAI-DA-NGU ·
N-RP1-5XX-REPLY-PHAN-LOAI · N-RP1-NAP-SO-LUONG-BOGO · nối N-RP1-DOC-DUONG-TIN (`so_ai` dòng `image` thêm `caption_bi_chan`, «bo_cua_ra») ·
**trả** N-RP1-ANH-5XX-JSON (vá ở `pkSendImage`).

## Ghi cho bước ③ pilot (⑦b — vòng 2)
- **so_luong của bậc khuyến mãi page pilot phải là SỐ MÓN** (verdict F1): bậc «Buy 1 Get 1 …» nạp MN2 mang so_luong 1 (số mua). Nhãn nay không
  còn nói sai, nhưng ĐƠN: model nêu gói + qty 1 ⇒ hàng chờ so_luong 1 @99 cho gói mua 1 tặng 1 — sửa so_luong ở Sản phẩm › Theo thị trường trước
  khi bật (N-RP1-NAP-SO-LUONG-BOGO). ⑦b soát MỌI bậc, kể cả bậc không có «Total».
- Khách nói số mà model không nêu gói/tổng ⇒ tool từ chối «chưa xác định được gói giá» (đúng ý) — theo dõi tỉ lệ ở pilot.
