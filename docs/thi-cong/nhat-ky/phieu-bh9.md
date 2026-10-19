# Nhật ký phiếu BH9 — bộ não pilot (sau bán ⇒ câu nhận cố định + giao sale · không bịa đơn/tự hứa · COD ngầm + tên Facebook · tên chỉ từ lời khách · y tế)

- **Thợ:** agent worktree · nhánh `worktree-agent-ad1ffea2fa3e0825c` (tách từ `a6c017a` — phiếu sau soát (a); `src/` y hệt Base `a6f670d`) · 19/10/2026
- **Commit:** `8c1fb02` test(bh9) thước trước · `b4a507a` fix(bh9) thi công · `821f0a3` fix(bh9) sửa theo /code-review · `e016e1a` fix(bh9) mốc rp1 + ca Wd3 · (commit nhật ký này)
- **Trạng thái đề nghị:** 🔎 chờ review nghiệp vụ (b) + đối kháng `phan-bien-refute` (làn 🟥) · cổng `ops/bin/nghiem-thu/bh9.sh` **ĐỎ 0 / XANH 86** · `npm test` 2827 → **2962 / 0 đỏ**
- §10 sổ: **KHÔNG append** (lệnh tổng: tổng ghi sổ) ⇒ `_chan1.sh bh9` ⑧b đỏ đúng dự kiến (dưới).

## Môi trường đo

Máy dev macOS · Postgres.app `localhost:5432` · cây đo `…/.claude/worktrees/agent-ad1ffea2fa3e0825c` (mỗi tệp ca in `import.meta.url` của tệp bị đo + cwd — đã soát đúng cây phụ) · node v24.19.0 · `.env` chép từ cây chính, `PANCAKE_READONLY=1` (grep = 1) · `node_modules` symlink về cây chính (chỉ gói bên thứ ba) · `rg` = shim `grep -E` (scratchpad) cho cổng cũ.
Bộ ca dùng hộp cát theo pid (`aicloser_v3_test_bh9w_p<pid>` · `…bh9m_p<pid>`), tự dựng tự dọn. **Không** đo trên `aicloser_v3`. 0 mạng, 0 model (cửa gửi + `chayCloser` tiêm; `create_draft_order` đi `executeTool` THẬT).
④9 (M6) đọc `aicloser_gialap_pilot` + `aicloser_gialap_2` **CHỈ ĐỌC** (`default_transaction_read_only=on`), không in/chép chữ khách — chỉ id · luật · số đếm.
**Ngữ cảnh từng lượt của M6 là PHỎNG DỰNG** (tổng gật 19/10 (4)): lịch sử Pancake của lượt giả lập đã mất (chỉ còn tin khách UAE + chữ bot) ⇒ `lastAiText` = chữ bot ĐÃ GỬI gần nhất cùng psid (Saudi: chỉ dòng `reply`); `donDaCo` = hồ sơ CUỐI, trừ «đã tạo» do chính lượt bot chốt của lần chạy còn tin (chỉ tính sau lượt chốt), UAE cộng tin khách tới lượt đó khớp bộ dò khách mới; `isOrderSummary` = lượt có dòng so_ai `order`; `daBanGiao` = lượt có dòng `handoff` không do cửa ra. ⇒ mọi số ④9 là số CÓ ĐIỀU KIỆN.
Máy có thợ khác chạy test song song: một lượt `npm test` giữa chừng treo ở `v3/test/b/ll15a-hrm-man.test.mjs` (11 phút, phải giết tiến trình con ⇒ H3 đỏ); chạy riêng 6/6 xanh; lượt sau đủ 2962/0 (án lệ N-THUOC-CHAP-CHON — nợ N-BH9-LL15A-TREO).
Ca worker + hàng chờ chạy ở 3 múi giờ (`TZ=PGTZ=` UTC · Pacific/Kiritimati · Etc/GMT+12): 26/0 cả ba.

## ⑦ Đã tra chưa

`ops/bin/tra_no.py` và `docs/thi-cong/SO-NO.md` KHÔNG tồn tại. `grep` sổ §9: `N-RP2-REGEX-TIN-NHUONG` (dòng 1991 — phần tên do BH9 đóng: «This is real gold» hết +2 điểm tên, ca TH) · `N-PILOT-AI-BACK-SALE` (thẻ bàn giao — BH9 dùng `config.pkTags.handoff`, ca đặt «AI CHAT»). Không trùng phán cũ nào khác.

## Bước 3 — đo lại nguyên liệu đề bài (hàm thuần trên HEAD = base)

