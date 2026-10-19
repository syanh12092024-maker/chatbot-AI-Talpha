# NHẬT KÝ PHIẾU GL10 — bot v3 tự bảo ai_sale nhường page (khoá `_v3` trong `page_gan_them.json`) · chỉ trả lời tin khách đến SAU mốc bật

**Thợ:** agent thi công (worktree `agent-a2b792f2ee00a5373`, nhánh `worktree-agent-a2b792f2ee00a5373`) · **Ngày:** 19/10/2026 ·
**Base phiếu:** `e1f1f91` (worktree khởi ở `ff3526a` — CHƯA có phiếu ⇒ `git merge --ff-only vao-ui-v3-17-09` lên `7c99f77` «GL10 sau soát (a)»; từ
`e1f1f91` tới `7c99f77` chỉ có commit tài liệu của tổng) · **Làn:** 🟥 · **Đụng bộ não:** không (handler-v3.js + tám tệp não không đổi — cổng Ta).

## Commit

| hash | nội dung |
| --- | --- |
| `e5421e7` | `test(gl10)` — THƯỚC TRƯỚC: `ops/bin/nghiem-thu/gl10.sh` + 5 tệp ca `test/gl10-*.test.mjs` (39 ca; trên base 32/32 ca đỏ — đo trước khi có 7 ca sau /code-review) |
| `d890aeb` | `feat(gl10)` — `src/queue/ai-sale-nhuong.js` mới · migration 035 + schema · bộ nạp lọc mốc · worker lọc `sanSang` · cổng bật/tắt · màn · bảng biến · 9 tệp ca cũ chỉnh dựng ca |
| (commit này) | `docs(nhat-ky)` — nhật ký này |

## ⑦ Đã tra chưa (đầu lượt)

`ops/bin/tra_no.py`, `docs/thi-cong/SO-NO.md` KHÔNG tồn tại (`ls` ⇒ không có). Tra thay trong sổ:
```
$ grep -n "ai_sale\|page_gan_them\|GL10\|truoc_moc_bat\|N-AI-CARE\|mốc bật" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
343-344: §5g «Không đụng pancake-tool/ai_sale» + (SỬA 15/10 — v3 được GHI khoá _v3 … phiếu GL10)
3736: 15/10 người quyết «Nút v3 tự ghi khoá ai_sale» · 3742-3743: soát (a) GL10 → SỬA PHIẾU 9 điểm · nợ mới N-AI-CARE-DON
$ sed -n '432,$p' … | grep -n "messageTime\|giờ Pancake\|múi\|tin cũ\|bật lại"
1525 (tương đối): RP2 «mốc lưu theo giờ MÁY (Pancake không múi)» — nợ chấm điểm, KHÁC việc phiếu này
```
Không nợ/phán nào trùng. Quyết định 15/10 đã có trong sổ + `01-QUYET-DINH.md` (tổng ghi trước khi phát).

## Đo lại nguyên liệu đề bài (bước 3) — prod CHỈ ĐỌC 19/10 + repo

