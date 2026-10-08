# Nhật ký phiếu RP2 — khối Chính sách · FAQ · Phản đối vào đường CSDL (theo team) · chấm điểm lead cả tin đã nhường Botcake · `AM_THRESHOLD` 2 → 1

Thợ: Claude Opus 5.5 (cây chung `vao-ui-v3-17-09`, thợ duy nhất trong cây — RP1 vòng 2 chạy worktree riêng `.claude/worktrees/agent-a7aa205476c2a8fd6`)
· base phiếu `5ff70a7` (HEAD lúc nhận; giữa chừng tổng commit `17f1a4d` — chỉ sổ) · làn 🟥 · **Đụng bộ não: `src/lead-score.js` — CHỈ hằng `AM_THRESHOLD`
(+ chú thích)** · skill `tho-thi-cong` + `viet-thuoc`, xong `/code-review high`.
Môi trường MỌI số đo dưới đây: **máy dev**, Postgres hộp cát `aicloser_v3_test_rp2{w,k}_p<pid>` (`db/sandbox.js`, dẫn từ `DATABASE_URL_V3` của `.env`
= `127.0.0.1:5432`), Pancake/model **GIẢ** (cửa gửi + model tiêm, không mạng). Không đo `aicloser_v3` dev, không prod, không gửi tin; `.env` giữ
nguyên (`PANCAKE_READONLY=1` · `HUMAN_TAKEOVER=0`); `V3_RAP_PROMPT_BAT=1` chỉ trong env tiến trình ca. Ca in tệp đo (`import.meta.url`) + cwd.
Số đo chi phí: mẫu `mau-duong-ban.json` của máy dev (719 hội thoại thật, kéo 16/09, đã che PII).

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ grep -n "khoi_dung_chung\|docKhoiChung" src/chat/rap-prompt.js        (base)
(0 dòng)
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md
ls: … No such file or directory (cả hai)
$ grep -nE "N-MN7|AM_THRESHOLD|khoi_dung_chung|diem_lead|nhường Botcake" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
406:| RP2 | … (dòng bảng của chính phiếu)
1419:  - **N-MN7** bot có MỘT bộ Chính sách/FAQ/Phản đối cho mọi page ⇒ team thật thứ hai lên bot thì phải tách ba khối theo page …
3633/3641-3643: quyết định người quyết 08/10 (nguồn của phiếu)
```
Không phán cũ trùng. Liên quan **N-MN7**: RP2 đọc khối THEO TEAM ở đường CSDL — khi cửa lưu nới cho team 2/3 (phiếu ⑥) thì đường CSDL đã sẵn.

## Bước 3 — đo lại nguyên liệu đề bài
- `kb.js#sharedTuTep` đọc tệp toàn hệ (`:398-407` — phiếu ghi `:391-413` ✔) · `khoi-chung.js#docKhoiChung` theo team (`:36-50` ✔, đã bắt 42P01).
- `handler-v3.js` chấm trên cụm (`:404-412` ✔) · worker nhường trước handler (`worker.js:299-325` ✔) · cụm = tin sau tin page cuối (`nap.js:129-146` ✔).
- `AM_THRESHOLD` `lead-score.js:56` ✔ · ca B1 `lead-score.test.mjs:90-96` ✔.
- `HUMAN_TAKEOVER`: chỉ `src/conv-owner.js:27` đọc, dùng trong `decideConv`; `grep -rn "decideConv(" src v3/src` ⇒ chỉ định nghĩa (người gọi cuối bị
  gỡ ở MB4 `357795a` — `git log -S"decideConv("`). `src/chat/human.js` KHÔNG đọc biến ⇒ lời khai ② 4 đúng; cổng ③ đo lại mỗi lượt.
- **Giờ Pancake không múi giờ** (`"2026-09-13T03:24:39.000000"`): `Date.parse` hiểu theo giờ MÁY — đo node: `TZ=Pacific/Kiritimati` lệch −14 giờ.
  ⇒ quyết định cửa sổ 24 giờ (dưới).
- Mẫu chi phí có ở gốc cây chung (gitignore) ✔.