```
TÊN: 13/14 câu ④1 ra tên sai («working for fails» · «Marina island» · «e now» · «finished» · «Abudhabi city» · «here in Dammam» · «waiting» ·
     «e arrived my order» · «waiting for delivery I send already the » · «e is» · «SAUDI ARABIA» · «yesterday» · «real gold»); T13 ra '' — khớp ⑦
COD: «Cash on delivery po» · «COD po» · «yes» · «ok po» ⇒ cod=false · GÓI: «Buy 1 take 1?» · «B1G1 free» · «Buy 1get 1free» ⇒ tier='' — khớp
donTuTinPage: 8/8 câu page mới null; «has been created» · «out for delivery» khớp · donTuTinKhach: 6/6 câu khách null · 8/8 câu trước bán [S1] BẮT
guardOutbound: 11/11 câu bịa/hứa thật ⇒ QUA · node: 'كيف استخدم'.includes('دم') true · /\bدم\b/u.test('فيه دم') false
isOurFixedMessage (BASE, chưa thêm câu nào): «Noted» false · «Noted po» false · «Sorry» **TRUE** · «Sorry to hear that» false
kịch bản page 275/276 (rapKb trên CSDL giả lập, chỉ đọc): fastLanePrice/Ship/Howto/Auth/Size đều RỖNG — chỉ có `greeting`
```
**Đề bài khai sai (bẫy #4):** [S4] nói «thêm hai câu cố định thì «Noted»·«Noted po»·«Sorry»·«Sorry to hear that» thành true» và ④7k đòi cả bốn false. Đo base: «Sorry» trơn ĐÃ true từ trước (tiền tố hai chiều với «Sorry for the wait…» của `LEGACY_POSTSALE_HOLDING`). BH9 không đưa câu cố định vào `fixed` ⇒ ba câu kia false; ca Wk đòi ba câu false, «Sorry» ghi «như base» (nợ N-BH9-FIXED-TIEN-TO). «mọi câu mẫu fastLane* của kịch bản 275/276» ⇒ chỉ có câu chào; ca GF dùng câu chào + câu mẫu Fast Lane dựng từ KB 109/159 SAR.

## Danh sách ca (viết trước, ca chi tiết sau)

| tệp | nhóm | ca |
|---|---|---|
| `test/bh9-ham-thuan.test.mjs` (103) | ④1 tên | T01–T25 (14 câu phiếu + 6 đối chứng + 5 sau review) · TH (hasName = !!tachTen) · TS (không còn NAME_LABEL/NAME_LINE) |
| | ④2 bộ dò | DP (8 page dương) · DA (âm: 5 câu ②2a + 4 câu [S2] + 2 câu review + C35) · DO (orderNoted) · DQ (vế «After…,» vẫn bắt — hồi quy review) · DR («not yet received») · DK · DN (âm C39 + [S1] + review) · LS · DB (một bản luật) |
| | ④3 COD | K1–K6 |
| | ④4 cửa ra | G01–G48 (bảng phiếu + ngoài bảng) · GL · GS ([S7] giống base) · GC (kho 246 câu × 5 ngữ cảnh: luật cũ chặn ⇒ y base) · GF · GK |
| | ④5 y tế · ④6 khối | Y1–Y3 · H1–H5 (H5 so `buildProfileBlock` base từng ký tự) |
| `test/bh9-luot-worker.test.mjs` (21) | ④7 qua `chayMotVong` | Wa · Wa2 (câu mẫu khớp vẫn thua cổng 4a) · Wa3 (handler: van đóng không HANDOFF câm) · Wb (ar) · Wc · Wd1/Wd2 (2 ảnh, caption rỗng/sạch) · Wd3 (caption phạm luật mới) · We · Wf1/Wf2 · Wg1–Wg5 · Wh1/Wh2 · Wi · Wj · Wk |
| `test/bh9-hang-cho-man.test.mjs` (5) | ④8 | M1 chuanHoaHoSo · M2 luuDonCho (hộp cát; chỉ `docSanPhamGoiGia` giả) · M3 Hộp thư `theDon`+`moDon` chạy THẬT trong vm · M4 màn Vận hành · M5 |
| `test/bh9-phat-lai.test.mjs` (6) | ④9 M6 | Ra–Rf (máy không có CSDL giả lập ⇒ HOÃN có nói ra; cổng đòi CHẠY THẬT) |
| sửa thước cũ | ③ [S12] | C30/C31 (`test/context.test.mjs`) · lan-chot ⑤ «ĐƠN ĐÃ CÓ» (0 model · CAU_NHAN_BAN_GIAO.en · HANDOFF/SALE · lyDo `sau_ban`) · GL8 W5 (câu dấu hiệu đơn ngoài dời sang tin khách TRƯỚC đã `xong`; tin lượt là câu chốt thường) |

Nhánh KHÔNG chạm: bộ nạp thật (`xepTin` tay) · cửa Messenger thật · bộ não thật (closer) · màn Vận hành chạy trong trình duyệt (đo hàm `canhDonNhap` rút từ tệp + chỗ gọi) · đo bằng model (tổng chạy sau gộp).

## Base đỏ → sau vá xanh

Cổng trên BẢN BASE (src a6c017a + thước BH9, `BO_DAO_VA=1`): **ĐỎ 17 / XANH 11** — hàm thuần 20✔/63✖ · worker 5/12 · hàng chờ 0/4 · phát lại 1/4 (+1 hoãn) · context.test 39/2 (C30 C31) · lan-chot 8/1 (⑤). Các ca xanh trên base là ca ÂM/«giống base» (G12 G14 G16 … GS GC GF · Wc We Wf2 Wj Wk · Rf).
Cổng sau vá (cây worktree, đủ đảo-vá): **ĐỎ 0 / XANH 86** — hàm thuần 103/0 · worker 21/0 · hàng chờ 5/0 · phát lại 6/0 (skipped 0) · context.test 41/0 · 11 tệp ca cũ ④11 đều 0 đỏ.

## Đảo-vá (bản sao tạm, mỗi đột biến một tiến trình node)

57 đột biến, **57/57 đỏ đúng ca khai** + ⑩0 bản sao nguyên vẹn xanh (103/21/5/6/41 — sàn RIÊNG từng tệp, mỗi tệp một tiến trình: lượt `_chan1` đầu, chạy chung 5 tệp trong một `node --test` lúc máy bận, RỤNG 30 ca với fail=0 (145–158/176) — thước sàn tổng bắt được nhưng không chỉ được tệp; đổi sang sàn theo tệp). 40 theo ④10 của phiếu (⑩a–⑩H) · 16 cho chỗ /code-review vừa sửa (⑩cr1a–⑩cr15 — bẫy 26) · 1 cho caption (⑩I).
**Đột biến nào KHÔNG đỏ (kết quả thật của đảo-vá):**
- ⑩b «bỏ lọc địa danh ⇒ #2 #5 #11 đỏ»: #11 KHÔNG đỏ, cổng chỉ đòi T02 T05 — T11 đi đường nhãn RÕ («Here's my name…») trước đường dòng, lọc địa danh không chạm nó. Thiết kế đúng, phiếu đoán sai.
- Lượt cổng 1: ⑩e sống — lỗi CỦA THƯỚC (đột biến `KHUON_MOI = [] && [...]`: mảng rỗng truthy ⇒ không đổi gì); sửa thước ⇒ DP đỏ.
- Lượt cổng 3: ⑩C · ⑩cr9 · ⑩cr3 · ⑩cr14 sống — HAI lớp che nhau (câu hỏi mở đầu «Is/Will/Pwede…» che luật «sau khi dùng»; lookahead «?» che lookbehind «can we»; «OFW» nằm sẵn trong danh sách từ thường). Thêm ca mà CHỈ lớp đang bị đột biến che được: Y3 «My skin has irritation po, is it good for that?» · «Gusto ko gamitin sa irritation ko po» · G48 «Can we have your address po, so our staff can book it.» · T25 «I am OWWA.» ⇒ cả bốn đỏ.

## ④9 · M6 phát lại (giả lập dev, CHỈ ĐỌC, ngữ cảnh phỏng dựng)

- **Ra** 148 câu bot (UAE 64 lan_gui · Saudi 84 so_ai). Luật cũ chặn base = mới: `PII_ECHO 5 · DUPLICATE 8 · PRICE_MISMATCH 1 · DELIVERY_PROMISE 5`, 0 lệch. Luật mới × số câu: `Y_TE 1 · TU_HUA 6 · BIA_TRANG_THAI_DON 6 · BAN_LAI_SAU_BAN 10`. Đủ lượt ĐÒI: UAE #82 #83 #84 #85 #100 #65 · Saudi #4 #5 #23 #28 #35 #37 #54 (khi tách khỏi DUPLICATE — Saudi #35 «trùng» #23 chỉ do `lastAiText` phỏng dựng; lượt chạy thật đã gửi câu đó).
  Ngoài lượt lỗi đã biết: **6, cả 6 là BAN_LAI_SAU_BAN ở hội thoại CÓ đơn; 0 ở hội thoại KHÔNG đơn; 0 luật khác** (mốc 19/10). Lý do từng câu (không chữ khách):
  UAE #91 (ht 43779 — ngay sau câu khách báo đã nhận hàng #90; bot chào gói lại — cùng lỗi các lượt #90/#102/#105 đã biết) · Saudi #1 (ht 43768 — cùng hội thoại với lượt bán lại #3 đã biết; hồ sơ có đơn «đã tạo» từ tin RTO) · Saudi #19 #20 (ht 43786 — chính bot viết «khách đã đặt trước đây», mời mua lại: **hệ quả chấp nhận của N-BH9-DON-HET-HAN** — khách mua lại nhận câu cố định + chuyển sale, sale chốt tay; không mất khách, chỉ không phải bot; KHÔNG mở rộng BH9 để vá — tổng (3)) · Saudi #46 #134 (ht 43813 — bot xin khu/toà/mốc cho courier với khách «đã có đơn trong hệ thống»: việc sau bán của sale).
- **Rb** cổng sau bán trên tin khách thật (hồ sơ rỗng): UAE 109 tin ⇒ 3 tin, cả 3 ht 43779 (#82 #90 #102 — 3/3 trong bộ đòi ≥2/3); page 340 60 tin ⇒ 0.
- **Rc** y tế: 1 tin — UAE #47 ht 43877 «chảy máu»; «no fever» (ht 43882) và tin địa chỉ RASHED (ht 43893) không bắt.
- **Rd** tên: 1 tin có tên (UAE #9 — tên không chép, kể cả dạng che), 0 tên thuộc 12 chuỗi sai.
- **Re** câu cố định thêm = 23 (Ra) + 3 (Rb) = 26 ≤ trần phiếu 26 (+6 khách có đơn ngoài danh sách theo hợp đồng tổng).
- **Rf** [S2]: 31.715 câu (lan_gui + so_ai `text`/`text_bi_chan` hai CSDL + kịch bản tách câu) — khớp base 2 · khớp mới 2 · **thêm 0**.

## npm test · cổng cũ

```
base (bản archive a6c017a)   ℹ tests 2827  pass 2805  fail 0  skipped 22   (36,3 s)
lượt giữa (sau fix 1)        ℹ tests 2936  pass 2913  fail 1  — ll15a H3: treo 11′ khi máy bận, giết tiến trình con; chạy riêng 6/6
sau cùng (e016e1a)           ℹ tests 2962  pass 2940  fail 0  skipped 22   (36,5 s)
```
Đỏ chập chờn đã biết `l0-m2-gop-cua-hep` G6 không xuất hiện.
Cổng cũ ④11 (chạy riêng, `CHAY_CONG_CU` của bh9.sh mặc định HOÃN — dài; log ở scratchpad):
- `gl8.sh` rc=1 **ĐỎ 2 / XANH 30**: ⑤a «bộ não không đổi từ 33c04ac» và ⑤c «catChu( = 8 (đòi 7)» — thước TĨNH của GL8 neo hình dạng bộ não lúc GL8; BH9 đổi bộ não có khai + thêm ĐÚNG một chỗ cắt chữ khách vào lý do bàn giao (đúng luật GL8: `catChu`). Không phải hồi quy; tệp ngoài ③ ⇒ nợ N-BH9-GL8-THUOC-TINH. Lượt đầu ⑥a còn «đột biến không áp được» (chuỗi `text: catChu(guarded, 200),` thành 2 lần) — đã sửa phía BH9 (câu cố định ghi `text` không cắt), ⑥a đỏ đúng.
- `rp2.sh` rc=0 PHÉP=59 LỖI=0 (cổng lồng: rp1 rc=0 · gl3b rc=0 · bh7 «ĐỎ SẴN ở 5ff70a7, 0 dòng đỏ mới»). Lượt đầu rp1 lồng «MỚI: đảo-vá v2_bo_ban_giao_khi_bo_anh không áp được» — dòng đặt cờ caption của BH9 trùng nguyên văn chuỗi neo của rp1; viết lại khác (commit `e016e1a`) ⇒ rc=0.
- `rp1.sh` rc=0 · `bh8.sh` rc=0 ĐỎ 0 / XANH 12 · `bh7.sh` rc=1 ĐỎ 1 / XANH 8 — ④ «luật tin ngắn trong CORE»: đỏ SẴN từ base (rp2 so 5ff70a7: giống hệt base), BH9 không chạm `prompts.js`.
- Các cổng khác ngoài năm cổng phiếu nêu (l2-m2 · va-r* · gl3c · l3-m4 …) có thể neo chuỗi trong sáu tệp BH9 đổi — CHƯA chạy (nợ N-BH9-CONG-CU-KHAC; ghi để tổng chạy ở gate).

## /code-review (15 điểm — sửa 14, bác 1 phần)

| # | điểm | xử lý |
|---|---|---|
| 1 | lượt y tế bị luật mới KHÁC Y_TE chặn ⇒ «Noted po…» thay câu y tế; `daBanGiao` tính trước khi lượt y tế đặt cờ | SỬA: cờ bàn giao y tế đặt TRƯỚC cửa ra; câu thay = CAU_Y_TE mọi khi lượt y tế (Wg4 Wg5, ⑩cr1a/b) |
| 2 | câu KHẲNG ĐỊNH đang muốn mua thành «đơn đã có» (hai nhánh cũ bắt từ base) | SỬA: thêm dấu «đang muốn mua» (i want · I'll order · for my sister · if u · you deliver to …) vào bộ lọc trước bán (DN, ⑩cr2) |
| 3 | HUA_TEAM_CO bắt «Can we have your address?» | SỬA: lookbehind can/could/may… + bỏ câu kết «?» (G38 G48, ⑩cr3) |
| 4 | câu cố định: `handoff` đặt trước `guiChu` ⇒ van đóng thì HANDOFF câm | SỬA: đặt NGAY SAU `guiChu` thành công, trước `banGiaoSale` (mục đích ② 1 giữ nguyên; lệch chữ phiếu) (Wa3, ⑩cr4) |
| 5 | BIA bắt câu tương lai/quy trình/mời chốt («will be on its way» · «shipped within 24 hours…» · «no order minimum» · «send your details and your order is confirmed») | SỬA: + từ tương lai/mời chốt trong vế trước, vế sau mô tả quy trình, «no order minimum…» (G39–G43, ⑩cr5) |
| 6 | khuôn page rộng: «Orders placed today are scheduled…» · báo giá «within 3-5 days … Do you want to order?» thành «đã tạo» | SỬA: «scheduled/set/in transit» phải có chủ ngữ là đơn của khách; (iii) bỏ tin còn chào mua (DA, ⑩cr6) |
| 7 | HỒI QUY: (i) áp cả câu cho khuôn cũ ⇒ «After checking the system, your order has been cancelled» hết bắt | SỬA: «after/when» chỉ xét trong VẾ (tới dấu phẩy); từ mạnh (once·if·will be…) xét cả câu chỉ với khuôn mới (DQ, ⑩cr7) |
| 8 | COD ngầm ghi đè lời TỪ CHỐI COD; cờ ngầm không xoá khi khách nói đồng ý | SỬA: `codTuChoi` (chỉ đặt khi có), đồng ý rõ ⇒ `codNgam` false; khối hồ sơ in «ngầm» chỉ khi `cod && codNgam` (K6, H3, ⑩cr8) |
| 9 | y tế bắt câu hỏi trước bán («Pwede ba gamitin…» · «Will the rash go away after using it?» · «Can pregnant women use it?») | SỬA hai câu đầu («gamitin» trơn không là dấu đã dùng; câu kích ứng mở đầu bằng trợ động từ hỏi ⇒ bỏ) (Y3, ⑩cr9). **BÁC phần «có thai»**: phiếu ② 7 «chảy máu / sốt / có thai giữ VÔ ĐIỀU KIỆN» — người hỏi có thai được khuyên hỏi bác sĩ + chuyển sale là đúng ý đồ, không phải lỗi |
| 10 | TU_HUA bắt nhầm «within 1-2 linggo» · «Noted po, office open until 10 PM» · «After you order, our staff will call you» · «we deliver on Friday too» | SỬA: bỏ «linggo» (=tuần), «noted» chỉ trong 15 ký tự, điều kiện trong câu với hai khuôn team, câu chính sách chung (too/every/…) (G44–G47, ⑩cr10) |
| 11 | `COD_KHONG` không ranh giới từ («noted»/«now» = phủ định) | SỬA: ranh giới chữ hai đầu (K1 K3, ⑩cr11) — regex này có từ base (`:196`), nay quyết cả `codNgam` |
| 12 | rào Ả Rập chặn mạo từ «الدم» · «للطبيب» | SỬA: tiền tố ال·بال·وال·لل·و·ب trong rào (Y1 G37, ⑩cr12) |
| 13 | «I have not yet received it» gắn nhãn ĐÃ nhận | SỬA lookbehind (+ yet) (DR, ⑩cr13) |
| 14 | «My name is: Maria» ra rỗng; «I am Egyptian»/«I'm OFW» ra tên | SỬA: «:» sau nhãn rõ; + quốc tịch/nghề/viết tắt toàn hoa ≤ 5 chữ (T21–T25, ⑩cr14) |
| 15 | cờ Hộp thư hiện hai lần (thẻ + form trong thẻ) và trên đơn đã xử lý | SỬA: thẻ chỉ khi `choDuyet`; form mở trong thẻ truyền `anCoDon` (M5, ⑩cr15) |

Tự soát thêm (ngoài review): khối hồ sơ in «COD ngầm» khi khách đã nói «no COD» (sửa: điều kiện `cod && codNgam`) · hai chuỗi neo đảo-vá của cổng cũ bị BH9 nhân đôi (gl8 ⑥a, rp1 `v2_bo_ban_giao_khi_bo_anh`) — sửa phía BH9.

## Lệch phiếu (mỗi dòng: chọn gì · vì sao · giá)

1. **④9a/9e — TỔNG GẬT 19/10.** Trần «ngoài lượt lỗi đã biết ≤ 3» áp cho hội thoại KHÔNG có đơn (đo 0); câu ngoài danh sách ở hội thoại CÓ đơn phải đúng BAN_LAI_SAU_BAN (luật khác ⇒ cổng ĐỎ) và được IN kèm id; mốc 6. Re cộng phần này vào trần.
2. **④7k «Sorry»** — đề bài khai sai (đã true từ base) ⇒ ca đòi ba câu false, «Sorry» như base.
3. **② 1 thứ tự `handoff`/`guiChu`** — đặt sau `guiChu` thành công, trước `banGiaoSale` (review #4). Giá: lỗi mất ACK của câu cố định không ghi HANDOFF ở handler — worker `banGiaoLoi` lo (đường cũ của mọi lớp 0 đồng).
4. **[S1] bộ lọc trước bán rộng hơn danh sách phiếu** — + «do/will/could/would you · does · is it · are you» (giữ ca âm C39 khi nhánh «you deliver» mới khớp) + dấu «đang muốn mua» (review #2). Giá: câu sau bán dạng hỏi không có dấu đơn đã có (vd «can you deliver tomorrow?» của khách ĐÃ có đơn) không tự thành `donDaCo` — vẫn vào cổng sau bán nếu hồ sơ đã có đơn.
5. **BAN_LAI_SAU_BAN miễn `isOrderSummary`** (mở rộng [S8] sang luật d) — đơn nguồn KHÁCH vẫn được tạo, câu tóm tắt có giá là đúng.
6. **Caption MODEL phạm luật mới** (phiếu không nói): không gửi tấm nào + bàn giao; chữ model đã qua cửa vẫn đi (mỗi lượt một tin) — ca Wd3.
7. **(i) áp cho cả 4 khuôn page CŨ** (theo vế): câu [S2] «…tracking number once your order is shipped» khớp chính khuôn cũ «đang giao».
8. **`so_ai.du_lieu.text` của câu cố định không cắt** — hằng < 200 ký tự (ca GK); tránh nhân đôi chuỗi neo gl8 ⑥a.
9. **Hàng ④4 «KB có nguyên văn»**: câu nguyên văn phiếu («…courier will call you before arriving») QUA bất kể miễn KB (không khớp khuôn TU_HUA nào) — giữ (G25) và thêm G26/G27 với câu thật sự cần miễn để đảo-vá ⑩o có nghĩa.
10. **Lượt y tế bị luật CŨ chặn** ⇒ vẫn im + bàn giao (luật 2), lý do ghi chú là «Y TẾ · …» (cờ đặt trước cửa ra). Khách y tế không nhận lời khuyên ở nhánh này — nợ N-BH9-YTE-LUAT-CU-IM.
11. **Wa3 đo ở tầng handler** — qua worker, `bocCuaGuiBen` bọc mọi lỗi cửa thành `LoiGuiChuaXacNhan`.
12. **Design-pack** (`docs/v2/02-TANG-LUONG-CHAT.md` §M07 hồ sơ · §M09 cửa ra) chưa cập nhật — ngoài pathspec ③ (luật 5 §0 đòi cùng commit) ⇒ nợ N-BH9-DESIGN-PACK cho tổng.
13. **gl8.sh ⑤a ⑤c đỏ** do BH9 đổi bộ não (thước tĩnh GL8, ngoài ③) ⇒ nợ N-BH9-GL8-THUOC-TINH.
14. **§10 sổ không append** (lệnh tổng) ⇒ `_chan1.sh bh9` ⑧b đỏ.
15. **Lệch phiếu — tổng gật 19/10: sửa `ops/bin/nghiem-thu/gl8.sh` ⑤a/⑤c** (ngoài ③). ⑤a «bộ não không đổi từ 33c04ac» → chữ bộ não cắt (+ một nửa cặp tự dựng) qua HAI cửa ghi jsonb thật (`ghiSoAi` · `suaHoiThoai`, pool giả bắt tham số) ra JSON lành, giữ đủ chữ trước chỗ cắt; ⑤c «catChu( đúng 7» → không còn chỗ cắt TRẦN trong handler-v3 + `catChu` lành/tiền tố ở 3 biên emoji. Đảo-vá tay (thư mục tạm, mỗi đột biến một tiến trình): gốc «3 0 2 · 3 · 0» xanh; bỏ lưới so-ai ⇒ ⑤a hỏng=1; bỏ lưới kho ⇒ ⑤a hỏng=1; catChu về slice trần ⇒ ⑤c 0/3; handler `text: guarded.slice(0, 200)` ⇒ slice trần=1 — cả bốn đỏ. `gl8.sh` chạy riêng (đủ ⑥ đảo-vá GL8): **rc=0 · ĐỎ 0 / XANH 32**. Nợ N-BH9-GL8-THUOC-TINH: ĐÓNG.

## `_chan1.sh bh9`

Lượt đo (trước commit nhật ký): ① ② ⑤ (bộ não ĐÃ khai: context · lead-score · outbound-guard) ⑥ (0 marker) ⑧a ⑧b ✅ · **④ đỏ**: `docs/v3/01-QUYET-DINH.md` nằm trong diff `a6f670d..HEAD` vì commit `a6c017a` của TỔNG (CR COD ngầm + tên Facebook) đứng sau Base của phiếu — không phải tệp thợ đụng · **⑦ đỏ** ở lượt đó vì ⑩0 rụng ca (trên) ⇒ sửa thước ⑩0, cổng chạy lại ĐỎ 0 / XANH 86. ⑧b xanh nhờ dòng «soát (a) BH9» tổng đã ghi §10 (thợ không append).

## Nợ đề nghị §9 (tổng ghi sổ)

- **N-BH9-DON-HET-HAN** (phiếu ⑥) — `donDaCo` không hết hạn ⇒ khách mua lại bị coi là sau bán mãi; M6 Saudi #19 #20 là ca thật (tổng chấp nhận 19/10: sale chốt tay).
- **N-BH9-NGUON-DON-CHUAN** (phiếu ⑥) — bot không có trạng thái đơn thật; nguồn chuẩn: làm tươi `don_hang` theo `conversation_id` hoặc job BigQuery.
- **N-BH9-GOI-DOI** (phiếu ⑥) — gói khách đổi sau không đè `prof.tier`.
- **N-BH9-KHO-GIA-LAP** (phiếu ⑥) — tệp `--kho/--ra` ngoài `/tmp`; + lưu LỊCH SỬ PANCAKE của từng lượt giả lập (M6 phải phỏng dựng ngữ cảnh vì thiếu nó).
- **N-BH9-FIXED-TIEN-TO** — `our-messages.js#isOurFixedMessage` (và `conv-owner.js#isOurs`) so tiền tố HAI CHIỀU không trần độ dài: «Sorry» do sale gõ đã là «tin bot» từ base; sau khi bot gửi câu cố định, sale gõ «Noted po» sẽ khớp `isOurs` (chỉ khi hội thoại được trả lại AI).
- **N-BH9-GL8-THUOC-TINH** — `gl8.sh` ⑤a (bộ não không đổi từ 33c04ac) · ⑤c (catChu đúng 7) neo hình dạng code; đề nghị ⑤c thành liệt kê/≥.
- **N-BH9-DESIGN-PACK** — cập nhật §M07/§M09 design-pack theo BH9.
- **N-BH9-LUU-DON-JSON** ([S13]) — `v3/src/ui/van-hanh/don-cho.js` `luuDonCho` `JSON.stringify` trần chữ sale gõ (không lưới `jsonLanh`); BH9 không đổi lưới.
- **N-BH9-YTE-LUAT-CU-IM** — lượt y tế mà câu model bị luật CŨ chặn ⇒ khách không nhận lời khuyên (im + bàn giao theo luật 2); đề nghị câu y tế cố định ở nhánh này (đổi luật 2 ⇒ người quyết).
- **N-BH9-CONG-CU-KHAC** — chạy toàn bộ `ops/bin/nghiem-thu/*.sh` ở gate: các cổng ngoài năm cổng phiếu nêu có thể neo chuỗi trong `context.js` · `outbound-guard.js` · `lead-score.js` · `handler-v3.js` · `hang-cho.js` · `hop-thu-ui.js`.
- **N-BH9-LL15A-TREO** — `v3/test/b/ll15a-hrm-man.test.mjs` H3 treo khi máy bận (thợ song song); chạy riêng xanh.
- **Đo bằng model** (phiếu ④ cuối) — TỔNG chạy sau gộp; thợ không gọi model.

## Gộp

Chỉ `chuanHoaHoSo` ở `src/orders/hang-cho.js` (khác hàm GL9) ⇒ rebase SAU GL9 dự kiến sạch; chạy lại ④8 + `l3-m4-*`. GL10 không đụng `handler-v3.js`.

## Vòng 2 (sau đối kháng) — 19/10

- **Commit:** `03dbed4` test(bh9) thước trước · `b076aa6` fix(bh9) vá + sửa theo /code-review · `115be21` test(bh9) WE (giờ máy) · (commit nhật ký này)
- **Đầu vào (đọc trọn):** phiếu · `refute-bh9.verdict.yaml` (TRẢ VỀ — CHẶN F1–F4 · NÊN F5–F9 · GHI-NO G1) · `nghiep-vu-bh9.verdict.yaml` (điểm b, TRẢ VỀ — CHẶN N1 N2 · NÊN N3 N4 · GHI-NO N5; câu 4 · 5 · 6 không đạt) · ca phá `scratchpad/refute-bh9/` · diff `a6c017a..18e7dd3` · nhật ký vòng 1. Hướng sửa A–F do TỔNG chốt.
- **Trạng thái đề nghị:** 🔎 chờ đối kháng + nghiệp vụ (b) vòng 2 · `bh9.sh` **ĐỎ 0 / XANH 112** (vòng 1: 86; +24 đảo-vá ⑩v2a–⑩v2x, +2 nhóm ca) · `npm test` 2962 → **2982 / 0 đỏ** (+20 ca: hàm thuần 103→113 · worker 21→31).

### Tái lập ca phá (`bash chay.sh`, worktree, CSDL giả lập CHỈ ĐỌC)
HEAD `18e7dd3`: worker **6/6 ĐỎ** (F1a F1b F2 F3 F4 F4b) · r1 14/14 câu trước bán ⇒ SAU_BAN · r4 4 câu «Dragon's Blood / blood circulation / دم الأخوين» ⇒ «chảy máu», 8 câu chảy máu/kích ứng SÓT · r7 12/12 · r10 8/8 HỤT · r2/r6/r8 câu bịa (gồm #141 thật) QUA. Sau vá (`b076aa6`): worker **6/6 XANH** · r1 0/14 · r4 0 nhầm (trừ «Is it safe for pregnant women?» — nợ, dưới) · 0 sót · r7 12/12 bắt · r10 8/8 bắt · r6 8/10 chặn (2 câu HỨA tiếng Ả Rập — nợ) · r8 4/4 câu bịa chặn.
Bộ ca mới chạy trên bản sao `git archive 18e7dd3` + tệp ca mới: hàm thuần **11 ĐỎ** (VF1 VA3 VC VF2 VB VE VG VT VD VN + LS) · worker **10 ĐỎ** (WF1a WF1b WF2 WF2b WF3 WF4 WF4b WF4c WB WE); Wd3/Wf1/Wf2 (dữ liệu dựng đổi) vẫn xanh trên HEAD.

### Mỗi CHẶN: ca · vá · đảo-vá

| CHẶN | ca (đỏ HEAD → xanh) | vá | đảo-vá (đỏ khi bỏ vá) |
|---|---|---|---|
| **F1 = N1** người đang mua bị coi sau bán | VF1 (19 câu điều kiện giao/gói) · DN (+3) · WF1a · WF1b | `context.js` phía KHÁCH LẬT CHIỀU: chỉ dấu ĐÃ XẢY RA / SỞ HỮU — `KHACH_NOI_VE_DON` thành bộ hàm (KHONG_MUON · BAO_HUY · DA_NHAN (+MƠ HỒ) · CHUA_NHAN · CHUYEN_GIAO · DA_CHO_LAU · sở hữu + trạng thái CÙNG VẾ · DA_DAT), mỗi khuôn có bộ LOẠI người-đang-mua (`TRUOC_BAN` · `NHAN_TRUOC_BAN` · `LAI_MUA` · `VE_DANG_MUA`); bỏ ba nhánh rộng («the X is/has…» · «(you|u) deliver» · «N days … deliver») + `laHoiTruocBan` | ⑩v2a (trả nhánh rộng ⇒ VF1 WF1a WF1b) · ⑩u (`TRUOC_BAN` câm ⇒ DN) · ⑩cr2 (bỏ «I want to order» ⇒ DN) · ⑩v2s ⑩v2t (bỏ loại vế trợ động từ/COD · không tách dấu phẩy ⇒ VF1) |
| **F2** bot tự đầu độc | VF2 · WF2 · WF2b (câu mẫu Fast Lane CỦA v3 «👉Your order is 109 SAR. You will receive…» có khuôn đơn page) | ① `tinhDonDaCo` LOẠI mọi tin page là chữ của chính bot: `lan_gui` (tin/ảnh, mọi trạng thái, 200 dòng cùng psid — `handler-v3.js#chuBotDaGui`) + `ai_noi_gi` + hai câu cố định + `isOurFixedMessage` (`context.js#laChuBot`, so đầu câu, trần ≥ 20 ký tự cả hai chiều); ② «inform the courier» chỉ thì ĐÃ làm (informed/contacted/notified), «courier's phone» chỉ khi kèm SỐ; ③ `cleanHistory(…, {bocDon:false})` khi handler đã tính (`meta.donDaTinh`) — bước dựng ngữ cảnh không bóc lại thiếu `ours` | ⑩v2b (bỏ loại chữ bot ⇒ VF2 WF2b) · ⑩v2c (inform tương lai ⇒ VF2) · ⑩v2d (cleanHistory bóc lại ⇒ WF2b) · ⑩v2r (câu bot ngắn nuốt tin sale ⇒ VF2). WF2 cần CẢ ①② cùng hỏng mới đỏ (hai lớp) |
| **F3** Dragon's Blood | VD · WF3 | `dauHieuYTe` «chảy máu» theo CỤM: bỏ `\bblood\b` trơn — «blood» chỉ sau there is/may/with/got/see/have… và không «circulation/pressure/sugar»; Ả Rập «دم» trừ «دم الأخوين»; + nagdurugo · dinudugo · duguan · ينزف · نزف · دماء · rashes · ngứa SAU khi dùng (vẫn qua cổng «sau khi dùng»; ngứa trơn — triệu chứng gel lo — giữ ÂM, Y2) | ⑩v2l («blood» trơn ⇒ VD WF3) · ⑩v2m (bỏ loại «دم الأخوين» ⇒ VD) |
| **F4 = N2** câu hỏi đơn số một không vào cổng · #141 qua cửa ra | VA3 (21 câu EN/Taglish/Ả Rập, hồ sơ RỖNG — đơn LadiPage/ai_sale) · VC (8 câu, hồ sơ có đơn POS) · VG (17 câu bịa: #141 + biến thể) · WF4 · WF4b · WF4c | ① A3: khách nói rõ đơn của mình ⇒ cổng 4a kể cả không bản ghi v3; ② `NOI_VE_GIAO` + order · package · item · update · status · where is/are · nasaan · kailan · get it · still nothing · أين · وين · متى · طلب; ③ `KHANG_DINH_DON`: chủ ngữ order/parcel/package/item/shipment + with the/our courier · being shipped/delivered · ready for dispatch · in transit · rescheduled · returned · «already with the courier» · Taglish (na-ship/na-deliver/naipadala na · papunta na ang rider · nasa rider na · wala pang order) · Ả Rập (تم توصيل الطلب · طلبك مع المندوب · لا يوجد طلب); nhóm [S8] (được nói ở lượt tóm tắt) + «being processed» · «confirmed na po ang order» · «تم تأكيد/إرسال الطلب» · «there's (already) an order in the system» | ⑩v2h (bỏ sở hữu+trạng thái ⇒ VA3 WF4) · ⑩v2i (NOI_VE_GIAO cũ ⇒ VC) · ⑩v2j (KHANG_DINH_DON cũ ⇒ VG WF4c) · ⑩v2u ⑩v2v (khiếu nại thật bị loại vì «set»/«how much longer» ⇒ VA3) · ⑩v2w («where» trơn ⇒ VC) · ⑩v2x («تم إرسال الطلب» chặn ở lượt tóm tắt ⇒ VG) |

**B — tín hiệu CÓ HẠN (nghiệp vụ câu 5–6):** `context.js#tinhDonDaCo` TÍNH LẠI MỖI LƯỢT (handler ngay sau `extractFromText`, trước mọi cửa 0 đồng). Ứng viên: hồ sơ đã lưu (CHỈ khi có `luc` còn hạn — tin cũ có thể trôi khỏi lịch sử Pancake) · tin page mới nhất không phải chữ bot · bản ghi chốt của v3 (`hoi_thoai.chot_don_luc`, nguồn `v3`) · tin khách trong lịch sử + tin lượt này. Ưu tiên page > v3 > khách (C41 giữ), cùng nguồn thì mới hơn. **HẠN 14 ngày kể từ tín hiệu** = giao 2–5 ngày + chỉ đổi khi lỗi trong 7 ngày sau nhận (người quyết 15/10) ⇒ 12 ngày là trọn vòng đời một đơn bình thường, +2 ngày đệm giao lại/trễ; quá hạn ⇒ khách là người mua. Mốc Pancake `inserted_at` không múi = UTC (`mocTin` — không để `Date.parse` đọc theo giờ máy). `prof.ordered` (lưu vĩnh viễn, không mốc) THÔI mở cổng 4a. Ca VB · WB · LS; đảo-vá ⑩v2e (bỏ hạn ⇒ VB WB) · ⑩v2f (giữ hồ sơ không mốc ⇒ VB) · ⑩v2g (`ordered` mở cổng ⇒ LS) · ⑩v2q (mốc theo giờ máy, ép `TZ=Asia/Ho_Chi_Minh` trong lượt đo ⇒ VB).
**E — nguồn đúng (câu 4 · N3):** ghi chú «SAU BÁN · khách: «…» · đơn: <trạng thái> (<nguồn · dd/mm>)», nguồn ∈ POS · AI LEADER · sale · máy <tên> · tin page không rõ người gửi · v3 đã chốt · lời khách (`nguonDonChu`, ngày UTC); không còn «(page)» / «(bot)». Khối hồ sơ: nguồn v3 in «CHÍNH BOT đã chốt». Ca VE · WF4 · WF4b · WE; đảo-vá ⑩v2k (in `don.nguon` ⇒ WF4 WF4b WE).
**F (NÊN nhỏ, tổng cho làm):** (1) F7c — lượt TÓM TẮT đơn miễn `HUA_MOC` (chép mốc giờ khách xin, sale xác nhận); «Delivery takes 2-5 working days» ở lượt tóm tắt vốn QUA, giữ — ca VT, đảo-vá ⑩v2n. (2) F8/N4 — `lead-score.js#laDongTen`: dòng mở đầu «Al/El …» và từ mốc (market · mall · hypermarket · bank · mosque · hospital · school · hotel · center · station · area…) là địa chỉ; + «filipina · hindi · ko · alam» vào từ thường ⇒ đơn nháp giữ cờ «Tên lấy từ Facebook» — ca VN, đảo-vá ⑩v2o ⑩v2p.

### ④9 · M6 phát lại (giả lập dev, CHỈ ĐỌC, ngữ cảnh phỏng dựng) — số MỚI
Ra 148 câu bot · luật cũ base = mới (PII_ECHO 5 · DUPLICATE 8 · PRICE_MISMATCH 1 · DELIVERY_PROMISE 5), 0 lệch. Luật mới × câu: **Y_TE 1 · TU_HUA 6 · BIA_TRANG_THAI_DON 8 · BAN_LAI_SAU_BAN 9** (vòng 1: BIA 6 · BAN_LAI 10 — Saudi #46 từ BAN_LAI sang BIA, +#141 BIA). Đủ lượt ĐÒI (UAE #82–#85 #100 #65 · Saudi #4 #5 #23 #28 #35 #37 #46 #54 #141). **Ngoài danh sách 5 — cả 5 BAN_LAI_SAU_BAN ở hội thoại CÓ đơn (UAE #91 · Saudi #1 #19 #20 #134), 0 ở hội thoại KHÔNG đơn, 0 luật khác** (hợp đồng tổng giữ: ≤ 3 ở hội thoại không đơn; vòng 1: 6 — #46 nay là lỗi bịa đã biết). Định nghĩa «có đơn» đổi ⇒ `coDon` phỏng dựng phải QUA LẠI bộ dò mới trên câu đã lưu (`cau`): 16/16 tín hiệu lưu hai CSDL (page 13 · khách 3) vẫn qua ⇒ không lượt nào đổi «có đơn»; hạn 14 ngày không loại gì (mỗi lần chạy gói trong một ngày). Rb UAE 3/109 (#82 #90 #102 — đều ht 43779) · page 340 0/60 · Rc y tế 1 (#47) · Rd 1 tên · Re 24 + 3 = 27 ≤ trần 28 (+5 có đơn) · Rf thêm 0 / 31.715 câu.

### Lệch phiếu (vòng 2)
1. **Thước cũ đổi theo luật mới (bẫy 27):** Wd3/Wf2 dựng tín hiệu lưu CÓ mốc còn hạn; Wf1 dựng đơn page bằng tin POS THẬT 2 ngày trước trong lịch sử (hồ sơ không mốc nay bị bỏ). LS: `ordered:true` ⇒ la:false, `donDaCo` nguồn v3 ⇒ la. Ba ca xanh trên HEAD lẫn sau vá.
2. **M6:** Saudi #46 (so_ai 62 «Since there's already an order in the system…») + #141 (so_ai 138) vào lỗi đã biết + ĐÒI (đối kháng F4 gợi ý · hướng C).
3. **Một câu SQL thêm mỗi lượt** (`chuBotDaGui`, khuôn `human.js#nhanDienSale`), KHÔNG bọc try/catch: đọc trong giao dịch tin — nuốt lỗi thì giao dịch đã «aborted», mọi câu sau chết lạ; để nổi lên như mọi đọc khác. `human.js` ngoài pathspec ⇒ không gộp helper (nợ).
4. **«there's already an order in the system»** — ngoài ba ví dụ hướng C nhưng cùng loại khẳng định CÓ đơn (câu bot thật #46); đặt ở nhóm [S8] (lượt tóm tắt được nói).
5. **Ngứa SAU khi dùng** (itch · nangangati · makati · kati) vào nhóm kích ứng — hướng D nêu «nangangati after using».
6. **`cleanHistory(msgs, pageId, prof, { bocDon })`** — tham số mới, mặc định true (C41 · DB · DO giữ hình).
7. **WE** đặt tin sale 40 h (không 30 h): `history.js#messageTime` đọc giờ Pancake không múi theo GIỜ MÁY ⇒ ở `TZ=Etc/GMT+12` tin 30 h thành «trong 24 h» và `nhanDienSale` nhường trước handler (đo: đỏ ở −12, xanh ở UTC/+14). Ca worker 31/0 ở UTC · +14 · −12 · +07; hàm thuần 113/0 ở UTC · +14 · −12.
8. **Giả định ghi rõ (bẫy 11):** hồ sơ lưu `donDaCo` KHÔNG mốc (mọi hồ sơ trước vòng 2) bị BỎ rồi tính lại từ lịch sử Pancake đọc được — chọn bỏ thay giữ vì giữ là khoá vĩnh viễn (đúng lỗi câu 5–6); giá: tin POS đã trôi khỏi lịch sử ⇒ mất tín hiệu một lần. Theo sổ ghi nhớ v3 bật 0 page tới 02/10 ⇒ prod chưa có hồ sơ v3 cần giữ — **tổng kiểm trước mở van** (SQL đếm `hoi_thoai.ho_so->'donDaCo'` không có `luc` trên page sẽ bật).

### Cổng cũ · npm test (trên `b076aa6`, một lượt `CHAY_CONG_CU=1 CHAY_NPM_TEST=1 bh9.sh`)
`gl8.sh` rc=0 ĐỎ 0 / XANH 33 · `rp2.sh` rc=0 · `rp1.sh` rc=0 · `bh8.sh` rc=0 ĐỎ 0 / XANH 12 · `bh7.sh` rc=1 ĐỎ 1 / XANH 8 — chỉ ④ «luật tin ngắn trong CORE» (đỏ SẴN từ base, BH9 không chạm `prompts.js`) · `npm test` 2982 / 0. Lượt đó ①–⑥ của bh9 đỏ 3 nhóm vì RỤNG 19 ca hàm thuần với fail=0 (94/113 — máy bận: cổng gl10 của worktree khác chạy song song; ⑩0 cùng lượt 113/0) — đúng án lệ N-THUOC-CHAP-CHON, thước nhóm bắt được. Chạy lại `bh9.sh` riêng hai lần (`b076aa6`, `115be21`): **ĐỎ 0 / XANH 112**. `npm test` trên `115be21`: 2982 / 0 (skipped 22). Lượt `rp1.sh` đầu (cây CHƯA commit) đỏ ③ «sửa dở trên bộ não» — đúng luật cổng, sau commit rc=0.

### /code-review vòng 2 (lượt 1 soát nhầm phạm vi — diff GL8/GL9 của cây chính `@{upstream}`, không thuộc phiếu, KHÔNG xử lý; lượt 2 trên diff worktree: 10 điểm — sửa 7, ghi nợ 3)

| # | điểm | xử lý |
|---|---|---|
| 1 | «When my order arrives can I pay cash?» · «Will my order arrive in 2 days?» thành đơn đã có | SỬA: vế mở đầu trợ động từ hỏi / hỏi COD-trả tiền ⇒ người đang mua (`VE_DANG_MUA`) — ca VF1, ⑩v2s |
| 2 | «My order is 2 sets, when will it arrive?» (dấu phẩy) | SỬA: sở hữu + trạng thái cùng VẾ (tách cả `,;،`) — VF1, ⑩v2t |
| 3 | khiếu nại thật bị bộ loại nuốt («…15 days for my order, how much longer?» · «How long until my order arrives? I ordered last week» · «I received the parcel but one set is missing») | SỬA: «how much/long LONGER/UNTIL…» không loại; «received the parcel/goods» (RÕ) không chịu `NHAN_TRUOC_BAN`; «ordered last week» là đơn (bỏ khỏi `LAI_MUA`) — VA3, ⑩v2u ⑩v2v |
| 4 | lượt tóm tắt: «تم إرسال طلبك إلى فريقنا» · «You have an order in our system now…» bị BIA | SỬA: vào nhóm [S8] (chỉ chặn ở lượt thường) — VG, ⑩v2x |
| 5 | hồ sơ lưu không `luc` bị bỏ ⇒ mất tín hiệu POS đã trôi | GIỮ (giả định 8 ở trên — chọn có chủ ý, tổng kiểm trước mở van) |
| 6 | tin page «đã huỷ» thắng tín hiệu mới hơn, khoá tạo đơn mua lại 14 ngày | NỢ N-BH9-HUY-KHOA-MUA-LAI (hành vi từ vòng 1; nay có hạn; khách vẫn tới sale) |
| 7 | chữ của BOT KHÁC (ai_sale · AI LEADER) không bị loại | NỢ N-BH9-BOT-KHAC (hướng A(2) nhận tin máy hệ thống — RTO/POS cũng là máy; khuôn đã siết thì câu trước bán của bot khác không khớp) |
| 8 | `ours` 60 dòng lan_gui có thể hụt tin bot cũ | SỬA: 200 dòng (ngân sách ≤ 12 lượt/24 h) |
| 9 | `NOI_VE_GIAO` «where» trơn mở cổng («where can I see the colors?») | SỬA: «where is/are/'s/na/ba» — VC, ⑩v2w |
| 10 | SQL chép `human.js` · chuẩn hoá `ours` lặp mỗi tin page | SỬA phần chuẩn hoá (một lần mỗi lượt); helper chung ⇒ NỢ N-BH9-OURS-HAI-BAN (`human.js` ngoài pathspec) |

### NÊN còn lại + GHI-NO ⇒ nợ đề nghị §9 (KHÔNG làm — tổng F)
- **N-BH9-TUHUA-AR** (F6 phần hứa) — «سيصلك الطلب يوم الخميس» · «المندوب سيتصل بك الساعة 10 صباحاً» QUA (`MOC_GIAO` chỉ chữ La-tinh).
- **N-BH9-CUA-RA-QUA-TAY** (F7a/b) — trước bán, «no order will be placed until you confirm» (BIA) · «Our couriers deliver between 9 AM and 9 PM» (TU_HUA) bị chặn.
- **N-BH9-TUHUA-HUT** — câu bot thật Saudi so_ai #189 «They'll make sure your order reaches you today» · #150 «Our team will review your order and contact you shortly… coordinate with the courier» QUA.
- **N-BH9-TEN-KHU** (F8 phần còn) — tên khu không mạo từ («Mussafah Shabiya») còn thành tên (danh sách khu là tập mở).
- **N-BH9-YTE-LUAT-CU-IM** gộp G1 + F9: mọi đường thoát im của lượt y tế (luật cũ chặn · `complaint` · hết ngân sách) phải gửi CAU_Y_TE; «có thai» (kể cả hỏi hộ «Is it safe for pregnant women?») luôn bàn giao — người quyết chốt.
- **N-BH9-HUY-KHOA-MUA-LAI** · **N-BH9-BOT-KHAC** · **N-BH9-OURS-HAI-BAN** (review #6 #7 #10, trên).
- **N-BH9-GIO-PANCAKE-MAY** — `chat/history.js#messageTime` (và `nhanDienSale` cửa 24 h) đọc giờ Pancake không múi theo giờ máy; prod chạy UTC thì đúng, máy dev lệch ±14 h. `context.js#mocTin` đã đọc đúng UTC — nên dùng chung.
- **N5** (GHI-NO nghiệp vụ) — skill `review-nghiep-vu` trỏ `Y-DO-CEO-7-LUONG.md` không có trong repo; design-pack §M07/§M09 (N-BH9-DESIGN-PACK) — tổng.
- **N-BH9-DON-HET-HAN** (vòng 1): phần lớn ĐÓNG — tín hiệu nay có hạn 14 ngày; khách mua lại TRONG 14 ngày vẫn tới sale (Saudi #19 #20 — hệ quả chấp nhận).