```
$ stat page_gan_them.json · state/chung     ⇒ root:root 644 7809 B 2026-10-15 04:11 · thư mục root:root 755 (khớp phiếu ⑦)
$ python3: kiểu khoá                         ⇒ _ghi_chu str(222) · uae dict(15) · taiwan(4) · saudi(13) · tram_landing(5) · japan(6) · qatar(1) · _v3 VẮNG
$ python3: kiểu mọi giá trị                  ⇒ dict 12 · str 75 · list 5 · KHÔNG số nào (⇒ luật «từ chối ghi khi có số JS không giữ được» không chặn tệp thật)
$ indent                                      ⇒ json.dump(indent=1) (tệp mở đầu "{\n \"")
$ ai_sale.py (sửa 18/10 17:24) :13530-13559  ⇒ thân _page_gan_them · _page_gan_noi_khac · _hop_page_shop — chép NGUYÊN VĂN vào ca (gl10-tep-ai-sale)
$ tu_gan_page_ngoai.py (10/10 05:12) :48-78  ⇒ _doc_gan · _ghi_gan · _go_gan: tam = f"{F_GAN}.{os.getpid()}.tmp" + os.replace, KHÔNG khoá — chép vào ca
$ ls /var/log/aisale-chat*                   ⇒ 9 tệp (aisale-chat.log 126 MB · -saudi 305 MB · -kuwait 58 MB · …); /etc/logrotate.d KHÔNG có cấu hình aisale
$ dòng log có page id (tail 30 MB, che chữ)  ⇒ saudi: 41 dòng `<pid>/<pid>_<psid>` + 46 «🏷» + 45 «✔ … (page <pid> …)» + 3 «⚠»; uae: 212 «✔» + 82 «🏷» + 4 «🧭»
$ ai_sale.py :13875-13878                     ⇒ khi tra lại danh sách page ai_sale in «🚨 BỎ QUA n page KHÔNG thuộc shop …:» + MỘT dòng TÊN page (tên trống ⇒ in id)
# repo
$ grep -c 'WHERE bot_ai_bat = true' src/queue/page-routing.js ⇒ 1 · nap_bo_qua CHECK (033) 7 mã · migration cuối 034 · history.js#messageTime dùng Date.parse
```
Khác phiếu: (1) phiếu nói «dòng ai_sale chạm hội thoại mang `<page>/<page>_<psid>` và dòng thẻ 🏷» — thật ra còn dòng «✔ … (page <pid>)» và
khối «BỎ QUA» in TÊN/id page ai_sale ĐÃ bỏ (xem /code-review #3). (2) KHÔNG đo lại giờ Pancake bằng gọi API (cấm gọi Pancake thật) — dùng số đo
prod 15/10 của phiếu ① C.

⚠️ **Sơ suất khi đo prod (khai thật):** một lệnh đo chỉ-đọc lỡ ghi tệp tạm `/tmp/.gl10_doc_<pid>` trên prod (bản tail 30 MB log ai_sale để đếm)
rồi xoá ngay trong CÙNG lệnh (`rm -f`). Không đụng tệp/dịch vụ nào khác, không in nội dung. Vẫn là vi phạm luật «ssh prod CẤM GHI» của lệnh giao
việc — các lệnh sau đều chạy bằng ống, không ghi tệp.

## Danh sách ca (viết trước ca chi tiết) — 39 ca, 5 tệp

| ca | nhóm | kịch bản | phép ④ |
| --- | --- | --- | --- |
| D1 · D2 | CHẶN | đọc: hợp lệ / cụt / mảng / `_v3` sai kiểu / vắng (không bao giờ `{}`); gắn tay = dict khoá khác `_v3` hoặc mảng | ②1 |
| G1 | HÀNH VI | ghiKhoa giữ khoá lạ + thứ tự; BẢN CHÉP ai_sale ⇒ P rời uae+saudi; `_ghi_gan` chạy sau giữ `_v3`; xoaKhoa mục cuối ⇒ mất `_v3` | ④1 |
| G1b | CHẶN | ghiKhoa kiểm lại gắn tay trên đúng bản sắp ghi | /code-review #6 |
| G2a–e | CHẶN | ghi một phần rồi lỗi ⇒ nguyên byte · umask 077 ⇒ vẫn 644 · số ≥16 chữ số / số thực ⇒ từ chối · `_ghi_gan` chen trước rename ⇒ làm lại (3 lần ⇒ 409) · tệp vắng ⇒ không tạo | ④2 |
| M1 | BIÊN | thoiDiemPancake dưới Berlin · UTC · +7; rác ⇒ NaN | ②3 |
| C1 | HÀNH VI | HTTP bật ⇒ khoá + bản chép ai_sale nhường + màn «còn 15 phút» + choDen−bật 900 s; tắt ⇒ gỡ | ④1 ④4 |
| C3a–c | CHẶN | tệp cụt/mảng/_v3 chuỗi · vắng · biến vắng · gắn tay uae/tram_landing ⇒ 409 (đọc câu), tệp nguyên byte | ④3 |
| C6a–f | HÀNH VI | tắt đóng đúng tin · gỡ hỏng ⇒ xoa_hong + canhBao + thử lại · tiêm lỗi tx1 ⇒ khoá còn · chưa từng ghi khoá ⇒ không canhBao · chết giữa tx1/tx2 ⇒ xoa_hong · bật chen giữa tx1/tx2 ⇒ không gỡ | ④6 (+ #4 #5) |
| C7 | HÀNH VI | bật lại đóng tin cũ, worker không gọi bộ não | ④7 |
| C9 | CHẶN | tiêm lỗi UPDATE lượt bật ⇒ gỡ khoá vừa ghi; khoá có trước ⇒ giữ | ④9 |
| C10 | CHO-QUA | gạt bật lại page đang phục vụ ⇒ giữ nguyên; page mat_khoa ⇒ lượt đầy đủ | /code-review #2 |
| W4a–c | HÀNH VI | chờ: 0 nạp/0 rút, trần vẫn đếm; qua mốc ⇒ nạp+rút+da_nhuong; 4 vòng song song ⇒ 1 nhật ký, vòng xử không chạm log; 2 vòng nạp đọc cùng lúc ⇒ 1 nhật ký | ④4 |
| W8 · W8b | CHẶN | mất khoá (vòng xử đã chặn) · có lại ⇒ cho 15′ · tệp hỏng · gắn tay · gỡ; mất khoá 40′ sau bật ⇒ mốc đặt lại | ④8 (+ #1) |
| W10a–h | HÀNH VI | log thấy ⇒ +2′ · >30′ ⇒ chua_nhuong không gia hạn · biến vắng ⇒ theo giờ · da_nhuong thấy lại ⇒ chua_nhuong · restart offset EOF · không rò tên khách · ranh giới chữ số + khối BỎ QUA · đổi tên tệp | ④10 (+ #3 #7) |
| B5 · B5b | BIÊN | A/B/C/D/giờ rác/cụm trước mốc dưới TZ Berlin + UTC; NULL ⇒ cũ | ④5 |
| K11 | CHẶN | CSDL chưa 035 | ④11 |

Nhánh KHÔNG chạm: Pancake thật (deps/fetch giả) · ai_sale thật (bản chép nguyên văn ba hàm + `_ghi_gan`) · `tu_gan_page_ngoai.quet` (chỉ
`_ghi_gan`) · đường webhook (prod tắt) · màn trình duyệt thật (đọc JSON API; HTML chỉ soi bằng bộ ca giao diện chung của npm test) · worker
`main()` (bốn vòng mô phỏng bằng `Promise.all` như ca gl4) · `buKhoa` nhánh «CSDL hỏng ⇒ gỡ không khoá».

## Số đo (máy dev · Postgres.app `127.0.0.1:5432` · hộp cát `aicloser_v3_test_gl10{c,w,m,k}_p<pid>` · cây worktree · node v24.19.0)

Mọi ca in `tệp đo …/agent-a2b792f2ee00a5373/src/…` (cây phụ, không cây chính); `node_modules` của worktree là symlink tới cây chính (tệp phụ
thuộc, không phải mã — `gl3-han-cho-pancake` chép `src` sang tmp + symlink `GOC/node_modules`, thiếu là 18 ca đỏ giả).

**Thước trên base** (bản sao `7c99f77` = mã `e1f1f91`, 32 ca thước đầu, TZ=Europe/Berlin): `tests 32 · pass 0 · fail 32`. Phần lớn đỏ vì
mô-đun/cột chưa có (base không có tính năng); B5b đỏ ở bước dựng ca (INSERT cột `bot_bat_luc`), không phải ở phép đo hành vi.

**Cổng sau vá** (`BO_CONG_CU=1 bash ops/bin/nghiem-thu/gl10.sh`, lượt sau /code-review):
```
✅ ⓪.env-PANCAKE_READONLY=1 đọc được: '1'
✅ ①②③(mô-đun) pass=10 fail=0 · xanh: D1 D2 G1 G1b G2a G2b G2c G2d G2e M1
✅ ①③④⑥⑦⑨(HTTP-thật) pass=13 fail=0 · xanh: C1 C10 C3a C3b C3c C6a C6b C6c C6d C6e C6f C7 C9
✅ ④⑧⑩(worker-thật) pass=13 fail=0 · xanh: W10a W10b W10c W10d W10e W10f W10g W10h W4a W4b W4c W8 W8b
✅ ⑤mốc-bật-dưới-TZ=Europe/Berlin pass=2 fail=0 · xanh: B5 B5b   ✅ ⑤mốc-bật-dưới-TZ=UTC pass=2 fail=0 · xanh: B5 B5b
✅ ⑪CSDL-chưa-áp-035 pass=1 fail=0 · xanh: K11
✅ Ta bộ não + handler-v3.js không đổi từ e1f1f91 · ✅ Tb page-routing.js không đổi (WHERE bot_ai_bat = true =1) · ✅ Tc nap.js#docEnvTuyetDoi không đổi
✅ Td schema.sql sinh từ migrate/ (2 lần nhắc 035) · ✅ Te 035 khai «áp VPS trước mã» · ✅ Tf đọc biến tệp chỉ ở ai-sale-nhuong.js; gọi ghi/xoá khoá chỉ ở operations.js
✅ Tg bảng biến có 2 dòng V3_AI_SALE_* · ✅ Th CHO_AI_SALE_MS = 900_000 là hằng
✅ ⑫a … ⑫y9 (35 đảo-vá, bảng dưới) · ✅ ⑫0 bản sao nguyên vẹn pass=39 fail=0
```
Lượt ĐẦY ĐỦ (cả ⑬ cổng cũ) sau commit `d890aeb`: `bash ops/bin/nghiem-thu/gl10.sh` ⇒ **== ĐỎ 0 / XANH 60 · rc=0**.

**npm test** (`npm test -- --test-force-exit`, cùng máy):
- TRƯỚC (bản sao base `7c99f77`, không `test/gl10-*`): `tests 2827 · pass 2805 · fail 0 · skipped 22` · rc=0 · 34,6 s
- SAU (cây sửa, trước commit): `tests 2866 · pass 2844 · fail 0 · skipped 22` · rc=0 · 32,9 s (+39 = đúng 39 ca GL10; 0 ca cũ đổi màu)
- Lượt giữa (trước /code-review, trước sửa 3 tệp ca ngoài ③ + symlink node_modules): 2858 · 39 đỏ = 18 `gl3-han-cho-pancake` (môi trường
  worktree) + 20 `gl3c-*` + 1 `gl2-den-suc-khoe C5e` (cổng mới chặn — xem lệch phiếu 1).

**Cổng cũ ④13** (mỗi cổng chạy riêng, `rg` = shim grep -E; nền đo trên bản sao base cùng ngày):
| cổng | base (bản sao `7c99f77`) | sau (`d890aeb`, lượt đầy đủ gl10.sh ⑬) |
| --- | --- | --- |
| gl2.sh (đòi rc=0) | rc=0 · ĐỎ 0 / XANH 52 | rc=0 · ĐỎ 0 / XANH 52 |
| mb.sh | rc=0 · 0 dòng đỏ | rc=0 · 0 |
| gl4.sh | rc=0 · ĐỎ 0 / XANH 60 | rc=1 · ĐỎ 1 / XANH 59 — dòng lồng «⑥gl3b.sh rc=1 · ĐỎ 1» (cùng một gốc dưới) |
| gl3c.sh | rc=0 · ĐỎ 0 / XANH 76 | rc=1 · ĐỎ 1 / XANH 75 — dòng lồng «④gl3b.sh rc=1 · ĐỎ 1» |
| gl3b.sh | rc=0 · ĐỎ 0 / XANH 49 | rc=1 · ĐỎ 1 / XANH 48 — **⑤c «bỏ migration 033 ⇒ N1 N5 đỏ»: nay chỉ N5 đỏ** |
| l2-m1.sh | rc=1 · 3 dòng (①b · ③ · ③b) | rc=1 · 3 dòng — GIỐNG HỆT base |
| va-r1.sh | rc=1 · 2 dòng (④RF-3 S3 · ⑤ S4) | rc=1 · 2 dòng — GIỐNG HỆT base |
| gl1.sh | rc=0 · ĐỎ 0 / XANH 7 | rc=0 · ĐỎ 0 / XANH 7 |
| gd1.sh | rc=0 · 0 | rc=0 · 0 |

**Dòng đỏ mới DUY NHẤT — thước cũ già vì 035, không phải mã sai:** đột biến `gl3b.sh ⑤c` gỡ tệp 033 để CHECK `nap_bo_qua` mất mã
`doc_tin_loi` (ca N1 đỏ). 035 (theo khuôn 033 mà phiếu chỉ định) DỰNG LẠI CHECK với đủ 8 mã ⇒ gỡ 033 không còn làm mất `doc_tin_loi` ⇒ N1 xanh.
Không sửa được trong ③ (gl3b.sh ngoài phạm vi; viết 035 kiểu «đọc CHECK cũ rồi nối thêm» chỉ để chiều một đột biến là méo migration). Cổng
gl10.sh ⑬ đếm RIÊNG đúng dòng đó + dòng lồng «gl3b.sh rc=1 · == ĐỎ 1 /» và IN ra («đỏ đã biết (gl3b ⑤c ↔ 035)=1»); gl3b thêm dòng đỏ nào khác ⇒
dòng lồng thành «ĐỎ 2» ⇒ vẫn đỏ. Nợ đề nghị **N-GL10-GL3B-5C**: tổng chỉnh `gl3b.sh ⑤c` (gỡ 033 + 035 cùng lượt, hoặc đòi chỉ N5).
Hai dòng đỏ ở lượt giữa đã vá phía GL10: gl2 ⑤l/⑤m + gl4 ⑤z «đột biến không áp được» (neo chuỗi mã cũ) ⇒ giữ nguyên dáng `setPage`
(`if (input.enabled === true) { … await kiemTranPageBat(c, p, env);\n    }`) và tên `choPhep` cho danh sách nạp/rút; gl2 ⑤d (W4b không đỏ vì lọc
nhường GL10 che đột biến trần) ⇒ W4b đánh «đã nhường» A, B để chỉ trần quyết.

**`_chan1.sh gl10`** (HEAD `d890aeb` + tệp nhật ký này chưa commit; `BO_CONG_CU=1` vì ⑬ đã chạy đủ ở lượt trên — chạy lồng vượt trần 10′ của
công cụ): `✅ ①phiếu ✅ ②Base=e1f1f91 🔴 ④pathspec-⊆-③ NGOÀI PHẠM VI: docs/v3/01-QUYET-DINH.md test/gl3c-nap-loi.test.mjs test/gl3c-vong2.test.mjs
v3/test/b/gl2-den-suc-khoe.test.mjs ✅ ⑤bộ-não ✅ ⑥marker=0 ✅ ⑦gl10.sh rc=0 (ĐỎ 0/XANH 51) ✅ ⑧a ✅ ⑧b` ⇒ **== ĐỎ 1 / XANH 7**. ④: ba tệp ca =
lệch phiếu 1 (báo tổng); `01-QUYET-DINH.md` là commit `7c99f77` của TỔNG sau base `e1f1f91` (ghi quyết định 15/10), không phải của thợ. ⑧b xanh
nhờ dòng §10 19/10 của tổng có chữ «GL10» — thợ KHÔNG ghi §10 (lệnh giao việc).

## Đảo-vá (④12 + soát (a) + thêm) — 35 đột biến, mỗi đột biến một tiến trình node mới trên bản sao tạm, TZ=Europe/Berlin

| # | đột biến | đỏ thật | đòi |
| --- | --- | --- | --- |
| ⑫a | ghi thẳng tệp đích | G2a | G2a |
| ⑫b | bỏ chmod/chown | G2b | G2b |
| ⑫c | bỏ kiểm số lớn | G2c | G2c |
| ⑫d | tệp hỏng coi là {} | C3a D1 | C3a D1 |
| ⑫e | bỏ từ chối gắn tay | C3c | C3c |
| ⑫f | bỏ lọc sanSang ở chay worker | W4a | W4a |
| ⑫g | bỏ lọc mốc ở bộ nạp | B5 | B5 |
| ⑫h | thoiDiemPancake về Date.parse thẳng | B5 M1 | B5 M1 |
| ⑫i | bỏ đóng tin khi tắt | C6a | C6a |
| ⑫j | đảo thứ tự tắt (xoá khoá trước) | C6c | C6c |
| ⑫k | bỏ đóng tin khi bật | C7 | C7 |
| ⑫l | bỏ kiểm khoá mỗi vòng | W8 | W8 |
| ⑫l2 | vòng xử không kiểm tệp (chỉ vòng nạp) | W8 | W8 |
| ⑫m | bỏ bù | C9 | C9 |
| ⑫n | bỏ gia hạn theo log | W10a | W10a |
| ⑫o | bỏ bắt 42703 | K11 | K11 |
| ⑫p | bỏ kiểm (ino,mtime,size) trước rename | G2d | G2d |
| ⑫q | chuyển trạng thái KHÔNG điều kiện | W4c | W4c |
| ⑫q2 | vòng xử cũng chuyển/đọc log | W4b | W4b |
| ⑫r | bỏ (vi) gắn tay ở worker | W8 | W8 |
| ⑫s | xoa_hong không xét «đã từng ghi khoá» | C6d | C6d |
| ⑫t | cửa sổ log đóng sau 30′ | W10d | W10d |
| ⑫u | offset 0 sau restart | W10e | W10e |
| ⑫v | CHO_AI_SALE_MS về 720 000 | C1 W4a | W4a C1 |
| ⑫w | bỏ câu chặn «biến vắng» ở pageStatus | C3b | C3b |
| ⑫x | xoá mục cuối mà giữ _v3 rỗng | C1 G1 | G1 C1 |
| ⑫y1 | khoá có lại mà KHÔNG đặt lại mốc bật | W8b | W8b |
| ⑫y2 | gạt BẬT lại page đang phục vụ chạy lượt đầy đủ | C10 | C10 |
| ⑫y3 | log khớp chuỗi con thô (không ranh giới, không bỏ khối BỎ QUA) | W10g | W10g |
| ⑫y4 | offset log theo TÊN (không theo inode) | W10h | W10h |
| ⑫y5 | TẮT giao dịch 1 không đánh dấu xoa_hong | C6e | C6e |
| ⑫y6 | TẮT giao dịch 2 gỡ khoá dù page vừa được bật lại | C6f | C6f |
| ⑫y7 | ghiKhoa không kiểm lại gắn tay | G1b | G1b |
| ⑫y8 | pageStatus im khi tệp hỏng/vắng | C3a | C3a |
| ⑫y9 | số thực cho ghi | G2c | G2c |

`⑫0` bản sao nguyên vẹn: pass=39 fail=0 (thước không tự đỏ). Tất cả 35 đột biến ⑫a–⑫y9 ✅ (đỏ đúng ca đòi).

**Đột biến nào KHÔNG đỏ / chỉ đỏ nhờ lớp hai:**
1. Bỏ câu chặn «biến vắng» ở `pageStatus` ⇒ bật VẪN 409 (ghiKhoa("") ném «Chưa nối ai_sale … không ghi được khoá»). C3b đỏ chỉ vì ca đọc NGUYÊN
   câu của cổng («— bật lúc này có thể hai bot cùng trả lời»). Hai lớp — không mở được bằng một đột biến.
2. Bỏ từ chối gắn tay ở `pageStatus` ⇒ bật vẫn 409 (ghiKhoa kiểm lại, #6); C3c đỏ vì ca đòi chuỗi «khoá gắn tay: uae» của cổng. Ngược lại bỏ
   kiểm ở ghiKhoa ⇒ chỉ G1b đỏ (cổng vẫn chặn trước). Hai lớp.
3. «Chuyển trạng thái không điều kiện» KHÔNG đỏ W4b (1 nạp + 3 xử như `main`): chỉ vòng nạp chuyển trạng thái nên bốn vòng như main không đua
   nhau ghi. Phải thêm W4c (HAI vòng nạp — chạy tay `V3_WORKER_MOT_LUOT=1` lúc dịch vụ chạy) với rào tất định: đột biến ⇒ 2 nhật ký.
4. «Date.parse thẳng» KHÔNG đỏ dưới TZ=UTC (đúng bản chất) — `gl10-moc-bat` tự ép Europe/Berlin khi `npm test` không đặt TZ; cổng chạy cả hai.
5. Bỏ «vòng xử cũng kiểm tệp» (chỉ vòng nạp kiểm) ⇒ W8 đỏ ở phép «vòng XỬ kế đã 0 rút» — trước khi vòng nạp kịp chuyển `mat_khoa`.

## /code-review (high, agent nền) — 10 điểm: SỬA 10 · bác 0

Kiểm chứng từng điểm trước khi sửa (đọc mã + đo prod chỉ-đọc cho #3 #7 #10); mỗi điểm có ca mới + một đột biến đo BẢN SAU VÁ (bẫy 26):

| # | điểm | kiểm chứng | sửa | ca · đột biến |
| --- | --- | --- | --- | --- |
| 1 | khoá có lại ⇒ `cho` nhưng `bot_bat_luc` cũ ⇒ log thấy (ai_sale đang trả lời lúc mất khoá) + >30′ ⇒ chua_nhuong oan | đúng (đọc `quyetDinhNhuong`) | chuyển «chờ lại» đặt lại CẢ `bot_bat_luc=now()` (cửa sổ log + trần 30′ + mốc tin đo lại) | W8b · ⑫y1 |
| 2 | gạt BẬT lại page đang phục vụ ⇒ đặt lại mốc, đóng tin hợp lệ, im 15′ | đúng (datCongTacBot cho phép) | page bật + cho/da_nhuong + khoá còn + không gắn tay ⇒ giữ nguyên phía ai_sale (`aiSale.giuNguyen`); trạng thái khác ⇒ lượt đầy đủ | C10 · ⑫y2 |
| 3 | dò log bằng chuỗi con | đúng một phần: đo prod thấy dòng «🏷»/«✔ (page id)» là ai_sale ĐANG trông page (phải tính), nhưng khối «🚨 BỎ QUA … KHÔNG thuộc shop» + dòng tên (tên trống ⇒ id) là ai_sale ĐÃ bỏ page | xét theo DÒNG trọn; pid phải đứng riêng (không dính chữ số); bỏ dòng có «BỎ QUA» + dòng ngay sau «KHÔNG thuộc shop» | W10g · ⑫y3 |
| 4 | chết giữa tx1/tx2 của TẮT ⇒ khoá còn, màn không báo | đúng | tx1 đánh `xoa_hong` khi trạng thái trước ≠ '' (CHECK 035 không có trạng thái riêng «đang gỡ»); tx2 gỡ xong mới về '' | C6e · ⑫y5 |
| 5 | BẬT chen giữa tx1/tx2 ⇒ tx2 gỡ mất khoá của lượt bật | đúng | tx2 khoá DÒNG trước (cùng thứ tự BẬT: dòng → trần → tệp, không vòng chờ), page đã bật lại ⇒ không gỡ | C6f · ⑫y6 |
| 6 | gắn tay kiểm trước khoá tư vấn, ghiKhoa không kiểm lại | đúng (TOCTOU với `_ghi_gan`) | ghiKhoa kiểm `khoaGanTay` trên đúng bản sắp ghi (ném trước ghi) | G1b · ⑫y7 |
| 7 | tệp log đổi tên ⇒ đọc lại từ 0 | đúng về mã; prod hôm nay không xoay log (không cấu hình logrotate) | offset khoá theo INODE (`dev:ino`), dọn mục tệp đã xoá | W10h · ⑫y4 |
| 8 | pageStatus đọc+parse tệp cho MỖI page | đúng (I/O đồng bộ trên đường request) | `docTepCoDem` (đệm ino/mtime/size) | (hiệu năng — không ca riêng) |
| 9 | tệp hỏng/vắng ⇒ pageStatus im ⇒ Sức khoẻ READY trong khi worker loi_tep | đúng | câu chặn cố định mới «Tệp nhường page của ai_sale … hỏng hoặc vắng …» (+ mã BOTMOI_AI_SALE_TEP_HONG ở bảng dịch + 2 bảng từ vựng), chi tiết lỗi tệp nối sau | C3a · ⑫y8 |
| 10 | ghi lại toàn tệp đổi ngữ nghĩa Python (600.0 → 600) | đúng về lý; prod hôm nay 0 số | từ chối ghi khi có số thực (cùng luật số nguyên ≥16 chữ số) | G2c · ⑫y9 |

Ngoài review: mb.sh ⑤ đỏ 1 dòng ở lượt chạy giữa vì nhãn màn có chữ «bot cũ» (luật MB: màn không nói «bot cũ/bot mới») ⇒ đổi thành «ai_sale»
(lệch phiếu 6).

## Lệch phiếu / giả định (ghi tại chỗ quyết)

1. **Sửa 3 tệp ca NGOÀI ③**: `test/gl3c-nap-loi.test.mjs` · `test/gl3c-vong2.test.mjs` · `v3/test/b/gl2-den-suc-khoe.test.mjs` — cùng loại với sáu
   tệp soát (a) đã kê (đường thật không tiêm `dsChoPhep` ⇒ cổng mới fail-closed chặn chắc). Chỉ sửa DỰNG CA (tệp nhường tạm + «đã nhường» cho
   page INSERT tay), không đổi điều ca khẳng định. Báo tổng: `_chan1 ④` đỏ vì ba tệp này (và vì `docs/v3/01-QUYET-DINH.md` tổng sửa sau base).
2. **`gl4-chua-034` tiêm `dsChoPhep`** (ngoài (b)): CSDL thiếu 034 thì cũng thiếu 035 ⇒ worker trả `[]` (đúng hợp đồng ② 3) ⇒ M7a không thể xử tin
   bằng đường thật. Tiêm `dsChoPhep` = bỏ trần GL2 + lọc nhường, như mọi ca tiêm; điều M7a khẳng định (GL4 trên CSDL thiếu cột ngắt) giữ nguyên.
3. **Ca cũ để `bot_bat_luc` NULL** (phiếu (a) ghi «quá khứ»): NULL = bộ nạp không lọc mốc (hành vi cũ từng byte); đặt quá khứ thì P7-3 (hội thoại
   giả không có giờ) bị lọc «trước mốc». Hai sửa dựng ca trong tệp đã kê: `gl4-ngat-page P5` đánh «đã nhường» Q sau `setPage` (ca đo trần GL2) ·
   `frontend-v3-e2e` mở lại tin bị bật đóng (ca đo bàn giao/khôi phục với tin còn chờ) — kèm khẳng định MỚI rằng bật đóng tin cũ.
4. **«fstat lại tệp đích» = `stat` theo ĐƯỜNG DẪN** (bigint ino/mtimeNs/size): `fstat` trên fd mở trước sẽ không thấy `os.replace` (inode mới).
5. **Vòng xử lọc chặt hơn (iv)/(v)**: page vào `sanSang` khi trạng thái `da_nhuong` (+ (i)(ii)(iii)(vi) + qua mốc). Chỉ vòng nạp (nơi đọc log)
   đưa `cho` qua mốc thành `da_nhuong` ⇒ vòng xử không phục vụ page ở khe 6 s giữa «qua mốc» và lượt xét log. `chua_nhuong` là trạng thái cuối
   (chỉ người tắt/bật lại gỡ) — tệp hỏng rồi lành không được lặng lẽ xoá `chua_nhuong`. Biến tệp vắng ở worker ⇒ `loi_tep` (không chỉ «không
   vào»): màn nói ra thay vì «quá giờ chờ».
6. **Nhãn màn đổi chữ** «bot cũ» → «ai_sale» («Đang chờ ai_sale nhường — còn N phút» · «ai_sale đã nhường — bot v3 đang trả lời») để giữ luật MB
   (mb.sh ⑤). Thêm nhãn ĐỎ cho page ĐANG BẬT mà trạng thái '' (bật trước cổng GL10 / SQL tay — worker KHÔNG trả lời, màn phải nói).
7. **Gắn tay tính cả MẢNG** dưới khoá khác `_v3` (ai_sale lặp `d.get(mkey) or {}` nên mảng cũng cộng lại); khoá `tram_landing` có pid là gắn
   tay bất kể `nha/nuoc` (rộng hơn ai_sale — chiều an toàn).
8. **Không nhật ký cho lượt gia hạn theo log** (không đổi trạng thái; tối đa 1 lượt/6 s suốt 30′) — chỉ cập nhật `ai_sale_ly_do` + `cho_den`.
9. **`ket.nap.choPhep` giữ nghĩa GL2** (bật ∩ trần); thêm `ket.aiSale = {sanSang, cho, chan, chua035}` + một cụm trong dòng log vòng.
10. **Bộ nạp không bắt 42703 ở câu tra page** (`… bot_bat_luc`): đường thật không tới (CSDL thiếu 035 ⇒ `sanSang = []`); chỉ đường tiêm `dsChoPhep`
    (gl4-chua-034) gặp — page đó đếm `nap.loi`. Nợ đề nghị N-GL10-NAP-42703.
11. **Thước thêm ngoài ④**: W4c (2 vòng nạp, rào tất định) · C10 · C6e · C6f · W8b · W10g · W10h · G1b (sau /code-review) · đột biến ⑫w ⑫x.
12. Design-pack: chỉ `docs/v3/ban-giao/bien-moi-truong-v3.md` nằm trong ③ (đã khai hai biến); tài liệu cửa/worker khác ngoài ③ — không sửa.
13. **Giữ dáng mã cho thước cũ**: `setPage` giữ khối `if (input.enabled === true) { pageStatus … await kiemTranPageBat(c, p, env); }` y như cũ (phần
    ai_sale tách sang `ghiKhoaKhiBat`, bù qua `.catch`) và `chay-worker` giữ tên `choPhep` cho danh sách nạp/rút (danh sách trần đổi tên
    `choPhepTran`) — để neo đột biến của gl2.sh ⑤l/⑤m và gl4.sh ⑤z vẫn áp được. `gl2-tran-page-bat W4b` đánh «đã nhường» A, B (gl2.sh ⑤d).
14. **Cổng cũ gl3b.sh ⑤c đỏ 1 dòng (lồng ra gl4 ⑥ · gl3c ④)** — 035 dựng lại CHECK đủ mã nên đột biến «gỡ 033» hết làm đỏ N1. gl10.sh ⑬ đếm riêng
    và in «đỏ đã biết»; tổng quyết (nợ N-GL10-GL3B-5C).
15. **Một lượt /code-review** (high) theo lệnh giao việc; bản vá sau review KHÔNG qua lượt review thứ hai — đo bằng 9 đột biến ⑫y1–⑫y9 trên bản
    SAU vá (bẫy 26) + npm test + lượt cổng đầy đủ.

## Thứ tự triển khai (② 5 — việc bước mở van, KHÔNG phải thợ) + đường lùi

1. `node --env-file=.env db/migrate.js` (035) TRƯỚC mã. 2. Mã. 3. `.env` thêm `V3_AI_SALE_TEP_GAN=/opt/pancake-tool/state/chung/page_gan_them.json`
+ `V3_AI_SALE_LOG=/var/log/aisale-chat` (BẮT BUỘC). 4. Restart CẢ HAI unit. 5. Ngay trước lần gạt đầu: đọc chỉ-đọc thân ba hàm ai_sale trên prod,
so với bản chép trong `test/gl10-tep-ai-sale.test.mjs`; lệch ⇒ KHÔNG gạt. Đường lùi: gạt TẮT mọi page v3 qua màn → kiểm `_v3` = None → lùi mã →
`035 down`. (Bổ sung: kiểm khối «🚨 BỎ QUA … KHÔNG thuộc shop» của ai_sale vẫn in như 19/10 — đổi chữ thì phép đo log lùi về khớp thô, chiều v3 im.)

## Nợ đề nghị §9 (tổng ghi — thợ không sửa sổ)

- **N-GL10-GIO-PANCAKE** (phiếu ⑥): `src/chat/history.js#messageTime` lệch −2 giờ trên prod (−1 giờ từ 25/10) — `chat/human.js` cửa sổ 24 giờ + mọi so giờ tin.
- **N-GL10-NAP-42703**: câu tra page của bộ nạp ném 42703 trên CSDL thiếu 035 (chỉ đường tiêm `dsChoPhep`).
- **N-GL10-LOG-CHU-AI-SALE**: phép đo log dựa vào chữ «BỎ QUA»/«KHÔNG thuộc shop» của `ai_sale.py` (đổi gần như hằng ngày) — đổi chữ ⇒ page `_v3`
  không tên có thể bị `chua_nhuong` oan (chiều an toàn: v3 im). Nên nhờ chủ pancake-tool in một dấu ổn định (vd «[v3]») hoặc ai_sale đọc cờ v3.
- **N-GL10-KHOI-DONG**: dòng khởi động worker in `choPhep` (bật ∩ trần), chưa in số page `sanSang`.
- **N-GL10-DEN-SUC-KHOE** (phiếu ⑥): đèn Sức khoẻ riêng cho trạng thái ai_sale; hôm nay chỉ màn Page & Bot có nhãn + câu chặn tệp hỏng ở cửa kiểm.
- **N-GL10-GL3B-5C**: `gl3b.sh ⑤c` (đột biến gỡ 033 ⇒ đòi N1 N5 đỏ) nay chỉ N5 đỏ vì 035 dựng lại CHECK `nap_bo_qua` đủ 8 mã — chỉnh thước
  (gỡ 033 + 035 cùng lượt, hoặc đòi N5). gl10.sh ⑬ đang đếm riêng dòng này.
- **N-GL10-PAGE-STATUS-DUONG-TEP**: `pageStatus` trả `aiSaleChiTiet.tep` (đường tệp máy chủ) ra JSON màn quản trị — không bí mật, nhưng thừa.
- Giữ các mục ⑥ của phiếu (ai_sale tự đọc `bot_ai_bat` · khoá chống mất-ghi phía `tu_gan_page_ngoai.py` · N-AI-CARE-DON / `ai_sale_thu_thang.py` ·
  fail-closed cho dự án ngoài pancake-tool · «Một page»/«Bắt đầu» chưa có nhãn chờ · `dsPageDeNap LIMIT 500` · «mọi món hết hàng» · khe ms
  `assertCanAct` · cấu hình `PK_TAG_HANDOFF`/`V3_NAP_THE_CHAN` ở mở van).

## Môi trường đo (luật 7 viet-thuoc)

Mọi số trên: **máy dev**, worktree `…/.claude/worktrees/agent-a2b792f2ee00a5373`, Postgres.app `127.0.0.1:5432`, hộp cát theo pid, `.env` chép từ cây
chính (`PANCAKE_READONLY=1`). Prod chỉ đọc (stat/grep/python3 -I, lúc 19/10 ~09:xx giờ VN). Không gọi model, không gọi Pancake, không đụng tệp
thật của pancake-tool (mọi ca dùng mkdtemp). Có thợ khác chạy cổng song song (gp1/ll15*) — hộp cát theo pid, không đụng nhau.

## Vòng bổ sung 19/10 — ba việc của tổng (commit `f899fb5`) · Lệch phiếu — tổng gật 19/10

Thay cho mục «cổng cũ: gl3b ⑤c đỏ», lệch phiếu 14 và nợ N-GL10-GL3B-5C ở trên (đã xử, không còn nợ):

1. **`ops/bin/nghiem-thu/gl3b.sh` ⑤c** (Lệch phiếu — tổng gật 19/10): đột biến «gỡ 033» nay đòi đỏ **N5** (vòng 033 down/up) thay cho «N1 N5»,
   kèm một dòng giải thích trong cổng (035 dựng lại CHECK đủ 8 mã ⇒ N1 hết đỏ). **`ops/bin/nghiem-thu/gl3c.sh` ②d** (Lệch phiếu — tệp NGOÀI danh
   sách tổng kê, sửa vì hệ quả trực tiếp): phép «gl4.sh · gl3b.sh không đổi từ base» đỏ khi gl3b.sh đổi ⑤c ⇒ nay trừ ĐÚNG hai dòng đó, mọi thay đổi
   khác của hai tệp vẫn đỏ. `gl10.sh` ⑬ bỏ phần «đếm riêng đỏ đã biết» (so thẳng với nền base).
   Chạy riêng: `gl3b.sh` rc=0 · ĐỎ 0 / XANH 49 (⑤c «đỏ: N5 (đòi đỏ: N5)») · `gl4.sh` rc=0 · ĐỎ 0 / XANH 60 · `gl3c.sh` rc=0 · ĐỎ 0 / XANH 76 — cả ba
   bằng base.
2. **Ca chép mã pancake-tool** (Lệch phiếu — tổng gật 19/10, repo công khai): `test/gl10-tep-ai-sale.test.mjs` + `test/gl10-cong-bat-tat.test.mjs` chỉ
   giữ LOGIC `_page_gan_them` · `_page_gan_noi_khac` · `_hop_page_shop` (+ `_doc_gan` · `_ghi_gan`) — bỏ docstring/chú thích gốc có tên shop/page/người,
   mỗi khối một dòng nguồn «chép logic … từ pancake-tool ai_sale.py:<dòng> ngày 19/10». Dấu tên khách giả trong ca log đổi thành `KHACH-BI-MAT-TEN-GIA-GL10`.
   Quét `git diff 7c99f77..HEAD` (dòng thêm): 0 dòng khớp tên shop/page/khách/người đã biết hay SĐT dạng +971/+966/+974/+965; số ≥ 13 chữ số
   chỉ là hằng thử (`12345678901234567` · `9007199254740993` · `1792056718000`); email chỉ dạng `@thu.vn`/`@gl10.vn` của ca.
3. **Đo lại sau commit `f899fb5`**: `bash ops/bin/nghiem-thu/gl10.sh` (đầy đủ, cả ⑬) ⇒ **== ĐỎ 0 / XANH 60 · rc=0** — ⑬: gl2 52/0 · mb 0 · gl4 60/0 ·
   gl3c 76/0 · gl3b 49/0 · gl1 7/0 · gd1 0 · l2-m1 3 dòng + va-r1 2 dòng GIỐNG HỆT base. `npm test -- --test-force-exit`: tests 2866 · pass 2844 · fail 0.

## Vòng 2 (sau đối kháng) — 19/10 · thợ vòng 2 (cùng worktree)

**Đầu vào:** verdict `refute-gl10.verdict.yaml` (TRẢ VỀ — F1 CHẶN · F2–F6 NÊN · G1 GHI-NỢ; 6/6 ca phá CONFIRMED) + ca phá
`scratchpad/refute-gl10/` + diff `7c99f77..HEAD`. **Commit:** `fd97c66` test(gl10) thước trước · `0f18207` fix(gl10) · (commit này) nhật ký.
Mọi tệp đổi nằm trong ③ — không «Lệch phiếu» về tệp.

### Thước TRƯỚC (đỏ trên HEAD `71761c1`) — `test/gl10-vong2.test.mjs`

Chuyển thể ca phá của đối kháng sang ĐƯỜNG THẬT: cổng bật/tắt qua HTTP (Express + vé + `dungPhanB` → `noiVanHanhV3` → `setPage`),
worker `motLuot` thật (không tiêm `dsChoPhep`), màn qua `/api/page-bot/danh-sach`, hộp cát `aicloser_v3_test_gl10v_p<pid>`, tệp tạm.
```
(HEAD 71761c1, TZ=Europe/Berlin) tests 7 · pass 0 · fail 7 — mỗi ca đỏ ĐÚNG chỗ khẳng định:
F1  đáp phải mang trạng thái dien_tap, đo {"trangThai":"cho",…}          (diễn tập vẫn ghi khoá)
F2  vòng nạp phải canh khoá mồ côi, đo ''                                  (SIGKILL giữa ghiKhoa và COMMIT)
F2b vòng nạp phải chờ lượt bật xong hẳn rồi mới xét khoá mồ côi            (chưa có phép canh)
F3  khoá sống lại không ai phát hiện, đo ''                                (_ghi_gan cũ + os.replace sau lượt tắt)
F4  vượt trần: màn phải ĐỎ, đo {"trangThai":"da_nhuong",…,"nhan":"ai_sale đã nhường — bot v3 đang trả lời","do":false}
F5  page bật xếp sau hạng 500 KHÔNG BAO GIỜ được nạp
F6  0 tệp log khớp mà vẫn khai «đang canh log»: … · đang canh log ai_sale
```
Sau /code-review thêm F2c · F2d và viết lại F2b (xem dưới) ⇒ tệp có 9 ca.

### Từng finding — ca · vá · đảo-vá

| # | vá | ca xanh | đảo-vá (mỗi đột biến một tiến trình, bản sao tạm) |
| --- | --- | --- | --- |
| **F1** CHẶN | Chọn (b) để GIỮ bậc ② mo-van («prod, đường ĐỌC — khách chưa thấy gì»): bật lúc `V3_DIEN_TAP=1` ⇒ KHÔNG ghi khoá, trạng thái mới `dien_tap` (CHECK 035 thêm mã), không mốc chờ, nhật ký `v3_bat_dien_tap`; worker chỉ chạy thử page `dien_tap` khi CHÍNH worker còn diễn tập; bỏ diễn tập ⇒ không phục vụ (fail-closed), màn ĐỎ «Đã bỏ diễn tập… Tắt rồi bật lại để ghi khoá»; page còn giữ khoá mà bật diễn tập ⇒ 409; tắt page `dien_tap` không báo «khoá CHƯA xoá». Màn: nhãn «Diễn tập — KHÔNG ghi khoá ai_sale: ai_sale vẫn trả lời khách như trước; bot v3 chạy thử, không gửi», danh sách mang `dienTap` ⇒ hộp xác nhận bật KHÔNG hứa «bot sẽ trả lời khách», toast riêng | F1 (bản chép ai_sale vẫn trông page · worker diễn tập nạp page · bỏ diễn tập 0 nạp · 409 · bật lại thường ⇒ `cho` + khoá) | ⑫z1 vẫn ghi khoá · z1b worker không chạy thử · z1c bỏ diễn tập vẫn nạp · z1d tắt báo khoá · z1e màn không đỏ · z1f cho bật page giữ khoá — 6/6 đỏ F1 |
| **F2+F3** NÊN | Vòng nạp (`canhKhoaMoCoi`, chạy cả khi 0 page bật/vượt trần): `_v3[pid]` còn mà dòng page tắt, chưa `xoa_hong` ⇒ khoá DÒNG (`FOR UPDATE`, thứ tự id) → ĐỌC LẠI tệp → UPDATE có điều kiện `xoa_hong` + lý do «MỒ CÔI» + nhật ký `ai_sale_khoa_mo_coi` (một lần). KHÔNG tự xoá tệp. Màn đã có nhãn đỏ + nút «Thử xoá lại» cho `xoa_hong` | F2 (SIGKILL thật ở tiến trình con) · F3 (ghi chen tất định) · F2b/F2c/F2d (đua — dưới) | ⑫z2 bỏ canh ⇒ F2 F3 · z2b tự xoá tệp ⇒ F2 · z2c đọc tệp cũ ⇒ F2c · z2f bỏ khoá dòng ⇒ F2c · z2d đánh cả page đang bật ⇒ F2 · z2e bù không đưa về '' ⇒ F2b · z2g bù không khoá dòng ⇒ F2b F2d · z2h bù gỡ khoá lượt bật khác ⇒ F2d |
| **F4** NÊN | `kho-page.js#docMayAiSale` đọc MỘT lần cho cả bảng: trần GL2 toàn hệ (đếm như đèn Sức khoẻ) · cửa kiểm của chính page (van đóng / diễn tập / thiếu biến / model) · nhịp máy chạy bot. Page `cho`/`da_nhuong` (giữ khoá) mà một lý do trên ⇒ ĐỎ «<lý do> — ai_sale … nhường page này (khoá _v3 còn) nên KHÔNG bot nào trả lời. <lối>»; `da_nhuong` chỉ XANH (`aiSale.xanh`) khi cửa kiểm đọc được + máy chạy bot có nhịp (XANH/VÀNG); hàng đợi im (XÁM) ⇒ vàng «CHƯA XÁC NHẬN bot v3 trả lời». `loi_tep` vì MÁY CHẠY BOT thiếu biến (tệp lành) ⇒ không còn nói «tệp hỏng». Worker CHÍNH nó diễn tập mà page giữ khoá ⇒ kêu ở log một lần | F4 (10 bước: vượt trần · van · diễn tập · thiếu biến máy chủ · model · máy đứng · hàng im · CHO-QUA xanh · `cho`+vượt trần · thiếu biến máy chạy bot · worker diễn tập) | ⑫z4a–z4j (10 đột biến) đỏ F4 |
| **F5** NÊN | `dsPageDeNap` bỏ `LIMIT 500` (chỉ cột `page_id`, giao với danh sách bật/nhường ở `motLuotTrong` mới quyết) | F5 (501 page đệm xếp trước) | ⑫z5 LIMIT 500 trở lại ⇒ F5 |
| **F6** NÊN | Đếm tệp log khớp tiền tố VÀ đọc được (`accessSync R_OK`): 0 ⇒ lý do bật «KHÔNG canh được log — V3_AI_SALE_LOG có nhưng 0 tệp log khớp; chỉ chờ theo giờ» (có tệp ⇒ «đang canh log ai_sale (N tệp)»); worker cảnh báo MỘT lần (gỡ khi có tệp lại); lý do «đã nhường» ghi «chỉ theo giờ» | F6 (tiền tố sai · có tệp · tệp chmod 000 ở cả lý do bật lẫn worker; bỏ phần quyền khi chạy root) | ⑫z6 · z6b · z6c (mỗi vòng) · z6d · z6e (đếm tên) · z6f (worker không xét quyền) đỏ F6 |
| **G1** GHI-NỢ | KHÔNG sửa `handler-v3.js` (phiếu cấm) — nợ đề nghị **N-GL10-ASSERT-AI-SALE** dưới | — | — |

### /code-review vòng 2

Lượt 1 (`/code-review high` qua Skill) chạy ở cwd CÂY CHÍNH và soát nhầm diff GL8 (`origin/vao-ui-v3-17-09...HEAD`) — bỏ, không dùng.
Lượt 2: agent reviewer trỏ đúng `git -C <worktree> diff 71761c1`. Trước khi reviewer trả, thợ tự thấy `canhKhoaMoCoi` bản đầu lấy khoá
tư vấn tệp rồi mới khoá dòng (ngược thứ tự lượt bật/tắt ⇒ deadlock) — đã đổi sang «khoá dòng → đọc lại tệp, không khoá tệp» + ca F2c
(reviewer xác nhận lỗi đó và bản sửa). Kiểm chứng từng điểm trước khi sửa (đọc mã + lập luận khoá Postgres READ COMMITTED; điểm 3 dựng
lại bằng ca F2b viết lại — đỏ trên bản chưa sửa):

| # | điểm reviewer | mức | xử |
| --- | --- | --- | --- |
| 1 | `da_nhuong` xanh dù bộ não lỗi mọi tin: nhịp đếm `loi`/`chan_guard` là «đã xử»; mã cửa kiểm model bị bỏ qua | NÊN | SỬA phần mã cửa kiểm `BOTMOI_THIEU_MODEL`/`BOTMOI_MODEL_HONG` ⇒ đỏ (F4 ④b, ⑫z4h). Phần «tin `loi` tính là nhịp» (khoá model chết 401 — cửa kiểm không thấy) ⇒ nợ **N-GL10-NHIP-LOI** |
| 2 | F1/F4 đọc env unit giao diện, việc gửi đọc env worker — chỉ restart worker với `V3_DIEN_TAP=1` ⇒ bật vẫn ghi khoá, màn xanh | NÊN | SỬA phần trong tầm: worker kêu ở log khi CHÍNH nó diễn tập mà page giữ khoá (F4 ⑩, ⑫z4i/z4j) + bảng biến ghi «đổi `V3_DIEN_TAP` phải khởi động lại CẢ HAI unit». Màn thấy env worker ⇒ nợ **N-GL10-ENV-HAI-UNIT** |
| 3 | `buKhoa` khoá tệp rồi mới UPDATE dòng: (a) UPDATE thấy ảnh chụp '' ⇒ 0 dòng, worker COMMIT `xoa_hong` sau ⇒ đỏ oan; (b) vòng chờ với lượt bật #2 cùng page, nạn nhân là bù ⇒ nhánh catch gỡ không khoá có thể gỡ mất khoá #2 | NHỎ | SỬA: bù khoá DÒNG trước (`SELECT … FOR UPDATE`), dòng đã bật lại ⇒ KHÔNG gỡ. F2b viết lại đo đúng thứ tự xấu (worker dừng sau đọc lại tệp, bù phải ĐỨNG CHỜ khoá dòng) + F2d mới (bật #2 chen trước bù) — ⑫z2g · z2h |
| 4 | page `dien_tap` đang bật mà khoá sống lại (ghi chen) ⇒ không ai canh, màn vàng «ai_sale vẫn trả lời» | NHỎ | Nợ **N-GL10-DIEN-TAP-KHOA-SONG-LAI** (cần trạng thái/đường riêng cho page ĐANG bật giữ khoá ngoài chủ ý — ngoài 6 finding) |
| 5 | nhịp tính cho cả team, không trừ page ngắt kênh (GL4): page ngắt GỬI làm đỏ oan page khác; page ngắt ĐỌC vẫn có thể xanh | NHỎ | Nợ **N-GL10-NHIP-TEAM-NGAT** (pilot trần = 1 chỉ chạm chính page ngắt) |
| 6 | F6 đếm TÊN tệp, không đếm tệp đọc được (EACCES bỏ qua im) | NHỎ | SỬA (`accessSync R_OK` ở cả `demTepLog` lẫn `quetLogAiSale`; F6 thêm bước chmod 000; ⑫z6e · z6f) |

Ngoài review — `npm test` lượt 1 đỏ `v3/test/b/hop-thu.test.mjs` H1: `operations.js` import `src/queue/lan-gui.js` (đường GỬI) để lấy
`dangDienTap` ⇒ đồ thị import của Hộp thư (`hop-thu/router.js → operations.js → ai-sale-nhuong.js`, đo bằng duyệt import) chạm đường gửi.
Sửa: chép luật một dòng `V3_DIEN_TAP === '1'` thành `ai-sale-nhuong.js#dangDienTap` (không import lan-gui), ca F1 so hai hàm trên 5 đầu vào.

### Số đo cuối (máy dev · Postgres.app 127.0.0.1:5432 · hộp cát theo pid · worktree · node v24.19.0) — HEAD `0f18207`

```
bash ops/bin/nghiem-thu/gl10.sh   (đầy đủ, cả ⑬)                                      == ĐỎ 0 / XANH 92 · rc=0
  V2 (vòng 2) pass=9 fail=0 · xanh: F1 F2 F2b F2c F2d F3 F4 F5 F6
  ⑫ 66 đột biến (35 vòng 1 + 31 vòng 2) — tất cả đỏ đúng ca đòi · ⑫0 bản sao nguyên vẹn pass=48 fail=0
  ⑬ gl2 52/0 · mb 0 · gl4 60/0 · gl3c 76/0 · gl3b 49/0 · gl1 7/0 · gd1 0 · l2-m1 3 dòng + va-r1 2 dòng = nền base
test/gl10-vong2.test.mjs dưới TZ=Europe/Berlin và TZ=UTC (PGTZ cùng)                    9/9 · 9/9
npm test -- --test-force-exit                     tests 2875 · pass 2853 · fail 0 · skipped 22 (mốc 2866 → +9 ca vòng 2)
```
Tf (chỗ duy nhất đọc biến tệp/ghi khoá) đổi danh sách nhập: thêm `v3/src/ui/page-bot/kho-page.js` (chỉ hằng `LY_DO_THIEU_BIEN` +
`dangDienTap`), regex nhập chịu cả nháy đơn — `n_goi` (gọi ghiKhoa/xoaKhoa) vẫn chỉ `operations.js`.

**Đột biến nào KHÔNG đỏ / nhánh không ca chạm (khai thật):** nhịp VÀNG («quá tải») tính là xanh — không ca riêng · nhãn khi `may`
vắng (màn «Một page» — không vẽ `aiSale`) · `dien_tap` + cửa kiểm không đọc được · nhánh cảnh báo lỗi của `canhKhoaMoCoi` (catch) ·
gỡ cờ cảnh báo log khi tệp có lại · cảnh báo diễn tập của worker khi 0 page bật (đường `ds` rỗng không xét).

### Lệch phiếu / giả định (vòng 2)

1. **Sửa migration 035** (CHECK thêm `dien_tap`, chú thích) + sinh lại `db/schema.sql`: 035 chưa áp nơi nào ngoài hộp cát — đo
   `_migrations` của `aicloser_v3` dev: bản cuối `034_page_ngat_kenh` (08/10); nhánh chưa push/deploy. Trạng thái mới = mở rộng bảng ② 2 / ③.
2. **Nhãn `da_nhuong` không còn xanh khi hàng đợi im** (XÁM ⇒ vàng) — đổi bảng nhãn ② 2 theo luật dải trạng thái «không đo được thì
   xám, không xanh». Giá: page pilot đêm ít khách sẽ hiện vàng.
3. **409 mới**: bật lúc diễn tập mà page còn giữ khoá (khoá mồ côi) — gỡ khoá trước.
4. `test/gl10-cong-bat-tat.test.mjs` before: đặt `process.env.V3_TRAN_PAGE_BAT=20` — nhãn màn nay đọc trần từ env TIẾN TRÌNH (như đèn
   Sức khoẻ); thiếu là mọi page bật «vượt trần».
5. Lý do `cho` thêm số tệp «đang canh log ai_sale (N tệp)». Tệp log biến mất SAU lúc bật ⇒ lý do `cho` vẫn câu cũ tới lượt chuyển kế
   (worker cảnh báo MỘT lần + lý do «đã nhường» nói chỉ theo giờ).
6. `pageStatus` vẫn chặn biến vắng/tệp hỏng/gắn tay cả khi diễn tập (dù diễn tập không ghi khoá) — giữ fail-closed, không mở rộng phiếu;
   giá: bậc ② không chạy được trên page gắn tay.

### Nợ đề nghị §9 (tổng ghi — thợ không sửa sổ)

- **N-GL10-ASSERT-AI-SALE** (G1 đối kháng): mất khoá khi đang `da_nhuong` — lượt `dang_xu` đang chạy vẫn gửi vì `assertCanAct`
  (`src/chat/handler-v3.js:401-410`) chỉ đọc lại `bot_ai_bat`, không đọc trạng thái ai_sale ⇒ ai_sale đã trả lời lại thì khách nhận tin
  đúp. Đề nghị: `assertCanAct` đòi thêm `ai_sale_trang_thai IN ('da_nhuong','dien_tap')` khi cột có (phiếu sau, sau BH9).
- **N-GL10-NHIP-LOI**: nhịp máy chạy bot (`kho.js#nhipMayBot`) tính `loi`/`chan_guard` là «đã xử» ⇒ khoá model chết (401) mà cấu hình
  còn ⇒ màn vẫn xanh. Cần phép đo «lượt gần nhất có gửi được» theo page.
- **N-GL10-NHIP-WORKER**: nhịp đo bằng hàng đợi — chế độ poll + worker chết ⇒ không tin nào vào hàng ⇒ XÁM (vàng), không ĐỎ. Nhịp tim
  thật của worker cần bảng riêng.
- **N-GL10-ENV-HAI-UNIT**: cổng bật + nhãn màn đọc env unit giao diện; việc gửi/diễn tập/trần của worker đọc env worker — lệch thì màn
  không thấy (worker chỉ kêu ở log). Đề nghị worker ghi trạng thái env của nó vào CSDL (một dòng) cho màn đọc.
- **N-GL10-DIEN-TAP-KHOA-SONG-LAI**: page `dien_tap` (đang bật) mà `_v3` sống lại do ghi chen ⇒ không ai canh (phép canh mồ côi chỉ xét
  page tắt). Cùng loại: page bật trạng thái '' có khoá (màn đã đỏ sẵn).
- **N-GL10-NHIP-TEAM-NGAT**: nhịp tính cho cả team, không trừ page ngắt kênh GL4.
- **N-GL10-MO-COI-KHONG-DONG**: `_v3.<pid>` của pid không có dòng `page` nào ⇒ worker không có dòng để đánh — chỉ gỡ tay.
- **mo-van / đường lùi** (skill ngoài ③ — tổng): ghi rõ «kéo phanh tay (đóng van gửi / bật diễn tập) khi page đang giữ khoá ⇒ không bot
  nào trả lời — gạt TẮT page v3 để ai_sale trả lời lại; đổi `V3_DIEN_TAP` phải restart CẢ HAI unit».

Repo công khai: quét dòng thêm của `git diff 71761c1` — 0 SĐT +97x/+96x, 0 email thật, số ≥ 13 chữ số chỉ là hằng thử. Không ssh prod,
không gọi model/Pancake, không đụng tệp thật của pancake-tool (mọi ca mkdtemp).