## Danh sách ca (viết trước) — 4 tệp, 28 ca
- `test/rp2-cham-lich-su.test.mjs` (thuần, `chamTheoLichSu`): C1 A' thuần (price từ câu Botcake đã trả lời, mốc = giờ tin hiện tại) · C2 chữ
  Botcake KHÔNG chấm · C3 chưa mốc: tin > 24 giờ (tên + SĐT + địa chỉ đơn cũ) không chấm, tin 20 giờ trước VẪN chấm · C3b mốc cũ > 24 giờ vẫn kẹp ·
  C4 chống chấm lặp (lịch sử hai «ok»: điểm VÀ phạt không đổi, chuỗi cụt chỉ +1 cho tin mới) · C5 BẤT BIẾN: hội thoại bot trả lời mọi cụm (6 lượt,
  có cụm 2 tin) ⇒ y hệt chấm cụm cũ từng lượt · C7 tin khách gõ SAU tin đang xử không bị mốc nuốt · C8 lịch sử rỗng ⇒ như cũ · C9 hồ sơ cũ không mốc
  giữ tín hiệu · C10/C11 (sau /code-review) · N1 ngưỡng 1 · N2 nhóm khác không đổi.
- `test/rp2-worker-a-phay.test.mjs` (WORKER THẬT `chayMotVong` → `docTin` tiêm → `nhanDienSale` → nhường / handler → gác ngân sách → cửa tiêm):
  W1 A' · W2 A · W3 B · W4 chữ Botcake trên đường worker.
- `test/rp2-khoi-chung.test.mjs` (rapKb hộp cát): K1a chữ cụ thể + mỗi tiêu đề 1 lần · K1b trùng TỪNG KÝ TỰ với đoạn đường cũ THẬT (`datKhoiChung` →
  `getKBForPage` của một page trong bản chép; đoạn so khác rỗng; `KB_CHUNG_FILE` ngoài gốc repo) · K1c sau sản phẩm, trước kỹ năng · K1d team khác ·
  K1e dòng rỗng ⇒ không tiêu đề trơ · K1f không thêm `nguon_thieu` · K1g cờ tắt 0 lượt đọc, cờ bật đọc MỖI lượt · K2a SQL THÔ trên pool RIÊNG ⇒
  lượt kế thấy ngay (sửa T + thêm T2).
- `test/rp2-do-chi-phi.test.mjs`: D1 công cụ trên mẫu nhỏ (đáp án tính tay, đi qua mọi bậc ngân sách) · D2 vắng mẫu ⇒ «không có mẫu», rc=0.
- Nhánh KHÔNG chạm: bộ nạp thật (tin xếp tay `xepTin`) · lớp từ khoá/Fast Lane trả lời (tiêm «không nhận») · CSDL chưa áp 026 · màn «Prompt của
  page» · webhook gộp lô.

**Đỏ trên base** (`5ff70a7`, chép 4 tệp ca vào worktree base): **28 ca · 21 đỏ · 7 xanh** ở CẢ UTC lẫn UTC+14 — 7 xanh là lưới chống vá quá tay
(C0 D2 K1d K1e K1f N2 W4). W1 base: lượt 1 điểm 0 · lượt 2 `ngan_sach_het:LANH` → `HANDOFF/SALE` (đúng RV-N1 của review).

## Đã làm
1. **Khối chung theo team** (`rap-prompt.js#rapKb` nhánh cờ bật): `docKhoiChung(pool, teamId)` trong `Promise.all` cùng ba khối kia (đọc mỗi lượt,
   không nhớ RAM) → `kb.js#vanBanKhoiChung` (hàm MỚI export — thân cũ của `sharedTuTep`: cả ba rỗng ⇒ `''`, còn lại `buildShared`) chèn SAU khối sản
   phẩm, TRƯỚC kỹ năng. `sharedTuTep` gọi lại hàm đó (không đổi hành vi — mn7/ve4 xanh). `khoi-chung.js` không đổi. Không `nguon_thieu`.
