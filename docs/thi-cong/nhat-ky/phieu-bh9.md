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