2. **Chấm trên lịch sử** (`ngan-sach-luot.js#chamTheoLichSu`, handler bước 3b gọi thay `chamVaTinhNganSach(text, …)`; dep đổi tên
   `chamTheoLichSu` — grep: không ca/ops nào tiêm dep cũ): MỘT lần `scoreTurn` trên (tin KHÁCH của `history` TRƯỚC tin page cuối, giờ > mốc và
   > mới nhất − 24 giờ) + cụm; mốc = max(mốc cũ, giờ tin khách trong `history`, giờ tin đang xử theo `msg_id`) gắn lại vào `diem_lead.moc`.
3. `AM_THRESHOLD = 1` + chú thích (hằng + dòng LẠNH của `turnBudget`) · B1 chỉ đổi kỳ vọng.
4. `bien-moi-truong-v3.md`: `HUMAN_TAKEOVER` chỉ mã cũ (đo grep, cổng ③ đo lại) · dòng `V3_RAP_PROMPT_BAT` thêm khối chung theo team.
5. `ops/bin/do-ngan-sach-luot.mjs` (công cụ đo, gọi ĐÚNG hàm handler gọi cho «sau») · `ops/bin/nghiem-thu/rp2.sh`.

## Quyết định ghi rõ (luật 11/13)
- **Cửa sổ 24 giờ tham chiếu TIN MỚI NHẤT của lịch sử, không `Date.now()`**: so giờ tin với giờ tin ⇒ lệch múi giờ máy triệt tiêu (Pancake không
  múi). Giá: hội thoại mà tin mới nhất cũ (không xảy ra — tin đang xử luôn mới) — không có. Đảo-vá `cua_so_theo_dong_ho_may` đỏ ở UTC+14.
- **Có mốc vẫn kẹp 24 giờ** (phiếu chỉ nói «lần đầu»): rủi ro «đơn cũ ⇒ SÁT ĐƠN + ƯU TIÊN» y hệt khi mốc cũ hơn một ngày; ngân sách cũng tính 24 giờ.
- **Bỏ phần đầu cụm hiện tại khỏi phần lịch sử** (tin khách SAU tin page cuối — cùng phép `gomCumTinKhach`): không bỏ thì «ok»+«ok» thành 3 chữ,
  luật tin cụt đổi (C5 + đảo-vá `dem_doi_cum_hien_tai`).
- **Mốc không phủ tin gõ SAU tin đang xử** (Botcake trả lời nó ⇒ không bao giờ vào hàng ⇒ lượt sau phải chấm — C7).
- So sánh CHẶT `> mốc`: đổi `≥` sẽ chấm lại tin biên MỖI lượt (có hệ thống) — chọn lỡ hiếm tin cùng giây (nợ N-RP2-MOC-CUNG-GIAY).

## /code-review high — 10 phát hiện: sửa 6 · bác 3 · 1 thành nợ (kiểm chứng từng claim bằng lệnh trước khi sửa)
| # | Phát hiện | Kiểm chứng | Xử |
|---|---|---|---|
| 1 | thông báo Facebook Payments `fb-pma://…invoice_id=<số dài>` bị chấm | `scanSignals(…invoice_id=1029384756123…)` ⇒ `['phone']`; mẫu 719 có 4 tin như vậy | **SỬA** bỏ như `nap.js` (C11 · đảo-vá `bo_loc_fb_pma`) |
| 2 | nối tin 24 giờ bằng «\n» ⇒ khớp xuyên tin | `"price 1200\n1500 for 2?"` ⇒ phone · `"i am\nMaria Santos"` ⇒ name; đo mẫu 719: 260 lượt có tin nhường, **14** sinh tín hiệu xuyên tin (name 12 · address 2 · phone 0) | **SỬA một phần**: nối «\n·\n» chặn SĐT + nhãn tên (C11 · đảo-vá `noi_bang_xuong_dong`); còn address + dòng tên ⇒ nợ N-RP2-NOI-XUYEN-TIN (không đổi được mà giữ «MỘT lần scoreTurn» của phiếu, `lead-score.js` chỉ đổi hằng) |
| 3 | `msg_id` không khớp ⇒ `historyBeforeMessage` lùi về `tao_luc` thật vs giờ Pancake không múi | đọc `history.js:12-15` | **SỬA**: không thấy tin đang xử ⇒ chỉ chấm cụm như trước RP2, giữ mốc (C10 · đảo-vá `bo_lui_khi_khong_thay_tin`) |
| 4 | webhook gộp lô: mốc không phủ tin nối thêm | đọc `worker.js:252-270` | nợ N-RP2-MOC-WEBHOOK-LO (phần lớn đã về nhánh #3 vì mid Meta ≠ id Pancake; page pilot `poll`) |
| 5 | 42P01 trong giao dịch worker huỷ cả giao dịch — lời khai sai | hành vi Postgres 25P02; `layKb` nhận `khach` | **SỬA lời khai** + nợ N-RP2-42P01-GIAO-DICH (cùng giới hạn `catalog.js`; prod đã áp 026) |
| 6 | page team chưa có khối mất ba khối im lặng | — | **BÁC**: phiếu ② 1 «team chưa có ⇒ không chèn» + «KHÔNG thêm nguon_thieu» (N5); ⑦b tổng đo page pilot thuộc team 1 · nợ giám sát N-RP2-KHOI-CHUNG-VANG-IM |
| 7 | so chặt `>` với giờ tới giây · mốc lệ thuộc TZ máy | — | **BÁC sửa** (đổi `≥` tệ hơn — trên) · nợ N-RP2-MOC-CUNG-GIAY |
| 8 | `historyBeforeMessage` tính hai lần | — | **BÁC**: một nguồn trong hàm thuần, ≤ ~60 tin; truyền `history` từ ngoài là thêm một đường lệch |
| 9 | công cụ chép bậc `turnBudget`, kiểm lệch chỉ ở ngưỡng đang chạy | — | **SỬA**: `kiemLech` so MỌI hồ sơ điểm MỌI cấu hình với `turnBudget` thật; D1 thêm hội thoại qua NÓNG/ĐANG CHỐT/SÁT ĐƠN/phản đối; đảo-vá `turnbudget_troi` ×2 (không đổi `turnBudget` — ③ chỉ hằng) |
| 10 | chú thích LẠNH «Fast Lane lo phần lớn nhóm này» lỗi thời | — | **SỬA** chú thích (cổng ③ so phần MÃ, bỏ chú thích cuối dòng) |

Không chạy vòng /code-review thứ hai; luật 26 thay bằng đảo-vá trên bản SAU vá (6 đột biến mới cho chỗ vừa vá, đều đỏ đúng).

## Nghiệm thu — `ops/bin/nghiem-thu/rp2.sh` (lượt đủ, cây `76399c3`): **PHÉP=59 LỖI=0 · rc=0**
```
① TZ=UTC pass=28 fail=0 · TZ=Pacific/Kiritimati pass=28 fail=0 (sàn ≥28)
② ca xanh thấy / đòi 27/27
③ commit RP2: 1 · chạm bộ não KHÁC 0 · tệp cấm (phase1 · bh7 · gl3*/gl4/rp1) 0 · ngoài ③ 0 · sửa dở 0
   lead-score: dòng mã ngoài AM_THRESHOLD 0 · «= 1» 1 · handler ngoài chỗ chấm 0 · ngan-sach XOÁ 0 · kb.js XOÁ ngoài sharedTuTep 0 · khoi-chung 0 · B1 0
   tài liệu khai HUMAN_TAKEOVER 1 · chỗ gọi decideConv 0 · chỗ đọc biến ngoài conv-owner 0
④ 24 đảo-vá — lượt CHỨNG pass=28 fail=0 · khôi phục fail=0 · băm cây trước = sau
⑤ đo chi phí rc=0 (số dưới)
⑥ 20 bộ ca cũ fail=0 (bh1 28 · gl7a 18 · gop-kiem-tra-cheo 5 + huỷ 5 SẴN · gp1 14 · l2-m3-ngan-sach 8 · l2-m3-rap-prompt 6 · l4-prompt 24 ·
   lead-score 14 · mn7 8 · phase0-chat-safety 9 · phase1-chat-flow 12 · rp1-duong-csdl 25 · rp1-nhan-qty 14 · tt1b 22 · ve4-khoi-chung 5 ·
   he-kieu 15 · ll1 8 · ve2 4 · ve4-luat-chung 7 · ve7e 6)
⑦ rp1.sh rc=0 · 225s (BO_CONG_CU=1 — gl4/gl3b chạy riêng, gl3 trong gl3b) · gl3b.sh rc=0 · 106s (không CHAY_SO_BASE ⇒ không kéo gsp3b) ·
   gl4.sh rc=0 · 320s (trọn, gồm ⑥ của nó) · bh7.sh rc=1 · 5s — ĐỎ SẴN ở 5ff70a7: 1 dòng (④ luật-tin-ngắn-trong-CORE) giống hệt base, 0 dòng mới
   npm test tests=2786 fail=0
```
(Lượt ⑦ chạy song song với `rp1.sh` của thợ RP1 vòng 2 trong worktree riêng — vẫn xanh.)

### Đảo-vá (bản sao tạm, mỗi đột biến một tiến trình) — đỏ thật / đòi
| đột biến (④6) | đỏ thật | đột biến (thêm) | đỏ thật |
|---|---|---|---|
| bỏ khối chung | K1a K1b K1c K2a (K1d K1e còn xanh) | đếm đôi cụm hiện tại | C5 |
| đọc tệp toàn hệ | K1a K1d K1e K1g K2a | mốc phủ cả tin gõ sau | C7 |
| khối nhớ RAM | K1g K2a (K1a K1b còn xanh) | mốc không phủ tin hiện tại | C1 C5 C7 |
| chỉ chấm cụm | W1 W2 (W3 W4 còn xanh) | chấm từng tin | C2 C4 W4 |
| chấm ở nhánh nhường worker | **W1** (W2 còn xanh — đúng: cổng phân biệt) | chỉ kẹp 24 giờ khi chưa mốc | C3b (C3 còn xanh) |
| không gắn lại mốc | C1 C4 C5 C7 W1 | cửa sổ theo đồng hồ máy (UTC+14) | C3 C3b D1 |
| chấm cả chữ Botcake | C2 C4 C5 W4 | tiêu đề trơ | K1d K1e |
| bỏ mốc 24 giờ lần đầu | C3 C3b | thêm `nguon_thieu` khối chung | K1f |
| ngưỡng về 2 | C1 C3 N1 W1 W2 W3 (N2 còn xanh) | công cụ: «sau» chấm cụm · bỏ mô phỏng Botcake | D1 · D1 |
| | | sau /code-review: bỏ lùi khi không thấy tin · bỏ lọc fb-pma · nối «\n» · turnBudget trôi NÓNG / ĐANG CHỐT | C10 · C11 · C11 · D1 N2 · D1 N2 |

**Đột biến nào KHÔNG đỏ (biết):** bỏ bóc thẻ HTML ở tin lịch sử (không ca nào có `<div>` trong tin nhường) · đổi «·» sang một ký tự khác không phải
chữ/số/khoảng trắng · thứ tự `filter`/`map` trong `chuThem` · ca không đo nhánh 42P01 trong giao dịch.

## ④5 · Đo chi phí (N8) — `node ops/bin/do-ngan-sach-luot.mjs` · máy dev · mẫu 719 hội thoại (kéo 16/09) · 2017 cụm khách
Tham số (in đầu báo cáo): TRẦN TRÊN — mỗi cụm bot không nhường = 1 lượt model (lớp 0 đồng/Fast Lane không mô phỏng) · Botcake = tin page ≤ 8 s sau
cụm (XẤP XỈ — mẫu che danh tính người gửi page): **559/2017 cụm** · `<SĐT>/<TÊN>` thay bằng số/tên giả · lượt đã dùng = lượt model 24 giờ trước cụm ·
kiểm lệch `nganSach` với `turnBudget` thật trên mọi hồ sơ điểm: 0.

| cấu hình | lượt model | bàn giao vì hết ngân sách | HT có lượt | HT sát đơn |
|---|---|---|---|---|
| **TRƯỚC** — ngưỡng 2 · chấm cụm (có mô phỏng Botcake) | **989** | **152** | 500 | 34 |
| **SAU** — ngưỡng 1 · chấm lịch sử (RP2) | **1195** (+20,8%) | **78** (−48,7%) | 500 | 50 |
| đối chứng — ngưỡng 1 · chấm cụm | 1151 | 101 | 500 | 42 |
| trước, không mô phỏng Botcake | 1271 | 243 | 675 | 29 |
| sau, không mô phỏng Botcake | 1585 | 143 | 675 | 45 |

Lệch số review (a) (1.078 → 1.412, không mô phỏng): review đếm lượt đã dùng trên CẢ hội thoại; công cụ này đếm 24 giờ như `moc_luot_llm` thật
(hội thoại kéo dài nhiều ngày được nạp lại ngân sách). Không có ngưỡng đạt — số để người quyết thấy. **Rào ② luật 4 §0a** (`do-duong-ban.mjs` + ba
lượt model): KHÔNG chạy — `do-duong-ban` đo hội thoại THẬT đã diễn ra (không phản ánh mã chưa deploy), ba lượt model thật cần mạng/tiền ngoài ca;
phiếu ④5 thay bằng phép đo trên. Đo lượt model thật khi mở van (H-GL / tổng).

## npm test
- trước (worktree `5ff70a7`): tests 2758 · pass 2736 · fail 0 · skipped 22 (worktree thiếu dữ liệu gitignore ⇒ ca cần dữ liệu thật tự bỏ qua)
- sau (cây chung, trước commit): tests 2784 · pass 2780 · fail 0 · skipped 4 · sau commit (trong rp2.sh): tests 2786 · fail 0 (+28 ca RP2)

## Lệch phiếu
1. Cửa sổ 24 giờ theo giờ TIN mới nhất, không theo đồng hồ máy (phiếu «24 giờ gần nhất» + «cùng chuẩn messageTime»).
2. Có mốc vẫn kẹp 24 giờ (phiếu chỉ nói lần đầu).
3. (sau /code-review) không thấy chính tin đang xử trong lịch sử ⇒ chỉ chấm cụm, giữ mốc · nối «\n·\n» thay «\n» (vẫn MỘT lần scoreTurn) · bỏ
   thông báo `fb-pma`.
4. Hộp cát: mỗi tệp ca tự dựng `aicloser_v3_test_rp2{w,k}_p<pid>` (khuôn `db/sandbox.js`); cổng không cần CSDL riêng `aicloser_v3_nt_rp2_p$$`.
5. `rp1.sh` trong ⑦ chạy `BO_CONG_CU=1` (⑥ của nó = gl4 · gl3b · gl3 — đã chạy riêng / lồng).
6. Rào ② luật 4 (do-duong-ban + ba lượt model) không chạy — lý do ở ④5.
7. Ngoài ③ phát hiện lỗi thời, KHÔNG sửa (nợ): `duong-tin-v1.md` §13.4 · `luoc-do-v1.md` §13.

## Nợ (§9 sổ) — N-RP2-*
NOI-XUYEN-TIN · MOC-WEBHOOK-LO · 42P01-GIAO-DICH · MOC-CUNG-GIAY (+ múi giờ máy) · KHOI-CHUNG-VANG-IM · LUOT-DAU-SAU-DEPLOY · PHAT-TIN-CUT (review G7) ·
MAN-PROMPT-KHOI-CHUNG (review G4) · DOC-DUONG-TIN · + phiếu ⑥ giữ nguyên. Chi tiết ở §9.

## Ghi cho tổng
- RP1 vòng 2 (worktree) sẽ cherry-pick lên cùng `src/chat/rap-prompt.js` · `src/chat/handler-v3.js`: RP2 chạm `rapKb` (Promise.all + mảng `text`)
  và bước 3b handler (một dòng gọi + dep) — vùng khác RP1, nhưng rebase cần nhìn; neo đảo-vá rp2.sh khớp chuỗi đúng các dòng đó.
- ⑦b của phiếu vẫn mở: page pilot phải thuộc team có dòng `khoi_dung_chung` (prod: team 1) · đọc lại 11 mục `/khoi-chung` trước mở van.
